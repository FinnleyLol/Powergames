#!/usr/bin/env python3
"""
Lernvideo „Aile – die Familie“: 20 Familien-Wörter, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 20 Wortkarten in 4 Kapiteln (Kernfamilie, Geschwister, Großeltern & Enkel, Tanten/Onkel/Cousins)
  * Bonus 1: Mamas Seite – Papas Seite (anneanne/babaanne, teyze/hala, dayı/amca)
  * Bonus 2: meine Mutter = annem (nach Vokal nur -m, sonst -ım/-im/-um/-üm; oğul → oğlum)
  * Bonus 3: Mini-Dialog „Kaç kardeşin var?“ (Wie viele Geschwister hast du?)
  * Quiz, Übersicht, Abschluss

Bilder: Twemoji; für Verwandte mütter- bzw. väterlicherseits zusammengesetzt („haupt+abzeichen“,
z. B. Oma mit kleinem Mama-Abzeichen = anneanne).

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/aile_familie_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 20  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.nouns import *  # noqa: E402,F401,F403  (Engine + Bausteine für Wortkarten-Videos)

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = (190, 105, 0)
MOM, DAD = "1f469", "1f468"  # Abzeichen: Familie der Mutter / des Vaters

# --------------------------------------------------------------------------------------
# Inhalte
#   stress=None → betonte Silbe aus der Lautschrift der Stimme
#   stress=-1   → keine Markierung (bei Verwandtschaftswörtern betonen viele Sprecher anders als die Stimme)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Çekirdek aile", "Die Kernfamilie", "1f3e1", [
        N("die Familie", "aile", "1f468&1f469&1f467&1f466", ["a", "i", "le"], -1, "drei Silben: a · i · le"),
        N("die Mutter / Mama", "anne", "1f469&1f467", ["an", "ne"], -1, "nn: das n etwas länger halten",
          de_say="die Mutter, die Mama"),
        N("der Vater / Papa", "baba", "1f468&1f466", ["ba", "ba"], -1, de_say="der Vater, der Papa"),
        N("der Ehemann / die Ehefrau", "eş", "1f491", ["esch"], None, "eşim = mein Mann / meine Frau",
          de_say="der Ehemann, oder die Ehefrau"),
        N("das Kind", "çocuk", "1f9d2", ["tscho", "dschuk"], None, "ç = „tsch“  ·  c = „dsch“  ·  çocuklar = die Kinder"),
        N("der Sohn", "oğul", "1f466", ["o", "ul"], None, "ğ ist stumm  ·  mein Sohn = oğlum"),
        N("die Tochter / das Mädchen", "kız", "1f467", ["kıs"], None, "kız heißt Tochter und Mädchen",
          de_say="die Tochter, und das Mädchen"),
        N("das Baby", "bebek", "1f476", ["be", "bek"], None, "bebek heißt auch: die Puppe"),
    ]),
    Chapter("Kardeşler", "Geschwister", "1f9d1-200d-1f91d-200d-1f9d1", [
        N("der Bruder / die Schwester", "kardeş", "1f9d1-200d-1f91d-200d-1f9d1", ["kar", "desch"], None,
          "kız kardeş = Schwester  ·  erkek kardeş = Bruder", de_say="der Bruder, oder die Schwester"),
        N("die ältere Schwester", "abla", MOM, ["ab", "la"], -1, "auch höfliche Anrede für junge Frauen"),
        N("der ältere Bruder", "abi", DAD, ["a", "bi"], None, "lang: ağabey  ·  auch Anrede für junge Männer"),
    ]),
    Chapter("Büyükanne ve dede", "Großeltern & Enkel", "1f474", [
        N("die Oma (Mamas Mutter)", "anneanne", "1f475+" + MOM, ["an", "ne", "an", "ne"], -1,
          "wörtlich: Mutter-Mutter (anne + anne)", de_say="die Oma, also Mamas Mutter"),
        N("die Oma (Papas Mutter)", "babaanne", "1f475+" + DAD, ["ba", "ba", "an", "ne"], -1,
          "wörtlich: Vater-Mutter (baba + anne)", de_say="die Oma, also Papas Mutter"),
        N("der Opa", "dede", "1f474", ["de", "de"], None, "auch: büyükbaba (wörtlich: großer Vater)"),
        N("das Enkelkind", "torun", "1f9d2+1f474", ["to", "run"], None, "torunum = mein Enkel / meine Enkelin"),
    ]),
    Chapter("Teyze, hala, dayı, amca", "Tanten, Onkel & Cousins", "1f333", [
        N("die Tante (Mamas Schwester)", "teyze", "1f469-200d-1f9b0+" + MOM, ["tei", "se"], -1,
          "auch: freundliche Anrede für ältere Frauen", de_say="die Tante, also Mamas Schwester"),
        N("die Tante (Papas Schwester)", "hala", "1f469-200d-1f9b1+" + DAD, ["ha", "la"], -1,
          de_say="die Tante, also Papas Schwester"),
        N("der Onkel (Mamas Bruder)", "dayı", "1f468-200d-1f9b0+" + MOM, ["da", "jı"], -1, "ı = dumpfes i",
          de_say="der Onkel, also Mamas Bruder"),
        N("der Onkel (Papas Bruder)", "amca", "1f468-200d-1f9b1+" + DAD, ["am", "dscha"], -1,
          "c = „dsch“  ·  auch Anrede für ältere Männer", de_say="der Onkel, also Papas Bruder"),
        N("der Cousin / die Cousine", "kuzen", "1f9d1-200d-1f9b1", ["ku", "sen"], None, "ein Wort für beide",
          de_say="der Cousin, oder die Cousine"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

SIDES = [  # (Mamas Seite, Papas Seite, Bedeutung)
    ("anneanne", "babaanne", "Oma"),
    ("teyze", "hala", "Tante"),
    ("dayı", "amca", "Onkel"),
]
SIDE_DE = {"anneanne": "die Mutter der Mutter", "babaanne": "die Mutter des Vaters",
           "teyze": "die Schwester der Mutter", "hala": "die Schwester des Vaters",
           "dayı": "der Bruder der Mutter", "amca": "der Bruder des Vaters"}
POSS = [("anne", "m", "meine Mutter"), ("baba", "m", "mein Vater"), ("abla", "m", "meine ältere Schwester"),
        ("kardeş", "im", "mein Bruder / meine Schwester"), ("kız", "ım", "meine Tochter"), ("oğl", "um", "mein Sohn")]
DIALOG = [("Bu benim annem.", "Das ist meine Mutter.", "1f469&1f467"),
          ("Kaç kardeşin var?", "Wie viele Geschwister hast du?", "1f914"),
          ("İki kardeşim var.", "Ich habe zwei Geschwister.", "1f9d1-200d-1f91d-200d-1f9d1"),
          ("Kardeşim yok.", "Ich habe keine Geschwister.", "1f9d2")]
QUIZ = ["anne", "baba", "kardeş", "abla", "dede", "teyze", "amca", "çocuk", "kız", "bebek"]
FLOATERS = ["1f476", "1f475", "1f474", "1f467", "1f466", "1f469", "1f468", "1f491"]
ICONS = ["1f4cc", "1f914"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen
# --------------------------------------------------------------------------------------
class SidesScene(Scene):
    """Mamas Seite – Papas Seite: Im Türkischen gibt es vier Wörter für Tante und Onkel."""
    chapter = "Mamas Seite – Papas Seite"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus eins: Im Türkischen ist wichtig, ob jemand zur Familie der Mutter "
                        "oder des Vaters gehört."), "intro")
        self.wait(0.4)
        for i, (left, right, _) in enumerate(SIDES):
            for side, word in (("l", left), ("r", right)):
                st = self.t
                self.say(ctx.TR(word + "."))
                self.wait(0.25)
                self.say(ctx.DE(SIDE_DE[word]))
                self.wait(0.5)
                self.marks[f"{side}{i}"] = (st, self.t)
        self.say(ctx.DE("Im Deutschen gibt es nur Tante und Onkel. Im Türkischen sind es vier Wörter."), "outro")
        self.finish(1.0)
        self.pill = ctx.pill
        self.heads = [pill(g, [("Annenin tarafı", "ExtraBold", 44, RED), ("  ·  Mamas Seite", "SemiBold", 36, MUTED)],
                           h=96, icon=MOM, minw=780, fill=RED_SOFT),
                      pill(g, [("Babanın tarafı", "ExtraBold", 44, TEAL), ("  ·  Papas Seite", "SemiBold", 36, MUTED)],
                           h=96, icon=DAD, minw=780, fill=(214, 243, 238))]
        self.cells = {}
        for i, (left, right, de) in enumerate(SIDES):
            for side, word in (("l", left), ("r", right)):
                n = BY_TR[word]
                self.cells[(side, i)] = pill(g, [(word, "ExtraBold", 54, RED if side == "l" else TEAL),
                                                 (f"    {de}", "SemiBold", 38, INK)], h=118, icon=n.emoji, minw=780)
        self.note = pill(g, [("Deutsch: ", "Medium", 34, MUTED), ("2 Wörter", "Bold", 36, INK),
                             ("  (Tante, Onkel)   ·   Türkisch: ", "Medium", 34, MUTED), ("4 Wörter", "ExtraBold", 38, RED),
                             ("  (teyze, hala, dayı, amca)", "Medium", 34, MUTED)], h=84, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 1: Mamas Seite – Papas Seite", y=105, size=58)
        for k, im in enumerate(self.heads):
            op, dy = appear(t, self.m("intro")[0] + 1.0 + k * 0.6)
            put_center(f, im, 510 + k * 900, 225 + dy, opacity=op)
        for (side, i), im in self.cells.items():
            st = self.m(f"{side}{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, 510 + (0 if side == "l" else 900), 375 + i * 150 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"{side}{i}") else 1.0)
        if t >= self.m("outro")[0]:
            op, dy = appear(t, self.m("outro")[0])
            put_center(f, self.note, W / 2, 880 + dy, opacity=op)
        for k in ("intro", "outro"):
            if self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        return f


class FamilyPossessiveScene(Scene):
    chapter = "meine Mutter = annem"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus zwei: meine Mutter, mein Vater. Das kennst du aus dem Körper-Video. "
                        "Neu ist: Endet das Wort auf einen Vokal, kommt nur ein m dazu."), "intro")
        self.wait(0.4)
        for i, (stem, end, de) in enumerate(POSS):
            word = "oğul" if stem == "oğl" else stem
            st = self.t
            self.say(ctx.TR(word + "."))
            self.wait(0.3)
            self.say(ctx.TR(stem + end + "."))
            self.wait(0.25)
            self.say(ctx.DE(de.replace(" / ", ", ")))
            self.wait(0.5)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Achtung bei Sohn: Das u fällt weg."), "oglum")
        self.finish(1.0)
        self.pill = ctx.pill
        self.formula = pill(g, [("nach Vokal: ", "SemiBold", 36, INK), ("-m", "ExtraBold", 46, RED),
                                ("        nach Konsonant: ", "SemiBold", 36, INK), ("-ım · -im · -um · -üm", "ExtraBold", 42, GOLD)],
                           h=100, icon="1f4cc")
        self.rows = []
        for stem, end, de in POSS:
            word = "oğul" if stem == "oğl" else stem
            col = RED if end == "m" else GOLD
            self.rows.append(pill(g, [(word, "Bold", 46, TEAL), ("  →  ", "Bold", 40, MUTED), (stem, "Bold", 46, TEAL),
                                      (end, "ExtraBold", 46, col), (f"      {de}", "Medium", 32, MUTED)],
                                  h=84, icon=BY_TR[word].emoji, minw=1100))
        self.oglum = pill(g, [("oğ", "Bold", 40, TEAL), ("u", "ExtraBold", 40, RED), ("l", "Bold", 40, TEAL),
                              ("  →  ", "Bold", 36, MUTED), ("oğl", "Bold", 40, TEAL), ("um", "ExtraBold", 40, GOLD),
                              ("   das u fällt weg", "Medium", 32, MUTED)], h=80, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 2: meine Mutter = annem", y=105, size=58)
        op, dy = appear(t, self.m("intro")[0] + 2.0)
        put_center(f, self.formula, W / 2, 230 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 340 + i * 94 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("oglum")[0]:
            op, dy = appear(t, self.m("oglum")[0])
            put_center(f, self.oglum, W / 2, 905 + dy, opacity=op)
        for k in ("intro", "oglum"):
            if self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Aile", "Die Familie auf Türkisch",
        [("a · i · le", "Bold", 46, RED), ("   =   die Familie", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du zwanzig Wörter für die Familie. Und du siehst, warum es im Türkischen "
                "zwei verschiedene Omas gibt.", "welcome"),
         ("de", "Die Familie heißt auf Türkisch:", "word"), ("tr", "Aile.", "aile"), ("tr_slow", "Aile.", "aile2")],
        title_mark="aile")
    scenes = [title, HowToScene(ctx, BY_TR["kardeş"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        SidesScene(ctx),
        FamilyPossessiveScene(ctx),
        PhraseGridScene(ctx, "Bonus 3: Kaç kardeşin var?", "Bonus drei: ein kleiner Dialog über die Familie.",
                        DIALOG, chapter="Mini-Dialog: Kaç kardeşin var?",
                        note=[("kaç", "ExtraBold", 38, RED), (" = wie viele   ·   ", "Medium", 34, MUTED),
                              ("kardeş", "Bold", 38, TEAL), ("in", "ExtraBold", 38, GOLD), (" = dein Geschwister   ·   ", "Medium", 34, MUTED),
                              ("var / yok", "ExtraBold", 38, RED), (" = es gibt / nicht", "Medium", 34, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 20 Familien-Wörter auf einen Blick",
                      "Hier sind alle zwanzig Familien-Wörter auf einen Blick.", cols=5),
        OutroScene(ctx, "Süper!", "Super!", "Jetzt kannst du auf Türkisch über deine Familie sprechen!",
                   ["Super gemacht! Jetzt kannst du auf Türkisch über deine Familie sprechen.",
                    "Tipp: Nimm ein Familienfoto und sag zu jeder Person auf Türkisch, wer das ist."],
                   icon="1f468&1f469&1f467&1f466"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in DIALOG})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="aile_familie_deutsch_tuerkisch.mp4", title="Aile – die Familie auf Türkisch")
