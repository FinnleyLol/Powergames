#!/usr/bin/env python3
"""
Lernvideo „Meslekler – Berufe“: 40 Nomen, Deutsch → Türkisch mit Aussprache.

Erzeugt ein 1080p-MP4 mit:
  * 40 Wortkarten in 7 Kapiteln (Gesundheit & Hilfe, Bildung & Wissenschaft, Recht & Handel,
    Unterwegs, Handwerk & Dienste, Rund ums Essen, Kunst & Medien)
  * Bonus 1: die Endung -cı/-ci/-çı … („wer damit arbeitet“): posta → postacı, çöp → çöpçü …
  * Bonus 2: „Ich bin …“: öğretmenim, doktorum, aşçıyım – ein Wort für Mann und Frau
  * Bonus 3: Sätze über die Arbeit (Ne iş yapıyorsun? · Hastanede çalışıyorum. …)
  * Quiz, Übersicht, Abschluss mit „Kolay gelsin!“

Für Berufe ohne eigenes Emoji gibt es in icons/ Figuren mit farbigem Hemd (aus dem Twemoji-Lehrer
ohne Tafel); ein kleines Abzeichen zeigt den Beruf (Schere, Taxi, Brief …).

Aufruf:
    pip install -r ../requirements.txt
    python make_video.py                      # rendert output/meslekler_berufe_deutsch_tuerkisch.mp4
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

DOC = "1f9d1-200d-2695-fe0f"  # Person im Gesundheitsberuf
OFFICE = "1f9d1-200d-1f4bc"
TEACHER = "1f9d1-200d-1f3eb"
COOK = "1f9d1-200d-1f373"
MECH = "1f9d1-200d-1f527"

# --------------------------------------------------------------------------------------
# Inhalte  (stress=None: betonte Silbe aus der Lautschrift der Stimme; „_“ = neues Wort)
# --------------------------------------------------------------------------------------
N = Noun
CHAPTERS = [
    Chapter("Sağlık ve yardım", "Gesundheit & Hilfe", "1f3e5", [
        N("der Arzt", "doktor", DOC + "+1fa7a", ["dok", "tor"], None, "auch: hekim"),
        N("der Zahnarzt", "diş hekimi", DOC + "+1f9b7", ["disch", "_he", "ki", "mi"], None,
          "diş = Zahn  ·  umgangssprachlich: dişçi", tr_say="[[dˈɪʃ  hˈekimi]]"),
        N("der Krankenpfleger", "hemşire", DOC + "+1fa79", ["hem", "schi", "re"], None, "auch: die Krankenschwester"),
        N("der Apotheker", "eczacı", DOC + "+1f48a", ["edsch", "sa", "dschı"], None, "eczane = Apotheke  ·  c = „dsch“"),
        N("der Tierarzt", "veteriner", DOC + "+1f415", ["we", "te", "ri", "ner"], None, "auch: hayvan doktoru"),
        N("der Polizist", "polis", "1f46e", ["po", "lis"], None, "polis heißt auch: die Polizei"),
        N("der Feuerwehrmann", "itfaiyeci", "1f9d1-200d-1f692", ["it", "fa", "i", "je", "dschi"], None,
          "itfaiye = Feuerwehr"),
    ]),
    Chapter("Eğitim ve bilim", "Bildung & Wissenschaft", "1f393", [
        N("der Lehrer", "öğretmen", TEACHER, ["öö", "ret", "men"], None, "öğretmek = lehren  ·  ğ dehnt das ö"),
        N("der Erzieher", "anaokulu öğretmeni", TEACHER + "+1f9f8",
          ["a", "na", "o", "ku", "lu", "_öö", "ret", "me", "ni"], None, "anaokulu = Kindergarten"),
        N("der Fahrlehrer", "direksiyon hocası", TEACHER + "+1f697", ["di", "rek", "si", "jon", "_ho", "dscha", "sı"],
          None, "direksiyon = Lenkrad  ·  hoca = Lehrer"),
        N("der Wissenschaftler", "bilim insanı", "1f9d1-200d-1f52c", ["bi", "lim", "_in", "sa", "nı"], -1,
          "bilim = Wissenschaft  ·  insan = Mensch"),
        N("der Ingenieur", "mühendis", OFFICE + "+2699", ["mü", "hen", "dis"], None, "ü wie im Deutschen"),
        N("der Architekt", "mimar", OFFICE + "+1f4d0", ["mi", "mar"], None, "Mimar Sinan: berühmter Baumeister"),
        N("der Programmierer", "yazılımcı", "1f9d1-200d-1f4bb", ["ja", "sı", "lım", "dschı"], None,
          "yazılım = Software"),
        N("der Astronaut", "astronot", "1f9d1-200d-1f680", ["as", "tro", "not"], None, "fast wie im Deutschen"),
    ]),
    Chapter("Hukuk ve ticaret", "Recht & Handel", "2696", [
        N("der Richter", "hâkim", "1f9d1-200d-2696-fe0f", ["haa", "kim"], None, "â = langes a"),
        N("der Anwalt", "avukat", OFFICE + "+1f4dc", ["a", "wu", "kat"], None, "v ≈ w  ·  wie „Advokat“"),
        N("der Kaufmann / die Kauffrau", "tüccar", OFFICE + "+1f4b0", ["tüdsch", "dschar"], None,
          "cc = doppeltes „dsch“", de_say="der Kaufmann, oder die Kauffrau"),
        N("der Verkäufer", "satıcı", "x-worker-red+1f6cd", ["sa", "tı", "dschı"], None, "satmak = verkaufen"),
    ]),
    Chapter("Yolda", "Unterwegs", "1f68c", [
        N("der Pilot", "pilot", "1f9d1-200d-2708-fe0f", ["pi", "lot"], None, "wie im Deutschen"),
        N("der Taxifahrer", "taksici", "x-worker-blue+1f695", ["tak", "si", "dschi"], None, "taksi + ci"),
        N("der Busfahrer", "otobüs şoförü", "x-worker-grey+1f68c", ["o", "to", "büs", "_scho", "fö", "rü"], None,
          "şoför = Fahrer (wie „Chauffeur“)"),
        N("der Postbote", "postacı", "x-worker-yellow+2709", ["pos", "ta", "dschı"], None, "posta = Post"),
    ]),
    Chapter("Zanaat ve hizmet", "Handwerk & Dienste", "1f6e0", [
        N("der Elektriker", "elektrikçi", MECH + "+26a1", ["e", "lek", "trik", "tschi"], None, "elektrik + çi"),
        N("der Mechaniker", "tamirci", MECH, ["ta", "mir", "dschi"], None, "tamir = Reparatur"),
        N("der Bauarbeiter", "inşaat işçisi", "1f477", ["in", "scha", "at", "_isch", "tschi", "si"], None,
          "inşaat = Bau  ·  işçi = Arbeiter"),
        N("der Schneider", "terzi", "x-worker-purple+1faa1", ["ter", "si"], None, "z = weiches s",
          tr_say="[[teɾzˈi]]"),
        N("der Friseur", "kuaför", "x-worker-black+2702", ["ku", "a", "för"], None, "für Herren auch: berber",
          tr_say="[[kuwafˈœr]]"),
        N("der Gärtner", "bahçıvan", "x-worker-green+1f337", ["bah", "tschı", "wan"], None, "bahçe = Garten"),
        N("die Putzkraft", "temizlikçi", "x-worker-teal+1f9f9", ["te", "mis", "lik", "tschi"], None,
          "temizlik = Sauberkeit"),
        N("der Müllmann", "çöpçü", "x-worker-orange+1f5d1", ["tschöp", "tschü"], None, "çöp = Müll"),
    ]),
    Chapter("Yemek", "Rund ums Essen", "1f37d", [
        N("der Koch", "aşçı", COOK, ["asch", "tschı"], None, "aş = Speise, Essen"),
        N("der Bäcker", "fırıncı", COOK + "+1f35e", ["fı", "rın", "dschı"], None, "fırın = Backofen"),
        N("der Fleischer", "kasap", "x-worker-white+1f969", ["ka", "sap"], None, "auch: der Metzger"),
        N("der Kellner", "garson", "1f935+1f37d", ["gar", "son"], None, "wie französisch „garçon“"),
        N("der Bauer", "çiftçi", "1f9d1-200d-1f33e", ["tschift", "tschi"], None, "çiftlik = Bauernhof",
          tr_say="[[tʃɪftʃˈi]]"),
    ]),
    Chapter("Sanat ve medya", "Kunst & Medien", "1f3ad", [
        N("der Sänger", "şarkıcı", "1f9d1-200d-1f3a4", ["schar", "kı", "dschı"], None, "şarkı = Lied"),
        N("der Künstler", "sanatçı", "1f9d1-200d-1f3a8", ["sa", "nat", "tschı"], None, "sanat = Kunst"),
        N("der Schauspieler", "oyuncu", "x-worker-pink+1f3ad", ["o", "jun", "dschu"], None,
          "oyun = Spiel  ·  auch: Spieler"),
        N("der Journalist", "gazeteci", "x-worker-brown+1f4f0", ["ga", "se", "te", "dschi"], None, "gazete = Zeitung"),
    ]),
]
ALL = [n for ch in CHAPTERS for n in ch.items]
BY_TR = {n.tr: n for n in ALL}

SUFFIX = [  # Wort + -cı = wer damit arbeitet
    ("posta", "cı", "Post", "der Postbote", "x-worker-yellow+2709"),
    ("fırın", "cı", "Ofen", "der Bäcker", COOK + "+1f35e"),
    ("şarkı", "cı", "Lied", "der Sänger", "1f9d1-200d-1f3a4"),
    ("gazete", "ci", "Zeitung", "der Journalist", "x-worker-brown+1f4f0"),
    ("çöp", "çü", "Müll", "der Müllmann", "x-worker-orange+1f5d1"),
    ("balık", "çı", "Fisch", "der Fischer", "x-worker-blue+1f41f"),
]
IAM = [  # Beruf + „ich bin“; gesprochen als ganzer Satz mit „Ben“ (das m am Ende klingt sonst wie n)
    ("öğretmen", "im", "Ich bin Lehrer oder Lehrerin.", "ich bin Lehrer/in", TEACHER, "[[bˈæn œːɾɛtmˈenim.]]"),
    ("doktor", "um", "Ich bin Arzt.", "ich bin Arzt/Ärztin", DOC + "+1fa7a", "Ben doktorum."),
    ("polis", "im", "Ich bin Polizist.", "ich bin Polizist/in", "1f46e", "[[bˈæn polˈisim.]]"),
    ("mühendis", "im", "Ich bin Ingenieur.", "ich bin Ingenieur/in", OFFICE + "+2699", "[[bˈæn myhændˈisim.]]"),
    ("şoför", "üm", "Ich bin Fahrer.", "ich bin Fahrer/in", "x-worker-grey+1f68c", "Ben şoförüm."),
    ("aşçı", "yım", "Ich bin Koch.", "ich bin Koch/Köchin", COOK, "Ben aşçıyım."),
]
WORK = [("Ne iş yapıyorsun?", "Was machst du beruflich?", "1f4bc"),
        ("Ben hemşireyim.", "Ich bin Krankenpfleger(in).", DOC + "+1fa79"),
        ("Nerede çalışıyorsun?", "Wo arbeitest du?", "1f3e2"),
        ("Hastanede çalışıyorum.", "Ich arbeite im Krankenhaus.", "1f3e5")]
QUIZ = ["polis", "doktor", "öğretmen", "aşçı", "pilot", "postacı", "fırıncı", "avukat", "garson", "çiftçi",
        "şarkıcı", "kuaför"]
FLOATERS = ["1f46e", "1f9d1-200d-1f692", TEACHER, COOK, "1f9d1-200d-2708-fe0f", "1f477", "1f9d1-200d-1f3a8",
            "1f9d1-200d-1f680"]
ICONS = ["1f4cc"]


# --------------------------------------------------------------------------------------
# Bonus-Szenen (RowsScene aus lernvideo/nouns.py)
# --------------------------------------------------------------------------------------
def suffix_scene(ctx):
    rows = [dict(left=[(stem, "Bold", 54, INK), (suf, "ExtraBold", 54, RED)], icon=emo,
                 right=[(de_stem, "SemiBold", 40, MUTED), (f"  {ARROW}  ", "SemiBold", 40, MUTED), (de, "SemiBold", 44, INK)],
                 say=[("tr", stem + "."), ("de", de_stem + "."), ("tr", stem + suf + "."), ("de", de + ".")])
            for stem, suf, de_stem, de, emo in SUFFIX]
    return RowsScene(
        ctx, "Bonus 1: Die Endung -cı", "-cı: wer damit arbeitet",
        "Bonus eins: Hast du es gemerkt? Viele Berufe bekommen eine kleine Endung: Wer mit etwas arbeitet.",
        rows, end="Nach harten Lauten wie p, t oder k wird aus dem c ein ç.",
        note=[("-cı / -ci / -cu / -cü", "ExtraBold", 34, RED), ("   nach p, t, k, ç, ş, s, f, h:  ", "Medium", 32, MUTED),
              ("-çı / -çi / -çu / -çü", "ExtraBold", 34, RED)],
        y0=245, dy=114, note_y=965)


def iam_scene(ctx):
    rows = [dict(left=[("ben ", "Medium", 44, MUTED), (job, "Bold", 54, INK), (suf, "ExtraBold", 54, RED)], icon=emo,
                 right=[(f"= {de_show}", "SemiBold", 42, INK)],
                 say=[("tr", say, f"Ben {job}{suf}."), ("de", de_say)])
            for job, suf, de_say, de_show, emo, say in IAM]
    return RowsScene(
        ctx, "Bonus 2: Ich bin …", "Ich bin …",
        "Bonus zwei: So sagst du deinen Beruf. Du hängst einfach eine Endung an, sie bedeutet: ich bin. "
        "Und übrigens: Auf Türkisch gibt es keinen Unterschied zwischen Lehrer und Lehrerin. Ein Wort für beide!",
        rows, end="Die Endung passt sich dem Vokal an. Endet der Beruf auf einen Vokal, kommt ein y dazwischen.",
        note=[("-im / -ım / -um / -üm", "ExtraBold", 34, RED), ("  ·  nach Vokal mit y:  ", "Medium", 32, MUTED),
              ("aşçı", "Bold", 34, INK), ("yım", "ExtraBold", 34, RED), ("  ·  ", "Medium", 32, MUTED),
              ("ben", "Bold", 34, TEAL), (" = ich (kann wegfallen)", "Medium", 32, MUTED)],
        y0=245, dy=114, note_y=965)


# --------------------------------------------------------------------------------------
# Zusammenbau
# --------------------------------------------------------------------------------------
def build_scenes(ctx: Ctx):
    fill_stress(ctx, ALL)
    ctx.pill = StatusPill(ctx.gfx)
    ctx.card_base = card_base(ctx)
    title = TitleScene(
        ctx, "Meslekler", "Berufe auf Türkisch",
        [("mes · lek · ", "Bold", 46, MUTED), ("ler", "Bold", 46, RED), ("   =   die Berufe", "Medium", 46, MUTED)],
        FLOATERS,
        [("tr", "Merhaba!", "hello"),
         ("de", "Heute lernst du vierzig Berufe auf Türkisch. Übrigens: Für Mann und Frau gibt es auf Türkisch "
                "nur ein Wort.", "welcome"),
         ("de", "Berufe heißt auf Türkisch:", "word"), ("tr", "Meslekler.", "meslek"),
         ("tr_slow", "Meslekler.", "meslek2")],
        title_mark="meslek")
    scenes = [title, HowToScene(ctx, BY_TR["doktor"])]
    idx = 0
    for k, ch in enumerate(CHAPTERS, 1):
        scenes.append(ChapterScene(ctx, k, ch))
        for item in ch.items:
            idx += 1
            scenes.append(CardScene(ctx, item, ch, idx, len(ALL)))
    scenes += [
        suffix_scene(ctx),
        iam_scene(ctx),
        PhraseGridScene(ctx, "Bonus 3: Bei der Arbeit", "Bonus drei: vier Sätze über die Arbeit.",
                        WORK, chapter="Sätze über die Arbeit",
                        note=[("iş", "ExtraBold", 36, RED), (" = Arbeit  ·  ", "Medium", 32, MUTED),
                              ("çalışmak", "Bold", 36, TEAL), (" = arbeiten  ·  ", "Medium", 32, MUTED),
                              ("hastane", "Bold", 36, TEAL), (" = Krankenhaus  ·  ", "Medium", 32, MUTED),
                              ("-de", "Bold", 36, TEAL), (" = in", "Medium", 32, MUTED)]),
        QuizIntroScene(ctx),
    ]
    for i, w_ in enumerate(QUIZ, 1):
        scenes.append(QuizScene(ctx, BY_TR[w_], i, len(QUIZ)))
    scenes += [
        OverviewScene(ctx, ALL, "Alle 40 Berufe auf einen Blick",
                      "Hier sind alle vierzig Berufe auf einen Blick.", cols=8),
        OutroScene(ctx, "Kolay gelsin!", "Frohes Schaffen!", "Jetzt kennst du 40 Berufe auf Türkisch!",
                   ["Super gemacht! Jetzt kennst du vierzig Berufe auf Türkisch.",
                    "Diesen Satz sagt man in der Türkei zu allen, die gerade arbeiten."],
                   icon="1f4bc"),
    ]
    return scenes


def emoji_codes():
    return ({n.emoji for n in ALL} | {c.icon for c in CHAPTERS} | set(FLOATERS) | set(ICONS) | set(NOUN_ICONS)
            | {e for *_, e in SUFFIX} | {row[4] for row in IAM} | {e for *_, e in WORK} | {"1f4bc"})


if __name__ == "__main__":
    run(doc=__doc__, build_scenes=build_scenes, emoji_codes=emoji_codes(), video_dir=HERE,
        out_name="meslekler_berufe_deutsch_tuerkisch.mp4", title="Meslekler – Berufe auf Türkisch")
