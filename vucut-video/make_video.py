#!/usr/bin/env python3
"""
Lernvideo „Vücut – Körperteile“: 30 Nomen rund um den Körper, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 30 Wortkarten in 3 Kapiteln (Kopf & Gesicht, Rumpf & Arme, Beine & das Innere):
    deutsches Wort → türkisches Wort normal + langsam → Pause zum Nachsprechen
  * Bonus 1: Mehrzahl-Wiederholung und „nach Zahlen keine Mehrzahl“ (iki göz = zwei Augen)
  * Bonus 2: „mein …“ mit -ım/-im/-um/-üm (gözüm = mein Auge)
  * Bonus 3: „… ağrıyor“ – was tut weh? (Başım ağrıyor = Mein Kopf tut weh)
  * Quiz, Übersicht, Abschluss

Die gemeinsame Technik steckt in ../lernvideo/ (engine.py, nouns.py).

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/vucut_koerperteile_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 10  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.nouns import *  # noqa: E402,F401,F403  (Engine + Bausteine für Nomen-Videos)

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = (190, 105, 0)

# --------------------------------------------------------------------------------------
# Inhalte
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Baş ve yüz", "Kopf & Gesicht", "1f60a", [
        N("der Kopf", "baş", "1f9d1", ["basch"], 0, "ş = „sch“  ·  umgangssprachlich auch: kafa"),
        N("das Haar / die Haare", "saç", "1f487", ["satsch"], 0, "ç = „tsch“  ·  saç steht meist in der Einzahl",
          de_say="das Haar, die Haare"),
        N("das Gesicht", "yüz", "1f642", ["jüs"], 0, "yüz heißt auch: hundert!"),
        N("das Auge", "göz", "1f441", ["gös"], 0, "z = weiches, summendes s"),
        N("die Augenbraue", "kaş", "1f928", ["kasch"], 0, "ş = „sch“"),
        N("das Ohr", "kulak", "1f442", ["ku", "lak"], 1),
        N("die Nase", "burun", "1f443", ["bu", "run"], 1, "r leicht gerollt"),
        N("der Mund", "ağız", "1f444", ["aa", "ıs"], 1, "ğ ist stumm – das a wird lang"),
        N("der Zahn", "diş", "1f9b7", ["disch"], 0, "ş = „sch“"),
        N("die Zunge", "dil", "1f445", ["dil"], 0, "dil heißt auch: die Sprache!"),
        N("die Lippe", "dudak", "1f48b", ["du", "dak"], 1),
    ]),
    Chapter("Gövde ve kollar", "Rumpf & Arme", "1f9cd", [
        N("der Hals", "boyun", "1f9e3", ["bo", "jun"], 1, "y = „j“"),
        N("die Schulter", "omuz", "1f937", ["o", "mus"], 1, "z = weiches s"),
        N("die Brust", "göğüs", "1f455", ["gö", "üs"], 1, "ğ zwischen ö und ü: fast stumm"),
        N("der Rücken", "sırt", "1f392", ["sırt"], 0, "ı = dumpfes i, wie das e in „bitte“"),
        N("der Bauch", "karın", "1f930", ["ka", "rın"], 1, "Karnım aç = Ich habe Hunger"),
        N("der Arm", "kol", "1f4aa", ["kol"], 0),
        N("der Ellbogen", "dirsek", "1f9be", ["dir", "sek"], 1),
        N("die Hand", "el", "270b", ["el"], 0, "Kurz und leicht: nur zwei Buchstaben!"),
        N("der Finger", "parmak", "1f446", ["par", "mak"], 1),
        N("der Fingernagel", "tırnak", "1f485", ["tır", "nak"], 1, "ı = dumpfes i"),
    ]),
    Chapter("Bacaklar ve vücudun içi", "Beine & das Innere", "1f9b5", [
        N("das Bein", "bacak", "1f9b5", ["ba", "dschak"], 1, "c = „dsch“"),
        N("das Knie", "diz", "1f9ce", ["dis"], 0, "z = weiches s"),
        N("der Fuß", "ayak", "1f9b6", ["a", "jak"], 1, "y = „j“"),
        N("der Zeh", "ayak parmağı", "1f463", ["a", "jak", "par", "ma", "ı"], 1, "wörtlich: Fuß-Finger"),
        N("das Herz", "kalp", "1fac0", ["kalp"], 0),
        N("das Gehirn", "beyin", "1f9e0", ["be", "jin"], 1, "y = „j“"),
        N("der Knochen", "kemik", "1f9b4", ["ke", "mik"], 1),
        N("das Blut", "kan", "1fa78", ["kan"], 0),
        N("die Haut", "deri", "1f9f4", ["de", "ri"], 1, "deri heißt auch: das Leder"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

PLURAL = [("göz", "ler", "Augen"), ("el", "ler", "Hände"), ("kulak", "lar", "Ohren")]
NUMBERS = [("iki göz", "zwei Augen", "1f441"), ("iki el", "zwei Hände", "270b"),
           ("on parmak", "zehn Finger", "1f446"), ("otuz iki diş", "zweiunddreißig Zähne", "1f9b7")]
POSSESSIVE = [("baş", "ım", "mein Kopf", "1f9d1"), ("el", "im", "meine Hand", "270b"),
              ("kol", "um", "mein Arm", "1f4aa"), ("göz", "üm", "mein Auge", "1f441")]
PAIN = [("Başım ağrıyor.", "Mein Kopf tut weh.", "1f915"),
        ("Dişim ağrıyor.", "Mein Zahn tut weh.", "1f9b7"),
        ("Sırtım ağrıyor.", "Mein Rücken tut weh.", "1f623"),
        ("Karnım ağrıyor.", "Mein Bauch tut weh.", "1f922")]
QUIZ = ["göz", "el", "ağız", "kulak", "diş", "ayak", "saç", "kalp", "burun", "diz", "sırt", "parmak"]
FLOATERS = ["1f441", "1f442", "1f443", "1f444", "270b", "1f9b6", "1f9b7", "1f4aa"]
ICONS = ["1f915", "1f623", "1f922", "1f522", "1f4cc"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen
# --------------------------------------------------------------------------------------
class NumbersScene(Scene):
    chapter = "Mehrzahl & Zahlen"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus eins: Viele Körperteile gibt es doppelt. Die Mehrzahl kennst du schon:"), "intro")
        self.wait(0.4)
        for i, (sg, suf, de) in enumerate(PLURAL):
            st = self.t
            self.say(ctx.TR(sg + "."))
            self.wait(0.3)
            self.say(ctx.TR(sg + suf + "."))
            self.wait(0.7)
            self.marks[f"pl{i}"] = (st, self.t)
        self.say(ctx.DE("Aber Achtung: Nach einer Zahl bleibt das Wort in der Einzahl!"), "rule")
        self.wait(0.4)
        for i, (tr, de, _) in enumerate(NUMBERS):
            st = self.t
            self.say(ctx.TR(tr + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.7)
            self.marks[f"num{i}"] = (st, self.t)
        self.finish(0.8)
        self.plural = [pill(g, [(sg, "Bold", 50, TEAL), ("  →  ", "Bold", 42, MUTED), (sg, "Bold", 50, TEAL),
                                (suf, "ExtraBold", 50, RED), (f"   {de}", "Medium", 34, MUTED)], h=92)
                       for sg, suf, de in PLURAL]
        self.rule = pill(g, [("Nach Zahlen: ", "SemiBold", 40, INK), ("keine", "ExtraBold", 44, RED),
                             (" Mehrzahl!", "SemiBold", 40, INK)], h=96, fill=NOTE_BG, icon="1f522")
        self.nums = []
        for tr, de, emo in NUMBERS:
            num, word = tr.rsplit(" ", 1)
            self.nums.append(pill(g, [(num + " ", "Bold", 50, GOLD), (word, "ExtraBold", 50, RED),
                                      (f"   =  {de}", "Medium", 32, MUTED)], h=104, icon=emo, minw=800))

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 1: Zwei Augen – iki göz", y=120, size=60)
        for i, im in enumerate(self.plural):
            st = self.m(f"pl{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, 340 + i * 620, 275 + dy, opacity=op)
        if t >= self.m("rule")[0]:
            op, dy = appear(t, self.m("rule")[0])
            put_center(f, self.rule, W / 2, 450 + dy, opacity=op)
        for i, im in enumerate(self.nums):
            st = self.m(f"num{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                col, row = i % 2, i // 2
                put_center(f, im, 510 + col * 900, 640 + row * 165 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"num{i}") else 1.0)
        return f


class PossessiveScene(Scene):
    chapter = "mein …: -ım / -im / -um / -üm"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus zwei: So sagst du mein. Dafür hängst du eine kleine Endung an."), "intro")
        self.wait(0.4)
        for i, (word, suf, de, _) in enumerate(POSSESSIVE):
            st = self.t
            self.say(ctx.TR(word + "."))
            self.wait(0.3)
            self.say(ctx.TR(word + suf + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Der Vokal passt sich an, genau wie bei der Ich-Form der Verben."), "rule")
        self.finish(1.2)
        self.formula = pill(g, [("Nomen", "Bold", 50, TEAL), ("  +  ", "Bold", 44, MUTED), ("m", "ExtraBold", 58, RED),
                                ("  (mit Vokal davor)   =   ", "Medium", 38, MUTED), ("mein / meine …", "SemiBold", 44, INK)],
                           h=106)
        self.rows = [pill(g, [(w, "Bold", 54, TEAL), ("   →   ", "Bold", 44, MUTED), (w, "Bold", 54, TEAL),
                              (s[0], "ExtraBold", 54, GOLD), (s[1:], "ExtraBold", 54, RED),
                              (f"      {de}", "Medium", 38, MUTED)], h=100, icon=emo, minw=1180)
                     for w, s, de, emo in POSSESSIVE]
        segs = [("Wie bei -iyorum:     ", "SemiBold", 34, INK)]
        for i, (a, b) in enumerate((("a, ı", "ım"), ("e, i", "im"), ("o, u", "um"), ("ö, ü", "üm"))):
            segs += [(("     " if i else "") + a + " ", "Medium", 34, MUTED), ("→", "Bold", 34, MUTED),
                     (" -" + b, "ExtraBold", 40, GOLD)]
        self.rule = pill(g, segs, h=88, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 2: mein Kopf = başım", y=110, size=60)
        op, dy = appear(t, self.m("intro")[0] + 1.0)
        put_center(f, self.formula, W / 2, 240 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 390 + i * 118 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("rule")[0]:
            op, dy = appear(t, self.m("rule")[0])
            put_center(f, self.rule, W / 2, 900 + dy, opacity=op)
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Vücut", "Körperteile auf Türkisch",
        [("vü · ", "Bold", 46, MUTED), ("dschut", "Bold", 46, RED), ("   =   der Körper", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"), ("de", "Heute lernst du dreißig Körperteile auf Türkisch.", "welcome"),
         ("de", "Der Körper heißt auf Türkisch:", "word"), ("tr", "Vücut.", "vucut"),
         ("tr_slow", "Vücut.", "vucut2")],
        title_mark="vucut")
    scenes = [title, HowToScene(ctx, BY_TR["kulak"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        NumbersScene(ctx),
        PossessiveScene(ctx),
        PhraseGridScene(ctx, "Bonus 3: Was tut weh?  …  ağrıyor",
                        "Bonus drei: Beim Arzt. So sagst du, was weh tut. Ağrıyor heißt: tut weh.", PAIN,
                        chapter="Was tut weh? … ağrıyor",
                        note=[("karın", "Bold", 38, TEAL), (" → ", "Bold", 34, MUTED), ("karnım", "Bold", 38, RED),
                              (":  das ı fällt weg  ·  ", "Medium", 34, MUTED), ("ağrıyor", "Bold", 38, RED),
                              (" = es tut weh (von ağrımak)", "Medium", 34, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 30 Körperteile auf einen Blick",
                      "Hier sind alle dreißig Körperteile auf einen Blick."),
        OutroScene(ctx, "Tebrikler!", "Glückwunsch!", "Du kennst jetzt 30 Körperteile auf Türkisch!",
                   ["Super gemacht! Du kennst jetzt dreißig Körperteile auf Türkisch.",
                    "Tipp: Zeig beim Zähneputzen auf dein Gesicht und sag die Wörter laut."]),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in NUMBERS} | {e for *_, e in POSSESSIVE} | {e for *_, e in PAIN})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="vucut_koerperteile_deutsch_tuerkisch.mp4", title="Vücut – Körperteile auf Türkisch")
