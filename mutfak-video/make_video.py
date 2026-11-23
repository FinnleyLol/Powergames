#!/usr/bin/env python3
"""
Lernvideo „Mutfak – Küchensachen“: 35 Nomen, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 35 Wortkarten in 6 Kapiteln (Kochen, Vorbereiten & Backen, Am Tisch, Tee & Kaffee,
    Küchengeräte, Spülen)
  * Bonus 1: die Endung -lık/-lik/-luk/-lük („Ding für …“): tuz → tuzluk, göz → gözlük …
  * Bonus 2: Vom Verb zum Küchending: kesmek → kesme tahtası, soymak → soyacak …
  * Bonus 3: Sätze am Esstisch (Ellerine sağlık! · Tuzu uzatır mısın? …)
  * Quiz, Übersicht, Abschluss

Für Küchensachen ohne Emoji (Topf, Deckel, Sieb, Reibe, Wasserkocher …) liegen eigene
Zeichnungen in icons/.

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/mutfak_kueche_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 20  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.nouns import *  # noqa: E402,F401,F403  (Engine + Bausteine für Wortkarten-Videos)
from lernvideo import engine  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
engine.EXTRA_ICON_DIRS.append(os.path.join(HERE, "icons"))
GOLD = (190, 105, 0)

# --------------------------------------------------------------------------------------
# Inhalte  (stress=None: betonte Silbe aus der Lautschrift der Stimme; -1: keine Markierung,
#           weil die Betonung bei Lehnwörtern wie kupa, mikser, evye schwankt; „_“ = neues Wort)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Pişirmek", "Kochen", "x-pot", [
        N("der Topf", "tencere", "x-pot", ["ten", "dsche", "re"], None, "c = „dsch“"),
        N("der Deckel", "kapak", "x-lid", ["ka", "pak"], None, "kapamak = zumachen"),
        N("die Pfanne", "tava", "1f373", ["ta", "wa"], None, "v ≈ w"),
        N("der Pfannenwender", "spatula", "x-spatula", ["spa", "tu", "la"], -1, "fast wie „Spatel“"),
        N("das Sieb", "süzgeç", "x-colander", ["süs", "getsch"], None, "süzmek = abgießen  ·  ç = „tsch“"),
        N("das Schneidebrett", "kesme tahtası", "x-cuttingboard", ["kes", "me", "_tah", "ta", "sı"], None,
          "kesmek = schneiden  ·  tahta = Brett"),
        N("die Waage", "terazi", "x-scale", ["te", "ra", "si"], None, "z = weiches s  ·  tartmak = wiegen"),
    ]),
    Chapter("Hazırlık ve fırın", "Vorbereiten & Backen", "x-rollingpin", [
        N("der Schäler", "soyacak", "x-peeler", ["so", "ja", "dschak"], None, "soymak = schälen  ·  c = „dsch“"),
        N("die Reibe", "rende", "x-grater", ["ren", "de"], None, "rendelemek = reiben"),
        N("das Nudelholz", "oklava", "x-rollingpin", ["ok", "la", "wa"], None, "das türkische ist lang und dünn"),
        N("das Backblech", "fırın tepsisi", "x-bakingtray", ["fı", "rın", "_tep", "si", "si"], None,
          "fırın = Backofen  ·  tepsi = Tablett"),
        N("das Backpapier", "yağlı kağıt", "x-bakingpaper", ["jaa", "lı", "_kaa", "ıt"], None,
          "wörtlich: Fett-Papier  ·  ğ ist stumm"),
    ]),
    Chapter("Sofrada", "Am Tisch", "1f37d", [
        N("das Geschirr", "yemek takımı", "x-plate&1f963&2615", ["je", "mek", "_ta", "kı", "mı"], None,
          "wörtlich: Essens-Set  ·  schmutziges Geschirr: bulaşık"),
        N("der Teller", "tabak", "x-plate", ["ta", "bak"], None),
        N("die Schüssel", "kase", "1f963", ["ka", "se"], None, "auch: die Schale"),
        N("der Löffel", "kaşık", "1f944", ["ka", "schık"], None, "ş = „sch“  ·  ı = dumpfes i"),
        N("die Gabel", "çatal", "x-fork", ["tscha", "tal"], None, "ç = „tsch“"),
        N("das Messer", "bıçak", "1f52a", ["bı", "tschak"], None, "ı = dumpfes i  ·  ç = „tsch“"),
        N("das Besteck", "çatal bıçak", "1f374", ["tscha", "tal", "_bı", "tschak"], None, "wörtlich: Gabel Messer"),
        N("der Salzstreuer", "tuzluk", "1f9c2", ["tus", "luk"], None, "tuz = Salz"),
        N("der Pfefferstreuer", "biberlik", "x-peppershaker", ["bi", "ber", "lik"], None, "biber = Pfeffer, auch: Paprika"),
    ]),
    Chapter("Çay ve kahve", "Tee & Kaffee", "2615", [
        N("das Glas", "bardak", "x-glass", ["bar", "dak"], None, "çay bardağı = das Teeglas"),
        N("die Tasse", "fincan", "2615", ["fin", "dschan"], None, "c = „dsch“  ·  kahve fincanı = Kaffeetasse"),
        N("der Becher", "kupa", "x-mug", ["ku", "pa"], -1, "kupa heißt auch: der Pokal"),
        N("die Teekanne", "çaydanlık", "x-caydanlik", ["tschai", "dan", "lık"], None,
          "unten kocht das Wasser, oben zieht der Tee"),
        N("das Mokkakännchen", "cezve", "x-cezve", ["dsches", "we"], None, "für türkischen Kaffee (Türk kahvesi)"),
    ]),
    Chapter("Mutfak aletleri", "Küchengeräte", "x-microwave", [
        N("der Toaster", "ekmek kızartma makinesi", "x-toaster",
          ["ek", "mek", "_kı", "sart", "ma", "_ma", "ki", "ne", "si"], None, "wörtlich: Brot-Röst-Maschine"),
        N("der Mixer", "mikser", "x-mixer", ["mik", "ser"], -1, "der Standmixer heißt: blender"),
        N("die Mikrowelle", "mikrodalga", "x-microwave", ["mik", "ro", "dal", "ga"], -1, "dalga = die Welle"),
        N("die Kaffeemaschine", "kahve makinesi", "x-coffeemachine", ["kah", "we", "_ma", "ki", "ne", "si"], None,
          "kahve = Kaffee  ·  h deutlich hauchen"),
        N("der Wasserkocher", "su ısıtıcısı", "x-kettle", ["su", "_ı", "sı", "tı", "dschı", "sı"], None,
          "su = Wasser  ·  ısıtmak = erwärmen"),
    ]),
    Chapter("Bulaşık", "Spülen", "1f9fd", [
        N("die Spüle", "evye", "x-sink", ["ew", "je"], -1, "lavabo = das Waschbecken"),
        N("der Wasserhahn", "musluk", "x-faucet", ["mus", "luk"], None),
        N("der Schwamm", "sünger", "1f9fd", ["sün", "ger"], None, "ü wie im Deutschen"),
        N("das Geschirrtuch", "kurulama bezi", "x-teatowel", ["ku", "ru", "la", "ma", "_be", "si"], None,
          "kurulamak = abtrocknen  ·  bez = Tuch"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

SUFFIX = [  # Wort + Endung = Ding dafür (Vokalharmonie: ı, i, u, ü)
    ("tuz", "luk", "Salz", "der Salzstreuer", "1f9c2"),
    ("biber", "lik", "Pfeffer", "der Pfefferstreuer", "x-peppershaker"),
    ("göz", "lük", "Auge", "die Brille", "1f453"),
    ("kitap", "lık", "Buch", "das Bücherregal", "1f4da"),
]
VERBS = [  # Verb → Küchending
    ("kesmek", "schneiden", "kesme tahtası", "das Schneidebrett", "x-cuttingboard"),
    ("soymak", "schälen", "soyacak", "der Schäler", "x-peeler"),
    ("süzmek", "abgießen", "süzgeç", "das Sieb", "x-colander"),
    ("ısıtmak", "erwärmen", "su ısıtıcısı", "der Wasserkocher", "x-kettle"),
    ("kurulamak", "abtrocknen", "kurulama bezi", "das Geschirrtuch", "x-teatowel"),
    ("kızartmak", "rösten", "ekmek kızartma makinesi", "der Toaster", "x-toaster"),
]
TABLE = [("Ellerine sağlık!", "Danke fürs Kochen!", "1f9d1-200d-1f373"),
         ("Tuzu uzatır mısın?", "Reichst du mir das Salz?", "1f9c2"),
         ("Bir kaşık alabilir miyim?", "Kann ich einen Löffel haben?", "1f944"),
         ("Bulaşıkları ben yıkarım.", "Ich spüle das Geschirr.", "1f9fd")]
QUIZ = ["tencere", "tava", "kaşık", "çatal", "bıçak", "tabak", "bardak", "fincan", "süzgeç", "rende", "sünger", "musluk"]
FLOATERS = ["x-pot", "1f373", "1f944", "x-fork", "2615", "x-caydanlik", "x-cezve", "1f9c2"]
ICONS = ["1f4cc"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen
# --------------------------------------------------------------------------------------
class RowsScene(Scene):
    """Bonus-Tafel: Zeilen aus linker Box (alle gleich breit) und rechtem Teil, Zeile für Zeile gesprochen.
    rows: dict(left=segs, icon=emoji, right=segs, right_icon=emoji|None, say=[("tr"|"de", text), …])"""

    def __init__(self, ctx, heading, chapter, intro, rows, note=None, end=None,
                 y0=260, dy=130, note_y=None, arrow=False, gap=40, h=100):
        super().__init__(ctx)
        g = self.g
        self.heading_text, self.chapter = heading, chapter
        self.wait(0.3)
        self.say(ctx.DE(intro), "intro")
        self.wait(0.4)
        for i, r in enumerate(rows):
            st = self.t
            for k, (lang, text) in enumerate(r["say"]):
                self.say(ctx.TR(text) if lang == "tr" else ctx.DE(text))
                self.wait(0.25 if k < len(r["say"]) - 1 else 0.55)
            self.marks[f"row{i}"] = (st, self.t)
        self.has_end = bool(end)
        if end:
            self.say(ctx.DE(end), "end")
        self.finish(1.2)
        self.pill = ctx.pill
        bw = max(pill(g, r["left"], h=h, icon=r["icon"]).width - 2 * pill(g, r["left"], h=h, icon=r["icon"]).pad
                 for r in rows)
        self.lefts = [pill(g, r["left"], h=h, icon=r["icon"], minw=bw) for r in rows]
        self.rights = []
        for r in rows:
            if r.get("right_icon"):
                im = pill(g, r["right"], h=92, icon=r["right_icon"])
                self.rights.append((im, im.width - 2 * im.pad, im.pad))
            else:
                im = text_layer(g, r["right"])
                self.rights.append((im, im.width - 24, 12))
        rw = max(w for _, w, _ in self.rights)
        self.gap = gap
        self.x0 = (W - (bw + gap + rw)) / 2
        self.bw = bw
        self.arrow = text_layer(g, [(ARROW, "Bold", 48, MUTED)]) if arrow else None
        self.y0, self.dy = y0, dy
        self.note = pill(g, note, h=78, fill=NOTE_BG, icon="1f4cc") if note else None
        self.note_y = note_y or (y0 + len(rows) * dy + 20)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, self.heading_text, y=105, size=58)
        for i, im in enumerate(self.lefts):
            st = self.m(f"row{i}")[0]
            if t < st:
                continue
            op, dy = appear(t, st)
            y = self.y0 + i * self.dy + dy
            put_center(f, im, self.x0 + self.bw / 2, y, opacity=op, scale=1.03 if self.active(t, f"row{i}") else 1.0)
            if self.arrow is not None:
                put_center(f, self.arrow, self.x0 + self.bw + self.gap / 2, y, opacity=op)
            rim, rw, pad = self.rights[i]
            put_center(f, rim, self.x0 + self.bw + self.gap + rw / 2, y, opacity=op)
        if self.note is not None:
            st = self.m("end")[0] if self.has_end else self.m("row0")[0]
            if t >= st:
                put_center(f, self.note, W / 2, self.note_y, opacity=clamp((t - st) / 0.3))
        for k in ("intro", "end"):
            if k in self.marks and self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        return f


def suffix_scene(ctx):
    rows = [dict(left=[(stem, "Bold", 62, INK), (suf, "ExtraBold", 62, RED)], icon=emo,
                 right=[(de_stem, "SemiBold", 44, MUTED), (f"  {ARROW}  ", "SemiBold", 44, MUTED), (de, "SemiBold", 48, INK)],
                 say=[("tr", stem + "."), ("de", de_stem + "."), ("tr", stem + suf + "."), ("de", de + ".")])
            for stem, suf, de_stem, de, emo in SUFFIX]
    return RowsScene(
        ctx, "Bonus 1: Die Endung -lık", "-lık: Ding für …",
        "Bonus eins: Hast du es gemerkt? Mit einer kleinen Endung wird aus einem Wort ein Ding dafür.",
        rows, end="Die Endung passt sich immer dem letzten Vokal des Wortes an.",
        note=[("Vokal-Regel:", "ExtraBold", 34, RED),
              (f"   a ı {ARROW} lık   ·   e i {ARROW} lik   ·   o u {ARROW} luk   ·   ö ü {ARROW} lük", "SemiBold", 34, INK)],
        y0=285, dy=150, note_y=890, h=116)


def verb_scene(ctx):
    rows = [dict(left=[(verb, "ExtraBold", 46, RED), (f"  = {de_verb}", "Medium", 30, MUTED)], icon=None,
                 right=[(noun, "Bold", 42, INK), (f"   {de}", "Medium", 27, MUTED)], right_icon=emo,
                 say=[("tr", verb + "."), ("de", de_verb + "."), ("tr", noun + ".")])
            for verb, de_verb, noun, de, emo in VERBS]
    return RowsScene(
        ctx, "Bonus 2: Vom Verb zum Küchending", "Verb → Küchending",
        "Bonus zwei: Viele Küchendinge kommen von einem Verb, wie im Deutschen: schneiden, Schneidebrett.",
        rows, note=[("Tipp:", "ExtraBold", 34, GOLD), ("  Kennst du das Verb, erkennst du oft auch das Ding!", "Medium", 34, INK)],
        y0=245, dy=114, note_y=965, arrow=True, gap=90)


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Mutfak", "Küchensachen auf Türkisch",
        [("mut · ", "Bold", 46, MUTED), ("fak", "Bold", 46, RED), ("   =   die Küche", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du fünfunddreißig Wörter für die Küche: zum Kochen, Backen, Essen und Spülen.", "welcome"),
         ("de", "Küche heißt auf Türkisch:", "word"), ("tr", "Mutfak.", "mutfak"), ("tr_slow", "Mutfak.", "mutfak2")],
        title_mark="mutfak")
    scenes = [title, HowToScene(ctx, BY_TR["tabak"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        suffix_scene(ctx),
        verb_scene(ctx),
        PhraseGridScene(ctx, "Bonus 3: Am Esstisch", "Bonus drei: vier Sätze für den Esstisch.",
                        TABLE, chapter="Sätze am Esstisch",
                        note=[("Ellerine sağlık", "ExtraBold", 34, RED), (" = „Gesundheit deinen Händen“  ·  ", "Medium", 30, MUTED),
                              ("uzatmak", "Bold", 34, TEAL), (" = reichen  ·  ", "Medium", 30, MUTED),
                              ("yıkamak", "Bold", 34, TEAL), (" = spülen", "Medium", 30, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 35 Wörter auf einen Blick",
                      "Hier sind alle fünfunddreißig Wörter auf einen Blick.", cols=7),
        OutroScene(ctx, "Afiyet olsun!", "Guten Appetit!", "Jetzt kennst du 35 Wörter für die Küche!",
                   ["Super gemacht! Jetzt kennst du fünfunddreißig Wörter für die Küche.",
                    "Tipp: Sag beim Tischdecken auf Türkisch, was du auf den Tisch stellst."],
                   icon="1f37d"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in SUFFIX} | {e for *_, e in VERBS} | {e for *_, e in TABLE})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="mutfak_kueche_deutsch_tuerkisch.mp4", title="Mutfak – Küchensachen auf Türkisch")
