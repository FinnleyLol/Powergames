#!/usr/bin/env python3
"""
Lernvideo „Fiiller – Verben“: die 20 wichtigsten türkischen Verben für Anfänger.

Erzeugt ein 1080p-MP4 mit:
  * Grammatik in kleinen Schritten: Grundform -mek/-mak, Stamm = Befehl, Ich-Form -iyorum,
    ich/du/er-Endungen, Satzbau (Verb am Ende)
  * 20 Verbkarten in 4 Kapiteln: Grundform (normal + langsam) → Ich-Form → Beispielsatz
    mit bekannten Nomen (Essen, Tiere, Orte …), jeweils mit Pause zum Nachsprechen
  * Verneinung mit -m-, Super-Sätze für Anfänger, Quiz, Übersicht, Abschluss

Die gemeinsame Technik (Stimmen, Grafik, Rendern) steckt in ../lernvideo/engine.py.

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/fiiller_verben_deutsch_tuerkisch.mp4
    python make_video.py --preview            # nur Standbilder zur Kontrolle (build/preview/)
    python make_video.py --verify --takes 14  # Aussprache per Whisper prüfen (beste Aufnahme je Satz)
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

RED_LIGHT = (236, 128, 138)
GOLD = (190, 105, 0)
GOLD_SOFT = (255, 238, 204)
TEAL_SOFT = (214, 243, 238)


# --------------------------------------------------------------------------------------
# Inhalte
# --------------------------------------------------------------------------------------
@dataclass
class Verb:
    tr: str            # Grundform (Infinitiv), z. B. gelmek
    de: str            # deutsche Grundform (Anzeige)
    ich: str           # Ich-Form mit | zwischen Stamm und Endung, z. B. gel|iyorum
    ich_de: str        # „ich komme“
    emoji: str         # Twemoji-Code
    syl: list          # Aussprache der Grundform (deutsche Schreibweise), betont: letzte Silbe
    sent: str          # Beispielsatz (Türkisch)
    sent_de: str       # Übersetzung
    sent_verb: str     # Verbform im Satz (wird rot markiert)
    note: str = ""     # Tipp
    de_say: str = ""   # Was die deutsche Stimme sagt (falls abweichend)

    @property
    def stem(self):
        return self.tr[:-3]

    @property
    def suffix(self):
        return self.tr[-3:]

    @property
    def ich_plain(self):
        return self.ich.replace("|", "")


@dataclass
class Chapter:
    tr: str
    de: str
    icon: str
    verbs: list = field(default_factory=list)


CHAPTERS = [
    Chapter("Günlük hayat", "Alltag", "2600", [
        Verb("yemek", "essen", "yi|yorum", "ich esse", "1f37d", ["je", "mek"],
             "Elma yiyorum.", "Ich esse einen Apfel.", "yiyorum", "Auch ein Nomen: yemek = das Essen"),
        Verb("içmek", "trinken", "iç|iyorum", "ich trinke", "1f964", ["itsch", "mek"],
             "Su içiyorum.", "Ich trinke Wasser.", "içiyorum", "ç = „tsch“"),
        Verb("uyumak", "schlafen", "uyu|yorum", "ich schlafe", "1f634", ["u", "ju", "mak"],
             "Kedi uyuyor.", "Die Katze schläft.", "uyuyor", "uyuyor (ohne -um) = er / sie / es schläft"),
        Verb("çalışmak", "arbeiten", "çalış|ıyorum", "ich arbeite", "1f4bc", ["tscha", "lısch", "mak"],
             "Çok çalışıyorum.", "Ich arbeite viel.", "çalışıyorum", "çok = viel, sehr  ·  auch: lernen, üben"),
        Verb("yapmak", "machen", "yap|ıyorum", "ich mache", "1f6e0", ["jap", "mak"],
             "Ne yapıyorsun?", "Was machst du?", "yapıyorsun", "-sun = du:  yapıyorsun = du machst"),
    ]),
    Chapter("Hareket", "Bewegung", "1f45f", [
        Verb("gitmek", "gehen / fahren", "gid|iyorum", "ich gehe", "1f697", ["git", "mek"],
             "Eve gidiyorum.", "Ich gehe nach Hause.", "gidiyorum", "t wird zu d: gidiyorum  ·  eve = nach Hause",
             de_say="gehen, oder fahren"),
        Verb("gelmek", "kommen", "gel|iyorum", "ich komme", "1f6aa", ["gel", "mek"],
             "Köpek geliyor.", "Der Hund kommt.", "geliyor", "Gel! = Komm!  (Befehl = Stamm)"),
        Verb("yürümek", "zu Fuß gehen / spazieren", "yürü|yorum", "ich gehe zu Fuß", "1f6b6", ["jü", "rü", "mek"],
             "Parkta yürüyorum.", "Ich spaziere im Park.", "yürüyorum", "parkta = im Park",
             de_say="zu Fuß gehen, spazieren"),
        Verb("koşmak", "rennen", "koş|uyorum", "ich renne", "1f3c3", ["kosch", "mak"],
             "At koşuyor.", "Das Pferd rennt.", "koşuyor", "ş = „sch“"),
        Verb("oturmak", "sitzen / wohnen", "otur|uyorum", "ich sitze", "1fa91", ["o", "tur", "mak"],
             "Burada oturuyorum.", "Ich sitze (oder: wohne) hier.", "oturuyorum", "burada = hier",
             de_say="sitzen, oder wohnen"),
    ]),
    Chapter("Duyular ve dil", "Sinne & Sprache", "1f442", [
        Verb("görmek", "sehen", "gör|üyorum", "ich sehe", "1f440", ["gör", "mek"],
             "Bir kuş görüyorum.", "Ich sehe einen Vogel.", "görüyorum", "bir = ein / eine"),
        Verb("bakmak", "schauen", "bak|ıyorum", "ich schaue", "1f9d0", ["bak", "mak"],
             "Bak, bir kedi!", "Schau, eine Katze!", "Bak", "Bak! = Schau!  (Befehl = Stamm)"),
        Verb("dinlemek", "zuhören", "dinl|iyorum", "ich höre zu", "1f3a7", ["din", "le", "mek"],
             "Müzik dinliyorum.", "Ich höre Musik.", "dinliyorum", "Stamm dinle: das e fällt weg → dinliyorum"),
        Verb("konuşmak", "sprechen", "konuş|uyorum", "ich spreche", "1f4ac", ["ko", "nusch", "mak"],
             "Telefonda konuşuyorum.", "Ich telefoniere.", "konuşuyorum", "telefonda = am Telefon"),
        Verb("anlamak", "verstehen", "anl|ıyorum", "ich verstehe", "1f4a1", ["an", "la", "mak"],
             "Seni anlıyorum.", "Ich verstehe dich.", "anlıyorum", "seni = dich"),
    ]),
    Chapter("Diğer önemli fiiller", "Weitere wichtige Verben", "2b50", [
        Verb("istemek", "wollen / möchten", "ist|iyorum", "ich möchte", "1f64b", ["is", "te", "mek"],
             "Bir çay istiyorum.", "Ich möchte einen Tee.", "istiyorum", "So bestellst du im Café!",
             de_say="wollen, möchten"),
        Verb("sevmek", "lieben / mögen", "sev|iyorum", "ich mag", "2764", ["sew", "mek"],
             "Köpekleri seviyorum.", "Ich mag Hunde.", "seviyorum", "Seni seviyorum = Ich liebe dich",
             de_say="lieben, mögen"),
        Verb("bilmek", "wissen", "bil|iyorum", "ich weiß", "1f9e0", ["bil", "mek"],
             "Evet, biliyorum.", "Ja, ich weiß.", "biliyorum", "evet = ja  ·  hayır = nein"),
        Verb("öğrenmek", "lernen", "öğren|iyorum", "ich lerne", "1f4da", ["öö", "ren", "mek"],
             "Her gün Türkçe öğreniyorum.", "Ich lerne jeden Tag Türkisch.", "öğreniyorum",
             "ğ ist stumm – das ö wird lang"),
        Verb("almak", "nehmen / kaufen", "al|ıyorum", "ich kaufe", "1f6d2", ["al", "mak"],
             "Ekmek alıyorum.", "Ich kaufe Brot.", "alıyorum", "almak = nehmen oder kaufen",
             de_say="nehmen, kaufen"),
    ]),
]
ALL_VERBS = [v for ch in CHAPTERS for v in ch.verbs]
BY_TR = {v.tr: v for v in ALL_VERBS}
NUM_WORDS = {1: "eins", 2: "zwei", 3: "drei", 4: "vier"}

INFINITIVE_ROWS = [("gel", "mek", "kommen", "1f6aa"), ("iç", "mek", "trinken", "1f964"),
                   ("al", "mak", "nehmen", "1f6d2"), ("yap", "mak", "machen", "1f6e0")]
IYORUM_ROWS = [("gel", "i", "ich komme", "1f6aa"), ("al", "ı", "ich nehme", "1f6d2"),
               ("konuş", "u", "ich spreche", "1f4ac"), ("gör", "ü", "ich sehe", "1f440")]
PERSON_ROWS = [("ben", "um", "ich komme"), ("sen", "sun", "du kommst"), ("o", "", "er / sie / es kommt")]
NEGATION_ROWS = [("biliyorum", "bil", "iyorum", "ich weiß nicht"),
                 ("seviyorum", "sev", "iyorum", "ich mag nicht"),
                 ("geliyorum", "gel", "iyorum", "ich komme nicht"),
                 ("anlıyorum", "anla", "ıyorum", "ich verstehe nicht")]
PHRASES = [("Anlamıyorum.", "Ich verstehe nicht.", "1f937"),
           ("Bilmiyorum.", "Ich weiß nicht.", "1f914"),
           ("Biraz Türkçe konuşuyorum.", "Ich spreche ein bisschen Türkisch.", "1f1f9-1f1f7"),
           ("İstemiyorum, teşekkürler.", "Ich möchte nicht, danke.", "1f645")]
QUIZ = ["içmek", "gitmek", "uyumak", "görmek", "konuşmak", "sevmek", "almak", "dinlemek", "öğrenmek", "koşmak"]
DAILY = ["Çay içiyorum.", "Müzik dinliyorum.", "Türkçe öğreniyorum."]

ICONS = ["2753", "1f4cc", "1f389", "1f44b", "1f34e", "1f3c6"]
EXTRA_STATES = {
    "tr_ich": ("1f442", "Die Ich-Form – hör genau hin", False),
    "tr_sent": ("1f442", "Beispielsatz – hör genau hin", False),
    "recall": ("1f5e3", "Jetzt du! Sag es auf Türkisch", True),
    "speak_sent": ("1f5e3", "Jetzt du! Sprich den Satz nach", True),
}


# --------------------------------------------------------------------------------------
# Grafik-Bausteine (place, pill, appear … kommen aus der Engine)
# --------------------------------------------------------------------------------------
def stress_segs(syl, size=34, base=INK):
    segs = []
    for i, s in enumerate(syl):
        if i:
            segs.append((" · ", "Medium", size - 4, MUTED))
        segs.append((s, "Bold", size, RED if i == len(syl) - 1 else base))
    return segs


def sentence_segs(sent, verb, size, color=INK, verb_color=RED):
    i = sent.find(verb)
    if i < 0:
        return [(sent, "Bold", size, color)]
    parts = [(sent[:i], color), (verb, verb_color), (sent[i + len(verb):], color)]
    return [(p, "Bold", size, c) for p, c in parts if p]


# --------------------------------------------------------------------------------------
# Szenen
# --------------------------------------------------------------------------------------
class TitleScene(Scene):
    chapter = "Merhaba – Einführung"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.6)
        self.sfx("chord")
        self.say(ctx.TR("Merhaba!"), "hello")
        self.wait(0.4)
        self.say(ctx.DE("Willkommen zurück! Heute lernst du zwanzig wichtige türkische Verben."), "welcome")
        self.wait(0.3)
        self.say(ctx.DE("Verben heißen auf Türkisch:"), "word")
        self.wait(0.25)
        self.say(ctx.TR("Fiiller."), "fiiller")
        self.wait(0.5)
        self.say(ctx.TR("Fiiller.", slow=True), "fiiller2")
        self.wait(0.4)
        self.say(ctx.DE("Am Ende sagst du schon ganze Sätze!"), "end")
        self.finish(0.9)
        self.title = text_layer(g, [("Fiiller", "ExtraBold", 230, RED)])
        self.sub = text_layer(g, [("Die wichtigsten Verben auf Türkisch", "SemiBold", 66, INK)])
        self.hint = text_layer(g, [("fiil", "Bold", 46, RED), (" = das Verb    ·    ", "Medium", 44, MUTED),
                                   ("fiiller", "Bold", 46, RED), (" = die Verben", "Medium", 44, MUTED)])
        self.merhaba = text_layer(g, [("Merhaba!", "Bold", 54, TEAL), ("  –  Hallo!", "Medium", 54, MUTED)])
        lang = text_layer(g, [("Deutsch  ", "SemiBold", 40, INK), ("→", "SemiBold", 40, RED),
                              ("  Türkçe   ·   für Anfänger", "SemiBold", 40, INK)])
        self.lang, lpad = box(lang.width + 170, 84, 42, WHITE, blur=14, sh_alpha=35)
        put_center(self.lang, g.emoji("1f1e9-1f1ea", 48), lpad + 52, lpad + 42)
        put_center(self.lang, g.emoji("1f1f9-1f1f7", 48), lpad + lang.width + 120, lpad + 42)
        put(self.lang, lang, lpad + 85, lpad + 42 - lang.baseline + 13)
        self.floaters = [("1f37d", 220, 330, 290), ("1f964", 200, 1590, 300), ("1f3c3", 250, 300, 800),
                         ("1f3a7", 230, 1620, 810), ("1f634", 170, 180, 525), ("2764", 150, 1320, 190),
                         ("1f4da", 170, 1745, 545), ("1f440", 150, 590, 170)]

    def render(self, t):
        f = self.g.bg.copy()
        for i, (code, size, x, y) in enumerate(self.floaters):
            p = ease_out_back((t - 0.1 * i) / 0.6)
            put_center(f, self.g.emoji(code, size), x, y + math.sin(t * 1.6 + i) * 12,
                       opacity=clamp((t - 0.1 * i) / 0.3), scale=max(0.01, 0.5 + 0.5 * p))
        pulse = 1.0
        for mk in ("fiiller", "fiiller2"):
            if self.active(t, mk):
                pulse = 1 + 0.04 * math.sin(self.since(t, mk) * 10)
        put_center(f, self.title, W / 2, 440, opacity=clamp(t / 0.5),
                   scale=pulse * (0.9 + 0.1 * ease_out_cubic(t / 0.6)))
        put_center(f, self.sub, W / 2, 652, opacity=clamp((t - 0.3) / 0.5))
        put_center(f, self.lang, W / 2, 770, opacity=clamp((t - 0.5) / 0.5))
        if t >= self.m("hello")[0]:
            put_center(f, self.merhaba, W / 2, 200, opacity=clamp(self.since(t, "hello") / 0.3))
        if t >= self.m("fiiller")[0]:
            put_center(f, self.hint, W / 2, 895, opacity=clamp(self.since(t, "fiiller") / 0.3))
        return f


class InfinitiveScene(Scene):
    chapter = "Grundform -mek / -mak"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Schritt eins: die Grundform. Alle türkischen Verben enden auf mek oder mak."), "intro")
        self.wait(0.3)
        self.say(ctx.DE("Welche Endung, hängt wieder vom letzten Vokal ab. Genau wie bei der Mehrzahl."), "rule")
        self.wait(0.4)
        for i, (stem, suf, de, _) in enumerate(INFINITIVE_ROWS):
            st = self.t
            self.say(ctx.TR(stem + suf + "."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.6)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Ohne die Endung bleibt der Stamm. Der Stamm ist gleichzeitig ein Befehl:"), "stem")
        self.wait(0.3)
        for i, (tr, de) in enumerate((("Gel!", "Komm!"), ("Bak!", "Schau!"))):
            self.say(ctx.TR(tr.replace("!", ".")), f"cmd{i}")  # mit „!“ klingt die Stimme verzerrt
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.5)
        self.finish(0.6)

        self.rules = [pill(g, [("letzter Vokal  ", "Medium", 34, MUTED), (vow, "Bold", 40, INK),
                               ("   →   ", "Bold", 40, MUTED), (suf, "ExtraBold", 54, RED)], h=100)
                      for vow, suf in (("e, i, ö, ü", "-mek"), ("a, ı, o, u", "-mak"))]
        self.same = text_layer(g, [("Genau wie ", "Medium", 34, MUTED), ("-ler", "Bold", 36, RED),
                                   (" / ", "Medium", 34, MUTED), ("-lar", "Bold", 36, RED),
                                   (" bei der Mehrzahl!", "Medium", 34, MUTED)])
        self.rows = []
        for stem, suf, de, emo in INFINITIVE_ROWS:
            self.rows.append(pill(g, [(stem, "Bold", 54, TEAL), ("  +  ", "Bold", 44, MUTED), (suf, "ExtraBold", 54, RED),
                                      ("   →   ", "Bold", 44, MUTED), (stem, "Bold", 54, TEAL),
                                      (suf, "ExtraBold", 54, RED), (f"      {de}", "Medium", 38, MUTED)],
                                  h=100, icon=emo, minw=1180))
        self.cmd = pill(g, [("Stamm = Befehl:   ", "SemiBold", 38, INK), ("Gel!", "ExtraBold", 50, RED),
                            (" = Komm!      ", "Medium", 38, MUTED), ("Bak!", "ExtraBold", 50, RED),
                            (" = Schau!", "Medium", 38, MUTED)], h=100, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Schritt 1: Grundform auf -mek oder -mak", y=120, size=60)
        for i, im in enumerate(self.rules):
            op, dy = appear(t, self.m("rule")[0] + i * 0.4)
            put_center(f, im, 520 + i * 880, 240 + dy, opacity=op)
        op, dy = appear(t, self.m("rule")[0] + 0.8)
        put_center(f, self.same, W / 2, 330 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 445 + i * 118 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("stem")[0]:
            op, dy = appear(t, self.m("stem")[0])
            put_center(f, self.cmd, W / 2, 940 + dy, opacity=op)
        return f


class IyorumScene(Scene):
    chapter = "Ich-Form -iyorum"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Schritt zwei, die wichtigste Form: Ich mache gerade etwas. "
                        "Dafür kommt diese Endung an den Stamm:"), "intro")
        self.wait(0.3)
        self.say(ctx.TR("iyorum."), "suffix")
        self.wait(0.6)
        for i, (stem, vow, de, _) in enumerate(IYORUM_ROWS):
            st = self.t
            self.say(ctx.TR(f"{stem}{vow}yorum."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Der erste Vokal der Endung passt sich dem Stamm an. So klingt es schön rund."), "vowels")
        self.wait(0.3)
        self.say(ctx.DE("Endet der Stamm auf einen Vokal, fällt dieser Vokal weg."), "drop")
        self.finish(1.2)

        self.formula = pill(g, [("Stamm", "Bold", 52, TEAL), ("  +  ", "Bold", 44, MUTED), ("iyorum", "ExtraBold", 58, RED),
                                ("   =   ", "Bold", 44, MUTED), ("ich … (gerade)", "SemiBold", 44, INK)], h=110)
        self.rows = []
        for stem, vow, de, emo in IYORUM_ROWS:
            self.rows.append(pill(g, [(stem, "Bold", 54, TEAL), ("   →   ", "Bold", 44, MUTED), (stem, "Bold", 54, TEAL),
                                      (vow, "ExtraBold", 54, GOLD), ("yorum", "ExtraBold", 54, RED),
                                      (f"      {de}", "Medium", 38, MUTED)], h=100, icon=emo, minw=1180))
        segs = [("1. Vokal passt sich an:     ", "SemiBold", 34, INK)]
        for i, (a, b) in enumerate((("e, i", "i"), ("a, ı", "ı"), ("o, u", "u"), ("ö, ü", "ü"))):
            segs += [(("     " if i else "") + a + " ", "Medium", 34, MUTED), ("→", "Bold", 34, MUTED),
                     (" " + b, "ExtraBold", 40, GOLD)]
        self.vowels = pill(g, segs, h=88, fill=NOTE_BG)
        self.drop = pill(g, [("Vokal am Stamm-Ende fällt weg:   ", "SemiBold", 34, INK), ("anla", "Bold", 40, TEAL),
                             (" → ", "Bold", 34, MUTED), ("anl", "Bold", 40, TEAL), ("ıyorum", "Bold", 40, RED),
                             ("     iste", "Bold", 40, TEAL), (" → ", "Bold", 34, MUTED), ("ist", "Bold", 40, TEAL),
                             ("iyorum", "Bold", 40, RED)], h=88, fill=NOTE_BG)

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Schritt 2: Ich-Form mit -iyorum", y=110, size=60)
        if t >= self.m("suffix")[0]:
            op, dy = appear(t, self.m("suffix")[0])
            put_center(f, self.formula, W / 2, 235 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 380 + i * 115 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("vowels")[0]:
            op, dy = appear(t, self.m("vowels")[0])
            put_center(f, self.vowels, W / 2, 870 + dy, opacity=op)
        if t >= self.m("drop")[0]:
            op, dy = appear(t, self.m("drop")[0])
            put_center(f, self.drop, W / 2, 985 + dy, opacity=op)
        return f


class PersonScene(Scene):
    chapter = "ich · du · er/sie/es"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Schritt drei: Wer macht es? Das verrät die Endung."), "intro")
        self.wait(0.4)
        for i, (_, end, de) in enumerate(PERSON_ROWS):
            st = self.t
            self.say(ctx.TR(f"geliyor{end}."))
            self.wait(0.25)
            self.say(ctx.DE(de.replace(" / ", ", ")))
            self.wait(0.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.say(ctx.DE("Die Wörter für ich, du und er lässt man meistens weg. Die Endung sagt es ja schon."), "note")
        self.finish(1.0)
        self.rows = []
        for pron, end, de in PERSON_ROWS:
            segs = [(f"({pron})   ", "Medium", 40, MUTED), ("geliyor", "Bold", 64, INK)]
            if end:
                segs.append((end, "ExtraBold", 64, RED))
            segs.append(("   =   ", "Bold", 48, MUTED))
            segs.append((de, "SemiBold", 52, TEAL))
            self.rows.append(pill(g, segs, h=130, minw=1240))
        self.note = pill(g, [("ben", "Bold", 40, RED), (" = ich    ", "Medium", 36, MUTED), ("sen", "Bold", 40, RED),
                             (" = du    ", "Medium", 36, MUTED), ("o", "Bold", 40, RED),
                             (" = er/sie/es   –  meistens weggelassen", "Medium", 36, MUTED)],
                         h=92, fill=NOTE_BG, icon="1f4cc")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Schritt 3: Wer? Die Endung verrät es!", y=130, size=60)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 330 + i * 170 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        if t >= self.m("note")[0]:
            op, dy = appear(t, self.m("note")[0])
            put_center(f, self.note, W / 2, 880 + dy, opacity=op)
        return f


class WordOrderScene(Scene):
    chapter = "Satzbau: Verb am Ende"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Schritt vier, ganz wichtig: Im Türkischen steht das Verb am Ende des Satzes."), "intro")
        self.wait(0.3)
        self.say(ctx.DE("Ich esse einen Apfel."), "de")
        self.wait(0.4)
        self.say(ctx.TR("Ben elma yiyorum."), "tr")
        self.wait(0.5)
        self.say(ctx.DE("Wörtlich: Ich, Apfel, esse."), "literal")
        self.wait(0.4)
        self.say(ctx.DE("Das Wort Ben, also ich, lässt man meistens weg:"), "short")
        self.wait(0.3)
        self.say(ctx.TR("Elma yiyorum."), "short_tr")
        self.wait(0.2)
        self.span("speak", 2.4)
        self.wait(2.4)
        self.finish(0.3)
        self.pill = ctx.pill

        roles = {"s": (TEAL, TEAL_SOFT), "o": (GOLD, GOLD_SOFT), "v": (RED, RED_SOFT)}
        self.rows = {}
        for key, words, y in (("de", [("Ich", "s"), ("esse", "v"), ("einen Apfel", "o")], 360),
                              ("tr", [("Ben", "s"), ("elma", "o"), ("yiyorum", "v")], 640)):
            tiles = []
            for word, role in words:
                col, soft = roles[role]
                tiles.append((pill(g, [(word, "Bold", 62, col)], h=120, fill=soft, padx=44, radius=30), role))
            total = sum(im.width - 2 * im.pad for im, _ in tiles) + 50 * (len(tiles) - 1)
            x = 620 + (1180 - total) / 2
            placed = []
            for im, role in tiles:
                w = im.width - 2 * im.pad
                placed.append((im, role, x, y, w))
                x += w + 50
            self.rows[key] = placed
        self.labels = {k: text_layer(g, [(txt, "SemiBold", 36, MUTED)]) for k, txt in (("de", "Deutsch"), ("tr", "Türkisch"))}
        self.flags = {"de": "1f1e9-1f1ea", "tr": "1f1f9-1f1f7"}
        self.literal = text_layer(g, [("Wörtlich:  ", "Medium", 40, MUTED), ("„Ich  Apfel  esse.“", "SemiBold", 44, INK)])
        self.short = pill(g, [("Ohne ", "Medium", 38, MUTED), ("Ben", "Bold", 40, TEAL), (":   ", "Medium", 38, MUTED),
                              ("Elma ", "Bold", 52, GOLD), ("yiyorum.", "ExtraBold", 52, RED)],
                          h=100, fill=NOTE_BG, icon="1f34e")

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Schritt 4: Das Verb kommt ans Ende!", y=130, size=60)
        d = ImageDraw.Draw(f)
        for key, start in (("de", self.m("de")[0] - 0.1), ("tr", self.m("tr")[0])):
            if t < start:
                continue
            op, dy = appear(t, start)
            cy = self.rows[key][0][3]
            put_center(f, self.g.emoji(self.flags[key], 54), 280, cy + dy, opacity=op)
            place(f, self.labels[key], 330, cy, 36, opacity=op, dy=dy)
            for im, role, x, y, w in self.rows[key]:
                put(f, im, x - im.pad, y - 60 - im.pad + dy, op)
        if t >= self.m("tr")[0] + 0.3:
            p = ease_out_cubic((t - self.m("tr")[0] - 0.3) / 0.5)
            colors = {"s": TEAL, "o": GOLD, "v": RED}
            for _, role, x1, y1, w1 in self.rows["de"]:
                _, _, x2, y2, w2 = next(r for r in self.rows["tr"] if r[1] == role)
                ax, ay = x1 + w1 / 2, y1 + 66
                bx, by = x2 + w2 / 2, y2 - 66
                d.line([ax, ay, ax + (bx - ax) * p, ay + (by - ay) * p], fill=colors[role], width=7)
        if t >= self.m("literal")[0]:
            op, dy = appear(t, self.m("literal")[0])
            place(f, self.literal, W / 2, 790, 44, opacity=op, align="center", dy=dy)
        if t >= self.m("short")[0]:
            op, dy = appear(t, self.m("short")[0])
            put_center(f, self.short, W / 2, 905 + dy, opacity=op)
        if self.active(t, "speak"):
            a, b = self.m("speak")
            self.pill.draw(f, "speak_sent", t - a, t, 1 - (t - a) / (b - a), cy=1010)
        return f


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
        self.icons = [v.emoji for v in ch.verbs]

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
            x = W / 2 + (i - (n - 1) / 2) * 170
            p = (t - 0.4 - i * 0.08) / 0.4
            put_center(f, self.g.emoji(code, 120), x, 860 + math.sin(t * 2 + i) * 6, opacity=clamp(p),
                       scale=max(0.01, 0.5 + 0.5 * ease_out_back(p)))
        return f


# ---------------------------- Verbkarte -----------------------------------------------
CARD_X, CARD_Y, CARD_S = 110, 185, 740
RX, RW = 930, 880


def verb_card_base(ctx: Ctx):
    g = ctx.gfx
    base = g.bg.copy()
    im, pad = box(CARD_S, CARD_S, 56, WHITE, blur=26, sh_alpha=60, sh_dy=16)
    base.paste(im, (CARD_X - pad, CARD_Y - pad), im)
    for flag, label, cy in (("1f1e9-1f1ea", "DEUTSCH", 208), ("1f1f9-1f1f7", "TÜRKÇE", 366)):
        put_center(base, g.emoji(flag, 42), RX + 21, cy)
        place(base, text_layer(g, [(label, "SemiBold", 28, MUTED)]), RX + 58, cy, 28)
    ImageDraw.Draw(base).rounded_rectangle([RX, 326, RX + RW, 330], 2, fill=LINE)
    return base


def infinitive_layer(g, v: Verb, max_size=136):
    size = g.fit("ExtraBold", v.tr, max_size, RW).size
    return text_layer(g, [(v.stem, "ExtraBold", size, RED), (v.suffix, "ExtraBold", size, RED_LIGHT)]), size


def ich_pill(g, v: Verb):
    stem, end = v.ich.split("|")
    segs = [("ich-Form:  ", "Medium", 30, MUTED), (stem, "Bold", 50, INK), (end, "Bold", 50, RED),
            (f"   = {v.ich_de}", "Medium", 34, TEAL)]
    return pill(g, segs, h=88, padx=30)


def sentence_box(g, v: Verb):
    size = 52
    while size > 30 and text_layer(g, sentence_segs(v.sent, v.sent_verb, size)).width > RW - 70:
        size -= 2
    tr = text_layer(g, sentence_segs(v.sent, v.sent_verb, size))
    de = text_layer(g, [(v.sent_de, "Medium", g.fit("Medium", v.sent_de, 34, RW - 70).size, MUTED)])
    im, pad = box(RW, 140, 34, WHITE, blur=12, sh_alpha=30, sh_dy=5)
    place(im, tr, pad + 34, pad + 52, size)
    place(im, de, pad + 34, pad + 106, 34)
    im.pad = pad  # type: ignore[attr-defined]
    return im


def note_pill(g, text):
    size = g.fit("Medium", text, 30, RW - 110).size
    return pill(g, [(text, "Medium", size, INK)], h=64, fill=NOTE_BG, icon="1f4cc", padx=24)


class VerbCardScene(Scene):
    ORDER = ["de", "tr", "slow", "speak1", "ich", "ich_de", "speak_ich", "sent_de", "sent", "speak2"]
    MAP = {"speak1": "speak", "ich": "tr_ich", "ich_de": "de", "speak_ich": "recall", "sent_de": "de",
           "sent": "tr_sent", "speak2": "speak_sent"}

    def __init__(self, ctx, v: Verb, ch: Chapter, idx: int, total: int):
        super().__init__(ctx)
        g = self.g
        self.v = v
        self.sfx("pop", at=0.05)
        self.wait(0.5)
        self.say(ctx.DE(v.de_say or v.de), "de")
        self.wait(0.35)
        self.say(ctx.TR(v.tr + "."), "tr")
        self.wait(0.45)
        slow = ctx.TR(v.tr + ".", slow=True)
        self.say(slow, "slow")
        self.wait(0.15)
        self.span("speak1", max(2.0, 1.2 * len(slow) / SR + 0.9))
        self.wait(self.m("speak1")[1] - self.t)
        self.say(ctx.TR(v.ich_plain + "."), "ich")
        self.wait(0.25)
        self.say(ctx.DE(v.ich_de.replace(" / ", ", ")), "ich_de")
        self.wait(0.1)
        self.span("speak_ich", 1.8)
        self.wait(2.1)
        self.say(ctx.DE(v.sent_de.replace("(oder: ", "oder ").replace(")", "")), "sent_de")
        self.wait(0.3)
        sent = ctx.TR(v.sent)
        self.say(sent, "sent")
        self.wait(0.15)
        self.span("speak2", max(2.2, 1.15 * len(sent) / SR + 0.8))
        self.wait(self.m("speak2")[1] - self.t)
        self.finish(0.25)

        self.base = ctx.verb_card_base.copy()
        self.title_bar(self.base, ch.icon, ch.tr, ch.de, right=f"{idx} / {total}", progress=idx / total)
        self.emo = g.emoji(v.emoji, 620)
        self.del_ = text_layer(g, [(v.de, "SemiBold", g.fit("SemiBold", v.de, 76, RW).size, TEAL)])
        self.inf, self.inf_size = infinitive_layer(g, v)
        self.hint = text_layer(g, [("Aussprache:  ", "Medium", 28, MUTED)] + stress_segs(v.syl, 34))
        self.ich = ich_pill(g, v)
        self.sentence = sentence_box(g, v)
        self.note = note_pill(g, v.note) if v.note else None
        self.pill = ctx.pill

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
            put_center(f, self.inf, RX - 12 + self.inf.width / 2, 516 - self.inf.baseline + self.inf.height / 2,
                       opacity=clamp(s / 0.25), scale=sc)
            place(f, self.hint, RX + RW, 366, 30, opacity=clamp((s - 0.2) / 0.3), align="right")
        if self.note and t >= self.m("slow")[0]:
            op, dy = appear(t, self.m("slow")[0])
            put_left(f, self.note, RX, 836, op, dy)
        if t >= self.m("ich")[0] - 0.05:
            op, dy = appear(t, self.m("ich")[0] - 0.05)
            put_left(f, self.ich, RX, 562, op, dy)
        if t >= self.m("sent_de")[0] - 0.05:
            op, dy = appear(t, self.m("sent_de")[0] - 0.05)
            put_left(f, self.sentence, RX, 668, op, dy)
        state, since, prog, playing = state_at(self, t, self.ORDER, self.MAP)
        self.pill.draw(f, state, since, t, prog, bars=playing and prog is None)
        return f


# ---------------------------- Verneinung & Super-Sätze --------------------------------
class NegationScene(Scene):
    chapter = "Verneinung: ein m"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Bonus: So sagst du nicht. Zwischen Stamm und Endung kommt einfach ein m."), "intro")
        self.wait(0.4)
        for i, (pos, stem, end, de) in enumerate(NEGATION_ROWS):
            st = self.t
            self.say(ctx.TR(pos + "."))
            self.wait(0.3)
            self.say(ctx.TR(f"{stem}m{end}."))
            self.wait(0.25)
            self.say(ctx.DE(de))
            self.wait(0.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.finish(0.8)
        self.formula = pill(g, [("Stamm", "Bold", 50, TEAL), ("  +  ", "Bold", 44, MUTED), ("m", "ExtraBold", 64, RED),
                                ("  +  ", "Bold", 44, MUTED), ("iyorum", "Bold", 50, INK),
                                ("   =   ", "Bold", 44, MUTED), ("ich … nicht", "SemiBold", 44, INK)], h=110)
        self.rows = []
        for pos, stem, end, de in NEGATION_ROWS:
            self.rows.append(pill(g, [(pos, "Bold", 50, INK), ("   →   ", "Bold", 44, MUTED), (stem, "Bold", 50, TEAL),
                                      ("m", "ExtraBold", 58, RED), (end, "Bold", 50, INK),
                                      (f"      {de}", "Medium", 36, MUTED)], h=100, minw=1240))

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Bonus: „nicht“ – ein m reicht!", y=120, size=60)
        op, dy = appear(t, self.m("intro")[0] + 0.5)
        put_center(f, self.formula, W / 2, 255 + dy, opacity=op)
        for i, im in enumerate(self.rows):
            st = self.m(f"row{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, W / 2, 420 + i * 130 + dy, opacity=op,
                           scale=1.03 if self.active(t, f"row{i}") else 1.0)
        return f


class PhrasesScene(Scene):
    chapter = "Super-Sätze"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.say(ctx.DE("Und hier vier Super-Sätze für den Anfang."), "intro")
        self.wait(0.4)
        for i, (tr, de, _) in enumerate(PHRASES):
            st = self.t
            self.say(ctx.TR(tr), f"tr{i}")
            self.wait(0.3)
            self.say(ctx.DE(de), f"de{i}")
            self.wait(0.15)
            self.span(f"speak{i}", 2.6)
            self.wait(2.7)
            self.marks[f"row{i}"] = (st, self.t)
        self.finish(0.4)
        self.cards = []
        for tr, de, emo in PHRASES:
            pair = []
            for hot in (False, True):
                im, pad = box(820, 230, 40, RED_SOFT if hot else WHITE, outline=RED if hot else None, ow=5 if hot else 0,
                              blur=16, sh_alpha=40)
                put_center(im, g.emoji(emo, 100), pad + 95, pad + 115)
                size = g.fit("ExtraBold", tr, 56, 600).size
                place(im, text_layer(g, [(tr, "ExtraBold", size, RED)]), pad + 180, pad + 95, size)
                place(im, text_layer(g, [(de, "Medium", g.fit("Medium", de, 34, 600).size, MUTED)]), pad + 180, pad + 160, 34)
                pair.append(im)
            self.cards.append(pair)
        self.pill = ctx.pill

    def render(self, t):
        f = self.g.bg.copy()
        self.heading(f, "Super-Sätze für den Anfang", y=120, size=62)
        cur = -1
        for i in range(len(self.cards)):
            if t >= self.m(f"row{i}")[0]:
                cur = i
        for i, pair in enumerate(self.cards):
            st = self.m(f"row{i}")[0]
            if t < st:
                continue
            op, dy = appear(t, st)
            col, row = i % 2, i // 2
            put_center(f, pair[1 if i == cur else 0], 520 + col * 880, 360 + row * 290 + dy, opacity=op)
        order = [k for i in range(len(PHRASES)) for k in (f"tr{i}", f"de{i}", f"speak{i}")]
        mapping = {}
        for i in range(len(PHRASES)):
            mapping.update({f"tr{i}": "tr", f"de{i}": "de", f"speak{i}": "speak"})
        state, since, prog, playing = state_at(self, t, order, mapping)
        self.pill.draw(f, state, since, t, prog, bars=playing and prog is None)
        return f


# ---------------------------- Quiz ----------------------------------------------------
class QuizIntroScene(Scene):
    chapter = "Quiz"

    def __init__(self, ctx):
        super().__init__(ctx)
        self.wait(0.3)
        self.sfx("chord")
        self.say(ctx.DE("Quiz-Zeit! Ich sage dir ein deutsches Verb."), "a")
        self.wait(0.2)
        self.say(ctx.DE("Sag die türkische Grundform laut, bevor die Lösung kommt. Bereit?"), "b")
        self.finish(0.8)
        self.t1 = text_layer(self.g, [("Quiz-Zeit!", "ExtraBold", 150, RED)])
        self.t2 = text_layer(self.g, [("Sag das türkische Verb, bevor die Lösung kommt.", "SemiBold", 50, INK)])

    def render(self, t):
        f = self.g.bg.copy()
        put_center(f, self.g.emoji("2753", 220), W / 2, 300 + math.sin(t * 2) * 8, opacity=clamp(t / 0.3),
                   scale=0.6 + 0.4 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 540, opacity=clamp((t - 0.2) / 0.3))
        put_center(f, self.t2, W / 2, 680, opacity=clamp((t - self.m("b")[0]) / 0.3))
        return f


class QuizScene(Scene):
    COUNT = 3

    def __init__(self, ctx, word, idx, total):
        super().__init__(ctx)
        g = self.g
        v = BY_TR[word]
        self.v = v
        self.sfx("pop", at=0.05)
        self.wait(0.5)
        self.say(ctx.DE(v.de_say or v.de), "de")
        self.wait(0.2)
        self.span("count", self.COUNT + 0.6)
        for i in range(self.COUNT):
            self.sfx("tick", at=self.t + 0.3 + i)
        self.wait(self.COUNT + 0.6)
        self.sfx("ding")
        self.say(ctx.TR(v.tr + "."), "tr")
        self.wait(0.35)
        self.say(ctx.TR(v.ich_plain + "."), "ich")
        self.span("speak", 1.8)
        self.wait(1.8)
        self.finish(0.2)
        self.base = ctx.verb_card_base.copy()
        self.title_bar(self.base, "2753", "Quiz", "Wie heißt das auf Türkisch?", right=f"{idx} / {total}",
                       progress=idx / total)
        self.emo = g.emoji(v.emoji, 620)
        self.del_ = text_layer(g, [(v.de, "SemiBold", g.fit("SemiBold", v.de, 76, RW).size, TEAL)])
        self.inf, _ = infinitive_layer(g, v)
        self.qm = text_layer(g, [("? ? ?", "ExtraBold", 150, (215, 200, 190))])
        self.hint = text_layer(g, [("Aussprache:  ", "Medium", 28, MUTED)] + stress_segs(v.syl, 34))
        self.ich = ich_pill(g, v)
        self.pill = ctx.pill

    def render(self, t):
        f = self.base.copy()
        p = (t - 0.05) / 0.45
        put_center(f, self.emo, CARD_X + CARD_S / 2, CARD_Y + CARD_S / 2 + math.sin(t * 2.2) * 6,
                   opacity=clamp(p * 2), scale=max(0.01, (0.65 + 0.35 * ease_out_back(p)) * 520 / 620))
        op, dy = appear(t, 0.25)
        place(f, self.del_, RX, 284, 76, opacity=op, dy=dy)
        reveal = self.m("tr")[0] - 0.05
        if t < reveal:
            put(f, self.qm, RX - 12, 510 - self.qm.baseline, clamp((t - 0.3) / 0.3))
            if self.active(t, "count"):
                a, b = self.m("count")
                rem = 1 - (t - a) / (b - a)
                n = max(1, math.ceil(rem * self.COUNT))
                ring = Image.new("RGBA", (240, 240), (0, 0, 0, 0))
                d = ImageDraw.Draw(ring)
                d.ellipse([8, 8, 232, 232], fill=WHITE)
                d.arc([14, 14, 226, 226], -90, -90 + 360 * rem, fill=RED, width=18)
                d.text((120, 122), str(n), font=self.g.font("ExtraBold", 110), fill=INK, anchor="mm")
                put_center(f, ring, 1640, 790)
        else:
            s = t - reveal
            put_center(f, self.inf, RX - 12 + self.inf.width / 2, 516 - self.inf.baseline + self.inf.height / 2,
                       opacity=clamp(s / 0.2), scale=0.8 + 0.2 * ease_out_back(s / 0.4))
            place(f, self.hint, RX + RW, 366, 30, opacity=clamp((s - 0.2) / 0.3), align="right")
            put_center(f, self.g.emoji("2705", 110), 1700, 250, opacity=clamp(s / 0.2),
                       scale=0.5 + 0.5 * ease_out_back(s / 0.4))
            if t >= self.m("ich")[0] - 0.05:
                op, dy = appear(t, self.m("ich")[0] - 0.05)
                put_left(f, self.ich, RX, 562, op, dy)
        state, since, prog = None, 0, None
        if self.active(t, "de"):
            state, since = "de", self.since(t, "de")
        if self.active(t, "count"):
            state, since = "think", self.since(t, "count")
        if t >= self.m("tr")[0]:
            state, since = "answer", self.since(t, "tr")
        self.pill.draw(f, state, since, t, prog, bars=False)
        return f


# ---------------------------- Übersicht & Ende ----------------------------------------
class OverviewScene(Scene):
    chapter = "Übersicht"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.4)
        self.say(ctx.DE("Hier sind alle zwanzig Verben auf einen Blick."), "a")
        self.wait(0.3)
        self.say(ctx.DE("Halte das Video an und mach einen Screenshot!"), "b")
        self.wait(5.0)
        self.finish(0.3)
        self.base = g.bg.copy()
        self.heading(self.base, "Alle 20 Verben auf einen Blick", y=88, size=54)
        self.cells = []
        cw, ch_ = 344, 228
        x0, y0 = (W - 5 * cw) / 2, 130
        for i, v in enumerate(ALL_VERBS):
            iw, ih = cw - 16, ch_ - 16
            im, pad = box(iw, ih, 26, WHITE, blur=8, sh_alpha=25, sh_dy=3)
            put_center(im, g.emoji(v.emoji, 62), pad + iw / 2, pad + 46)
            inf = text_layer(g, [(v.stem, "Bold", 42, RED), (v.suffix, "Bold", 42, RED_LIGHT)])
            place(im, inf, pad + iw / 2, pad + 108, 42, align="center")
            stem, end = v.ich.split("|")
            ich = text_layer(g, [(stem, "SemiBold", 28, INK), (end, "SemiBold", 28, TEAL)])
            place(im, ich, pad + iw / 2, pad + 152, 28, align="center")
            dl = text_layer(g, [(v.de, "Medium", g.fit("Medium", v.de, 25, iw - 30).size, MUTED)])
            place(im, dl, pad + iw / 2, pad + 188, 25, align="center")
            col, row = i % 5, i // 5
            self.cells.append((im, x0 + col * cw + cw / 2, y0 + row * ch_ + ch_ / 2))

    def render(self, t):
        f = self.base.copy()
        for i, (im, x, y) in enumerate(self.cells):
            p = (t - i * 0.04) / 0.35
            put_center(f, im, x, y + (1 - ease_out_cubic(p)) * 20, opacity=clamp(p))
        return f


class OutroScene(Scene):
    chapter = "Aferin!"

    def __init__(self, ctx):
        super().__init__(ctx)
        g = self.g
        self.wait(0.3)
        self.sfx("fanfare")
        self.say(ctx.TR("Aferin!"), "af")
        self.wait(0.3)
        self.say(ctx.DE("Super gemacht! Du kennst jetzt zwanzig wichtige Verben und kannst schon ganze Sätze sagen."), "a")
        self.wait(0.3)
        self.say(ctx.DE("Mein Tipp: Sag jeden Tag drei kurze Sätze, was du gerade machst. Zum Beispiel:"), "tip")
        self.wait(0.3)
        for i, s in enumerate(DAILY):
            self.say(ctx.TR(s), f"d{i}")
            self.wait(0.35)
        self.wait(0.3)
        self.say(ctx.TR("Görüşürüz!"), "gor")
        self.wait(0.2)
        self.say(ctx.DE("Bis bald!"), "bye")
        self.finish(2.0)
        self.t1 = text_layer(g, [("Aferin!", "ExtraBold", 180, RED), ("  = Gut gemacht!", "SemiBold", 56, MUTED)])
        self.t2 = text_layer(g, [("Du kennst jetzt 20 wichtige Verben – und sagst schon ganze Sätze!", "SemiBold", 46, INK)])
        self.daily = [pill(g, sentence_segs(s, s.split()[-1][:-1], 46), h=86, padx=34) for s in DAILY]
        self.tip = text_layer(g, [("Dein Tipp für jeden Tag:", "SemiBold", 38, TEAL)])
        self.t3 = text_layer(g, [("Görüşürüz!", "Bold", 64, TEAL), ("  –  Bis bald!", "SemiBold", 52, MUTED)])
        self.credits = text_layer(g, [("Bilder: Twemoji (CC-BY 4.0)  ·  Stimmen: Piper TTS (dfki, thorsten)  ·  Schrift: Poppins",
                                       "Regular", 24, MUTED)])
        rnd = random.Random(5)
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
        put_center(f, self.g.emoji("1f3c6", 150), W / 2, 150, opacity=clamp(t / 0.3), scale=0.5 + 0.5 * ease_out_back(t / 0.5))
        put_center(f, self.t1, W / 2, 340, opacity=clamp((t - 0.2) / 0.3), scale=0.85 + 0.15 * ease_out_back((t - 0.2) / 0.5))
        put_center(f, self.t2, W / 2, 475, opacity=clamp((t - self.m("a")[0]) / 0.3))
        if t >= self.m("tip")[0]:
            op, dy = appear(t, self.m("tip")[0])
            place(f, self.tip, W / 2, 575, 38, opacity=op, align="center", dy=dy)
        for i, im in enumerate(self.daily):
            st = self.m(f"d{i}")[0]
            if t >= st:
                op, dy = appear(t, st)
                put_center(f, im, 400 + i * 560, 675 + dy, opacity=op)
        if t >= self.m("gor")[0]:
            s = self.since(t, "gor")
            put_center(f, self.t3, W / 2, 840, opacity=clamp(s / 0.3))
            put_center(f, self.g.emoji("1f44b", 100), W / 2 + self.t3.width / 2 + 70, 840, opacity=clamp(s / 0.3))
        put_center(f, self.credits, W / 2, 1040, opacity=clamp((t - 1) / 0.5))
        return f


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    ctx.pill = StatusPill(ctx.gfx, EXTRA_STATES)
    ctx.verb_card_base = verb_card_base(ctx)
    scenes = [TitleScene(ctx), InfinitiveScene(ctx), IyorumScene(ctx), PersonScene(ctx), WordOrderScene(ctx)]
    idx = 0
    for n, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, n, ch))
        for v in ch.verbs:
            idx += 1
            scenes.append(VerbCardScene(ctx, v, ch, idx, len(ALL_VERBS)))
    scenes += [NegationScene(ctx), PhrasesScene(ctx), QuizIntroScene(ctx)]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, w_, i, len(QUIZ)))
    scenes += [OverviewScene(ctx), OutroScene(ctx)]
    return scenes


def emoji_codes():
    return {v.emoji for v in ALL_VERBS} | {c.icon for c in CHAPTERS} | set(ICONS) | \
        {e for *_, e in INFINITIVE_ROWS} | {e for *_, e in IYORUM_ROWS} | {e for *_, e in PHRASES} | \
        {"1f37d", "1f964", "1f3c3", "1f3a7", "1f634", "2764", "1f4da", "1f440"}


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="fiiller_verben_deutsch_tuerkisch.mp4", title="Fiiller – Verben auf Türkisch")
