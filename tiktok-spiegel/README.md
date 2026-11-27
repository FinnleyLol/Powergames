# TikTok-Video: Du hast dein Gesicht noch nie gesehen

**Video:** [`output/dein_gesicht_spiegel_tiktok.mp4`](output/dein_gesicht_spiegel_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 30 s · Deutsch · Fun Fact/Psychologie · Stimme: Thorsten (high), laut gemischt (−11 LUFS) · keine Musik

| Zeit | Sprecher | Bild | Host |
|---|---|---|---|
| 0–3,6 s | Du hast dein eigenes Gesicht noch nie mit eigenen Augen gesehen. | Mintgrünes Bad mit Waschbecken (tropfender Hahn), Handtuch, Seifenblasen; DEIN GESICHT, durchgestrichenes Auge | läuft rein, schaut sich um, „?“ |
| 3,6–5,8 s | Nur im Spiegel oder auf Fotos. | Pfirsichfarbene Kommode: Spiegel mit seinem (gespiegelten) Bild, Kamera blitzt, Polaroid fliegt rein; SPIEGEL, FOTO | im Spiegel und auf dem Foto |
| 5,8–8,1 s | Und der Spiegel zeigt dich seitenverkehrt. | Lila Bad: eine Frau zeigt auf den Spiegel, ihr Spiegelbild zeigt in die andere Richtung, Doppelpfeil; SEITENVERKEHRT | – |
| 8,1–11,2 s | Dein Scheitel, dein Muttermal: alles auf der falschen Seite. | Split-Screen ECHT / SPIEGEL, Callouts SCHEITEL und MUTTERMAL, rote Kreise auf der Spiegelseite; FALSCHE SEITE! | – |
| 11,2–14,7 s | Weil du dieses Spiegelbild jeden Tag siehst, findest du es schöner. | Blaues Bad, er putzt sich im Spiegel die Zähne (Schaum), Kalender zählt TAG 1 → 365, Herzen steigen auf; JEDEN TAG | putzt Zähne |
| 14,7–17,2 s | Darum wirken Fotos von dir oft so komisch. | Neon-Lila Hintergrund, Selfie-Handy mit Blitz und Auslöser; KOMISCH?! | schaut zweifelnd, Schweißtropfen |
| 17,2–20,9 s | Deine Freunde sehen es genau umgekehrt: sie finden das Foto besser. | Gelbe Wand mit zwei Bildern (SPIEGELBILD / FOTO), Daumen runter und hoch, zwei Freunde mit Sprechblasen „KOMISCH…“ und „SO BIST DU!“; DEINE FREUNDE | – |
| 20,9–24,4 s | Das haben Forscher schon 1977 getestet. | 70er-Jahre-Labor in Orange/Braun, Projektor wirft Bild A und B an die Wand, Versuchsperson wählt A (Häkchen), Forscher mit Klemmbrett, Wanduhr; STUDIE 1977 | – |
| 24,4–30 s | Du bist also der Einzige, der dich falsch herum kennt. | Mintgrünes Bad mit großem Spiegel: das Spiegelbild macht plötzlich etwas anderes (Daumen hoch, Funkeln, hüpft); FALSCH HERUM | steht ernst davor, „!“, Doppelblick, Schweißtropfen |

Fakten: Spiegel vertauschen links und rechts, deshalb kennst du dein Gesicht fast nur seitenverkehrt. Mita, Dermer und Knight (1977, *Journal of Personality and Social Psychology* 35(8), 597–601) zeigten Versuchspersonen echte und gespiegelte Fotos ihres Gesichts: Die Personen selbst mochten eher das gespiegelte Bild, ihre Freunde eher das echte Foto. Erklärt wird das mit dem Mere-Exposure-Effekt: Was wir oft sehen, finden wir sympathischer.

Technik wie bei [`../tiktok-koepenick/`](../tiktok-koepenick/). Neu sind `mirrorFrame()`/`mirrorShine()` (der Host oder eine Figur wird gespiegelt in einen Spiegel geclippt), `phone()`, `toothbrush()`, `heart()`, `thumb()`, in `person()` der Seitenscheitel (`parted`), Muttermal (`mole`) und Anstecker (`pin`), und in `audio.py` Zahnbürsten-Schrubben (`scrub`) und Display-Tippen (`tap`).
