#!/usr/bin/env python3
"""
Lernvideo „Günler ve Aylar – Wochentage & Monate“: 25 Nomen, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 25 Wortkarten in 3 Kapiteln: die 12 Monate, die 7 Wochentage, 6 Kalender-Wörter
  * Bonus 1: Merkhilfe für die Wochentage (Pazar = Markt, Pazartesi = Tag nach dem Markt …)
  * Bonus 2: Die Monate nach Jahreszeiten (kış, ilkbahar, yaz, sonbahar – Wiederholung aus dem Wetter-Video)
  * Bonus 3: Wann? „am Montag“ = pazartesi günü, „im Januar“ = ocak ayında
  * Bonus 4: Sätze im Alltag (Bugün günlerden ne? · Doğum günün ne zaman? …)
  * Quiz, Übersicht, Abschluss mit „İyi haftalar!“

Die Bilder sind Kalenderblätter, die im Code gezeichnet werden: Monate mit der Farbe der Jahreszeit,
Monatsnummer und Jahreszeiten-Emoji, Wochentage mit Wochenstreifen (Wochenende rot).

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/takvim_wochentage_monate_deutsch_tuerkisch.mp4
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

# --------------------------------------------------------------------------------------
# Kalenderblätter als Bilder
#   c-m-N  Monat N (Kopf in Jahreszeiten-Farbe, große Zahl, Jahreszeiten-Emoji)
#   c-w-N  Wochentag N (1 = Montag; Wochenende rot) mit Wochenstreifen
#   c-week, c-weekend, c-year
# --------------------------------------------------------------------------------------
SEASONS = {  # Monat → (Farbe, Emoji)
    **{m: ((85, 172, 238), "2744") for m in (12, 1, 2)},
    **{m: ((119, 178, 85), "1f337") for m in (3, 4, 5)},
    **{m: ((244, 144, 12), "2600") for m in (6, 7, 8)},
    **{m: ((193, 105, 79), "1f342") for m in (9, 10, 11)},
}
MONTH_SHORT = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"]
DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
WEEK_BLUE, WEEK_RED, PALE = (59, 136, 195), (221, 46, 68), (225, 232, 237)


def _fit_text(d, gfx, text, weight, max_w, max_h, start):
    fs = start
    while fs > 6:
        f = gfx.font(weight, fs)
        x0, y0, x1, y1 = d.textbbox((0, 0), text, font=f)
        if x1 - x0 <= max_w and y1 - y0 <= max_h:
            return f, (x0, y0, x1, y1)
        fs -= 2
    return f, d.textbbox((0, 0), text, font=f)


def _center_text(d, gfx, text, weight, cx, cy, max_w, max_h, color, shadow=None):
    f, (x0, y0, x1, y1) = _fit_text(d, gfx, text, weight, max_w, max_h, int(max_h * 1.6))
    pos = (cx - (x0 + x1) / 2, cy - (y0 + y1) / 2)
    if shadow:
        d.text((pos[0], pos[1] + max(1, max_h * 0.04)), text, font=f, fill=shadow)
    d.text(pos, text, font=f, fill=color)


def _page(size, head):
    """Leeres Kalenderblatt mit farbigem Kopf und zwei Ringen."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size
    r = s * 0.08
    x0, y0, x1, y1 = s * 0.08, s * 0.13, s * 0.92, s * 0.94
    d.rounded_rectangle([x0, y0 + s * 0.025, x1, y1 + s * 0.025], r, fill=(153, 170, 181, 255))
    d.rounded_rectangle([x0, y0, x1, y1], r, fill=(255, 255, 255, 255), outline=(204, 214, 221, 255),
                        width=max(1, int(s * 0.012)))
    d.rounded_rectangle([x0, y0, x1, y0 + s * 0.24], r, fill=head + (255,))
    d.rectangle([x0, y0 + s * 0.24 - r, x1, y0 + s * 0.24], fill=head + (255,))
    for rx in (0.32, 0.68):
        d.rounded_rectangle([s * rx - s * 0.035, s * 0.06, s * rx + s * 0.035, s * 0.2], s * 0.035,
                            fill=(102, 117, 127, 255))
    return im, d


def _strip(d, s, y, highlight, big=False):
    """Wochenstreifen: 7 Kästchen, Wochenende rot; highlight = Menge der hervorgehobenen Tage (0 = Mo)."""
    w = s * 0.095
    gap = s * 0.018
    x = s / 2 - (7 * w + 6 * gap) / 2
    for i in range(7):
        col = WEEK_RED if i >= 5 else WEEK_BLUE
        on = i in highlight
        fill = col if on else tuple(int(c * 0.25 + 255 * 0.75) for c in col)
        h = w * (1.25 if (on and big) else 1.0)
        d.rounded_rectangle([x, y - h / 2, x + w, y + h / 2], s * 0.02, fill=fill + (255,))
        x += w + gap


def calendar_icon(gfx, code, size):
    s = size
    if code.startswith("c-m-"):
        m = int(code[4:])
        head, emo = SEASONS[m]
        im, d = _page(s, head)
        _center_text(d, gfx, MONTH_SHORT[m - 1], "Bold", s / 2, s * 0.255, s * 0.5, s * 0.12, (255, 255, 255, 255))
        _center_text(d, gfx, str(m), "ExtraBold", s * 0.42, s * 0.63, s * 0.46, s * 0.36, (41, 47, 51, 255))
        e = gfx.emoji(emo, int(s * 0.24))
        im.alpha_composite(e, (int(s * 0.64), int(s * 0.62)))
        return im
    if code.startswith("c-w-"):
        n = int(code[4:])
        head = WEEK_RED if n >= 6 else WEEK_BLUE
        im, d = _page(s, head)
        _center_text(d, gfx, DAY_SHORT[n - 1], "ExtraBold", s / 2, s * 0.56, s * 0.6, s * 0.3, head + (255,))
        _strip(d, s, s * 0.82, {n - 1}, big=True)
        return im
    if code in ("c-week", "c-weekend"):
        im, d = _page(s, (42, 157, 143))
        hl = set(range(7)) if code == "c-week" else {5, 6}
        _center_text(d, gfx, "7" if code == "c-week" else "Sa+So", "ExtraBold", s / 2, s * 0.55,
                     s * 0.62, s * 0.26, (41, 47, 51, 255))
        _strip(d, s, s * 0.80, hl, big=code == "c-weekend")
        return im
    if code == "c-year":  # 12 kleine Monatskästchen in Jahreszeiten-Farben
        im, d = _page(s, (116, 78, 170))
        w, gap = s * 0.15, s * 0.03
        for i in range(12):
            r_, c_ = divmod(i, 4)
            x = s / 2 - (4 * w + 3 * gap) / 2 + c_ * (w + gap)
            y = s * 0.43 + r_ * (w * 0.8 + gap)
            d.rounded_rectangle([x, y, x + w, y + w * 0.8], s * 0.02, fill=SEASONS[i + 1][0] + (255,))
        return im
    raise ValueError(code)


engine.ICON_RENDERERS["c-"] = calendar_icon

# --------------------------------------------------------------------------------------
# Inhalte  (stress=None: betonte Silbe aus der Lautschrift der Stimme; „_“ = neues Wort)
# --------------------------------------------------------------------------------------
N = Noun
MONTHS = [("der Januar", "Ocak", ["o", "dschak"], "c = „dsch“  ·  ocak heißt auch: der Herd"),
          ("der Februar", "Şubat", ["schu", "bat"], "ş = „sch“"),
          ("der März", "Mart", ["mart"], "fast wie „März“"),
          ("der April", "Nisan", ["ni", "san"], "Betonung vorne: NI-san"),
          ("der Mai", "Mayıs", ["ma", "jıs"], "ı = dumpfes i"),
          ("der Juni", "Haziran", ["ha", "si", "ran"], "z = weiches s"),
          ("der Juli", "Temmuz", ["tem", "mus"], "Betonung vorne: TEM-muz  ·  mm doppelt"),
          ("der August", "Ağustos", ["aa", "us", "tos"], "fast wie „August“  ·  ğ ist stumm"),
          ("der September", "Eylül", ["ej", "lül"], "ey wie „ej“  ·  ü wie im Deutschen"),
          ("der Oktober", "Ekim", ["e", "kim"], "Betonung vorne: E-kim"),
          ("der November", "Kasım", ["ka", "sım"], "Betonung vorne: KA-sım"),
          ("der Dezember", "Aralık", ["a", "ra", "lık"], "aralık heißt auch: die Lücke, der Abstand")]
DAYS = [("der Montag", "Pazartesi", ["pa", "sar", "te", "si"], "Pazar + ertesi = Tag nach Sonntag"),
        ("der Dienstag", "Salı", ["sa", "lı"], "ı = dumpfes i"),
        ("der Mittwoch", "Çarşamba", ["tschar", "scham", "ba"], "ç = „tsch“  ·  ş = „sch“"),
        ("der Donnerstag", "Perşembe", ["per", "schem", "be"], "ş = „sch“"),
        ("der Freitag", "Cuma", ["dschu", "ma"], "c = „dsch“  ·  Betonung vorne: DSCHU-ma"),
        ("der Samstag", "Cumartesi", ["dschu", "mar", "te", "si"], "Cuma + ertesi = Tag nach Freitag"),
        ("der Sonntag", "Pazar", ["pa", "sar"], "pazar heißt auch: der Markt")]
TR_SAY = {"Ekim": "[[ˈekimm]]",  # das m am Ende klang einzeln wie n („ekin“)
          "Perşembe": "[[peɾɾʃembˈe]]"}  # sonst spricht die Stimme „taşambe“
CH1 = [N(de, tr, f"c-m-{i}", syl, None, note, tr_say=TR_SAY.get(tr, ""))
       for i, (de, tr, syl, note) in enumerate(MONTHS, 1)]
CH2 = [N(de, tr, f"c-w-{i}", syl, None, note, tr_say=TR_SAY.get(tr, ""))
       for i, (de, tr, syl, note) in enumerate(DAYS, 1)]
CH3 = [N("der Tag", "gün", "1f305", ["gün"], None, "günaydın = Guten Morgen"),
       N("die Woche", "hafta", "c-week", ["haf", "ta"], None, "h deutlich hauchen"),
       N("der Monat", "ay", "1f5d3+1f319", ["ai"], None, "ay heißt auch: der Mond"),
       N("das Jahr", "yıl", "c-year", ["jıl"], None, "auch: sene"),
       N("das Wochenende", "hafta sonu", "c-weekend", ["haf", "ta", "_so", "nu"], None, "wörtlich: Wochen-Ende"),
       N("der Kalender", "takvim", "1f4c6", ["tak", "wim"], None, "Betonung vorne: TAK-vim")]
CHAPTERS = [Chapter("Aylar", "Die Monate", "1f5d3", CH1),
            Chapter("Haftanın günleri", "Die Wochentage", "c-week", CH2),
            Chapter("Takvim kelimeleri", "Kalender-Wörter", "1f4c6", CH3)]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

STORY = [  # Merkhilfe Wochentage: (Wort, rote Endung, Bild, Deutsch, Hinweis, gesprochene Erklärung)
    ("Pazar", "", "c-w-7", "Sonntag", "pazar = Markt", "Sonntag, der Markttag."),
    ("Pazar", "tesi", "c-w-1", "Montag", "Pazar + ertesi = danach", "Montag: der Tag nach dem Markttag."),
    ("Cuma", "", "c-w-5", "Freitag", "cuma = Versammlung", "Freitag, der Tag der Versammlung."),
    ("Cuma", "rtesi", "c-w-6", "Samstag", "Cuma + ertesi = danach", "Samstag: der Tag nach Freitag."),
    ("Çar", "şamba", "c-w-3", "Mittwoch", "çar = 4 (persisch)", "Mittwoch: Der Anfang kommt vom persischen Wort für vier."),
    ("Per", "şembe", "c-w-4", "Donnerstag", "penç = 5 (persisch)", "Donnerstag: Der Anfang kommt vom persischen Wort für fünf."),
]
SEASON_ROWS = [("kış", "Winter", "2744", (85, 172, 238), ["Aralık", "Ocak", "Şubat"]),
               ("ilkbahar", "Frühling", "1f337", (92, 145, 59), ["Mart", "Nisan", "Mayıs"]),
               ("yaz", "Sommer", "2600", (214, 120, 0), ["Haziran", "Temmuz", "Ağustos"]),
               ("sonbahar", "Herbst", "1f342", (193, 105, 79), ["Eylül", "Ekim", "Kasım"])]
WHEN = [("pazartesi", " günü", "am Montag", "c-w-1"),
        ("cuma", " günü", "am Freitag", "c-w-5"),
        ("hafta", " sonunda", "am Wochenende", "c-weekend"),
        ("ocak", " ayında", "im Januar", "c-m-1"),
        ("ağustos", " ayında", "im August", "c-m-8")]
DAILY = [("Bugün günlerden ne?", "Welcher Tag ist heute?", "1f4c6"),
         ("Bugün salı.", "Heute ist Dienstag.", "c-w-2"),
         ("Yarın çarşamba.", "Morgen ist Mittwoch.", "c-w-3"),
         ("Doğum günün ne zaman?", "Wann hast du Geburtstag?", "1f382")]
def say_word(tr):
    """Wie das Wort auf der Wortkarte gesprochen wird (mit korrigierter Lautschrift, falls vorhanden)."""
    n = BY_TR[tr]
    return n.tr_say[:-2] + ".]]" if n.tr_say.startswith("[[") else (n.tr_say or n.tr) + "."


QUIZ = ["Pazartesi", "Cuma", "Pazar", "Çarşamba", "Ocak", "Mart", "Mayıs", "Ağustos", "Ekim", "Aralık", "hafta", "yıl"]
FLOATERS = ["c-m-1", "c-w-1", "c-m-7", "c-w-6", "1f4c6", "1f319", "2600", "2744"]
ICONS = ["1f4cc"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen (RowsScene aus lernvideo/nouns.py)
# --------------------------------------------------------------------------------------
def story_scene(ctx):
    def segs(a, b):  # rot = der Teil, den die Merkhilfe erklärt (bei Çar-/Per- der Anfang)
        if a in ("Çar", "Per"):
            return [(a, "ExtraBold", 52, RED), (b, "Bold", 52, INK)]
        return [(a, "Bold", 52, INK)] + ([(b, "ExtraBold", 52, RED)] if b else [])

    rows = [dict(left=segs(a, b), icon=emo,
                 right=[(de, "Bold", 44, INK), (f"    {hint}", "SemiBold", 32, MUTED)],
                 say=[("tr", say_word(a + b), a + b + "."), ("de", spoken)])
            for a, b, emo, de, hint, spoken in STORY]
    return RowsScene(
        ctx, "Bonus 1: Merkhilfe Wochentage", "Merkhilfe Wochentage",
        "Bonus eins: eine Merkhilfe für die Wochentage. Viele Namen erzählen eine kleine Geschichte.",
        rows, note=[("ertesi", "ExtraBold", 36, RED), (" = der Tag danach   ·   ", "Medium", 32, MUTED),
                    ("Dienstag (Salı)", "Bold", 34, TEAL), (" musst du einfach lernen", "Medium", 32, MUTED)],
        y0=245, dy=114, note_y=965, gap=50)


def season_scene(ctx):
    rows = [dict(left=[(tr, "ExtraBold", 52, col), (f"  {de}", "Medium", 32, MUTED)], icon=emo,
                 right=[("  ·  ".join(months), "Bold", 46, INK)],
                 say=[("tr", tr + "."), ("de", de + "."), ("tr", ", ".join(months) + ".")])
            for tr, de, emo, col, months in SEASON_ROWS]
    return RowsScene(
        ctx, "Bonus 2: Die Monate nach Jahreszeiten", "Jahreszeiten",
        "Bonus zwei: die Monate nach Jahreszeiten. Die Jahreszeiten kennst du schon aus dem Wetter-Video.",
        rows, note=[("mevsim", "ExtraBold", 36, RED), (" = die Jahreszeit   ·   ", "Medium", 32, MUTED),
                    ("mevsimler", "ExtraBold", 36, RED), (" = die Jahreszeiten", "Medium", 32, MUTED)],
        y0=290, dy=145, note_y=900, gap=50)


def when_scene(ctx):
    rows = [dict(left=[(a, "Bold", 52, INK), (b, "ExtraBold", 52, RED)], icon=emo,
                 right=[(f"= {de}", "SemiBold", 44, INK)],
                 say=[("tr", a + b + "."), ("de", de + ".")])
            for a, b, de, emo in WHEN]
    return RowsScene(
        ctx, "Bonus 3: Wann? Am Montag, im Januar", "Am Montag, im Januar",
        "Bonus drei: Wann? So sagst du am Montag oder im Januar.",
        rows, end="Beim Tag hängst du das Wort für Tag an, beim Monat das Wort für Monat.",
        note=[("günü", "ExtraBold", 36, RED), (" = am … (Tag)   ·   ", "Medium", 32, MUTED),
              ("ayında", "ExtraBold", 36, RED), (" = im … (Monat)", "Medium", 32, MUTED)],
        y0=265, dy=125, note_y=915, gap=50)


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Günler ve Aylar", "Wochentage & Monate auf Türkisch",
        [("gün", "Bold", 46, RED), (" = der Tag   ·   ", "Medium", 46, MUTED), ("ay", "Bold", 46, RED),
         (" = der Monat", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du die zwölf Monate, die sieben Wochentage und wichtige Wörter für den Kalender.",
          "welcome"),
         ("de", "Tage und Monate heißt auf Türkisch:", "word"), ("tr", "Günler ve aylar.", "gunler"),
         ("tr_slow", "Günler ve aylar.", "gunler2")],
        title_mark="gunler")
    scenes = [title, HowToScene(ctx, BY_TR["Şubat"])]
    idx = 0
    for k, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, k, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        story_scene(ctx),
        season_scene(ctx),
        when_scene(ctx),
        PhraseGridScene(ctx, "Bonus 4: Im Alltag", "Bonus vier: vier Sätze für den Alltag.",
                        DAILY, chapter="Sätze im Alltag",
                        note=[("bugün", "ExtraBold", 36, RED), (" = heute  ·  ", "Medium", 32, MUTED),
                              ("yarın", "Bold", 36, TEAL), (" = morgen  ·  ", "Medium", 32, MUTED),
                              ("dün", "Bold", 36, TEAL), (" = gestern  ·  ", "Medium", 32, MUTED),
                              ("doğum günü", "Bold", 36, TEAL), (" = Geburtstag", "Medium", 32, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 25 Wörter auf einen Blick",
                      "Hier sind alle fünfundzwanzig Wörter auf einen Blick.", cols=7),
        OutroScene(ctx, "İyi haftalar!", "Schöne Woche!", "Jetzt kennst du alle Monate und Wochentage auf Türkisch!",
                   ["Super gemacht! Jetzt kennst du alle Monate und Wochentage auf Türkisch.",
                    "Tipp: Sag jeden Morgen auf Türkisch, welcher Tag heute ist."],
                   icon="1f4c6"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for _, e in SEASONS.values()} | {r[2] for r in SEASON_ROWS} | {e for *_, e in DAILY} | {"1f382"})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="takvim_wochentage_monate_deutsch_tuerkisch.mp4", title="Günler ve Aylar – Wochentage & Monate")
