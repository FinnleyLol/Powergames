# TikTok-Video: Auf der Venus ist ein Tag länger als ein Jahr

**Video:** [`output/venus_tiktok.mp4`](output/venus_tiktok.mp4) · 9:16 · 1080×1920 · 30 fps · 30 s · Deutsch · Fun Fact/Weltraum · Stimme: Thorsten (high), gemastert auf −9 LUFS · keine Musik

| Zeit | Sprecher | Bild | Host |
|---|---|---|---|
| 0–3,1 s | Auf der Venus ist ein Tag länger als ein Jahr. | Abendhimmel in Lila/Rosa/Orange, Venus als heller Abendstern, Hügel mit Teleskop, Dorflichter, Glühwürmchen; VENUS, 1 TAG > 1 JAHR | läuft rein, schaut hoch, springt mit „!“ |
| 3,1–6 s | Einmal um sich selbst: 243 Tage. | Weltraum, riesige Venus dreht sich ganz langsam (Fähnchen auf der Oberfläche), Zähler 0 → 243 TAGE; SOOO LANGSAM | – |
| 6–9,2 s | Einmal um die Sonne: nur 225. | Sonne mit Umlaufbahn, die Venus kreist einmal herum, Zähler 0 → 225, Balken TAG 243 vs. JAHR 225 | – |
| 9,2–10,6 s | Und sie dreht sich rückwärts: | Split-Screen Erde (dreht nach rechts) / Venus (dreht nach links); RÜCKWÄRTS! | – |
| 10,6–12,3 s | Die Sonne geht im Westen auf. | Venus-Oberfläche in Orange, Vulkane, Felsen, W und O am Boden, die Sonne geht links auf; WESTEN! | im Raumhelm, „?“, dreht sich um, „!“ |
| 12,3–16,4 s | Am Boden hat es 465 Grad. Da schmilzt sogar Blei. | Rote Hitze mit Flimmern und glühendem Vulkan, Thermometer steigt bis 465 °C (Marke „250° Pizzaofen“), ein Bleiblock (Pb) zerfließt; HEISS!, BLEI | schwitzt im Helm, Dampf über der Mütze |
| 16,4–19,7 s | Die Luft drückt so stark wie 900 Meter tief im Meer. | Tiefsee mit Lichtstrahlen, Fischen, Anglerfisch, Tiefenmesser 0 → 900 M; DRUCK | sinkt ab und wird zusammengedrückt, rote Pfeile |
| 19,7–21,8 s | Und die Wolken bestehen aus Säure. | Gelbgrüne Wolkenschichten, Säuretropfen fressen Löcher in einen Regenschirm, Warnschild; DIE WOLKEN, SÄURE! | – |
| 21,8–24,8 s | 1982 landete dort eine Sonde. | Sonde schwebt am Fallschirm durch orange Wolken und landet in einer Staubwolke; 1982, SONDE | – |
| 24,8–30 s | Nach 127 Minuten war Schluss. | Kontrollraum: Bildschirm mit Venus-Panorama, Minutenzähler 000 → 127, dann Rauschen und KEIN SIGNAL, zwei Mitarbeiter erschrecken; REKORD BIS HEUTE | schaut zu, „!“, Schweißtropfen, Kopfschütteln |

Fakten: Die Venus braucht für eine Drehung um sich selbst (siderisch) etwa 243 Erdtage, für einen Umlauf um die Sonne etwa 225. Sie dreht sich rückläufig, deshalb geht die Sonne dort im Westen auf. An der Oberfläche herrschen rund 465 °C (Blei schmilzt bei 327 °C) und etwa der 92-fache Luftdruck der Erde, so viel wie in rund 900 m Meerestiefe. Die Wolken bestehen vor allem aus Schwefelsäure-Tröpfchen. Die sowjetische Sonde Venera 13 landete am 1. März 1982 und sendete 127 Minuten lang, länger als jeder andere Lander auf der Venus.

Aussprache: „Schwefelsäure“ und „heiß genug, um Blei zu schmelzen“ waren für Whisper undeutlich, daher „bestehen aus Säure“ und „Da schmilzt sogar Blei“.

Technik wie bei [`../tiktok-mikrowelle/`](../tiktok-mikrowelle/) (−9 LUFS). Neu sind `planet()` (Bänder, drehende Flecken, Schattenseite), `stars()`, `arrowArc()`, `counterBox()`, `helmet()` (Raumhelm um den Host), `lander()`, `volcano()`, `rocks()`, `fish()`, und in `audio.py` ein Weltraum-Brummen (`drone`), Zähler-Ticks (`ticks`), Rauschen (`static`) und Brutzeln (`sizzle`).
