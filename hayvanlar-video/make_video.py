#!/usr/bin/env python3
"""
Lernvideo „Hayvanlar – Tiere“: Deutsch → Türkisch mit türkischer Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * Titel, Anleitung und Aussprache-Regeln (ş, ç, c, ı, ğ, y, z, v)
  * 30 Tierkarten in 4 Kapiteln (deutsches Wort → türkisches Wort normal + langsam
    → Pause zum Nachsprechen)
  * Mini-Dialog „Bu ne?“, Mehrzahl mit -lar/-ler, Quiz, Übersicht, Abschluss

Stimmen:  Piper-TTS (tr_TR-dfki-medium für Türkisch, de_DE-thorsten-medium für Deutsch)
Bilder:   Twemoji (CC-BY 4.0), Schrift: Poppins (OFL)

Aufruf:
    pip install -r requirements.txt
    python make_video.py                      # rendert output/hayvanlar_tiere_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle
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

HERE = os.path.dirname(os.path.abspath(__file__))
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
# Inhalte
# --------------------------------------------------------------------------------------
@dataclass
class Animal:
    de: str            # Anzeige Deutsch (mit Artikel)
    tr: str            # Türkisch
    emoji: str         # Twemoji-Code
    syl: list          # Aussprache-Silben (deutsche Schreibweise)
    stress: int        # Index der betonten Silbe
    note: str = ""     # Aussprache-Tipp
    de_say: str = ""   # Was die deutsche Stimme sagt (falls abweichend)


@dataclass
class Chapter:
    tr: str
    de: str
    icon: str
    animals: list = field(default_factory=list)


CHAPTERS = [
    Chapter("Evcil hayvanlar", "Haustiere", "1f3e0", [
        Animal("der Hund", "köpek", "1f415", ["kö", "pek"], 1, "Rot = betonte Silbe – meistens die letzte"),
        Animal("die Katze", "kedi", "1f408", ["ke", "di"], 1),
        Animal("der Vogel", "kuş", "1f426", ["kusch"], 0, "ş = „sch“ wie in Schule"),
        Animal("der Fisch", "balık", "1f41f", ["ba", "lık"], 1, "ı = dumpfes i, wie das e in „bitte“"),
        Animal("der Hase / das Kaninchen", "tavşan", "1f407", ["taw", "schan"], 1, "v ≈ w  ·  ş = „sch“",
               de_say="der Hase, oder das Kaninchen"),
    ]),
    Chapter("Çiftlik hayvanları", "Bauernhoftiere", "1f33e", [
        Animal("das Pferd", "at", "1f40e", ["at"], 0, "Nur zwei Buchstaben – leicht zu merken!"),
        Animal("die Kuh", "inek", "1f404", ["i", "nek"], 1),
        Animal("das Schaf", "koyun", "1f411", ["ko", "jun"], 1, "y = „j“"),
        Animal("die Ziege", "keçi", "1f410", ["ke", "tschi"], 1, "ç = „tsch“ wie in Quatsch"),
        Animal("das Schwein", "domuz", "1f416", ["do", "mus"], 1, "z = weiches, summendes s wie in „Sonne“"),
        Animal("der Esel", "eşek", "1facf", ["e", "schek"], 1, "ş = „sch“"),
        Animal("das Huhn", "tavuk", "1f414", ["ta", "wuk"], 1, "v ≈ w"),
        Animal("das Küken", "civciv", "1f425", ["dschiw", "dschiw"], 1, "c = „dsch“ wie in Dschungel  ·  v ≈ w"),
        Animal("die Ente", "ördek", "1f986", ["ör", "dek"], 1, "ö wie im Deutschen"),
    ]),
    Chapter("Vahşi hayvanlar", "Wilde Tiere", "1f333", [
        Animal("der Löwe", "aslan", "1f981", ["as", "lan"], 1, "s ist im Türkischen immer scharf, wie „ß“"),
        Animal("der Tiger", "kaplan", "1f405", ["kap", "lan"], 1),
        Animal("der Bär", "ayı", "1f43b", ["a", "jı"], 1, "y = „j“  ·  ı = dumpfes i"),
        Animal("der Wolf", "kurt", "1f43a", ["kurt"], 0, "r mit der Zungenspitze, leicht gerollt"),
        Animal("der Fuchs", "tilki", "1f98a", ["til", "ki"], 1),
        Animal("der Elefant", "fil", "1f418", ["fil"], 0),
        Animal("der Affe", "maymun", "1f412", ["mai", "mun"], 1, "ay klingt wie „ei“ in Mai"),
        Animal("die Giraffe", "zürafa", "1f992", ["sü", "ra", "fa"], 2, "z = weiches s  ·  ü wie im Deutschen"),
        Animal("das Kamel", "deve", "1f42a", ["de", "we"], 1, "v ≈ w"),
        Animal("die Schlange", "yılan", "1f40d", ["jı", "lan"], 1, "y = „j“  ·  ı = dumpfes i"),
    ]),
    Chapter("Küçük hayvanlar", "Kleine Tiere", "1f50d", [
        Animal("die Maus", "fare", "1f401", ["fa", "re"], 1, "r leicht gerollt"),
        Animal("der Frosch", "kurbağa", "1f438", ["kur", "baa"], 1, "ğ ist stumm – das a davor wird lang"),
        Animal("die Schildkröte", "kaplumbağa", "1f422", ["kap", "lum", "baa"], 2, "ğ ist stumm – das a davor wird lang"),
        Animal("der Schmetterling", "kelebek", "1f98b", ["ke", "le", "bek"], 2),
        Animal("die Biene", "arı", "1f41d", ["a", "rı"], 1, "ı = dumpfes i  ·  r leicht gerollt"),
        Animal("die Ameise", "karınca", "1f41c", ["ka", "rın", "dscha"], 2, "c = „dsch“  ·  ı = dumpfes i"),
    ]),
]
ALL_ANIMALS = [a for ch in CHAPTERS for a in ch.animals]
BY_TR = {a.tr: a for a in ALL_ANIMALS}
NUM_WORDS = {1: "eins", 2: "zwei", 3: "drei", 4: "vier"}

# (Buchstabe, Erklärung kurz, deutsche Sprechertext, Beispielwort, Hervorhebung)
PRONUNCIATION = [
    ("ş", "wie „sch“", "Das S mit Häkchen klingt wie das sch in Schule.", "kuş"),
    ("ç", "wie „tsch“", "Das C mit Häkchen klingt wie das tsch in Quatsch.", "keçi"),
    ("c", "wie „dsch“", "Das normale C klingt wie das dsch in Dschungel.", "civciv"),
    ("ı", "dumpfes i (wie e in „bitte“)", "Das I ohne Punkt ist ein dumpfes i, wie das e in bitte.", "balık"),
    ("ğ", "stumm – Vokal davor wird lang", "Das weiche G spricht man nicht. Es macht den Vokal davor lang.", "kurbağa"),
    ("y", "wie „j“", "Das Y klingt wie ein deutsches J.", "koyun"),
    ("z", "weiches s wie in „Sonne“", "Das Z ist ein weiches, summendes S, wie in Sonne.", "zürafa"),
    ("v", "fast wie „w“", "Das V klingt fast wie ein W.", "tavuk"),
]

DIALOG = ["kedi", "aslan", "kelebek"]
PLURAL = [  # (Einzahl, Mehrzahl, Deutsch Einzahl, Deutsch Mehrzahl, emoji)
    ("hayvan", "hayvanlar", "Tier", "Tiere", "1f43e"),
    ("kuş", "kuşlar", "Vogel", "Vögel", "1f426"),
    ("aslan", "aslanlar", "Löwe", "Löwen", "1f981"),
    ("kedi", "kediler", "Katze", "Katzen", "1f408"),
    ("köpek", "köpekler", "Hund", "Hunde", "1f415"),
]
QUIZ = ["tavşan", "keçi", "aslan", "kelebek", "ördek", "ayı", "zürafa", "kurbağa",
        "civciv", "maymun", "karınca", "eşek"]

ICONS = ["1f442", "1f40c", "1f5e3", "1f914", "2705", "1f4a1", "1f9e0", "1f389", "1f1e9-1f1ea",
         "1f1f9-1f1f7", "27a1", "1f4ac", "1f4da", "1f44b", "2753", "1f43e", "1f50a"]


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


def ensure_assets(cache: str) -> None:
    for name in ["Poppins-ExtraBold", "Poppins-Bold", "Poppins-SemiBold", "Poppins-Medium", "Poppins-Regular"]:
        download(FONT_URL.format(name), os.path.join(cache, "fonts", name + ".ttf"))
    codes = {a.emoji for a in ALL_ANIMALS} | {c.icon for c in CHAPTERS} | set(ICONS)
    for code in sorted(codes):
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

    def __init__(self, gfx: Gfx):
        self.imgs = {}
        self.w, self.h = 860, 80
        for k, (icon, label, hot) in self.STATES.items():
            im, pad = box(self.w, self.h, 40, RED if hot else WHITE, blur=14, sh_alpha=45, sh_dy=6)
            put_center(im, gfx.emoji(icon, 50), pad + 56, pad + self.h / 2)
            t = text_layer(gfx, [(label, "SemiBold", 34, WHITE if hot else INK)])
            put(im, t, pad + 100, pad + self.h / 2 - t.baseline + 12)
            self.imgs[k] = (im, pad)

    def draw(self, frame, state, since, t, progress=None, cy=1000):
        if state is None:
            return
        im, pad = self.imgs[state]
        x0, y0 = W / 2 - self.w / 2, cy - self.h / 2
        op = clamp(since / 0.15)
        put(frame, im, x0 - pad, y0 - pad + (1 - ease_out_cubic(since / 0.2)) * 12, op)
        d = ImageDraw.Draw(frame)
        if state in ("de", "tr", "slow"):
            for i in range(5):
                hh = 10 + 22 * abs(math.sin(t * (9 if state != "slow" else 5) + i * 0.9))
                x = x0 + self.w - 120 + i * 18
                d.rounded_rectangle([x, cy - hh / 2, x + 9, cy + hh / 2], 4, fill=RED)
        if progress is not None:
            d.rounded_rectangle([x0 + 40, y0 + self.h + 14, x0 + self.w - 40, y0 + self.h + 24], 5, fill=LINE)
            d.rounded_rectangle([x0 + 40, y0 + self.h + 14,
                                 x0 + 40 + max(10, (self.w - 80) * progress), y0 + self.h + 24], 5, fill=RED)


# ---------------------------- Titel ----------------------------------------------------
class TitleScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.6)
        self.sfx("chord")
        self.say(ctx.TR("Merhaba!"), "hello")
        self.wait(0.4)
        self.say(ctx.DE("Willkommen! Heute lernst du dreißig Tiere auf Türkisch."), "welcome")
        self.wait(0.3)
        self.say(ctx.DE("Das Wort für Tiere heißt:"), "word")
        self.wait(0.25)
        self.say(ctx.TR("Hayvanlar."), "hayvanlar")
        self.wait(0.5)
        self.say(ctx.TR("Hayvanlar.", slow=True), "hayvanlar2")
        self.finish(1.0)

        self.title = text_layer(g, [("Hayvanlar", "ExtraBold", 210, RED)])
        self.sub = text_layer(g, [("Tiere auf Türkisch", "SemiBold", 68, INK)])
        self.hint = text_layer(g, [("hai · wan · ", "Medium", 46, MUTED), ("lar", "Bold", 46, RED),
                                   ("   =   die Tiere", "Medium", 46, MUTED)])
        self.merhaba = text_layer(g, [("Merhaba!", "Bold", 54, TEAL), ("  –  Hallo!", "Medium", 54, MUTED)])
        lang = text_layer(g, [("Deutsch  ", "SemiBold", 40, INK), ("→", "SemiBold", 40, RED),
                              ("  Türkçe   ·   mit Aussprache", "SemiBold", 40, INK)])
        self.lang, lpad = box(lang.width + 170, 84, 42, WHITE, blur=14, sh_alpha=35)
        put_center(self.lang, g.emoji("1f1e9-1f1ea", 48), lpad + 52, lpad + 42)
        put_center(self.lang, g.emoji("1f1f9-1f1f7", 48), lpad + lang.width + 120, lpad + 42)
        put(self.lang, lang, lpad + 85, lpad + 42 - lang.baseline + 13)
        self.floaters = [("1f415", 260, 1590, 300), ("1f408", 220, 330, 290), ("1f981", 250, 300, 800),
                         ("1f418", 260, 1620, 810), ("1f438", 170, 180, 525), ("1f98b", 160, 1320, 190),
                         ("1f422", 170, 1745, 545), ("1f426", 150, 590, 170)]

    def render(self, t):
        f = self.ctx.gfx.bg.copy()
        for i, (code, size, x, y) in enumerate(self.floaters):
            p = ease_out_back((t - 0.1 * i) / 0.6)
            dy = math.sin(t * 1.6 + i) * 12
            put_center(f, self.g.emoji(code, size), x, y + dy, opacity=clamp((t - 0.1 * i) / 0.3),
                       scale=max(0.01, 0.5 + 0.5 * p))
        pulse = 1.0
        for mk in ("hayvanlar", "hayvanlar2"):
            if self.active(t, mk):
                pulse = 1 + 0.04 * math.sin(self.since(t, mk) * 10)
        put_center(f, self.title, W / 2, 435, opacity=clamp(t / 0.5), scale=pulse * (0.9 + 0.1 * ease_out_cubic(t / 0.6)))
        put_center(f, self.sub, W / 2, 652, opacity=clamp((t - 0.3) / 0.5))
        put_center(f, self.lang, W / 2, 770, opacity=clamp((t - 0.5) / 0.5))
        if t >= self.m("hello")[0]:
            put_center(f, self.merhaba, W / 2, 200, opacity=clamp(self.since(t, "hello") / 0.3))
        if t >= self.m("hayvanlar")[0]:
            put_center(f, self.hint, W / 2, 895, opacity=clamp(self.since(t, "hayvanlar") / 0.3))
        return f


# ---------------------------- Anleitung -----------------------------------------------
class HowToScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("So funktioniert es."), "intro")
        self.wait(0.25)
        self.say(ctx.DE("Zuerst hörst du das deutsche Wort."), "s1")
        self.wait(0.25)
        self.say(ctx.DE("Dann hörst du das türkische Wort: einmal normal, und einmal langsam."), "s2")
        self.wait(0.25)
        self.say(ctx.DE("In der Pause sprichst du laut nach!"), "s3")
        self.wait(0.35)
        self.say(ctx.DE("Die rote Silbe wird betont. Meistens ist das die letzte Silbe."), "s4")
        self.wait(0.35)
        self.say(ctx.DE("Übrigens: Im Türkischen gibt es keine Artikel. Kein der, die, das!"), "s5")
        self.finish(0.8)

        steps = [("1f442", "1. Hören", "Erst Deutsch,", "dann Türkisch"),
                 ("1f40c", "2. Langsam", "Das türkische Wort", "noch einmal langsam"),
                 ("1f5e3", "3. Nachsprechen", "In der Pause", "laut nachsprechen!")]
        self.cards = []
        for icon, title, l1, l2 in steps:
            imgs = []
            for hot in (False, True):
                im, pad = box(500, 400, 40, WHITE, outline=RED if hot else None, ow=6 if hot else 0)
                put_center(im, g.emoji(icon, 130), pad + 250, pad + 110)
                tt = text_layer(g, [(title, "Bold", 48, RED if hot else INK)])
                put(im, tt, pad + 250 - tt.width / 2, pad + 240 - tt.baseline)
                for j, line in enumerate((l1, l2)):
                    lt = text_layer(g, [(line, "Medium", 34, MUTED)])
                    put(im, lt, pad + 250 - lt.width / 2, pad + 300 + j * 48 - lt.baseline)
                imgs.append((im, pad))
            self.cards.append(imgs)
        self.tip1 = self._tip("1f4a1", [("Betonung: ", "SemiBold", 40, INK), ("kö · ", "Bold", 44, MUTED),
                                        ("pek", "Bold", 44, RED), ("   –  die rote Silbe betonen", "Medium", 38, MUTED)])
        self.tip2 = self._tip("1f4ac", [("Keine Artikel: ", "SemiBold", 40, INK),
                                        ("der Hund = köpek,  die Katze = kedi", "Medium", 38, MUTED)])

    def _tip(self, icon, segs):
        lay = text_layer(self.g, segs)
        im, pad = box(lay.width + 130, 90, 45, NOTE_BG, blur=12, sh_alpha=30)
        put_center(im, self.g.emoji(icon, 50), pad + 55, pad + 45)
        put(im, lay, pad + 95, pad + 45 - lay.baseline + 14)
        return im

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "So lernst du mit diesem Video", y=175, size=66)
        for i, imgs in enumerate(self.cards):
            mk = f"s{i + 1}"
            st = self.m(mk)[0]
            hot = self.active(t, mk) or (i == 2 and self.m("s3")[1] <= t < self.m("s4")[0])
            im, pad = imgs[1 if hot else 0]
            p = ease_out_cubic((t - st + 0.1) / 0.45)
            x = 160 + i * 560 + 250
            put_center(f, im, x, 500 + (1 - p) * 40, opacity=clamp((t - st + 0.1) / 0.3))
        if t >= self.m("s4")[0]:
            put_center(f, self.tip1, W / 2, 820, opacity=clamp(self.since(t, "s4") / 0.3))
        if t >= self.m("s5")[0]:
            put_center(f, self.tip2, W / 2, 950, opacity=clamp(self.since(t, "s5") / 0.3))
        return f


# ---------------------------- Aussprache ----------------------------------------------
class PronunciationScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Zuerst die Aussprache. Diese Buchstaben klingen im Türkischen anders."), "intro")
        self.wait(0.4)
        for i, (_, _, de_text, word) in enumerate(PRONUNCIATION):
            st = self.t
            self.say(ctx.DE(de_text))
            self.wait(0.3)
            self.say(ctx.TR(word + "."), f"w{i}")
            self.wait(0.35)
            self.say(ctx.TR(word + ".", slow=True))
            self.wait(0.6)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Ö und Ü sprichst du genau wie im Deutschen."), "outro")
        self.finish(0.8)

        self.rows = []
        rw, rh = 820, 150
        for letter, expl, _, word in PRONUNCIATION:
            a = BY_TR[word]
            pair = []
            for hot in (False, True):
                im, pad = box(rw, rh, 30, RED_SOFT if hot else WHITE, outline=RED if hot else None,
                              ow=4 if hot else 0, blur=12, sh_alpha=30, sh_dy=5)
                lt = text_layer(g, [(letter, "ExtraBold", 96, RED)])
                put(im, lt, pad + 80 - lt.width / 2, pad + 108 - lt.baseline)
                ef = g.fit("SemiBold", expl, 34, 420)
                et = text_layer(g, [(expl, "SemiBold", ef.size, INK)])
                put(im, et, pad + 160, pad + 62 - et.baseline + 8)
                segs = []
                for ch in word:
                    segs.append((ch, "Bold", 40, RED if ch == letter else TEAL))
                segs.append(("  (" + a.de.split(" / ")[0] + ")", "Medium", 28, MUTED))
                wt = text_layer(g, segs)
                put(im, wt, pad + 160, pad + 118 - wt.baseline + 8)
                put_center(im, g.emoji(a.emoji, 104), pad + rw - 85, pad + rh / 2)
                pair.append((im, pad))
            self.rows.append(pair)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Aussprache: Diese Buchstaben sind anders", y=120, size=58)
        cur = -1
        for i in range(len(self.rows)):
            if t >= self.m(f"row{i}")[0]:
                cur = i
        for i, pair in enumerate(self.rows):
            col, row = divmod(i, 4)
            cx = 520 + col * 880
            cy = 260 + row * 185
            hot = i == cur and t < self.m("outro")[0]
            im, pad = pair[1 if hot else 0]
            if i <= cur:
                op = 1.0
            else:
                op = 0.35 * clamp((t - 0.2 - i * 0.06) / 0.4)
            sc = 1.0 + (0.025 * ease_out_back(self.since(t, f"row{i}") / 0.35) if hot else 0)
            put_center(f, im, cx, cy, opacity=op, scale=sc)
        if t >= self.m("outro")[0]:
            tip = text_layer(self.g, [("ö", "Bold", 44, RED), (" und ", "Medium", 40, INK), ("ü", "Bold", 44, RED),
                                      (" klingen genau wie im Deutschen", "Medium", 40, INK)])
            put_center(f, tip, W / 2, 1010, opacity=clamp(self.since(t, "outro") / 0.3))
        return f


# ---------------------------- Kapitel -------------------------------------------------
class ChapterScene(Scene):
    def __init__(self, ctx, num, ch: Chapter):
        super().__init__(ctx)
        g = self.g
        self.ch = ch
        self.wait(0.2)
        self.sfx("chord")
        self.say(ctx.DE(f"Kapitel {NUM_WORDS[num]}: {ch.de}."), "de")
        self.wait(0.3)
        self.say(ctx.TR(ch.tr + "."), "tr")
        self.finish(0.9)
        self.kap = text_layer(g, [(f"BÖLÜM {num}", "SemiBold", 36, RED), (f"  ·  KAPITEL {num}", "SemiBold", 36, MUTED)])
        self.trl = text_layer(g, [(ch.tr, "ExtraBold", 130, RED)])
        self.del_ = text_layer(g, [(ch.de, "SemiBold", 70, TEAL)])
        self.icons = [a.emoji for a in ch.animals]

    def render(self, t):
        f = self.g.bg.copy()
        put_center(f, self.g.emoji(self.ch.icon, 170), W / 2, 230, opacity=clamp(t / 0.3),
                   scale=0.6 + 0.4 * ease_out_back(t / 0.5))
        put_center(f, self.kap, W / 2, 380, opacity=clamp((t - 0.1) / 0.3))
        put_center(f, self.del_, W / 2, 470, opacity=clamp((t - 0.2) / 0.3))
        if t >= self.m("tr")[0] - 0.1:
            s = self.since(t, "tr") + 0.1
            put_center(f, self.trl, W / 2, 610, opacity=clamp(s / 0.3), scale=0.92 + 0.08 * ease_out_back(s / 0.4))
        n = len(self.icons)
        for i, code in enumerate(self.icons):
            x = W / 2 + (i - (n - 1) / 2) * 150
            p = (t - 0.4 - i * 0.08) / 0.4
            put_center(f, self.g.emoji(code, 110), x, 860 + math.sin(t * 2 + i) * 6, opacity=clamp(p),
                       scale=max(0.01, 0.5 + 0.5 * ease_out_back(p)))
        return f


# ---------------------------- Vokabelkarte --------------------------------------------
CARD_X, CARD_Y, CARD_S = 110, 185, 740
RX, RW = 930, 880


def card_base(ctx: Ctx):
    g = ctx.gfx
    base = g.bg.copy()
    im, pad = box(CARD_S, CARD_S, 56, WHITE, blur=26, sh_alpha=60, sh_dy=16)
    base.paste(im, (CARD_X - pad, CARD_Y - pad), im)
    put_center(base, g.emoji("1f1e9-1f1ea", 44), RX + 22, 232)
    lab = text_layer(g, [("DEUTSCH", "SemiBold", 30, MUTED)])
    put(base, lab, RX + 62, 232 - lab.baseline + 11)
    ImageDraw.Draw(base).rounded_rectangle([RX, 404, RX + RW, 408], 2, fill=LINE)
    put_center(base, g.emoji("1f1f9-1f1f7", 44), RX + 22, 462)
    lab = text_layer(g, [("TÜRKÇE", "SemiBold", 30, MUTED)])
    put(base, lab, RX + 62, 462 - lab.baseline + 11)
    return base


def pron_layer(g: Gfx, a: Animal):
    segs = [("Aussprache:  ", "Medium", 36, MUTED)]
    for i, s in enumerate(a.syl):
        if i:
            segs.append((" · ", "Medium", 50, MUTED))
        segs.append((s, "Bold", 54, RED if i == a.stress else INK))
    lay = text_layer(g, segs)
    im, pad = box(lay.width + 60, 96, 48, WHITE, blur=12, sh_alpha=30, sh_dy=5)
    put(im, lay, pad + 30, pad + 48 - lay.baseline + 17)
    return im, pad


def note_layer(g: Gfx, text):
    lay = text_layer(g, [(text, "Medium", g.fit("Medium", text, 34, RW - 120).size, INK)])
    im, pad = box(min(RW, lay.width + 110), 76, 38, NOTE_BG, blur=10, sh_alpha=25, sh_dy=4)
    put_center(im, g.emoji("1f4a1", 42), pad + 44, pad + 38)
    put(im, lay, pad + 76, pad + 38 - lay.baseline + 12)
    return im, pad


class CardScene(Scene):
    def __init__(self, ctx, a: Animal, ch: Chapter, idx: int, total: int):
        super().__init__(ctx)
        g = self.g
        self.a, self.ch, self.idx, self.total = a, ch, idx, total
        self.sfx("pop", at=0.05)
        self.wait(0.55)
        self.say(ctx.DE(a.de_say or a.de), "de")
        self.wait(0.4)
        self.say(ctx.TR(a.tr + "."), "tr")
        self.wait(0.55)
        slow = ctx.TR(a.tr + ".", slow=True)
        self.say(slow, "slow")
        self.wait(0.15)
        rep = max(2.4, 1.3 * len(slow) / SR + 1.2)
        self.span("speak", rep)
        self.wait(rep)
        self.finish(0.25)

        self.base = ctx.card_base.copy()
        self.title_bar(self.base, ch.icon, ch.tr, ch.de, right=f"{idx} / {total}", progress=idx / total)
        self.emo = g.emoji(a.emoji, 620)
        fde = g.fit("SemiBold", a.de, 84, RW)
        self.del_ = text_layer(g, [(a.de, "SemiBold", fde.size, TEAL)])
        ftr = g.fit("ExtraBold", a.tr, 180, RW)
        self.trl = text_layer(g, [(a.tr, "ExtraBold", ftr.size, RED)])
        self.pron = pron_layer(g, a)
        self.note = note_layer(g, a.note) if a.note else None
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 540 / 620))
        s = t - 0.25
        put(f, self.del_, RX - 12, 350 - self.del_.baseline + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.3))
        if t >= self.m("tr")[0] - 0.05:
            s = self.since(t, "tr") + 0.05
            pulse = 1 + (0.03 * math.sin(self.since(t, "slow") * 8) if self.active(t, "slow") else 0)
            sc = (0.85 + 0.15 * ease_out_back(s / 0.4)) * pulse
            im = self.trl
            put_center(f, im, RX - 12 + im.width * 1.0 / 2, 640 - im.baseline + im.height / 2,
                       opacity=clamp(s / 0.25), scale=sc)
            im, pad = self.pron
            put(f, im, RX - pad, 700 - pad + (1 - ease_out_cubic((s - 0.25) / 0.35)) * 16, clamp((s - 0.25) / 0.3))
        if self.note and t >= self.m("slow")[0]:
            s = self.since(t, "slow")
            im, pad = self.note
            put(f, im, RX - pad, 822 - pad + (1 - ease_out_cubic(s / 0.35)) * 16, clamp(s / 0.3))
        state, since, prog = None, 0, None
        for k in ("de", "tr", "slow", "speak"):
            if self.active(t, k):
                state, since = k, self.since(t, k)
        if state is None and self.m("slow")[1] <= t < self.m("speak")[0]:
            state, since = "slow", self.since(t, "slow")
        if state == "speak":
            a, b = self.m("speak")
            prog = 1 - (t - a) / (b - a)
        self.pill.draw(f, state, since, t, prog)
        return f


# ---------------------------- Dialog --------------------------------------------------
class DialogScene(Scene):
    def __init__(self, ctx, word, first):
        super().__init__(ctx)
        g = self.g
        a = BY_TR[word]
        self.a = a
        self.first = first
        self.wait(0.3)
        if first:
            self.say(ctx.DE("Jetzt ein kleiner Dialog. So fragst du: Was ist das?"), "intro")
            self.wait(0.3)
        self.say(ctx.TR("Bu ne?"), "q")
        self.wait(0.3)
        if first:
            self.say(ctx.DE("Und so antwortest du:"), "de1")
            self.wait(0.3)
        else:
            self.span("ask", 2.2)
            self.wait(2.2)
        self.say(ctx.TR(f"Bu bir {word}."), "a")
        self.wait(0.4)
        art = a.de.split(" / ")[0].split(" ")[0]
        noun = a.de.split(" / ")[0].split(" ", 1)[1]
        ein = {"der": "ein", "das": "ein", "die": "eine"}[art]
        self.de_answer = f"Das ist {ein} {noun}."
        self.say(ctx.DE(self.de_answer), "de2")
        self.wait(0.3)
        self.say(ctx.TR(f"Bu bir {word}.", slow=True), "a2")
        self.span("speak", 2.6)
        self.wait(2.6)
        self.finish(0.3)

        self.base = g.bg.copy()
        self.heading(self.base, "Mini-Dialog: Bu ne?  –  Was ist das?", y=150, size=60)
        im, pad = box(560, 560, 50, WHITE, blur=24, sh_alpha=55)
        self.base.paste(im, (150 - pad, 260 - pad), im)
        self.emo = g.emoji(a.emoji, 440)
        self.q = self._bubble("Bu ne?", "Was ist das?", TEAL, left=True)
        self.ans = self._bubble(f"Bu bir {word}.", self.de_answer, RED, left=False)
        tip = text_layer(g, [("bu", "Bold", 36, RED), (" = das/dies    ", "Medium", 34, MUTED),
                             ("ne", "Bold", 36, RED), (" = was    ", "Medium", 34, MUTED),
                             ("bir", "Bold", 36, RED), (" = ein/eine", "Medium", 34, MUTED)])
        self.tip, tpad = box(tip.width + 70, 74, 37, NOTE_BG, blur=10, sh_alpha=25)
        put(self.tip, tip, tpad + 35, tpad + 37 - tip.baseline + 12)
        self.pill = ctx.pill

    def _bubble(self, tr, de, color, left):
        g = self.g
        t1 = text_layer(g, [(tr, "ExtraBold", 84, color)])
        t2 = text_layer(g, [(de, "Medium", 40, MUTED)])
        w = max(t1.width, t2.width) + 90
        im, pad = box(w, 200, 44, WHITE, blur=18, sh_alpha=45)
        d = ImageDraw.Draw(im)
        tx = pad + (50 if left else w - 50)
        d.polygon([(tx - 26, pad + 198), (tx + 26, pad + 198), (tx + (-30 if left else 30), pad + 240)], fill=WHITE)
        put(im, t1, pad + 45 - 12, pad + 100 - t1.baseline)
        put(im, t2, pad + 45 - 12, pad + 165 - t2.baseline)
        return im

    def render(self, t):
        f = self.base.copy()
        put_center(f, self.emo, 430, 540 + math.sin(t * 2) * 6, opacity=clamp(t / 0.3),
                   scale=0.7 + 0.3 * ease_out_back(t / 0.5))
        if t >= self.m("q")[0] - 0.05:
            s = self.since(t, "q") + 0.05
            put(f, self.q, 820, 250 + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.25))
        if t >= self.m("a")[0] - 0.05:
            s = self.since(t, "a") + 0.05
            put(f, self.ans, 1810 - self.ans.width + 40, 540 + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.25))
        put_center(f, self.tip, W / 2, 890, opacity=clamp((t - 0.4) / 0.4))
        state, since, prog = None, 0, None
        for k in ("q", "a", "a2"):
            if self.active(t, k):
                state, since = ("slow" if k == "a2" else "tr"), self.since(t, k)
        for k in ("intro", "de1", "de2"):
            if self.active(t, k):
                state, since = "de", self.since(t, k)
        if self.active(t, "ask"):
            state, since = "ask", self.since(t, "ask")
            a, b = self.m("ask")
            prog = 1 - (t - a) / (b - a)
        if self.active(t, "speak"):
            state, since = "speak", self.since(t, "speak")
            a, b = self.m("speak")
            prog = 1 - (t - a) / (b - a)
        self.pill.draw(f, state, since, t, prog)
        return f


# ---------------------------- Mehrzahl ------------------------------------------------
class PluralScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Die Mehrzahl ist im Türkischen ganz einfach: Man hängt eine Endung an."), "intro")
        self.wait(0.25)
        self.say(ctx.DE("Welche Endung, das hängt vom letzten Vokal ab."), "rule")
        self.wait(0.4)
        for i, (sg, pl, *_r) in enumerate(PLURAL):
            st = self.t
            self.say(ctx.TR(sg + "."))
            self.wait(0.35)
            self.say(ctx.TR(pl + "."), f"pl{i}")
            self.wait(1.0)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Darum heißt der Titel dieses Videos:"), "end")
        self.wait(0.2)
        self.say(ctx.TR("Hayvanlar."), "end_tr")
        self.wait(0.3)
        self.say(ctx.DE("Tiere!"), "end_de")
        self.finish(0.9)

        self.rules = []
        for vow, suf in (("a, ı, o, u", "-lar"), ("e, i, ö, ü", "-ler")):
            lay = text_layer(g, [("letzter Vokal  ", "Medium", 36, MUTED), (vow, "Bold", 40, INK),
                                 ("   →   ", "Bold", 40, MUTED), (suf, "ExtraBold", 54, RED)])
            im, pad = box(lay.width + 80, 100, 50, WHITE, blur=12, sh_alpha=30)
            put(im, lay, pad + 40, pad + 50 - lay.baseline + 16)
            self.rules.append(im)
        self.rows = []
        for sg, pl, dsg, dpl, emo in PLURAL:
            suf = pl[len(sg):]
            lay = text_layer(g, [(sg, "Bold", 54, TEAL), ("   →   ", "Bold", 46, MUTED), (sg, "Bold", 54, TEAL),
                                 (suf, "ExtraBold", 54, RED), (f"      {dsg} → {dpl}", "Medium", 36, MUTED)])
            im, pad = box(1180, 104, 52, WHITE, blur=10, sh_alpha=28, sh_dy=4)
            put_center(im, g.emoji(emo, 70), pad + 70, pad + 52)
            put(im, lay, pad + 130, pad + 52 - lay.baseline + 16)
            self.rows.append(im)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Mehrzahl: -lar oder -ler", y=130, size=64)
        for i, im in enumerate(self.rules):
            s = t - self.m("rule")[0] - i * 0.4
            put_center(f, im, 520 + i * 880, 245, opacity=clamp(s / 0.3))
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                s = t - st
                hl = self.active(t, f"row{i}")
                put_center(f, im, W / 2, 395 + i * 122 + (1 - ease_out_cubic(s / 0.35)) * 20,
                           opacity=clamp(s / 0.25), scale=1.03 if hl else 1.0)
        if t >= self.m("end")[0]:
            s = self.since(t, "end")
            lay = text_layer(self.g, [("Hayvan", "ExtraBold", 76, TEAL), ("lar", "ExtraBold", 76, RED),
                                      ("  =  Tiere!", "Bold", 64, INK)])
            put_center(f, lay, W / 2, 1010, opacity=clamp(s / 0.3))
        return f


# ---------------------------- Quiz ----------------------------------------------------
class QuizIntroScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        self.wait(0.3)
        self.sfx("chord")
        self.say(ctx.DE("Quiz-Zeit! Ich zeige dir ein Tier."), "a")
        self.wait(0.2)
        self.say(ctx.DE("Sag das türkische Wort laut, bevor die Lösung kommt. Bereit?"), "b")
        self.finish(0.8)
        self.t1 = text_layer(self.g, [("Quiz-Zeit!", "ExtraBold", 150, RED)])
        self.t2 = text_layer(self.g, [("Sag das türkische Wort, bevor die Lösung kommt.", "SemiBold", 50, INK)])

    def render(self, t):
        f = self.g.bg.copy()
        put_center(f, self.g.emoji("1f9e0", 220), W / 2, 300 + math.sin(t * 2) * 8, opacity=clamp(t / 0.3),
                   scale=0.6 + 0.4 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 540, opacity=clamp((t - 0.2) / 0.3))
        put_center(f, self.t2, W / 2, 680, opacity=clamp((t - self.m("b")[0]) / 0.3))
        return f


class QuizScene(Scene):
    COUNT = 3

    def __init__(self, ctx, word, idx, total):
        super().__init__(ctx)
        g = self.g
        a = BY_TR[word]
        self.a = a
        self.sfx("pop", at=0.05)
        self.wait(0.5)
        self.say(ctx.DE(a.de_say or a.de), "de")
        self.wait(0.2)
        self.span("count", self.COUNT + 0.6)
        for i in range(self.COUNT):
            self.sfx("tick", at=self.t + 0.3 + i)
        self.wait(self.COUNT + 0.6)
        self.sfx("ding")
        self.say(ctx.TR(a.tr + "."), "tr")
        self.wait(0.4)
        self.say(ctx.TR(a.tr + ".", slow=True), "slow")
        self.span("speak", 1.8)
        self.wait(1.8)
        self.finish(0.2)

        self.base = ctx.card_base.copy()
        self.title_bar(self.base, "1f9e0", "Quiz", "Wie heißt das auf Türkisch?", right=f"{idx} / {total}",
                       progress=idx / total)
        self.emo = g.emoji(a.emoji, 620)
        fde = g.fit("SemiBold", a.de, 84, RW)
        self.del_ = text_layer(g, [(a.de, "SemiBold", fde.size, TEAL)])
        ftr = g.fit("ExtraBold", a.tr, 180, RW)
        self.trl = text_layer(g, [(a.tr, "ExtraBold", ftr.size, RED)])
        self.qm = text_layer(g, [("? ? ?", "ExtraBold", 150, (215, 200, 190))])
        self.pron = pron_layer(g, a)
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 540 / 620))
        s = t - 0.25
        put(f, self.del_, RX - 12, 350 - self.del_.baseline + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.3))
        reveal = self.m("tr")[0] - 0.05
        if t < reveal:
            put(f, self.qm, RX - 12, 630 - self.qm.baseline, clamp((t - 0.3) / 0.3))
            if self.active(t, "count"):
                a, b = self.m("count")
                rem = 1 - (t - a) / (b - a)
                n = max(1, math.ceil(rem * self.COUNT))
                ring = Image.new("RGBA", (240, 240), (0, 0, 0, 0))
                d = ImageDraw.Draw(ring)
                d.ellipse([8, 8, 232, 232], fill=WHITE)
                d.arc([14, 14, 226, 226], -90, -90 + 360 * rem, fill=RED, width=18)
                d.text((120, 122), str(n), font=self.g.font("ExtraBold", 110), fill=INK, anchor="mm")
                put_center(f, ring, 1640, 820)
        else:
            s = t - reveal
            im = self.trl
            put_center(f, im, RX - 12 + im.width / 2, 640 - im.baseline + im.height / 2,
                       opacity=clamp(s / 0.2), scale=0.8 + 0.2 * ease_out_back(s / 0.4))
            im, pad = self.pron
            put(f, im, RX - pad, 700 - pad, clamp((s - 0.25) / 0.3))
            put_center(f, self.g.emoji("2705", 110), 1700, 250, opacity=clamp(s / 0.2),
                       scale=0.5 + 0.5 * ease_out_back(s / 0.4))
        state, since, prog = None, 0, None
        if self.active(t, "de"):
            state, since = "de", self.since(t, "de")
        if self.active(t, "count"):
            state, since = "think", self.since(t, "count")
        if t >= self.m("tr")[0]:
            state, since = "answer", self.since(t, "tr")
        self.pill.draw(f, state, since, t, prog)
        return f


# ---------------------------- Übersicht & Ende ----------------------------------------
class OverviewScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.4)
        self.say(ctx.DE("Hier sind alle dreißig Tiere auf einen Blick."), "a")
        self.wait(0.3)
        self.say(ctx.DE("Halte das Video an und mach einen Screenshot!"), "b")
        self.wait(5.0)
        self.finish(0.3)
        self.base = g.bg.copy()
        self.heading(self.base, "Alle 30 Tiere auf einen Blick", y=88, size=54)
        self.cells = []
        cw, ch_ = 290, 186
        x0, y0 = (W - 6 * cw) / 2, 128
        for i, a in enumerate(ALL_ANIMALS):
            ih = ch_ - 14
            im, pad = box(cw - 14, ih, 26, WHITE, blur=8, sh_alpha=25, sh_dy=3)
            put_center(im, g.emoji(a.emoji, 72), pad + (cw - 14) / 2, pad + 50)
            tr = text_layer(g, [(a.tr, "Bold", g.fit("Bold", a.tr, 40, cw - 40).size, RED)])
            put(im, tr, pad + (cw - 14) / 2 - tr.width / 2, pad + 128 - tr.baseline)
            de = a.de.split(" / ")[0]
            dl = text_layer(g, [(de, "Medium", g.fit("Medium", de, 25, cw - 40).size, MUTED)])
            put(im, dl, pad + (cw - 14) / 2 - dl.width / 2, pad + 160 - dl.baseline)
            col, row = i % 6, i // 6
            self.cells.append((im, x0 + col * cw + cw / 2, y0 + row * ch_ + ch_ / 2))

    def render(self, t):
        f = self.base.copy()
        for i, (im, x, y) in enumerate(self.cells):
            p = (t - i * 0.035) / 0.35
            put_center(f, im, x, y + (1 - ease_out_cubic(p)) * 20, opacity=clamp(p))
        return f


class OutroScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.sfx("fanfare")
        self.say(ctx.TR("Tebrikler!"), "teb")
        self.wait(0.3)
        self.say(ctx.DE("Super gemacht! Du kennst jetzt dreißig Tiere auf Türkisch."), "a")
        self.wait(0.25)
        self.say(ctx.DE("Wiederhole das Video morgen noch einmal, dann bleiben die Wörter im Kopf."), "b")
        self.wait(0.35)
        self.say(ctx.TR("Görüşürüz!"), "gor")
        self.wait(0.2)
        self.say(ctx.DE("Bis bald!"), "bye")
        self.finish(2.0)
        self.t1 = text_layer(g, [("Tebrikler!", "ExtraBold", 190, RED)])
        self.t2 = text_layer(g, [("Herzlichen Glückwunsch – du kennst jetzt 30 Tiere auf Türkisch!", "SemiBold", 48, INK)])
        self.t3 = text_layer(g, [("Görüşürüz!", "Bold", 80, TEAL), ("  –  Bis bald!", "SemiBold", 64, MUTED)])
        self.credits = text_layer(g, [("Bilder: Twemoji (CC-BY 4.0)  ·  Stimmen: Piper TTS (dfki, thorsten)  ·  Schrift: Poppins",
                                       "Regular", 24, MUTED)])
        rnd = random.Random(3)
        cols = [RED, TEAL, (245, 158, 11), (59, 130, 246), (236, 72, 153)]
        self.conf = [(rnd.uniform(0, W), rnd.uniform(-600, -20), rnd.uniform(140, 320), rnd.uniform(0, 6.28),
                      rnd.uniform(3, 8), rnd.choice(cols), rnd.randint(10, 22)) for _ in range(110)]

    def render(self, t):
        f = self.g.bg.copy()
        d = ImageDraw.Draw(f)
        for x, y, v, ph, sp, c, s in self.conf:
            yy = (y + v * t + 600) % (H + 640) - 600
            xx = x + math.sin(t * 2 + ph) * 30
            w2 = s * abs(math.cos(t * sp + ph)) / 2 + 2
            d.rectangle([xx - w2, yy - s / 3, xx + w2, yy + s / 3], fill=c)
        put_center(f, self.g.emoji("1f389", 200), W / 2, 230, opacity=clamp(t / 0.3), scale=0.5 + 0.5 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 470, opacity=clamp((t - 0.2) / 0.3), scale=0.85 + 0.15 * ease_out_back((t - 0.2) / 0.5))
        put_center(f, self.t2, W / 2, 610, opacity=clamp((t - self.m("a")[0]) / 0.3))
        if t >= self.m("gor")[0]:
            s = self.since(t, "gor")
            put_center(f, self.t3, W / 2, 760, opacity=clamp(s / 0.3))
            put_center(f, self.g.emoji("1f44b", 110), W / 2 + self.t3.width / 2 + 80, 760,
                       opacity=clamp(s / 0.3), scale=1.0)
        put_center(f, self.credits, W / 2, 1040, opacity=clamp((t - 1) / 0.5))
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    scenes =[TitleScene(ctx), HowToScene(ctx), PronunciationScene(ctx)]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for a in ch.animals:
            idx += 1
            scenes.append(CardScene(ctx, a, ch, idx, len(ALL_ANIMALS)))
    for i, w_ in enumerate(DIALOG):
        scenes.append(DialogScene(ctx, w_, first=(i == 0)))
    scenes.append(PluralScene(ctx))
    scenes.append(QuizIntroScene(ctx))
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, w_, i, len(QUIZ)))
    scenes.append(OverviewScene(ctx))
    scenes.append(OutroScene(ctx))
    return scenes


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
    """Kapitelmarken (FFMETADATA) für Player, die Kapitel anzeigen."""
    names = {TitleScene: "Merhaba – Einführung", HowToScene: "So lernst du", PronunciationScene: "Aussprache",
             DialogScene: "Mini-Dialog: Bu ne?", PluralScene: "Mehrzahl -lar/-ler", QuizIntroScene: "Quiz",
             OverviewScene: "Übersicht", OutroScene: "Tebrikler!"}
    lines = [";FFMETADATA1"]
    start = 0.0
    marks = []
    for sc in scenes:
        name = None
        if isinstance(sc, ChapterScene):
            name = f"{sc.ch.tr} – {sc.ch.de}"
        elif type(sc) in names and not (isinstance(sc, DialogScene) and not sc.first):
            name = names[type(sc)]
        if name:
            marks.append((start, name))
        start += sc.duration
    for i, (st, name) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else start
        lines += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(st * 1000)}", f"END={int(end * 1000)}", f"title={name}"]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return marks


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cache", default=os.path.join(HERE, "build"), help="Ordner für Downloads & Zwischendateien")
    ap.add_argument("--out", default=os.path.join(HERE, "output", "hayvanlar_tiere_deutsch_tuerkisch.mp4"))
    ap.add_argument("--preview", action="store_true", help="nur Standbilder (PNG) erzeugen")
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--verify", action="store_true",
                    help="türkische Aufnahmen mit Whisper prüfen und pro Wort die verständlichste Aufnahme wählen "
                         "(braucht sherpa-onnx, lädt ca. 640 MB)")
    ap.add_argument("--takes", type=int, default=6, help="max. Aufnahmen pro Wort bei --verify")
    args = ap.parse_args()

    ensure_assets(args.cache)
    if args.verify:
        ensure_whisper(args.cache)
    t0 = time.time()
    ctx = Ctx(args.cache, verify=args.verify, takes=args.takes)
    scenes = build_scenes(ctx)
    total = sum(s.duration for s in scenes)
    print(f"{len(scenes)} Szenen, Gesamtlänge {total / 60:.1f} min (Aufbau {time.time() - t0:.0f}s)", flush=True)
    if ctx.tr.report:
        uniq = {(r["text"], r["length_scale"]): r for r in ctx.tr.report}.values()
        exact = [r for r in uniq if r["exact"]]
        print(f"Aussprache-Check (Whisper): {len(exact)}/{len(uniq)} türkische Aufnahmen exakt erkannt")
        for r in sorted(uniq, key=lambda r: r["similarity"]):
            if not r["exact"]:
                print(f"   ~ {r['text']!r} (Tempo {r['length_scale']}) gehört als {r['heard']!r}, "
                      f"Ähnlichkeit {r['similarity']:.2f}, {r['takes']} Aufnahmen")
        with open(os.path.join(args.cache, "aussprache_check.json"), "w", encoding="utf-8") as f:
            json.dump(list(uniq), f, ensure_ascii=False, indent=1)

    if args.preview:
        pdir = os.path.join(args.cache, "preview")
        os.makedirs(pdir, exist_ok=True)
        seen = set()
        for i, sc in enumerate(scenes):
            if type(sc) in seen and not isinstance(sc, (ChapterScene,)) and i not in (5, 6):
                continue
            seen.add(type(sc))
            for frac in (0.55, 0.97):
                sc.render(sc.duration * frac).save(os.path.join(pdir, f"{i:02d}_{type(sc).__name__}_{int(frac * 100)}.png"))
        print("Vorschau:", pdir)
        return

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    wav = os.path.join(args.cache, "audio.wav")
    write_wav(wav, mix_audio(scenes, total))
    meta = os.path.join(args.cache, "chapters.txt")
    for st, name in write_chapters(meta, scenes):
        print(f"  {int(st // 60):02d}:{int(st % 60):02d}  {name}")

    nframes = int(round(total * FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", wav, "-i", meta, "-map", "0:v", "-map", "1:a", "-map_metadata", "2", "-map_chapters", "2",
           "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf), "-tune", "animation",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
           "-metadata", "title=Hayvanlar – Tiere auf Türkisch", "-metadata", "language=deu",
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
        frame = scenes[si].render(t - starts[si])
        proc.stdin.write(frame.tobytes())
        if fi % (FPS * 30) == 0:
            el = time.time() - t1
            print(f"  {fi / nframes * 100:5.1f}%  ({fi}/{nframes} Bilder, {el:.0f}s)", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg ist fehlgeschlagen")
    print(f"Fertig: {args.out}  ({os.path.getsize(args.out) / 1e6:.1f} MB, {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
