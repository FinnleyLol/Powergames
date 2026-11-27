# Notes for Claude

This repo has two kinds of videos: the German→Turkish learning videos (see README.md) and the English TikTok shorts. The rules below are for the **TikTok shorts**. They are the owner's feedback on the first short (`tiktok-oymyakon/`) and apply to every new one.

## TikTok shorts: rules

- **Host:** the green character in the black suit and fur hat is the main character of every short. Poses are in `character/` (`serious`, `thinking`, `thumbsup`).
- **Topics:** any interesting topic (science, history, tech, animals, space, the human body, psychology, money, food…). The fur hat is just his look. Do **not** pick winter/cold topics because of it, and vary the topics from video to video.
- **Format:** 9:16, 1080×1920, 30 fps, about 25 s, with lots of motion graphics and visuals.
- **Voice:** a young man of about 25, not the deeper narrator voice of the first short (`am_michael`). Kokoro voice: _not chosen yet; candidates are am_puck, am_eric, am_liam, am_echo_.
- **No music.** Sound effects that go with the animations are fine.
- **Subtitles:** in the centre of the screen (vertically in the middle, around y ≈ 960), and a bit smaller than in the first short (that one used 74 px Montserrat Black).
- **Ending:** no question to the viewer. The last line, said flatly and deadpan: **"Follow my account if you're cool."**

## How to make one

Copy `tiktok-oymyakon/` to a new folder and change `SCRIPT`, `make_cues`, `VOICE` and the scene functions in `scene.js`. Leave out the `music(...)` stem in `audio.py`, and move `drawCaptions` to the middle of the screen. Run `python make_video.py`, and check previews with `node render.mjs --stills …`.
