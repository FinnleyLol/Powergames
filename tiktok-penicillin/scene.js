/* Penicillin story TikTok short: deterministic canvas animation. renderFrame(i) draws frame i. */
'use strict';
const W = 1080, H = 1920;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let TL, CUES, FPS, DUR, SCENES, CHUNKS, CHAR_KEYS;
const WORLD = {};
const SPR = {};

// ------------------------------------------------------------------ math & easing
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inCubic: u => u * u * u,
  inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  outQuart: u => 1 - Math.pow(1 - u, 4),
  outBack: (u, s = 1.70158) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
  outElastic: u => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function mixHex(h1, h2, u) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, u));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, u));
  const bl = Math.round(lerp(a & 255, b & 255, u));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
const MINUS = '−';
const fmtT = (v, d = 1) => (v < -0.05 ? MINUS : '') + Math.abs(v).toFixed(d);

const COL = {
  ice: '#8fe9ff', ice2: '#d6f8ff', green: '#4dff3a', greenD: '#16b81a', red: '#ff3b4e',
  orange: '#ff7a3c', gold: '#ffd166', white: '#ffffff', dark: '#06111f',
};

// ------------------------------------------------------------------ drawing helpers
function font(w, s, fam = 'Montserrat') { return `${w} ${s}px ${fam}`; }
function text(c, str, x, y, o = {}) {
  c.save();
  c.font = font(o.w || 800, o.s || 48, o.fam);
  c.textAlign = o.align || 'center';
  c.textBaseline = o.base || 'middle';
  c.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.blur ?? 18; c.shadowOffsetY = o.sy ?? 4; }
  if (o.stroke) {
    c.lineJoin = 'round'; c.lineWidth = o.sw || 10; c.strokeStyle = o.stroke; c.strokeText(str, x, y);
    if (!o.keepShadow) c.shadowColor = 'transparent';
  }
  c.fillStyle = o.fill || '#fff';
  c.fillText(str, x, y);
  c.restore();
}
function measure(c, str, o = {}) {
  c.save(); c.font = font(o.w || 800, o.s || 48, o.fam); c.letterSpacing = (o.ls || 0) + 'px';
  const m = c.measureText(str).width; c.restore(); return m;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function glass(c, x, y, w, h, r, o = {}) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
  rr(c, x, y, w, h, r); c.fillStyle = o.fill || 'rgba(10,30,56,0.78)'; c.fill();
  c.shadowColor = 'transparent';
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fill();
  c.lineWidth = o.lw || 2; c.strokeStyle = o.stroke || 'rgba(160,230,255,0.5)'; c.stroke();
  c.restore();
}
function pill(c, cx, cy, label, o = {}) {
  const s = o.s || 30, padX = o.padX || 28, h = o.h || s * 1.9;
  const iconW = o.icon ? h * 0.62 : 0;
  const w = measure(c, label, { w: o.w || 900, s, ls: o.ls ?? 3 }) + padX * 2 + iconW;
  c.save();
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = 30; }
  rr(c, cx - w / 2, cy - h / 2, w, h, h / 2);
  c.fillStyle = o.bg || COL.red; c.fill();
  c.shadowColor = 'transparent';
  if (o.border) { c.lineWidth = 3; c.strokeStyle = o.border; c.stroke(); }
  if (o.icon) o.icon(c, cx - w / 2 + padX + iconW * 0.4, cy, h * 0.3, o.fg || '#fff');
  text(c, label, cx + iconW / 2, cy + 1, { w: o.w || 900, s, fill: o.fg || '#fff', ls: o.ls ?? 3 });
  c.restore();
  return w;
}
function iconCheck(c, x, y, r, col) {
  c.save(); c.lineWidth = r * 0.42; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = col;
  c.beginPath(); c.moveTo(x - r * 0.8, y); c.lineTo(x - r * 0.2, y + r * 0.6); c.lineTo(x + r * 0.9, y - r * 0.6); c.stroke(); c.restore();
}
function iconCross(c, x, y, r, col) {
  c.save(); c.lineWidth = r * 0.42; c.lineCap = 'round'; c.strokeStyle = col;
  c.beginPath(); c.moveTo(x - r * 0.65, y - r * 0.65); c.lineTo(x + r * 0.65, y + r * 0.65);
  c.moveTo(x + r * 0.65, y - r * 0.65); c.lineTo(x - r * 0.65, y + r * 0.65); c.stroke(); c.restore();
}
function iconDot(c, x, y, r, col) { c.save(); c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.55, 0, 7); c.fill(); c.restore(); }
function pinPath(c, s = 1) {
  c.beginPath(); c.moveTo(0, 0);
  c.bezierCurveTo(-12 * s, -26 * s, -34 * s, -44 * s, -34 * s, -70 * s);
  c.arc(0, -70 * s, 34 * s, Math.PI, 0);
  c.bezierCurveTo(34 * s, -44 * s, 12 * s, -26 * s, 0, 0);
  c.closePath();
}
function snowflake(c, x, y, r, rot, col, lw) {
  c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    c.rotate(Math.PI / 3);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r);
    for (const f of [0.45, 0.7]) {
      const b = r * (f === 0.45 ? 0.32 : 0.22);
      c.moveTo(0, -r * f); c.lineTo(-b, -r * f - b); c.moveTo(0, -r * f); c.lineTo(b, -r * f - b);
    }
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ assets
async function loadImg(src) { const im = new Image(); im.src = src; await im.decode(); return im; }
const POSES = {
  serious: { file: '../character/serious.png', x0: 222, y0: 0, mouth: [512, 470] },
  thinking: { file: '../character/thinking.png', x0: 235, y0: 31, mouth: [536, 470] },
  thumbsup: { file: '../character/thumbsup.png', x0: 211, y0: 0, mouth: [512, 470] },
};
const PAD = 70;
async function prepCharacter() {
  for (const [k, p] of Object.entries(POSES)) {
    const im = await loadImg(p.file);
    const c = mk(im.width + PAD * 2, im.height + PAD * 2), g = c.getContext('2d');
    g.shadowColor = 'rgba(70,255,60,0.75)'; g.shadowBlur = 46; g.drawImage(im, PAD, PAD);
    g.shadowColor = 'rgba(200,245,255,0.55)'; g.shadowBlur = 7; g.drawImage(im, PAD, PAD);
    g.shadowColor = 'transparent'; g.drawImage(im, PAD, PAD);
    const wsil = mk(c.width, c.height), wg = wsil.getContext('2d');
    wg.drawImage(im, PAD, PAD); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, c.width, c.height);
    p.img = im; p.spr = c; p.white = wsil;
  }
}
function makeSnowSprite() {
  const c = mk(64, 64), g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(240,250,255,0.75)'); gr.addColorStop(1, 'rgba(220,240,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}
function makeGrain() {
  const c = mk(256, 256), g = c.getContext('2d'), id = g.createImageData(256, 256), R = rng(3);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (R() - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c;
}
function makeDots() {
  const c = mk(48, 48), g = c.getContext('2d');
  g.fillStyle = 'rgba(160,220,255,0.10)'; g.beginPath(); g.arc(24, 24, 1.6, 0, 7); g.fill(); return c;
}

// ------------------------------------------------------------------ shared: scenes, palette, grain, transitions
function sceneIndex(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].a) return i; return 0; }
function palette(t) {
  const i = sceneIndex(t), cur = PAL[SCENES[i].id];
  if (i === 0) return cur;
  const u = E.inOutCubic(prog(t, SCENES[i].a - 0.15, SCENES[i].a + 0.45)), prev = PAL[SCENES[i - 1].id];
  return cur.map((c, k) => mixHex(prev[k], c, u));
}
function drawGrainVignette(c, t) {
  const vg = c.createRadialGradient(540, 900, 520, 540, 900, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  const i = Math.floor(t * FPS / 2);  // grain changes every 2nd frame (filmic, cheaper to encode)
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.035;
  c.translate(-(hash(i) * 256 | 0), -(hash(i + 0.5) * 256 | 0));
  c.fillStyle = c.createPattern(SPR.grain, 'repeat'); c.fillRect(0, 0, W + 256, H + 256); c.restore();
}
function shineFill(c, x0, x1, p, base1, base2) {
  const g = c.createLinearGradient(x0, -60, x1, 60);
  g.addColorStop(0, base1);
  if (p > 0.02 && p < 0.98) { g.addColorStop(clamp(p - 0.1), base1); g.addColorStop(p, '#ffffff'); g.addColorStop(clamp(p + 0.1), base2); }
  g.addColorStop(1, base2);
  return g;
}
const TR = 0.2;
function drawScenes(c, t) {
  const s = sceneIndex(t), sc = SCENES[s];
  const prev = s > 0 && t < sc.a + TR ? SCENES[s - 1] : null;
  const next = s < SCENES.length - 1 && t > sc.b - TR ? SCENES[s + 1] : null;
  if (!prev && !next) { sc.draw(c, t); return; }
  const out = prev || sc, inn = prev ? sc : next, cut = prev ? sc.a : sc.b;
  const u = clamp((t - (cut - TR)) / (2 * TR));
  for (const [L, scn, isIn] of [[SPR.L1, out, false], [SPR.L2, inn, true]]) {
    const g = L.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    scn.draw(g, t);
    c.save();
    let sc2, ty, al, bl;
    if (!isIn) { const k = E.inCubic(u); sc2 = 1 + 0.12 * k; ty = -140 * k; al = 1 - k; bl = 16 * k; }
    else { const k = E.outCubic(u); sc2 = 0.9 + 0.1 * k; ty = 180 * (1 - k); al = k; bl = 16 * (1 - k); }
    c.globalAlpha = al; if (bl > 0.5) c.filter = `blur(${bl.toFixed(1)}px)`;
    c.translate(540, 860 + ty); c.scale(sc2, sc2); c.translate(-540, -860);
    c.drawImage(L, 0, 0); c.restore();
  }
  // light streak
  const sk = Math.sin(Math.PI * u);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 * sk;
  const x = lerp(-500, W + 500, u);
  const g = c.createLinearGradient(x - 260, 0, x + 260, 0);
  g.addColorStop(0, 'rgba(140,230,255,0)'); g.addColorStop(0.5, 'rgba(200,245,255,0.9)'); g.addColorStop(1, 'rgba(140,230,255,0)');
  c.translate(540, 960); c.rotate(0.35); c.translate(-540, -960); c.fillStyle = g; c.fillRect(-600, -600, W + 1200, H + 1200);
  c.restore();
}


// ------------------------------------------------------------------ assets for this short
function makeBokeh() {
  const R = rng(8);
  return Array.from({ length: 30 }, () => ({ x: R() * W, y: R() * H, r: 5 + R() * 16, sp: 10 + R() * 26, ph: R() * 6.28, a: 0.1 + R() * 0.22 }));
}
function blobSprite(c1, c2, c3) {
  const c = mk(64, 64), g = c.getContext('2d');
  const gr = g.createRadialGradient(26, 24, 2, 32, 32, 30);
  gr.addColorStop(0, c1); gr.addColorStop(0.6, c2); gr.addColorStop(1, c3);
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.fill();
  return c;
}
function makeMoldSprite() {
  const S = 320, c = mk(S, S), g = c.getContext('2d'), R = rng(12), m = S / 2;
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) { // fuzzy hyphae
    const a = R() * Math.PI * 2, r0 = R() * 60, len = 40 + R() * 90;
    g.strokeStyle = `rgba(${230 + R() * 25 | 0},${245 + R() * 10 | 0},255,${0.08 + R() * 0.18})`; g.lineWidth = 1 + R() * 1.6;
    g.beginPath(); g.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0);
    g.quadraticCurveTo(m + Math.cos(a + 0.2) * (r0 + len * 0.6), m + Math.sin(a + 0.2) * (r0 + len * 0.6), m + Math.cos(a) * (r0 + len), m + Math.sin(a) * (r0 + len));
    g.stroke();
  }
  const gr = g.createRadialGradient(m, m, 4, m, m, 110);
  gr.addColorStop(0, 'rgba(40,120,95,1)'); gr.addColorStop(0.45, 'rgba(90,175,140,0.95)'); gr.addColorStop(0.75, 'rgba(225,245,235,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, 110, 0, 7); g.fill();
  for (let i = 0; i < 60; i++) { // spore dots
    const a = R() * 6.28, r = R() * 55;
    g.fillStyle = `rgba(20,90,70,${0.3 + R() * 0.4})`; g.beginPath(); g.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, 2 + R() * 4, 0, 7); g.fill();
  }
  return c;
}
function makePersonSprite(col) {
  const c = mk(40, 50), g = c.getContext('2d');
  g.fillStyle = col; g.beginPath(); g.arc(20, 12, 10, 0, 7); g.fill();
  g.beginPath(); g.roundRect(5, 25, 30, 24, [14, 14, 3, 3]); g.fill();
  return c;
}
function makeColonies() {
  const R = rng(21), out = [];
  while (out.length < 240) {
    const a = R() * 6.283, r = Math.sqrt(R()) * 430;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (Math.hypot(x - MOLD.x, y - MOLD.y) < 70) continue;
    if (out.some(o => Math.hypot(o.x - x, o.y - y) < 22)) continue;
    out.push({ x, y, s: 7 + R() * 10, d: R() });
  }
  return out;
}
// mold position and dish geometry (dish coordinates are relative to the dish centre)
const DISH = { x: 540, y: 880, r: 470 };
const MOLD = { x: -150, y: -175 };

window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await document.fonts.load(font(800, 60, 'JBMono')); await document.fonts.load(font(600, 60, 'JBMono'));
  await prepCharacter();
  SPR.photo = await loadImg('assets/fleming_lab_D17801.jpg');
  SPR.dot = makeSnowSprite(); SPR.grain = makeGrain(); SPR.dots = makeDots(); SPR.bokeh = makeBokeh();
  SPR.colony = blobSprite('#fff6cf', '#f0c75a', 'rgba(196,140,40,0.9)');
  SPR.dead = blobSprite('rgba(220,220,220,0.7)', 'rgba(150,150,150,0.5)', 'rgba(110,110,110,0.3)');
  SPR.mold = makeMoldSprite();
  SPR.colonies = makeColonies();
  SPR.personOff = makePersonSprite('rgba(170,190,200,0.35)'); SPR.personOn = makePersonSprite('#4dff3a');
  SPR.L1 = mk(W, H); SPR.L2 = mk(W, H);
  SCENES = [
    { id: 'intro', a: 0, b: CUES.dish, draw: drawIntro },
    { id: 'dish', a: CUES.dish, b: CUES.pen, draw: drawDish },
    { id: 'pen', a: CUES.pen, b: CUES.impact, draw: drawPen },
    { id: 'impact', a: CUES.impact, b: CUES.end, draw: drawImpact },
    { id: 'end', a: CUES.end, b: DUR + 1, draw: drawEnd },
  ];
  CHAR_KEYS = [
    { t: 0, on: true, pose: 'serious', x: 290, y: 1110, s: 0.64 },
    { t: CUES.vacation, on: true, pose: 'thinking', x: 790, y: 1110, s: 0.64 },
    { t: CUES.dish, on: false },
    { t: CUES.pen, on: true, pose: 'thinking', x: 800, y: 1110, s: 0.64 },
    { t: CUES.impact, on: false },
    { t: CUES.end, on: true, pose: 'thumbsup', x: 540, y: 1080, s: 0.68 },
  ];
  WORDS = TL.lines.flatMap(l => l.phrases.flatMap(p => p.words));
  return { frames: Math.round(DUR * FPS) };
};
let WORDS;

// ------------------------------------------------------------------ captions: one word at a time, centre of the screen
const CAP_Y = 960, CAP_SIZE = 64;
function drawCaptions(c, t) {
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i], nxt = WORDS[i + 1];
    const end = nxt && nxt.start - w.end < 0.6 ? nxt.start - 0.03 : w.end + 0.3;
    if (t >= w.start - 0.04 && t < end) { idx = i; break; }
  }
  if (idx < 0) return;
  const w = WORDS[idx], txt = w.text.replace(/[.,]+$/, '').toUpperCase();
  const u = prog(t, w.start - 0.04, w.start + 0.1);
  const s = lerp(0.6, 1, E.outBack(u, 2.2));
  const o = { w: 900, s: CAP_SIZE, ls: 1 };
  const fit = Math.min(1, 920 / measure(c, txt, o));
  c.save(); c.translate(540, CAP_Y + 10 * (1 - E.outCubic(u))); c.scale(s * fit, s * fit); c.globalAlpha = clamp(u * 3);
  text(c, txt, 0, 0, { ...o, fill: w.key ? COL.green : '#fff', stroke: '#020812', sw: 13, shadow: 'rgba(0,0,0,0.7)', blur: 16, sy: 5, keepShadow: true });
  c.restore();
}

// ------------------------------------------------------------------ background
const PAL = {
  intro: ['#1a1209', '#3a2614', '#d9a35b'], dish: ['#03121a', '#0a2d3a', '#4fd1c5'],
  pen: ['#140d03', '#2e2108', '#ffc94a'], impact: ['#02130c', '#0a3324', '#3fdc6a'], end: ['#120c06', '#2a1d10', '#d9a35b'],
};
function drawBackground(c, t) {
  const [top, bot, glow] = palette(t);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(540, 600, 40, 540, 600, 900);
  rg.addColorStop(0, glow + '48'); rg.addColorStop(1, glow + '00');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const b of SPR.bokeh) {
    const y = ((b.y - t * b.sp) % (H + 60) + H + 60) % (H + 60) - 30, x = b.x + Math.sin(t * 0.7 + b.ph) * 20;
    c.globalAlpha = b.a; c.drawImage(SPR.dot, x - b.r, y - b.r, b.r * 2, b.r * 2);
  }
  c.restore();
  c.save(); c.fillStyle = c.createPattern(SPR.dots, 'repeat'); c.globalAlpha = 0.6; c.fillRect(0, 0, W, H); c.restore();
}
function filmLook(c, t) {
  const amt = 1 - prog(t, CUES.dish - 0.2, CUES.dish + 0.25);
  if (amt <= 0) return;
  const j = Math.floor(t * FPS);
  c.save();
  c.globalCompositeOperation = 'color'; c.globalAlpha = 0.45 * amt; c.fillStyle = '#7a4a1e'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = amt * (0.03 + 0.03 * hash(j)); c.fillStyle = '#fff2d6'; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 3; k++) {
    if (hash(j * 3 + k) < 0.45) continue;
    const x = hash(j * 7 + k) * W; c.globalAlpha = 0.18 * amt; c.fillStyle = k % 2 ? '#2a1a0a' : '#fff5e0';
    c.fillRect(x, 0, 1.5 + hash(j + k) * 1.5, H);
  }
  for (let k = 0; k < 10; k++) {
    const x = hash(j * 11 + k) * W, y = hash(j * 13 + k) * H, r = 1 + hash(j * 17 + k) * 3;
    c.globalAlpha = 0.35 * amt; c.fillStyle = hash(k + j) < 0.5 ? '#1a0f05' : '#fff3dc'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  c.restore();
}
function shake(t) {
  let x = 0, y = 0;
  for (const [cue, amp] of [[CUES.year, 14], [CUES.mess, 10], [CUES.dead, 12], [CUES.first, 10], [CUES.clean + 0.25, 9]]) {
    if (t >= cue && t < cue + 0.8) { const k = amp * Math.exp(-(t - cue) / 0.13); x += k * noise1(t * 40 + cue * 10); y += k * noise1(t * 43 + cue * 20 + 7); }
  }
  return [x, y];
}
function flash(t) {
  let a = 0;
  for (const [cue, amp] of [[CUES.year, 0.4], [CUES.dead, 0.25], [CUES.first, 0.3]]) if (t >= cue) a += amp * Math.exp(-(t - cue) / 0.09);
  return a;
}

// ------------------------------------------------------------------ character (on screen in about half of the video)
function keyState(k) {
  const K = CHAR_KEYS[k];
  if (K.on) return K;
  const p = keyState(k - 1);
  return { ...p, y: 2300, on: false };
}
function charState(t) {
  let k = 0; while (k + 1 < CHAR_KEYS.length && t >= CHAR_KEYS[k + 1].t - 0.12) k++;
  const cur = keyState(k);
  let prev = k > 0 ? keyState(k - 1) : cur;
  if (k > 0 && !CHAR_KEYS[k - 1].on) prev = { ...cur, y: 2300 };
  const leaving = !CHAR_KEYS[k].on, both = k > 0 && CHAR_KEYS[k].on && CHAR_KEYS[k - 1].on;
  const uu = prog(t, cur.t - 0.12, cur.t + 0.48);
  const u = k === 0 ? 1 : leaving ? E.inCubic(prog(t, cur.t - 0.2, cur.t + 0.25)) : both ? E.inOutCubic(uu) : E.outBack(uu, 1.2);
  const st = { x: lerp(prev.x, cur.x, u), y: lerp(prev.y, cur.y, u), s: lerp(prev.s, cur.s, u), pose: cur.pose, hop: both ? Math.sin(Math.PI * u) : 0 };
  st.visible = !(leaving && u >= 1);
  st.poseT = t - (cur.t + 0.02);
  st.poseChanged = both && prev.pose !== cur.pose;
  if (t < cur.t + 0.02 && k > 0) { st.pose = prev.pose; st.poseChanged = false; }
  st.y += (1 - E.outBack(prog(t, 0.2, 0.8), 1.4)) * 900;
  return st;
}
function voiceEnv(t) {
  const i = Math.floor(t * FPS); let s = 0, n = 0;
  for (let k = i - 2; k <= i; k++) if (k >= 0 && k < TL.voiceEnv.length) { s += TL.voiceEnv[k]; n++; }
  return n ? s / n : 0;
}
function drawCharacter(c, t) {
  const st = charState(t);
  if (!st.visible) return;
  const P = POSES[st.pose];
  let { x, y, s } = st;
  y -= st.hop * 60 + voiceEnv(t) * 10 + Math.sin(t * 2.3) * 3;
  let sx = 1, sy = 1 + Math.sin(t * 2.3) * 0.006, white = 0;
  if (st.poseChanged && st.poseT >= 0 && st.poseT < 0.45) {
    const u = prog(st.poseT, 0, 0.45), k = Math.sin(u * Math.PI * 2.2) * (1 - u) * 0.09;
    sx *= 1 + k; sy *= 1 - k; white = 0.5 * (1 - E.outCubic(prog(st.poseT, 0, 0.3)));
  }
  const cy = y + 520 * s;
  const sg = c.createRadialGradient(x, cy, 30, x, cy, 520 * s);
  sg.addColorStop(0, 'rgba(77,255,58,0.2)'); sg.addColorStop(1, 'rgba(77,255,58,0)');
  c.fillStyle = sg; c.fillRect(x - 600, cy - 600, 1200, 1200);
  c.save();
  c.translate(x, y + 1536 * s); c.scale(sx, sy); c.translate(-x, -(y + 1536 * s));
  const dx = x + (P.x0 - PAD - 512) * s, dy = y + (P.y0 - PAD) * s;
  c.drawImage(P.spr, dx, dy, P.spr.width * s, P.spr.height * s);
  if (white > 0) { c.globalAlpha = white; c.drawImage(P.white, dx, dy, P.white.width * s, P.white.height * s); }
  c.restore();
}

// ------------------------------------------------------------------ scene 1: London 1928, the photo, the vacation, the messy lab
function drawIntro(c, t) {
  const yr = CUES.year, ph = CUES.photo, va = CUES.vacation, lab = CUES.lab;
  // year card
  if (t < ph + 0.4) {
    const out = E.inCubic(prog(t, ph - 0.1, ph + 0.3));
    c.save(); c.globalAlpha = 1 - out; c.translate(540, 520 - 200 * out);
    const k = prog(t, 0.1, 0.45);
    text(c, 'LONDON', 0, -170, { w: 800, s: 44, ls: 22, fill: '#f6e3c0', alpha: k });
    if (t > yr - 0.05) {
      const u = prog(t, yr - 0.05, yr + 0.25), s = lerp(2.2, 1, E.outExpo(u));
      c.save(); c.scale(s, s); c.globalAlpha *= clamp(u * 3);
      text(c, '1928', 0, 10, { w: 900, s: 230, ls: 6, fill: '#fbe9c8', stroke: '#2a1a0a', sw: 18, shadow: 'rgba(0,0,0,0.6)', blur: 30, sy: 10, keepShadow: true });
      c.restore();
      const lw = 520 * E.outExpo(prog(t, yr + 0.2, yr + 0.7));
      c.fillStyle = '#d9a35b'; c.fillRect(-lw / 2, 150, lw, 6);
      text(c, "ST MARY'S HOSPITAL", 0, 200, { fam: 'JBMono', w: 700, s: 32, ls: 6, fill: '#e8cfa5', alpha: prog(t, yr + 0.5, yr + 0.9) });
    }
    c.restore();
  }
  // year chip once the photo is up
  if (t > ph) {
    const u = E.outBack(prog(t, ph + 0.1, ph + 0.4), 2);
    c.save(); c.translate(540, 175); c.scale(u, u);
    pill(c, 0, 0, 'LONDON · 1928', { bg: '#f3e2c2', fg: '#3a2410', s: 26, ls: 4 });
    c.restore();
  }
  // the real photo (public domain, Imperial War Museum)
  if (t > ph - 0.1 && t < lab + 0.3) {
    const u = prog(t, ph - 0.1, ph + 0.35), out = E.inCubic(prog(t, va - 0.15, va + 0.3));
    const fw = 604, fh = 694, iw = 560, ih = 582;
    c.save(); c.translate(540 - 900 * out, 560 - 500 * (1 - E.outBack(u, 1.3))); c.rotate(lerp(-0.25, -0.04, E.outBack(u)) - 0.5 * out);
    c.globalAlpha = clamp(u * 3);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    c.fillStyle = '#f7f1e4'; c.fillRect(-fw / 2, -fh / 2, fw, fh); c.shadowColor = 'transparent';
    // Ken Burns: slow push towards Fleming (left-lower part of the photo)
    const kb = prog(t, ph, va + 0.3), z = lerp(1.0, 1.22, kb);
    const img = SPR.photo, sw = img.width / z, sh = img.width * (ih / iw) / z;
    const sx = lerp(0, img.width * 0.08, kb), sy = lerp(0, img.height * 0.28, kb);
    c.drawImage(img, sx, Math.min(sy, img.height - sh), sw, sh, -fw / 2 + 22, -fh / 2 + 22, iw, ih);
    text(c, 'ALEXANDER FLEMING', 0, fh / 2 - 44, { w: 900, s: 34, fill: '#2a1a0a', ls: 3 });
    text(c, 'Photo: IWM, public domain', fw / 2 - 18, fh / 2 - 12, { w: 600, s: 14, fill: '#8a7a66', align: 'right' });
    c.restore();
  }
  // gone on vacation
  if (t > va - 0.1 && t < lab + 0.4) {
    const u = prog(t, va - 0.1, va + 0.35), out = E.inCubic(prog(t, lab - 0.1, lab + 0.3));
    const swing = 0.3 * Math.exp(-(t - va) / 0.5) * Math.cos((t - va) * 7);
    c.save(); c.translate(540, 250 - 700 * (1 - E.outBack(u, 1.2)) - 700 * out); c.rotate(swing);
    c.strokeStyle = '#c9a77a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-170, -90); c.lineTo(0, -200); c.lineTo(170, -90); c.stroke();
    c.fillStyle = '#e9d3a8'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 12; rr(c, -280, -90, 560, 300, 18); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#6b4a24'; c.lineWidth = 6; rr(c, -262, -72, 524, 264, 12); c.stroke();
    text(c, 'GONE ON', 0, -10, { w: 900, s: 64, fill: '#3a2410', ls: 4 });
    text(c, 'VACATION', 0, 70, { w: 900, s: 78, fill: '#c2410c', ls: 4 });
    // little sun
    c.save(); c.translate(205, 150); c.rotate(t);
    c.fillStyle = '#f59e0b'; for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.fillRect(-3, -34, 6, 12); }
    c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill(); c.restore();
    c.restore();
    // suitcase
    const su = E.outBack(prog(t, va + 0.15, va + 0.5), 2);
    c.save(); c.translate(540, 700); c.scale(su * (1 - out), su * (1 - out)); c.rotate(Math.sin(t * 6) * 0.05);
    c.fillStyle = '#7c3f1d'; rr(c, -110, -70, 220, 150, 16); c.fill();
    c.strokeStyle = '#4a230f'; c.lineWidth = 8; c.beginPath(); c.roundRect(-40, -100, 80, 36, 10); c.stroke();
    c.fillStyle = '#d9a35b'; c.fillRect(-110, -10, 220, 14); c.fillRect(-60, -70, 12, 150); c.fillRect(48, -70, 12, 150);
    c.restore();
  }
  if (t > lab - 0.2) drawLab(c, t, lab - 0.2, CUES.mess, 0);
  // mess meter + calendar
  if (t > CUES.mess - 0.1) {
    const mu = prog(t, CUES.mess - 0.1, CUES.mess + 0.2), lvl = lerp(0.15, 1, E.outCubic(prog(t, CUES.mess, CUES.mess + 0.7)));
    c.save(); c.globalAlpha = mu; c.translate(0, -40 * (1 - mu));
    text(c, 'MESS LEVEL', 80, 270, { fam: 'JBMono', w: 800, s: 28, fill: '#f6e3c0', align: 'left', ls: 3 });
    c.fillStyle = 'rgba(255,255,255,0.12)'; rr(c, 80, 300, 520, 34, 17); c.fill();
    const g = c.createLinearGradient(80, 0, 600, 0); g.addColorStop(0, '#facc15'); g.addColorStop(1, '#ef4444');
    c.fillStyle = g; rr(c, 80, 300, 520 * lvl, 34, 17); c.fill();
    if (lvl > 0.97 && Math.floor(t * 6) % 2 === 0) text(c, 'MAX', 640, 318, { w: 900, s: 30, fill: '#ef4444', align: 'left' });
    c.restore();
  }
  if (t > CUES.back - 0.1) {
    const u = E.outBack(prog(t, CUES.back - 0.1, CUES.back + 0.25), 2), flip = prog(t, CUES.back + 0.1, CUES.back + 0.35);
    c.save(); c.translate(860, 300); c.scale(u, u * (flip < 0.5 ? 1 - flip * 2 : flip * 2 - 1));
    c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; rr(c, -95, -90, 190, 180, 14); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#dc2626'; rr(c, -95, -90, 190, 50, [14, 14, 0, 0]); c.fill();
    text(c, flip < 0.5 ? 'AUG' : 'SEP', 0, -64, { w: 900, s: 32, fill: '#fff', ls: 4 });
    text(c, flip < 0.5 ? '1928' : 'BACK', 0, 25, { w: 900, s: flip < 0.5 ? 50 : 54, fill: '#1f2937' });
    c.restore();
  }
}
function drawLab(c, t, t0, messT, settle) {
  const u = E.outCubic(prog(t, t0, t0 + 0.45));
  const mess = clamp((t - messT) / 0.7);
  c.save(); c.globalAlpha = u; c.translate(0, 120 * (1 - u));
  // shelf with bottles
  c.fillStyle = '#5b3a1e'; c.fillRect(70, 470, 940, 14);
  const bot = ['#16a34a', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'];
  for (let k = 0; k < 9; k++) {
    const x = 110 + k * 102, h = 50 + (k * 37 % 40);
    c.fillStyle = bot[k % 6] + 'cc'; rr(c, x, 470 - h, 40, h, 8); c.fill();
    c.fillStyle = '#e5e7eb'; c.fillRect(x + 12, 462 - h, 16, 10);
  }
  // bench
  const bg = c.createLinearGradient(0, 760, 0, 880); bg.addColorStop(0, '#8b5a2b'); bg.addColorStop(0.25, '#6b4220'); bg.addColorStop(1, '#3f2612');
  c.fillStyle = bg; c.fillRect(40, 760, 1000, 120);
  c.fillStyle = '#a0703c'; c.fillRect(40, 752, 1000, 14);
  // stack of petri dishes (tilts with the mess)
  const tilt = 0.32 * E.outBack(mess, 2.5);
  c.save(); c.translate(230, 752); c.rotate(-tilt * 0.6);
  for (let k = 0; k < 7; k++) {
    const off = Math.pow(k / 6, 2) * tilt * 120;
    c.fillStyle = 'rgba(220,240,255,0.55)'; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(off, -14 - k * 26, 70, 13, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(240,199,90,0.75)'; c.beginPath(); c.ellipse(off, -10 - k * 26, 60, 9, 0, 0, 7); c.fill();
  }
  c.restore();
  // flask that tips over
  const tip = E.outBack(prog(t, messT + 0.15, messT + 0.55), 1.5) * 1.25;
  c.save(); c.translate(470, 752); c.rotate(tip);
  c.fillStyle = 'rgba(200,235,255,0.35)'; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-15, -150); c.lineTo(15, -150); c.lineTo(15, -100); c.lineTo(60, 0); c.lineTo(-60, 0); c.lineTo(-15, -100); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(77,220,120,0.8)'; c.beginPath(); c.moveTo(-38, -50); c.lineTo(38, -50); c.lineTo(60, 0); c.lineTo(-60, 0); c.closePath(); c.fill();
  c.restore();
  if (tip > 0.5) { const p = prog(t, messT + 0.4, messT + 1.2); c.fillStyle = 'rgba(77,220,120,0.6)'; c.beginPath(); c.ellipse(600, 756, 30 + 110 * p, 8 + 4 * p, 0, 0, 7); c.fill(); }
  // microscope
  c.save(); c.translate(720, 752); c.fillStyle = '#1f2937';
  c.fillRect(-55, -16, 110, 16); c.fillRect(20, -150, 22, 140); c.save(); c.translate(10, -160); c.rotate(-0.35); c.fillRect(-14, -70, 28, 110); c.restore();
  c.fillRect(-30, -70, 70, 10); c.restore();
  // test tubes
  c.save(); c.translate(900, 752);
  c.fillStyle = '#6b4220'; c.fillRect(-80, -60, 160, 14); c.fillRect(-80, -12, 160, 12);
  for (let k = 0; k < 5; k++) { const x = -64 + k * 32; c.fillStyle = 'rgba(220,240,255,0.5)'; rr(c, x - 9, -110, 18, 104, 9); c.fill(); c.fillStyle = bot[(k + 2) % 6]; rr(c, x - 9, -50, 18, 44, 9); c.fill(); }
  c.restore();
  // papers flying in
  const R = rng(55);
  for (let k = 0; k < 6; k++) {
    const pt = messT + k * 0.08, pu = E.outCubic(prog(t, pt, pt + 0.5));
    if (pu <= 0) { R(); R(); R(); continue; }
    const tx = 120 + R() * 840, ty = 700 + R() * 60, rot = (R() - 0.5) * 1.2;
    c.save(); c.translate(lerp(tx + (k % 2 ? 400 : -400), tx, pu), lerp(ty - 500, ty, pu)); c.rotate(rot + (1 - pu) * 4);
    c.fillStyle = '#f8f5ec'; c.fillRect(-55, -38, 110, 76);
    c.strokeStyle = 'rgba(60,60,80,0.4)'; c.lineWidth = 2; for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(-42, -24 + l * 12); c.lineTo(36 - (l % 2) * 18, -24 + l * 12); c.stroke(); }
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ scene 2: the petri dish (no host)
function drawDish(c, t) {
  const a = CUES.dish, mo = CUES.mold, ar = CUES.around, dd = CUES.dead;
  const zu = E.inOutCubic(prog(t, ar - 0.1, ar + 0.8));
  const z = lerp(1, 1.5, zu);
  const mx = DISH.x + MOLD.x, my = DISH.y + MOLD.y;
  c.save();
  c.translate(lerp(mx, 540, zu), lerp(my, 640, zu)); c.scale(z, z); c.translate(-mx, -my);
  const du = E.outBack(prog(t, a, a + 0.6), 1.2);
  c.save(); c.translate(DISH.x, DISH.y); c.scale(du, du); c.rotate((1 - du) * 0.6);
  const r = DISH.r;
  // shadow + glass
  c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
  c.fillStyle = 'rgba(200,235,255,0.10)'; c.beginPath(); c.arc(0, 0, r + 18, 0, 7); c.fill(); c.restore();
  const ag = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  ag.addColorStop(0, 'rgba(250,226,160,0.95)'); ag.addColorStop(1, 'rgba(214,168,80,0.95)');
  c.fillStyle = ag; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  // kill zone
  const kz = 250 * E.outCubic(prog(t, ar + 0.35, dd));
  if (kz > 1) {
    const kg = c.createRadialGradient(MOLD.x, MOLD.y, 60, MOLD.x, MOLD.y, kz);
    kg.addColorStop(0, 'rgba(255,250,235,0.25)'); kg.addColorStop(1, 'rgba(255,250,235,0.05)');
    c.fillStyle = kg; c.beginPath(); c.arc(MOLD.x, MOLD.y, kz, 0, 7); c.fill();
  }
  // colonies
  for (const o of SPR.colonies) {
    const appear = a + 0.25 + o.d * 0.9;
    if (t < appear) continue;
    const pu = E.outBack(prog(t, appear, appear + 0.25), 2);
    const dist = Math.hypot(o.x - MOLD.x, o.y - MOLD.y);
    const deadT = dist < 250 ? lerp(ar + 0.35, dd, Math.pow(clamp((dist - 60) / 190), 1.4)) : 1e9;
    const k = prog(t, deadT, deadT + 0.25);
    const s = o.s * pu * (1 + 0.05 * Math.sin(t * 3 + o.d * 9)) * lerp(1, 0.55, k);
    if (k < 1) { c.globalAlpha = 1 - k; c.drawImage(SPR.colony, o.x - s, o.y - s, s * 2, s * 2); }
    if (k > 0) { c.globalAlpha = k; c.drawImage(SPR.dead, o.x - s, o.y - s, s * 2, s * 2); }
    if (k > 0 && k < 1) { c.globalAlpha = 1 - k; c.strokeStyle = '#ff5a4c'; c.lineWidth = 2; c.beginPath(); c.arc(o.x, o.y, s + 14 * k, 0, 7); c.stroke(); }
    c.globalAlpha = 1;
  }
  // mold colony growing
  const mg = E.outCubic(prog(t, mo - 0.1, mo + 1.1));
  if (mg > 0) {
    const ms = 105 * mg * (1 + 0.03 * Math.sin(t * 2.5));
    c.save(); c.translate(MOLD.x, MOLD.y); c.rotate(t * 0.15);
    c.drawImage(SPR.mold, -ms * 1.6, -ms * 1.6, ms * 3.2, ms * 3.2); c.restore();
  }
  if (kz > 1) {
    c.save(); c.setLineDash([16, 12]); c.lineDashOffset = -t * 40; c.strokeStyle = 'rgba(77,255,58,0.95)'; c.lineWidth = 5;
    c.shadowColor = 'rgba(77,255,58,0.8)'; c.shadowBlur = 16; c.beginPath(); c.arc(MOLD.x, MOLD.y, kz, 0, 7); c.stroke(); c.restore();
  }
  // glass rim + reflections
  c.lineWidth = 22; c.strokeStyle = 'rgba(225,245,255,0.35)'; c.beginPath(); c.arc(0, 0, r + 6, 0, 7); c.stroke();
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(0, 0, r + 17, 0, 7); c.stroke();
  c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r - 30, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  c.restore();
  c.restore();
  // labels (screen space)
  const ba = CUES.bacteria;
  if (t > ba - 0.05 && t < ar + 0.2) {
    const u = E.outBack(prog(t, ba - 0.05, ba + 0.3)), o = prog(t, ar - 0.1, ar + 0.2);
    c.save(); c.globalAlpha = 1 - o;
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(760, 1150); c.lineTo(820, 1440 - 40 * (1 - u)); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(760, 1150, 7, 0, 7); c.fill();
    c.save(); c.translate(820, 1480); c.scale(u, u); pill(c, 0, 0, 'BACTERIA', { bg: '#f0c75a', fg: '#3a2808', s: 30 }); c.restore();
    c.restore();
  }
  if (t > mo + 0.4 && t < ar + 0.2) {
    const u = E.outBack(prog(t, mo + 0.4, mo + 0.7)), o = prog(t, ar - 0.1, ar + 0.2);
    c.save(); c.globalAlpha = 1 - o;
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 60, my - 90); c.lineTo(250, 330 + 40 * (1 - u)); c.stroke();
    c.save(); c.translate(250, 290); c.scale(u, u); pill(c, 0, 0, 'MOLD', { bg: '#5fae8f', fg: '#062a1c', s: 34 }); c.restore();
    c.restore();
  }
  if (t > dd - 0.85) {
    const u = E.outBack(prog(t, dd - 0.85, dd - 0.5), 2);
    c.save(); c.translate(540, 250); c.scale(u, u);
    pill(c, 0, 0, 'BACTERIA-FREE ZONE', { bg: COL.green, fg: '#062a0a', s: 34, glow: 'rgba(77,255,58,0.7)', icon: iconCheck });
    c.restore();
  }
}

// ------------------------------------------------------------------ scene 3: penicillin
const MOL = (() => {
  const P = { A: [0, 0], B: [0, 60], C: [-60, 60], D: [-60, 0], E: [57, -19], F: [92, 30], G: [57, 79], O1: [-95, 100], N2: [-110, -28], C2: [-165, -2], O2: [-170, 56], C3: [-215, -32],
    M1: [150, 6], M2: [140, 68], C4: [80, 140], O3: [42, 176], O4: [135, 160] };
  const ring = []; for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3; ring.push([-275 + Math.cos(an) * 40, -12 + Math.sin(an) * 40]); }
  const bonds = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['A', 'E'], ['E', 'F'], ['F', 'G'], ['G', 'B'], ['C', 'O1'], ['D', 'N2'], ['N2', 'C2'], ['C2', 'O2'], ['C2', 'C3'], ['F', 'M1'], ['F', 'M2'], ['G', 'C4'], ['C4', 'O3'], ['C4', 'O4']]
    .map(([p, q]) => [P[p], P[q]]);
  bonds.push([P.C3, ring[2]]);
  for (let k = 0; k < 6; k++) bonds.push([ring[k], ring[(k + 1) % 6]]);
  const atoms = [['S', P.E, '#facc15'], ['N', P.B, '#60a5fa'], ['O', P.O1, '#f87171'], ['N', P.N2, '#60a5fa'], ['O', P.O2, '#f87171'], ['O', P.O3, '#f87171'], ['OH', P.O4, '#f87171']];
  return { bonds, atoms };
})();
function drawPen(c, t) {
  const a = CUES.pen, mk0 = CUES.making, pw = CUES.penWord;
  // mold dripping into a flask
  const mu = E.outBack(prog(t, a, a + 0.45), 1.5);
  c.save(); c.translate(270, 330); c.scale(mu, mu); c.rotate(t * 0.2); c.drawImage(SPR.mold, -110, -110, 220, 220); c.restore();
  for (let k = 0; k < 6; k++) {
    const dt0 = mk0 + 0.1 + k * 0.38; if (t < dt0 - 0.3) continue;
    const fu = prog(t, dt0 - 0.3, dt0);
    if (fu < 1) { const y = lerp(400, 600, fu * fu); c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(270, y, 9, 0, 7); c.moveTo(261, y); c.lineTo(270, y - 20); c.lineTo(279, y); c.fill(); }
  }
  const fl = E.outBack(prog(t, a + 0.1, a + 0.55), 1.5);
  c.save(); c.translate(270, 760); c.scale(fl, fl);
  const lvl = lerp(0.05, 0.6, prog(t, mk0, pw + 0.5));
  c.save(); c.beginPath(); c.moveTo(-28, -200); c.lineTo(28, -200); c.lineTo(28, -120); c.lineTo(110, 0); c.lineTo(-110, 0); c.lineTo(-28, -120); c.closePath();
  c.fillStyle = 'rgba(200,235,255,0.12)'; c.fill(); c.clip();
  const lg = c.createLinearGradient(0, -200, 0, 0); lg.addColorStop(0, '#ffe58a'); lg.addColorStop(1, '#f59e0b');
  c.fillStyle = lg; c.shadowColor = 'rgba(255,200,60,0.9)'; c.shadowBlur = 30; c.fillRect(-120, -200 * lvl - Math.sin(t * 5) * 3, 240, 220);
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 5; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-28, -200); c.lineTo(-28, -120); c.lineTo(-110, 0); c.lineTo(110, 0); c.lineTo(28, -120); c.lineTo(28, -200); c.stroke();
  c.restore();
  // molecule drawing itself
  const draw = prog(t, mk0 + 0.2, mk0 + 1.4);
  if (draw > 0) {
    c.save(); c.translate(780, 470); c.scale(1.05, 1.05);
    c.lineCap = 'round'; c.strokeStyle = '#ffe9a8'; c.lineWidth = 6; c.shadowColor = 'rgba(255,200,60,0.8)'; c.shadowBlur = 14;
    const nb = MOL.bonds.length, shown = draw * nb;
    for (let k = 0; k < nb; k++) {
      const f = clamp(shown - k); if (f <= 0) break;
      const [p, q] = MOL.bonds[k];
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(lerp(p[0], q[0], f), lerp(p[1], q[1], f)); c.stroke();
    }
    c.shadowColor = 'transparent';
    MOL.atoms.forEach(([lbl, p, col], k) => {
      const au = E.outBack(prog(draw, 0.3 + k * 0.08, 0.5 + k * 0.08), 2.5);
      if (au <= 0) return;
      c.save(); c.translate(p[0], p[1]); c.scale(au, au);
      c.fillStyle = '#2e2108'; c.beginPath(); c.arc(0, 0, lbl.length > 1 ? 24 : 19, 0, 7); c.fill();
      text(c, lbl, 0, 1, { w: 900, s: 26, fill: col });
      c.restore();
    });
    c.restore();
  }
  // the name
  if (t > pw - 0.1) {
    const word = 'PENICILLIN', n = Math.min(word.length, Math.floor(prog(t, pw - 0.1, pw + 0.45) * word.length + 1));
    const g = c.createLinearGradient(0, 180, 0, 260); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, '#ffb43b');
    const w = measure(c, word, { w: 900, s: 104, ls: 6 });
    text(c, word.slice(0, n), 540 - w / 2, 215, { w: 900, s: 104, ls: 6, align: 'left', fill: g, stroke: '#2e1a04', sw: 14, shadow: 'rgba(255,180,60,0.6)', blur: 30, sy: 0, keepShadow: true });
  } else {
    text(c, 'MOLD JUICE', 540, 215, { w: 900, s: 60, ls: 8, fill: '#ffe9a8', alpha: prog(t, mk0, mk0 + 0.3) * (1 - prog(t, pw - 0.3, pw - 0.1)) });
  }
}

// ------------------------------------------------------------------ scene 4: what it became (no host)
function drawImpact(c, t) {
  const a = CUES.impact, fi = CUES.first, sv = CUES.saved, mi = CUES.millions;
  // timeline 1928 -> 1940s -> 1945
  const pts = [[150, '1928', 'DISCOVERED'], [540, '1940s', 'MASS-PRODUCED'], [930, '1945', 'NOBEL PRIZE']];
  const lu = prog(t, a + 0.2, a + 1.1);
  c.save(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(150, 330); c.lineTo(lerp(150, 930, E.outCubic(lu)), 330); c.stroke(); c.restore();
  pts.forEach(([x, y, d], k) => {
    const pt = a + 0.35 + k * 0.32; if (t < pt) return;
    const u = E.outBack(prog(t, pt, pt + 0.3), 2.2);
    c.save(); c.translate(x, 330); c.scale(u, u);
    c.fillStyle = k === 0 ? COL.green : '#fff'; c.shadowColor = 'rgba(77,255,58,0.6)'; c.shadowBlur = k === 0 ? 20 : 0;
    c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill(); c.shadowColor = 'transparent';
    text(c, y, 0, -48, { fam: 'JBMono', w: 800, s: 40, fill: '#fff' });
    text(c, d, 0, 48, { w: 800, s: 22, fill: '#bff5c9', ls: 2 });
    c.restore();
  });
  // #1 medal
  if (t > fi - 0.1) {
    const u = E.outBack(prog(t, fi - 0.1, fi + 0.3), 1.8);
    c.save(); c.translate(540, 600); c.scale(u, u); c.rotate(Math.sin(t * 2) * 0.04);
    c.fillStyle = '#dc2626'; c.beginPath(); c.moveTo(-60, 40); c.lineTo(-100, 170); c.lineTo(-55, 145); c.lineTo(-30, 185); c.lineTo(0, 60); c.fill();
    c.fillStyle = '#2563eb'; c.beginPath(); c.moveTo(60, 40); c.lineTo(100, 170); c.lineTo(55, 145); c.lineTo(30, 185); c.lineTo(0, 60); c.fill();
    const mg = c.createRadialGradient(-30, -30, 10, 0, 0, 120); mg.addColorStop(0, '#fff3c4'); mg.addColorStop(0.6, '#f5b82e'); mg.addColorStop(1, '#a16207');
    c.fillStyle = mg; c.shadowColor = 'rgba(255,200,60,0.8)'; c.shadowBlur = 40; c.beginPath(); c.arc(0, 0, 115, 0, 7); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#fde68a'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 95, 0, 7); c.stroke();
    text(c, '#1', 0, 6, { w: 900, s: 96, fill: '#5a3a06' });
    c.restore();
    const pu = E.outBack(prog(t, fi + 0.25, fi + 0.55), 2);
    if (pu > 0) { c.save(); c.translate(540, 800); c.scale(pu, pu); pill(c, 0, 0, "WORLD'S FIRST ANTIBIOTIC", { bg: '#ffffff', fg: '#0a3324', s: 32 }); c.restore(); }
  }
  // people lighting up = lives saved
  const cols = 18, rows = 9, x0 = 90, y0 = 1180, cw = 50, ch = 56;
  const gu = prog(t, a + 0.4, a + 0.9);
  if (gu > 0) {
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const x = x0 + q * cw, y = y0 + r * ch;
      const d = Math.hypot(q - cols / 2, (r - rows / 2) * 1.4) / 10;
      const on = prog(t, sv + d * 0.9, sv + d * 0.9 + 0.2);
      c.globalAlpha = gu * (1 - on); c.drawImage(SPR.personOff, x, y, 40, 50);
      if (on > 0) { c.globalAlpha = gu * on; const s = 1 + 0.25 * Math.sin(Math.PI * on); c.drawImage(SPR.personOn, x + 20 - 20 * s, y + 25 - 25 * s, 40 * s, 50 * s); }
    }
    c.globalAlpha = 1;
  }
  // heartbeat line over the crowd
  if (t > sv - 0.2) {
    const head = lerp(-50, W + 300, prog(t, sv - 0.2, sv + 1.4));
    c.save(); c.strokeStyle = '#4dff3a'; c.lineWidth = 5; c.shadowColor = 'rgba(77,255,58,0.9)'; c.shadowBlur = 18; c.lineJoin = 'round';
    c.beginPath();
    for (let x = Math.max(0, head - 600); x <= Math.min(W, head); x += 6) {
      const ph = ((x + 40) % 360) / 360;
      let y = 1430;
      if (ph > 0.4 && ph < 0.46) y -= 120 * Math.sin((ph - 0.4) / 0.06 * Math.PI);
      else if (ph > 0.46 && ph < 0.5) y += 50 * Math.sin((ph - 0.46) / 0.04 * Math.PI);
      x === Math.max(0, head - 600) ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke(); c.restore();
  }
  if (t > mi - 0.05) {
    const u = E.outBack(prog(t, mi - 0.05, mi + 0.3), 1.8);
    c.save(); c.translate(540, 1100); c.scale(u, u);
    text(c, 'MILLIONS OF LIVES SAVED', 0, 0, { w: 900, s: 54, fill: COL.green, stroke: '#021a0c', sw: 12, shadow: 'rgba(77,255,58,0.5)', blur: 24, sy: 0, keepShadow: true });
    c.restore();
  }
}

// ------------------------------------------------------------------ scene 5: the punchline (host)
function drawEnd(c, t) {
  const a = CUES.end, fo = CUES.forgot, cl = CUES.clean;
  drawLab(c, t, a - 0.1, a - 2, 1);
  if (t > fo - 0.05) {
    const u = E.outBack(prog(t, fo - 0.05, fo + 0.3), 1.8);
    c.save(); c.translate(780, 330); c.scale(u, u); c.rotate(0.07 + Math.sin(t * 3) * 0.01);
    c.fillStyle = '#fde047'; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillRect(-160, -130, 340, 260); c.shadowColor = 'transparent';
    c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(-160, -130, 340, 40);
    text(c, 'TO DO:', -120, -60, { w: 900, s: 42, fill: '#3f2a00', align: 'left' });
    c.strokeStyle = '#3f2a00'; c.lineWidth = 5; c.strokeRect(-120, 10, 44, 44);
    text(c, 'CLEAN LAB', -62, 34, { w: 900, s: 33, fill: '#3f2a00', align: 'left' });
    const xu = prog(t, cl + 0.2, cl + 0.45);
    if (xu > 0) {
      c.strokeStyle = '#dc2626'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-126, 4); c.lineTo(lerp(-126, -70, clamp(xu * 2)), lerp(4, 60, clamp(xu * 2))); c.stroke();
      if (xu > 0.5) { c.beginPath(); c.moveTo(-70, 4); c.lineTo(lerp(-70, -126, (xu - 0.5) * 2), lerp(4, 60, (xu - 0.5) * 2)); c.stroke(); }
    }
    c.restore();
  }
}

// ------------------------------------------------------------------ frame
window.renderFrame = function (i) {
  const t = i / FPS;
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.globalCompositeOperation = 'source-over';
  drawBackground(c, t);
  const [sx, sy] = shake(t);
  const push = lerp(1, 1.06, E.inOutCubic(prog(t, CUES.clean, DUR)));
  c.save(); c.translate(sx, sy); c.translate(540, 900); c.scale(push, push); c.translate(-540, -900);
  drawScenes(c, t);
  filmLook(c, t);
  drawCharacter(c, t);
  c.restore();
  drawCaptions(c, t);
  const fl = flash(t);
  if (fl > 0.01) { c.fillStyle = `rgba(255,248,230,${Math.min(0.8, fl)})`; c.fillRect(0, 0, W, H); }
  drawGrainVignette(c, t);
  return t;
};
