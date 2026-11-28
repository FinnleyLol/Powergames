# TikTok-Video: Morgens bist du größer als abends

**Video:** [`output/morgens_groesser_tiktok.mp4`](output/morgens_groesser_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 30 s · Deutsch · Fun Fact/Körper · Stimme: Thorsten (high), gemastert auf etwa −7,5 LUFS · keine Musik

| Zeit | Sprecher | Bild | Host |
|---|---|---|---|
| 0–2,7 s | Morgens bist du etwa einen Zentimeter größer | Schlafzimmer bei Sonnenaufgang (Pfirsich/Rosa), klingelnder Wecker, Vogel vor dem Fenster, Türrahmen mit Bleistiftstrichen, Maßband; MORGENS | läuft rein, streckt sich, Daumen hoch |
| 2,7–3,5 s | als abends. | Dasselbe Zimmer zur blauen Stunde, Mond, Nachttischlampe; zwei Striche, 1 CM | grübelt, „?“ |
| 3,5–5,6 s | Schuld sind die Bandscheiben in deinem Rücken. | Arztpraxis in Mint: Röntgenbild der Wirbelsäule am Leuchtkasten, die Bandscheiben leuchten gelb, Ärztin zeigt darauf; BANDSCHEIBEN | – |
| 5,6–9 s | Sie sitzen zwischen den Knochen deiner Wirbelsäule, wie kleine Kissen. | Lavendelfarbenes Schaubild: Wirbel und federnde Bandscheiben, ein Kissen ploppt daneben; KNOCHEN, WIE KISSEN | – |
| 9–12,3 s | Tagsüber drückt dein Gewicht auf sie, und sie verlieren Wasser. | Sonnige bunte Stadt mit Parallax, Passanten laufen vorbei; rote Pfeile drücken auf ihn, Einblendung: Bandscheibe wird zusammengedrückt, Wassertropfen spritzen raus; TAGSÜBER, GEWICHT, WASSER | läuft durch die Stadt, wird gestaucht, Schweißtropfen |
| 12,3–15,3 s | Sie werden flacher, und du wirst ein kleines bisschen kleiner. | Sonnenuntergang über Hügeln, Karte MORGENS vs. ABENDS (Bandscheibe wird flach), Maßband; FLACHER, − 1 CM | schrumpft ein Stück, Schweißtropfen |
| 15,3–17,6 s | Nachts im Liegen saugen sie sich wieder voll. | Schlafzimmer bei Nacht, Mondsichel, Z-z-z; Einblendung: Bandscheibe saugt Wasser auf; NACHTS, WIEDER VOLL | schläft im Bett |
| 17,6–19,3 s | Im Weltraum ist es noch extremer: | Raumstation über der Erde (Wolken ziehen, Kontinente), Sterne; IM WELTRAUM | – |
| 19,3–23,1 s | Ohne Schwerkraft wachsen Astronauten um bis zu fünf Zentimeter. | Modul der Raumstation: schwebender Stift, Apfel, Wassertropfen, Maßband an der Wand; OHNE SCHWERKRAFT, + 5 CM | schwebt, wird länger, Funkeln |
| 23,1–25,4 s | Viele bekommen davon sogar Rückenschmerzen. | Astronaut schwebt, roter pulsierender Schmerz im Rücken mit Blitzen; ASTRONAUT, RÜCKENSCHMERZEN | – |
| 25,4–30 s | Zurück auf der Erde schrumpfen sie wieder. | Kapsel landet am Fallschirm in der Steppe, Staubwolke, Hubschrauber fliegt vorbei; ZURÜCK AUF DER ERDE, − 5 CM | springt raus, schrumpft, „!“, Schweißtropfen |

Fakten: Über den Tag werden die Bandscheiben durch das Körpergewicht zusammengedrückt und geben Flüssigkeit ab; man ist abends rund 1 bis 2 cm kleiner als morgens. Im Liegen nehmen sie nachts wieder Wasser auf. In der Schwerelosigkeit dehnt sich die Wirbelsäule: Astronauten werden bis zu etwa 3 % größer (rund 5 cm), viele bekommen dabei Rückenschmerzen, und nach der Rückkehr schrumpfen sie wieder auf ihre normale Größe.

Aussprache: „Wirbeln“ und „Weltall“ waren für Whisper undeutlich, daher „Knochen deiner Wirbelsäule“ und „Weltraum“. Schritte und der Schmerz-Effekt liegen nicht auf Wortanfängen, damit „Tagsüber“ und „Rückenschmerzen“ klar bleiben.

Technik wie bei [`../tiktok-venus/`](../tiktok-venus/), aber mit dem neuen, lauteren Mastering (Vorbegrenzer, loudnorm, Sicherheitsbegrenzer). Neu sind `drawHost` mit `noShadow` (liegen, schweben), `vertebra()`, `disc()`, `spine()`, `pillow()`, `tape()` (Maßband), `clock()` (Wecker), `iss()`, `capsule()`, `zzz()`, und in `audio.py` Schnarchen (`snore`), Quetschen (`squish`) und Strecken (`stretch`).
