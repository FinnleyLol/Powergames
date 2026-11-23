#!/usr/bin/env python3
"""
Lernvideo „Kıyafetler – Kleidung & Accessoires“: 35 Nomen, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 35 Wortkarten in 5 Kapiteln (Oberteile & Kleider, Hosen/Röcke/Unterwäsche, Schuhe,
    Accessoires, Uhr & Schmuck)
  * Bonus 1: Farben + Kleidung (mavi kot, kırmızı atkı …) – das Adjektiv ändert sich nie
  * Bonus 2: giymek oder takmak? (Kleidung anziehen ↔ Brille, Uhr, Schmuck anlegen)
  * Bonus 3: Sätze im Geschäft (Bu ne kadar? · Kırmızı var mı? …)
  * Quiz, Übersicht, Abschluss

Für Kleidung ohne Emoji (Pullover, Strickjacke, Sakko, Stoffhose, Rock, Schlafanzug, Mütze,
Gürtel, Krawatte, Halskette, Ohrringe) liegen eigene Zeichnungen in icons/.

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/kiyafet_kleidung_deutsch_tuerkisch.mp4
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
# Inhalte  (stress=None: betonte Silbe aus der Lautschrift der Stimme; -1: keine Markierung, weil die Betonung
#           bei Lehnwörtern wie pantolon, mayo, kolye schwankt; „_“ = neues Wort)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Üst giyim", "Oberteile & Kleider", "1f455", [
        N("das T-Shirt", "tişört", "1f455", ["ti", "schört"], None, "fast wie „T-Shirt“, nur türkisch geschrieben",
          de_say="das T-Shirt"),
        N("das Hemd", "gömlek", "1f454", ["göm", "lek"], None, "ö wie im Deutschen"),
        N("die Bluse", "bluz", "1f45a", ["blus"], None, "z = weiches s"),
        N("der Pullover", "kazak", "x-sweater", ["ka", "sak"], None, "z = weiches s"),
        N("die Strickjacke", "hırka", "x-cardigan", ["hır", "ka"], None, "ı = dumpfes i  ·  h deutlich hauchen"),
        N("die Jacke / das Sakko", "ceket", "x-blazer", ["dsche", "ket"], None, "c = „dsch“",
          de_say="die Jacke, oder das Sakko"),
        N("die Winterjacke", "mont", "1f9e5", ["mont"], None, "eine dicke, warme Jacke"),
        N("das Kleid", "elbise", "1f457", ["el", "bi", "se"], None, "elbise heißt auch: Kleidung allgemein"),
        N("der Anzug", "takım elbise", "1f935", ["ta", "kım", "_el", "bi", "se"], None, "wörtlich: Set-Kleidung"),
    ]),
    Chapter("Alt giyim ve iç giyim", "Hosen, Röcke & Unterwäsche", "1f456", [
        N("die Hose", "pantolon", "x-trousers", ["pan", "to", "lon"], -1, "fast wie „Pantalon“"),
        N("die Jeans", "kot", "1f456", ["kot"], None, "auch: kot pantolon"),
        N("die kurze Hose", "şort", "1fa73", ["schort"], None, "ş = „sch“  ·  wie englisch „shorts“"),
        N("der Rock", "etek", "x-skirt", ["e", "tek"], None),
        N("die Unterwäsche", "iç çamaşırı", "1fa72", ["itsch", "_tscha", "ma", "schı", "rı"], None,
          "iç = innen  ·  çamaşır = Wäsche"),
        N("die Socke", "çorap", "1f9e6", ["tscho", "rap"], None, "ç = „tsch“"),
        N("der Schlafanzug", "pijama", "x-pajamas", ["pi", "scha", "ma"], None, "j wie in „Journal“"),
        N("der Badeanzug / die Badehose", "mayo", "1fa71", ["ma", "jo"], -1, "ein Wort für beides",
          de_say="der Badeanzug, oder die Badehose"),
    ]),
    Chapter("Ayakkabılar", "Schuhe", "1f45f", [
        N("der Schuh", "ayakkabı", "1f45e", ["a", "jak", "ka", "bı"], None, "ayak = Fuß (wie im Körper-Video)"),
        N("der Turnschuh", "spor ayakkabı", "1f45f", ["spor", "_a", "jak", "ka", "bı"], None,
          "wörtlich: Sport-Schuh"),
        N("der Stiefel", "bot", "1f462", ["bot"], None),
        N("der Hausschuh", "terlik", "1fa74", ["ter", "lik"], None, "auch: der Badelatschen"),
        N("die Sandale", "sandalet", "1f461", ["san", "da", "let"], None),
    ]),
    Chapter("Aksesuarlar", "Accessoires", "1f45c", [
        N("der Hut", "şapka", "1f452", ["schap", "ka"], None, "ş = „sch“  ·  auch: die Kappe"),
        N("die Mütze", "bere", "x-beanie", ["be", "re"], None, "eine warme Strickmütze"),
        N("der Schal", "atkı", "1f9e3", ["at", "kı"], None, "ı = dumpfes i"),
        N("der Handschuh", "eldiven", "1f9e4", ["el", "di", "wen"], None, "el = Hand (wie im Körper-Video)"),
        N("der Gürtel", "kemer", "x-belt", ["ke", "mer"], None),
        N("die Krawatte", "kravat", "x-tie", ["kra", "wat"], None, "v ≈ w"),
        N("die Tasche", "çanta", "1f45c", ["tschan", "ta"], None, "sırt çantası = der Rucksack"),
        N("die Geldbörse", "cüzdan", "1f45b", ["dschüs", "dan"], None, "c = „dsch“"),
        N("die Brille", "gözlük", "1f453", ["gös", "lük"], None, "göz = Auge → gözlük  ·  güneş gözlüğü = Sonnenbrille"),
    ]),
    Chapter("Saat ve takılar", "Uhr & Schmuck", "1f48d", [
        N("die Uhr", "saat", "231a", ["sa", "at"], None, "kol saati = die Armbanduhr"),
        N("die Halskette", "kolye", "x-necklace", ["kol", "je"], -1, "y = „j“"),
        N("der Ohrring", "küpe", "x-earrings", ["kü", "pe"], None, "ü wie im Deutschen"),
        N("der Ring", "yüzük", "1f48d", ["jü", "sük"], None, "y = „j“  ·  z = weiches s"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

COLORS = [  # (Farbe, Farbwert, Nomen, Deutsch, Bild mit Farbabzeichen)
    ("mavi", (59, 136, 195), "kot", "die blaue Jeans", "1f456+1f535"),
    ("kırmızı", (214, 31, 45), "atkı", "der rote Schal", "1f9e3+1f534"),
    ("yeşil", (92, 145, 59), "şort", "die grüne kurze Hose", "1fa73+1f7e2"),
    ("sarı", (215, 150, 0), "şapka", "der gelbe Hut", "1f452+1f7e1"),
    ("mor", (116, 78, 170), "çanta", "die lila Tasche", "1f45c+1f7e3"),
    ("kahverengi", (138, 75, 56), "ayakkabı", "der braune Schuh", "1f45e+1f7e4"),
]
WEAR = {  # giymek (Kleidung, Schuhe) – takmak (Brille, Uhr, Schmuck)
    "giymek": [("Ceket giyiyorum.", "Ich ziehe eine Jacke an.", "x-blazer"),
               ("Ayakkabı giyiyorum.", "Ich ziehe Schuhe an.", "1f45e"),
               ("Elbise giyiyorum.", "Ich ziehe ein Kleid an.", "1f457")],
    "takmak": [("Gözlük takıyorum.", "Ich setze die Brille auf.", "1f453"),
               ("Saat takıyorum.", "Ich lege die Uhr an.", "231a"),
               ("Kolye takıyorum.", "Ich lege die Halskette an.", "x-necklace")],
}
SHOP = [("Bu ne kadar?", "Was kostet das?", "1f4b6"),
        ("Kırmızı var mı?", "Gibt es das in Rot?", "1f534"),
        ("Daha büyük var mı?", "Gibt es das größer?", "1f4cf"),
        ("Bunu alıyorum.", "Ich nehme das.", "1f6cd")]
QUIZ = ["tişört", "kazak", "ceket", "elbise", "pantolon", "etek", "çorap", "ayakkabı", "şapka", "eldiven", "gözlük", "yüzük"]
FLOATERS = ["1f455", "1f457", "1f45f", "1f452", "1f9e3", "1f45c", "1f453", "1f48d"]
ICONS = ["1f4cc"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen
# --------------------------------------------------------------------------------------
class ColorsScene(Scene):
    chapter = "Farben + Kleidung"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus eins: Kleidung und Farben. Die Farbe steht vor dem Wort und ändert sich nie, "
                        "genau wie im Wetter-Video."), "intro")
        self.wait(0.4)
        for i, (color, _, noun, de, _) in enumerate(COLORS):
            st = self.t
            self.say(ctx.TR(f"{color} {noun}."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.5)
            self.marks[f"row{i}"] = (st, self.t)
        self.finish(1.0)
        self.pill = ctx.pill
        segs = [([(color, "ExtraBold", 52, rgb), (" " + noun, "Bold", 52, INK)], emo) for color, rgb, noun, _, emo in COLORS]
        bw = max(pill(g, sg, h=106, icon=emo).width - 2 * pill(g, sg, h=106, icon=emo).pad for sg, emo in segs)
        self.rows = [pill(g, sg, h=106, icon=emo, minw=bw) for sg, emo in segs]  # alle gleich breit
        self.des = [text_layer(g, [("=  " + de, "SemiBold", 40, MUTED)]) for *_, de, _ in COLORS]
        dw = max(d.width for d in self.des)
        self.x0 = (W - (bw + 40 + dw)) / 2  # linker Rand der Gruppe: Box · Abstand · Übersetzung
        self.bw = bw
        self.rule = pill(g, [("Farbe + Wort", "ExtraBold", 36, RED), ("  ·  die Farbe bleibt immer gleich", "Medium", 32, MUTED)],
                         h=76, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 1: Farben + Kleidung", y=105, size=58)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                y = 250 + i * 118 + dy
                put_center(f, im, self.x0 + self.bw / 2, y, opacity=op, scale=1.03 if self.active(t, f"row{i}") else 1.0)
                d = self.des[i]
                put_center(f, d, self.x0 + self.bw + 40 + d.width / 2 - 12, y, opacity=op)
        if t >= self.m("row0")[0]:
            put_center(f, self.rule, W / 2, 965, opacity=clamp((t - self.m("row0")[0]) / 0.3))
        if self.active(t, "intro"):
            self.pill.draw(f, "de", self.since(t, "intro"), t, None, cy=1010)
        return f


class WearScene(Scene):
    chapter = "giymek oder takmak?"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus zwei: Für anziehen gibt es zwei Verben. Kleidung und Schuhe ziehst du an, "
                        "Brille, Uhr und Schmuck legst du an."), "intro")
        self.wait(0.4)
        for side, verb in (("l", "giymek"), ("r", "takmak")):
            self.say(ctx.TR(verb + "."), f"{side}v")
            self.wait(0.4)
            for i, (tr, de, _) in enumerate(WEAR[verb]):
                st = self.t
                self.say(ctx.TR(tr))
                self.wait(0.25)
                self.say(ctx.DE(de))
                self.wait(0.5)
                self.marks[f"{side}{i}"] = (st, self.t)
        self.say(ctx.DE("Und zum Ausziehen und Abnehmen sagst du für beides dasselbe Wort:"), "out")
        self.wait(0.25)
        self.say(ctx.TR("çıkarmak."), "out_tr")
        self.finish(1.2)
        self.pill = ctx.pill
        self.heads = [pill(g, [("giymek", "ExtraBold", 50, RED), ("  = anziehen", "SemiBold", 36, INK),
                               ("  (Kleidung, Schuhe)", "Medium", 28, MUTED)], h=96, minw=780, fill=RED_SOFT),
                      pill(g, [("takmak", "ExtraBold", 50, TEAL), ("  = anlegen", "SemiBold", 36, INK),
                               ("  (Brille, Uhr, Schmuck)", "Medium", 28, MUTED)], h=96, minw=780, fill=(214, 243, 238))]
        self.cells = {}
        for side, verb in (("l", "giymek"), ("r", "takmak")):
            col = RED if side == "l" else TEAL
            for i, (tr, de, emo) in enumerate(WEAR[verb]):
                word, form = tr[:-1].split(" ")
                self.cells[(side, i)] = pill(g, [(word + " ", "Bold", 40, INK), (form, "ExtraBold", 40, col), (".", "Bold", 40, INK),
                                                 (f"   {de}", "Medium", 25, MUTED)], h=96, icon=emo, minw=780)
        self.out = pill(g, [("çıkarmak", "ExtraBold", 44, GOLD), (" = ausziehen / abnehmen  (für beides)", "Medium", 34, MUTED)],
                        h=84, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus 2: giymek oder takmak?", y=105, size=58)
        for k, side in enumerate("lr"):
            if t >= self.m(f"{side}v")[0]:
                op, dy = appear(t, self.m(f"{side}v")[0])
                put_center(f, self.heads[k], 480 + k * 960, 235 + dy, opacity=op)
        for (side, i), im in self.cells.items():
            st = self.m(f"{side}{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, 480 + (0 if side == "l" else 960), 380 + i * 135 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"{side}{i}") else 1.0)
        if t >= self.m("out_tr")[0] - 0.05:
            op, dy = appear(t, self.m("out_tr")[0] - 0.05)
            put_center(f, self.out, W / 2, 880 + dy, opacity=op)
        for k in ("intro", "out"):
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
        ctx, "Kıyafetler", "Kleidung & Accessoires auf Türkisch",
        [("kı · ja · fet · ", "Bold", 46, MUTED), ("ler", "Bold", 46, RED), ("   =   die Kleidung", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du fünfunddreißig Wörter für Kleidung, Schuhe, Accessoires und Schmuck.", "welcome"),
         ("de", "Kleidung heißt auf Türkisch:", "word"), ("tr", "Kıyafetler.", "kiyafet"),
         ("tr_slow", "Kıyafetler.", "kiyafet2")],
        title_mark="kiyafet")
    scenes = [title, HowToScene(ctx, BY_TR["gömlek"])]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        ColorsScene(ctx),
        WearScene(ctx),
        PhraseGridScene(ctx, "Bonus 3: Im Geschäft", "Bonus drei: vier Sätze zum Einkaufen.",
                        SHOP, chapter="Sätze im Geschäft",
                        note=[("var mı?", "ExtraBold", 38, RED), (" = gibt es …?   ·   ", "Medium", 32, MUTED),
                              ("daha büyük", "Bold", 36, TEAL), (" = größer   ·   ", "Medium", 32, MUTED),
                              ("bunu", "Bold", 36, TEAL), (" = das (hier)   ·   ", "Medium", 32, MUTED),
                              ("almak", "Bold", 36, TEAL), (" = nehmen, kaufen", "Medium", 32, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 35 Wörter auf einen Blick",
                      "Hier sind alle fünfunddreißig Wörter auf einen Blick.", cols=7),
        OutroScene(ctx, "Çok yakışmış!", "Steht dir super!", "Jetzt kennst du 35 Wörter für Kleidung und Accessoires!",
                   ["Super gemacht! Jetzt kennst du fünfunddreißig Wörter für Kleidung und Accessoires.",
                    "Tipp: Sag morgens beim Anziehen auf Türkisch, was du anziehst."],
                   icon="1f455"),
    ]
    return scenes


def emoji_codes():
    codes = ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
             | {e for *_, e in COLORS} | {e for *_, e in SHOP})
    for rows in WEAR.values():
        codes |= {e for *_, e in rows}
    return codes


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="kiyafet_kleidung_deutsch_tuerkisch.mp4", title="Kıyafetler – Kleidung auf Türkisch")
