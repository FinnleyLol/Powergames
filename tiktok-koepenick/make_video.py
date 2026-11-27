#!/usr/bin/env python3
"""
TikTok short (9:16, 1080x1920, 30 s, German): Der Hauptmann von Köpenick (1906).

Steps (all run by default):
  voice   German male voiceover with Piper (de_DE-thorsten-high), phrase by phrase, plus word timings
  audio   sound effects synthesized with numpy (no music), mixed under the voice
  render  canvas animation (scene.html) captured frame by frame with Playwright (render.mjs)
  mux     video + audio -> output/hauptmann_von_koepenick_tiktok.mp4

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
OUT_FILE = os.path.join(OUT, "hauptmann_von_koepenick_tiktok.mp4")

PIPER_VOICE = "de_DE-thorsten-high"   # the German host voice, chosen by the owner
PIPER_DIR = os.path.join(CACHE, "voices", "vits-piper-" + PIPER_VOICE)
PIPER_URL = f"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-{PIPER_VOICE}.tar.bz2"
FONTS = {
    "Montserrat.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    "JetBrainsMono.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
}

LENGTH_SCALE = 0.9  # Piper speed (smaller = faster)
VOICE_START = 0.30
PAUSE_PHRASE = 0.10
PAUSE_LINE = 0.26
PAUSE_AFTER = {}
PHRASE_PAUSE = {}
DURATION = 30.0
TARGET_LUFS = -11  # owner: voice louder -> master at -11 LUFS instead of -14
FPS = 30
SR = 48000

# Script: lines -> phrases -> tokens. "display|spoken" when the caption differs from the speech,
# a leading "*" marks a keyword that is highlighted in the captions.
SCRIPT = [
    [["*Berlin,", "*1906.|neunzehnhundertsechs."],
     ["Ein", "arbeitsloser", "*Schuster", "kauft", "sich", "beim", "*Trödelhändler|Trödel-Händler", "eine", "alte", "*Hauptmanns-Uniform.|Hauptmannsuniform."]],
    [["Dann", "stellt", "er", "sich", "auf", "die", "Straße", "und", "gibt", "einfach", "*Befehle."]],
    [["Eine", "Gruppe", "*Soldaten", "gehorcht", "ihm", "*sofort."]],
    [["Mit", "ihnen", "fährt", "er", "nach", "*Köpenick,"], ["besetzt", "das", "*Rathaus"], ["und", "lässt", "den", "*Bürgermeister", "verhaften."]],
    [["Dann", "nimmt", "er", "die", "*Stadtkasse", "mit:"], ["über", "*4.000|viertausend", "*Mark."]],
    [["Zehn", "Tage", "später", "wird", "er", "*gefasst."], ["Doch", "der", "*Kaiser", "*begnadigt", "ihn."]],
    [["*Wilhelm", "*Voigt|Vogt", "wird", "als", "*Hauptmann", "von", "*Köpenick", "weltberühmt."]],
    [["Und", "alles", "nur", "wegen", "einer", "*Uniform", "vom", "*Trödelhändler.|Trödel-Händler."]],
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
    if not os.path.exists(os.path.join(PIPER_DIR, PIPER_VOICE + ".onnx")):
        tarpath = os.path.join(CACHE, "voices", PIPER_VOICE + ".tar.bz2")
        download(PIPER_URL, tarpath)
        with tarfile.open(tarpath, "r:bz2") as tf:
            tf.extractall(os.path.dirname(PIPER_DIR), filter="data")
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
    """German: one syllable per vowel group (ei, au, eu, ie … count once)."""
    w = re.sub(r"[^a-zäöüß]", "", word.lower())
    return max(1, len(re.findall(r"[aeiouyäöü]+", w)))


def parse_token(tok: str) -> dict:
    key = tok.startswith("*")
    tok = tok.lstrip("*")
    disp, _, spoken = tok.partition("|")
    return {"text": disp, "spoken": spoken or disp, "key": key}


# --------------------------------------------------------------------------------------
# voice
# --------------------------------------------------------------------------------------
def make_tts():
    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(os.path.join(PIPER_DIR, PIPER_VOICE + ".onnx"))
    cfg = SynthesisConfig(length_scale=LENGTH_SCALE)

    def synth(text: str) -> tuple[np.ndarray, int]:
        import io
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            voice.synthesize_wav(text, w, syn_config=cfg)
        buf.seek(0)
        with wave.open(buf) as w:
            sr = w.getframerate()
            x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return x, sr
    return synth


def speech_bounds(x: np.ndarray, sr: int, thr: float = 0.012) -> tuple[int, int]:
    hop = int(sr * 0.005)
    env = np.array([np.abs(x[i:i + hop]).max() for i in range(0, len(x) - hop, hop)])
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return 0, len(x)
    return max(0, idx[0] * hop - int(0.02 * sr)), min(len(x), (idx[-1] + 1) * hop + int(0.04 * sr))


def step_voice() -> None:
    synth = make_tts()
    vsr = synth("Test")[1]
    pieces, t = [], VOICE_START
    lines_out = []
    for li, line in enumerate(SCRIPT):
        line_out = {"start": None, "end": None, "phrases": []}
        for pi, phrase in enumerate(line):
            toks = [parse_token(tok) for tok in phrase]
            text = " ".join(tk["spoken"] for tk in toks)
            x, _ = synth(text)
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
            t += dur + (PAUSE_AFTER.get(li, PAUSE_LINE) if last_phrase else PHRASE_PAUSE.get((li, pi), PAUSE_PHRASE))
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
                           "acompressor=threshold=-26dB:ratio=4:attack=3:release=70:makeup=4,alimiter=limit=0.95",
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
            if w["text"].lower().strip(".,?!:") == text.lower().strip(".,?!:"):
                return w
    raise KeyError(text)


def make_cues(L) -> dict:
    """Shot changes (hard cuts) and effect moments, shared by picture (scene.js) and sound (audio.py)."""
    w = lambda li, txt: find_word(L, li, txt)
    ph = lambda li, k: L[li]["phrases"][k]["start"]
    return {
        "year": w(0, "1906")["start"],
        "schuster": ph(0, 1),
        "troedler": w(0, "Trödelhändler")["start"],
        "uniform": w(0, "Hauptmanns-Uniform")["start"],
        "street": L[1]["start"],
        "befehle": w(1, "Befehle")["start"],
        "soldiers": L[2]["start"],
        "sofort": w(2, "sofort")["start"],
        "train": L[3]["start"],
        "rathaus": ph(3, 1),
        "mayor": ph(3, 2),
        "mayorWord": w(3, "Bürgermeister")["start"],
        "kasse": L[4]["start"],
        "mark": ph(4, 1),
        "arrest": L[5]["start"],
        "kaiser": ph(5, 1),
        "famous": L[6]["start"],
        "hauptmann": w(6, "Hauptmann")["start"],
        "end": L[7]["start"],
        "uniformEnd": w(7, "Uniform")["start"],
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
                        f"loudnorm=I={TARGET_LUFS}:TP=-1.0:LRA=9:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    js = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    return (f"loudnorm=I={TARGET_LUFS}:TP=-1.0:LRA=9:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
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
