#!/usr/bin/env python3
"""
Lernvideo „Doğa – die Natur“: 40 Nomen rund um die Natur, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 40 Wortkarten in 4 Kapiteln (Land & Gestein, Pflanzen, Gewässer, Himmel & Elemente)
  * Bonus 1: Gegensätze mit Adjektiven (büyük ağaç – küçük çiçek, yüksek dağ – alçak tepe …)
  * Bonus 2: Sätze in der Natur (Ormanda yürüyorum. · Gölde balık var. …)
  * Quiz, Übersicht, Abschluss

Für Natur-Wörter ohne Emoji (Hügel, Tal, Höhle, Wald, Ast, Wurzel, Busch, Gras, See, Fluss,
Bach, Wasserfall, Himmel …) liegen eigene Zeichnungen in icons/. Wo die Stimme ein Wort falsch
betont, spricht sie es aus korrigierter Lautschrift („[[…]]“).

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/doga_natur_deutsch_tuerkisch.mp4
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
# Inhalte  (stress=None: aus der Lautschrift der Stimme; -1: keine Markierung)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Kara", "Land & Gestein", "26f0", [
        N("die Natur", "doğa", "1f3de", ["doo", "a"], None, "ğ ist stumm – das o wird lang"),
        N("der Berg", "dağ", "26f0", ["daa"], None, "ğ am Ende: das a wird lang  ·  dağlar = Gebirge"),
        N("der Hügel", "tepe", "x-hill", ["te", "pe"], None, "tepe heißt auch: der Gipfel"),
        N("das Tal", "vadi", "x-valley", ["wa", "di"], None, "v ≈ w"),
        N("die Höhle", "mağara", "x-cave", ["maa", "ra"], None, "ğ ist stumm: „maara“"),
        N("die Wüste", "çöl", "1f3dc", ["tschöl"], None, "ç = „tsch“"),
        N("der Vulkan", "volkan", "1f30b", ["wol", "kan"], None, "fast wie im Deutschen!"),
        N("die Erde (der Boden)", "toprak", "x-soil", ["top", "rak"], None, "Erde als Planet = dünya",
          de_say="die Erde, also der Boden"),
        N("der Stein", "taş", "x-pebbles", ["tasch"], None, "ş = „sch“"),
        N("der Fels", "kaya", "1faa8", ["ka", "ja"], None, "y = „j“  ·  ein großer Stein"),
    ]),
    Chapter("Bitkiler", "Pflanzen", "1f331", [
        N("der Wald", "orman", "x-forest", ["or", "man"], None),
        N("der Baum", "ağaç", "1f333", ["aa", "atsch"], 1, "ğ stumm, ç = „tsch“: aa-ATSCH", tr_say="[[aːˈatʃ]]"),
        N("der Ast", "dal", "x-branch", ["dal"], None, "auch: der Zweig"),
        N("das Blatt", "yaprak", "1f341", ["jap", "rak"], None, "y = „j“"),
        N("die Wurzel", "kök", "x-roots", ["kök"], None, "ö wie im Deutschen"),
        N("der Busch", "çalı", "x-bush", ["tscha", "lı"], None, "ç = „tsch“  ·  ı = dumpfes i"),
        N("das Gras", "çimen", "x-grass", ["tschi", "men"], None, "auch: der Rasen"),
        N("die Blume", "çiçek", "1f33c", ["tschi", "tschek"], None, "zweimal ç = „tsch“"),
        N("der Samen", "tohum", "1f331", ["to", "hum"], -1, "h deutlich hauchen"),
        N("der Pilz", "mantar", "1f344", ["man", "tar"], None, "mantar heißt auch: der Korken"),
    ]),
    Chapter("Sular", "Gewässer", "1f30a", [
        N("das Meer", "deniz", "26f5", ["de", "nis"], 1, "z = weiches s", tr_say="[[denˈɪz]]"),
        N("der Ozean", "okyanus", "1f433", ["ok", "ja", "nus"], None, "y = „j“"),
        N("der See", "göl", "x-lake", ["göl"], None, "Achtung: der See = göl, die See (Meer) = deniz"),
        N("der Fluss", "nehir", "x-river", ["ne", "hir"], None, "h deutlich hauchen"),
        N("der Bach", "dere", "x-stream", ["de", "re"], None, "r leicht gerollt"),
        N("der Wasserfall", "şelale", "x-waterfall", ["sche", "la", "le"], -1, "ş = „sch“"),
        N("die Welle", "dalga", "1f30a", ["dal", "ga"], None),
        N("die Insel", "ada", "1f3dd", ["a", "da"], None),
        N("der Strand", "plaj", "1f3d6", ["plasch"], None, "j wie in „Journal“"),
        N("der Sand", "kum", "231b", ["kum"], None, "kum saati = die Sanduhr"),
    ]),
    Chapter("Gökyüzü ve elementler", "Himmel & Elemente", "1f30c", [
        N("der Himmel", "gökyüzü", "x-sky", ["gök", "jü", "sü"], None, "wörtlich: Himmels-Gesicht (gök + yüz)"),
        N("die Sonne", "güneş", "2600", ["gü", "nesch"], None, "ş = „sch“"),
        N("der Mond", "ay", "1f319", ["ai"], None, "ay heißt auch: der Monat"),
        N("der Stern", "yıldız", "2b50", ["jıl", "dıs"], 1, "y = „j“  ·  ı = dumpfes i", tr_say="[[jɯɫdˈɯz]]"),
        N("die Wolke", "bulut", "2601", ["bu", "lut"], None),
        N("die Erde (der Planet)", "dünya", "1f30d", ["dün", "ja"], None, "dünya heißt auch: die Welt",
          de_say="die Erde, also der Planet"),
        N("das Weltall", "uzay", "1f30c", ["u", "sai"], None, "ay klingt wie „ei“"),
        N("die Luft", "hava", "1f388", ["ha", "wa"], None, "hava heißt auch: das Wetter"),
        N("das Feuer", "ateş", "1f525", ["a", "tesch"], None, "ş = „sch“"),
        N("das Wasser", "su", "1f4a7", ["su"], None, "Bir su, lütfen! = Ein Wasser, bitte!"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

OPPOSITES = [  # (Adjektiv, Nomen, Deutsch) links ↔ rechts
    (("büyük", "ağaç", "der große Baum"), ("küçük", "çiçek", "die kleine Blume")),
    (("yüksek", "dağ", "der hohe Berg"), ("alçak", "tepe", "der niedrige Hügel")),
    (("derin", "deniz", "das tiefe Meer"), ("sığ", "dere", "der flache Bach")),
    (("uzun", "nehir", "der lange Fluss"), ("kısa", "dal", "der kurze Ast")),
]
ADJ_DE = {"büyük": "groß", "küçük": "klein", "yüksek": "hoch", "alçak": "niedrig",
          "derin": "tief", "sığ": "flach", "uzun": "lang", "kısa": "kurz"}
NATURE_SENTENCES = [("Ormanda yürüyorum.", "Ich spaziere im Wald.", "1f6b6"),
                    ("Denizde yüzüyorum.", "Ich schwimme im Meer.", "1f3ca"),
                    ("Dağda kar var.", "Auf dem Berg liegt Schnee.", "1f3d4"),
                    ("Gölde balık var.", "Im See gibt es Fische.", "1f41f")]
QUIZ = ["dağ", "ağaç", "orman", "çiçek", "deniz", "göl", "nehir", "ada", "güneş", "ay", "yıldız", "toprak"]
FLOATERS = ["26f0", "1f333", "1f33c", "1f30a", "1f319", "2b50", "1f344", "1f30b"]
ICONS = ["1f4cc"]


# --------------------------------------------------------------------------------------
# Bonus: Gegensätze
# --------------------------------------------------------------------------------------
class OppositesScene(Scene):
    chapter = "Gegensätze: groß – klein"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus eins: Gegensätze. Mit acht Adjektiven beschreibst du die Natur. "
                        "Das Adjektiv steht vor dem Nomen und ändert sich nie."), "intro")
        self.wait(0.4)
        for i, pair in enumerate(OPPOSITES):
            for side, (adj, noun, de) in zip("lr", pair):
                st = self.t
                self.say(ctx.TR(f"{adj} {noun}."))
                self.wait(0.25)
                self.say(ctx.DE(de))
                self.wait(0.5)
                self.marks[f"{side}{i}"] = (st, self.t)
        self.finish(2.5)
        self.pill = ctx.pill
        self.cells = {}
        for i, pair in enumerate(OPPOSITES):
            for side, (adj, noun, de) in zip("lr", pair):
                col = RED if side == "l" else TEAL
                self.cells[(side, i)] = pill(g, [(adj, "ExtraBold", 50, col), (" " + noun, "Bold", 50, INK),
                                                 (f"    {de}", "Medium", 30, MUTED)],
                                             h=104, icon=BY_TR[noun].emoji, minw=800)
        segs = []
        for i, (a, b) in enumerate([(p[0][0], p[1][0]) for p in OPPOSITES]):
            segs += [(("     " if i else ""), "Medium", 30, MUTED), (a, "Bold", 32, RED), (" – ", "Medium", 30, MUTED),
                     (b, "Bold", 32, TEAL), (f" ({ADJ_DE[a]}/{ADJ_DE[b]})", "Medium", 26, MUTED)]
        self.legend = pill(g, segs, h=78, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 1: Gegensätze in der Natur", y=105, size=58)
        for (side, i), im in self.cells.items():
            st = self.m(f"{side}{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, 500 + (0 if side == "l" else 920), 245 + i * 140 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"{side}{i}") else 1.0)
        if t >= self.m("l0")[0] + 0.5:
            op, dy = appear(t, self.m("l0")[0] + 0.5)
            put_center(f, self.legend, W / 2, 860 + dy, opacity=op)
        if self.active(t, "intro"):
            self.pill.draw(f, "de", self.since(t, "intro"), t, None, cy=1010)
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Doğa", "Die Natur auf Türkisch",
        [("doo · ", "Bold", 46, MUTED), ("a", "Bold", 46, RED), ("   =   die Natur  (ğ ist stumm)", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du vierzig Wörter aus der Natur: Berge, Pflanzen, Wasser und Himmel.", "welcome"),
         ("de", "Die Natur heißt auf Türkisch:", "word"), ("tr", "Doğa.", "doga"), ("tr_slow", "Doğa.", "doga2")],
        title_mark="doga")
    scenes = [title, HowToScene(ctx, BY_TR["orman"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        OppositesScene(ctx),
        PhraseGridScene(ctx, "Bonus 2: Doğada – in der Natur",
                        "Bonus zwei: kleine Sätze in der Natur, mit Wörtern aus deinen anderen Videos.",
                        NATURE_SENTENCES, chapter="Sätze in der Natur",
                        note=[("-da / -de", "ExtraBold", 38, RED), (" = in / auf  (ormanda, denizde)   ·   ", "Medium", 32, MUTED),
                              ("yüzmek", "Bold", 36, TEAL), (" = schwimmen   ·   ", "Medium", 32, MUTED),
                              ("var", "ExtraBold", 38, RED), (" = es gibt", "Medium", 32, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 40 Natur-Wörter auf einen Blick",
                      "Hier sind alle vierzig Natur-Wörter auf einen Blick.", cols=8),
        OutroScene(ctx, "Mükemmel!", "Ausgezeichnet!", "Du kennst jetzt 40 Wörter aus der Natur!",
                   ["Super gemacht! Du kennst jetzt vierzig Wörter aus der Natur.",
                    "Tipp: Sag beim nächsten Spaziergang leise auf Türkisch, was du siehst."],
                   icon="1f333"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in NATURE_SENTENCES})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="doga_natur_deutsch_tuerkisch.mp4", title="Doğa – die Natur auf Türkisch")
