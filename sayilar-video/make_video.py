#!/usr/bin/env python3
"""
Lernvideo „Sayılar – Zahlen“: 30 Zahlwörter, Deutsch → Türkisch mit Aussprache, und die Regeln
für größere Zahlen.

Erzeugt ein 1080p-MP4 mit:
  * 30 Wortkarten in 3 Kapiteln: 0 bis 10, 11 bis 20, Zehner + hundert + tausend
  * Bonus 1: Zehner + Einer: zuerst der Zehner (yirmi beş = 20 + 5), andersrum als im Deutschen
  * Bonus 2: Hunderter und Tausender: iki yüz, beş bin … und yüz/bin ohne „bir“
  * Bonus 3: Große Zahlen bauen: 365, 999, 1453, 2026 – auch Jahreszahlen ganz normal
  * Bonus 4: Zahlen im Alltag (Kaç yaşındasın? · Bu kaç lira? …)
  * Quiz (auch mit zusammengesetzten Zahlen), Übersicht, Abschluss

Die Bilder sind große Ziffern (bei 1–10 mit Punkten zum Zählen), die im Code gezeichnet werden.

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/sayilar_zahlen_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 20  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.nouns import *  # noqa: E402,F401,F403  (Engine + Bausteine für Wortkarten-Videos)
from lernvideo import engine  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = (190, 105, 0)
BLUE = (40, 110, 180)

# --------------------------------------------------------------------------------------
# Ziffern als Bilder: „n-25“ → große, farbige 25 (bei 1–10 mit Zählpunkten)
# --------------------------------------------------------------------------------------
NUM_COLORS = [(221, 46, 68), (244, 144, 12), (59, 136, 195), (119, 178, 85), (116, 78, 170),
              (234, 89, 110), (42, 157, 143), (193, 105, 79), (214, 150, 0)]


def number_icon(gfx, code, size):
    text = code[2:]
    value = int(text.replace(".", ""))
    color = NUM_COLORS[(value if value < 10 else value // 10 + value % 10 + len(text)) % len(NUM_COLORS)]
    dark = tuple(int(c * 0.72) for c in color)
    dots = value if 1 <= value <= 10 else 0
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    area_h = size * (0.62 if dots else 0.86)
    fs = int(size * 0.9)
    while fs > 8:
        f = gfx.font("ExtraBold", fs)
        x0, y0, x1, y1 = d.textbbox((0, 0), text, font=f)
        if x1 - x0 <= size * 0.94 and y1 - y0 <= area_h:
            break
        fs -= 2
    cx = size / 2
    cy = size * (0.34 if dots else 0.5)
    pos = (cx - (x0 + x1) / 2, cy - (y0 + y1) / 2)
    off = max(1, int(size * 0.025))
    d.text((pos[0], pos[1] + off), text, font=f, fill=dark + (255,))
    d.text(pos, text, font=f, fill=color + (255,))
    if dots:  # Zählpunkte in einer hellen Schale, damit z. B. die 1 nicht wie „!“ aussieht
        per_row = 5
        r = size * 0.042
        gap = r * 2.7
        rows = [min(per_row, dots - i) for i in range(0, dots, per_row)]
        ys = [size * 0.84] if len(rows) == 1 else [size * 0.78, size * 0.90]
        tray_w = (max(rows) - 1) * gap + 2 * r + size * 0.08
        top, bottom = ys[0] - r - size * 0.04, ys[-1] + r + size * 0.04
        d.rounded_rectangle([cx - tray_w / 2, top, cx + tray_w / 2, bottom], radius=size * 0.06,
                            fill=color + (46,))
        for row, y in zip(rows, ys):
            x = cx - (row - 1) * gap / 2
            for _ in range(row):
                d.ellipse([x - r, y - r, x + r, y + r], fill=color + (255,))
                x += gap
    return im


engine.ICON_RENDERERS["n-"] = number_icon


def n(num):
    return "n-" + f"{num:,}".replace(",", ".")


# --------------------------------------------------------------------------------------
# Inhalte  (stress=None: betonte Silbe aus der Lautschrift der Stimme; -1: keine Markierung –
#           bei zusammengesetzten Zahlen behält jedes Wort seine eigene Betonung; „_“ = neues Wort)
# --------------------------------------------------------------------------------------
N = Noun
ONES = [("eins", "bir", ["bir"], "bir heißt auch: ein, eine"),
        ("zwei", "iki", ["i", "ki"], ""),
        ("drei", "üç", ["ütsch"], "ç = „tsch“"),
        ("vier", "dört", ["dört"], "ö wie im Deutschen"),
        ("fünf", "beş", ["besch"], "ş = „sch“"),
        ("sechs", "altı", ["al", "tı"], "ı = dumpfes i"),
        ("sieben", "yedi", ["je", "di"], "y = „j“"),
        ("acht", "sekiz", ["se", "kis"], "Betonung vorne: SE-kiz  ·  z = weiches s"),
        ("neun", "dokuz", ["do", "kus"], "Betonung vorne: DO-kuz  ·  z = weiches s")]
TEENS_DE = ["elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"]

CH1 = [N("null", "sıfır", n(0), ["sı", "fır"], None, "ı = dumpfes i")]
CH1 += [N(de, tr, n(i), syl, None, note) for i, (de, tr, syl, note) in enumerate(ONES, 1)]
CH1 += [N("zehn", "on", n(10), ["on"], None, "kurz und klar: on")]
CH2 = [N(de, "on " + tr, n(10 + i), ["on"] + ["_" + syl[0]] + syl[1:], -1, f"10 + {i}: on + {tr}")
       for i, (de, (_, tr, syl, _)) in enumerate(zip(TEENS_DE, ONES), 1)]
CH2 += [N("zwanzig", "yirmi", n(20), ["jir", "mi"], None, "y = „j“")]
CH3 = [N("dreißig", "otuz", n(30), ["o", "tus"], None, "Betonung vorne: O-tuz"),
       N("vierzig", "kırk", n(40), ["kırk"], None, "ı = dumpfes i"),
       N("fünfzig", "elli", n(50), ["el", "li"], None, "doppeltes l deutlich sprechen"),
       N("sechzig", "altmış", n(60), ["alt", "mısch"], None, "altı (6) → altmış (60)"),
       N("siebzig", "yetmiş", n(70), ["jet", "misch"], None, "yedi (7) → yetmiş (70)"),
       N("achtzig", "seksen", n(80), ["sek", "sen"], None, "sekiz (8) → seksen (80)"),
       N("neunzig", "doksan", n(90), ["dok", "san"], None, "dokuz (9) → doksan (90)"),
       N("hundert", "yüz", n(100), ["jüs"], None, "nur yüz, ohne „bir“  ·  yüz heißt auch: Gesicht"),
       N("tausend", "bin", n(1000), ["bin"], None, "nur bin, ohne „bir“")]
CHAPTERS = [Chapter("Sıfırdan ona", "0 bis 10", n(3), CH1),
            Chapter("On birden yirmiye", "11 bis 20", n(15), CH2),
            Chapter("Onluklar, yüz ve bin", "Zehner, hundert & tausend", n(100), CH3)]
ALL = [x for ch in CHAPTERS for x in ch.items]
BY_TR = {x.tr: x for x in ALL}

TENS_ONES = [(21, "yirmi", "bir", "einundzwanzig"), (25, "yirmi", "beş", "fünfundzwanzig"),
             (34, "otuz", "dört", "vierunddreißig"), (47, "kırk", "yedi", "siebenundvierzig"),
             (58, "elli", "sekiz", "achtundfünfzig"), (99, "doksan", "dokuz", "neunundneunzig")]
BIG = [(100, "", "yüz", "hundert", "nicht: bir yüz"), (300, "üç", "yüz", "dreihundert", "3 × 100"),
       (1000, "", "bin", "tausend", "nicht: bir bin"), (5000, "beş", "bin", "fünftausend", "5 × 1.000"),
       (10000, "on", "bin", "zehntausend", "10 × 1.000"), (1000000, "bir", "milyon", "eine Million", "hier mit bir!")]
BUILD = [(365, ["üç yüz", "altmış", "beş"], ["300", "60", "5"], "dreihundertfünfundsechzig"),
         (999, ["dokuz yüz", "doksan", "dokuz"], ["900", "90", "9"], "neunhundertneunundneunzig"),
         (1453, ["bin", "dört yüz", "elli", "üç"], ["1.000", "400", "50", "3"], "vierzehnhundertdreiundfünfzig"),
         (2026, ["iki bin", "yirmi", "altı"], ["2.000", "20", "6"], "zweitausendsechsundzwanzig")]
DAILY = [("Kaç yaşındasın?", "Wie alt bist du?", "1f382"),
         ("Yirmi beş yaşındayım.", "Ich bin 25 Jahre alt.", "1f9d1"),
         ("Bu kaç lira?", "Wie viel Lira kostet das?", "1f3f7"),
         ("Elli lira.", "Fünfzig Lira.", "1fa99")]
QUIZ_EXTRA = {  # Quiz-Zahlen, die nach den Regeln gebaut werden
    "yirmi beş": N("fünfundzwanzig", "yirmi beş", n(25), ["jir", "mi", "_besch"], -1, "20 + 5"),
    "kırk yedi": N("siebenundvierzig", "kırk yedi", n(47), ["kırk", "_je", "di"], -1, "40 + 7"),
    "üç yüz": N("dreihundert", "üç yüz", n(300), ["ütsch", "_jüs"], -1, "3 × 100"),
}
QUIZ = ["üç", "yedi", "dokuz", "on iki", "on altı", "yirmi", "kırk", "yetmiş", "yüz", "yirmi beş", "kırk yedi", "üç yüz"]
FLOATERS = [n(1), n(2), n(3), n(7), n(10), n(20), n(100), n(1000)]
ICONS = ["1f4cc"]
BLOCK_COLORS = [TEAL, RED, GOLD, BLUE]


# --------------------------------------------------------------------------------------
# Bonus-Szenen (RowsScene aus lernvideo/nouns.py)
# --------------------------------------------------------------------------------------
def tens_scene(ctx):
    rows = [dict(left=[(str(num), "ExtraBold", 58, INK)], icon=None,
                 right=[(tens, "Bold", 52, TEAL), (" " + one, "Bold", 52, RED),
                        (f"     {num // 10 * 10} + {num % 10}", "SemiBold", 36, MUTED)],
                 say=[("tr", f"{tens} {one}."), ("de", de + ".")])
            for num, tens, one, de in TENS_ONES]
    return RowsScene(
        ctx, "Bonus 1: Zehner + Einer", "Zehner + Einer",
        "Bonus eins: die Zahlen zwischen den Zehnern. Achtung: Auf Türkisch kommt zuerst der Zehner und dann "
        "der Einer. Also genau andersrum als im Deutschen!",
        rows, end="Also nicht fünf und zwanzig, sondern zwanzig fünf. Wie beim Lesen von links nach rechts.",
        note=[("Deutsch:", "Bold", 34, MUTED), (" fünf-und-zwanzig (5 + 20)", "SemiBold", 34, INK),
              ("     Türkisch:", "Bold", 34, MUTED), (" yirmi beş (20 + 5)", "ExtraBold", 34, RED)],
        y0=245, dy=114, note_y=965, gap=60)


def big_scene(ctx):
    rows = []
    for num, mult, unit, de, hint in BIG:
        segs = ([(mult + " ", "Bold", 52, TEAL)] if mult else []) + [(unit, "Bold", 52, RED),
                                                                     (f"     {hint}", "SemiBold", 34, MUTED)]
        tr = f"{mult} {unit}".strip()
        rows.append(dict(left=[(f"{num:,}".replace(",", "."), "ExtraBold", 54, INK)], icon=None, right=segs,
                         say=[("tr", tr + "."), ("de", de + ".")]))
    return RowsScene(
        ctx, "Bonus 2: Hunderter und Tausender", "Hundert & tausend",
        "Bonus zwei: Hunderter und Tausender. Die Zahl davor sagt, wie oft. Aber Achtung: "
        "Bei hundert und tausend sagst du nicht eins davor.",
        rows, end="Erst bei einer Million sagst du wieder eins davor.",
        note=[("yüz", "ExtraBold", 36, RED), (" = 100  ·  ", "SemiBold", 34, INK), ("bin", "ExtraBold", 36, RED),
              (" = 1.000  ·  ohne „bir“ davor  ·  ", "SemiBold", 34, INK), ("bir milyon", "ExtraBold", 36, TEAL),
              (" = 1.000.000", "SemiBold", 34, INK)],
        y0=245, dy=114, note_y=965, gap=60)


def build_scene(ctx):
    rows = []
    for num, parts, values, de in BUILD:
        segs = []
        for i, p in enumerate(parts):
            segs.append((("" if i == 0 else " ") + p, "Bold", 48, BLOCK_COLORS[i % len(BLOCK_COLORS)]))
        segs.append((f"     {' + '.join(values)}", "SemiBold", 32, MUTED))
        tr = " ".join(parts)
        label = str(num) if num in (1453, 2026) else f"{num:,}".replace(",", ".")  # Jahreszahlen ohne Punkt
        rows.append(dict(left=[(label, "ExtraBold", 58, INK)], icon=None, right=segs,
                         say=[("de", de + "."), ("tr", tr + "."), ("tr_slow", tr + ".")]))
    return RowsScene(
        ctx, "Bonus 3: Große Zahlen bauen", "Große Zahlen bauen",
        "Bonus drei: Große Zahlen baust du wie mit Bausteinen, von groß nach klein: erst tausend, dann hundert, "
        "dann die Zehner und zum Schluss die Einer.",
        rows, end="Jahreszahlen sagst du auf Türkisch ganz normal, also nicht vierzehnhundert, "
                  "sondern tausend vierhundert.",
        note=[("Jahreszahlen:", "ExtraBold", 34, RED),
              (" 1453 = bin dört yüz elli üç  (tausend vierhundert …)", "SemiBold", 34, INK)],
        y0=290, dy=150, note_y=900, gap=60)


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL + list(QUIZ_EXTRA.values()))
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Sayılar", "Zahlen auf Türkisch",
        [("sa · yı · ", "Bold", 46, MUTED), ("lar", "Bold", 46, RED), ("   =   die Zahlen", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du die Zahlen auf Türkisch: von null bis zwanzig, die Zehner, hundert und tausend. "
                "Und danach, wie du jede große Zahl bauen kannst.", "welcome"),
         ("de", "Zahlen heißt auf Türkisch:", "word"), ("tr", "Sayılar.", "sayilar"), ("tr_slow", "Sayılar.", "sayilar2")],
        title_mark="sayilar")
    scenes = [title, HowToScene(ctx, BY_TR["iki"])]
    idx = 0
    for k, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, k, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        tens_scene(ctx),
        big_scene(ctx),
        build_scene(ctx),
        PhraseGridScene(ctx, "Bonus 4: Zahlen im Alltag", "Bonus vier: Zahlen im Alltag, beim Alter und beim Einkaufen.",
                        DAILY, chapter="Zahlen im Alltag",
                        note=[("kaç?", "ExtraBold", 36, RED), (" = wie viel(e)?  ·  ", "Medium", 32, MUTED),
                              ("yaş", "Bold", 36, TEAL), (" = Alter  ·  nach Zahlen keine Mehrzahl: ", "Medium", 32, MUTED),
                              ("iki elma", "Bold", 36, TEAL), (" = zwei Äpfel", "Medium", 32, MUTED)]),
        QuizIntroScene(ctx),
    ]
    quiz_items = {**BY_TR, **QUIZ_EXTRA}
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, quiz_items[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 30 Zahlwörter auf einen Blick",
                      "Hier sind alle dreißig Zahlwörter auf einen Blick.", cols=6),
        OutroScene(ctx, "Aferin sana!", "Gut gemacht!", "Jetzt kannst du auf Türkisch zählen!",
                   ["Super gemacht! Jetzt kannst du auf Türkisch bis tausend zählen und noch weiter.",
                    "Tipp: Lies Preise, Hausnummern und Uhrzeiten im Alltag einfach auf Türkisch."],
                   icon="1f522"),
    ]
    return scenes


def emoji_codes():
    return ({x.emoji for x in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in DAILY} | {"1f522"})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="sayilar_zahlen_deutsch_tuerkisch.mp4", title="Sayılar – Zahlen auf Türkisch")
