"""
Sound effects for the trees-vs-stars short, synthesized with numpy/scipy. No music (series rule).
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
    R = np.random.default_rng(5)

    # hook: title slam, trees sprout, stars twinkle, ">" pops
    place(sfx, whoosh(sr, 0.45, 0.6, 400, 7000), 0.0, sr, 0.35, pan=-0.2)
    place(sfx, impact(sr, 0.7), c["title"], sr, 0.5)
    for k in range(9):
        place(sfx, pop(sr, 300 + 40 * k, 700 + 70 * k), c["trees"] + 0.05 + k * 0.07, sr, 0.18, pan=-0.6 + 0.08 * k)
    place(sfx, sparkle(sr, 1.0, 88), c["stars"] + 0.05, sr, 0.16, pan=0.5)
    place(sfx, pop(sr, 600, 1600), c["stars"] + 0.55, sr, 0.3)
    # galaxy
    place(sfx, whoosh(sr, 0.6, 0.7, 250, 6000), c["galaxy"] - 0.32, sr, 0.45, pan=0.3)
    place(sfx, sparkle(sr, 1.2, 84), c["galaxy"] + 0.1, sr, 0.14)
    place(sfx, pop(sr, 500, 1200), c["n100"], sr, 0.3, pan=-0.3)
    place(sfx, impact(sr, 0.6) * 0.6, c["n400"], sr, 0.35)
    place(sfx, pop(sr, 700, 1700), c["n400"], sr, 0.3, pan=0.3)
    # earth: satellite beeps, plots, counter, trillion hit
    place(sfx, whoosh(sr, 0.6, 0.7, 250, 6000), c["earth"] - 0.32, sr, 0.45, pan=-0.3)
    for k in range(3):
        place(sfx, beep(sr, 1500, 2), c["satellite"] + k * 0.75, sr, 0.12, pan=0.4)
    p0, p1 = c["plots"], c["plotsEnd"]
    for k in range(28):
        tt = p0 + (p1 - p0) * (k / 28) ** 0.8
        place(sfx, tick(sr), tt, sr, 0.09, pan=float(R.uniform(-0.5, 0.5)))
    t0, t1 = c["trillion"] - 0.35, c["trillion"] + 0.85
    place(sfx, riser(sr, t1 - t0), t0, sr, 0.25)
    for k in range(40):
        place(sfx, tick(sr), t0 + (t1 - t0) * (1 - (1 - k / 40) ** 2), sr, 0.08)
    place(sfx, impact(sr, 1.0), t1, sr, 0.7)
    place(sfx, sparkle(sr, 1.1, 91), t1 + 0.03, sr, 0.15)
    # per person: tree grid pops in a wave
    place(sfx, whoosh(sr, 0.55), c["perPerson"] - 0.3, sr, 0.42, pan=0.3)
    g0 = c["perPerson"] + 0.25
    for k in range(22):
        place(sfx, pop(sr, 350 + 30 * k, 800 + 50 * k), g0 + k * 0.045, sr, 0.12, pan=-0.7 + k * 0.065)
    place(sfx, bell(midi(86), sr, 1.0), c["n375"] + 0.1, sr, 0.15)
    place(sfx, pop(sr, 500, 1300), c["human"], sr, 0.3)
    # the catch: glitch, then chopping and falling trees
    place(sfx, whoosh(sr, 0.5), c["cut"] - 0.28, sr, 0.4, pan=-0.3)
    place(sfx, glitch(sr, 0.4), c["catch"], sr, 0.2)
    for k in range(4):
        tc = c["we"] + 0.15 + k * 0.55
        place(sfx, chop(sr), tc, sr, 0.5, pan=-0.45 + 0.3 * k)
        place(sfx, tree_fall(sr), tc + 0.08, sr, 0.3, pan=-0.45 + 0.3 * k)
    place(sfx, impact(sr, 0.7) * 0.7, c["n15"], sr, 0.45)
    # outro: follow button, deadpan zoom
    place(sfx, whoosh(sr, 0.6, 0.75, 250, 7000), c["outro"] - 0.35, sr, 0.42)
    place(sfx, pop(sr, 600, 1500), c["follow"] + 0.05, sr, 0.3)
    place(sfx, boom(sr), c["cool"] + 0.05, sr, 0.75)

    sfx = reverb(sfx, sr, 0.45, 0.3)
    v = voice / (np.abs(voice).max() + 1e-9) * 0.9
    stems = {"voice": v[:, None] * np.array([1.0, 1.0]), "sfx": sfx * SFX_GAIN}
    if return_stems:
        return stems
    out = sum(stems.values())
    out = np.tanh(out * 1.1) / np.tanh(1.1)
    fade_end = np.clip((dur - np.arange(n) / sr) / 0.3, 0, 1)
    return (out * fade_end[:, None] * 0.89).astype(np.float32)
