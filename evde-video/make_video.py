#!/usr/bin/env python3
"""
Lernvideo „Evde – Einrichtung“: 25 Wörter für Möbel und Dinge in der Wohnung, Deutsch → Türkisch
mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 25 Wortkarten in 3 Kapiteln (Wohnzimmer, Schlafzimmer, Küche & Bad)
  * Bonus 1: Wo? -da / -de / -ta / -te (masada = auf dem Tisch, yatakta = im Bett)
  * Bonus 2: Kedi nerede? – auf / unter / neben dem Tisch (mit Animation)
  * Bonus 3: var / yok – es gibt / es gibt nicht
  * Quiz, Übersicht, Abschluss

Für Möbel ohne Emoji (Tisch, Teppich, Vorhang, Kissen, Schrank, Kühlschrank, Herd …) liegen eigene
Zeichnungen in icons/ (Name „x-….svg“). Die Betonung in den Aussprache-Hinweisen wird aus der
Lautschrift der Stimme übernommen, damit Bild und Ton immer zusammenpassen.

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/evde_einrichtung_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 20  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.nouns import *  # noqa: E402,F401,F403  (Engine + Bausteine für Wortkarten-Videos)
from lernvideo import engine  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
engine.EXTRA_ICON_DIRS.append(os.path.join(HERE, "icons"))
GOLD = (190, 105, 0)

# --------------------------------------------------------------------------------------
# Inhalte  (stress=None: betonte Silbe kommt aus der Lautschrift der Stimme)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Oturma odası", "Wohnzimmer", "1f6cb", [
        N("der Tisch", "masa", "x-table", ["ma", "sa"], None, "Betonung hier auf der ersten Silbe!"),
        N("der Stuhl", "sandalye", "1fa91", ["san", "dal", "je"], None, "y = „j“"),
        N("das Sofa", "kanepe", "1f6cb", ["ka", "ne", "pe"], None, "Wie das deutsche „Kanapee“!"),
        N("der Sessel", "koltuk", "x-armchair", ["kol", "tuk"], None, "koltuk heißt auch: Sitz (im Bus, im Kino)"),
        N("der Teppich", "halı", "x-rug", ["ha", "lı"], None, "ı = dumpfes i  ·  Türk halısı = türkischer Teppich"),
        N("die Lampe", "lamba", "x-lamp", ["lam", "ba"], None),
        N("der Vorhang", "perde", "x-curtain", ["per", "de"], None, "perde heißt auch: der Vorhang im Theater"),
        N("das Bücherregal", "kitaplık", "x-bookshelf", ["ki", "tap", "lık"], None, "kitap = das Buch → kitaplık"),
        N("der Fernseher", "televizyon", "1f4fa", ["te", "le", "wis", "jon"], None, "v ≈ w  ·  z = weiches s"),
        N("das Bild", "tablo", "1f5bc", ["tab", "lo"], None, "tablo heißt auch: die Tabelle"),
    ]),
    Chapter("Yatak odası", "Schlafzimmer", "1f6cf", [
        N("das Bett", "yatak", "1f6cf", ["ja", "tak"], None, "y = „j“"),
        N("das Kissen", "yastık", "x-pillow", ["jas", "tık"], None, "ı = dumpfes i"),
        N("die Decke", "battaniye", "x-blanket", ["bat", "ta", "ni", "je"], None, "tt: das t kurz halten"),
        N("der Schrank", "dolap", "x-wardrobe", ["do", "lap"], None, "auch: der Küchenschrank"),
        N("der Spiegel", "ayna", "1fa9e", ["ai", "na"], None, "ay klingt wie „ei“"),
        N("die Schublade", "çekmece", "x-dresser", ["tschek", "me", "dsche"], None,
          "ç = „tsch“  ·  c = „dsch“  ·  Betonung vorn!"),
        N("die Uhr", "saat", "1f570", ["sa", "at"], None, "saat heißt auch: die Stunde"),
    ]),
    Chapter("Mutfak ve banyo", "Küche & Bad", "1f373", [
        N("der Kühlschrank", "buzdolabı", "x-fridge", ["bus", "do", "la", "bı"], None,
          "wörtlich: Eis-Schrank (buz + dolap)"),
        N("der Backofen", "fırın", "x-oven", ["fı", "rın"], None, "fırın heißt auch: die Bäckerei"),
        N("der Herd", "ocak", "x-stove", ["o", "dschak"], None, "c = „dsch“  ·  Ocak heißt auch: Januar!"),
        N("die Waschmaschine", "çamaşır makinesi", "x-washer", ["tscha", "ma", "schır", "_ma", "ki", "ne", "si"], None,
          "çamaşır = die Wäsche  ·  makine = die Maschine"),
        N("das Waschbecken", "lavabo", "x-sink", ["la", "wa", "bo"], None, "v ≈ w"),
        N("die Badewanne", "küvet", "1f6c1", ["kü", "wet"], None, "v ≈ w"),
        N("die Dusche", "duş", "1f6bf", ["dusch"], 0, "ş = „sch“  ·  u wie in „Dusche“, nicht ö!", tr_say="duuş"),
        N("die Toilette", "tuvalet", "1f6bd", ["tu", "wa", "let"], None, "fast wie „Toilette“"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

LOCATIVE = [("masa", "da", "auf dem Tisch", "x-table"), ("oda", "da", "im Zimmer", "1f6aa"),
            ("ev", "de", "zu Hause", "1f3e0"), ("yatak", "ta", "im Bett", "1f6cf"),
            ("dolap", "ta", "im Schrank", "x-wardrobe")]
POSITIONS = [("üstünde", "auf", "Kedi masanın üstünde.", "Die Katze ist auf dem Tisch."),
             ("altında", "unter", "Kedi masanın altında.", "Die Katze ist unter dem Tisch."),
             ("yanında", "neben", "Kedi masanın yanında.", "Die Katze ist neben dem Tisch.")]
VAR_YOK = [("Odada bir yatak var.", "Im Zimmer gibt es ein Bett.", "1f6cf"),
           ("Mutfakta bir buzdolabı var.", "In der Küche gibt es einen Kühlschrank.", "x-fridge"),
           ("Banyoda küvet yok.", "Im Bad gibt es keine Badewanne.", "1f6c1"),
           ("Evde televizyon yok.", "Zu Hause gibt es keinen Fernseher.", "1f4fa")]
QUIZ = ["masa", "sandalye", "lamba", "ayna", "yatak", "dolap", "buzdolabı", "halı", "ocak", "tablo"]
FLOATERS = ["1fa91", "1f6cb", "1f6cf", "1fa9e", "1f4fa", "x-washer", "x-lamp", "1f570"]
ICONS = ["1f408", "1f4cc", "1f3e0"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen
# --------------------------------------------------------------------------------------
class LocativeScene(Scene):
    chapter = "Wo? -da / -de"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus eins: Wo ist etwas? Dafür hängst du eine kurze Endung an. "
                        "Sie heißt: in, auf oder an."), "intro")
        self.wait(0.4)
        for i, (word, suf, de, _) in enumerate(LOCATIVE):
            st = self.t
            self.say(ctx.TR(word + "."))
            self.wait(0.3)
            self.say(ctx.TR(word + suf + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.6)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Nach einem harten Laut wie k oder p wird aus dem d ein t."), "hard")
        self.wait(0.3)
        self.say(ctx.DE("Das kennst du schon aus dem Verben-Video: im Park, am Telefon."), "known")
        self.finish(0.8)
        self.pill = ctx.pill
        self.formula = pill(g, [("Wort", "Bold", 50, TEAL), ("  +  ", "Bold", 44, MUTED), ("da", "ExtraBold", 56, RED),
                                (" / ", "Bold", 44, MUTED), ("de", "ExtraBold", 56, RED),
                                ("   =   in / auf / an", "SemiBold", 44, INK)], h=106, icon="1f4cc")
        self.rows = []
        for word, suf, de, emo in LOCATIVE:
            col = GOLD if suf.startswith("t") else RED
            self.rows.append(pill(g, [(word, "Bold", 50, TEAL), ("  →  ", "Bold", 42, MUTED), (word, "Bold", 50, TEAL),
                                      (suf, "ExtraBold", 50, col), (f"     {de}", "Medium", 34, MUTED)],
                                  h=92, icon=emo, minw=820))
        self.hard = pill(g, [("nach ç f h k p s ş t:   ", "SemiBold", 34, INK), ("-ta", "ExtraBold", 40, GOLD),
                             (" / ", "Bold", 34, MUTED), ("-te", "ExtraBold", 40, GOLD),
                             ("     ·     kennst du schon: park", "Medium", 32, MUTED), ("ta", "ExtraBold", 36, GOLD),
                             (", telefon", "Medium", 32, MUTED), ("da", "ExtraBold", 36, RED)], h=84, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 1: Wo? -da / -de", y=110, size=60)
        op, dy = appear(t, self.m("intro")[0] + 1.5)
        put_center(f, self.formula, W / 2, 240 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                col, row = (0, i) if i < 3 else (1, i - 3)
                put_center(f, im, 510 + col * 900, 390 + row * 118 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("hard")[0]:
            op, dy = appear(t, self.m("hard")[0])
            put_center(f, self.hard, W / 2, 790 + dy, opacity=op)
        for k in ("intro", "hard", "known"):
            if self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        return f


class PositionScene(Scene):
    """Kedi nerede? – die Katze springt auf, unter und neben den Tisch."""
    chapter = "Kedi nerede? auf · unter · neben"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus zwei: Wo ist die Katze? Das fragst du so:"), "intro")
        self.wait(0.3)
        self.say(ctx.TR("Kedi nerede?"), "q")
        self.wait(0.6)
        for i, (word, de_word, tr, de) in enumerate(POSITIONS):
            st = self.t
            self.say(ctx.TR(tr), f"tr{i}")
            self.wait(0.3)
            self.say(ctx.DE(de), f"de{i}")
            self.wait(0.15)
            self.span(f"speak{i}", 2.6)
            self.wait(2.7)
            self.marks[f"pos{i}"] = (st, self.t)
        self.finish(0.4)
        self.pill = ctx.pill
        self.table = g.emoji("x-table", 520)
        self.cat = g.emoji("1f408", 210)
        self.question = text_layer(g, [("Kedi nerede?", "ExtraBold", 64, RED), ("   =  Wo ist die Katze?", "Medium", 40, MUTED)])
        self.sent = []
        for word, de_word, tr, de in POSITIONS:
            i = tr.find(word)
            segs = [(tr[:i], "Bold", 56, INK), (word, "ExtraBold", 56, RED), (tr[i + len(word):], "Bold", 56, INK)]
            self.sent.append((text_layer(g, segs), text_layer(g, [(de, "Medium", 38, MUTED)])))
        self.chips = [pill(g, [(word, "ExtraBold", 42, RED), (f"  = {de_word}", "SemiBold", 36, INK)], h=80, minw=330)
                      for word, de_word, *_ in POSITIONS]
        self.chips_hot = [pill(g, [(word, "ExtraBold", 42, RED), (f"  = {de_word}", "SemiBold", 36, INK)], h=80, minw=330,
                               fill=RED_SOFT, outline=RED, ow=4) for word, de_word, *_ in POSITIONS]
        self.note = text_layer(g, [("masanın", "Bold", 32, TEAL), (" = des Tisches", "Medium", 30, MUTED)])
        # Katzen-Positionen relativ zum Tisch (Mitte 1060/690, 520 px groß)
        tx, ty = 1080, 690
        self.tx, self.ty = tx, ty
        self.spots = [(tx, ty - 205), (tx, ty + 150), (tx + 400, ty + 150)]
        self.home = (tx - 430, ty + 150)

    def cat_pos(self, t):
        pos = self.home
        for i in range(len(POSITIONS)):
            st = self.m(f"tr{i}")[0]
            if t >= st:
                p = ease_out_cubic((t - st) / 0.6)
                hop = math.sin(min(1.0, (t - st) / 0.6) * math.pi) * 90
                prev = pos
                pos = (prev[0] + (self.spots[i][0] - prev[0]) * p, prev[1] + (self.spots[i][1] - prev[1]) * p - hop)
        return pos

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 2: Kedi nerede?", y=105, size=60)
        d = ImageDraw.Draw(f)
        d.rounded_rectangle([640, self.ty + 252, 1720, self.ty + 260], 4, fill=LINE)
        put_center(f, self.table, self.tx, self.ty)
        x, y = self.cat_pos(t)
        put_center(f, self.cat, x, y + math.sin(t * 3) * 3)
        cur = -1
        for i in range(len(POSITIONS)):
            if t >= self.m(f"tr{i}")[0]:
                cur = i
        if cur < 0:
            if t >= self.m("q")[0]:
                place(f, self.question, W / 2, 215, 64, opacity=clamp(self.since(t, "q") / 0.3), align="center")
        else:
            tr, de = self.sent[cur]
            op = clamp((t - self.m(f"tr{cur}")[0]) / 0.3)
            place(f, tr, W / 2, 205, 56, opacity=op, align="center")
            if t >= self.m(f"de{cur}")[0]:
                place(f, de, W / 2, 280, 38, opacity=clamp(self.since(t, f"de{cur}") / 0.3), align="center")
        for i in range(len(POSITIONS)):
            if t >= self.m(f"tr{i}")[0]:
                im = self.chips_hot[i] if i == cur else self.chips[i]
                op, dy = appear(t, self.m(f"tr{i}")[0])
                put_center(f, im, 300, 450 + i * 110 + dy, opacity=op)
        if cur >= 0:
            place(f, self.note, 300, 790, 32, opacity=clamp((t - self.m("tr0")[0]) / 0.5), align="center")
        order = ["intro", "q"] + [k for i in range(len(POSITIONS)) for k in (f"tr{i}", f"de{i}", f"speak{i}")]
        mapping = {"intro": "de", "q": "tr"}
        for i in range(len(POSITIONS)):
            mapping.update({f"tr{i}": "tr", f"de{i}": "de", f"speak{i}": "speak"})
        state, since, prog, playing = state_at(self, t, order, mapping)
        self.pill.draw(f, state, since, t, prog, cy=1010, bars=playing and prog is None)
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Evde", "Einrichtung auf Türkisch",
        [("ev", "Bold", 46, RED), (" = das Haus    ·    ", "Medium", 44, MUTED),
         ("evde", "Bold", 46, RED), (" = zu Hause", "Medium", 44, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du fünfundzwanzig Wörter für dein Zuhause: Möbel und Dinge in der Wohnung.", "welcome"),
         ("de", "Zu Hause heißt auf Türkisch:", "word"), ("tr", "Evde.", "evde"), ("tr_slow", "Evde.", "evde2")],
        title_mark="evde")
    scenes = [title, HowToScene(ctx, BY_TR["masa"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        LocativeScene(ctx),
        PositionScene(ctx),
        PhraseGridScene(ctx, "Bonus 3: var und yok", "Bonus drei: So sagst du, was es in einem Zimmer gibt und was nicht.",
                        VAR_YOK, chapter="var / yok – es gibt / es gibt nicht",
                        note=[("var", "ExtraBold", 40, RED), (" = es gibt    ·    ", "Medium", 34, MUTED),
                              ("yok", "ExtraBold", 40, RED), (" = es gibt nicht    ·    ", "Medium", 34, MUTED),
                              ("oda", "Bold", 38, TEAL), (" = das Zimmer", "Medium", 34, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 25 Wörter auf einen Blick",
                      "Hier sind alle fünfundzwanzig Wörter auf einen Blick.", cols=5),
        OutroScene(ctx, "Çok iyi!", "Sehr gut!", "Jetzt kennst du 25 Wörter für dein Zuhause!",
                   ["Super gemacht! Jetzt kennst du fünfundzwanzig Wörter für dein Zuhause.",
                    "Tipp: Klebe kleine Zettel mit den türkischen Wörtern auf deine Möbel."],
                   icon="1f3e0"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in LOCATIVE} | {e for *_, e in VAR_YOK})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="evde_einrichtung_deutsch_tuerkisch.mp4", title="Evde – Einrichtung auf Türkisch")
