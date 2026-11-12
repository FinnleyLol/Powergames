# Türkisch lernen – Lernvideos 🇩🇪 → 🇹🇷

Lernvideos für Deutschsprachige, die Türkisch lernen, mit türkischer Aussprache, Pausen zum Nachsprechen und einem Quiz.

| Video | Thema | Länge |
|---|---|---|
| [Hayvanlar – Tiere](hayvanlar-video/) | 30 Tiere, Aussprache-Regeln, *Bu ne?*, Mehrzahl -lar/-ler | ca. 8 min |
| [Fiiller – Verben](fiiller-video/) | 20 wichtige Verben, -mek/-mak, ich-Form -iyorum, Satzbau, Verneinung | ca. 10 min |
| [Vücut – Körperteile](vucut-video/) | 30 Körperteile, *iki göz*, *başım* (mein Kopf), *… ağrıyor* (tut weh) | ca. 7 min |

Die Videos liegen jeweils im Ordner `output/`. Die Wortlisten stehen in den READMEs der Ordner.

## Technik

- `lernvideo/engine.py`: gemeinsame Engine mit Stimmen (Piper TTS), optionalem Aussprache-Check (Whisper), Grafik, Szenen und Rendern (ffmpeg)
- `lernvideo/nouns.py`: Bausteine für Wortkarten-Videos (Karte, Kapitel, Quiz, Übersicht …)
- `<video>/make_video.py`: Inhalte und Szenen eines Videos

```bash
pip install -r requirements.txt
cd fiiller-video && python make_video.py
```
