# Notes for Claude

This repo has two kinds of videos: the German→Turkish learning videos (see README.md) and the English TikTok shorts. The rules below are for the **TikTok shorts**. They come from the owner's feedback on the shorts so far (`tiktok-oymyakon/`, `tiktok-trees/`, `tiktok-penicillin/`) and apply to every new one.

## TikTok shorts: rules

- **Host:** the green character in the black suit and fur hat is the main character of the series. Poses are in `character/` (`serious`, `thinking`, `thumbsup`; use any new poses the owner adds there).
- **Host screen time:** he does **not** have to be in every scene. Put him in about **half** of the video. The other scenes are only visuals (images, motion graphics, maps, charts, illustrations). Switch between scenes with him and scenes without him.
- **Animate the host more, inside the scenes:** do not just park him at the bottom of the screen. He stands **in** the scenery: on its ground, with a shadow, in perspective, sometimes behind foreground objects. Let him:
  - **walk** in, out and across (step bob, sway, little dust puffs), **jump** with squash and stretch, and **turn** by mirroring the sprite to face what he looks at;
  - **move his head** with a head/body split rig (nod, tilt, look around, double take; pivot at the neck);
  - **react** with emotes such as "!", "?", sweat drops, sparkles, a lightbulb or a thought bubble with an icon;
  - **interact** with objects: they pop up next to him, he points or looks at them, he holds them as an overlay;
  - change **pose** on key words, while the camera moves with him (push-ins, pans, parallax).
- **Backgrounds and sceneries:** do **not** reuse the same plain motion-graphics background (dark gradient + glow + dots) everywhere. Each scene gets its **own illustrated scenery** drawn in code that fits the story: rooms, labs, streets, cities, landscapes, skies, underwater, space, historic places… Build them with depth (background / midground / foreground layers with parallax), light (time of day, lamps, glow, shadows) and small moving details (clouds, birds, people, steam, flickering lights).
  - **Vary the colour palettes** between scenes and between videos. Not always brown or green: use blue hours, sunsets, neon nights, pastel days, deep ocean blues, desert oranges, and so on.
  - Use plain graphic backgrounds only for short chart or number moments.
- **Show and visualize more:** every sentence gets something concrete to look at (objects, places, people, actions, maps, diagrams), with several things moving at once. Avoid text-only moments.
- **Topics:** the channel is about **knowledge**, in different formats: **fun-fact** videos, **story** videos (a narrated story, e.g. how something was invented or a strange true event) and **history** videos. Switch between these formats and between subjects (science, history, tech, animals, space, the human body, psychology, money, food…). The fur hat is just his look. Do **not** pick winter/cold topics because of it.
- **Format:** 9:16, 1080×1920, 30 fps, about 25 s.
- **Real photos:** mostly the visuals are self-made. **Only rarely** (a few shots in some videos, not in every video), pop in real photos or GIFs/clips from royalty-free sites (Pexels, Pixabay, other no-copyright sources such as public-domain files on Wikimedia Commons). Use only files whose license allows it (Pexels/Pixabay license, CC0 or public domain; CC BY only with credit). Avoid logos and recognisable people in a bad light. List every file with its source URL in that video's README.
  - The owner always allows these sites. The cloud environment **"Powergames"** allows pexels.com (+ www/images/videos/api), pixabay.com (+ cdn), unsplash.com (+ images/api), commons.wikimedia.org and upload.wikimedia.org, and has a setup script (pip + npm installs). Use that environment for this repo.
  - What works (tested): direct image downloads from `images.pexels.com`, `upload.wikimedia.org` and `images.unsplash.com`. Wikimedia Commons web pages (`/wiki/File:…`, `Special:Search`) work. The Commons API often answers 429 from the shared cloud IP; do not get around that by faking a browser User-Agent. The websites `www.pexels.com` and `pixabay.com` answer scripts with 403 (bot protection), so search through the APIs. `api.pexels.com` needs a free API key in the `Authorization` header (no prefix). The Pixabay API needs `key=` in the URL. Ask for keys with `request_credential`, or ask the owner to add them in the environment settings. Never ask for keys in the chat.
- **Voice:** Kokoro **`am_liam`** (speaker id 15 in `kokoro-multi-lang-v1_0`): a young man of about 25, chosen by the owner. Do not use the deeper narrator voice of the first short (`am_michael`).
- **No music.** Sound effects that go with the animations are fine (footsteps etc. for the host's movements).
- **Subtitles:** **one word at a time**. Only the word being spoken is on screen, and each word pops up on its own (no groups of 2–3 words). Put it in the centre of the screen (vertically in the middle, around y ≈ 960), a bit smaller than in the first short (that one used 74 px Montserrat Black; `tiktok-penicillin` uses 64 px).
- **Ending:** **no outro at all.** No "follow" line, no follow button, no question to the viewer. The video ends with the last fact or its visual payoff.

## How to make one

Copy `tiktok-penicillin/` to a new folder. It already has one-word subtitles (`drawCaptions`), the host on and off screen (`on: false` keys in `CHAR_KEYS`), no music, no outro, and a real photo with a credit in its README. Then:
- Change `SCRIPT`, `make_cues` and the sound-effect cues in `audio.py` for the new topic.
- Replace the scene functions in `scene.js`. Give each scene its own illustrated scenery (see the rules above) instead of `drawBackground`'s plain gradient.
- Upgrade the host: split head and body for head moves, add walking, jumping, turning, shadows and emotes, and place him inside the sceneries.

Run `python make_video.py`, and check previews with `node render.mjs --stills …` (look at a contact sheet of many frames). Check the voice with Whisper as well: short phrases can come out unclear ("The catch?" was heard as "Leakage").
