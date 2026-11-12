#!/usr/bin/env python3
"""
Lernvideo „Hava – das Wetter“: die wichtigsten Wetter-Wörter (Nomen, Adjektive, Verben) und wie
türkische Adjektive benutzt und konjugiert werden.

Erzeugt ein 1080p-MP4 mit:
  * 17 Nomen (Wetter, Himmel, Sturm, Jahreszeiten), 12 Adjektive und 7 Verben als Wortkarten,
    Adjektive und Verben jeweils mit Beispielsatz (und Verben mit Form) zum Nachsprechen
  * Grammatik: Adjektive ändern sich nie (soğuk hava, Hava soğuk.), -li macht Adjektive
    (güneş → güneşli), Adjektive konjugieren (hastayım = ich bin krank), değil / daha / en / çok
  * Mini-Dialog „Hava nasıl?“, Quiz, Übersicht, Abschluss

Die gemeinsame Technik steckt in ../lernvideo/ (engine.py, nouns.py).

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/hava_wetter_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 20  # Aussprache per Whisper prüfen (beste Aufnahme je Wort)
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lernvideo.nouns import *  # noqa: E402,F401,F403  (Engine + Bausteine für Wortkarten-Videos)

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = (190, 105, 0)

# --------------------------------------------------------------------------------------
# Inhalte
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Hava ve gökyüzü", "Wetter & Himmel", "1f324", [
        N("das Wetter", "hava", "1f324", ["ha", "wa"], 1, "hava heißt auch: die Luft",
          sent="Hava nasıl?", sent_de="Wie ist das Wetter?", sent_hl="Hava"),
        N("die Sonne", "güneş", "2600", ["gü", "nesch"], 1, "ş = „sch“"),
        N("die Wolke", "bulut", "2601", ["bu", "lut"], 1),
        N("der Regen", "yağmur", "1f327", ["jaa", "mur"], 1, "ğ ist stumm – das a wird lang"),
        N("der Schnee", "kar", "2744", ["kar"], 0, "r am Ende leicht gerollt"),
        N("der Wind", "rüzgâr", "1f32c", ["rüs", "gjar"], 1, "â nach g: weiches „gj“  ·  auch: rüzgar"),
        N("der Nebel", "sis", "1f32b", ["sis"], 0, "s ist immer scharf, wie „ß“"),
    ]),
    Chapter("Fırtına ve dahası", "Sturm & mehr", "26c8", [
        N("der Sturm", "fırtına", "26c8", ["fır", "tı", "na"], 2, "ı = dumpfes i, wie das e in „bitte“",
          sent="Fırtına geliyor.", sent_de="Ein Sturm kommt.", sent_hl="Fırtına"),
        N("der Blitz", "şimşek", "26a1", ["schim", "schek"], 1, "ş = „sch“"),
        N("der Donner", "gök gürültüsü", "1f329", ["gök", "gü", "rül", "tü", "sü"], 0,
          "wörtlich: Himmels-Lärm (gök = Himmel)"),
        N("der Regenbogen", "gökkuşağı", "1f308", ["gök", "ku", "scha", "ı"], 3, "wörtlich: Himmels-Gürtel",
          sent="Bak, bir gökkuşağı!", sent_de="Schau, ein Regenbogen!", sent_hl="gökkuşağı"),
        N("das Eis", "buz", "1f9ca", ["bus"], 0, "buz gibi = eiskalt (wörtlich: wie Eis)",
          sent="Su buz gibi.", sent_de="Das Wasser ist eiskalt.", sent_hl="buz gibi"),
        N("der Grad (Temperatur)", "derece", "1f321", ["de", "re", "dsche"], 0, "bugün = heute  ·  yirmi = zwanzig",
          sent="Bugün yirmi derece.", sent_de="Heute sind es zwanzig Grad.", sent_hl="derece",
          de_say="der Grad, bei der Temperatur"),
    ]),
    Chapter("Mevsimler", "Jahreszeiten", "1f342", [
        N("der Frühling", "ilkbahar", "1f337", ["ilk", "ba", "har"], 2, "ilk = erst: der „erste Frühling“"),
        N("der Sommer", "yaz", "1f3d6", ["jas"], 0, "yazın = im Sommer"),
        N("der Herbst", "sonbahar", "1f342", ["son", "ba", "har"], 2, "son = letzt: der „letzte Frühling“"),
        N("der Winter", "kış", "26c4", ["kısch"], 0, "kışın = im Winter"),
    ]),
    Chapter("Sıfatlar", "Adjektive", "1f3a8", [
        N("heiß / warm", "sıcak", "1f975", ["sı", "dschak"], 1, sent="Çay çok sıcak.",
          sent_de="Der Tee ist sehr heiß.", sent_hl="sıcak", de_say="heiß, warm"),
        N("kalt", "soğuk", "1f976", ["soo", "uk"], 1, "ğ ist stumm – das o wird lang",
          sent="Hava soğuk.", sent_de="Das Wetter ist kalt.", sent_hl="soğuk"),
        N("kühl", "serin", "1f343", ["se", "rin"], 1, "akşam = der Abend",
          sent="Akşamlar serin.", sent_de="Die Abende sind kühl.", sent_hl="serin"),
        N("lauwarm / mild", "ılık", "1f6c1", ["ı", "lık"], 1, "ı = dumpfes i",
          sent="Ilık bir gün.", sent_de="Ein milder Tag.", sent_hl="Ilık", de_say="lauwarm, mild"),
        N("schön", "güzel", "1f31e", ["gü", "sel"], 1, "z = weiches s",
          sent="Bugün hava çok güzel.", sent_de="Heute ist das Wetter sehr schön.", sent_hl="güzel"),
        N("schlecht", "kötü", "1f32a", ["kö", "tü"], 1,
          sent="Kötü bir gün.", sent_de="Ein schlechter Tag.", sent_hl="Kötü"),
        N("sonnig", "güneşli", "1f60e", ["gü", "nesch", "li"], 2, "güneş + li = mit Sonne",
          sent="Güneşli bir gün.", sent_de="Ein sonniger Tag.", sent_hl="Güneşli"),
        N("bewölkt", "bulutlu", "26c5", ["bu", "lut", "lu"], 2, "bulut + lu = mit Wolken",
          sent="Hava bulutlu.", sent_de="Es ist bewölkt.", sent_hl="bulutlu"),
        N("regnerisch", "yağmurlu", "2614", ["jaa", "mur", "lu"], 2, "sabah = der Morgen",
          sent="Yağmurlu bir sabah.", sent_de="Ein regnerischer Morgen.", sent_hl="Yağmurlu"),
        N("verschneit", "karlı", "1f3d4", ["kar", "lı"], 1, "dağ = der Berg (dağlar = die Berge)",
          sent="Dağlar karlı.", sent_de="Die Berge sind verschneit.", sent_hl="karlı"),
        N("windig", "rüzgârlı", "1fa81", ["rüs", "gjar", "lı"], 2,
          sent="Bugün çok rüzgârlı.", sent_de="Heute ist es sehr windig.", sent_hl="rüzgârlı"),
        N("neblig", "sisli", "1f301", ["sis", "li"], 1, "gece = die Nacht",
          sent="Sisli bir gece.", sent_de="Eine neblige Nacht.", sent_hl="Sisli"),
    ]),
    Chapter("Fiiller", "Verben", "1f3c3", [
        N("fallen (Regen, Schnee)", "yağmak", "1f326", ["jaa", "mak"], 1, "Kar yağıyor. = Es schneit.",
          form="yağ|ıyor", form_label="es-Form", form_de="es fällt",
          sent="Yağmur yağıyor.", sent_de="Es regnet.", sent_hl="yağıyor", de_say="fallen, für Regen und Schnee"),
        N("wehen", "esmek", "1f4a8", ["es", "mek"], 1,
          form="es|iyor", form_label="es-Form", form_de="er weht",
          sent="Rüzgâr esiyor.", sent_de="Der Wind weht.", sent_hl="esiyor"),
        N("scheinen / glänzen", "parlamak", "1f506", ["par", "la", "mak"], 2,
          form="parl|ıyor", form_label="es-Form", form_de="sie scheint",
          sent="Güneş parlıyor.", sent_de="Die Sonne scheint.", sent_hl="parlıyor", de_say="scheinen, glänzen"),
        N("frieren", "üşümek", "1f9e4", ["ü", "schü", "mek"], 2, "So sagst du: Mir ist kalt.",
          form="üşü|yorum", form_label="ich-Form", form_de="mir ist kalt",
          sent="Çok üşüyorum.", sent_de="Mir ist sehr kalt.", sent_hl="üşüyorum"),
        N("schwitzen", "terlemek", "1f4a6", ["ter", "le", "mek"], 2, "yazın = im Sommer",
          form="terl|iyorum", form_label="ich-Form", form_de="ich schwitze",
          sent="Yazın çok terliyorum.", sent_de="Im Sommer schwitze ich viel.", sent_hl="terliyorum"),
        N("warm werden", "ısınmak", "1f4c8", ["ı", "sın", "mak"], 2,
          form="ısın|ıyor", form_label="es-Form", form_de="es wird warm",
          sent="Hava ısınıyor.", sent_de="Es wird wärmer.", sent_hl="ısınıyor"),
        N("kalt werden", "soğumak", "1f4c9", ["soo", "u", "mak"], 2, "Çay soğuyor. = Der Tee wird kalt.",
          form="soğu|yor", form_label="es-Form", form_de="es wird kalt",
          sent="Hava soğuyor.", sent_de="Es wird kälter.", sent_hl="soğuyor"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

ADJ_ROWS = [  # (Deutsch vor Endung, Endung, Deutsch danach, Türkisch Adjektiv, Türkisch Rest)
    ("kalt", "es", " Wetter", "soğuk", " hava"),
    ("kalt", "es", " Wasser", "soğuk", " su"),
    ("kalt", "e", " Tage", "soğuk", " günler"),
    ("ein kalt", "er", " Tag", "soğuk", " bir gün"),
]
LI_ROWS = [("güneş", "li", "sonnig", "2600"), ("bulut", "lu", "bewölkt", "2601"),
           ("yağmur", "lu", "regnerisch", "1f327"), ("rüzgâr", "lı", "windig", "1f32c")]
CONJ_ROWS = [("ben", "yım", "ich bin krank"), ("sen", "sın", "du bist krank"), ("o", "", "er / sie / es ist krank"),
             ("biz", "yız", "wir sind krank"), ("siz", "sınız", "ihr seid / Sie sind krank"),
             ("onlar", "lar", "sie sind krank")]
CONJ_MORE = [("yorgun", "um", "ich bin müde", "1f971"), ("mutlu", "yum", "ich bin glücklich", "1f60a")]
NEG_ROWS = [("değil", "nicht", "Hava soğuk değil.", "Das Wetter ist nicht kalt."),
            ("değilim", "ich bin nicht", "Hasta değilim.", "Ich bin nicht krank."),
            ("daha", "mehr / -er", "daha sıcak", "wärmer"),
            ("en", "am …sten", "en soğuk gün", "der kälteste Tag"),
            ("çok", "sehr", "çok güzel", "sehr schön")]
DIALOG = [("Hava nasıl?", "Wie ist das Wetter?", "1f914"),
          ("Hava güzel, güneş parlıyor.", "Das Wetter ist schön, die Sonne scheint.", "1f31e"),
          ("Hava kötü, yağmur yağıyor.", "Das Wetter ist schlecht, es regnet.", "1f327"),
          ("Çok soğuk, kar yağıyor.", "Es ist sehr kalt, es schneit.", "2744")]
QUIZ = ["güneş", "yağmur", "kar", "bulut", "rüzgâr", "gökkuşağı", "kış", "yaz", "sıcak", "soğuk", "güneşli", "üşümek"]
FLOATERS = ["2600", "1f327", "2744", "1f308", "26c8", "1f32c", "2601", "1f321"]
ICONS = ["1f4cc", "1f912", "1f971", "1f60a", "1f4ac"]


# --------------------------------------------------------------------------------------
# Grammatik-Szenen
# --------------------------------------------------------------------------------------
class GrammarScene(Scene):
    """Basis: Überschrift + Statusleiste während deutscher Erklärungen und Nachsprech-Pausen."""
    head = ""
    narration = ()

    def __init__(self, ctx):
        super().__init__(ctx)
        self.pill = ctx.pill

    def draw_status(self, f, t):
        for k in self.narration:
            if self.active(t, k):
                self.pill.draw(f, "de", self.since(t, k), t, None, cy=1010)
        if self.active(t, "speak"):
            a, b = self.m("speak")
            self.pill.draw(f, "speak", t - a, t, 1 - (t - a) / (b - a), cy=1010)


class AdjUsageScene(GrammarScene):
    chapter = "Adjektive benutzen"
    narration = ("intro", "intro2", "bir", "pred_intro", "pred_de")

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Jetzt zu den Adjektiven. Die gute Nachricht: Türkische Adjektive ändern sich nie."), "intro")
        self.wait(0.3)
        self.say(ctx.DE("Im Deutschen wechseln die Endungen. Im Türkischen bleibt das Adjektiv immer gleich."), "intro2")
        self.wait(0.4)
        for i, (a, end, b, adj, rest) in enumerate(ADJ_ROWS):
            st = self.t
            self.say(ctx.TR(adj + rest + "."))
            self.wait(0.25)
            self.say(ctx.DE(a + end + b))
            self.wait(0.6)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Das Wort für ein steht zwischen Adjektiv und Nomen."), "bir")
        self.wait(0.4)
        self.say(ctx.DE("Und für ist brauchst du gar kein Wort:"), "pred_intro")
        self.wait(0.3)
        self.say(ctx.TR("Hava soğuk."), "pred")
        self.wait(0.25)
        self.say(ctx.DE("Das Wetter ist kalt."), "pred_de")
        self.wait(0.15)
        self.span("speak", 2.2)
        self.wait(2.3)
        self.finish(0.3)
        self.rows = []
        for a, end, b, adj, rest in ADJ_ROWS:
            segs = [(a, "SemiBold", 46, INK), (end, "ExtraBold", 50, RED), (b, "SemiBold", 46, INK),
                    ("     →     ", "Bold", 40, MUTED), (adj, "ExtraBold", 54, TEAL)]
            if "bir" in rest:
                segs += [(" bir", "ExtraBold", 54, GOLD), (" gün", "Bold", 54, INK)]
            else:
                segs.append((rest, "Bold", 54, INK))
            self.rows.append(pill(g, segs, h=96, minw=1150))
        self.pred = pill(g, [("Hava ", "Bold", 60, INK), ("soğuk.", "ExtraBold", 60, TEAL),
                             ("    =  Das Wetter ist kalt.", "Medium", 40, MUTED),
                             ("   (kein Wort für „ist“!)", "SemiBold", 34, RED)], h=110, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Adjektive: Sie ändern sich nie!", y=110, size=60)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 250 + i * 112 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") or (i == 3 and self.active(t, "bir")) else 1.0)
        if t >= self.m("pred")[0] - 0.05:
            op, dy = appear(t, self.m("pred")[0] - 0.05)
            put_center(f, self.pred, W / 2, 790 + dy, opacity=op)
        self.draw_status(f, t)
        return f


class LiScene(GrammarScene):
    chapter = "Adjektive mit -li"
    narration = ("intro", "vowel")

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Ein Trick fürs Wetter: Mit der Endung li machst du aus einem Nomen ein Adjektiv. "
                        "Li heißt so viel wie: mit."), "intro")
        self.wait(0.4)
        for i, (noun, suf, de, _) in enumerate(LI_ROWS):
            st = self.t
            self.say(ctx.TR(noun + "."))
            self.wait(0.3)
            self.say(ctx.TR(noun + suf + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.6)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Der Vokal der Endung passt sich wieder an, genau wie bei den Verben."), "vowel")
        self.finish(1.0)
        self.formula = pill(g, [("Nomen", "Bold", 52, TEAL), ("  +  ", "Bold", 44, MUTED), ("li", "ExtraBold", 60, RED),
                                ("   =   ", "Bold", 44, MUTED), ("„mit …“", "SemiBold", 48, INK)], h=110)
        self.rows = [pill(g, [(noun, "Bold", 54, TEAL), ("   →   ", "Bold", 44, MUTED), (noun, "Bold", 54, TEAL),
                              (suf[0], "ExtraBold", 54, RED), (suf[1], "ExtraBold", 54, GOLD),
                              (f"      {de}", "Medium", 38, MUTED)], h=100, icon=emo, minw=1180)
                     for noun, suf, de, emo in LI_ROWS]
        segs = [("Der Vokal passt sich an:     ", "SemiBold", 34, INK)]
        for i, (a, b) in enumerate((("e, i", "li"), ("a, ı", "lı"), ("o, u", "lu"), ("ö, ü", "lü"))):
            segs += [(("     " if i else "") + a + " ", "Medium", 34, MUTED), ("→", "Bold", 34, MUTED),
                     (" -" + b, "ExtraBold", 40, GOLD)]
        self.vowels = pill(g, segs, h=88, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Aus Nomen werden Adjektive: -li", y=110, size=60)
        op, dy = appear(t, self.m("intro")[0] + 1.5)
        put_center(f, self.formula, W / 2, 245 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 395 + i * 115 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("vowel")[0]:
            op, dy = appear(t, self.m("vowel")[0])
            put_center(f, self.vowels, W / 2, 880 + dy, opacity=op)
        self.draw_status(f, t)
        return f


class AdjConjScene(GrammarScene):
    chapter = "Adjektive konjugieren"
    narration = ("intro", "known")

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Und so konjugierst du Adjektive: Für ich bin, du bist und so weiter "
                        "hängst du einfach eine Endung an."), "intro")
        self.wait(0.4)
        for i, (pron, end, de) in enumerate(CONJ_ROWS):
            st = self.t
            self.say(ctx.TR("hasta" + end + "."))
            self.wait(0.25)
            self.say(ctx.DE(de.replace(" / ", ", ")))
            self.wait(0.5)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Diese Endungen kennst du schon von der Ich-Form der Verben. Noch zwei Beispiele:"), "known")
        self.wait(0.4)
        for i, (adj, end, de, _) in enumerate(CONJ_MORE):
            st = self.t
            self.say(ctx.TR(adj + end + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.6)
            self.marks[f"more{i}"] = (st, self.t)
        self.finish(0.8)
        self.formula = pill(g, [("hasta", "Bold", 52, TEAL), (" = krank     ", "Medium", 38, MUTED),
                                ("hasta", "Bold", 52, TEAL), ("yım", "ExtraBold", 56, RED),
                                ("  =  ich bin krank", "SemiBold", 42, INK)], h=106, icon="1f912")
        self.rows = []
        for pron, end, de in CONJ_ROWS:
            segs = [(f"({pron})  ", "Medium", 34, MUTED), ("hasta", "Bold", 50, INK)]
            if end:
                segs.append((end, "ExtraBold", 50, RED))
            segs.append((f"   {de}", "Medium", 32, TEAL))
            self.rows.append(pill(g, segs, h=92, minw=820))
        self.more = [pill(g, [(adj, "Bold", 46, INK), (" → ", "Bold", 40, MUTED), (adj, "Bold", 46, INK),
                              (end, "ExtraBold", 46, RED), (f"   {de}", "Medium", 32, TEAL)], h=90, icon=emo, minw=820)
                     for adj, end, de, emo in CONJ_MORE]
        self.note = pill(g, [("Nach Vokal kommt ein ", "Medium", 32, MUTED), ("y", "ExtraBold", 38, RED),
                             (" dazwischen: hasta-", "Medium", 32, MUTED), ("y", "ExtraBold", 38, RED),
                             ("-ım   ·   wie bei geliyor", "Medium", 32, MUTED), ("um", "ExtraBold", 38, RED),
                             (" / geliyor", "Medium", 32, MUTED), ("sun", "ExtraBold", 38, RED)],
                         h=80, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Adjektive konjugieren: ich bin …", y=100, size=58)
        op, dy = appear(t, self.m("intro")[0] + 1.0)
        put_center(f, self.formula, W / 2, 215 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                col, row = i // 3, i % 3
                put_center(f, im, 510 + col * 900, 345 + row * 108 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        for i, im in enumerate(self.more):
            st = self.m(f"more{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, 510 + i * 900, 700 + dy, opacity=op, scale=1.03 if self.active(t, f"more{i}") else 1.0)
        if t >= self.m("known")[0]:
            op, dy = appear(t, self.m("known")[0])
            put_center(f, self.note, W / 2, 830 + dy, opacity=op)
        self.draw_status(f, t)
        return f


class NegCompScene(GrammarScene):
    chapter = "değil · daha · en · çok"
    narration = ("intro",)

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Noch fünf kleine Wörter, mit denen Adjektive richtig stark werden:"), "intro")
        self.wait(0.4)
        for i, (_, _, tr, de) in enumerate(NEG_ROWS):
            st = self.t
            self.say(ctx.TR(tr if tr.endswith(".") else tr + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.finish(0.8)
        self.rows = []
        for key, mean, tr, de in NEG_ROWS:
            i = tr.find(key)
            segs = [(key, "ExtraBold", 50, RED), (f" = {mean}", "SemiBold", 34, INK), ("      ", "Medium", 34, INK)]
            segs += [(tr[:i], "Bold", 46, TEAL), (key, "Bold", 46, RED), (tr[i + len(key):], "Bold", 46, TEAL)]
            segs.append((f"     {de}", "Medium", 34, MUTED))
            self.rows.append(pill(g, [s for s in segs if s[0]], h=100, minw=1500))

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "nicht · mehr · am meisten · sehr", y=110, size=60)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 250 + i * 128 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        self.draw_status(f, t)
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    ctx.pill = StatusPill(ctx.gfx)
    ctx.rich_pill = StatusPill(ctx.gfx, RichCardScene.STATES)
    ctx.card_base = card_base(ctx)
    ctx.rich_card_base = rich_card_base(ctx)
    title = TitleScene(
        ctx, "Hava", "Das Wetter auf Türkisch",
        [("ha · ", "Bold", 46, MUTED), ("wa", "Bold", 46, RED), ("   =   das Wetter (auch: die Luft)", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute geht es um das Wetter: Nomen, Adjektive und Verben. "
                "Und du lernst, wie türkische Adjektive funktionieren.", "welcome"),
         ("de", "Das Wetter heißt auf Türkisch:", "word"), ("tr", "Hava.", "hava"), ("tr_slow", "Hava.", "hava2")],
        title_mark="hava", lang_note="Nomen · Adjektive · Verben")
    scenes = [title, HowToScene(ctx, BY_TR["güneş"])]
    total = len(ALL)
    idx = 0

    def chapter(n, ch):
        nonlocal idx
        out = [ChapterScene(ctx, n, ch)]
        for item in ch.items:
            idx += 1
            out.append(RichCardScene(ctx, item, ch, idx, total))
        return out

    scenes += chapter(1, CHAPTERS[0]) + chapter(2, CHAPTERS[1]) + chapter(3, CHAPTERS[2])
    scenes += [AdjUsageScene(ctx), LiScene(ctx)]
    scenes += chapter(4, CHAPTERS[3])
    scenes += [AdjConjScene(ctx), NegCompScene(ctx)]
    scenes += chapter(5, CHAPTERS[4])
    scenes += [
        PhraseGridScene(ctx, "Mini-Dialog: Hava nasıl?", "Und jetzt alles zusammen: ein kleiner Dialog übers Wetter.",
                        DIALOG, chapter="Mini-Dialog: Hava nasıl?"),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, f"Alle {total} Wetter-Wörter auf einen Blick",
                      "Hier sind alle Wetter-Wörter auf einen Blick."),
        OutroScene(ctx, "Harika!", "Super!", "Jetzt kannst du auf Türkisch über das Wetter sprechen!",
                   ["Super gemacht! Jetzt kannst du auf Türkisch über das Wetter sprechen.",
                    "Tipp: Schau jeden Morgen aus dem Fenster und sag auf Türkisch, wie das Wetter ist."],
                   icon="1f308"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in LI_ROWS} | {e for *_, e in CONJ_MORE} | {e for *_, e in DIALOG})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="hava_wetter_deutsch_tuerkisch.mp4", title="Hava – das Wetter auf Türkisch")
