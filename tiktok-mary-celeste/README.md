# TikTok short: the ghost ship Mary Celeste

**Video:** [`output/mary_celeste_tiktok.mp4`](output/mary_celeste_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 25 s · mystery/history · voice: Liam · no music

First short in the style of the owner's reference videos: flat vector illustration, **hard cuts** every 1–2 s with a slow push-in on every shot, close-up inserts, pill labels, callouts with leader lines, a speech bubble, big header text, and white captions with yellow key words (one word at a time). Bright daytime palette with a sunset at the end. The story is told in the second person.

## Script and shots

| Time | Voiceover | Shot | Host |
|---|---|---|---|
| 0–2.3 s | December 1872. | Open Atlantic, waves, clouds; ATLANTIC OCEAN, DECEMBER 1872 | – |
| 2.3–4 s | Your ship finds another ship, | Deck of the Dei Gratia, a ship on the horizon ("ANOTHER SHIP") | looks, "!" |
| 4–5.9 s | drifting in the Atlantic. | Telescope view of the drifting ship; DRIFTING, NEAR THE AZORES | – |
| 5.9–8.5 s | Her name: Mary Celeste. | Stern boards, the name is painted letter by letter, NEW YORK | – |
| 8.5–9.8 s | You climb aboard. | Rope ladder, he jumps up and lands with squash; "YOU" tag | yes |
| 9.8–11.2 s | Nobody's there. | Empty deck, wheel turning by itself, lantern, fog; NO ONE ABOARD | looks around, "HELLO?!", "?" |
| 11.2–12.8 s | The sails are still set. | Low angle up the mast; SAILS: STILL SET | – |
| 12.8–14.4 s | The cargo is still there. | Cargo hold with barrels; 1,701 BARRELS OF ALCOHOL | – |
| 14.4–16.4 s | There's food for six months. | Storeroom shelves; 6 MONTHS OF FOOD & WATER | thinking |
| 16.4–18.3 s | But the lifeboat is gone. | Empty davits, dashed outline of the boat; LIFEBOAT: MISSING | sweats |
| 18.3–20.8 s | The last log entry is nine days old. | Ship's log, last entry Nov 25 circled, NOV 25 → DEC 4 = 9 DAYS | – |
| 20.8–22.3 s | Ten people vanished. | Crew list, all 10 names crossed out, FOUND: 0 | – |
| 22.3–25 s | And nobody knows why. | Sunset, the Mary Celeste drifts away into the fog; STILL UNSOLVED | watches |

Facts: the brigantine Dei Gratia found the Mary Celeste drifting between the Azores and Portugal on 4 December 1872. Nobody was on board, the single lifeboat was missing, and the cargo of 1,701 barrels of alcohol and about six months of food and water were still there. The last log entry was dated 25 November. Captain Benjamin Briggs, his wife Sarah, their two-year-old daughter Sophia and seven crew were never found.

## How it is made

```bash
pip install -r ../requirements.txt
npm install
python make_video.py   # voice -> sound effects + sea ambience -> render -> mux
```

- `scene.js`: the `SHOTS` list (start time, draw function, focus point, zoom). `renderFrame` hard-cuts between shots and pushes the camera in slowly. The flat helpers are `seaLayers`, `flatShip`, `squareSail`, `lantern`, `barrel` and `shipWheel`. The label helpers are `header`, `tagPill`, `callout` and `bubble`. The rigged host comes from `tiktok-eiffel`.
- `audio.py`: sea ambience (muffled below deck), wood creaks, gulls, flapping sails, pen scratches, heartbeat, and deep stingers on the reveals. No music.
