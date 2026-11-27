"""
Music, sound effects and ambience for the Oymyakon short, synthesized with numpy/scipy.
Everything is placed on the cue times that the animation uses as well (timeline.json -> cues).
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, sosfilt_zi

RNG = np.random.default_rng(7)
BPM = 100.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
# i - VI - III - VII in A minor, one chord per bar
CHORDS = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]]


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


# ------------------------------------------------------------------------------ instruments
def saw(f: float, t: np.ndarray, sr: int) -> np.ndarray:
    nh = max(1, min(40, int(sr * 0.2 / f)))
    k = np.arange(1, nh + 1)[:, None]
    return (np.sin(2 * np.pi * f * k * t[None, :]) / k).sum(0) * (2 / np.pi)


def kick(sr):
    n = int(0.55 * sr)
    t = np.arange(n) / sr
    f = 48 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / sr
    x = np.sin(ph) * np.exp(-t / 0.22)
    x[: int(0.004 * sr)] += noise(int(0.004 * sr)) * 0.5
    return np.tanh(1.6 * x) * 0.9


def clap(sr):
    n = int(0.35 * sr)
    x = np.zeros(n, np.float32)
    for k, d in enumerate([0, 0.011, 0.022]):
        i = int(d * sr)
        m = n - i
        x[i:] += noise(m) * env_ad(m, sr, 0.001, 0.012 if k < 2 else 0.11)
    x = filt(x, "bandpass", [900, 6000], sr)
    t = np.arange(n) / sr
    x += 0.25 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    return x


def hat(sr, open_=False):
    n = int((0.25 if open_ else 0.06) * sr)
    x = filt(noise(n), "highpass", 7500, sr) * env_ad(n, sr, 0.0005, 0.09 if open_ else 0.018)
    return x


def pluck(f, sr, dur=0.5):
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t))
    return x * env_ad(n, sr, 0.002, 0.14)


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


def ice_crack(sr, dur=0.9):
    n = int(dur * sr)
    x = np.zeros(n, np.float32)
    tt = 0.0
    while tt < dur * 0.8:
        i = int(tt * sr)
        m = min(n - i, int(0.03 * sr))
        x[i:i + m] += noise(m) * env_ad(m, sr, 0.0003, 0.004 + 0.01 * RNG.random()) * (0.4 + RNG.random())
        tt += RNG.exponential(0.03) * (1 + tt * 3)
    x = filt(x, "highpass", 1500, sr)
    return x * np.exp(-np.arange(n) / sr / (dur * 0.5))


def shimmer(sr, dur=1.2):
    out = np.zeros(int(dur * sr))
    for k in range(9):
        b = bell(midi(84 + [0, 3, 7, 10, 12, 15, 19, 22, 24][k]), sr, dur - k * 0.06)
        i = int(k * 0.06 * sr)
        out[i:i + len(b)] += b * (0.5 - k * 0.03)
    return out * 0.6


def tick(sr):
    n = int(0.03 * sr)
    t = np.arange(n) / sr
    return np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.006) + 0.3 * filt(noise(n), "highpass", 4000, sr) * np.exp(-t / 0.003)


def pop(sr, f0=500, f1=1300):
    n = int(0.09 * sr)
    t = np.arange(n) / sr
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * env_ad(n, sr, 0.001, 0.03)


def stamp(sr):
    n = int(0.6 * sr)
    t = np.arange(n) / sr
    thud = np.sin(2 * np.pi * (60 + 80 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.12)
    clack = filt(noise(n), "bandpass", [500, 2500], sr) * env_ad(n, sr, 0.0005, 0.025)
    return np.tanh(1.5 * (thud + 0.8 * clack))


def engine(sr, dur, rev_in=0.5, off_dur=0.7):
    """Engine: rev up, idle rumble, then a power-down at the end."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    run = np.clip(t / rev_in, 0, 1)
    off = np.clip((t - (dur - off_dur)) / off_dur, 0, 1)
    rpm = 26 + 30 * np.exp(-((t - rev_in * 0.7) / 0.25) ** 2) * run - 20 * off ** 1.5
    ph = 2 * np.pi * np.cumsum(rpm) / sr
    pulse = (0.5 + 0.5 * np.sin(ph)) ** 6
    body = filt(noise(n) * pulse, "lowpass", 380, sr) * 3 + 0.4 * np.sin(ph * 2) * pulse
    amp = np.clip(t / 0.08, 0, 1) * (1 - off) ** 1.3
    return np.tanh(body * amp * 1.5)


def crank_fail(sr):
    """Starter motor that does not catch: three weak 'rr' + clicks."""
    n = int(1.3 * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    for k in range(3):
        s = k * 0.36
        i = int(s * sr)
        m = int(0.26 * sr)
        tt = np.arange(m) / sr
        groan = filt(noise(m), "bandpass", [120, 900], sr) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt)) ** 3
        x[i:i + m] += groan * np.exp(-tt / 0.18) * (1 - 0.25 * k)
        c = int(0.015 * sr)
        x[i:i + c] += filt(noise(c), "highpass", 2000, sr) * 1.2
    return x


def wind(sr, n, cues):
    x = noise(n)
    x = filt(x, "bandpass", [180, 1400], sr) * 1.2
    t = np.arange(n) / sr
    gust = 0.55 + 0.25 * np.sin(2 * np.pi * 0.17 * t + 1.0) + 0.2 * np.sin(2 * np.pi * 0.41 * t + 0.3)
    # colder (louder) while the record is revealed
    boost = 1 + 1.3 * np.clip((t - cues["countEnd"]) / 0.3, 0, 1) * np.clip((cues["mars"] + 0.5 - t) / 0.5, 0, 1)
    l = x * gust * boost
    r = np.roll(l, int(0.013 * sr))
    return np.stack([l, r], 1)


# ------------------------------------------------------------------------------ music
def music(sr, dur, cues):
    n = int(dur * sr)
    t = np.arange(n) / sr
    pad = np.zeros((n, 2))
    arp = np.zeros((n, 2))
    bass = np.zeros(n)
    drums = np.zeros((n, 2))
    music_end = cues["end"] - 0.75  # final hit, then reverb tail
    nbars = int(np.ceil(dur / BAR)) + 1
    K, C, H, HO = kick(sr), clap(sr), hat(sr), hat(sr, True)
    for b in range(nbars):
        t0 = b * BAR
        if t0 >= music_end:
            break
        ch = CHORDS[b % len(CHORDS)]
        seg_n = int((BAR + 0.8) * sr)
        st = np.arange(seg_n) / sr
        e = np.clip(st / 0.35, 0, 1) * np.clip((BAR + 0.8 - st) / 0.8, 0, 1)
        for note in ch[1:]:
            for side, det in ((0, -0.08), (1, 0.08)):
                v = saw(midi(note + det), st, sr) * e * 0.12
                i0 = int(t0 * sr)
                m = max(0, min(len(v), n - i0))
                pad[i0:i0 + m, side] += v[:m]
        # bass (root, two octaves below)
        bn = int(BAR * sr)
        bt = np.arange(bn) / sr
        bv = np.sin(2 * np.pi * midi(ch[0] - 12) * bt) * np.clip(bt / 0.02, 0, 1) * np.clip((BAR - bt) / 0.05, 0, 1)
        i = int(t0 * sr)
        bass[i:i + bn] += bv[: max(0, min(bn, n - i))] * 0.5
        # arpeggio, 16ths
        order = [0, 2, 1, 3, 2, 1, 3, 2]
        tones = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[1] + 24]
        for s in range(16):
            ts = t0 + s * BEAT / 4
            if ts >= music_end:
                break
            vel = 0.55 if s % 4 == 0 else 0.32
            place(arp, pluck(midi(tones[order[s % 8]]), sr), ts, sr, vel * 0.22, pan=-0.35 if s % 2 else 0.35)
        # drums: half-time feel
        for beat_pos, inst, g in [(0, K, 0.9), (2.5, K, 0.7), (2, C, 0.35)]:
            ts = t0 + beat_pos * BEAT
            if ts < music_end:
                place(drums, inst, ts, sr, g)
        for h in range(8):
            ts = t0 + h * BEAT / 2
            if ts < music_end:
                place(drums, HO if h == 7 else H, ts, sr, (0.16 if h % 2 else 0.1), pan=0.25)

    # pad filtering + stereo
    pad = filt(pad, "lowpass", 1600, sr, 2)
    arp_l = arp[:, 0].copy()
    arp_r = arp[:, 1].copy()
    for src, dst, d in ((arp_l, arp[:, 1], 0.45), (arp_r, arp[:, 0], 0.3)):  # ping-pong-ish echo
        D = int(d * sr)
        echo = np.zeros(n)
        for i in range(D, n, D):
            echo[i:i + D] = 0.35 * (src[i - D:i][: len(echo[i:i + D])] + echo[i - D:i][: len(echo[i:i + D])])
        dst += filt(echo, "lowpass", 3500, sr)
    # bass pumping from kick
    kick_times = [b * BAR + p * BEAT for b in range(nbars) for p in (0, 2.5)]
    pump = np.ones(n)
    for kt in kick_times:
        i = int(kt * sr)
        if i < n:
            m = min(n - i, int(0.4 * sr))
            pump[i:i + m] = np.minimum(pump[i:i + m], 1 - 0.7 * np.exp(-np.arange(m) / sr / 0.09))
    bass = np.tanh(2 * bass) * pump * 0.6
    harm = pad * pump[:, None] ** 0.5 + arp + bass[:, None]
    # tension: filter the music down while the record counts, then slam back on the hit
    lp = filt(harm, "lowpass", 380, sr, 2)
    a = np.ones(n)
    c0, c1 = cues["countStart"] - 0.3, cues["countEnd"]
    a = np.where((t > c0) & (t < c1), np.clip(1 - (t - c0) / 0.5, 0, 1), a)
    drums_gate = np.where((t > c0 + 0.4) & (t < c1), 0.0, 1.0)
    drums_gate = np.convolve(drums_gate, np.ones(int(0.02 * sr)) / int(0.02 * sr), "same")
    harm = harm * a[:, None] + lp * (1 - a[:, None])
    # intro fade (the music starts with the hook impact)
    fade = np.clip(t / 0.05, 0, 1)
    out = (harm + drums * drums_gate[:, None]) * fade[:, None]
    # final chord hit + tail
    place(out, impact(sr, 1.4) * 0.6, music_end, sr)
    ft = np.arange(int(1.2 * sr)) / sr
    for note in CHORDS[0]:
        tail = saw(midi(note + 12), ft, sr) * np.exp(-ft / 0.5) * 0.08
        place(out, filt(tail, "lowpass", 2000, sr), music_end, sr)
    return out


# ------------------------------------------------------------------------------ mix
def reverb(x: np.ndarray, sr: int, decay=0.7, wet=0.25) -> np.ndarray:
    n = int(decay * 3 * sr)
    tt = np.arange(n) / sr
    ir = np.stack([noise(n), noise(n)], 1) * np.exp(-tt / decay)[:, None]
    ir = filt(ir, "lowpass", 5000, sr) * 0.02
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x + wet * w


def ease_out_cubic(u):
    return 1 - (1 - u) ** 3


MUSIC_GAIN, SFX_GAIN, WIND_GAIN = 0.16, 0.45, 0.05


def build_mix(voice: np.ndarray, cues: dict, dur: float, sr: int, return_stems: bool = False):
    n = int(dur * sr)
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    sfx = np.zeros((n, 2))

    place(sfx, impact(sr, 1.2), 0.02, sr, 0.85)
    place(sfx, whoosh(sr, 0.5, 0.6, 400, 7000), 0.0, sr, 0.35, pan=-0.2)
    place(sfx, shimmer(sr, 1.4), 0.25, sr, 0.12, pan=0.2)
    # globe zoom + pin drop
    place(sfx, whoosh(sr, 0.7, 0.8, 200, 6000), cues["globe"] - 0.35, sr, 0.5, pan=0.2)
    place(sfx, pop(sr, 400, 1100), cues["pin"] + 0.32, sr, 0.35)
    place(sfx, bell(midi(88), sr, 1.2), cues["pin"] + 0.34, sr, 0.18, pan=0.3)
    place(sfx, pop(sr, 700, 1500), cues["pin"] + 0.75, sr, 0.18, pan=0.4)
    # record
    place(sfx, whoosh(sr, 0.55), cues["record"] - 0.3, sr, 0.45, pan=-0.3)
    c0, c1 = cues["countStart"], cues["countEnd"]
    place(sfx, riser(sr, c1 - c0), c0, sr, 0.32)
    T = tick(sr)
    last = 0
    for i in range(int((c1 - c0) * 200)):
        tt = c0 + i / 200
        v = 67.7 * ease_out_cubic(min(1, (tt - c0) / (c1 - c0)))
        if int(v / 2.5) != last:
            last = int(v / 2.5)
            place(sfx, T, tt, sr, 0.16, pan=0.1)
    place(sfx, impact(sr, 1.5), c1, sr, 1.0)
    place(sfx, ice_crack(sr, 1.0), c1 + 0.02, sr, 0.5, pan=-0.3)
    place(sfx, ice_crack(sr, 0.8), c1 + 0.12, sr, 0.4, pan=0.4)
    place(sfx, shimmer(sr, 1.6), c1 + 0.05, sr, 0.14)
    # mars
    place(sfx, whoosh(sr, 0.55), cues["mars"] - 0.3, sr, 0.45, pan=0.3)
    m = cues["mars"]
    for k, tt in enumerate([m + 0.75, m + 1.55, cues["marsHit"]]):
        place(sfx, pop(sr, 450 + 120 * k, 1100 + 200 * k), tt, sr, 0.3, pan=[-0.3, 0.3, 0][k])
    place(sfx, impact(sr, 0.6) * 0.5, cues["marsHit"] + 0.05, sr, 0.35)
    # school
    place(sfx, whoosh(sr, 0.55), cues["school"] - 0.3, sr, 0.45, pan=-0.3)
    for k in range(5):  # small school bell
        place(sfx, bell(midi(81), sr, 0.6), cues["school"] + 0.35 + k * 0.07, sr, 0.07, pan=0.3)
    u0, u1 = cues["until"], cues["closed"]
    for k in range(13):
        place(sfx, tick(sr), u0 + (u1 - u0) * (k / 12) ** 0.8, sr, 0.13)
    place(sfx, stamp(sr), u1, sr, 0.75)
    # car
    place(sfx, whoosh(sr, 0.55), cues["car"] - 0.3, sr, 0.45, pan=0.3)
    place(sfx, engine(sr, cues["stop"] + 0.45 - cues["car"]), cues["car"] + 0.1, sr, 0.55)
    place(sfx, ice_crack(sr, 0.9), cues["stop"] + 0.5, sr, 0.3, pan=0.2)
    place(sfx, crank_fail(sr), cues["noStart"] - 0.05, sr, 0.45, pan=-0.1)
    # outro
    place(sfx, whoosh(sr, 0.7, 0.8, 250, 8000), cues["outro"] - 0.4, sr, 0.5)
    place(sfx, shimmer(sr, 1.4), cues["outro"] + 0.1, sr, 0.1)
    place(sfx, pop(sr, 500, 1200), cues["outro"] + 0.9, sr, 0.25, pan=-0.3)
    place(sfx, pop(sr, 600, 1400), cues["outro"] + 1.05, sr, 0.25, pan=0.3)
    place(sfx, pop(sr, 600, 1600), cues["follow"] + 0.05, sr, 0.35)
    place(sfx, tick(sr), cues["follow"] + 0.75, sr, 0.4)
    place(sfx, shimmer(sr, 1.2), cues["follow"] + 0.78, sr, 0.12)

    mus = music(sr, dur, cues)
    amb = wind(sr, n, cues)

    # duck music under the voice
    env = np.abs(voice)
    k = int(0.12 * sr)
    env = np.convolve(env, np.ones(k) / k, "same")
    env = env / (env.max() + 1e-9)
    duck = 1 - 0.55 * np.clip(env * 4, 0, 1)
    duck = np.convolve(duck, np.ones(int(0.05 * sr)) / int(0.05 * sr), "same")

    mus = reverb(mus, sr, 0.6, 0.3)
    sfx = reverb(sfx, sr, 0.5, 0.35)
    v = voice / (np.abs(voice).max() + 1e-9) * 0.9
    stems = {"voice": v[:, None] * np.array([1.0, 1.0]), "music": mus * duck[:, None] * MUSIC_GAIN,
             "sfx": sfx * SFX_GAIN, "wind": amb * WIND_GAIN}
    if return_stems:
        return stems
    out = sum(stems.values())
    # soft limiter
    out = np.tanh(out * 1.1) / np.tanh(1.1)
    fade_end = np.clip((dur - np.arange(n) / sr) / 0.4, 0, 1)
    return (out * fade_end[:, None] * 0.89).astype(np.float32)
