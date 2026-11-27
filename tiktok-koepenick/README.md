# TikTok-Video: Der Hauptmann von Köpenick (1906)

**Video:** [`output/hauptmann_von_koepenick_tiktok.mp4`](output/hauptmann_von_koepenick_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · **30 s** · **Deutsch** · Stimme: Piper `de_DE-thorsten-high` · keine Musik

Das erste deutsche Video der Reihe. Flacher Illustrationsstil mit harten Schnitten (14 Einstellungen). Neu sind **animierte Menschen und Tiere**: Wilhelm Voigt, der Trödelhändler, Soldaten mit Pickelhaube, eine Passantin, der Bürgermeister, ein Schutzmann, der Kaiser, ein Zeitungsjunge, Pferd mit Kutsche, Hund und Tauben. Sie laufen, marschieren, salutieren, zeigen, blinzeln, reden und erschrecken sich. Der Host ist in etwa der Hälfte der Einstellungen dabei.

## Text und Einstellungen

| Zeit | Sprecher | Bild | Host |
|---|---|---|---|
| 0–2 s | Berlin, 1906. | Berliner Straße im Herbst, Pferdekutsche, Passanten, Gaslaterne | läuft ins Bild |
| 2–4 s | Ein arbeitsloser Schuster | Werkstatt, Voigt hämmert an einem Schuh; SCHUSTER, ARBEITSLOS | – |
| 4–5,4 s | kauft sich beim Trödelhändler | Trödelladen, Händler mit Brille und Bart, Münzen fliegen; „DIE DA, BITTE!“ | – |
| 5,4–6,6 s | eine alte Hauptmanns-Uniform. | Verwandlung im Spotlight: MANTEL, MÜTZE, SÄBEL, dann Salut | – |
| 6,6–9,6 s | Dann stellt er sich auf die Straße und gibt einfach Befehle. | „HALT! MIR NACH!“, eine Passantin erschrickt, ein Hund bellt („WUFF!“) | „?“ |
| 9,6–11,9 s | Eine Gruppe Soldaten gehorcht ihm sofort. | Soldaten marschieren und salutieren: „JAWOHL, HERR HAUPTMANN!“ | – |
| 11,9–13,4 s | Mit ihnen fährt er nach Köpenick, | Zug mit Pickelhauben in den Fenstern, Karte Berlin → Köpenick | – |
| 13,4–14,7 s | besetzt das Rathaus | Rathaus Köpenick, Wachen am Tor, Tauben fliegen auf | „!“ |
| 14,7–16,7 s | und lässt den Bürgermeister verhaften. | Bürgermeister mit Amtskette: „WAS?!“, wird abgeführt; VERHAFTET | – |
| 16,7–19,5 s | Dann nimmt er die Stadtkasse mit: über 4.000 Mark. | Geldkassette öffnet sich, Zähler bis 4.000+ MARK, der Hauptmann trägt sie weg | schwitzt |
| 19,5–21,4 s | Zehn Tage später wird er gefasst. | Regen, Kalender 16. → 26. Oktober, Schutzmann nimmt Voigt fest; GEFASST | – |
| 21,4–23,1 s | Doch der Kaiser begnadigt ihn. | Kaiser Wilhelm II. unterschreibt, Stempel BEGNADIGT, 1908 | – |
| 23,1–26,3 s | Wilhelm Voigt wird als Hauptmann von Köpenick weltberühmt. | Zeitungen auf Deutsch, Englisch und Französisch, Zeitungsjunge „EXTRABLATT!“ | Daumen hoch |
| 26,3–30 s | Und alles nur wegen einer Uniform vom Trödelhändler. | Die Uniform hängt mit Preisschild „BILLIG“ im Laden, der Händler zuckt mit den Schultern | „?“ |

Fakten: Am 16. Oktober 1906 stellte sich der arbeitslose Schuster Wilhelm Voigt in einer beim Trödler gekauften Hauptmannsuniform vor Soldaten, fuhr mit ihnen nach Köpenick, besetzte das Rathaus, ließ Bürgermeister Langerhans festnehmen und nahm die Stadtkasse (gut 4.000 Mark) mit. Er wurde am 26. Oktober gefasst, zu vier Jahren Haft verurteilt und 1908 von Kaiser Wilhelm II. begnadigt.

## Technik

```bash
pip install -r ../requirements.txt
npm install
python make_video.py   # Stimme (Piper) -> Geräusche -> Rendern -> Muxen
```

- `make_video.py`: Piper statt Kokoro (`PIPER_VOICE`, `LENGTH_SCALE = 0.9`). Silben werden für die Untertitel deutsch gezählt. Wörter, die Thorsten nuschelt, bekommen eine Sprechform (`"*Trödelhändler|Trödel-Händler"`, `"*Voigt|Vogt"`).
- `scene.js`: `person()` zeichnet flache Figuren mit Optionen für Mantel, Hut (Pickelhaube, Offiziersmütze, Zylinder, Damenhut …), Bart, Amtskette, Säbel, Gewehr und Pose (laufen, salutieren, zeigen, Hände hoch, hämmern, tragen, winken). Dazu kommen `horse()` mit Kutsche, `dog()` und `pigeons()`. Die Kulissen sind `berlinRow`, `street`, `gasLamp`, `rathaus`, `newspaper` und `mapInset`.
- `audio.py`: Hufe und Kutschenräder, Hammer, Ladenglocke, Münzen, Stoffrascheln, Hund, Marschschritte und Hackenknallen, Zug, Flügelschlagen, Geldkassette, Trillerpfeife, Handschellen, Feder und Stempel. Keine Musik.
- Prüfung: deutsches Whisper (`sherpa-onnx-whisper-small`, `language='de'`).
