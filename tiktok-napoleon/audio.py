"""
Sound effects for the short "Napoleon war gar nicht klein" (German), synthesized with numpy/scipy. No music (series rule).
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


def footstep(sr, soft=False):
    n = int(0.16 * sr)
    t = np.arange(n) / sr
    thud = np.sin(2 * np.pi * (70 + 50 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.035)
    scuff = filt(noise(n), "bandpass", [900, 4000], sr) * env_ad(n, sr, 0.002, 0.03)
    return (thud * (0.4 if soft else 1) + scuff * (0.5 if soft else 0.35))


def typewriter(sr, n_keys=8, gap=0.07):
    out = np.zeros(int((n_keys * gap + 0.5) * sr))
    for k in range(n_keys):
        m = int(0.03 * sr)
        i = int(k * gap * sr)
        out[i:i + m] += filt(noise(m), "bandpass", [1500, 5000], sr) * env_ad(m, sr, 0.0005, 0.005)
    b = bell(midi(91), sr, 0.4)
    i = int(n_keys * gap * sr)
    out[i:i + len(b)] += b * 0.4
    return out


def boing(sr):
    n = int(0.5 * sr)
    t = np.arange(n) / sr
    f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / 0.15) + 120 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * env_ad(n, sr, 0.003, 0.18)


def sting(sr):
    out = np.zeros(int(0.3 * sr))
    for k, f in enumerate([880, 1320]):
        m = int(0.08 * sr)
        tt = np.arange(m) / sr
        i = int(k * 0.07 * sr)
        out[i:i + m] += np.sin(2 * np.pi * f * tt) * env_ad(m, sr, 0.002, 0.04)
    return out


def stamp(sr):
    n = int(0.6 * sr)
    t = np.arange(n) / sr
    thud = np.sin(2 * np.pi * (60 + 80 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.12)
    clack = filt(noise(n), "bandpass", [500, 2500], sr) * env_ad(n, sr, 0.0005, 0.025)
    return np.tanh(1.5 * (thud + 0.8 * clack))


def kaching(sr):
    out = np.zeros(int(1.0 * sr))
    m = int(0.05 * sr)
    out[:m] += filt(noise(m), "bandpass", [2000, 7000], sr) * env_ad(m, sr, 0.0005, 0.01)
    for k, f in enumerate([2093, 2637]):
        b = bell(f, sr, 0.8)
        i = int((0.05 + k * 0.06) * sr)
        out[i:i + len(b)] += b * 0.5
    return out


def rustle(sr, dur=0.8):
    n = int(dur * sr)
    x = filt(noise(n), "highpass", 2500, sr)
    t = np.arange(n) / sr
    am = np.clip(np.sin(2 * np.pi * 11 * t) + 0.3 * np.sin(2 * np.pi * 23 * t), 0, None)
    return x * am * np.sin(np.pi * t / dur) * 0.5


def chug(sr, dur, rate=4.2):
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    k = 0
    while k / rate < dur:
        i = int(k / rate * sr)
        m = min(n - i, int(0.18 * sr))
        x[i:i + m] += filt(noise(m), "bandpass", [250, 2200], sr) * env_ad(m, sr, 0.004, 0.06) * (1.0 if k % 2 == 0 else 0.6)
        k += 1
    x += 0.2 * filt(noise(n), "lowpass", 200, sr)
    return x * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def steam_whistle(sr, dur=0.9):
    n = int(dur * sr)
    t = np.arange(n) / sr
    vib = 1 + 0.006 * np.sin(2 * np.pi * 6 * t)
    x = sum(np.sin(2 * np.pi * f * vib * t) for f in (560, 700, 840)) / 3
    x += 0.15 * filt(noise(n), "bandpass", [1500, 4000], sr)
    return x * np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)


def phone_ring(sr, dur=0.9):
    n = int(dur * sr)
    t = np.arange(n) / sr
    trem = (np.sin(2 * np.pi * 22 * t) > 0).astype(float)
    x = (np.sin(2 * np.pi * 1700 * t) + 0.6 * np.sin(2 * np.pi * 2400 * t)) * (0.4 + 0.6 * trem)
    return x * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1) * 0.6


def police_whistle(sr, dur=0.7):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = 2900 + 250 * np.sin(2 * np.pi * 32 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / sr) + 0.2 * filt(noise(n), "bandpass", [2500, 4000], sr)
    return x * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.08, 0, 1) * 0.5


def buzzer(sr, dur=0.35):
    n = int(dur * sr)
    t = np.arange(n) / sr
    return np.sign(np.sin(2 * np.pi * 140 * t)) * 0.3 * np.clip((dur - t) / 0.05, 0, 1)


def chirp(sr):
    n = int(0.09 * sr)
    t = np.arange(n) / sr
    f = 3200 + 1800 * np.sin(np.pi * t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * t / 0.09)


def poof(sr):
    n = int(0.5 * sr)
    return sweep(noise(n), sr, 3000, 300, "lowpass") * env_ad(n, sr, 0.005, 0.12)


def waves(sr, n, t_inside):
    """Sea: low rumbling swells with foamy hiss; muffled while we are below deck."""
    t = np.arange(n) / sr
    low = filt(noise(n), "lowpass", 400, sr) * 1.6
    hiss = filt(noise(n), "bandpass", [800, 5000], sr) * 0.5
    sw = 0.55 + 0.45 * np.sin(2 * np.pi * 0.16 * t) ** 2 + 0.2 * np.sin(2 * np.pi * 0.37 * t + 1)
    x = low * sw + hiss * sw ** 3
    inside = np.zeros(n)
    for a, b in t_inside:
        inside = np.maximum(inside, np.clip((t - a) / 0.05, 0, 1) * np.clip((b - t) / 0.05, 0, 1))
    muff = filt(x, "lowpass", 300, sr)
    x = x * (1 - inside) + muff * inside * 0.6
    l = x
    r = np.roll(x, int(0.011 * sr))
    return np.stack([l, r], 1)


def creak(sr, dur=0.7, f0=180):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 1.3 * t / dur))
    ph = 2 * np.pi * np.cumsum(f) / sr
    x = (np.sin(ph) > 0.6).astype(float) * 0.8 + 0.2 * np.sin(ph * 2)
    x = filt(x, "bandpass", [250, 2500], sr)
    return x * np.sin(np.pi * t / dur) ** 1.5 * 0.7


def gull(sr):
    n = int(0.45 * sr)
    t = np.arange(n) / sr
    f = 1700 - 900 * (t / 0.45) + 250 * np.sin(2 * np.pi * 14 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * t / 0.45) ** 2 * 0.5


def flap(sr, dur=1.2):
    n = int(dur * sr)
    t = np.arange(n) / sr
    am = np.clip(np.sin(2 * np.pi * 5.5 * t), 0, None) ** 3
    return filt(noise(n), "bandpass", [150, 1800], sr) * am * np.sin(np.pi * t / dur) * 0.9


def stinger(sr, size=1.0):
    n = int(2.4 * sr)
    t = np.arange(n) / sr
    rev = sweep(noise(int(0.5 * sr)), sr, 300, 4000, "lowpass") * np.linspace(0, 1, int(0.5 * sr)) ** 3 * 0.5
    hit = np.sin(2 * np.pi * (34 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / (0.9 * size))
    hit += 0.25 * filt(noise(n), "lowpass", 700, sr) * env_ad(n, sr, 0.002, 0.3)
    out = np.zeros(int(0.5 * sr) + n)
    out[:len(rev)] += rev
    out[int(0.5 * sr):] += np.tanh(1.8 * hit)
    return out  # the hit lands 0.5 s after the start


def scratch(sr, dur=0.5):
    n = int(dur * sr)
    t = np.arange(n) / sr
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)
    return filt(noise(n), "bandpass", [2500, 7000], sr) * am * np.sin(np.pi * t / dur) * 0.4


def heartbeat(sr):
    out = np.zeros(int(0.7 * sr))
    for d, a in ((0, 1.0), (0.22, 0.7)):
        m = int(0.25 * sr)
        tt = np.arange(m) / sr
        i = int(d * sr)
        out[i:i + m] += a * np.sin(2 * np.pi * (45 + 30 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.08)
    return np.tanh(2 * out)


def hoof(sr):
    n = int(0.09 * sr)
    t = np.arange(n) / sr
    return (filt(noise(n), "bandpass", [700, 2600], sr) * env_ad(n, sr, 0.0005, 0.012) + 0.6 * np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.02))


def hooves(sr, dur, rate=6.0):
    out = np.zeros(int(dur * sr))
    k = 0
    while k / rate < dur - 0.1:
        h = hoof(sr) * (0.8 if k % 2 else 1.0)
        i = int((k / rate + (0.03 if k % 4 == 1 else 0)) * sr)
        out[i:i + len(h)] += h[: len(out) - i]
        k += 1
    t = np.arange(len(out)) / sr
    return out * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def wheels(sr, dur):
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = filt(noise(n), "bandpass", [150, 900], sr) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    return x * 0.3 * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def hammer(sr):
    n = int(0.2 * sr)
    t = np.arange(n) / sr
    return np.tanh(2 * (np.sin(2 * np.pi * 1300 * t) * np.exp(-t / 0.015) + filt(noise(n), "bandpass", [1500, 5000], sr) * env_ad(n, sr, 0.0003, 0.008)))


def shop_bell(sr):
    out = np.zeros(int(1.0 * sr))
    for k in range(4):
        b = bell(midi(96 + (k % 2) * 3), sr, 0.6)
        i = int(k * 0.07 * sr)
        out[i:i + len(b)] += b * (0.5 - 0.08 * k)
    return out


def bark(sr):
    out = np.zeros(int(0.5 * sr))
    for k in range(2):
        n = int(0.13 * sr)
        t = np.arange(n) / sr
        f = 520 - 260 * t / 0.13
        x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / sr)) * 0.3 + filt(noise(n), "bandpass", [400, 1800], sr) * 0.6
        i = int(k * 0.2 * sr)
        out[i:i + n] += filt(x, "bandpass", [300, 2500], sr) * env_ad(n, sr, 0.005, 0.05)
    return out


def heel_click(sr):
    n = int(0.08 * sr)
    t = np.arange(n) / sr
    return filt(noise(n), "highpass", 2500, sr) * env_ad(n, sr, 0.0003, 0.006) + 0.5 * np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.01)


def cuffs(sr):
    out = np.zeros(int(0.4 * sr))
    for d in (0, 0.12):
        c2 = clink(sr, 3800)[: int(0.15 * sr)] * 0.6 + heel_click(sr)[: int(0.15 * sr)].sum() * 0
        i = int(d * sr)
        out[i:i + len(c2)] += c2
        h = heel_click(sr)
        out[i:i + len(h)] += h
    return out


def wings(sr, dur=0.8):
    n = int(dur * sr)
    t = np.arange(n) / sr
    am = np.clip(np.sin(2 * np.pi * 14 * t), 0, None) ** 2
    return filt(noise(n), "bandpass", [600, 3500], sr) * am * np.exp(-t / (dur * 0.5)) * 0.8


# ------------------------------------------------------------------------------ mix
def reverb(x: np.ndarray, sr: int, decay=0.5, wet=0.25) -> np.ndarray:
    n = int(decay * 3 * sr)
    tt = np.arange(n) / sr
    ir = np.stack([noise(n), noise(n)], 1) * np.exp(-tt / decay)[:, None]
    ir = filt(ir, "lowpass", 5000, sr) * 0.02
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x + wet * w


SFX_GAIN = 0.35  # owner: voice louder -> effects about 3 dB lower than before



# ------------------------------------------------------------------------------ Napoleon video sounds
def murmur(sr, dur):
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = filt(noise(n), "bandpass", [250, 1200], sr) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 2.3 * t)) * np.abs(np.sin(2 * np.pi * 0.7 * t + 1)))
    return x * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1) * 0.4


def clack(sr):
    n = int(0.12 * sr)
    t = np.arange(n) / sr
    return (np.sin(2 * np.pi * 900 * t) * 0.5 + filt(noise(n), "bandpass", [1000, 4000], sr)) * env_ad(n, sr, 0.001, 0.02)


def zipline(sr, dur=0.6):
    out = np.zeros(int(dur * sr))
    tt = 0.0
    while tt < dur:
        x = clack(sr) * 0.25
        i = int(tt * sr)
        out[i:i + len(x)] += x[: len(out) - i]
        tt += 0.025
    return out


def press(sr, dur=2.0):
    out = np.zeros(int((dur + 0.6) * sr))
    tt = 0.0
    while tt < dur:
        x = clank(sr) if False else thud_metal(sr)
        i = int(tt * sr)
        out[i:i + len(x)] += x[: len(out) - i]
        tt += 0.55
    return out


def thud_metal(sr):
    n = int(0.4 * sr)
    t = np.arange(n) / sr
    return (np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.08) + 0.4 * np.sin(2 * np.pi * 620 * t) * np.exp(-t / 0.05) + 0.3 * filt(noise(n), "bandpass", [500, 3000], sr) * np.exp(-t / 0.02)) * 0.7


# host walking in the first shot (must match WALK0 in scene.js); the guard marches in step STEP
WALK0 = (0.1, 1.1, 0.25)
STEP = 0.32


def build_mix(voice: np.ndarray, cues: dict, dur: float, sr: int, return_stems: bool = False):
    n = int(dur * sr)
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    sfx = np.zeros((n, 2))
    c = cues

    a, b, p = WALK0
    for k in range(int((b - a) / p) + 1):
        place(sfx, footstep(sr), a + k * p, sr, 0.22, pan=-0.4 + 0.08 * k)
    place(sfx, buzzer(sr, 0.3), c["klein0"] + 0.55, sr, 0.18)
    place(sfx, zipline(sr, 0.5), c["height"] + 0.15, sr, 0.14, pan=0.3)
    place(sfx, pop(sr, 600, 1500), c["n168"] + 1.4, sr, 0.25)
    place(sfx, murmur(sr, c["avg"] - c["normal"]), c["normal"], sr, 0.08)
    for k in range(2):
        place(sfx, pop(sr, 500 + 200 * k, 1300 + 200 * k), c["avg"] + 0.4 + k * 0.3, sr, 0.22, pan=(k - 0.5) * 0.6)
    place(sfx, sparkle(sr, 0.8, 90), c["groesser"] + 0.6, sr, 0.18)
    place(sfx, sting(sr), c["mythos"] + 0.55, sr, 0.25)
    place(sfx, clack(sr), c["zoll"] + 0.5, sr, 0.35)  # after the word, not on "Frankreich maß"
    place(sfx, whoosh(sr, 0.4, 0.5, 500, 5000), c["laenger"] + 0.5, sr, 0.25)
    place(sfx, scratch(sr, 0.6), c["brits"] + 0.9, sr, 0.14)
    place(sfx, stretch_down(sr), c["kleiner"] + 0.45, sr, 0.3)
    place(sfx, press(sr, c["zwerg"] - c["cartoon"]), c["cartoon"] + 0.2, sr, 0.25)
    place(sfx, stamp(sr), c["zwerg"] + 0.5, sr, 0.35)
    k = 0
    while c["guard"] + 0.1 + k * STEP < c["gross"] - 0.1:
        place(sfx, footstep(sr, True), c["guard"] + 0.1 + k * STEP, sr, 0.1, pan=0.2)
        k += 1
    place(sfx, pop(sr, 400, 900), c["gross"] + 0.35, sr, 0.25)
    place(sfx, impact(sr, 0.5), c["klein"] + 0.6, sr, 0.3)
    place(sfx, boing(sr), c["klein"] + 1.2, sr, 0.25, pan=0.3)

    sfx = reverb(sfx, sr, 0.4, 0.3)
    v = voice / (np.abs(voice).max() + 1e-9) * 0.9
    stems = {"voice": v[:, None] * np.array([1.0, 1.0]), "sfx": sfx * SFX_GAIN}
    if return_stems:
        return stems
    out = sum(stems.values())
    out = np.tanh(out * 1.1) / np.tanh(1.1)
    t = np.arange(n) / sr
    fade = np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
    return (out * fade[:, None] * 0.89).astype(np.float32)


def stretch_down(sr):
    m = int(0.5 * sr)
    t = np.arange(m) / sr
    f = 800 - 500 * t / 0.5
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * env_ad(m, sr, 0.02, 0.25) * 0.6
