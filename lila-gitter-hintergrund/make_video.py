#!/usr/bin/env python3
"""Lila Gitter: 50 Sekunden Motion-Graphics-Hintergrund (dunkel, leuchtend).

Leuchtendes Gitter auf dunklem Grund, wie durch eine Linse nach außen gewölbt,
mit lila Note: violett getönter Hintergrund, lavendelweiße Linien mit lila Glow.

* Linsenwölbung (Kissen-Verzeichnung), die "atmet" und langsam wandert
* das Gitter gleitet stetig schräg durchs Bild, mit einer weichen Schwingung
* leichte Drehung und Zoom, sanfte flüssige Welle
* der Glow-Farbton pendelt leicht zwischen Violett und Lila-Pink

Alle Bewegungen sind periodisch mit genau 50 s Periode -> nahtlos loopbar.

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

DURATION = 50.0                       # Sekunden = Loop-Periode

# Farben (0..1)
BG = np.array([25, 18, 36], np.float32) / 255          # dunkles Violett-Schwarz in der Mitte
CORE = np.array([238, 226, 255], np.float32) / 255     # Linien: Lavendel-Weiß
GLOW_A = np.array([150, 92, 255], np.float32) / 255    # Glow: Violett
GLOW_B = np.array([205, 92, 245], np.float32) / 255    # Glow: Lila-Pink
CENTER_GLOW = np.array([16, 6, 30], np.float32) / 255   # weiches lila Licht hinter der Bildmitte

# Gitter (Werte bei 1080p, werden mit der Auflösung skaliert)
CELL = 155                 # Kästchengröße in der Bildmitte (px)
CORE_W = 3.2               # Breite des hellen Linienkerns (px)
BLOOM = 2.6                # enger Schein um den Kern (Sigma, px)
HALO = 13.5                # weiter Glow (Abfall-Länge, px)
DRIFT_X, DRIFT_Y = 12, 6   # so viele Kästchen gleitet das Gitter pro Loop


def motion(t):
    """Alle zeitabhängigen Parameter. Nur ganzzahlige Vielfache von theta -> Loop."""
    th = 2 * np.pi * t / DURATION
    return dict(
        th=th,
        # Linsenwölbung atmet dreimal pro Loop
        k=0.135 + 0.050 * np.sin(3 * th - 0.9) + 0.012 * np.sin(5 * th + 0.4),
        # Linsenmitte wandert sanft (in halben Bildhöhen)
        cx=0.11 * np.sin(2 * th + 0.3) + 0.03 * np.sin(5 * th),
        cy=0.07 * np.sin(3 * th + 1.1),
        # Zoom und Drehung
        zoom=1.0 + 0.055 * np.sin(2 * th - 1.2) + 0.015 * np.sin(6 * th),
        rot=0.040 * np.sin(2 * th + 0.8) + 0.012 * np.sin(5 * th - 0.5),
        # Gitter gleitet: stetige Drift + Schwingung (px @1080p)
        dx=DRIFT_X * CELL * t / DURATION + 100 * np.sin(2 * th) + 12 * np.sin(5 * th + 2.0),
        dy=DRIFT_Y * CELL * t / DURATION + 72 * np.sin(3 * th + 1.0),
        # Glow-Farbton pendelt (0 = Violett, 1 = Lila-Pink), Puls der Mitte
        hue=0.5 + 0.5 * np.sin(2 * th - 0.4),
        pulse=1.0 + 0.10 * np.sin(3 * th + 0.7),
    )


class Renderer:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.s = h / 1080.0
        half = h / 2.0
        ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
        self.px = (xs + 0.5 - w / 2) / half
        self.py = (ys + 0.5 - h / 2) / half
        # elliptische Vignette wie beim Vorbild: Mitte hell, Ecken fast schwarz
        e = np.sqrt((self.px / (w / h)) ** 2 + self.py ** 2)
        self.vig = np.exp(-0.85 * e ** 2.4).astype(np.float32)[..., None]
        self.center = np.exp(-(self.px ** 2 + self.py ** 2) / 0.55).astype(np.float32)[..., None]
        # statisches Dither-Rauschen gegen Farbstufen im dunklen Verlauf
        rng = np.random.default_rng(3)
        self.dither = (rng.random((h, w, 1)) + rng.random((h, w, 1)) - 1.0).astype(np.float32) * 0.9

    def frame(self, t):
        m = motion(t)
        th = m["th"]
        px, py = self.px, self.py
        s = self.s

        # 1) sanfte, fließende Welle im Bildraum
        wx = 0.0085 * np.sin(2.2 * py + 0.5 * px + 3 * th) + 0.006 * np.sin(3.3 * py - 0.8 * px - 5 * th + 1.0)
        wy = 0.0085 * np.sin(1.9 * px - 0.4 * py + 3 * th + 0.5) + 0.006 * np.sin(2.8 * px + 0.9 * py + 5 * th + 2.0)
        qx = px + wx - m["cx"]
        qy = py + wy - m["cy"]

        # 2) Linsenwölbung: r_src = r / sqrt(1 + k r^2)
        g = 1.0 / np.sqrt(1.0 + m["k"] * (qx * qx + qy * qy))
        qx = qx * g + m["cx"]
        qy = qy * g + m["cy"]

        # 3) Drehung, Zoom, Drift -> Gitterkoordinaten (px @1080p)
        c, s_ = np.cos(m["rot"]), np.sin(m["rot"])
        f = 540.0 / m["zoom"]
        X = (c * qx - s_ * qy) * f + m["dx"]
        Y = (s_ * qx + c * qy) * f + m["dy"]

        # Abstand zur nächsten Linie in Bildpixeln
        gXy, gXx = np.gradient(X)
        gYy, gYx = np.gradient(Y)
        nX = np.sqrt(gXx * gXx + gXy * gXy) + 1e-6
        nY = np.sqrt(gYx * gYx + gYy * gYy) + 1e-6
        dv = np.abs(X - np.rint(X / CELL) * CELL) / nX
        dh = np.abs(Y - np.rint(Y / CELL) * CELL) / nY

        # Licht jeder Linie: Kern + enger Schein + weiter Glow (Kreuzungen addieren sich)
        hw = 0.5 * CORE_W * s
        core = np.zeros_like(dv)
        glow = np.zeros_like(dv)
        for d in (dv, dh):
            cv = np.clip(hw - d + 0.6, 0.0, 1.0)
            core += cv * cv * (3 - 2 * cv)
            glow += 0.30 * np.exp(-(d / (BLOOM * s)) ** 2) + 0.24 * np.exp(-d / (HALO * s))

        glow_col = GLOW_A + (GLOW_B - GLOW_A) * m["hue"]
        light = core[..., None] * CORE + glow[..., None] * glow_col
        bg = BG + CENTER_GLOW * self.center * m["pulse"]
        rgb = (bg + light) * self.vig

        # weiche Schulter statt hartem Abschneiden (dunkle Töne bleiben unverändert)
        a = 0.72
        over = np.maximum(rgb - a, 0.0)
        rgb = np.minimum(rgb, a) + (1 - a) * (1 - np.exp(-over / (1 - a)))
        return np.clip(rgb * 255.0 + self.dither + 0.5, 0, 255).astype(np.uint8)


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
    ap.add_argument("--crf", type=int, default=17)
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
                       else HERE / "output" / "lila_gitter_hintergrund_50s.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)
    n = int(round(args.seconds * args.fps))
    times = [i / args.fps for i in range(n)]

    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{args.width}x{args.height}",
           "-r", str(args.fps), "-i", "-",
           "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf),
           "-x264-params", "aq-mode=3",          # weniger Blockbildung in dunklen Flächen
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
