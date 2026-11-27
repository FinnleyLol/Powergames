# TikTok short: the man who sold the Eiffel Tower

**Video:** [`output/eiffel_con_tiktok.mp4`](output/eiffel_con_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 25 s · story/history · voice: Liam · no music

First short with **illustrated sceneries** for every scene and a **rigged host**: his head is separate from his body, so it can nod, tilt and do double takes, and he walks with step bob and dust, jumps with squash and stretch, turns, casts a shadow, shows emotes and wears props. See the rules in [`../CLAUDE.md`](../CLAUDE.md).

## Script and scenes

| Time | Voiceover | Scenery | Host |
|---|---|---|---|
| 0–5 s | In 1925, a con man named Victor Lustig sold the Eiffel Tower. | **Paris at sunset**: purple-to-orange sky, the tower silhouette with twinkling lights, Haussmann rooftops, lamps turning on, birds. "PARIS 1925" types in, a Victor Lustig card, a SOLD tag swings onto the tower | walks in, looks up, "!" and a jump on "sold" |
| 5–9.9 s | He pretended to be a government official and told scrap dealers that Paris wanted to get rid of it. | **Red hotel salon**: damask wallpaper, chandelier, a window onto Paris at blue hour, velvet curtains, a table with four scrap dealers. A government ID gets a FAKE stamp, a blueprint gets FOR SCRAP and "7,300 tons of iron", $ thought bubbles | plays Lustig: fake mustache, badge, nods, turns to the dealers, thumbs up |
| 9.9–11.9 s | One dealer paid him a fortune. | **Banker's desk**: green lamp, a briefcase opens, banknotes and coins burst out | – |
| 11.9–16.5 s | Lustig fled to Austria, and the buyer was too embarrassed to tell the police. | **Night train**: moon, snowy Alps, a stone viaduct, a steam train with lit windows and smoke. Map Paris → Vienna, the buyer blushing and sweating, POLICE crossed out | – |
| 16.5–19 s | So he came back and tried to sell it again. | **Paris by day**: blue sky, clouds, the tower in bronze, trees, pigeons, café awning | tiptoes back in holding a FOR SALE sign, "AGAIN!" |
| 19–25 s | This time, the buyer called the police, but Lustig got away. | **Night street**: one-point perspective, lit windows, a ringing candlestick phone, police with lanterns, a silhouette running and vanishing in a puff, WANTED poster | – |

Facts: in 1925 Lustig posed as a deputy director-general of the Ministry of Posts and Telegraphs, met scrap dealers at a Paris hotel and claimed the city would sell the tower for scrap (its iron structure weighs about 7,300 tonnes). One dealer paid; Lustig left for Vienna, and the dealer was too embarrassed to go to the police. Lustig returned and tried again, the next victim went to the police, and Lustig escaped.

## How it is made

```bash
pip install -r ../requirements.txt
npm install
python make_video.py   # voice -> sound effects -> render -> mux, about 1 minute
```

- `scene.js`: `prepRig` cuts every pose into head and body (`RIG`: neck pivot, mouth, chest and hand points). `drawHost` draws the shadow, body, badge, sign, the rotated head with the mustache, and emotes. `walk` and `dust` handle steps. The scenery helpers are `eiffel`, `buildingsLayer`, `streetLamp`, `cloud`, `birds` and `personSil`.
- `audio.py`: footsteps (synced with the walk cycles via `walk_steps`), typewriter, mustache boing, cash register, money rustle, train chug and steam whistle, phone ring, police whistles, buzzer, birds, poof. No music.
