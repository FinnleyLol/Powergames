# TikTok short: the messy lab that gave us penicillin

**Video:** [`output/penicillin_story_tiktok.mp4`](output/penicillin_story_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 25 s · story/history · voice: Liam · no music

Follows the series rules in [`../CLAUDE.md`](../CLAUDE.md): one subtitle word at a time in the middle of the screen, host in about half of the scenes, one real photo, no outro.

## Script

| Time | Voiceover | On screen | Host |
|---|---|---|---|
| 0–7.5 s | In 1928, a scientist named Alexander Fleming went on vacation and left his lab a total mess. When he came back, | Old-film look: LONDON 1928 · St Mary's Hospital, real photo of Fleming in his lab, GONE ON VACATION sign and suitcase, messy lab bench (stack tilts, flask spills, papers fly), mess meter at MAX, calendar AUG → SEP | yes |
| 7.5–13.5 s | one of his dishes of bacteria had grown mold. But around the mold, the bacteria were dead. | Petri dish full screen: golden bacteria colonies, the mold grows, zoom in, the bacteria-free zone spreads and the colonies die | no |
| 13.5–16.7 s | That mold was making a substance he called penicillin. | Mold dripping "mold juice" into a flask, the penicillin molecule draws itself, PENICILLIN | yes |
| 16.7–21.4 s | It became the world's first antibiotic, and it has saved millions of lives. | Timeline 1928 discovered → 1940s mass-produced → 1945 Nobel Prize, #1 medal, a crowd lighting up with a heartbeat line, MILLIONS OF LIVES SAVED | no |
| 21.4–25 s | All because someone forgot to clean up. | The messy lab again, sticky note TO DO: CLEAN LAB gets a red X | yes |

Facts: Fleming returned to his lab at St Mary's Hospital, London, in September 1928 and found a Penicillium mold on a Staphylococcus plate with a clear zone around it. He first called the substance "mould juice", then penicillin (1929). It was mass-produced from the 1940s, and Fleming, Florey and Chain got the 1945 Nobel Prize in Physiology or Medicine.

## Real photo (credit)

- `assets/fleming_lab_D17801.jpg`: *Professor Alexander Fleming at work in his laboratory at St Mary's Hospital, London, during the Second World War*, Imperial War Museum photo D 17801, via Wikimedia Commons ([file page](https://commons.wikimedia.org/wiki/File:Professor_Alexander_Fleming_at_work_in_his_laboratory_at_St_Mary%27s_Hospital,_London,_during_the_Second_World_War._D17801.jpg)). License: **public domain** (PD-UKGov, Crown copyright expired). It was taken in the 1940s, so the video labels it only with his name, not as 1928.

## How it is made

```bash
pip install -r ../requirements.txt
npm install
python make_video.py   # voice -> sound effects -> render -> mux, about 1 minute
```

New compared with `../tiktok-trees/`: `drawCaptions` shows one word at a time, `CHAR_KEYS` has `on: false` keys (the host slides out, and those scenes use the whole screen), the old-film overlay (`filmLook`), the photo with a slow zoom, and no outro.
