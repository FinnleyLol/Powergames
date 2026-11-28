# TikTok-Video: Ein Oktopus hat drei Herzen

**Video:** [`output/oktopus_tiktok.mp4`](output/oktopus_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 30 s · Deutsch · Fun Fact/Tiere · Stimme: Thorsten (high), gemastert auf etwa −8 LUFS · keine Musik

| Zeit | Sprecher | Bild | Host |
|---|---|---|---|
| 0–2,1 s | Ein Oktopus hat drei Herzen. | Helles Korallenriff mit Lichtstrahlen, bunten Fischen und Korallen, ein Oktopus taucht hinter einem Felsen auf, drei Herzen ploppen; DER OKTOPUS | läuft im Taucherhelm rein, Daumen hoch, Luftblasen |
| 2,1–4,5 s | Zwei Herzen pumpen Blut durch seine Kiemen, | Röntgen-Schaubild in Petrol: zwei schlagende Herzen, Blut fließt zu den gefiederten Kiemen; ZWEI HERZEN, HERZ 1, HERZ 2, KIEMEN | – |
| 4,5–6,8 s | das dritte Herz versorgt den ganzen Körper. | Dasselbe Schaubild: das große dritte Herz pumpt Blut in alle acht Arme; DAS DRITTE, HERZ 3, GANZER KÖRPER | – |
| 6,8–8,3 s | Und sein Blut ist blau. | Heller Hintergrund: Bluttropfen MENSCH (rot) und OKTOPUS (wird blau); BLAU! | – |
| 8,3–12,4 s | Den Sauerstoff transportiert bei ihm nämlich Kupfer, nicht Eisen wie bei uns. | Periodensystem-Kacheln Cu (leuchtet) und Fe (wird durchgestrichen), Kupfermünzen; SAUERSTOFF-TAXI, OKTOPUS, MENSCH | grübelt, Daumen hoch, „!“ |
| 12,4–15,4 s | Wenn er schwimmt, hört das große Herz sogar auf zu schlagen. | Tiefblaues Wasser, der Oktopus schwimmt per Rückstoß, EKG des Hauptherzens wird zur roten Nulllinie; SCHWIMMEN, PAUSE! | – |
| 15,4–16,9 s | Darum krabbelt er lieber. | Sandiger Meeresboden, der Oktopus krabbelt; KRABBELN | läuft im Helm nebenher, Funkeln |
| 16,9–20,9 s | Er hat keine Knochen und passt durch jedes Loch, das größer ist als sein Schnabel. | Felswand mit kleinem Loch: der Oktopus wird lang und dünn und quetscht sich durch, Schnabel-Symbol; KEINE KNOCHEN, NUR DER SCHNABEL ZÄHLT | staunt, „!“ |
| 20,9–25,2 s | Und die meisten seiner Nervenzellen sitzen nicht im Kopf, sondern in den Armen. | Neon-Lila Schaubild: kleines Gehirn im Kopf, Nervenzellen leuchten entlang der Arme auf, Tortendiagramm; NERVENZELLEN, KOPF, 2/3 IN DEN ARMEN | – |
| 25,2–30 s | Jeder Arm kann sogar selbst tasten und schmecken. | Riff: ein großer Arm tastet sich heran und schnappt sich den Fisch aus seiner Hand; TASTEN, „MMH, FISCH!“ | hält einen Fisch hin, „!“ |

Fakten: Kraken haben drei Herzen: zwei Kiemenherzen und ein Körperherz. Ihr Blut ist blau, weil der Sauerstoff an das kupferhaltige Hämocyanin gebunden ist statt an eisenhaltiges Hämoglobin. Beim Schwimmen setzt das Körperherz aus, deshalb kriechen sie meist. Sie haben kein Skelett und passen durch Öffnungen, die nur etwas größer sind als ihr harter Schnabel. Rund zwei Drittel ihrer Nervenzellen liegen in den Armen, und die Saugnäpfe können tasten und schmecken.

Aussprache: „Kiemen“ wird als „Kiehmen“ gesprochen; „Zwei pumpen“ wurde zu „Zwei Herzen pumpen“, „das dritte“ zu „das dritte Herz versorgt“. Der Schwimm-Whoosh liegt in der Pause vor dem Satz und die EKG-Pieptöne starten erst nach „schwimmt“.

Technik wie bei [`../tiktok-honig/`](../tiktok-honig/). Neu sind `octo()` mit `drawArm()` (Arme mit Saugnäpfen, schwimmen, krabbeln, quetschen), das Herz-Schaubild `anatomy()`, `tile()` (Periodensystem), `reef()`/`seafloor()`, der Taucherhelm, und in `audio.py` Unterwasser-Rauschen (`underwater`), Herzschlag (`thump`), Nulllinie (`flatline`) und Quetschen (`squish`).
