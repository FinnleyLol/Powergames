#!/usr/bin/env python3
"""
Lernvideo „Hayvanlar – Tiere“: Deutsch → Türkisch mit türkischer Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * Titel, Anleitung und Aussprache-Regeln (ş, ç, c, ı, ğ, y, z, v)
  * 30 Tierkarten in 4 Kapiteln (deutsches Wort → türkisches Wort normal + langsam
    → Pause zum Nachsprechen)
  * Mini-Dialog „Bu ne?“, Mehrzahl mit -lar/-ler, Quiz, Übersicht, Abschluss

Die gemeinsame Technik (Stimmen, Grafik, Rendern) steckt in ../lernvideo/engine.py.

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/hayvanlar_tiere_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 14  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import math
import os
import random
import sys
from dataclasses import dataclass, field

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.engine import *  # noqa: E402,F401,F403  (Engine: Audio, Grafik, Szenen, Rendern)

HERE = os.path.dirname(os.path.abspath(__file__))

# --------------------------------------------------------------------------------------
# Inhalte
# --------------------------------------------------------------------------------------
@dataclass
class Animal:
    de: str            # Anzeige Deutsch (mit Artikel)
    tr: str            # Türkisch
    emoji: str         # Twemoji-Code
    syl: list          # Aussprache-Silben (deutsche Schreibweise)
    stress: int        # Index der betonten Silbe
    note: str = ""     # Aussprache-Tipp
    de_say: str = ""   # Was die deutsche Stimme sagt (falls abweichend)


@dataclass
class Chapter:
    tr: str
    de: str
    icon: str
    animals: list = field(default_factory=list)


CHAPTERS = [
    Chapter("Evcil hayvanlar", "Haustiere", "1f3e0", [
        Animal("der Hund", "köpek", "1f415", ["kö", "pek"], 1, "Rot = betonte Silbe – meistens die letzte"),
        Animal("die Katze", "kedi", "1f408", ["ke", "di"], 1),
        Animal("der Vogel", "kuş", "1f426", ["kusch"], 0, "ş = „sch“ wie in Schule"),
        Animal("der Fisch", "balık", "1f41f", ["ba", "lık"], 1, "ı = dumpfes i, wie das e in „bitte“"),
        Animal("der Hase / das Kaninchen", "tavşan", "1f407", ["taw", "schan"], 1, "v ≈ w  ·  ş = „sch“",
               de_say="der Hase, oder das Kaninchen"),
    ]),
    Chapter("Çiftlik hayvanları", "Bauernhoftiere", "1f33e", [
        Animal("das Pferd", "at", "1f40e", ["at"], 0, "Nur zwei Buchstaben – leicht zu merken!"),
        Animal("die Kuh", "inek", "1f404", ["i", "nek"], 1),
        Animal("das Schaf", "koyun", "1f411", ["ko", "jun"], 1, "y = „j“"),
        Animal("die Ziege", "keçi", "1f410", ["ke", "tschi"], 1, "ç = „tsch“ wie in Quatsch"),
        Animal("das Schwein", "domuz", "1f416", ["do", "mus"], 1, "z = weiches, summendes s wie in „Sonne“"),
        Animal("der Esel", "eşek", "1facf", ["e", "schek"], 1, "ş = „sch“"),
        Animal("das Huhn", "tavuk", "1f414", ["ta", "wuk"], 1, "v ≈ w"),
        Animal("das Küken", "civciv", "1f425", ["dschiw", "dschiw"], 1, "c = „dsch“ wie in Dschungel  ·  v ≈ w"),
        Animal("die Ente", "ördek", "1f986", ["ör", "dek"], 1, "ö wie im Deutschen"),
    ]),
    Chapter("Vahşi hayvanlar", "Wilde Tiere", "1f333", [
        Animal("der Löwe", "aslan", "1f981", ["as", "lan"], 1, "s ist im Türkischen immer scharf, wie „ß“"),
        Animal("der Tiger", "kaplan", "1f405", ["kap", "lan"], 1),
        Animal("der Bär", "ayı", "1f43b", ["a", "jı"], 1, "y = „j“  ·  ı = dumpfes i"),
        Animal("der Wolf", "kurt", "1f43a", ["kurt"], 0, "r mit der Zungenspitze, leicht gerollt"),
        Animal("der Fuchs", "tilki", "1f98a", ["til", "ki"], 1),
        Animal("der Elefant", "fil", "1f418", ["fil"], 0),
        Animal("der Affe", "maymun", "1f412", ["mai", "mun"], 1, "ay klingt wie „ei“ in Mai"),
        Animal("die Giraffe", "zürafa", "1f992", ["sü", "ra", "fa"], 2, "z = weiches s  ·  ü wie im Deutschen"),
        Animal("das Kamel", "deve", "1f42a", ["de", "we"], 1, "v ≈ w"),
        Animal("die Schlange", "yılan", "1f40d", ["jı", "lan"], 1, "y = „j“  ·  ı = dumpfes i"),
    ]),
    Chapter("Küçük hayvanlar", "Kleine Tiere", "1f50d", [
        Animal("die Maus", "fare", "1f401", ["fa", "re"], 1, "r leicht gerollt"),
        Animal("der Frosch", "kurbağa", "1f438", ["kur", "baa"], 1, "ğ ist stumm – das a davor wird lang"),
        Animal("die Schildkröte", "kaplumbağa", "1f422", ["kap", "lum", "baa"], 2, "ğ ist stumm – das a davor wird lang"),
        Animal("der Schmetterling", "kelebek", "1f98b", ["ke", "le", "bek"], 2),
        Animal("die Biene", "arı", "1f41d", ["a", "rı"], 1, "ı = dumpfes i  ·  r leicht gerollt"),
        Animal("die Ameise", "karınca", "1f41c", ["ka", "rın", "dscha"], 2, "c = „dsch“  ·  ı = dumpfes i"),
    ]),
]
ALL_ANIMALS = [a for ch in CHAPTERS for a in ch.animals]
BY_TR = {a.tr: a for a in ALL_ANIMALS}
NUM_WORDS = {1: "eins", 2: "zwei", 3: "drei", 4: "vier"}

# (Buchstabe, Erklärung kurz, deutsche Sprechertext, Beispielwort, Hervorhebung)
PRONUNCIATION = [
    ("ş", "wie „sch“", "Das S mit Häkchen klingt wie das sch in Schule.", "kuş"),
    ("ç", "wie „tsch“", "Das C mit Häkchen klingt wie das tsch in Quatsch.", "keçi"),
    ("c", "wie „dsch“", "Das normale C klingt wie das dsch in Dschungel.", "civciv"),
    ("ı", "dumpfes i (wie e in „bitte“)", "Das I ohne Punkt ist ein dumpfes i, wie das e in bitte.", "balık"),
    ("ğ", "stumm – Vokal davor wird lang", "Das weiche G spricht man nicht. Es macht den Vokal davor lang.", "kurbağa"),
    ("y", "wie „j“", "Das Y klingt wie ein deutsches J.", "koyun"),
    ("z", "weiches s wie in „Sonne“", "Das Z ist ein weiches, summendes S, wie in Sonne.", "zürafa"),
    ("v", "fast wie „w“", "Das V klingt fast wie ein W.", "tavuk"),
]

DIALOG = ["kedi", "aslan", "kelebek"]
PLURAL = [  # (Einzahl, Mehrzahl, Deutsch Einzahl, Deutsch Mehrzahl, emoji)
    ("hayvan", "hayvanlar", "Tier", "Tiere", "1f43e"),
    ("kuş", "kuşlar", "Vogel", "Vögel", "1f426"),
    ("aslan", "aslanlar", "Löwe", "Löwen", "1f981"),
    ("kedi", "kediler", "Katze", "Katzen", "1f408"),
    ("köpek", "köpekler", "Hund", "Hunde", "1f415"),
]
QUIZ = ["tavşan", "keçi", "aslan", "kelebek", "ördek", "ayı", "zürafa", "kurbağa",
        "civciv", "maymun", "karınca", "eşek"]

ICONS = ["1f442", "1f40c", "1f5e3", "1f914", "2705", "1f4a1", "1f9e0", "1f389", "1f1e9-1f1ea",
         "1f1f9-1f1f7", "27a1", "1f4ac", "1f4da", "1f44b", "2753", "1f43e", "1f50a"]


# ---------------------------- Titel ----------------------------------------------------
class TitleScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.6)
        self.sfx("chord")
        self.say(ctx.TR("Merhaba!"), "hello")
        self.wait(0.4)
        self.say(ctx.DE("Willkommen! Heute lernst du dreißig Tiere auf Türkisch."), "welcome")
        self.wait(0.3)
        self.say(ctx.DE("Das Wort für Tiere heißt:"), "word")
        self.wait(0.25)
        self.say(ctx.TR("Hayvanlar."), "hayvanlar")
        self.wait(0.5)
        self.say(ctx.TR("Hayvanlar.", slow=True), "hayvanlar2")
        self.finish(1.0)

        self.title = text_layer(g, [("Hayvanlar", "ExtraBold", 210, RED)])
        self.sub = text_layer(g, [("Tiere auf Türkisch", "SemiBold", 68, INK)])
        self.hint = text_layer(g, [("hai · wan · ", "Medium", 46, MUTED), ("lar", "Bold", 46, RED),
                                   ("   =   die Tiere", "Medium", 46, MUTED)])
        self.merhaba = text_layer(g, [("Merhaba!", "Bold", 54, TEAL), ("  –  Hallo!", "Medium", 54, MUTED)])
        lang = text_layer(g, [("Deutsch  ", "SemiBold", 40, INK), ("→", "SemiBold", 40, RED),
                              ("  Türkçe   ·   mit Aussprache", "SemiBold", 40, INK)])
        self.lang, lpad = box(lang.width + 170, 84, 42, WHITE, blur=14, sh_alpha=35)
        put_center(self.lang, g.emoji("1f1e9-1f1ea", 48), lpad + 52, lpad + 42)
        put_center(self.lang, g.emoji("1f1f9-1f1f7", 48), lpad + lang.width + 120, lpad + 42)
        put(self.lang, lang, lpad + 85, lpad + 42 - lang.baseline + 13)
        self.floaters = [("1f415", 260, 1590, 300), ("1f408", 220, 330, 290), ("1f981", 250, 300, 800),
                         ("1f418", 260, 1620, 810), ("1f438", 170, 180, 525), ("1f98b", 160, 1320, 190),
                         ("1f422", 170, 1745, 545), ("1f426", 150, 590, 170)]

    def render(self, t):
        f = self.ctx.gfx.bg.copy()
        for i, (code, size, x, y) in enumerate(self.floaters):
            p = ease_out_back((t - 0.1 * i) / 0.6)
            dy = math.sin(t * 1.6 + i) * 12
            put_center(f, self.g.emoji(code, size), x, y + dy, opacity=clamp((t - 0.1 * i) / 0.3),
                       scale=max(0.01, 0.5 + 0.5 * p))
        pulse = 1.0
        for mk in ("hayvanlar", "hayvanlar2"):
            if self.active(t, mk):
                pulse = 1 + 0.04 * math.sin(self.since(t, mk) * 10)
        put_center(f, self.title, W / 2, 435, opacity=clamp(t / 0.5), scale=pulse * (0.9 + 0.1 * ease_out_cubic(t / 0.6)))
        put_center(f, self.sub, W / 2, 652, opacity=clamp((t - 0.3) / 0.5))
        put_center(f, self.lang, W / 2, 770, opacity=clamp((t - 0.5) / 0.5))
        if t >= self.m("hello")[0]:
            put_center(f, self.merhaba, W / 2, 200, opacity=clamp(self.since(t, "hello") / 0.3))
        if t >= self.m("hayvanlar")[0]:
            put_center(f, self.hint, W / 2, 895, opacity=clamp(self.since(t, "hayvanlar") / 0.3))
        return f


# ---------------------------- Anleitung -----------------------------------------------
class HowToScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("So funktioniert es."), "intro")
        self.wait(0.25)
        self.say(ctx.DE("Zuerst hörst du das deutsche Wort."), "s1")
        self.wait(0.25)
        self.say(ctx.DE("Dann hörst du das türkische Wort: einmal normal, und einmal langsam."), "s2")
        self.wait(0.25)
        self.say(ctx.DE("In der Pause sprichst du laut nach!"), "s3")
        self.wait(0.35)
        self.say(ctx.DE("Die rote Silbe wird betont. Meistens ist das die letzte Silbe."), "s4")
        self.wait(0.35)
        self.say(ctx.DE("Übrigens: Im Türkischen gibt es keine Artikel. Kein der, die, das!"), "s5")
        self.finish(0.8)

        steps = [("1f442", "1. Hören", "Erst Deutsch,", "dann Türkisch"),
                 ("1f40c", "2. Langsam", "Das türkische Wort", "noch einmal langsam"),
                 ("1f5e3", "3. Nachsprechen", "In der Pause", "laut nachsprechen!")]
        self.cards = []
        for icon, title, l1, l2 in steps:
            imgs = []
            for hot in (False, True):
                im, pad = box(500, 400, 40, WHITE, outline=RED if hot else None, ow=6 if hot else 0)
                put_center(im, g.emoji(icon, 130), pad + 250, pad + 110)
                tt = text_layer(g, [(title, "Bold", 48, RED if hot else INK)])
                put(im, tt, pad + 250 - tt.width / 2, pad + 240 - tt.baseline)
                for j, line in enumerate((l1, l2)):
                    lt = text_layer(g, [(line, "Medium", 34, MUTED)])
                    put(im, lt, pad + 250 - lt.width / 2, pad + 300 + j * 48 - lt.baseline)
                imgs.append((im, pad))
            self.cards.append(imgs)
        self.tip1 = self._tip("1f4a1", [("Betonung: ", "SemiBold", 40, INK), ("kö · ", "Bold", 44, MUTED),
                                        ("pek", "Bold", 44, RED), ("   –  die rote Silbe betonen", "Medium", 38, MUTED)])
        self.tip2 = self._tip("1f4ac", [("Keine Artikel: ", "SemiBold", 40, INK),
                                        ("der Hund = köpek,  die Katze = kedi", "Medium", 38, MUTED)])

    def _tip(self, icon, segs):
        lay = text_layer(self.g, segs)
        im, pad = box(lay.width + 130, 90, 45, NOTE_BG, blur=12, sh_alpha=30)
        put_center(im, self.g.emoji(icon, 50), pad + 55, pad + 45)
        put(im, lay, pad + 95, pad + 45 - lay.baseline + 14)
        return im

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "So lernst du mit diesem Video", y=175, size=66)
        for i, imgs in enumerate(self.cards):
            mk = f"s{i + 1}"
            st = self.m(mk)[0]
            hot = self.active(t, mk) or (i == 2 and self.m("s3")[1] <= t < self.m("s4")[0])
            im, pad = imgs[1 if hot else 0]
            p = ease_out_cubic((t - st + 0.1) / 0.45)
            x = 160 + i * 560 + 250
            put_center(f, im, x, 500 + (1 - p) * 40, opacity=clamp((t - st + 0.1) / 0.3))
        if t >= self.m("s4")[0]:
            put_center(f, self.tip1, W / 2, 820, opacity=clamp(self.since(t, "s4") / 0.3))
        if t >= self.m("s5")[0]:
            put_center(f, self.tip2, W / 2, 950, opacity=clamp(self.since(t, "s5") / 0.3))
        return f


# ---------------------------- Aussprache ----------------------------------------------
class PronunciationScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Zuerst die Aussprache. Diese Buchstaben klingen im Türkischen anders."), "intro")
        self.wait(0.4)
        for i, (_, _, de_text, word) in enumerate(PRONUNCIATION):
            st = self.t
            self.say(ctx.DE(de_text))
            self.wait(0.3)
            self.say(ctx.TR(word + "."), f"w{i}")
            self.wait(0.35)
            self.say(ctx.TR(word + ".", slow=True))
            self.wait(0.6)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Ö und Ü sprichst du genau wie im Deutschen."), "outro")
        self.finish(0.8)

        self.rows = []
        rw, rh = 820, 150
        for letter, expl, _, word in PRONUNCIATION:
            a = BY_TR[word]
            pair = []
            for hot in (False, True):
                im, pad = box(rw, rh, 30, RED_SOFT if hot else WHITE, outline=RED if hot else None,
                              ow=4 if hot else 0, blur=12, sh_alpha=30, sh_dy=5)
                lt = text_layer(g, [(letter, "ExtraBold", 96, RED)])
                put(im, lt, pad + 80 - lt.width / 2, pad + 108 - lt.baseline)
                ef = g.fit("SemiBold", expl, 34, 420)
                et = text_layer(g, [(expl, "SemiBold", ef.size, INK)])
                put(im, et, pad + 160, pad + 62 - et.baseline + 8)
                segs = []
                for ch in word:
                    segs.append((ch, "Bold", 40, RED if ch == letter else TEAL))
                segs.append(("  (" + a.de.split(" / ")[0] + ")", "Medium", 28, MUTED))
                wt = text_layer(g, segs)
                put(im, wt, pad + 160, pad + 118 - wt.baseline + 8)
                put_center(im, g.emoji(a.emoji, 104), pad + rw - 85, pad + rh / 2)
                pair.append((im, pad))
            self.rows.append(pair)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Aussprache: Diese Buchstaben sind anders", y=120, size=58)
        cur = -1
        for i in range(len(self.rows)):
            if t >= self.m(f"row{i}")[0]:
                cur = i
        for i, pair in enumerate(self.rows):
            col, row = divmod(i, 4)
            cx = 520 + col * 880
            cy = 260 + row * 185
            hot = i == cur and t < self.m("outro")[0]
            im, pad = pair[1 if hot else 0]
            if i <= cur:
                op = 1.0
            else:
                op = 0.35 * clamp((t - 0.2 - i * 0.06) / 0.4)
            sc = 1.0 + (0.025 * ease_out_back(self.since(t, f"row{i}") / 0.35) if hot else 0)
            put_center(f, im, cx, cy, opacity=op, scale=sc)
        if t >= self.m("outro")[0]:
            tip = text_layer(self.g, [("ö", "Bold", 44, RED), (" und ", "Medium", 40, INK), ("ü", "Bold", 44, RED),
                                      (" klingen genau wie im Deutschen", "Medium", 40, INK)])
            put_center(f, tip, W / 2, 1010, opacity=clamp(self.since(t, "outro") / 0.3))
        return f


# ---------------------------- Kapitel -------------------------------------------------
class ChapterScene(Scene):
    def __init__(self, ctx, num, ch: Chapter):
        super().__init__(ctx)
        g = self.g
        self.ch = ch
        self.wait(0.2)
        self.sfx("chord")
        self.say(ctx.DE(f"Kapitel {NUM_WORDS[num]}: {ch.de}."), "de")
        self.wait(0.3)
        self.say(ctx.TR(ch.tr + "."), "tr")
        self.finish(0.9)
        self.kap = text_layer(g, [(f"BÖLÜM {num}", "SemiBold", 36, RED), (f"  ·  KAPITEL {num}", "SemiBold", 36, MUTED)])
        self.trl = text_layer(g, [(ch.tr, "ExtraBold", 130, RED)])
        self.del_ = text_layer(g, [(ch.de, "SemiBold", 70, TEAL)])
        self.icons = [a.emoji for a in ch.animals]

    def render(self, t):
        f = self.g.bg.copy()
        put_center(f, self.g.emoji(self.ch.icon, 170), W / 2, 230, opacity=clamp(t / 0.3),
                   scale=0.6 + 0.4 * ease_out_back(t / 0.5))
        put_center(f, self.kap, W / 2, 380, opacity=clamp((t - 0.1) / 0.3))
        put_center(f, self.del_, W / 2, 470, opacity=clamp((t - 0.2) / 0.3))
        if t >= self.m("tr")[0] - 0.1:
            s = self.since(t, "tr") + 0.1
            put_center(f, self.trl, W / 2, 610, opacity=clamp(s / 0.3), scale=0.92 + 0.08 * ease_out_back(s / 0.4))
        n = len(self.icons)
        for i, code in enumerate(self.icons):
            x = W / 2 + (i - (n - 1) / 2) * 150
            p = (t - 0.4 - i * 0.08) / 0.4
            put_center(f, self.g.emoji(code, 110), x, 860 + math.sin(t * 2 + i) * 6, opacity=clamp(p),
                       scale=max(0.01, 0.5 + 0.5 * ease_out_back(p)))
        return f


# ---------------------------- Vokabelkarte --------------------------------------------
CARD_X, CARD_Y, CARD_S = 110, 185, 740
RX, RW = 930, 880


def card_base(ctx: Ctx):
    g = ctx.gfx
    base = g.bg.copy()
    im, pad = box(CARD_S, CARD_S, 56, WHITE, blur=26, sh_alpha=60, sh_dy=16)
    base.paste(im, (CARD_X - pad, CARD_Y - pad), im)
    put_center(base, g.emoji("1f1e9-1f1ea", 44), RX + 22, 232)
    lab = text_layer(g, [("DEUTSCH", "SemiBold", 30, MUTED)])
    put(base, lab, RX + 62, 232 - lab.baseline + 11)
    ImageDraw.Draw(base).rounded_rectangle([RX, 404, RX + RW, 408], 2, fill=LINE)
    put_center(base, g.emoji("1f1f9-1f1f7", 44), RX + 22, 462)
    lab = text_layer(g, [("TÜRKÇE", "SemiBold", 30, MUTED)])
    put(base, lab, RX + 62, 462 - lab.baseline + 11)
    return base


def pron_layer(g: Gfx, a: Animal):
    segs = [("Aussprache:  ", "Medium", 36, MUTED)]
    for i, s in enumerate(a.syl):
        if i:
            segs.append((" · ", "Medium", 50, MUTED))
        segs.append((s, "Bold", 54, RED if i == a.stress else INK))
    lay = text_layer(g, segs)
    im, pad = box(lay.width + 60, 96, 48, WHITE, blur=12, sh_alpha=30, sh_dy=5)
    put(im, lay, pad + 30, pad + 48 - lay.baseline + 17)
    return im, pad


def note_layer(g: Gfx, text):
    lay = text_layer(g, [(text, "Medium", g.fit("Medium", text, 34, RW - 120).size, INK)])
    im, pad = box(min(RW, lay.width + 110), 76, 38, NOTE_BG, blur=10, sh_alpha=25, sh_dy=4)
    put_center(im, g.emoji("1f4a1", 42), pad + 44, pad + 38)
    put(im, lay, pad + 76, pad + 38 - lay.baseline + 12)
    return im, pad


class CardScene(Scene):
    def __init__(self, ctx, a: Animal, ch: Chapter, idx: int, total: int):
        super().__init__(ctx)
        g = self.g
        self.a, self.ch, self.idx, self.total = a, ch, idx, total
        self.sfx("pop", at=0.05)
        self.wait(0.55)
        self.say(ctx.DE(a.de_say or a.de), "de")
        self.wait(0.4)
        self.say(ctx.TR(a.tr + "."), "tr")
        self.wait(0.55)
        slow = ctx.TR(a.tr + ".", slow=True)
        self.say(slow, "slow")
        self.wait(0.15)
        rep = max(2.4, 1.3 * len(slow) / SR + 1.2)
        self.span("speak", rep)
        self.wait(rep)
        self.finish(0.25)

        self.base = ctx.card_base.copy()
        self.title_bar(self.base, ch.icon, ch.tr, ch.de, right=f"{idx} / {total}", progress=idx / total)
        self.emo = g.emoji(a.emoji, 620)
        fde = g.fit("SemiBold", a.de, 84, RW)
        self.del_ = text_layer(g, [(a.de, "SemiBold", fde.size, TEAL)])
        ftr = g.fit("ExtraBold", a.tr, 180, RW)
        self.trl = text_layer(g, [(a.tr, "ExtraBold", ftr.size, RED)])
        self.pron = pron_layer(g, a)
        self.note = note_layer(g, a.note) if a.note else None
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 540 / 620))
        s = t - 0.25
        put(f, self.del_, RX - 12, 350 - self.del_.baseline + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.3))
        if t >= self.m("tr")[0] - 0.05:
            s = self.since(t, "tr") + 0.05
            pulse = 1 + (0.03 * math.sin(self.since(t, "slow") * 8) if self.active(t, "slow") else 0)
            sc = (0.85 + 0.15 * ease_out_back(s / 0.4)) * pulse
            im = self.trl
            put_center(f, im, RX - 12 + im.width * 1.0 / 2, 640 - im.baseline + im.height / 2,
                       opacity=clamp(s / 0.25), scale=sc)
            im, pad = self.pron
            put(f, im, RX - pad, 700 - pad + (1 - ease_out_cubic((s - 0.25) / 0.35)) * 16, clamp((s - 0.25) / 0.3))
        if self.note and t >= self.m("slow")[0]:
            s = self.since(t, "slow")
            im, pad = self.note
            put(f, im, RX - pad, 822 - pad + (1 - ease_out_cubic(s / 0.35)) * 16, clamp(s / 0.3))
        state, since, prog = None, 0, None
        for k in ("de", "tr", "slow", "speak"):
            if self.active(t, k):
                state, since = k, self.since(t, k)
        if state is None and self.m("slow")[1] <= t < self.m("speak")[0]:
            state, since = "slow", self.since(t, "slow")
        if state == "speak":
            a, b = self.m("speak")
            prog = 1 - (t - a) / (b - a)
        self.pill.draw(f, state, since, t, prog)
        return f


# ---------------------------- Dialog --------------------------------------------------
class DialogScene(Scene):
    def __init__(self, ctx, word, first):
        super().__init__(ctx)
        g = self.g
        a = BY_TR[word]
        self.a = a
        self.first = first
        self.wait(0.3)
        if first:
            self.say(ctx.DE("Jetzt ein kleiner Dialog. So fragst du: Was ist das?"), "intro")
            self.wait(0.3)
        self.say(ctx.TR("Bu ne?"), "q")
        self.wait(0.3)
        if first:
            self.say(ctx.DE("Und so antwortest du:"), "de1")
            self.wait(0.3)
        else:
            self.span("ask", 2.2)
            self.wait(2.2)
        self.say(ctx.TR(f"Bu bir {word}."), "a")
        self.wait(0.4)
        art = a.de.split(" / ")[0].split(" ")[0]
        noun = a.de.split(" / ")[0].split(" ", 1)[1]
        ein = {"der": "ein", "das": "ein", "die": "eine"}[art]
        self.de_answer = f"Das ist {ein} {noun}."
        self.say(ctx.DE(self.de_answer), "de2")
        self.wait(0.3)
        self.say(ctx.TR(f"Bu bir {word}.", slow=True), "a2")
        self.span("speak", 2.6)
        self.wait(2.6)
        self.finish(0.3)

        self.base = g.bg.copy()
        self.heading(self.base, "Mini-Dialog: Bu ne?  –  Was ist das?", y=150, size=60)
        im, pad = box(560, 560, 50, WHITE, blur=24, sh_alpha=55)
        self.base.paste(im, (150 - pad, 260 - pad), im)
        self.emo = g.emoji(a.emoji, 440)
        self.q = self._bubble("Bu ne?", "Was ist das?", TEAL, left=True)
        self.ans = self._bubble(f"Bu bir {word}.", self.de_answer, RED, left=False)
        tip = text_layer(g, [("bu", "Bold", 36, RED), (" = das/dies    ", "Medium", 34, MUTED),
                             ("ne", "Bold", 36, RED), (" = was    ", "Medium", 34, MUTED),
                             ("bir", "Bold", 36, RED), (" = ein/eine", "Medium", 34, MUTED)])
        self.tip, tpad = box(tip.width + 70, 74, 37, NOTE_BG, blur=10, sh_alpha=25)
        put(self.tip, tip, tpad + 35, tpad + 37 - tip.baseline + 12)
        self.pill = ctx.pill

    def _bubble(self, tr, de, color, left):
        g = self.g
        t1 = text_layer(g, [(tr, "ExtraBold", 84, color)])
        t2 = text_layer(g, [(de, "Medium", 40, MUTED)])
        w = max(t1.width, t2.width) + 90
        im, pad = box(w, 200, 44, WHITE, blur=18, sh_alpha=45)
        d = ImageDraw.Draw(im)
        tx = pad + (50 if left else w - 50)
        d.polygon([(tx - 26, pad + 198), (tx + 26, pad + 198), (tx + (-30 if left else 30), pad + 240)], fill=WHITE)
        put(im, t1, pad + 45 - 12, pad + 100 - t1.baseline)
        put(im, t2, pad + 45 - 12, pad + 165 - t2.baseline)
        return im

    def render(self, t):
        f = self.base.copy()
        put_center(f, self.emo, 430, 540 + math.sin(t * 2) * 6, opacity=clamp(t / 0.3),
                   scale=0.7 + 0.3 * ease_out_back(t / 0.5))
        if t >= self.m("q")[0] - 0.05:
            s = self.since(t, "q") + 0.05
            put(f, self.q, 820, 250 + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.25))
        if t >= self.m("a")[0] - 0.05:
            s = self.since(t, "a") + 0.05
            put(f, self.ans, 1810 - self.ans.width + 40, 540 + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.25))
        put_center(f, self.tip, W / 2, 890, opacity=clamp((t - 0.4) / 0.4))
        state, since, prog = None, 0, None
        for k in ("q", "a", "a2"):
            if self.active(t, k):
                state, since = ("slow" if k == "a2" else "tr"), self.since(t, k)
        for k in ("intro", "de1", "de2"):
            if self.active(t, k):
                state, since = "de", self.since(t, k)
        if self.active(t, "ask"):
            state, since = "ask", self.since(t, "ask")
            a, b = self.m("ask")
            prog = 1 - (t - a) / (b - a)
        if self.active(t, "speak"):
            state, since = "speak", self.since(t, "speak")
            a, b = self.m("speak")
            prog = 1 - (t - a) / (b - a)
        self.pill.draw(f, state, since, t, prog)
        return f


# ---------------------------- Mehrzahl ------------------------------------------------
class PluralScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Die Mehrzahl ist im Türkischen ganz einfach: Man hängt eine Endung an."), "intro")
        self.wait(0.25)
        self.say(ctx.DE("Welche Endung, das hängt vom letzten Vokal ab."), "rule")
        self.wait(0.4)
        for i, (sg, pl, *_r) in enumerate(PLURAL):
            st = self.t
            self.say(ctx.TR(sg + "."))
            self.wait(0.35)
            self.say(ctx.TR(pl + "."), f"pl{i}")
            self.wait(1.0)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Darum heißt der Titel dieses Videos:"), "end")
        self.wait(0.2)
        self.say(ctx.TR("Hayvanlar."), "end_tr")
        self.wait(0.3)
        self.say(ctx.DE("Tiere!"), "end_de")
        self.finish(0.9)

        self.rules = []
        for vow, suf in (("a, ı, o, u", "-lar"), ("e, i, ö, ü", "-ler")):
            lay = text_layer(g, [("letzter Vokal  ", "Medium", 36, MUTED), (vow, "Bold", 40, INK),
                                 ("   →   ", "Bold", 40, MUTED), (suf, "ExtraBold", 54, RED)])
            im, pad = box(lay.width + 80, 100, 50, WHITE, blur=12, sh_alpha=30)
            put(im, lay, pad + 40, pad + 50 - lay.baseline + 16)
            self.rules.append(im)
        self.rows = []
        for sg, pl, dsg, dpl, emo in PLURAL:
            suf = pl[len(sg):]
            lay = text_layer(g, [(sg, "Bold", 54, TEAL), ("   →   ", "Bold", 46, MUTED), (sg, "Bold", 54, TEAL),
                                 (suf, "ExtraBold", 54, RED), (f"      {dsg} → {dpl}", "Medium", 36, MUTED)])
            im, pad = box(1180, 104, 52, WHITE, blur=10, sh_alpha=28, sh_dy=4)
            put_center(im, g.emoji(emo, 70), pad + 70, pad + 52)
            put(im, lay, pad + 130, pad + 52 - lay.baseline + 16)
            self.rows.append(im)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Mehrzahl: -lar oder -ler", y=130, size=64)
        for i, im in enumerate(self.rules):
            s = t - self.m("rule")[0] - i * 0.4
            put_center(f, im, 520 + i * 880, 245, opacity=clamp(s / 0.3))
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                s = t - st
                hl = self.active(t, f"row{i}")
                put_center(f, im, W / 2, 395 + i * 122 + (1 - ease_out_cubic(s / 0.35)) * 20,
                           opacity=clamp(s / 0.25), scale=1.03 if hl else 1.0)
        if t >= self.m("end")[0]:
            s = self.since(t, "end")
            lay = text_layer(self.g, [("Hayvan", "ExtraBold", 76, TEAL), ("lar", "ExtraBold", 76, RED),
                                      ("  =  Tiere!", "Bold", 64, INK)])
            put_center(f, lay, W / 2, 1010, opacity=clamp(s / 0.3))
        return f


# ---------------------------- Quiz ----------------------------------------------------
class QuizIntroScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        self.wait(0.3)
        self.sfx("chord")
        self.say(ctx.DE("Quiz-Zeit! Ich zeige dir ein Tier."), "a")
        self.wait(0.2)
        self.say(ctx.DE("Sag das türkische Wort laut, bevor die Lösung kommt. Bereit?"), "b")
        self.finish(0.8)
        self.t1 = text_layer(self.g, [("Quiz-Zeit!", "ExtraBold", 150, RED)])
        self.t2 = text_layer(self.g, [("Sag das türkische Wort, bevor die Lösung kommt.", "SemiBold", 50, INK)])

    def render(self, t):
        f = self.g.bg.copy()
        put_center(f, self.g.emoji("1f9e0", 220), W / 2, 300 + math.sin(t * 2) * 8, opacity=clamp(t / 0.3),
                   scale=0.6 + 0.4 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 540, opacity=clamp((t - 0.2) / 0.3))
        put_center(f, self.t2, W / 2, 680, opacity=clamp((t - self.m("b")[0]) / 0.3))
        return f


class QuizScene(Scene):
    COUNT = 3

    def __init__(self, ctx, word, idx, total):
        super().__init__(ctx)
        g = self.g
        a = BY_TR[word]
        self.a = a
        self.sfx("pop", at=0.05)
        self.wait(0.5)
        self.say(ctx.DE(a.de_say or a.de), "de")
        self.wait(0.2)
        self.span("count", self.COUNT + 0.6)
        for i in range(self.COUNT):
            self.sfx("tick", at=self.t + 0.3 + i)
        self.wait(self.COUNT + 0.6)
        self.sfx("ding")
        self.say(ctx.TR(a.tr + "."), "tr")
        self.wait(0.4)
        self.say(ctx.TR(a.tr + ".", slow=True), "slow")
        self.span("speak", 1.8)
        self.wait(1.8)
        self.finish(0.2)

        self.base = ctx.card_base.copy()
        self.title_bar(self.base, "1f9e0", "Quiz", "Wie heißt das auf Türkisch?", right=f"{idx} / {total}",
                       progress=idx / total)
        self.emo = g.emoji(a.emoji, 620)
        fde = g.fit("SemiBold", a.de, 84, RW)
        self.del_ = text_layer(g, [(a.de, "SemiBold", fde.size, TEAL)])
        ftr = g.fit("ExtraBold", a.tr, 180, RW)
        self.trl = text_layer(g, [(a.tr, "ExtraBold", ftr.size, RED)])
        self.qm = text_layer(g, [("? ? ?", "ExtraBold", 150, (215, 200, 190))])
        self.pron = pron_layer(g, a)
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 540 / 620))
        s = t - 0.25
        put(f, self.del_, RX - 12, 350 - self.del_.baseline + (1 - ease_out_cubic(s / 0.35)) * 20, clamp(s / 0.3))
        reveal = self.m("tr")[0] - 0.05
        if t < reveal:
            put(f, self.qm, RX - 12, 630 - self.qm.baseline, clamp((t - 0.3) / 0.3))
            if self.active(t, "count"):
                a, b = self.m("count")
                rem = 1 - (t - a) / (b - a)
                n = max(1, math.ceil(rem * self.COUNT))
                ring = Image.new("RGBA", (240, 240), (0, 0, 0, 0))
                d = ImageDraw.Draw(ring)
                d.ellipse([8, 8, 232, 232], fill=WHITE)
                d.arc([14, 14, 226, 226], -90, -90 + 360 * rem, fill=RED, width=18)
                d.text((120, 122), str(n), font=self.g.font("ExtraBold", 110), fill=INK, anchor="mm")
                put_center(f, ring, 1640, 820)
        else:
            s = t - reveal
            im = self.trl
            put_center(f, im, RX - 12 + im.width / 2, 640 - im.baseline + im.height / 2,
                       opacity=clamp(s / 0.2), scale=0.8 + 0.2 * ease_out_back(s / 0.4))
            im, pad = self.pron
            put(f, im, RX - pad, 700 - pad, clamp((s - 0.25) / 0.3))
            put_center(f, self.g.emoji("2705", 110), 1700, 250, opacity=clamp(s / 0.2),
                       scale=0.5 + 0.5 * ease_out_back(s / 0.4))
        state, since, prog = None, 0, None
        if self.active(t, "de"):
            state, since = "de", self.since(t, "de")
        if self.active(t, "count"):
            state, since = "think", self.since(t, "count")
        if t >= self.m("tr")[0]:
            state, since = "answer", self.since(t, "tr")
        self.pill.draw(f, state, since, t, prog)
        return f


# ---------------------------- Übersicht & Ende ----------------------------------------
class OverviewScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.4)
        self.say(ctx.DE("Hier sind alle dreißig Tiere auf einen Blick."), "a")
        self.wait(0.3)
        self.say(ctx.DE("Halte das Video an und mach einen Screenshot!"), "b")
        self.wait(5.0)
        self.finish(0.3)
        self.base = g.bg.copy()
        self.heading(self.base, "Alle 30 Tiere auf einen Blick", y=88, size=54)
        self.cells = []
        cw, ch_ = 290, 186
        x0, y0 = (W - 6 * cw) / 2, 128
        for i, a in enumerate(ALL_ANIMALS):
            ih = ch_ - 14
            im, pad = box(cw - 14, ih, 26, WHITE, blur=8, sh_alpha=25, sh_dy=3)
            put_center(im, g.emoji(a.emoji, 72), pad + (cw - 14) / 2, pad + 50)
            tr = text_layer(g, [(a.tr, "Bold", g.fit("Bold", a.tr, 40, cw - 40).size, RED)])
            put(im, tr, pad + (cw - 14) / 2 - tr.width / 2, pad + 128 - tr.baseline)
            de = a.de.split(" / ")[0]
            dl = text_layer(g, [(de, "Medium", g.fit("Medium", de, 25, cw - 40).size, MUTED)])
            put(im, dl, pad + (cw - 14) / 2 - dl.width / 2, pad + 160 - dl.baseline)
            col, row = i % 6, i // 6
            self.cells.append((im, x0 + col * cw + cw / 2, y0 + row * ch_ + ch_ / 2))

    def render(self, t):
        f = self.base.copy()
        for i, (im, x, y) in enumerate(self.cells):
            p = (t - i * 0.035) / 0.35
            put_center(f, im, x, y + (1 - ease_out_cubic(p)) * 20, opacity=clamp(p))
        return f


class OutroScene(Scene):
    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.sfx("fanfare")
        self.say(ctx.TR("Tebrikler!"), "teb")
        self.wait(0.3)
        self.say(ctx.DE("Super gemacht! Du kennst jetzt dreißig Tiere auf Türkisch."), "a")
        self.wait(0.25)
        self.say(ctx.DE("Wiederhole das Video morgen noch einmal, dann bleiben die Wörter im Kopf."), "b")
        self.wait(0.35)
        self.say(ctx.TR("Görüşürüz!"), "gor")
        self.wait(0.2)
        self.say(ctx.DE("Bis bald!"), "bye")
        self.finish(2.0)
        self.t1 = text_layer(g, [("Tebrikler!", "ExtraBold", 190, RED)])
        self.t2 = text_layer(g, [("Herzlichen Glückwunsch – du kennst jetzt 30 Tiere auf Türkisch!", "SemiBold", 48, INK)])
        self.t3 = text_layer(g, [("Görüşürüz!", "Bold", 80, TEAL), ("  –  Bis bald!", "SemiBold", 64, MUTED)])
        self.credits = text_layer(g, [("Bilder: Twemoji (CC-BY 4.0)  ·  Stimmen: Piper TTS (dfki, thorsten)  ·  Schrift: Poppins",
                                       "Regular", 24, MUTED)])
        rnd = random.Random(3)
        cols = [RED, TEAL, (245, 158, 11), (59, 130, 246), (236, 72, 153)]
        self.conf = [(rnd.uniform(0, W), rnd.uniform(-600, -20), rnd.uniform(140, 320), rnd.uniform(0, 6.28),
                      rnd.uniform(3, 8), rnd.choice(cols), rnd.randint(10, 22)) for _ in range(110)]

    def render(self, t):
        f = self.g.bg.copy()
        d = ImageDraw.Draw(f)
        for x, y, v, ph, sp, c, s in self.conf:
            yy = (y + v * t + 600) % (H + 640) - 600
            xx = x + math.sin(t * 2 + ph) * 30
            w2 = s * abs(math.cos(t * sp + ph)) / 2 + 2
            d.rectangle([xx - w2, yy - s / 3, xx + w2, yy + s / 3], fill=c)
        put_center(f, self.g.emoji("1f389", 200), W / 2, 230, opacity=clamp(t / 0.3), scale=0.5 + 0.5 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 470, opacity=clamp((t - 0.2) / 0.3), scale=0.85 + 0.15 * ease_out_back((t - 0.2) / 0.5))
        put_center(f, self.t2, W / 2, 610, opacity=clamp((t - self.m("a")[0]) / 0.3))
        if t >= self.m("gor")[0]:
            s = self.since(t, "gor")
            put_center(f, self.t3, W / 2, 760, opacity=clamp(s / 0.3))
            put_center(f, self.g.emoji("1f44b", 110), W / 2 + self.t3.width / 2 + 80, 760,
                       opacity=clamp(s / 0.3), scale=1.0)
        put_center(f, self.credits, W / 2, 1040, opacity=clamp((t - 1) / 0.5))
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    scenes =[TitleScene(ctx), HowToScene(ctx), PronunciationScene(ctx)]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for a in ch.animals:
            idx += 1
            scenes.append(CardScene(ctx, a, ch, idx, len(ALL_ANIMALS)))
    for i, w_ in enumerate(DIALOG):
        scenes.append(DialogScene(ctx, w_, first=(i == 0)))
    scenes.append(PluralScene(ctx))
    scenes.append(QuizIntroScene(ctx))
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, w_, i, len(QUIZ)))
    scenes.append(OverviewScene(ctx))
    scenes.append(OutroScene(ctx))
    for sc in scenes:
        if isinstance(sc, ChapterScene):
            sc.chapter = f"{sc.ch.tr} – {sc.ch.de}"
        elif isinstance(sc, DialogScene):
            sc.chapter = "Mini-Dialog: Bu ne?" if sc.first else None
        else:
            sc.chapter = CHAPTER_TITLES.get(type(sc).__name__)
    return scenes



CHAPTER_TITLES = {"TitleScene": "Merhaba – Einführung", "HowToScene": "So lernst du",
                  "PronunciationScene": "Aussprache", "PluralScene": "Mehrzahl -lar/-ler",
                  "QuizIntroScene": "Quiz", "OverviewScene": "Übersicht", "OutroScene": "Tebrikler!"}


def emoji_codes():
    return {a.emoji for a in ALL_ANIMALS} | {c.icon for c in CHAPTERS} | set(ICONS)


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="hayvanlar_tiere_deutsch_tuerkisch.mp4", title="Hayvanlar – Tiere auf Türkisch")
