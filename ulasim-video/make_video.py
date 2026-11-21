#!/usr/bin/env python3
"""
Lernvideo „Ulaşım – Verkehrsmittel“: 25 Nomen rund um Verkehr und Unterwegssein, Deutsch → Türkisch
mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 25 Wortkarten in 3 Kapiteln (an Land, Wasser & Luft, unterwegs: Orte & Dinge)
  * Bonus 1: zusammengesetzte Wörter (otobüs + durak → otobüs durağı = Bushaltestelle)
  * Bonus 2: „mit dem Bus“ = otobüsle (-le / -la, nach Vokal -yle / -yla)
  * Bonus 3: Sätze an der Haltestelle (Otobüs durağı nerede? · Bir bilet, lütfen. …)
  * Quiz, Übersicht, Abschluss

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/ulasim_verkehrsmittel_deutsch_tuerkisch.mp4
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

# --------------------------------------------------------------------------------------
# Inhalte  (stress=None: betonte Silbe aus der Lautschrift der Stimme; „_“ = neues Wort)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Karada", "An Land", "1f697", [
        N("das Auto", "araba", "1f697", ["a", "ra", "ba"], None, "araba heißt auch: der Wagen"),
        N("der LKW / Lastwagen", "kamyon", "1f69b", ["kam", "jon"], None, "y = „j“",
          de_say="der LKW, also der Lastwagen"),
        N("der Bus", "otobüs", "1f68c", ["o", "to", "büs"], None, "ü wie im Deutschen"),
        N("das Sammeltaxi", "dolmuş", "1f690", ["dol", "musch"], None, "typisch Türkei!  ·  wörtlich: „gefüllt“"),
        N("das Taxi", "taksi", "1f695", ["tak", "si"], None, "fast wie im Deutschen"),
        N("das Motorrad", "motosiklet", "1f3cd", ["mo", "to", "sik", "let"], None, "kurz auch: motor"),
        N("das Fahrrad", "bisiklet", "1f6b2", ["bi", "sik", "let"], None, "fast wie englisch „bicycle“"),
        N("der Zug", "tren", "1f686", ["tren"], None, "fast wie englisch „train“"),
        N("die U-Bahn", "metro", "1f687", ["met", "ro"], None, de_say="die U-Bahn"),
        N("die Straßenbahn", "tramvay", "1f68a", ["tram", "wai"], None, "ay klingt wie „ei“"),
    ]),
    Chapter("Denizde ve havada", "Wasser & Luft", "2708", [
        N("das Schiff", "gemi", "1f6a2", ["ge", "mi"], None, "ein großes Schiff"),
        N("das Boot", "tekne", "1f6a4", ["tek", "ne"], None, "ein kleines Boot"),
        N("die Fähre", "vapur", "26f4", ["wa", "pur"], None, "typisch Istanbul!  ·  v ≈ w"),
        N("das Flugzeug", "uçak", "2708", ["u", "tschak"], None, "ç = „tsch“  ·  uçmak = fliegen"),
        N("der Hubschrauber", "helikopter", "1f681", ["he", "li", "kop", "ter"], None, "fast wie „Helikopter“"),
    ]),
    Chapter("Yolda", "Unterwegs: Orte & Dinge", "1f6e3", [
        N("die Bushaltestelle", "otobüs durağı", "1f68f", ["o", "to", "büs", "_du", "raa", "ı"], None,
          "durak = Haltestelle → otobüs durağı",
          tr_say="[[otobˈøs duɾaː ˈɯ]]"),  # sonst verschleift die Stimme „aı“ zu „e“ („düreği“)
        N("der Bahnhof", "tren istasyonu", "1f689", ["tren", "_is", "tas", "jo", "nu"], None, "auch: gar"),
        N("der Flughafen", "havalimanı", "1f6eb", ["ha", "wa", "li", "ma", "nı"], None,
          "wörtlich: Luft-Hafen (hava + liman)"),
        N("der Hafen", "liman", "2693", ["li", "man"], None),
        N("die Fahrkarte", "bilet", "1f3ab", ["bi", "let"], None, "auch: das Ticket"),
        N("die Straße", "yol", "1f6e3", ["jol"], None, "auch: der Weg  ·  İyi yolculuklar! = Gute Reise!"),
        N("die Brücke", "köprü", "1f309", ["köp", "rü"], None, "ö und ü wie im Deutschen"),
        N("die Ampel", "trafik ışığı", "1f6a6", ["tra", "fik", "_ı", "schı", "ı"], 1,
          "ışık = das Licht → Ampel = „Verkehrs-Licht“"),
        N("die Tankstelle", "benzin istasyonu", "26fd", ["ben", "sin", "_is", "tas", "jo", "nu"], None,
          "wörtlich: Benzin-Station"),
        N("der Parkplatz", "otopark", "1f17f", ["o", "to", "park"], None, "fast wie im Deutschen"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

COMPOUNDS = [  # (Wort 1, Wort 2, zusammengesetzt (2. Wort), Deutsch, Emoji)
    ("otobüs", "durak", "durağı", "die Bushaltestelle", "1f68f"),
    ("tren", "istasyon", "istasyonu", "der Bahnhof", "1f689"),
    ("trafik", "ışık", "ışığı", "die Ampel", "1f6a6"),
    ("polis", "araba", "arabası", "das Polizeiauto", "1f693"),
    ("kum", "saat", "saati", "die Sanduhr", "231b"),
]
WITH = [("otobüs", "le", "mit dem Bus", "1f68c"), ("tren", "le", "mit dem Zug", "1f686"),
        ("uçak", "la", "mit dem Flugzeug", "2708"), ("araba", "yla", "mit dem Auto", "1f697"),
        ("taksi", "yle", "mit dem Taxi", "1f695")]
PHRASES = [("Otobüs durağı nerede?", "Wo ist die Bushaltestelle?", "1f68f"),
           ("Bir bilet, lütfen.", "Eine Fahrkarte, bitte.", "1f3ab"),
           ("Bilet ne kadar?", "Was kostet die Fahrkarte?", "1f4b6"),
           ("Otobüs ne zaman geliyor?", "Wann kommt der Bus?", "23f0")]
QUIZ = ["araba", "otobüs", "bisiklet", "tren", "uçak", "gemi", "taksi", "bilet", "havalimanı", "otobüs durağı"]
FLOATERS = ["1f697", "1f68c", "2708", "1f6a2", "1f6b2", "1f686", "1f695", "1f681"]
ICONS = ["1f4cc", "1f693", "231b"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen
# --------------------------------------------------------------------------------------
class CompoundScene(Scene):
    chapter = "Bus + Haltestelle = otobüs durağı"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus eins: Wie entsteht ein Wort wie Bushaltestelle? Im Türkischen stehen beide Wörter "
                        "nebeneinander, und das zweite bekommt eine kleine Endung."), "intro")
        self.wait(0.4)
        for i, (w1, w2, w2b, de, _) in enumerate(COMPOUNDS):
            st = self.t
            self.say(ctx.TR(w1 + "."))
            self.wait(0.2)
            self.say(ctx.TR(w2 + "."))
            self.wait(0.3)
            n = BY_TR.get(f"{w1} {w2b}")  # gleiche (ggf. korrigierte) Aussprache wie auf der Wortkarte
            self.say(n.speak(ctx) if n else ctx.TR(f"{w1} {w2b}."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.5)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Endet das zweite Wort auf k, wird daraus ein weiches g."), "kg")
        self.finish(1.0)
        self.pill = ctx.pill
        self.formula = pill(g, [("Wort 1", "Bold", 44, TEAL), ("  +  ", "Bold", 40, MUTED), ("Wort 2", "Bold", 44, INK),
                                ("-ı / -i / -u / -ü", "ExtraBold", 44, RED),
                                ("     nach Vokal: ", "Medium", 34, MUTED), ("-sı / -si …", "ExtraBold", 40, RED)],
                           h=100, icon="1f4cc")
        self.rows = []
        for w1, w2, w2b, de, emo in COMPOUNDS:
            # gemeinsamen Anfang von w2 und w2b finden → Rest rot, geändertes k→ğ gold
            k = 0
            while k < min(len(w2), len(w2b)) and w2[k] == w2b[k]:
                k += 1
            segs = [(w1, "Bold", 40, TEAL), (" + ", "Bold", 36, MUTED), (w2, "Bold", 40, INK), ("   →   ", "Bold", 36, MUTED),
                    (w1 + " ", "Bold", 46, TEAL), (w2b[:k], "Bold", 46, INK)]
            rest = w2b[k:]
            if k < len(w2):  # Konsonant geändert (k → ğ)
                segs.append((rest[0], "ExtraBold", 46, GOLD))
                rest = rest[1:]
            segs += [(rest, "ExtraBold", 46, RED), (f"     {de}", "Medium", 32, MUTED)]
            self.rows.append(pill(g, [s for s in segs if s[0]], h=94, icon=emo, minw=1400))
        self.kg = pill(g, [("k → ", "Bold", 40, INK), ("ğ", "ExtraBold", 46, GOLD), (":   dura", "Medium", 36, MUTED),
                           ("k", "Bold", 38, INK), (" → dura", "Medium", 36, MUTED), ("ğ", "ExtraBold", 40, GOLD),
                           ("ı", "ExtraBold", 40, RED), ("     ışı", "Medium", 36, MUTED), ("k", "Bold", 38, INK),
                           (" → ışı", "Medium", 36, MUTED), ("ğ", "ExtraBold", 40, GOLD), ("ı", "ExtraBold", 40, RED)],
                      h=84, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 1: Bus + Haltestelle = otobüs durağı", y=100, size=54)
        op, dy = appear(t, self.m("intro")[0] + 2.5)
        put_center(f, self.formula, W / 2, 210 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 345 + i * 108 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("kg")[0]:
            op, dy = appear(t, self.m("kg")[0])
            put_center(f, self.kg, W / 2, 905 + dy, opacity=op)
        for k in ("intro", "kg"):
            if self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        return f


class WithScene(Scene):
    chapter = "mit dem Bus = otobüsle"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus zwei: So sagst du, womit du fährst. Die Endung le oder la heißt: mit."), "intro")
        self.wait(0.4)
        for i, (word, suf, de, _) in enumerate(WITH):
            st = self.t
            self.say(ctx.TR(word + "."))
            self.wait(0.3)
            self.say(ctx.TR(word + suf + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.5)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Nach einem Vokal kommt ein y dazwischen. Zum Beispiel:"), "vowel")
        self.wait(0.3)
        self.say(ctx.TR("Otobüsle gidiyorum."), "ex")
        self.wait(0.25)
        self.say(ctx.DE("Ich fahre mit dem Bus."), "ex_de")
        self.wait(0.15)
        self.span("speak", 2.6)
        self.wait(2.7)
        self.finish(0.3)
        self.pill = ctx.pill
        self.formula = pill(g, [("Wort", "Bold", 48, TEAL), ("  +  ", "Bold", 40, MUTED), ("le / la", "ExtraBold", 52, RED),
                                ("   =   mit …", "SemiBold", 44, INK)], h=100, icon="1f4cc")
        self.rows = []
        for word, suf, de, emo in WITH:
            segs = [(word, "Bold", 48, TEAL), ("  →  ", "Bold", 40, MUTED), (word, "Bold", 48, TEAL)]
            if suf.startswith("y"):
                segs += [("y", "ExtraBold", 48, GOLD), (suf[1:], "ExtraBold", 48, RED)]
            else:
                segs.append((suf, "ExtraBold", 48, RED))
            segs.append((f"     {de}", "Medium", 34, MUTED))
            self.rows.append(pill(g, segs, h=88, icon=emo, minw=900))
        self.example = pill(g, [("Otobüs", "Bold", 54, TEAL), ("le", "ExtraBold", 54, RED), (" gidiyorum.", "Bold", 54, INK),
                                ("    = Ich fahre mit dem Bus.", "Medium", 38, MUTED)], h=104, fill=NOTE_BG, icon="1f68c")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 2: mit dem Bus = otobüsle", y=100, size=56)
        op, dy = appear(t, self.m("intro")[0] + 2.0)
        put_center(f, self.formula, W / 2, 210 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 335 + i * 100 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("ex")[0] - 0.05:
            op, dy = appear(t, self.m("ex")[0] - 0.05)
            put_center(f, self.example, W / 2, 880 + dy, opacity=op)
        for k in ("intro", "vowel", "ex_de"):
            if self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        if self.active(t, "ex"):
            self.pill.draw(f, "tr", self.since(t, "ex"), t, None, cy=1010)
        if self.active(t, "speak"):
            a, b = self.m("speak")
            self.pill.draw(f, "speak", t - a, t, 1 - (t - a) / (b - a), cy=1010)
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Ulaşım", "Verkehrsmittel auf Türkisch",
        [("u · ", "Bold", 46, MUTED), ("la", "Bold", 46, RED), (" · schım", "Bold", 46, MUTED),
         ("   =   der Verkehr", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du fünfundzwanzig Wörter für unterwegs: Verkehrsmittel und Orte wie die Bushaltestelle.",
          "welcome"),
         ("de", "Verkehr heißt auf Türkisch:", "word"), ("tr", "Ulaşım.", "ulasim"), ("tr_slow", "Ulaşım.", "ulasim2")],
        title_mark="ulasim")
    scenes = [title, HowToScene(ctx, BY_TR["otobüs"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        CompoundScene(ctx),
        WithScene(ctx),
        PhraseGridScene(ctx, "Bonus 3: An der Haltestelle", "Bonus drei: vier Sätze für unterwegs.",
                        PHRASES, chapter="Sätze für unterwegs",
                        note=[("nerede", "Bold", 36, RED), (" = wo   ·   ", "Medium", 32, MUTED),
                              ("ne kadar", "Bold", 36, RED), (" = wie viel   ·   ", "Medium", 32, MUTED),
                              ("ne zaman", "Bold", 36, RED), (" = wann   ·   ", "Medium", 32, MUTED),
                              ("lütfen", "Bold", 36, RED), (" = bitte", "Medium", 32, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 25 Verkehrs-Wörter auf einen Blick",
                      "Hier sind alle fünfundzwanzig Wörter auf einen Blick.", cols=5),
        OutroScene(ctx, "İyi yolculuklar!", "Gute Reise!", "Jetzt kennst du 25 Wörter für unterwegs!",
                   ["Super gemacht! Jetzt kennst du fünfundzwanzig Wörter für unterwegs.",
                    "Tipp: Sag bei jeder Fahrt leise auf Türkisch, womit du gerade fährst."],
                   icon="1f68c"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in COMPOUNDS} | {e for *_, e in WITH} | {e for *_, e in PHRASES})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="ulasim_verkehrsmittel_deutsch_tuerkisch.mp4", title="Ulaşım – Verkehrsmittel auf Türkisch")
