#!/usr/bin/env python3
"""
TikTok short (9:16, 1080x1920, 25 s), story: how a messy lab led to penicillin (Alexander Fleming, 1928).

Steps (all run by default):
  voice   English male voiceover with Kokoro TTS (sherpa-onnx), phrase by phrase, plus word timings
  audio   sound effects synthesized with numpy, mixed under the voice (no music)
  render  canvas animation (scene.html) captured frame by frame with Playwright (render.mjs)
  mux     video + audio -> output/oymyakon_tiktok.mp4

    python make_video.py            # everything
    python make_video.py --only render,mux
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.request
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CACHE = os.path.join(REPO, ".cache")
BUILD = os.path.join(HERE, "build")
OUT = os.path.join(HERE, "output")
OUT_FILE = os.path.join(OUT, "penicillin_story_tiktok.mp4")

KOKORO_DIR = os.path.join(CACHE, "kokoro", "kokoro-multi-lang-v1_0")
KOKORO_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2"
FONTS = {
    "Montserrat.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    "JetBrainsMono.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
}

VOICE = 15          # Kokoro speaker "am_liam" (US English, young male) - the host voice
SPEED = 1.05
VOICE_START = 0.30  # s, the hook impact comes first
PAUSE_PHRASE = 0.10
PAUSE_LINE = 0.22
PAUSE_AFTER = {0: 0.3, 2: 0.3, 4: 0.4}  # line index -> longer pause (story beats)
DURATION = 25.0
FPS = 30
SR = 48000

# Words the Kokoro lexicon does not know (otherwise they are silently skipped)
LEXICON_EXTRA = {
    "that's": "ð ˈ æ t s",
    "here's": "h ˈ ɪ ɹ z",
    "world's": "w ˈ ɜ ɹ l d z",
}

# Script: lines -> phrases -> tokens. "display|spoken" when the caption differs from the speech,
# a leading "*" marks a keyword that is highlighted in the captions.
SCRIPT = [
    [["In", "*1928,|nineteen twenty eight,"],
     ["a", "scientist", "named", "*Alexander", "*Fleming", "went", "on", "*vacation", "and", "left", "his", "lab", "a", "total", "*mess."]],
    [["When", "he", "came", "back,"], ["one", "of", "his", "dishes", "of", "*bacteria", "had", "grown", "*mold."]],
    [["But", "around", "the", "mold,"], ["the", "bacteria", "were", "*dead."]],
    [["That", "mold", "was", "making", "a", "substance", "he", "called", "*penicillin."]],
    [["It", "became", "the", "world's", "*first", "*antibiotic,"], ["and", "it", "has", "saved", "*millions", "of", "lives."]],
    [["All", "because", "someone", "forgot", "to", "*clean", "*up."]],
]

# --------------------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------------------
def download(url: str, path: str) -> None:
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print(f"download {url}", flush=True)
    with urllib.request.urlopen(url, timeout=600) as r, open(path + ".part", "wb") as f:
        shutil.copyfileobj(r, f)
    os.replace(path + ".part", path)


def ensure_assets() -> None:
    for name, url in FONTS.items():
        download(url, os.path.join(CACHE, "fonts", name))
    if not os.path.exists(os.path.join(KOKORO_DIR, "model.onnx")):
        tarpath = os.path.join(CACHE, "kokoro", "kokoro.tar.bz2")
        download(KOKORO_URL, tarpath)
        with tarfile.open(tarpath, "r:bz2") as tf:
            tf.extractall(os.path.dirname(KOKORO_DIR), filter="data")
        os.remove(tarpath)


def write_wav(path: str, x: np.ndarray, sr: int) -> None:
    x = np.asarray(x, dtype=np.float32)
    ch = 1 if x.ndim == 1 else x.shape[1]
    with wave.open(path, "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def read_wav(path: str) -> tuple[np.ndarray, int]:
    with wave.open(path) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return (x.reshape(-1, ch) if ch > 1 else x), sr


def syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and not w.endswith(("le", "ee")) and n > 1:
        n -= 1
    return max(1, n)


def parse_token(tok: str) -> dict:
    key = tok.startswith("*")
    tok = tok.lstrip("*")
    disp, _, spoken = tok.partition("|")
    return {"text": disp, "spoken": spoken or disp, "key": key}


# --------------------------------------------------------------------------------------
# voice
# --------------------------------------------------------------------------------------
def make_tts():
    import sherpa_onnx

    lex = os.path.join(BUILD, "lexicon-extra.txt")
    with open(lex, "w", encoding="utf-8") as f:
        for w, ph in LEXICON_EXTRA.items():
            f.write(f"{w} {ph}\n")
    known = set(LEXICON_EXTRA)
    with open(os.path.join(KOKORO_DIR, "lexicon-us-en.txt"), encoding="utf-8") as f:
        for line in f:
            known.add(line.split(" ", 1)[0].lower())
    k = KOKORO_DIR + "/"
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=k + "model.onnx", voices=k + "voices.bin", tokens=k + "tokens.txt",
                data_dir=k + "espeak-ng-data", dict_dir=k + "dict",
                lexicon=lex + "," + k + "lexicon-us-en.txt", lang="en-us"),
            num_threads=4),
        max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg), known


def speech_bounds(x: np.ndarray, sr: int, thr: float = 0.012) -> tuple[int, int]:
    hop = int(sr * 0.005)
    env = np.array([np.abs(x[i:i + hop]).max() for i in range(0, len(x) - hop, hop)])
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return 0, len(x)
    return max(0, idx[0] * hop - int(0.02 * sr)), min(len(x), (idx[-1] + 1) * hop + int(0.04 * sr))


def step_voice() -> None:
    tts, known = make_tts()
    vsr = 24000
    pieces, t = [], VOICE_START
    lines_out = []
    for li, line in enumerate(SCRIPT):
        line_out = {"start": None, "end": None, "phrases": []}
        for pi, phrase in enumerate(line):
            toks = [parse_token(tok) for tok in phrase]
            text = " ".join(tk["spoken"] for tk in toks)
            for w in re.findall(r"[A-Za-z']+", text):
                if w.lower() not in known:
                    sys.exit(f"word '{w}' is not in the Kokoro lexicon, add it to LEXICON_EXTRA")
            a = tts.generate(text, sid=VOICE, speed=SPEED)
            x = np.array(a.samples, dtype=np.float32)
            s, e = speech_bounds(x, vsr)
            x = x[s:e]
            # fade edges to avoid clicks
            f = int(0.006 * vsr)
            x[:f] *= np.linspace(0, 1, f)
            x[-f:] *= np.linspace(1, 0, f)
            dur = len(x) / vsr
            # word timings: syllable-weighted, small extra weight after punctuation
            weights = []
            for tk in toks:
                sw = tk["spoken"].split()
                wgt = sum(syllables(w) for w in sw) + 0.35 * len(sw)
                weights.append(wgt)
            total = sum(weights)
            words, acc = [], 0.0
            for tk, wgt in zip(toks, weights):
                ws = t + 0.03 + (dur - 0.07) * acc / total
                acc += wgt
                we = t + 0.03 + (dur - 0.07) * acc / total
                words.append({"text": tk["text"], "key": tk["key"], "start": round(ws, 3), "end": round(we, 3)})
            line_out["phrases"].append({"start": round(t, 3), "end": round(t + dur, 3), "words": words})
            if line_out["start"] is None:
                line_out["start"] = round(t, 3)
            line_out["end"] = round(t + dur, 3)
            pieces.append((t, x))
            last_phrase = pi == len(line) - 1
            t += dur + (PAUSE_AFTER.get(li, PAUSE_LINE) if last_phrase else PAUSE_PHRASE)
            print(f"  line {li} phrase {pi}: {dur:5.2f}s  {text}")
        lines_out.append(line_out)
    end = lines_out[-1]["end"]
    print(f"voice ends at {end:.2f}s (video {DURATION:.0f}s)")
    if end > DURATION - 0.6:
        sys.exit("voiceover too long, raise SPEED or shorten the script")

    voice = np.zeros(int(DURATION * vsr) + 1, dtype=np.float32)
    for t0, x in pieces:
        i = int(round(t0 * vsr))
        voice[i:i + len(x)] += x
    write_wav(os.path.join(BUILD, "voice24.wav"), voice, vsr)
    # resample to 48 kHz and give the voice a little presence + compression
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(BUILD, "voice24.wav"),
                    "-af", "highpass=f=75,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.2:g=3,"
                           "acompressor=threshold=-22dB:ratio=3:attack=4:release=90:makeup=2",
                    "-ar", str(SR), os.path.join(BUILD, "voice.wav")], check=True)

    cues = make_cues(lines_out)
    v, _ = read_wav(os.path.join(BUILD, "voice.wav"))
    hop = SR // FPS
    env = [float(np.sqrt(np.mean(v[i * hop:(i + 1) * hop] ** 2))) for i in range(int(DURATION * FPS))]
    m = max(env) or 1.0
    timeline = {"duration": DURATION, "fps": FPS, "lines": lines_out, "cues": cues,
                "voiceEnv": [round(e / m, 3) for e in env]}
    with open(os.path.join(BUILD, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)


def find_word(lines, li, text):
    for ph in lines[li]["phrases"]:
        for w in ph["words"]:
            if w["text"].lower().strip(".,?!") == text.lower().strip(".,?!"):
                return w
    raise KeyError(text)


def make_cues(L) -> dict:
    """Scene changes and effect moments, shared by picture (scene.html) and sound (audio.py)."""
    w = lambda li, txt: find_word(L, li, txt)
    return {
        "year": w(0, "1928")["start"],
        "photo": w(0, "Alexander")["start"] - 0.1,
        "vacation": w(0, "vacation")["start"],
        "lab": w(0, "lab")["start"],
        "mess": w(0, "mess")["start"],
        "back": L[1]["start"],
        "dish": L[1]["phrases"][1]["start"] - 0.2,
        "bacteria": w(1, "bacteria")["start"],
        "mold": w(1, "grown")["start"],
        "around": w(2, "around")["start"],
        "dead": w(2, "dead")["start"],
        "pen": L[3]["start"] - 0.2,
        "making": w(3, "making")["start"],
        "penWord": w(3, "penicillin")["start"],
        "impact": L[4]["start"] - 0.2,
        "first": w(4, "first")["start"],
        "saved": w(4, "saved")["start"],
        "millions": w(4, "millions")["start"],
        "end": L[5]["start"] - 0.2,
        "forgot": w(5, "forgot")["start"],
        "clean": w(5, "clean")["start"],
        "finish": DURATION,
    }


# --------------------------------------------------------------------------------------
# audio: music + sfx + mix
# --------------------------------------------------------------------------------------
def step_audio() -> None:
    import audio  # local module

    with open(os.path.join(BUILD, "timeline.json"), encoding="utf-8") as f:
        tl = json.load(f)
    voice, sr = read_wav(os.path.join(BUILD, "voice.wav"))
    assert sr == SR
    mix = audio.build_mix(voice, tl["cues"], DURATION, SR)
    write_wav(os.path.join(BUILD, "mix.wav"), mix, SR)


# --------------------------------------------------------------------------------------
# render + mux
# --------------------------------------------------------------------------------------
def step_render(workers: int) -> None:
    subprocess.run(["node", os.path.join(HERE, "render.mjs"), "--workers", str(workers)], check=True, cwd=HERE)


def loudnorm_args(path: str) -> str:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af",
                        "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    js = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    return (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
            f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")


def step_mux() -> None:
    os.makedirs(OUT, exist_ok=True)
    mix = os.path.join(BUILD, "mix.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(BUILD, "video.mp4"), "-i", mix,
                    "-af", loudnorm_args(mix) + f",aresample={SR}", "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(DURATION),
                    "-movflags", "+faststart", OUT_FILE], check=True)
    print("done:", OUT_FILE)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="voice,audio,render,mux")
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()
    os.makedirs(BUILD, exist_ok=True)
    steps = args.only.split(",")
    ensure_assets()
    if "voice" in steps:
        step_voice()
    if "audio" in steps:
        step_audio()
    if "render" in steps:
        step_render(args.workers)
    if "mux" in steps:
        step_mux()


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    main()
