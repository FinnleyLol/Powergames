# Hayvanlar – Tiere auf Türkisch 🇩🇪 → 🇹🇷

Lernvideo (1080p, ca. 8 Minuten): 30 Tiere auf Türkisch mit **türkischer Aussprache**.

▶️ **Video:** [`output/hayvanlar_tiere_deutsch_tuerkisch.mp4`](output/hayvanlar_tiere_deutsch_tuerkisch.mp4)

## So ist das Video aufgebaut

| Teil | Inhalt |
|---|---|
| Merhaba | Einführung: *Hayvanlar* = die Tiere |
| So lernst du | Hören → langsam hören → in der Pause laut nachsprechen |
| Aussprache | Die Buchstaben, die anders klingen: ş, ç, c, ı, ğ, y, z, v |
| Bölüm 1–4 | 30 Vokabelkarten: deutsches Wort → türkisches Wort (normal + langsam) → Pause zum Nachsprechen |
| Mini-Dialog | *Bu ne?* (Was ist das?) – *Bu bir kedi.* (Das ist eine Katze.) |
| Mehrzahl | *-lar / -ler*: hayvan → hayvan**lar** |
| Quiz | 12 Tiere: Bild + deutsches Wort, 3-2-1, dann die Lösung |
| Übersicht | Alle 30 Wörter auf einer Seite (zum Anhalten und Abfotografieren) |

Die MP4-Datei hat Kapitelmarken, so kannst du in Playern wie VLC direkt zu einem Teil springen.

## Aussprache-Regeln

| Buchstabe | So klingt er | Beispiel |
|---|---|---|
| **ş** | wie „sch“ | kuş (Vogel) |
| **ç** | wie „tsch“ | keçi (Ziege) |
| **c** | wie „dsch“ | civciv (Küken) |
| **ı** | dumpfes i, wie das e in „bitte“ | balık (Fisch) |
| **ğ** | stumm, der Vokal davor wird lang | kurbağa (Frosch) |
| **y** | wie „j“ | koyun (Schaf) |
| **z** | weiches, summendes s wie in „Sonne“ | zürafa (Giraffe) |
| **v** | fast wie „w“ | tavuk (Huhn) |
| **ö, ü** | wie im Deutschen | ördek (Ente) |

Im Türkischen gibt es **keine Artikel**, also kein der, die, das. Betont wird meistens die **letzte Silbe**.

## Wortliste

### 1. Evcil hayvanlar – Haustiere

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| der Hund | **köpek** | kö · **pek** | |
| die Katze | **kedi** | ke · **di** | |
| der Vogel | **kuş** | **kusch** | ş = „sch“ wie in Schule |
| der Fisch | **balık** | ba · **lık** | ı = dumpfes i, wie das e in „bitte“ |
| der Hase / das Kaninchen | **tavşan** | taw · **schan** | v ≈ w · ş = „sch“ |

### 2. Çiftlik hayvanları – Bauernhoftiere

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| das Pferd | **at** | **at** | Nur zwei Buchstaben! |
| die Kuh | **inek** | i · **nek** | |
| das Schaf | **koyun** | ko · **jun** | y = „j“ |
| die Ziege | **keçi** | ke · **tschi** | ç = „tsch“ wie in Quatsch |
| das Schwein | **domuz** | do · **mus** | z = weiches, summendes s wie in „Sonne“ |
| der Esel | **eşek** | e · **schek** | ş = „sch“ |
| das Huhn | **tavuk** | ta · **wuk** | v ≈ w |
| das Küken | **civciv** | dschiw · **dschiw** | c = „dsch“ wie in Dschungel · v ≈ w |
| die Ente | **ördek** | ör · **dek** | ö wie im Deutschen |

### 3. Vahşi hayvanlar – Wilde Tiere

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| der Löwe | **aslan** | as · **lan** | s ist im Türkischen immer scharf, wie „ß“ |
| der Tiger | **kaplan** | kap · **lan** | |
| der Bär | **ayı** | a · **jı** | y = „j“ · ı = dumpfes i |
| der Wolf | **kurt** | **kurt** | r mit der Zungenspitze, leicht gerollt |
| der Fuchs | **tilki** | til · **ki** | |
| der Elefant | **fil** | **fil** | |
| der Affe | **maymun** | mai · **mun** | ay klingt wie „ei“ in Mai |
| die Giraffe | **zürafa** | sü · ra · **fa** | z = weiches s · ü wie im Deutschen |
| das Kamel | **deve** | de · **we** | v ≈ w |
| die Schlange | **yılan** | jı · **lan** | y = „j“ · ı = dumpfes i |

### 4. Küçük hayvanlar – Kleine Tiere

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| die Maus | **fare** | fa · **re** | r leicht gerollt |
| der Frosch | **kurbağa** | kur · **baa** | ğ ist stumm – das a davor wird lang |
| die Schildkröte | **kaplumbağa** | kap · lum · **baa** | ğ ist stumm – das a davor wird lang |
| der Schmetterling | **kelebek** | ke · le · **bek** | |
| die Biene | **arı** | a · **rı** | ı = dumpfes i · r leicht gerollt |
| die Ameise | **karınca** | ka · rın · **dscha** | c = „dsch“ · ı = dumpfes i |

**Bonus:** *Merhaba!* = Hallo! · *Bu ne?* = Was ist das? · *Bu bir …* = Das ist ein/eine … · *Tebrikler!* = Glückwunsch! · *Görüşürüz!* = Bis bald!

## Video selbst neu erzeugen

Voraussetzungen: Python 3.10+, `ffmpeg` und die Cairo-Bibliothek (für die SVG-Bilder).

```bash
cd hayvanlar-video
pip install -r requirements.txt
python make_video.py            # erzeugt output/hayvanlar_tiere_deutsch_tuerkisch.mp4
python make_video.py --preview  # nur Standbilder nach build/preview/ (schnelle Kontrolle)
```

Beim ersten Start lädt das Skript Schrift, Bilder und die zwei Stimmen (rund 130 MB) nach `build/`.

### Aussprache-Check mit `--verify`

Die Computerstimme klingt bei jeder Synthese etwas anders. Manchmal verschluckt sie ein Wortende.
Mit `--verify` erzeugt das Skript pro türkischem Wort bis zu 6 Aufnahmen (`--takes`). Jede Aufnahme
wird mit der Spracherkennung Whisper geprüft, und es bleibt die Aufnahme, die genau so verstanden wird,
wie das Wort geschrieben ist (sonst die ähnlichste). Dafür braucht es zusätzlich `pip install sherpa-onnx`,
und das Whisper-Modell (ca. 640 MB) wird geladen. Das Ergebnis steht in `build/aussprache_check.json`.

```bash
pip install sherpa-onnx
python make_video.py --verify --takes 14
```

Für das fertige Video wurden 69 von 82 türkischen Aufnahmen exakt erkannt. Die übrigen sind meist
Schreibweisen der Erkennung, nicht Aussprachefehler. Beispiel: *kurbağa* wird korrekt als „kurbaa“
gesprochen, Whisper schreibt es aber „Kurba“.
Wörter, Aussprache-Tipps, Quizfragen und Sprechertexte stehen oben in `make_video.py`
(`CHAPTERS`, `PRONUNCIATION`, `QUIZ` …). Neue Tiere kannst du dort ergänzen.

## Quellen und Lizenzen

- **Türkische Stimme:** Piper TTS `tr_TR-dfki-medium` (Datensatz DFKI, CC BY-NC-SA 4.0, nur nicht-kommerziell)
- **Deutsche Stimme:** Piper TTS `de_DE-thorsten-medium` (Thorsten-Datensatz, CC0)
- **Tierbilder:** [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0)
- **Schrift:** [Poppins](https://fonts.google.com/specimen/Poppins) (SIL Open Font License)

Die Aussprache stammt von einer Computerstimme. Sie ist gut verständlich, aber nicht perfekt.
Am besten vergleichst du ab und zu mit echten Muttersprachlern.
