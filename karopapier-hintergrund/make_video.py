#!/usr/bin/env python3
"""Karopapier-Hintergrund: 50 Sekunden Motion-Graphics-Loop.

Helles, handgezeichnetes Karopapier (dunkelblaue Linien auf cremeweißem Papier),
das wie durch eine Linse nach außen gewölbt ist und sich fließend bewegt:

* Linsenwölbung (Kissen-Verzeichnung), die langsam "atmet" und wandert
* das Papier gleitet stetig schräg durchs Bild, mit einer weichen Schwingung
* leichte Drehung und Zoom, dazu eine sanfte, flüssige Welle
* Linien mit kleinen Unregelmäßigkeiten wie von Hand gezogen, Papiermaserung

Alle Bewegungen sind periodisch mit genau 50 s Periode, darum ist das Video
nahtlos loopbar (das letzte Bild geht direkt ins erste über).

    python make_video.py                  # 1920x1080, 25 fps, 50 s
    python make_video.py --preview        # schnelle Vorschau (960x540, 10 s)
    python make_video.py --still 12.5     # Einzelbild bei 12,5 s als PNG
"""

import argparse
import multiprocessing as mp
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent

DURATION = 50.0          # Sekunden = Loop-Periode
PAPER = np.array([249, 246, 241], np.float32)   # cremeweißes Papier
INK = np.array([48, 74, 116], np.float32)       # dunkelblaue Tinte

# Gitter in "Papier-Pixeln" (Referenzgröße 1080p, wird mit der Auflösung skaliert)
CELL = 80                # Kästchengröße in der Bildmitte
LINE = 3.4               # Strichstärke
DRIFT_X, DRIFT_Y = 16, 8  # so viele Kästchen gleitet das Papier pro Loop
TILE_X, TILE_Y = DRIFT_X * CELL, DRIFT_Y * CELL   # Kachelgröße der Texturen


# --------------------------------------------------------------------------
# Texturen und Linien-Eigenheiten (einmal pro Prozess, fester Zufallsseed)
# --------------------------------------------------------------------------

def tile_noise(rng, h, w, scale):
    """Kachelbares Rauschen (FFT-gefiltert), Wertebereich etwa -1..1."""
    white = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    f = np.sqrt(fx * fx + fy * fy) * scale
    spec = np.fft.fft2(white) * np.exp(-(f ** 2) * 2.0)
    n = np.real(np.fft.ifft2(spec))
    n -= n.mean()
    n /= np.abs(n).max() + 1e-9
    return n.astype(np.float32)


class Paper:
    def __init__(self, seed=7):
        rng = np.random.default_rng(seed)
        # Papiermaserung (fein), Wolkigkeit (grob), Tinten- und Strichstärken-Schwankung
        self.grain = tile_noise(rng, TILE_Y, TILE_X, 3.0) * 0.6 + tile_noise(rng, TILE_Y, TILE_X, 1.5) * 0.4
        self.cloud = tile_noise(rng, TILE_Y, TILE_X, 60.0)
        self.ink = tile_noise(rng, TILE_Y, TILE_X, 25.0)
        self.width = tile_noise(rng, TILE_Y, TILE_X, 40.0)

        # Handgezeichnete Linien: Versatz + Wellen entlang der Linie.
        # Wellenzahlen sind ganzzahlig pro Kachel -> nahtlos.
        def line_params(n):
            return dict(
                off=rng.normal(0.0, 0.9, n).astype(np.float32),
                a1=rng.uniform(0.3, 0.85, n).astype(np.float32),
                p1=rng.uniform(0, 2 * np.pi, n).astype(np.float32),
                a2=rng.uniform(0.1, 0.3, n).astype(np.float32),
                p2=rng.uniform(0, 2 * np.pi, n).astype(np.float32),
            )
        self.vert = line_params(DRIFT_X)   # senkrechte Linien, Periode DRIFT_X
        self.horz = line_params(DRIFT_Y)   # waagerechte Linien, Periode DRIFT_Y

    def sample(self, tex, X, Y):
        xi = np.floor(X).astype(np.int32) % TILE_X
        yi = np.floor(Y).astype(np.int32) % TILE_Y
        return tex[yi, xi]


# --------------------------------------------------------------------------
# Bewegung
# --------------------------------------------------------------------------

def motion(t):
    """Alle zeitabhängigen Parameter. Nur ganzzahlige Vielfache von theta -> Loop."""
    th = 2 * np.pi * t / DURATION
    return dict(
        th=th,
        # Linsenwölbung atmet zweimal pro Loop
        k=0.130 + 0.050 * np.sin(2 * th - 0.9) + 0.012 * np.sin(3 * th + 0.4),
        # Linsenmitte wandert sanft (in halben Bildhöhen)
        cx=0.11 * np.sin(th + 0.3) + 0.03 * np.sin(3 * th),
        cy=0.07 * np.sin(2 * th + 1.1),
        # Zoom und Drehung
        zoom=1.0 + 0.055 * np.sin(th - 1.2) + 0.015 * np.sin(4 * th),
        rot=0.040 * np.sin(th + 0.8) + 0.012 * np.sin(3 * th - 0.5),
        # Papier gleitet: stetige Drift + Schwingung (in Papier-Pixeln)
        dx=TILE_X * t / DURATION + 1.25 * CELL * np.sin(th) + 0.3 * CELL * np.sin(3 * th + 2.0),
        dy=TILE_Y * t / DURATION + 0.9 * CELL * np.sin(2 * th + 1.0),
    )


# --------------------------------------------------------------------------
# Rendern eines Bildes
# --------------------------------------------------------------------------

class Renderer:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.s = h / 1080.0                        # Auflösungs-Skalierung
        half = h / 2.0
        ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
        self.px = (xs + 0.5 - w / 2) / half       # normierte Bildkoordinaten
        self.py = (ys + 0.5 - h / 2) / half
        self.half = half
        self.paper = Paper()
        # Vignette (Bildschirm-fest): Ecken etwas dunkler und wärmer, Mitte hell
        r2 = self.px ** 2 + self.py ** 2
        rmax2 = (w / h) ** 2 + 1.0
        v = np.clip(r2 / rmax2, 0, 1) ** 1.15
        self.vig = np.stack([1 - 0.075 * v, 1 - 0.090 * v, 1 - 0.115 * v], -1).astype(np.float32)
        self.edge_fade = (1.0 - 0.22 * np.clip(r2 / rmax2, 0, 1) ** 1.3).astype(np.float32)

    def frame(self, t):
        m = motion(t)
        th = m["th"]
        px, py = self.px, self.py

        # 1) sanfte, fließende Welle im Bildraum (wandernde Sinuswellen)
        wx = 0.0085 * np.sin(2.2 * py + 0.5 * px + 2 * th) + 0.006 * np.sin(3.3 * py - 0.8 * px - 3 * th + 1.0)
        wy = 0.0085 * np.sin(1.9 * px - 0.4 * py + 2 * th + 0.5) + 0.006 * np.sin(2.8 * px + 0.9 * py + 3 * th + 2.0)
        qx = px + wx - m["cx"]
        qy = py + wy - m["cy"]

        # 2) Linsenwölbung: r_src = r / sqrt(1 + k r^2)  (immer monoton, Kissen-Form)
        g = 1.0 / np.sqrt(1.0 + m["k"] * (qx * qx + qy * qy))
        qx = qx * g + m["cx"]
        qy = qy * g + m["cy"]

        # 3) Drehung, Zoom, Drift -> Papierkoordinaten (Papier-Pixel @1080p)
        c, s_ = np.cos(m["rot"]), np.sin(m["rot"])
        f = 540.0 / m["zoom"]
        X = (c * qx - s_ * qy) * f + m["dx"]
        Y = (s_ * qx + c * qy) * f + m["dy"]

        # Ableitungen (Papier-Pixel pro Bildpixel) für gleichmäßige Strichstärke
        gXy, gXx = np.gradient(X)
        gYy, gYx = np.gradient(Y)
        nX = np.sqrt(gXx * gXx + gXy * gXy) + 1e-6
        nY = np.sqrt(gYx * gYx + gYy * gYy) + 1e-6

        P = self.paper
        TWO_PI = np.float32(2 * np.pi)

        # senkrechte Linien
        i = np.rint(X / CELL).astype(np.int32)
        k = i % DRIFT_X
        v = P.vert
        lx = (i * CELL + v["off"][k]
              + v["a1"][k] * np.sin(TWO_PI * 3 * Y / TILE_Y + v["p1"][k])
              + v["a2"][k] * np.sin(TWO_PI * 13 * Y / TILE_Y + v["p2"][k]))
        dv = np.abs(X - lx) / nX                      # Abstand in Bildpixeln

        # waagerechte Linien
        j = np.rint(Y / CELL).astype(np.int32)
        k = j % DRIFT_Y
        hp = P.horz
        ly = (j * CELL + hp["off"][k]
              + hp["a1"][k] * np.sin(TWO_PI * 5 * X / TILE_X + hp["p1"][k])
              + hp["a2"][k] * np.sin(TWO_PI * 21 * X / TILE_X + hp["p2"][k]))
        dh = np.abs(Y - ly) / nY

        # Strichstärke schwankt leicht wie bei einem Fineliner
        hw = 0.5 * LINE * self.s * (1.0 + 0.16 * P.sample(P.width, X, Y))
        d = np.minimum(dv, dh)
        cov = np.clip(hw - d + 0.6, 0.0, 1.0)
        cov = cov * cov * (3 - 2 * cov)               # weiche Kante (Antialiasing)
        # Tinte: leichte Deckkraft-Schwankung, zum Rand hin etwas blasser
        alpha = cov * (0.93 + 0.07 * P.sample(P.ink, X, Y)) * self.edge_fade
        # zarter Tintenhof um die Linien (statt Glow wie beim dunklen Design)
        halo = 0.045 * np.exp(-((d / (3.2 * self.s)) ** 2)) * self.edge_fade
        alpha = np.maximum(alpha, halo)

        # Papier: Maserung + Wolkigkeit (bewegt sich mit dem Papier)
        tone = 1.0 + 0.010 * P.sample(P.grain, X * 1.0, Y * 1.0) + 0.008 * P.sample(P.cloud, X, Y)

        a = alpha[..., None]
        rgb = (PAPER * tone[..., None]) * (1 - a) + INK * a
        rgb *= self.vig
        return np.clip(rgb + 0.5, 0, 255).astype(np.uint8)


# --------------------------------------------------------------------------
# Multiprocessing + ffmpeg
# --------------------------------------------------------------------------

_R = None


def _init(w, h):
    global _R
    _R = Renderer(w, h)


def _render(t):
    return _R.frame(t).tobytes()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=25)
    ap.add_argument("--seconds", type=float, default=DURATION)
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--preview", action="store_true", help="960x540, 10 s, nach build/")
    ap.add_argument("--still", type=float, help="nur ein Einzelbild bei dieser Zeit (s) als PNG")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--jobs", type=int, default=mp.cpu_count())
    args = ap.parse_args()

    if args.preview:
        args.width, args.height, args.seconds = 960, 540, 10.0

    if args.still is not None:
        from PIL import Image
        out = args.out or HERE / "build" / f"still_{args.still:05.2f}s.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(Renderer(args.width, args.height).frame(args.still)).save(out)
        print(out)
        return

    out = args.out or (HERE / "build" / "preview.mp4" if args.preview
                       else HERE / "output" / "karopapier_hintergrund_50s.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)
    n = int(round(args.seconds * args.fps))
    times = [i / args.fps for i in range(n)]

    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{args.width}x{args.height}",
           "-r", str(args.fps), "-i", "-",
           "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf),
           "-g", str(args.fps * 2), "-colorspace", "bt709", "-color_primaries", "bt709",
           "-color_trc", "bt709", "-color_range", "tv",
           "-movflags", "+faststart", str(out)]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    t0 = time.time()
    with mp.Pool(args.jobs, initializer=_init, initargs=(args.width, args.height)) as pool:
        for i, buf in enumerate(pool.imap(_render, times, chunksize=2)):
            enc.stdin.write(buf)
            if (i + 1) % 50 == 0 or i + 1 == n:
                el = time.time() - t0
                print(f"\r{i + 1}/{n} Bilder  {el:5.0f}s  (noch ~{el / (i + 1) * (n - i - 1):4.0f}s)",
                      end="", flush=True)
    enc.stdin.close()
    if enc.wait() != 0:
        sys.exit("ffmpeg ist fehlgeschlagen")
    print(f"\nfertig: {out}")


if __name__ == "__main__":
    main()
