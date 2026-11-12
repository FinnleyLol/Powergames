# Vücut – Körperteile auf Türkisch 🇩🇪 → 🇹🇷

Lernvideo (1080p, ca. 7 Minuten): 30 Körperteile auf Türkisch mit **türkischer Aussprache**,
dazu drei kurze Bonus-Teile, die direkt an die Videos zu Tieren und Verben anknüpfen.

▶️ **Video:** [`output/vucut_koerperteile_deutsch_tuerkisch.mp4`](output/vucut_koerperteile_deutsch_tuerkisch.mp4)

## So ist das Video aufgebaut

| Teil | Inhalt |
|---|---|
| Merhaba | *Vücut* = der Körper |
| So lernst du | Hören → langsam hören → in der Pause laut nachsprechen |
| Bölüm 1–3 | 30 Wortkarten: Kopf & Gesicht (11), Rumpf & Arme (10), Beine & das Innere (9) |
| Bonus 1 | Mehrzahl-Wiederholung (*gözler*) und: **nach Zahlen keine Mehrzahl** – *iki göz* = zwei Augen |
| Bonus 2 | **mein …**: *başım* (mein Kopf), *elim*, *kolum*, *gözüm* – der Vokal passt sich an wie bei -iyorum |
| Bonus 3 | **Was tut weh?** *Başım ağrıyor.* (Mein Kopf tut weh.) – für den Arztbesuch |
| Quiz | 12 Körperteile: Bild + deutsches Wort, 3-2-1, dann die Lösung |
| Übersicht | Alle 30 Wörter auf einer Seite (zum Anhalten und Abfotografieren) |

Die MP4-Datei hat Kapitelmarken, so kannst du in Playern wie VLC direkt zu einem Teil springen.

## Wortliste

### 1. Baş ve yüz – Kopf & Gesicht

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| der Kopf | **baş** | **basch** | ş = „sch“ · umgangssprachlich auch: kafa |
| das Haar / die Haare | **saç** | **satsch** | ç = „tsch“ · saç steht meist in der Einzahl |
| das Gesicht | **yüz** | **jüs** | yüz heißt auch: hundert! |
| das Auge | **göz** | **gös** | z = weiches, summendes s |
| die Augenbraue | **kaş** | **kasch** | ş = „sch“ |
| das Ohr | **kulak** | ku · **lak** |  |
| die Nase | **burun** | bu · **run** | r leicht gerollt |
| der Mund | **ağız** | aa · **ıs** | ğ ist stumm – das a wird lang |
| der Zahn | **diş** | **disch** | ş = „sch“ |
| die Zunge | **dil** | **dil** | dil heißt auch: die Sprache! |
| die Lippe | **dudak** | du · **dak** |  |

### 2. Gövde ve kollar – Rumpf & Arme

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| der Hals | **boyun** | bo · **jun** | y = „j“ |
| die Schulter | **omuz** | o · **mus** | z = weiches s |
| die Brust | **göğüs** | gö · **jüs** | ğ klingt hier wie ein leichtes j |
| der Rücken | **sırt** | **sırt** | ı = dumpfes i, wie das e in „bitte“ |
| der Bauch | **karın** | ka · **rın** | Karnım aç = Ich habe Hunger |
| der Arm | **kol** | **kol** |  |
| der Ellbogen | **dirsek** | dir · **sek** |  |
| die Hand | **el** | **el** | Kurz und leicht: nur zwei Buchstaben! |
| der Finger | **parmak** | par · **mak** |  |
| der Fingernagel | **tırnak** | tır · **nak** | ı = dumpfes i |

### 3. Bacaklar ve vücudun içi – Beine & das Innere

| Deutsch | Türkisch | Aussprache (betonte Silbe **fett**) | Tipp |
|---|---|---|---|
| das Bein | **bacak** | ba · **dschak** | c = „dsch“ |
| das Knie | **diz** | **dis** | z = weiches s |
| der Fuß | **ayak** | a · **jak** | y = „j“ |
| der Zeh | **ayak parmağı** | a · **jak** · par · ma · ı | wörtlich: Fuß-Finger |
| das Herz | **kalp** | **kalp** |  |
| das Gehirn | **beyin** | be · **jin** | y = „j“ |
| der Muskel | **kas** | **kas** | s ist im Türkischen immer scharf, wie „ß“ |
| das Blut | **kan** | **kan** |  |
| die Haut | **deri** | de · **ri** | deri heißt auch: das Leder |

## Bonus-Regeln

| Regel | Beispiele |
|---|---|
| Nach Zahlen bleibt das Nomen in der **Einzahl** | *iki göz* (zwei Augen), *iki el* (zwei Hände), *on parmak* (zehn Finger), *otuz iki diş* (32 Zähne) |
| **mein …** = Nomen + (Vokal) + **m**; Vokal: a, ı → ı · e, i → i · o, u → u · ö, ü → ü | *başım*, *elim*, *kolum*, *gözüm* |
| **… ağrıyor** = … tut weh (von *ağrımak*, schmerzen) | *Başım / Dişim / Sırtım / Karnım ağrıyor.* |
| Bei *karın* fällt das ı weg | *karın* → *karnım* (mein Bauch) · *Karnım aç.* = Ich habe Hunger. |

Kleine Extras: *yüz* heißt auch „hundert“, *dil* auch „die Sprache“, *deri* auch „das Leder“.

## Video selbst neu erzeugen

Voraussetzungen: Python 3.10+, `ffmpeg` und die Cairo-Bibliothek (für die SVG-Bilder).
Die Technik liegt in [`../lernvideo/`](../lernvideo/): `engine.py` (Stimmen, Grafik, Rendern) und
`nouns.py` (Bausteine für Wortkarten-Videos). Hier stehen nur Inhalte und die Bonus-Szenen.

```bash
pip install -r requirements.txt          # im Hauptordner des Repositorys
cd vucut-video
python make_video.py                      # erzeugt output/vucut_koerperteile_deutsch_tuerkisch.mp4
python make_video.py --preview            # nur Standbilder nach build/preview/
pip install sherpa-onnx
python make_video.py --verify --takes 10  # Aussprache per Whisper prüfen, beste Aufnahme je Wort wählen
```

## Quellen und Lizenzen

- **Türkische Stimme:** Piper TTS `tr_TR-dfki-medium` (Datensatz DFKI, CC BY-NC-SA 4.0, nur nicht-kommerziell)
- **Deutsche Stimme:** Piper TTS `de_DE-thorsten-medium` (Thorsten-Datensatz, CC0)
- **Bilder:** [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0)
- **Schrift:** [Poppins](https://fonts.google.com/specimen/Poppins) (SIL Open Font License)

Die Aussprache stammt von einer Computerstimme. Sie ist gut verständlich, aber nicht perfekt.
Am besten vergleichst du ab und zu mit echten Muttersprachlern.
