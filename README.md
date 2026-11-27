# Türkisch lernen – Lernvideos 🇩🇪 → 🇹🇷

Lernvideos für Deutschsprachige, die Türkisch lernen, mit türkischer Aussprache, Pausen zum Nachsprechen und einem Quiz.

| Video | Thema | Länge |
|---|---|---|
| [Hayvanlar – Tiere](hayvanlar-video/) | 30 Tiere, Aussprache-Regeln, *Bu ne?*, Mehrzahl -lar/-ler | ca. 8 min |
| [Fiiller – Verben](fiiller-video/) | 20 wichtige Verben, -mek/-mak, ich-Form -iyorum, Satzbau, Verneinung | ca. 10 min |
| [Vücut – Körperteile](vucut-video/) | 30 Körperteile, *iki göz*, *başım* (mein Kopf), *… ağrıyor* (tut weh) | ca. 7 min |
| [Hava – Wetter](hava-video/) | 36 Wetter-Wörter (Nomen, Adjektive, Verben), Adjektive benutzen & konjugieren | ca. 11 min |
| [Evde – Einrichtung](evde-video/) | 25 Möbel & Geräte in der Wohnung, *-da/-de* (wo?), auf/unter/neben, *var/yok* | ca. 7 min |
| [Aile – Familie](aile-video/) | 20 Familien-Wörter, Mamas/Papas Seite, *annem* (meine Mutter), *Kaç kardeşin var?* | ca. 7 min |
| [Doğa – Natur](doga-video/) | 40 Natur-Wörter (Land, Pflanzen, Gewässer, Himmel), Gegensätze, Sätze in der Natur | ca. 8 min |
| [Ulaşım – Verkehrsmittel](ulasim-video/) | 25 Wörter für unterwegs, *otobüs durağı*, *otobüsle* (mit dem Bus), Sätze an der Haltestelle | ca. 7 min |
| [Kıyafetler – Kleidung](kiyafet-video/) | 35 Wörter für Kleidung, Schuhe, Accessoires & Schmuck, Farben + Kleidung, *giymek/takmak*, Sätze im Geschäft | ca. 8 min |
| [Mutfak – Küchensachen](mutfak-video/) | 35 Küchenwörter (Kochen, Backen, Tisch, Tee & Kaffee, Geräte, Spülen), Endung *-lık*, Verb → Küchending, Sätze am Esstisch | ca. 9 min |
| [Sayılar – Zahlen](sayilar-video/) | 30 Zahlwörter (0–20, Zehner, hundert, tausend), Regeln für große Zahlen (*yirmi beş*, *iki bin yirmi altı*), Alter & Preise | ca. 8 min |
| [Meslekler – Berufe](meslek-video/) | 40 Berufe, Endung *-cı* (*postacı*), „ich bin …“ (*öğretmenim*), Sätze über die Arbeit | ca. 10 min |
| [Günler ve Aylar – Wochentage & Monate](takvim-video/) | 12 Monate, 7 Wochentage, Kalender-Wörter, Merkhilfen (*Pazartesi*), Jahreszeiten, *pazartesi günü* (am Montag) | ca. 8 min |

Die Videos liegen jeweils im Ordner `output/`. Die Wortlisten stehen in den READMEs der Ordner.

## Technik

- `lernvideo/engine.py`: gemeinsame Engine mit Stimmen (Piper TTS), optionalem Aussprache-Check (Whisper), Grafik, Szenen und Rendern (ffmpeg)
- `lernvideo/nouns.py`: Bausteine für Wortkarten-Videos (Karte, Kapitel, Quiz, Übersicht …)
- `<video>/make_video.py`: Inhalte und Szenen eines Videos

```bash
pip install -r requirements.txt
cd fiiller-video && python make_video.py
```

## TikTok shorts (English, 9:16)

| Video | Topic | Length |
|---|---|---|
| [Oymyakon](tiktok-oymyakon/) | The coldest inhabited place on Earth (−67.7 °C, colder than Mars, school until −52 °C, cars that never stop) | 25 s |
| [More trees than stars](tiktok-trees/) | 3 trillion trees vs 100–400 billion stars in the Milky Way, 375 trees per human, 15 billion cut per year | 25 s |
| [The messy lab that gave us penicillin](tiktok-penicillin/) | Story/history: Fleming's vacation in 1928, the mold that killed bacteria, the first antibiotic | 25 s |

The host of the shorts is the green character in [`character/`](character/) (poses: `serious`, `thinking`, `thumbsup`, with transparent backgrounds).
