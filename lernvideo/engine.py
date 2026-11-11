"""
Gemeinsame Engine für die Türkisch-Lernvideos (Deutsch → Türkisch).

Enthält Downloads (Schrift, Twemoji, Piper-Stimmen, Whisper), Sprachausgabe mit optionaler
Whisper-Prüfung, Grafik-Helfer, die Szenen-Basisklasse, die Status-Leiste und das Rendern
(Audio mischen, Kapitelmarken, ffmpeg). Die einzelnen Videos (z. B. hayvanlar-video/,
fiiller-video/) definieren nur noch Inhalte und Szenen.
"""
from __future__ import annotations


import argparse
import difflib
import hashlib
import io
import json
import math
import os
import random
import re
import subprocess
import sys
import tarfile
import time
import urllib.request
import wave
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CACHE = os.path.join(REPO_ROOT, ".cache")  # Downloads & Sprachaufnahmen, von allen Videos geteilt
BASE_ICONS = ["1f442", "1f40c", "1f5e3", "1f914", "2705", "1f4a1", "1f1e9-1f1ea", "1f1f9-1f1f7", "1f43e"]
W, H, FPS = 1920, 1080, 25
SR = 22050  # Abtastrate der Piper-Stimmen

FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/{}.ttf"
TWEMOJI_URL = "https://raw.githubusercontent.com/jdecked/twemoji/main/assets/svg/{}.svg"
VOICE_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-{}.tar.bz2"
VOICE_TR = "tr_TR-dfki-medium"
VOICE_DE = "de_DE-thorsten-medium"
WHISPER_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2"
WHISPER_FILES = ("small-encoder.int8.onnx", "small-decoder.int8.onnx", "small-tokens.txt")
TR_SPEED, TR_SLOW, DE_SPEED = 1.08, 1.35, 1.05  # Piper length_scale (größer = langsamer)

# Farben
BG_TOP = (255, 248, 238)
BG_BOT = (255, 233, 214)
RED = (214, 31, 45)
RED_DARK = (170, 20, 34)
RED_SOFT = (255, 228, 226)
TEAL = (14, 110, 104)
INK = (31, 41, 55)
MUTED = (110, 112, 125)
LINE = (238, 222, 206)
WHITE = (255, 255, 255)
NOTE_BG = (255, 243, 205)
GREEN = (22, 150, 80)

# --------------------------------------------------------------------------------------
# Downloads / Cache
# --------------------------------------------------------------------------------------
def download(url: str, path: str) -> None:
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                data = r.read()
            with open(path + ".part", "wb") as f:
                f.write(data)
            os.replace(path + ".part", path)
            return
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise RuntimeError(f"Download fehlgeschlagen: {url}: {e}") from e
            time.sleep(2 ** (attempt + 1))


def ensure_assets(cache: str, emoji_codes) -> None:
    for name in ["Poppins-ExtraBold", "Poppins-Bold", "Poppins-SemiBold", "Poppins-Medium", "Poppins-Regular"]:
        download(FONT_URL.format(name), os.path.join(cache, "fonts", name + ".ttf"))
    for code in sorted(set(emoji_codes) | set(BASE_ICONS)):
        download(TWEMOJI_URL.format(code), os.path.join(cache, "emoji", code + ".svg"))
    for voice in (VOICE_TR, VOICE_DE):
        vdir = os.path.join(cache, "voices")
        onnx = os.path.join(vdir, voice + ".onnx")
        if os.path.exists(onnx) and os.path.exists(onnx + ".json"):
            continue
        tarpath = os.path.join(vdir, voice + ".tar.bz2")
        print(f"Lade Stimme {voice} …", flush=True)
        download(VOICE_URL.format(voice), tarpath)
        with tarfile.open(tarpath, "r:bz2") as tf:
            for m in tf.getmembers():
                base = os.path.basename(m.name)
                if base in (voice + ".onnx", voice + ".onnx.json") and m.isfile():
                    src = tf.extractfile(m)
                    with open(os.path.join(vdir, base), "wb") as f:
                        f.write(src.read())
        os.remove(tarpath)


def ensure_whisper(cache: str) -> None:
    wdir = os.path.join(cache, "whisper")
    if all(os.path.exists(os.path.join(wdir, f)) for f in WHISPER_FILES):
        return
    tarpath = os.path.join(wdir, "whisper.tar.bz2")
    print("Lade Whisper-Modell für --verify (ca. 640 MB) …", flush=True)
    download(WHISPER_URL, tarpath)
    with tarfile.open(tarpath, "r:bz2") as tf:
        for m in tf.getmembers():
            base = os.path.basename(m.name)
            if base in WHISPER_FILES and m.isfile():
                with open(os.path.join(wdir, base), "wb") as f:
                    f.write(tf.extractfile(m).read())
    os.remove(tarpath)


# --------------------------------------------------------------------------------------
# Audio
# --------------------------------------------------------------------------------------
def read_wav(path: str) -> np.ndarray:
    with wave.open(path) as r:
        return np.frombuffer(r.readframes(r.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0


def tr_words(text: str) -> list:
    text = text.replace("İ", "i").replace("I", "ı").lower().replace("i̇", "i")
    return re.findall(r"[a-zçğıöşüâîû]+", text)


class Verifier:
    """Prüft türkische Aufnahmen mit Whisper (sherpa-onnx). Nur mit --verify aktiv."""

    def __init__(self, cache: str):
        import sherpa_onnx

        d = os.path.join(cache, "whisper")
        self.rec = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=os.path.join(d, "small-encoder.int8.onnx"), decoder=os.path.join(d, "small-decoder.int8.onnx"),
            tokens=os.path.join(d, "small-tokens.txt"), language="tr", task="transcribe", num_threads=4)

    def check(self, text: str, audio: np.ndarray):
        pad = np.zeros(int(0.4 * SR), np.float32)
        s = self.rec.create_stream()
        s.accept_waveform(SR, np.concatenate([pad, audio, pad, pad]))
        self.rec.decode_stream(s)
        heard = s.result.text.strip()
        want, got = tr_words(text), tr_words(heard)
        ratio = difflib.SequenceMatcher(None, " ".join(want), " ".join(got)).ratio()
        return want == got, ratio, heard


class Voice:
    def __init__(self, name: str, cache: str, verifier: Verifier | None = None, takes: int = 6):
        from piper import PiperVoice

        self.name = name
        self.voice = PiperVoice.load(os.path.join(cache, "voices", name + ".onnx"))
        if self.voice.config.sample_rate != SR:
            raise RuntimeError(f"{name}: unerwartete Abtastrate {self.voice.config.sample_rate}")
        self.dir = os.path.join(cache, "tts")
        os.makedirs(self.dir, exist_ok=True)
        self.verifier, self.takes = verifier, takes
        self.report = []

    def _synth(self, text: str, length_scale: float, path: str) -> None:
        from piper import SynthesisConfig

        with wave.open(path + ".part", "wb") as w:
            self.voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=length_scale))
        os.replace(path + ".part", path)

    def _select(self, text: str, length_scale: float, path: str) -> None:
        """Piper klingt bei jeder Synthese etwas anders: mehrere Aufnahmen erzeugen und die behalten,
        die Whisper genau so versteht, wie sie geschrieben wird (sonst die ähnlichste)."""
        best, tmps = None, []
        for take in range(self.takes):
            tmp = f"{path}.take{take}.wav"
            tmps.append(tmp)
            if take == 0 and os.path.exists(path):
                os.replace(path, tmp)
            else:
                self._synth(text, length_scale, tmp)
            ok, ratio, heard = self.verifier.check(text, read_wav(tmp))
            if best is None or (ok, ratio) > best[:2]:
                best = (ok, ratio, heard, tmp, take + 1)
            if ok:
                break
        os.replace(best[3], path)
        for tmp in tmps:
            if os.path.exists(tmp):
                os.remove(tmp)
        info = {"text": text, "length_scale": length_scale, "heard": best[2], "exact": best[0],
                "similarity": round(best[1], 3), "takes": len(tmps), "chosen": best[4]}
        with open(path + ".ok", "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False)

    def say(self, text: str, length_scale: float = 1.0) -> np.ndarray:
        key = hashlib.sha1(f"{self.name}|{text}|{length_scale}".encode()).hexdigest()[:16]
        path = os.path.join(self.dir, f"{self.name}_{key}.wav")
        if self.verifier is not None and not os.path.exists(path + ".ok"):
            self._select(text, length_scale, path)
        elif not os.path.exists(path):
            self._synth(text, length_scale, path)
        if os.path.exists(path + ".ok"):
            with open(path + ".ok", encoding="utf-8") as f:
                self.report.append(json.load(f))
        return normalize(trim(read_wav(path)))


def trim(a: np.ndarray, thr: float = 0.012, margin: float = 0.04) -> np.ndarray:
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    m = int(margin * SR)
    a = a[max(0, idx[0] - m): min(len(a), idx[-1] + m)].copy()
    f = min(len(a) // 4, int(0.01 * SR))
    if f > 0:
        a[:f] *= np.linspace(0, 1, f)
        a[-f:] *= np.linspace(1, 0, f)
    return a


def normalize(a: np.ndarray, target_rms: float = 0.11) -> np.ndarray:
    fr = int(0.02 * SR)
    if len(a) < fr:
        return a
    frames = a[: len(a) // fr * fr].reshape(-1, fr)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    voiced = rms[rms > 0.02]
    if len(voiced) == 0:
        return a
    a = a * (target_rms / float(np.sqrt((voiced ** 2).mean())))
    peak = float(np.abs(a).max())
    return a * (0.95 / peak) if peak > 0.95 else a


def tone(freqs, dur, decay=6.0, vol=0.2, attack=0.005):
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * t) * (0.6 ** i) for i, f in enumerate(freqs))
    env = np.exp(-decay * t) * np.clip(t / attack, 0, 1)
    return (s * env * vol).astype(np.float32)


def make_sfx() -> dict:
    t = np.arange(int(0.09 * SR)) / SR
    pop = (np.sin(2 * np.pi * (500 + 2500 * t) * t) * np.exp(-40 * t) * 0.18).astype(np.float32)
    tick = tone([1250, 2500], 0.06, decay=60, vol=0.12)
    ding = tone([1318.5, 2637], 1.0, decay=4.0, vol=0.16)
    hi = tone([1975.5], 0.9, decay=4.5, vol=0.12)
    st = int(0.09 * SR)
    ding[st: st + len(hi)] += hi[: len(ding) - st]
    chord = np.zeros(int(1.4 * SR), np.float32)
    for i, f in enumerate([523.25, 659.25, 783.99]):
        c = tone([f, f * 2], 1.2, decay=3.0, vol=0.08)
        st = int(i * 0.07 * SR)
        chord[st: st + len(c)] += c[: len(chord) - st]
    fanfare = np.zeros(int(2.0 * SR), np.float32)
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        c = tone([f, f * 2, f * 3], 1.4 if i == 3 else 0.35, decay=2.5 if i == 3 else 8, vol=0.12)
        st = int(i * 0.13 * SR)
        fanfare[st: st + len(c)] += c[: len(fanfare) - st]
    return {"pop": pop, "tick": tick, "ding": ding.astype(np.float32), "chord": chord, "fanfare": fanfare}


# --------------------------------------------------------------------------------------
# Grafik-Helfer
# --------------------------------------------------------------------------------------
class Gfx:
    def __init__(self, cache: str):
        self.cache = cache
        self._fonts = {}
        self._emoji = {}
        self.bg = self._background()

    def font(self, weight: str, size: int) -> ImageFont.FreeTypeFont:
        key = (weight, size)
        if key not in self._fonts:
            self._fonts[key] = ImageFont.truetype(os.path.join(self.cache, "fonts", f"Poppins-{weight}.ttf"), size)
        return self._fonts[key]

    def fit(self, weight: str, text: str, size: int, max_w: float, min_size: int = 20):
        while size > min_size and self.font(weight, size).getlength(text) > max_w:
            size -= 2
        return self.font(weight, size)

    def emoji(self, code: str, size: int) -> Image.Image:
        key = (code, size)
        if key not in self._emoji:
            import cairosvg

            png = cairosvg.svg2png(url=os.path.join(self.cache, "emoji", code + ".svg"),
                                   output_width=size, output_height=size)
            self._emoji[key] = Image.open(io.BytesIO(png)).convert("RGBA")
        return self._emoji[key]

    def _background(self) -> Image.Image:
        g = np.linspace(0, 1, H)[:, None, None]
        arr = (np.array(BG_TOP)[None, None, :] * (1 - g) + np.array(BG_BOT)[None, None, :] * g)
        arr = np.repeat(arr, W, axis=1).astype(np.uint8)
        bg = Image.fromarray(arr, "RGB").convert("RGBA")
        blobs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(blobs)
        for (x, y, r, c) in [(1750, 120, 260, (255, 190, 170, 70)), (120, 1000, 300, (170, 225, 215, 70)),
                             (1600, 980, 200, (255, 215, 150, 60)), (200, 80, 160, (255, 200, 200, 50))]:
            d.ellipse([x - r, y - r, x + r, y + r], fill=c)
        blobs = blobs.filter(ImageFilter.GaussianBlur(70))
        bg = Image.alpha_composite(bg, blobs)
        rnd = random.Random(7)
        paw = self.emoji("1f43e", 90)
        for _ in range(14):
            p = paw.rotate(rnd.uniform(-40, 40), expand=True, resample=Image.BICUBIC)
            a = p.getchannel("A").point(lambda v: int(v * 0.07))
            p.putalpha(a)
            bg.alpha_composite(p, (rnd.randint(0, W - 120), rnd.randint(0, H - 120)))
        return bg.convert("RGB")


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease_out_cubic(p):
    p = clamp(p)
    return 1 - (1 - p) ** 3


def ease_out_back(p, c=1.70158):
    p = clamp(p)
    return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2


def put(frame: Image.Image, im: Image.Image, x, y, opacity=1.0):
    if opacity <= 0.004:
        return
    if opacity < 0.996:
        lut = [int(v * opacity) for v in range(256)]
        frame.paste(im, (int(round(x)), int(round(y))), im.getchannel("A").point(lut))
    else:
        frame.paste(im, (int(round(x)), int(round(y))), im)


def put_center(frame, im, cx, cy, opacity=1.0, scale=1.0):
    if scale != 1.0:
        w = max(1, int(im.width * scale))
        h = max(1, int(im.height * scale))
        im = im.resize((w, h), Image.LANCZOS)
    put(frame, im, cx - im.width / 2, cy - im.height / 2, opacity)


def box(w, h, r, fill, shadow=True, outline=None, ow=0, blur=22, sh_alpha=55, sh_dy=12):
    """Abgerundete Box als RGBA-Bild. Gibt (Bild, Rand) zurück – Rand = Platz für den Schatten."""
    pad = blur * 2 if shadow else 0
    im = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([pad, pad + sh_dy, pad + w, pad + h + sh_dy], r,
                                             fill=(120, 60, 20, sh_alpha))
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(blur)))
    ImageDraw.Draw(im).rounded_rectangle([pad, pad, pad + w - 1, pad + h - 1], r, fill=fill,
                                         outline=outline, width=ow)
    return im, pad


ARROW = "→"  # Poppins hat keinen Pfeil – er wird als Vektorgrafik gezeichnet


def text_layer(gfx: Gfx, segs, pad=12):
    """segs = [(text, weight, size, color)] → RGBA-Bild mit gemeinsamer Grundlinie."""
    pieces = []
    for t, wt, sz, c in segs:
        f = gfx.font(wt, sz)
        for i, part in enumerate(t.split(ARROW)):
            if i:
                pieces.append((ARROW, f, c))
            if part:
                pieces.append((part, f, c))

    def pw(t, f):
        return f.size * 0.9 if t == ARROW else f.getlength(t)

    width = sum(pw(t, f) for t, f, _ in pieces)
    asc = max(f.getmetrics()[0] for _, f, _ in pieces)
    desc = max(f.getmetrics()[1] for _, f, _ in pieces)
    im = Image.new("RGBA", (int(width) + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = pad
    for t, f, c in pieces:
        if t == ARROW:
            s = f.size
            y = pad + asc - s * 0.30
            th = max(2.0, s * 0.085)
            x1, x2, hl, hh = x + s * 0.08, x + s * 0.82, s * 0.30, s * 0.22
            d.rectangle([x1, y - th / 2, x2 - hl * 0.6, y + th / 2], fill=c)
            d.polygon([(x2 - hl, y - hh), (x2, y), (x2 - hl, y + hh)], fill=c)
        else:
            d.text((x, pad + asc), t, font=f, fill=c, anchor="ls")
        x += pw(t, f)
    im.baseline = pad + asc  # type: ignore[attr-defined]
    return im


def wrap_lines(font, text, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        test = (cur + " " + w_).strip()
        if font.getlength(test) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


# --------------------------------------------------------------------------------------
# Szenen
# --------------------------------------------------------------------------------------
class Ctx:
    def __init__(self, cache, verify=False, takes=6):
        self.gfx = Gfx(cache)
        self.tr = Voice(VOICE_TR, cache, Verifier(cache) if verify else None, takes)
        self.de = Voice(VOICE_DE, cache)
        self.sfx = make_sfx()

    def TR(self, text, slow=False):
        return self.tr.say(text, TR_SLOW if slow else TR_SPEED)

    def DE(self, text):
        return self.de.say(text, DE_SPEED)


class Scene:
    chapter = None  # Titel einer Kapitelmarke, die mit dieser Szene beginnt

    def __init__(self, ctx: Ctx):
        self.ctx = ctx
        self.g = ctx.gfx
        self.t = 0.0
        self.events = []
        self.marks = {}
        self.duration = 0.0

    # Zeitachse
    def say(self, clip, mark=None):
        st = self.t
        self.events.append((st, clip))
        self.t += len(clip) / SR
        if mark:
            self.marks[mark] = (st, self.t)
        return st

    def sfx(self, name, at=None):
        self.events.append((self.t if at is None else at, self.ctx.sfx[name]))

    def wait(self, s):
        self.t += s

    def span(self, mark, dur):
        self.marks[mark] = (self.t, self.t + dur)

    def finish(self, tail=0.4):
        self.duration = self.t + tail

    def m(self, name):
        return self.marks.get(name, (1e9, 1e9))

    def since(self, t, name):
        return t - self.m(name)[0]

    def active(self, t, name):
        a, b = self.m(name)
        return a <= t < b

    # gemeinsame Bausteine
    def title_bar(self, frame, icon, tr, de, right=None, progress=None):
        g = self.g
        lay = text_layer(g, [(tr, "Bold", 34, RED), ("  ·  " + de, "Medium", 34, MUTED)])
        w = lay.width + 90
        pill, pad = box(w, 74, 37, WHITE, blur=14, sh_alpha=35, sh_dy=6)
        frame.paste(pill, (110 - pad, 40 - pad), pill)
        put_center(frame, g.emoji(icon, 46), 110 + 46, 77)
        put(frame, lay, 110 + 74, 77 - lay.baseline + 12)
        if right:
            r = text_layer(g, [(right, "Bold", 40, INK)])
            put(frame, r, 1810 - r.width, 77 - r.baseline + 14)
        if progress is not None:
            d = ImageDraw.Draw(frame)
            d.rounded_rectangle([110, 138, 1810, 148], 5, fill=LINE)
            d.rounded_rectangle([110, 138, 110 + max(10, int(1700 * progress)), 148], 5, fill=RED)

    def heading(self, frame, text, y=150, size=64, color=INK):
        lay = text_layer(self.g, [(text, "Bold", size, color)])
        put(frame, lay, W / 2 - lay.width / 2, y - lay.baseline)


class StatusPill:
    """Leiste unten: Hör zu / langsam / Jetzt du!"""

    STATES = {
        "de": ("1f442", "Hör zu – Deutsch", False),
        "tr": ("1f442", "Hör genau hin – Türkisch", False),
        "slow": ("1f40c", "Noch einmal – ganz langsam", False),
        "speak": ("1f5e3", "Jetzt du! Sprich laut nach", True),
        "think": ("1f914", "Wie heißt das auf Türkisch? Sag es laut!", False),
        "answer": ("2705", "Richtig? Sprich noch einmal nach!", False),
        "ask": ("1f5e3", "Antworte: Bu bir …", True),
    }

    def __init__(self, gfx: Gfx, extra=None):
        """extra = zusätzliche Zustände {name: (emoji, text, rot_hinterlegt)}."""
        self.imgs = {}
        self.w, self.h = 860, 80
        for k, (icon, label, hot) in {**self.STATES, **(extra or {})}.items():
            im, pad = box(self.w, self.h, 40, RED if hot else WHITE, blur=14, sh_alpha=45, sh_dy=6)
            put_center(im, gfx.emoji(icon, 50), pad + 56, pad + self.h / 2)
            t = text_layer(gfx, [(label, "SemiBold", 34, WHITE if hot else INK)])
            put(im, t, pad + 100, pad + self.h / 2 - t.baseline + 12)
            self.imgs[k] = (im, pad)

    def draw(self, frame, state, since, t, progress=None, cy=1000, bars=None):
        """bars: Schallwellen-Animation zeigen (None = automatisch bei Hör-Zuständen)."""
        if state is None:
            return
        im, pad = self.imgs[state]
        x0, y0 = W / 2 - self.w / 2, cy - self.h / 2
        op = clamp(since / 0.15)
        put(frame, im, x0 - pad, y0 - pad + (1 - ease_out_cubic(since / 0.2)) * 12, op)
        d = ImageDraw.Draw(frame)
        if bars is None:
            bars = state in ("de", "tr", "slow") or state.startswith("tr_")
        if bars:
            for i in range(5):
                hh = 10 + 22 * abs(math.sin(t * (9 if state != "slow" else 5) + i * 0.9))
                x = x0 + self.w - 120 + i * 18
                d.rounded_rectangle([x, cy - hh / 2, x + 9, cy + hh / 2], 4, fill=RED)
        if progress is not None:
            d.rounded_rectangle([x0 + 40, y0 + self.h + 14, x0 + self.w - 40, y0 + self.h + 24], 5, fill=LINE)
            d.rounded_rectangle([x0 + 40, y0 + self.h + 14,
                                 x0 + 40 + max(10, (self.w - 80) * progress), y0 + self.h + 24], 5, fill=RED)



def mix_audio(scenes, total):
    out = np.zeros(int(math.ceil(total * SR)) + SR, np.float32)
    start = 0.0
    for sc in scenes:
        for t, clip in sc.events:
            i = int(round((start + t) * SR))
            n = min(len(clip), len(out) - i)
            if n > 0:
                out[i: i + n] += clip[:n]
        start += sc.duration
    out = out[: int(round(total * SR))]
    peak = float(np.abs(out).max())
    if peak > 0.97:
        out *= 0.97 / peak
    return out


def write_wav(path, a):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())



def write_chapters(path, scenes):
    """Kapitelmarken (FFMETADATA) aus den Szenen mit gesetztem `chapter`."""
    marks, start = [], 0.0
    for sc in scenes:
        if sc.chapter:
            marks.append((start, sc.chapter))
        start += sc.duration
    lines = [";FFMETADATA1"]
    for i, (st, name) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else start
        lines += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(st * 1000)}", f"END={int(end * 1000)}", f"title={name}"]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return marks


def run(*, doc, build_scenes, emoji_codes, video_dir, out_name, title):
    """Kommandozeile für ein Video: Assets laden, Szenen bauen, Vorschau oder MP4 rendern."""
    ap = argparse.ArgumentParser(description=doc, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cache", default=DEFAULT_CACHE, help="Ordner für Downloads & Sprachaufnahmen (geteilt)")
    ap.add_argument("--out", default=os.path.join(video_dir, "output", out_name))
    ap.add_argument("--preview", action="store_true", help="nur Standbilder (PNG) nach build/preview/ erzeugen")
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--verify", action="store_true",
                    help="türkische Aufnahmen mit Whisper prüfen und pro Wort die verständlichste Aufnahme wählen "
                         "(braucht sherpa-onnx, lädt ca. 640 MB)")
    ap.add_argument("--takes", type=int, default=6, help="max. Aufnahmen pro Wort bei --verify")
    args = ap.parse_args()

    work = os.path.join(video_dir, "build")
    os.makedirs(work, exist_ok=True)
    ensure_assets(args.cache, emoji_codes)
    if args.verify:
        ensure_whisper(args.cache)
    t0 = time.time()
    ctx = Ctx(args.cache, verify=args.verify, takes=args.takes)
    scenes = build_scenes(ctx)
    total = sum(s.duration for s in scenes)
    print(f"{len(scenes)} Szenen, Gesamtlänge {total / 60:.1f} min (Aufbau {time.time() - t0:.0f}s)", flush=True)
    if ctx.tr.report:
        uniq = list({(r["text"], r["length_scale"]): r for r in ctx.tr.report}.values())
        exact = [r for r in uniq if r["exact"]]
        print(f"Aussprache-Check (Whisper): {len(exact)}/{len(uniq)} türkische Aufnahmen exakt erkannt")
        for r in sorted(uniq, key=lambda r: r["similarity"]):
            if not r["exact"]:
                print(f"   ~ {r['text']!r} (Tempo {r['length_scale']}) gehört als {r['heard']!r}, "
                      f"Ähnlichkeit {r['similarity']:.2f}, {r['takes']} Aufnahmen")
        with open(os.path.join(work, "aussprache_check.json"), "w", encoding="utf-8") as f:
            json.dump(uniq, f, ensure_ascii=False, indent=1)

    if args.preview:
        pdir = os.path.join(work, "preview")
        os.makedirs(pdir, exist_ok=True)
        count = {}
        for i, sc in enumerate(scenes):
            name = type(sc).__name__
            count[name] = count.get(name, 0) + 1
            if count[name] > 2:
                continue
            for frac in (0.55, 0.97):
                sc.render(sc.duration * frac).save(os.path.join(pdir, f"{i:02d}_{name}_{int(frac * 100)}.png"))
        print("Vorschau:", pdir)
        return

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    wav = os.path.join(work, "audio.wav")
    write_wav(wav, mix_audio(scenes, total))
    meta = os.path.join(work, "chapters.txt")
    for st, name in write_chapters(meta, scenes):
        print(f"  {int(st // 60):02d}:{int(st % 60):02d}  {name}")

    nframes = int(round(total * FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", wav, "-i", meta, "-map", "0:v", "-map", "1:a", "-map_metadata", "2", "-map_chapters", "2",
           "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf), "-tune", "animation",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
           "-metadata", f"title={title}", "-metadata", "language=deu",
           "-movflags", "+faststart", args.out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    starts, acc = [], 0.0
    for sc in scenes:
        starts.append(acc)
        acc += sc.duration
    si = 0
    t1 = time.time()
    for fi in range(nframes):
        t = fi / FPS
        while si + 1 < len(scenes) and t >= starts[si + 1]:
            si += 1
        proc.stdin.write(scenes[si].render(t - starts[si]).tobytes())
        if fi % (FPS * 30) == 0:
            print(f"  {fi / nframes * 100:5.1f}%  ({fi}/{nframes} Bilder, {time.time() - t1:.0f}s)", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg ist fehlgeschlagen")
    print(f"Fertig: {args.out}  ({os.path.getsize(args.out) / 1e6:.1f} MB, {time.time() - t0:.0f}s)")
