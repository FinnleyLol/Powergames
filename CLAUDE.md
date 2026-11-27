# Notes for Claude

This repo has two kinds of videos: the German→Turkish learning videos (see README.md) and the English TikTok shorts. The rules below are for the **TikTok shorts**. They come from the owner's feedback on the first two shorts (`tiktok-oymyakon/`, `tiktok-trees/`) and apply to every new one.

## TikTok shorts: rules

- **Host:** the green character in the black suit and fur hat is the main character of the series. Poses are in `character/` (`serious`, `thinking`, `thumbsup`).
- **Host screen time:** he does **not** have to be in every scene. Put him in about **half** of the video. The other scenes are only visuals (images, motion graphics, maps, charts, illustrations). Switch between scenes with him and scenes without him.
- **Topics:** any interesting topic (science, history, tech, animals, space, the human body, psychology, money, food…). The fur hat is just his look. Do **not** pick winter/cold topics because of it, and vary the topics from video to video.
- **Format:** 9:16, 1080×1920, 30 fps, about 25 s, with lots of motion graphics and visuals.
- **Voice:** Kokoro **`am_liam`** (speaker id 15 in `kokoro-multi-lang-v1_0`): a young man of about 25, chosen by the owner. Do not use the deeper narrator voice of the first short (`am_michael`).
- **No music.** Sound effects that go with the animations are fine.
- **Subtitles:** **one word at a time**. Only the word being spoken is on screen, and each word pops up on its own (no groups of 2–3 words). Put it in the centre of the screen (vertically in the middle, around y ≈ 960), a bit smaller than in the first short (that one used 74 px Montserrat Black; `tiktok-trees` used 60 px).
- **Ending:** **no outro at all.** No "follow" line, no follow button, no question to the viewer. The video ends with the last fact or its visual payoff.

## How to make one

Copy `tiktok-trees/` to a new folder (Liam voice, no music, centred subtitles), then change:
- `SCRIPT`, `make_cues` and the sound-effect cues in `audio.py` for the new topic. Leave out the outro line, the follow button and the deadpan zoom.
- `buildChunks` in `scene.js`, so that each chunk is exactly one word: one word on screen at a time, each with its own pop.
- `CHAR_KEYS` and `drawCharacter`, so the host is only on screen in about half of the scenes. He should slide in and out, and the visual-only scenes should use the whole screen.

Run `python make_video.py`, and check previews with `node render.mjs --stills …`. Check the voice with Whisper as well: short phrases can come out unclear ("The catch?" was heard as "Leakage").
