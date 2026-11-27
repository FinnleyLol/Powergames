# TikTok short: Oymyakon, the coldest town on Earth

**Video:** [`output/oymyakon_tiktok.mp4`](output/oymyakon_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 25 s · English male voiceover

Host: the green character in the black suit and fur hat ([`../character/`](../character/)).

## Script

| Time | Voiceover | On screen |
|---|---|---|
| 0–3 s | This is the coldest inhabited place on Earth. | Title slam, globe spinning to Siberia, host slides in |
| 3–5 s | Oymyakon, Siberia. | Zoom into Russia, pin drop, Arctic Circle, Yakutsk, place card with coordinates, population ≈ 500, elevation ≈ 750 m |
| 5–10 s | Here, it once hit minus 67.7 degrees Celsius. | Thermometer drops, glitch counter to −67.7 °C, ice cracks, frost on the screen, 6 Feb 1933, −89.9 °F, host shivers and his breath freezes |
| 10–13 s | That's colder than the average temperature on Mars. | Oymyakon vs Mars, bar chart: freezer −18 °C, Mars ≈ −63 °C, Oymyakon −67.7 °C |
| 13–16 s | Kids still go to school, until it hits minus 52. | School with kids walking in, temperature slider, CLOSED stamp at −52 °C |
| 16–21 s | And cars run all day, because once they stop, they might not start again. | Car idling with exhaust, spinning clock, engine off, car freezes over, battery drains, WON'T START |
| 21–25 s | Would you survive here? Follow for more. | Host with a thumbs up, YES / NO WAY buttons, Follow button with a tap |

## How it is made

```bash
pip install -r ../requirements.txt
npm install            # d3, topojson-client, world-atlas (globe and map)
python make_video.py   # voice -> audio -> render -> mux, about 2 minutes
```

- `make_video.py`: the script and its timing, the voice (Kokoro TTS `am_michael` via sherpa-onnx, downloaded into `../.cache`), word timings for the captions, the cue times shared by picture and sound, and the final mux (loudness −14 LUFS).
- `audio.py`: synthesized music (A minor, 100 BPM, ducked under the voice), sound effects (whooshes, impacts, ticks, ice cracks, school bell, stamp, engine, failed starter) and wind.
- `scene.html` + `scene.js`: the canvas animation (globe, map, thermometer, charts, school, car, captions, frost, snow, aurora, camera shake). `renderFrame(i)` always draws the same frame for the same `i`.
- `render.mjs`: renders the frames in headless Chromium with Playwright (4 workers) and encodes them with ffmpeg. For quick previews: `node render.mjs --stills 1.0,8.7,24.0`, which writes to `build/stills/`.

To make another episode with the same host, copy this folder, then change `SCRIPT`, `make_cues` and the scene functions in `scene.js`.
