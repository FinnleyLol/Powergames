"""
Bausteine für Nomen-Lernvideos (Wortkarten mit Bild): Titel, Anleitung, Kapitel, Vokabelkarte,
Satz-Raster, Quiz, Übersicht und Abschluss. Ein Video liefert nur noch die Inhalte (Noun, Chapter)
und eigene Grammatik-Szenen.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

from .engine import *  # noqa: F401,F403

NUM_WORDS = {1: "eins", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf"}


@dataclass
class Noun:
    de: str            # Anzeige Deutsch (mit Artikel)
    tr: str            # Türkisch
    emoji: str         # Twemoji-Code
    syl: list          # Aussprache-Silben (deutsche Schreibweise)
    stress: int        # Index der betonten Silbe
    note: str = ""     # Tipp
    de_say: str = ""   # Was die deutsche Stimme sagt (falls abweichend)
    tr_say: str = ""   # Schreibweise nur für die türkische Stimme (falls sie das Wort sonst undeutlich spricht)
    # nur für RichCardScene:
    form: str = ""        # gebeugte Form mit | zwischen Stamm und Endung, z. B. „üşü|yorum“
    form_de: str = ""     # „mir ist kalt“
    form_label: str = ""  # „ich-Form“, „es-Form“ …
    sent: str = ""        # Beispielsatz (Türkisch)
    sent_de: str = ""     # Übersetzung
    sent_hl: str = ""     # Teil des Satzes, der rot markiert wird

    def speak(self, ctx, slow=False):
        return ctx.TR((self.tr_say or self.tr) + ".", slow=slow, expect=self.tr + ".")


VOWELS = set("aeiouyøœɯɪʊɛæɔə")


def voice_stress(ctx, text):
    """(Anzahl Silben, betonte Silbe) so, wie die türkische Stimme das Wort betont (aus der Lautschrift)."""
    ph = "".join(sum(ctx.tr.voice.phonemize(text), []))
    n, stress = 0, None
    for ch in ph:
        if ch == "ˈ" and stress is None:
            stress = n
        if ch in VOWELS:
            n += 1
    return n, stress


def fill_stress(ctx, items):
    """Setzt bei Wörtern ohne Angabe (stress=None) die betonte Silbe passend zur Stimme, damit
    Aussprache-Hinweis und Ton nie widersprechen."""
    for it in items:
        if it.stress is None:
            n, s = voice_stress(ctx, it.tr_say or it.tr)
            if n != len(it.syl) or s is None:
                raise ValueError(f"Silben von „{it.tr}“ passen nicht zur Stimme: {it.syl} vs. {n} Silben")
            it.stress = s


@dataclass
class Chapter:
    tr: str
    de: str
    icon: str
    items: list = field(default_factory=list)


# ---------------------------- Titel ---------------------------------------------------
class TitleScene(Scene):
    """Titel mit schwebenden Emojis. say = Liste (sprache, text, marke), z. B. ("tr", "Merhaba!", "hello")."""
    chapter = "Merhaba – Einführung"

    def __init__(self, ctx, title, subtitle, hint_segs, floaters, say, title_mark, lang_note="mit Aussprache"):
        super().__init__(ctx)
        g = self.g
        self.wait(0.6)
        self.sfx("chord")
        for lang, text, mark in say:
            clip = ctx.TR(text) if lang == "tr" else ctx.TR(text, slow=True) if lang == "tr_slow" else ctx.DE(text)
            self.say(clip, mark)
            self.wait(0.4 if lang != "tr" else 0.5)
        self.finish(0.8)
        self.title_marks = [k for k in self.marks if k.startswith(title_mark)]
        self.hint_mark = title_mark
        self.title = text_layer(g, [(title, "ExtraBold", g.fit("ExtraBold", title, 220, 1300).size, RED)])
        self.sub = text_layer(g, [(subtitle, "SemiBold", 66, INK)])
        self.hint = text_layer(g, hint_segs)
        self.merhaba = text_layer(g, [("Merhaba!", "Bold", 54, TEAL), ("  –  Hallo!", "Medium", 54, MUTED)])
        lang = text_layer(g, [("Deutsch  ", "SemiBold", 40, INK), ("→", "SemiBold", 40, RED),
                              (f"  Türkçe   ·   {lang_note}", "SemiBold", 40, INK)])
        self.lang, lpad = box(lang.width + 170, 84, 42, WHITE, blur=14, sh_alpha=35)
        put_center(self.lang, g.emoji("1f1e9-1f1ea", 48), lpad + 52, lpad + 42)
        put_center(self.lang, g.emoji("1f1f9-1f1f7", 48), lpad + lang.width + 120, lpad + 42)
        put(self.lang, lang, lpad + 85, lpad + 42 - lang.baseline + 13)
        pos = [(260, 1590, 300), (220, 330, 290), (250, 300, 800), (260, 1620, 810),
               (170, 180, 525), (160, 1320, 190), (170, 1745, 545), (150, 590, 170)]
        self.floaters = [(code, *p) for code, p in zip(floaters, pos)]

    def render(self, t):
        f = self.g.bg.copy()
        for i, (code, size, x, y) in enumerate(self.floaters):
            p = ease_out_back((t - 0.1 * i) / 0.6)
            put_center(f, self.g.emoji(code, size), x, y + math.sin(t * 1.6 + i) * 12,
                       opacity=clamp((t - 0.1 * i) / 0.3), scale=max(0.01, 0.5 + 0.5 * p))
        pulse = 1.0
        for mk in self.title_marks:
            if self.active(t, mk):
                pulse = 1 + 0.04 * math.sin(self.since(t, mk) * 10)
        put_center(f, self.title, W / 2, 440, opacity=clamp(t / 0.5),
                   scale=pulse * (0.9 + 0.1 * ease_out_cubic(t / 0.6)))
        put_center(f, self.sub, W / 2, 652, opacity=clamp((t - 0.3) / 0.5))
        put_center(f, self.lang, W / 2, 770, opacity=clamp((t - 0.5) / 0.5))
        if "hello" in self.marks and t >= self.m("hello")[0]:
            put_center(f, self.merhaba, W / 2, 200, opacity=clamp(self.since(t, "hello") / 0.3))
        if t >= self.m(self.hint_mark)[0]:
            put_center(f, self.hint, W / 2, 895, opacity=clamp(self.since(t, self.hint_mark) / 0.3))
        return f


# ---------------------------- Anleitung (kurz) ----------------------------------------
class HowToScene(Scene):
    chapter = "So lernst du"

    def __init__(self, ctx, example: Noun):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Du kennst das schon:"), "intro")
        self.wait(0.2)
        self.say(ctx.DE("Erst hörst du das deutsche Wort, dann das türkische, einmal normal und einmal langsam."), "s1")
        self.wait(0.25)
        self.say(ctx.DE("In der Pause sprichst du laut nach. Die rote Silbe wird betont."), "s3")
        self.finish(0.8)
        steps = [("1f442", "1. Hören", "Erst Deutsch,", "dann Türkisch"),
                 ("1f40c", "2. Langsam", "Das türkische Wort", "noch einmal langsam"),
                 ("1f5e3", "3. Nachsprechen", "In der Pause", "laut nachsprechen!")]
        self.cards = []
        for icon, title, l1, l2 in steps:
            im, pad = box(500, 400, 40, WHITE)
            put_center(im, g.emoji(icon, 130), pad + 250, pad + 110)
            place(im, text_layer(g, [(title, "Bold", 48, INK)]), pad + 250, pad + 225, 48, align="center")
            for j, line in enumerate((l1, l2)):
                place(im, text_layer(g, [(line, "Medium", 34, MUTED)]), pad + 250, pad + 290 + j * 48, 34, align="center")
            self.cards.append(im)
        segs = [("Betonung: ", "SemiBold", 40, INK)]
        for i, s in enumerate(example.syl):
            if i:
                segs.append((" · ", "Bold", 44, MUTED))
            segs.append((s, "Bold", 44, RED if i == example.stress else MUTED))
        segs.append((f"  ({example.tr})  –  die rote Silbe betonen", "Medium", 38, MUTED))
        self.tip = pill(g, segs, h=90, fill=NOTE_BG, icon="1f4a1")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "So lernst du mit diesem Video", y=175, size=66)
        starts = [self.m("s1")[0] - 0.2, self.m("s1")[0] + 1.8, self.m("s3")[0]]
        for i, im in enumerate(self.cards):
            op, dy = appear(t, starts[i], 0.35)
            put_center(f, im, 160 + i * 560 + 250, 500 + dy * 2, opacity=op)
        if t >= self.m("s3")[0] + 1.5:
            op, dy = appear(t, self.m("s3")[0] + 1.5)
            put_center(f, self.tip, W / 2, 860 + dy, opacity=op)
        return f


# ---------------------------- Kapitel -------------------------------------------------
class ChapterScene(Scene):
    def __init__(self, ctx, num, ch: Chapter):
        super().__init__(ctx)
        g = self.g
        self.ch = ch
        self.chapter = f"{ch.tr} – {ch.de}"
        self.wait(0.2)
        self.sfx("chord")
        self.say(ctx.DE(f"Kapitel {NUM_WORDS[num]}: {ch.de.replace('&', 'und')}."), "de")
        self.wait(0.3)
        self.say(ctx.TR(ch.tr + "."), "tr")
        self.finish(0.9)
        self.kap = text_layer(g, [(f"BÖLÜM {num}", "SemiBold", 36, RED), (f"  ·  KAPITEL {num}", "SemiBold", 36, MUTED)])
        self.trl = text_layer(g, [(ch.tr, "ExtraBold", g.fit("ExtraBold", ch.tr, 130, 1700).size, RED)])
        self.del_ = text_layer(g, [(ch.de, "SemiBold", 70, TEAL)])
        self.icons = [n.emoji for n in ch.items]

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
        step = min(150, 1640 / max(1, n))
        size = int(min(110, step * 0.78))
        for i, code in enumerate(self.icons):
            x = W / 2 + (i - (n - 1) / 2) * step
            p = (t - 0.4 - i * 0.06) / 0.4
            put_center(f, self.g.emoji(code, size), x, 860 + math.sin(t * 2 + i) * 6, opacity=clamp(p),
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
    for flag, label, cy in (("1f1e9-1f1ea", "DEUTSCH", 232), ("1f1f9-1f1f7", "TÜRKÇE", 462)):
        put_center(base, g.emoji(flag, 44), RX + 22, cy)
        place(base, text_layer(g, [(label, "SemiBold", 30, MUTED)]), RX + 62, cy, 30)
    ImageDraw.Draw(base).rounded_rectangle([RX, 404, RX + RW, 408], 2, fill=LINE)
    return base


def pron_layer(g: Gfx, n: Noun):
    """Aussprache-Hinweis. Eine Silbe mit „_“ davor beginnt ein neues Wort (breiterer Abstand).
    Passt der Hinweis nicht in die Spalte, wird die Schrift kleiner."""
    k = 1.0
    while True:
        segs = [("Aussprache:  ", "Medium", int(36 * k), MUTED)]
        for i, s in enumerate(n.syl):
            new_word = s.startswith("_")
            if i:
                segs.append(("   " if new_word else " · ", "Medium", int(50 * k), MUTED))
            segs.append((s.lstrip("_"), "Bold", int(54 * k), RED if i == n.stress else INK))
        im = pill(g, segs, h=96, padx=30)
        if im.width - 2 * im.pad <= RW or k < 0.6:
            return im
        k -= 0.05


def note_layer(g: Gfx, text):
    size = g.fit("Medium", text, 34, RW - 120).size
    return pill(g, [(text, "Medium", size, INK)], h=76, fill=NOTE_BG, icon="1f4a1", padx=26)


class CardScene(Scene):
    """Wortkarte: Bild, deutsches Wort, türkisches Wort (normal + langsam), Aussprache, Tipp, Nachsprechen."""

    def __init__(self, ctx, n: Noun, ch: Chapter, idx: int, total: int):
        super().__init__(ctx)
        g = self.g
        self.n = n
        self.sfx("pop", at=0.05)
        self.wait(0.55)
        self.say(ctx.DE(n.de_say or n.de), "de")
        self.wait(0.4)
        self.say(n.speak(ctx), "tr")
        self.wait(0.55)
        slow = n.speak(ctx, slow=True)
        self.say(slow, "slow")
        self.wait(0.15)
        rep = max(2.4, 1.3 * len(slow) / SR + 1.2)
        self.span("speak", rep)
        self.wait(rep)
        self.finish(0.25)

        self.base = ctx.card_base.copy()
        self.title_bar(self.base, ch.icon, ch.tr, ch.de, right=f"{idx} / {total}", progress=idx / total)
        self.emo = g.emoji(n.emoji, 620)
        self.del_ = text_layer(g, [(n.de, "SemiBold", g.fit("SemiBold", n.de, 84, RW).size, TEAL)])
        self.trl = text_layer(g, [(n.tr, "ExtraBold", g.fit("ExtraBold", n.tr, 180, RW).size, RED)])
        self.pron = pron_layer(g, n)
        self.note = note_layer(g, n.note) if n.note else None
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 540 / 620))
        op, dy = appear(t, 0.25, 0.3)
        place(f, self.del_, RX, 325, 84, opacity=op, dy=dy)
        if t >= self.m("tr")[0] - 0.05:
            s = self.since(t, "tr") + 0.05
            pulse = 1 + (0.03 * math.sin(self.since(t, "slow") * 8) if self.active(t, "slow") else 0)
            sc = (0.85 + 0.15 * ease_out_back(s / 0.4)) * pulse
            im = self.trl
            put_center(f, im, RX - 12 + im.width / 2, 640 - im.baseline + im.height / 2, opacity=clamp(s / 0.25), scale=sc)
            op, dy = appear(t, self.m("tr")[0] + 0.2)
            put_left(f, self.pron, RX, 700, op, dy)
        if self.note and t >= self.m("slow")[0]:
            op, dy = appear(t, self.m("slow")[0])
            put_left(f, self.note, RX, 822, op, dy)
        state, since, prog, playing = state_at(self, t, ["de", "tr", "slow", "speak"], {})
        self.pill.draw(f, state, since, t, prog, bars=playing and prog is None)
        return f


# ---------------------------- Wortkarte mit Form und Beispielsatz -----------------------
def rich_card_base(ctx: Ctx):
    g = ctx.gfx
    base = g.bg.copy()
    im, pad = box(CARD_S, CARD_S, 56, WHITE, blur=26, sh_alpha=60, sh_dy=16)
    base.paste(im, (CARD_X - pad, CARD_Y - pad), im)
    for flag, label, cy in (("1f1e9-1f1ea", "DEUTSCH", 208), ("1f1f9-1f1f7", "TÜRKÇE", 366)):
        put_center(base, g.emoji(flag, 42), RX + 21, cy)
        place(base, text_layer(g, [(label, "SemiBold", 28, MUTED)]), RX + 58, cy, 28)
    ImageDraw.Draw(base).rounded_rectangle([RX, 326, RX + RW, 330], 2, fill=LINE)
    return base


def highlight_segs(text, hl, size, color=INK, hl_color=RED, weight="Bold"):
    i = text.find(hl) if hl else -1
    if i < 0:
        return [(text, weight, size, color)]
    parts = [(text[:i], color), (hl, hl_color), (text[i + len(hl):], color)]
    return [(p, weight, size, c) for p, c in parts if p]


class RichCardScene(Scene):
    """Wortkarte für Nomen, Adjektive und Verben: Wort (normal + langsam) → optional gebeugte Form
    → optional Beispielsatz, jeweils mit Pause zum Nachsprechen."""
    ORDER = ["de", "tr", "slow", "speak1", "form", "form_de", "speak_form", "sent_de", "sent", "speak2"]
    MAP = {"speak1": "speak", "form": "tr_form", "form_de": "de", "speak_form": "recall", "sent_de": "de",
           "sent": "tr_sent", "speak2": "speak_sent"}
    STATES = {
        "tr_form": ("1f442", "Die Form im Satz – hör genau hin", False),
        "tr_sent": ("1f442", "Beispielsatz – hör genau hin", False),
        "recall": ("1f5e3", "Jetzt du! Sag es auf Türkisch", True),
        "speak_sent": ("1f5e3", "Jetzt du! Sprich den Satz nach", True),
    }

    def __init__(self, ctx, n: Noun, ch: Chapter, idx: int, total: int):
        super().__init__(ctx)
        g = self.g
        self.n = n
        self.sfx("pop", at=0.05)
        self.wait(0.5)
        self.say(ctx.DE(n.de_say or n.de), "de")
        self.wait(0.35)
        self.say(n.speak(ctx), "tr")
        self.wait(0.45)
        slow = n.speak(ctx, slow=True)
        self.say(slow, "slow")
        self.wait(0.15)
        self.span("speak1", max(2.0, 1.2 * len(slow) / SR + 0.9))
        self.wait(self.m("speak1")[1] - self.t)
        if n.form:
            plain = n.form.replace("|", "")
            self.say(ctx.TR(plain + "."), "form")
            self.wait(0.25)
            self.say(ctx.DE(n.form_de.replace(" / ", ", ")), "form_de")
            self.wait(0.1)
            self.span("speak_form", 1.8)
            self.wait(2.1)
        if n.sent:
            self.say(ctx.DE(n.sent_de), "sent_de")
            self.wait(0.3)
            sent = ctx.TR(n.sent)
            self.say(sent, "sent")
            self.wait(0.15)
            self.span("speak2", max(2.2, 1.15 * len(sent) / SR + 0.8))
            self.wait(self.m("speak2")[1] - self.t)
        self.finish(0.25)

        self.base = ctx.rich_card_base.copy()
        self.title_bar(self.base, ch.icon, ch.tr, ch.de, right=f"{idx} / {total}", progress=idx / total)
        self.emo = g.emoji(n.emoji, 620)
        self.del_ = text_layer(g, [(n.de, "SemiBold", g.fit("SemiBold", n.de, 76, RW).size, TEAL)])
        size = g.fit("ExtraBold", n.tr, 136, RW).size
        self.word = text_layer(g, [(n.tr, "ExtraBold", size, RED)])
        segs = [("Aussprache:  ", "Medium", 28, MUTED)]
        for i, s_ in enumerate(n.syl):
            if i:
                segs.append((" · ", "Medium", 30, MUTED))
            segs.append((s_, "Bold", 34, RED if i == n.stress else INK))
        self.hint = text_layer(g, segs)
        y = 562
        self.form_y = self.sent_y = self.note_y = None
        self.form = self.sentence = self.note = None
        if n.form:
            stem, end = n.form.split("|")
            self.form = pill(g, [(f"{n.form_label or 'Form'}:  ", "Medium", 30, MUTED), (stem, "Bold", 50, INK),
                                 (end, "Bold", 50, RED), (f"   = {n.form_de}", "Medium", 34, TEAL)], h=88, padx=30)
            self.form_y, y = y, y + 106
        if n.sent:
            fs = 52
            while fs > 30 and text_layer(g, highlight_segs(n.sent, n.sent_hl, fs)).width > RW - 70:
                fs -= 2
            tr = text_layer(g, highlight_segs(n.sent, n.sent_hl, fs))
            de = text_layer(g, [(n.sent_de, "Medium", g.fit("Medium", n.sent_de, 34, RW - 70).size, MUTED)])
            im, pad = box(RW, 140, 34, WHITE, blur=12, sh_alpha=30, sh_dy=5)
            place(im, tr, pad + 34, pad + 52, fs)
            place(im, de, pad + 34, pad + 106, 34)
            im.pad = pad  # type: ignore[attr-defined]
            self.sentence = im
            self.sent_y, y = y, y + 168
        if n.note:
            nsz = g.fit("Medium", n.note, 30, RW - 110).size
            self.note = pill(g, [(n.note, "Medium", nsz, INK)], h=64, fill=NOTE_BG, icon="1f4a1", padx=24)
            self.note_y = y
        self.pill = ctx.rich_pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 520 / 620))
        op, dy = appear(t, 0.25)
        place(f, self.del_, RX, 284, 76, opacity=op, dy=dy)
        if t >= self.m("tr")[0] - 0.05:
            s = self.since(t, "tr") + 0.05
            pulse = 1 + (0.03 * math.sin(self.since(t, "slow") * 8) if self.active(t, "slow") else 0)
            sc = (0.85 + 0.15 * ease_out_back(s / 0.4)) * pulse
            put_center(f, self.word, RX - 12 + self.word.width / 2, 516 - self.word.baseline + self.word.height / 2,
                       opacity=clamp(s / 0.25), scale=sc)
            place(f, self.hint, RX + RW, 366, 30, opacity=clamp((s - 0.2) / 0.3), align="right")
        if self.note is not None and t >= self.m("slow")[0]:
            op, dy = appear(t, self.m("slow")[0])
            put_left(f, self.note, RX, self.note_y, op, dy)
        if self.form is not None and t >= self.m("form")[0] - 0.05:
            op, dy = appear(t, self.m("form")[0] - 0.05)
            put_left(f, self.form, RX, self.form_y, op, dy)
        if self.sentence is not None and t >= self.m("sent_de")[0] - 0.05:
            op, dy = appear(t, self.m("sent_de")[0] - 0.05)
            put_left(f, self.sentence, RX, self.sent_y, op, dy)
        state, since, prog, playing = state_at(self, t, self.ORDER, self.MAP)
        self.pill.draw(f, state, since, t, prog, bars=playing and prog is None)
        return f


# ---------------------------- Satz-Raster (z. B. Super-Sätze) --------------------------
class PhraseGridScene(Scene):
    """Bis zu 4 Sätze als Karten (2×2): Türkisch, Deutsch, Pause zum Nachsprechen."""

    def __init__(self, ctx, heading, intro, phrases, chapter=None, note=None):
        super().__init__(ctx)
        g = self.g
        self.heading_text = heading
        self.chapter = chapter
        self.wait(0.3)
        self.say(ctx.DE(intro), "intro")
        self.wait(0.4)
        for i, (tr, de, _) in enumerate(phrases):
            st = self.t
            self.say(ctx.TR(tr), f"tr{i}")
            self.wait(0.3)
            self.say(ctx.DE(de), f"de{i}")
            self.wait(0.15)
            self.span(f"speak{i}", 2.6)
            self.wait(2.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.finish(0.4)
        self.n = len(phrases)
        self.cards = []
        for tr, de, emo in phrases:
            pair = []
            for hot in (False, True):
                im, pad = box(820, 230, 40, RED_SOFT if hot else WHITE, outline=RED if hot else None,
                              ow=5 if hot else 0, blur=16, sh_alpha=40)
                put_center(im, g.emoji(emo, 100), pad + 95, pad + 115)
                size = g.fit("ExtraBold", tr, 56, 600).size
                place(im, text_layer(g, [(tr, "ExtraBold", size, RED)]), pad + 180, pad + 95, size)
                place(im, text_layer(g, [(de, "Medium", g.fit("Medium", de, 34, 600).size, MUTED)]), pad + 180, pad + 160, 34)
                pair.append(im)
            self.cards.append(pair)
        self.note = pill(g, note, h=84, fill=NOTE_BG, icon="1f4a1") if note else None
        self.pill = ctx.pill

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, self.heading_text, y=120, size=60)
        cur = -1
        for i in range(self.n):
            if t >= self.m(f"row{i}")[0]:
                cur = i
        for i, pair in enumerate(self.cards):
            st = self.m(f"row{i}")[0]
            if t < st:
                continue
            op, dy = appear(t, st)
            col, row = i % 2, i // 2
            put_center(f, pair[1 if i == cur else 0], 520 + col * 880, 340 + row * 270 + dy, opacity=op)
        if self.note:
            op, dy = appear(t, self.m("intro")[0] + 1.0)
            put_center(f, self.note, W / 2, 870 + dy, opacity=op)
        order, mapping = ["intro"], {"intro": "de"}
        for i in range(self.n):
            order += [f"tr{i}", f"de{i}", f"speak{i}"]
            mapping.update({f"tr{i}": "tr", f"de{i}": "de", f"speak{i}": "speak"})
        state, since, prog, playing = state_at(self, t, order, mapping)
        self.pill.draw(f, state, since, t, prog, bars=playing and prog is None)
        return f


# ---------------------------- Quiz ----------------------------------------------------
class QuizIntroScene(Scene):
    chapter = "Quiz"

    def __init__(self, ctx, say_line="Quiz-Zeit! Ich zeige dir ein Bild.",
                 sub="Sag das türkische Wort, bevor die Lösung kommt."):
        super().__init__(ctx)
        self.wait(0.3)
        self.sfx("chord")
        self.say(ctx.DE(say_line), "a")
        self.wait(0.2)
        self.say(ctx.DE("Sag das türkische Wort laut, bevor die Lösung kommt. Bereit?"), "b")
        self.finish(0.8)
        self.t1 = text_layer(self.g, [("Quiz-Zeit!", "ExtraBold", 150, RED)])
        self.t2 = text_layer(self.g, [(sub, "SemiBold", 50, INK)])

    def render(self, t):
        f = self.g.bg.copy()
        put_center(f, self.g.emoji("1f9e0", 220), W / 2, 300 + math.sin(t * 2) * 8, opacity=clamp(t / 0.3),
                   scale=0.6 + 0.4 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 540, opacity=clamp((t - 0.2) / 0.3))
        put_center(f, self.t2, W / 2, 680, opacity=clamp((t - self.m("b")[0]) / 0.3))
        return f


class QuizScene(Scene):
    COUNT = 3

    def __init__(self, ctx, n: Noun, idx, total):
        super().__init__(ctx)
        g = self.g
        self.n = n
        self.sfx("pop", at=0.05)
        self.wait(0.5)
        self.say(ctx.DE(n.de_say or n.de), "de")
        self.wait(0.2)
        self.span("count", self.COUNT + 0.6)
        for i in range(self.COUNT):
            self.sfx("tick", at=self.t + 0.3 + i)
        self.wait(self.COUNT + 0.6)
        self.sfx("ding")
        self.say(n.speak(ctx), "tr")
        self.wait(0.4)
        self.say(n.speak(ctx, slow=True), "slow")
        self.span("speak", 1.8)
        self.wait(1.8)
        self.finish(0.2)
        self.base = ctx.card_base.copy()
        self.title_bar(self.base, "1f9e0", "Quiz", "Wie heißt das auf Türkisch?", right=f"{idx} / {total}",
                       progress=idx / total)
        self.emo = g.emoji(n.emoji, 620)
        self.del_ = text_layer(g, [(n.de, "SemiBold", g.fit("SemiBold", n.de, 84, RW).size, TEAL)])
        self.trl = text_layer(g, [(n.tr, "ExtraBold", g.fit("ExtraBold", n.tr, 180, RW).size, RED)])
        self.qm = text_layer(g, [("? ? ?", "ExtraBold", 150, (215, 200, 190))])
        self.pron = pron_layer(g, n)
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 540 / 620))
        op, dy = appear(t, 0.25, 0.3)
        place(f, self.del_, RX, 325, 84, opacity=op, dy=dy)
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
            put_left(f, self.pron, RX, 700, clamp((s - 0.25) / 0.3))
            put_center(f, self.g.emoji("2705", 110), 1700, 250, opacity=clamp(s / 0.2),
                       scale=0.5 + 0.5 * ease_out_back(s / 0.4))
        state, since = None, 0
        if self.active(t, "de"):
            state, since = "de", self.since(t, "de")
        if self.active(t, "count"):
            state, since = "think", self.since(t, "count")
        if t >= self.m("tr")[0]:
            state, since = "answer", self.since(t, "tr")
        self.pill.draw(f, state, since, t, None, bars=False)
        return f


# ---------------------------- Übersicht & Ende ----------------------------------------
class OverviewScene(Scene):
    chapter = "Übersicht"

    def __init__(self, ctx, items, heading, say_line, cols=6):
        super().__init__(ctx)
        g = self.g
        self.wait(0.4)
        self.say(ctx.DE(say_line), "a")
        self.wait(0.3)
        self.say(ctx.DE("Halte das Video an und mach einen Screenshot!"), "b")
        self.wait(5.0)
        self.finish(0.3)
        self.base = g.bg.copy()
        self.heading(self.base, heading, y=88, size=54)
        self.cells = []
        rows = math.ceil(len(items) / cols)
        cw = min(290, 1760 // cols)
        ch_ = min(186, 930 // rows)
        x0, y0 = (W - cols * cw) / 2, 128
        for i, n in enumerate(items):
            iw, ih = cw - 14, ch_ - 14
            k = min(1.0, ih / 172)  # Skalierung für kleinere Zellen
            im, pad = box(iw, ih, 26, WHITE, blur=8, sh_alpha=25, sh_dy=3)
            put_center(im, g.emoji(n.emoji, int(72 * k)), pad + iw / 2, pad + 50 * k)
            size = g.fit("Bold", n.tr, int(40 * k), iw - 26).size
            place(im, text_layer(g, [(n.tr, "Bold", size, RED)]), pad + iw / 2, pad + 116 * k, size, align="center")
            de = n.de.split(" / ")[0]
            dsz = g.fit("Medium", de, int(25 * k), iw - 26).size
            place(im, text_layer(g, [(de, "Medium", dsz, MUTED)]), pad + iw / 2, pad + 152 * k, dsz, align="center")
            col, row = i % cols, i // cols
            self.cells.append((im, x0 + col * cw + cw / 2, y0 + row * ch_ + ch_ / 2))

    def render(self, t):
        f = self.base.copy()
        for i, (im, x, y) in enumerate(self.cells):
            p = (t - i * 0.035) / 0.35
            put_center(f, im, x, y + (1 - ease_out_cubic(p)) * 20, opacity=clamp(p))
        return f


class OutroScene(Scene):
    chapter = "Tebrikler!"

    def __init__(self, ctx, big_tr, big_de, sub, de_lines, icon="1f389"):
        super().__init__(ctx)
        g = self.g
        self.chapter = big_tr
        self.icon = icon
        self.wait(0.3)
        self.sfx("fanfare")
        self.say(ctx.TR(big_tr), "big")
        for i, line in enumerate(de_lines):
            self.wait(0.3)
            self.say(ctx.DE(line), f"a{i}")
        self.wait(0.35)
        self.say(ctx.TR("Görüşürüz!"), "gor")
        self.wait(0.2)
        self.say(ctx.DE("Bis bald!"), "bye")
        self.finish(2.0)
        self.t1 = text_layer(g, [(big_tr, "ExtraBold", 180, RED), (f"  = {big_de}", "SemiBold", 56, MUTED)])
        self.t2 = text_layer(g, [(sub, "SemiBold", g.fit("SemiBold", sub, 48, 1760).size, INK)])
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
        put_center(f, self.g.emoji(self.icon, 200), W / 2, 230, opacity=clamp(t / 0.3),
                   scale=0.5 + 0.5 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 470, opacity=clamp((t - 0.2) / 0.3),
                   scale=0.85 + 0.15 * ease_out_back((t - 0.2) / 0.5))
        put_center(f, self.t2, W / 2, 610, opacity=clamp((t - self.m("a0")[0]) / 0.3))
        if t >= self.m("gor")[0]:
            s = self.since(t, "gor")
            put_center(f, self.t3, W / 2, 760, opacity=clamp(s / 0.3))
            put_center(f, self.g.emoji("1f44b", 110), W / 2 + self.t3.width / 2 + 80, 760, opacity=clamp(s / 0.3))
        put_center(f, self.credits, W / 2, 1040, opacity=clamp((t - 1) / 0.5))
        return f


NOUN_ICONS = ["1f9e0", "2705", "1f4a1", "1f389", "1f44b", "1f442", "1f40c", "1f5e3"]
