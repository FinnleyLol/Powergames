# Lila Gitter – Motion-Graphics-Hintergrund

Bewegter, dunkler Hintergrund (Template) für Videos: ein **leuchtendes Gitter**, das wie durch
eine Linse **nach außen gewölbt** ist, mit **lila Note**. Die Linien sind lavendelweiß mit
violettem Glow, der Hintergrund ist dunkles Violett-Schwarz, die Mitte hell und die Ecken
verlaufen ins Schwarze.

▶️ **Video:** [`output/lila_gitter_hintergrund_50s.mp4`](output/lila_gitter_hintergrund_50s.mp4)

![Standbild aus dem Video](vorschau.jpg)

| | |
|---|---|
| Länge | 50 Sekunden, **nahtlos loopbar** (letztes Bild geht direkt ins erste über) |
| Format | 1920 × 1080, 25 fps, H.264 (MP4), ohne Ton |
| Farben | Hintergrund `#191224`, Linien `#EEE2FF`, Glow `#965CFF` ↔ `#CD5CF5` |

## Die Bewegung

Zügig und fließend (doppelt so schnell wie die erste Version):

- **Gleiten**: Das Gitter zieht schräg durchs Bild (24 × 12 Kästchen pro Loop, im Schnitt ca. 75 px/s), mit weicher Schwingung
- **Linsenwölbung**, die fünfmal pro Loop „atmet“, und eine wandernde Linsenmitte
- **Drehung & Zoom**: hin und her (ca. ±3°, ±6 %)
- **Flüssige Welle**: eine wandernde Welle lässt die Linien leicht schwimmen
- **Farbe**: Der Glow pendelt zwischen Violett und Lila-Pink, das Licht in der Mitte pulsiert leicht
- **Bewegungsunschärfe** (4 Zwischenbilder, 180°-Shutter), damit die schnellen Linien bei 25 fps nicht ruckeln

## Selbst rendern / anpassen

```bash
pip install numpy pillow        # ffmpeg muss installiert sein
python make_video.py            # volles Video nach output/
python make_video.py --preview  # schnelle Vorschau (960x540, 10 s) nach build/
python make_video.py --still 12.5               # Einzelbild als PNG
python make_video.py --blur 1   # ohne Bewegungsunschärfe (rendert ca. 4x schneller)
python make_video.py --width 3840 --height 2160 --out output/lila_gitter_4k.mp4   # 4K
```

Farben (`BG`, `CORE`, `GLOW_A`, `GLOW_B`), Kästchengröße (`CELL`), Glow (`BLOOM`, `HALO`), Tempo
(`DRIFT_X`, `DRIFT_Y`) und die Bewegung (`motion()`) stehen oben in [`make_video.py`](make_video.py). Damit der Loop nahtlos
bleibt, in `motion()` nur ganzzahlige Vielfache von `th` verwenden.
