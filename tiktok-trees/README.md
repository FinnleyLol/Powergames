# TikTok short: more trees than stars

**Video:** [`output/trees_vs_stars_tiktok.mp4`](output/trees_vs_stars_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 25 s · voice: Liam (young male) · no music

Host: the green character ([`../character/`](../character/)). This short follows the series rules in [`../CLAUDE.md`](../CLAUDE.md).

## Script

| Time | Voiceover | On screen |
|---|---|---|
| 0–3.5 s | There are more trees on Earth than stars in our entire galaxy. | TREES ? STARS: forest panel sprouts trees, galaxy panel, "?" flips to ">" |
| 3.5–7 s | The Milky Way has between 100 and 400 billion stars. | Spiral galaxy (2,600 particles), MILKY WAY label, YOU ARE HERE, 100 – 400 BILLION STARS |
| 7–14 s | Scientists combined satellite images with over 400,000 forest plots, and estimated about 3 trillion trees. | Green globe, satellite on its orbit scanning, forest plots lighting up, counter to 400,000+, then 3,040,000,000,000 trees and a burst of trees |
| 14–17 s | That's about 375 trees per human. | 375 tree icons pop in a wave, 375 TREES · PER HUMAN, "YOUR SHARE" over the host |
| 17–21 s | But here's the catch. We cut down roughly 15 billion of them every year. | Glitch and warning sign, trees chopped one by one, −15,000,000,000 per year, ≈ 480 every second |
| 21–25 s | Follow my account if you're cool. | FOLLOW button, deadpan zoom on the host's face with a bass hit |

Sources for the numbers: Crowther et al., *Mapping tree density at a global scale*, Nature 2015 (3.04 trillion trees, about 15 billion cut per year, more than 400,000 forest plots); 100–400 billion stars in the Milky Way (common NASA range); 3.04 trillion ÷ 8.1 billion people ≈ 375.

## How it is made

```bash
pip install -r ../requirements.txt
npm install
python make_video.py   # voice -> sound effects -> render -> mux, about 1 minute
```

Same pipeline as [`../tiktok-oymyakon/`](../tiktok-oymyakon/), with the series changes: voice `am_liam` (`VOICE = 15`), no music (`audio.py` only has sound effects), subtitles in the middle of the screen at 60 px (`CAP_Y`, `CAP_SIZE` in `scene.js`), and the dry ending line.
