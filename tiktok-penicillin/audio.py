"""
Sound effects for the penicillin story short, synthesized with numpy/scipy. No music (series rule).
Everything is placed on the cue times that the animation uses as well (timeline.json -> cues).
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, sosfilt_zi

RNG = np.random.default_rng(11)


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def sos(kind: str, f, sr: int, order: int = 2):
    return butter(order, f, btype=kind, fs=sr, output="sos")


def filt(x, kind, f, sr, order=2):
    return sosfilt(sos(kind, f, sr, order), x, axis=0)


def sweep(x: np.ndarray, sr: int, f0: float, f1: float, kind: str = "lowpass", curve: float = 1.0, block: int = 256):
    """Filter with a cutoff that moves (log-scale) from f0 to f1 over the length of x."""
    y = np.zeros_like(x)
    n = len(x)
    zi = None
    for i in range(0, n, block):
        u = (i / max(1, n - 1)) ** curve
        f = float(np.exp(np.log(f0) + (np.log(f1) - np.log(f0)) * u))
        s = sos(kind, min(f, sr * 0.45), sr)
        if zi is None:
            zi = sosfilt_zi(s) * 0
        y[i:i + block], zi = sosfilt(s, x[i:i + block], zi=zi)
    return y


def env_ad(n: int, sr: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / sr
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / decay)


def place(bus: np.ndarray, x: np.ndarray, t0: float, sr: int, gain: float = 1.0, pan: float = 0.0) -> None:
    """Add a mono (or stereo) sound to a stereo bus at time t0 (constant power pan -1..1)."""
    i = int(round(t0 * sr))
    if i >= len(bus):
        return
    if i < 0:
        x = x[-i:]
        i = 0
    x = x[: len(bus) - i]
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        bus[i:i + len(x), 0] += x * gain * np.cos(a)
        bus[i:i + len(x), 1] += x * gain * np.sin(a)
    else:
        bus[i:i + len(x)] += x * gain


def noise(n: int) -> np.ndarray:
    return RNG.standard_normal(n).astype(np.float32)


def bell(f, sr, dur=1.6):
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 0.9), (2.76, 0.5, 0.45), (5.4, 0.25, 0.25), (8.93, 0.12, 0.12)]:
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / dec)
    return x * env_ad(n, sr, 0.002, 10)



# ------------------------------------------------------------------------------ sfx
def whoosh(sr, dur=0.55, rise=0.65, f0=300, f1=5000):
    n = int(dur * sr)
    x = noise(n)
    up = int(n * rise)
    y = np.concatenate([sweep(x[:up], sr, f0, f1, "lowpass", 1.5),
                        sweep(x[up:], sr, f1, f0 * 0.8, "lowpass", 0.6)])
    e = np.concatenate([np.linspace(0, 1, up) ** 2.2, np.linspace(1, 0, n - up) ** 1.6])
    return filt(y, "highpass", 120, sr) * e


def impact(sr, big=1.0):
    n = int(2.2 * sr)
    t = np.arange(n) / sr
    f = 32 + 70 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (0.55 * big))
    crack = filt(noise(n), "lowpass", 2500, sr) * env_ad(n, sr, 0.001, 0.09)
    tail = filt(noise(n), "lowpass", 600, sr) * env_ad(n, sr, 0.01, 0.6) * 0.35
    return np.tanh(1.4 * (boom + 0.55 * crack + tail))


def riser(sr, dur):
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = sweep(noise(n), sr, 300, 9000, "lowpass", 2.0) * (t / dur) ** 2.2 * 0.6
    f = 180 * 2 ** (2.5 * (t / dur) ** 1.8)
    tone = np.sin(2 * np.pi * np.cumsum(f) / sr) * (t / dur) ** 2 * 0.25
    return x + tone


def tick(sr):
    n = int(0.03 * sr)
    t = np.arange(n) / sr
    return np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.006) + 0.3 * filt(noise(n), "highpass", 4000, sr) * np.exp(-t / 0.003)


def pop(sr, f0=500, f1=1300):
    n = int(0.09 * sr)
    t = np.arange(n) / sr
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * env_ad(n, sr, 0.001, 0.03)




# ------------------------------------------------------------------------------ new sfx for this short
def chop(sr):
    """Axe hitting wood: dull thump + woody knock."""
    n = int(0.35 * sr)
    t = np.arange(n) / sr
    thump = np.sin(2 * np.pi * (90 + 120 * np.exp(-t / 0.015)) * t) * np.exp(-t / 0.06)
    knock = filt(noise(n), "bandpass", [600, 2200], sr) * env_ad(n, sr, 0.0005, 0.02)
    tone = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.04) * 0.4
    return np.tanh(1.8 * (thump + 0.9 * knock + tone))


def tree_fall(sr, dur=1.1):
    """Creak while the tree tips over, then a crash with rustling leaves."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = 140 + 90 * np.sin(2 * np.pi * 3 * t) + 60 * t
    creak = filt(np.sign(np.sin(2 * np.pi * np.cumsum(f) / sr)) * 0.3, "bandpass", [300, 1800], sr)
    creak *= np.clip(t / 0.1, 0, 1) * np.clip((0.7 - t) / 0.1, 0, 1)
    hit = np.zeros(n)
    i = int(0.7 * sr)
    m = n - i
    tt = np.arange(m) / sr
    hit[i:] = (np.sin(2 * np.pi * (50 + 60 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.18)
               + filt(noise(m), "lowpass", 3500, sr) * env_ad(m, sr, 0.002, 0.25) * 0.6)
    return np.tanh(1.3 * (creak * 0.5 + hit))


def beep(sr, f=1500, n_beeps=2):
    out = np.zeros(int(0.32 * sr))
    for k in range(n_beeps):
        m = int(0.06 * sr)
        tt = np.arange(m) / sr
        i = int(k * 0.11 * sr)
        out[i:i + m] += np.sin(2 * np.pi * f * tt) * env_ad(m, sr, 0.003, 0.03)
    return out


def glitch(sr, dur=0.35):
    n = int(dur * sr)
    x = noise(n)
    gate = (RNG.random(n // 400 + 1) > 0.4).repeat(400)[:n]
    crush = np.round(x * 4) / 4
    tone = np.sign(np.sin(2 * np.pi * 180 * np.arange(n) / sr))
    y = (crush * 0.6 + tone * 0.3) * gate
    return filt(y, "bandpass", [200, 6000], sr) * np.exp(-np.arange(n) / sr / (dur * 0.6))


def boom(sr):
    """Deadpan zoom hit: deep, slightly distorted bass drop with a long tail."""
    n = int(2.0 * sr)
    t = np.arange(n) / sr
    f = 38 + 55 * np.exp(-t / 0.12)
    x = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.7)
    x += 0.35 * filt(noise(n), "lowpass", 900, sr) * env_ad(n, sr, 0.002, 0.08)
    return np.tanh(2.4 * x) * 0.9


def sparkle(sr, dur=0.9, base=88):
    out = np.zeros(int(dur * sr))
    for k, st in enumerate([0, 4, 7, 12, 16]):
        b = bell(midi(base + st), sr, dur - k * 0.05)
        i = int(k * 0.05 * sr)
        out[i:i + len(b)] += b * (0.5 - k * 0.06)
    return out * 0.6


def projector(sr, dur=1.4):
    """Old film projector rattle: fast clicks with a little motor hum."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    for k in range(int(dur * 24)):
        i = int(k / 24 * sr)
        m = min(n - i, int(0.012 * sr))
        x[i:i + m] += filt(noise(m), "bandpass", [1500, 6000], sr) * env_ad(m, sr, 0.0005, 0.003)
    x += 0.15 * np.sin(2 * np.pi * 50 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 24 * t))
    return x * np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def shutter(sr):
    out = np.zeros(int(0.25 * sr))
    for k, d in enumerate([0, 0.07]):
        m = int(0.03 * sr)
        i = int(d * sr)
        out[i:i + m] += filt(noise(m), "bandpass", [800, 5000], sr) * env_ad(m, sr, 0.0005, 0.006) * (1 - 0.3 * k)
    return out


def clink(sr, f):
    n = int(0.5 * sr)
    t = np.arange(n) / sr
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in [(1, 1, 0.12), (2.7, 0.5, 0.06), (5.2, 0.25, 0.03)])
    return x * env_ad(n, sr, 0.0005, 10)


def clatter(sr, dur=0.9):
    out = np.zeros(int(dur * sr))
    R = np.random.default_rng(3)
    for _ in range(9):
        c = clink(sr, float(R.uniform(1800, 4200)))
        i = int(R.uniform(0, dur - 0.5) * sr)
        out[i:i + len(c)] += c * R.uniform(0.3, 0.7)
    for d in (0.05, 0.35):
        m = int(0.2 * sr)
        tt = np.arange(m) / sr
        i = int(d * sr)
        out[i:i + m] += np.sin(2 * np.pi * (80 + 60 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.07)
    return out


def paper(sr):
    n = int(0.25 * sr)
    t = np.arange(n) / sr
    return sweep(noise(n), sr, 1500, 6000, "highpass") * np.sin(np.pi * t / 0.25) ** 2 * 0.6


def bubbles(sr, dur=1.2):
    out = np.zeros(int(dur * sr))
    R = np.random.default_rng(4)
    for _ in range(14):
        m = int(0.05 * sr)
        tt = np.arange(m) / sr
        f = R.uniform(300, 700)
        b = np.sin(2 * np.pi * (f + 900 * tt / 0.05) * tt) * env_ad(m, sr, 0.002, 0.015)
        i = int(R.uniform(0, dur - 0.06) * sr)
        out[i:i + m] += b * R.uniform(0.3, 0.8)
    return out


def zap(sr):
    n = int(0.16 * sr)
    t = np.arange(n) / sr
    f = 1800 * np.exp(-t / 0.05) + 200
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / sr)) * 0.3 * env_ad(n, sr, 0.001, 0.05)


def drip(sr):
    n = int(0.3 * sr)
    t = np.arange(n) / sr
    f = 700 + 900 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * env_ad(n, sr, 0.001, 0.06)


def heartbeat(sr):
    out = np.zeros(int(0.7 * sr))
    for d, a in ((0, 1.0), (0.22, 0.7)):
        m = int(0.25 * sr)
        tt = np.arange(m) / sr
        i = int(d * sr)
        out[i:i + m] += a * np.sin(2 * np.pi * (45 + 30 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.08)
    return np.tanh(2 * out)


# ------------------------------------------------------------------------------ mix
def reverb(x: np.ndarray, sr: int, decay=0.5, wet=0.25) -> np.ndarray:
    n = int(decay * 3 * sr)
    tt = np.arange(n) / sr
    ir = np.stack([noise(n), noise(n)], 1) * np.exp(-tt / decay)[:, None]
    ir = filt(ir, "lowpass", 5000, sr) * 0.02
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x + wet * w


SFX_GAIN = 0.5


def build_mix(voice: np.ndarray, cues: dict, dur: float, sr: int, return_stems: bool = False):
    n = int(dur * sr)
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    sfx = np.zeros((n, 2))
    c = cues

    # 1928: projector, year slam, photo, vacation, messy lab, back
    place(sfx, projector(sr, 2.4), 0.0, sr, 0.22)
    place(sfx, impact(sr, 0.8), c["year"], sr, 0.55)
    place(sfx, shutter(sr), c["photo"], sr, 0.5)
    place(sfx, whoosh(sr, 0.5), c["vacation"] - 0.3, sr, 0.35, pan=0.3)
    place(sfx, bell(midi(84), sr, 0.8), c["vacation"] + 0.1, sr, 0.14)
    place(sfx, whoosh(sr, 0.45), c["lab"] - 0.3, sr, 0.3, pan=-0.3)
    place(sfx, clatter(sr, 1.0), c["mess"], sr, 0.4)
    place(sfx, paper(sr), c["back"] + 0.05, sr, 0.4)
    place(sfx, pop(sr, 500, 1300), c["back"] + 0.1, sr, 0.25)
    # petri dish: bacteria, mold, kill zone
    place(sfx, whoosh(sr, 0.6, 0.7, 250, 6000), c["dish"] - 0.32, sr, 0.45)
    place(sfx, clink(sr, 2600), c["dish"] + 0.15, sr, 0.15)
    place(sfx, pop(sr, 450, 1100), c["bacteria"], sr, 0.25, pan=-0.3)
    place(sfx, bubbles(sr, 1.4), c["mold"], sr, 0.3)
    place(sfx, pop(sr, 380, 900), c["mold"] + 0.5, sr, 0.25, pan=0.3)
    place(sfx, whoosh(sr, 0.7, 0.85, 200, 5000), c["around"] - 0.2, sr, 0.35)
    a0, a1 = c["around"] + 0.4, c["dead"]
    for k in range(12):
        place(sfx, zap(sr), a0 + (a1 - a0) * k / 12, sr, 0.12, pan=-0.6 + 0.1 * k)
    place(sfx, impact(sr, 0.7), c["dead"], sr, 0.5)
    # penicillin
    place(sfx, whoosh(sr, 0.55), c["pen"] - 0.3, sr, 0.42, pan=0.3)
    for k in range(4):
        place(sfx, drip(sr), c["making"] + 0.1 + k * 0.38, sr, 0.25, pan=-0.4)
    for k in range(10):
        place(sfx, tick(sr), c["making"] + 0.3 + k * 0.1, sr, 0.07, pan=0.4)
    place(sfx, sparkle(sr, 1.1, 88), c["penWord"], sr, 0.18)
    place(sfx, pop(sr, 600, 1500), c["penWord"] + 0.05, sr, 0.3)
    # impact: timeline, first antibiotic, lives saved
    place(sfx, whoosh(sr, 0.55), c["impact"] - 0.3, sr, 0.42, pan=-0.3)
    for k in range(3):
        place(sfx, pop(sr, 450 + 150 * k, 1100 + 250 * k), c["impact"] + 0.35 + k * 0.32, sr, 0.25, pan=-0.5 + 0.5 * k)
    place(sfx, impact(sr, 0.8), c["first"], sr, 0.5)
    place(sfx, sparkle(sr, 1.0, 91), c["first"] + 0.05, sr, 0.15)
    place(sfx, heartbeat(sr), c["saved"] - 0.1, sr, 0.5)
    place(sfx, heartbeat(sr), c["saved"] + 0.75, sr, 0.5)
    place(sfx, riser(sr, 0.9), c["millions"] - 0.2, sr, 0.15)
    place(sfx, sparkle(sr, 1.3, 86), c["millions"] + 0.3, sr, 0.18)
    # punchline
    place(sfx, whoosh(sr, 0.55), c["end"] - 0.3, sr, 0.42, pan=0.3)
    place(sfx, paper(sr), c["forgot"], sr, 0.4)
    place(sfx, pop(sr, 500, 1200), c["forgot"] + 0.05, sr, 0.25)
    place(sfx, chop(sr), c["clean"] + 0.25, sr, 0.4)

    sfx = reverb(sfx, sr, 0.45, 0.3)
    v = voice / (np.abs(voice).max() + 1e-9) * 0.9
    stems = {"voice": v[:, None] * np.array([1.0, 1.0]), "sfx": sfx * SFX_GAIN}
    if return_stems:
        return stems
    out = sum(stems.values())
    out = np.tanh(out * 1.1) / np.tanh(1.1)
    fade_end = np.clip((dur - np.arange(n) / sr) / 0.3, 0, 1)
    return (out * fade_end[:, None] * 0.89).astype(np.float32)
