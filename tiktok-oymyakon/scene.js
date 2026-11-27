/* Oymyakon TikTok short: deterministic canvas animation. renderFrame(i) draws frame i. */
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
function makeFrost() {
  const c = mk(W, H), g = c.getContext('2d'), R = rng(42);
  // edge haze
  for (const [x0, y0, x1, y1] of [[0, 0, 0, 260], [0, H, 0, H - 260], [0, 0, 220, 0], [W, 0, W - 220, 0]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(225,245,255,0.55)'); gr.addColorStop(1, 'rgba(225,245,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.lineCap = 'round';
  function branch(x, y, a, len, depth, w) {
    if (depth <= 0 || len < 3) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    for (let i = 1; i <= 2; i++) {
      const px = lerp(x, x2, i / 3), py = lerp(y, y2, i / 3), l2 = len * (0.3 + R() * 0.25);
      branch(px, py, a + Math.PI / 3, l2, depth - 1, w * 0.6);
      branch(px, py, a - Math.PI / 3, l2, depth - 1, w * 0.6);
    }
    branch(x2, y2, a + (R() - 0.5) * 0.6, len * 0.75, depth - 1, w * 0.8);
  }
  for (let i = 0; i < 230; i++) {
    const side = Math.floor(R() * 4), d = Math.pow(R(), 1.6) * 330;
    let x, y, a;
    if (side === 0) { x = d; y = R() * H; a = 0; }
    else if (side === 1) { x = W - d; y = R() * H; a = Math.PI; }
    else if (side === 2) { x = R() * W; y = d; a = Math.PI / 2; }
    else { x = R() * W; y = H - d; a = -Math.PI / 2; }
    g.strokeStyle = `rgba(230,248,255,${0.18 + R() * 0.25})`;
    branch(x, y, a + (R() - 0.5) * 1.6, 30 + R() * 70, 3, 1.4 + R() * 1.6);
  }
  const out = mk(W, H), og = out.getContext('2d');
  og.filter = 'blur(3px)'; og.drawImage(c, 0, 0); og.filter = 'none'; og.drawImage(c, 0, 0);
  return out;
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
function makeMars(r) {
  const c = mk(r * 2 + 4, r * 2 + 4), g = c.getContext('2d'), R = rng(11);
  const cx = r + 2, cy = r + 2;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
  const base = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  base.addColorStop(0, '#f6a06a'); base.addColorStop(0.55, '#d0582c'); base.addColorStop(1, '#6b200c');
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 0.35;
  for (let i = 0; i < 16; i++) { // dark plains
    g.fillStyle = '#7a2a12'; g.beginPath();
    g.ellipse(cx + (R() - 0.5) * r * 1.6, cy + (R() - 0.5) * r * 1.4, r * (0.12 + R() * 0.25), r * (0.06 + R() * 0.12), R() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 28; i++) { // craters
    const x = cx + (R() - 0.5) * r * 1.8, y = cy + (R() - 0.5) * r * 1.8, cr = r * (0.02 + R() * 0.07);
    g.fillStyle = 'rgba(90,25,8,0.45)'; g.beginPath(); g.arc(x, y, cr, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,190,140,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x - cr * 0.15, y - cr * 0.15, cr, Math.PI * 0.9, Math.PI * 1.7); g.stroke();
  }
  g.fillStyle = 'rgba(255,245,240,0.8)'; g.beginPath(); g.ellipse(cx + r * 0.05, cy - r * 0.8, r * 0.26, r * 0.09, 0, 0, 7); g.fill();
  const sh = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r * 1.02);
  sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(20,0,0,0.65)');
  g.fillStyle = sh; g.fillRect(0, 0, c.width, c.height);
  g.restore();
  return c;
}

// ------------------------------------------------------------------ init
window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  const world = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  WORLD.land = topojson.feature(world, world.objects.land);
  WORLD.borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
  WORLD.russia = topojson.feature(world, world.objects.countries).features.find(f => f.id === '643');
  WORLD.grat = d3.geoGraticule10();
  const arc = []; for (let lon = -180; lon <= 180; lon += 1) arc.push([lon, 66.56]);
  WORLD.arctic = { type: 'LineString', coordinates: arc };
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await document.fonts.load(font(800, 60, 'JBMono')); await document.fonts.load(font(500, 60, 'JBMono'));
  await prepCharacter();
  SPR.snow = makeSnowSprite(); SPR.frost = makeFrost(); SPR.grain = makeGrain(); SPR.dots = makeDots();
  SPR.mars = makeMars(130); SPR.aur = mk(270, 480); SPR.tmp = mk(W, H);
  SPR.L1 = mk(W, H); SPR.L2 = mk(W, H); SPR.car = mk(W, 700);
  const R = rng(7);
  SPR.flakes = Array.from({ length: 170 }, () => ({ x: R() * W, y: R() * H, z: 0.25 + R() * 0.75, sp: 50 + R() * 80, ph: R() * 6.28, sw: 8 + R() * 26 }));
  SPR.big = Array.from({ length: 12 }, () => ({ x: R() * W, y: R() * H, z: 1, sp: 260 + R() * 200, ph: R() * 6.28, sw: 30 + R() * 40, s: 14 + R() * 22 }));
  SPR.cracks = makeCracks();
  SCENES = [
    { id: 'earth', a: 0, b: CUES.record, draw: drawEarth },
    { id: 'record', a: CUES.record, b: CUES.mars, draw: drawRecord },
    { id: 'mars', a: CUES.mars, b: CUES.school, draw: drawMars },
    { id: 'school', a: CUES.school, b: CUES.car, draw: drawSchool },
    { id: 'car', a: CUES.car, b: CUES.outro, draw: drawCar },
    { id: 'outro', a: CUES.outro, b: DUR + 1, draw: drawOutro },
  ];
  CHAR_KEYS = [
    { t: 0, pose: 'serious', x: 540, y: 1150, s: 0.66 },
    { t: CUES.globe, pose: 'serious', x: 300, y: 1150, s: 0.66 },
    { t: CUES.record, pose: 'serious', x: 790, y: 1150, s: 0.66 },
    { t: CUES.mars, pose: 'thinking', x: 790, y: 1150, s: 0.66 },
    { t: CUES.school, pose: 'serious', x: 290, y: 1150, s: 0.66 },
    { t: CUES.car, pose: 'thinking', x: 790, y: 1150, s: 0.66 },
    { t: CUES.outro, pose: 'thumbsup', x: 540, y: 790, s: 0.8 },
  ];
  CHUNKS = buildChunks();
  return { frames: Math.round(DUR * FPS) };
};

function makeCracks() {
  const R = rng(99), out = [];
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * Math.PI * 2 + (R() - 0.5) * 0.5, x = 0, y = 0;
    const pts = [[0, 0]], n = 7 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      a += (R() - 0.5) * 0.7; const l = 28 + R() * 46;
      x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]);
      if (R() < 0.35) { const b = a + (R() < 0.5 ? 1 : -1) * (0.5 + R() * 0.6); out.push({ pts: [[x, y], [x + Math.cos(b) * 50, y + Math.sin(b) * 50], [x + Math.cos(b + 0.3) * 90, y + Math.sin(b + 0.3) * 90]], d: k / n }); }
    }
    out.push({ pts, d: 0 });
  }
  return out;
}

// ------------------------------------------------------------------ captions
function buildChunks() {
  const chunks = [];
  TL.lines.forEach((line, li) => {
    if (li === TL.lines.length - 1) return; // outro uses its own headline
    line.phrases.forEach(ph => {
      let cur = null;
      for (const w of ph.words) {
        const txt = w.text.replace(/[.,]+$/, '').toUpperCase();
        if (!cur || cur.words.length >= 3 || cur.len + txt.length > 16) { cur = { words: [], len: 0 }; chunks.push(cur); }
        cur.words.push({ ...w, txt }); cur.len += txt.length + 1;
      }
    });
  });
  chunks.forEach((c, i) => {
    c.start = c.words[0].start - 0.06;
    const nxt = chunks[i + 1];
    const endSelf = c.words[c.words.length - 1].end + 0.35;
    c.end = nxt && nxt.start - endSelf < 0.25 ? nxt.start : endSelf;
  });
  return chunks;
}
function drawCaptions(c, t) {
  const ch = CHUNKS.find(k => t >= k.start && t < k.end);
  if (!ch) return;
  const o = { w: 900, s: 74, ls: 1 };
  const sp = 22, widths = ch.words.map(w => measure(c, w.txt, o));
  const total = widths.reduce((a, b) => a + b, 0) + sp * (ch.words.length - 1);
  const scaleFit = Math.min(1, 900 / total);
  let x = 540 - (total * scaleFit) / 2;
  const y = 1068;
  const outU = prog(t, ch.end - 0.08, ch.end);
  c.save(); c.translate(540, y); c.scale(scaleFit, scaleFit); c.translate(-540, -y);
  x = 540 - total / 2;
  ch.words.forEach((w, i) => {
    const wx = x + widths[i] / 2; x += widths[i] + sp;
    if (t < w.start - 0.03) return;
    const u = prog(t, w.start - 0.03, w.start + 0.14);
    const active = t >= w.start - 0.03 && t < w.end + 0.02;
    const sc = lerp(0.55, 1, E.outBack(u)) * (active ? 1.08 : 1) * (1 - 0.15 * outU);
    const fill = active ? COL.green : w.key ? COL.ice : '#fff';
    c.save(); c.translate(wx, y - 8 * (1 - E.outCubic(u))); c.scale(sc, sc); c.globalAlpha = clamp(u * 3) * (1 - outU);
    text(c, w.txt, 0, 0, { ...o, fill, stroke: '#020812', sw: 14, shadow: 'rgba(0,0,0,0.7)', blur: 16, sy: 6, keepShadow: true });
    c.restore();
  });
  c.restore();
}

// ------------------------------------------------------------------ background, snow, frost, grain
const PAL = {
  earth: ['#030a17', '#0a2242', '#1f73b0'], record: ['#01060e', '#04253a', '#28b3dc'],
  mars: ['#0c0710', '#2b1220', '#d05a35'], school: ['#040c1a', '#0d2547', '#3a7bd5'],
  car: ['#030a14', '#0a1f37', '#2a8fb8'], outro: ['#02100b', '#0a2b2b', '#2fd36a'],
};
function sceneIndex(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].a) return i; return 0; }
function palette(t) {
  const i = sceneIndex(t), cur = PAL[SCENES[i].id];
  if (i === 0) return cur;
  const u = E.inOutCubic(prog(t, SCENES[i].a - 0.15, SCENES[i].a + 0.45)), prev = PAL[SCENES[i - 1].id];
  return cur.map((c, k) => mixHex(prev[k], c, u));
}
function drawBackground(c, t) {
  const [top, bot, glow] = palette(t);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(540, 640, 40, 540, 640, 820);
  rg.addColorStop(0, glow + '55'); rg.addColorStop(1, glow + '00');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  // aurora (drawn small, scaled up = soft)
  const a = SPR.aur, ag = a.getContext('2d');
  ag.clearRect(0, 0, a.width, a.height); ag.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const base = 70 + k * 34, amp = 18 + k * 6;
    const yA = x => base + Math.sin(x * 0.022 + t * 0.45 + k * 1.7) * amp + noise1(x * 0.03 + t * 0.3 + k * 9) * 12;
    const gr = ag.createLinearGradient(0, base - 70, 0, base + 60);
    const col = k === 1 ? '90,255,170' : '80,255,90';
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.55, `rgba(${col},0.32)`); gr.addColorStop(0.75, `rgba(120,230,255,0.22)`); gr.addColorStop(1, `rgba(${col},0)`);
    ag.fillStyle = gr; ag.beginPath(); ag.moveTo(0, yA(0) - 60);
    for (let x = 0; x <= 270; x += 6) ag.lineTo(x, yA(x) - 60 - 20 * Math.sin(x * 0.05 + t + k));
    for (let x = 270; x >= 0; x -= 6) ag.lineTo(x, yA(x) + 30);
    ag.closePath(); ag.fill();
  }
  c.save(); c.globalAlpha = 0.75; c.imageSmoothingQuality = 'high'; c.drawImage(a, 0, 0, W, H); c.restore();
  c.save(); c.fillStyle = c.createPattern(SPR.dots, 'repeat'); c.globalAlpha = 0.9; c.fillRect(0, 0, W, H); c.restore();
}
function wind(t) { return t * 35 + 260 * E.outCubic(prog(t, CUES.countEnd, CUES.mars)) + 180 * prog(t, CUES.mars, DUR); }
function drawSnow(c, t, list, fg) {
  const wx = wind(t);
  for (const f of list) {
    const y = ((f.y + t * f.sp * (fg ? 1 : f.z)) % (H + 80)) - 40;
    let x = (f.x + Math.sin(t * 0.9 + f.ph) * f.sw + wx * f.z * (fg ? 2 : 1)) % (W + 80);
    if (x < -40) x += W + 80;
    x -= 40;
    const s = fg ? f.s : 2.5 + f.z * 7;
    c.globalAlpha = fg ? 0.35 : 0.25 + 0.55 * f.z;
    c.drawImage(SPR.snow, x - s, y - s, s * 2, s * 2);
  }
  c.globalAlpha = 1;
}
function frostAmount(t) {
  let f = 0.12;
  f += 0.6 * E.outCubic(prog(t, CUES.countEnd, CUES.countEnd + 0.6)) * (1 - 0.55 * prog(t, CUES.mars - 0.1, CUES.mars + 0.6));
  f += 0.38 * E.outCubic(prog(t, CUES.stop + 0.2, CUES.noStart + 0.4)) * (1 - prog(t, CUES.outro - 0.1, CUES.outro + 0.5));
  return clamp(f, 0, 0.95);
}
function drawFrost(c, amt) {
  if (amt < 0.01) return;
  const T = SPR.tmp, g = T.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.drawImage(SPR.frost, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const r0 = lerp(620, 150, amt), r1 = r0 + 380;
  g.save(); g.translate(W / 2, H * 0.46); g.scale(1, 1.75);
  const gr = g.createRadialGradient(0, 0, r0, 0, 0, r1);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${clamp(0.3 + amt)})`);
  g.fillStyle = gr; g.fillRect(-W, -H, W * 2, H * 2); g.restore();
  g.globalCompositeOperation = 'source-over';
  c.drawImage(T, 0, 0);
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
function shake(t) {
  let x = 0, y = 0;
  for (const [cue, amp] of [[CUES.title + 0.04, 16], [CUES.countEnd, 30], [CUES.marsHit + 0.05, 8], [CUES.closed, 22], [CUES.noStart, 10], [CUES.follow + 0.75, 7]]) {
    if (t >= cue && t < cue + 0.8) { const k = amp * Math.exp(-(t - cue) / 0.13); x += k * noise1(t * 40 + cue * 10); y += k * noise1(t * 43 + cue * 20 + 7); }
  }
  return [x, y];
}
function flash(t) {
  let a = 0;
  for (const [cue, amp] of [[CUES.title + 0.02, 0.45], [CUES.countEnd, 0.6], [CUES.closed, 0.25], [CUES.noStart, 0.18], [CUES.outro + 0.05, 0.25]]) {
    if (t >= cue) a += amp * Math.exp(-(t - cue) / 0.09);
  }
  return a;
}

// ------------------------------------------------------------------ character
function charState(t) {
  let k = 0; while (k + 1 < CHAR_KEYS.length && t >= CHAR_KEYS[k + 1].t - 0.12) k++;
  const cur = CHAR_KEYS[k], prev = CHAR_KEYS[Math.max(0, k - 1)];
  const u = k === 0 ? 1 : E.inOutCubic(prog(t, cur.t - 0.12, cur.t + 0.48));
  const st = { x: lerp(prev.x, cur.x, u), y: lerp(prev.y, cur.y, u), s: lerp(prev.s, cur.s, u), pose: cur.pose, hop: Math.sin(Math.PI * u) * (k ? 1 : 0) };
  st.poseT = t - (cur.t + 0.02);
  st.poseChanged = k > 0 && prev.pose !== cur.pose;
  if (t < cur.t + 0.02 && k > 0) { st.pose = prev.pose; st.poseChanged = false; }
  // entrance
  const ue = prog(t, 0.28, 0.9);
  st.y += (1 - E.outBack(ue, 1.4)) * 900;
  return st;
}
function voiceEnv(t) {
  const i = Math.floor(t * FPS); let s = 0, n = 0;
  for (let k = i - 2; k <= i; k++) if (k >= 0 && k < TL.voiceEnv.length) { s += TL.voiceEnv[k]; n++; }
  return n ? s / n : 0;
}
function drawCharacter(c, t) {
  const st = charState(t), P = POSES[st.pose];
  let { x, y, s } = st;
  y -= st.hop * 60 + voiceEnv(t) * 10 + Math.sin(t * 2.3) * 3;
  if (t > CUES.countEnd && t < CUES.mars + 0.2) x += Math.sin(t * 75) * 3.2 * (0.6 + 0.4 * Math.sin(t * 3));  // shiver
  let sx = 1, sy = 1 + Math.sin(t * 2.3) * 0.006;
  let white = 0;
  if (st.poseChanged && st.poseT >= 0 && st.poseT < 0.45) {
    const u = prog(st.poseT, 0, 0.45); const k = Math.sin(u * Math.PI * 2.2) * (1 - u) * 0.09;
    sx *= 1 + k; sy *= 1 - k; white = 0.55 * (1 - E.outCubic(prog(st.poseT, 0, 0.3)));
  }
  // spotlight behind the character
  const cy = y + 520 * s;
  const sg = c.createRadialGradient(x, cy, 30, x, cy, 520 * s);
  sg.addColorStop(0, 'rgba(77,255,58,0.22)'); sg.addColorStop(1, 'rgba(77,255,58,0)');
  c.fillStyle = sg; c.fillRect(x - 600, cy - 600, 1200, 1200);
  c.save();
  c.translate(x, y + 1536 * s); c.scale(sx, sy); c.translate(-x, -(y + 1536 * s));
  const dx = x + (P.x0 - PAD - 512) * s, dy = y + (P.y0 - PAD) * s;
  c.drawImage(P.spr, dx, dy, P.spr.width * s, P.spr.height * s);
  if (white > 0) { c.globalAlpha = white; c.drawImage(P.white, dx, dy, P.white.width * s, P.white.height * s); }
  c.restore();
  // breath vapour when it is cold
  const breath = clamp((t - CUES.countEnd) / 0.3) * (t < CUES.outro ? 1 : 0);
  if (breath > 0) {
    const mx = x + (P.mouth[0] - 512) * s, my = y + P.mouth[1] * s;
    for (let k = 0; k < 4; k++) {
      const period = 1.25, ph = ((t - CUES.countEnd) / period + k * 0.25);
      const age = (ph % 1) * period;
      if (ph < 1 && k > 0) continue;
      const a = Math.sin(Math.PI * clamp(age / 0.9)) * 0.45 * breath;
      const r = 14 + age * 70;
      c.globalAlpha = a; c.drawImage(SPR.snow, mx - r + age * 40, my - r - age * 60, r * 2, r * 2);
    }
    c.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ scene: earth (hook + globe zoom)
function drawGlobe(c, cx, cy, r, lon, lat, t) {
  const P = d3.geoOrthographic().scale(r).translate([cx, cy]).rotate([-lon, -lat, 0]).clipAngle(90).precision(0.6);
  const path = d3.geoPath(P, c);
  c.save();
  const ag = c.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.22);
  ag.addColorStop(0, 'rgba(130,225,255,0.55)'); ag.addColorStop(0.35, 'rgba(80,180,255,0.16)'); ag.addColorStop(1, 'rgba(80,180,255,0)');
  c.fillStyle = ag; c.beginPath(); c.arc(cx, cy, r * 1.22, 0, 7); c.fill();
  const og = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  og.addColorStop(0, '#1d6aa6'); og.addColorStop(1, '#06182f');
  c.beginPath(); path({ type: 'Sphere' }); c.fillStyle = og; c.fill();
  c.save(); c.beginPath(); path({ type: 'Sphere' }); c.clip();
  c.beginPath(); path(WORLD.grat); c.strokeStyle = 'rgba(150,220,255,0.13)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); path(WORLD.land);
  const lg = c.createLinearGradient(cx, cy - r, cx, cy + r); lg.addColorStop(0, '#f2fbff'); lg.addColorStop(1, '#a9cde0');
  c.fillStyle = lg; c.fill();
  const hl = E.outCubic(prog(t, CUES.globe + 0.25, CUES.globe + 0.85));
  if (hl > 0) {
    c.beginPath(); path(WORLD.russia); c.fillStyle = `rgba(110,215,255,${0.55 * hl})`; c.fill();
    c.save(); c.clip(); c.globalAlpha = 0.5 * hl; c.fillStyle = c.createPattern(SPR.dots, 'repeat'); c.fillRect(0, 0, W, H);
    c.fillStyle = c.createPattern(SPR.dots, 'repeat'); c.fillRect(0, 0, W, H); c.restore();
  }
  c.beginPath(); path(WORLD.borders); c.strokeStyle = 'rgba(15,55,95,0.55)'; c.lineWidth = 1.3; c.stroke();
  if (hl > 0) { c.beginPath(); path(WORLD.russia); c.strokeStyle = `rgba(255,255,255,${0.85 * hl})`; c.lineWidth = 2.5; c.stroke(); }
  const sg = c.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r * 1.04);
  sg.addColorStop(0, 'rgba(255,255,255,0.16)'); sg.addColorStop(0.55, 'rgba(0,10,30,0)'); sg.addColorStop(1, 'rgba(0,8,25,0.6)');
  c.fillStyle = sg; c.fillRect(0, 0, W, H);
  c.restore();
  c.beginPath(); path({ type: 'Sphere' }); c.strokeStyle = 'rgba(170,235,255,0.65)'; c.lineWidth = 2.5; c.stroke();
  c.restore();
  return { P, path };
}
function drawEarth(c, t) {
  const g0 = CUES.globe, z1 = g0 + 1.0;
  const uh = E.outCubic(prog(t, 0, g0 + 0.3));
  const uz = E.inOutCubic(prog(t, g0, z1));
  const lon = lerp(lerp(-35, 126, uh), 142.79, uz);
  const lat = lerp(lerp(15, 50, uh), 63.46, uz);
  const r0 = 335 * (0.5 + 0.5 * E.outBack(prog(t, 0, 0.8), 1.2));
  const r = lerp(r0, 1750, uz);
  const cx = 540, cy = lerp(700, 610, uz);
  const { P, path } = drawGlobe(c, cx, cy, r, lon, lat, t);

  // map context once zoomed: Arctic Circle, Yakutsk, region labels
  const ctxA = prog(t, g0 + 0.6, g0 + 1.1);
  if (ctxA > 0) {
    c.save(); c.globalAlpha = ctxA;
    c.beginPath(); path(WORLD.arctic); c.setLineDash([14, 12]); c.lineDashOffset = -t * 30; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5; c.stroke(); c.setLineDash([]);
    const ac = P([154, 66.56]); text(c, 'ARCTIC CIRCLE', ac[0] + 10, ac[1] - 22, { fam: 'JBMono', w: 700, s: 24, fill: '#ffffff', align: 'left', ls: 2, shadow: 'rgba(0,0,0,0.6)', blur: 6, sy: 1 });
    const yk = P([129.73, 62.03]);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(yk[0], yk[1], 7, 0, 7); c.fill(); c.strokeStyle = '#0b2a45'; c.lineWidth = 3; c.stroke();
    text(c, 'Yakutsk', yk[0], yk[1] + 30, { w: 700, s: 26, fill: '#0b2a45' });
    const sib = P([129, 70.2]);
    text(c, 'S I B E R I A', sib[0], sib[1], { w: 900, s: 44, fill: 'rgba(8,40,70,0.42)', ls: 10 });
    c.restore();
  }
  drawTitle(c, t);
  // pin
  const pt = P([142.79, 63.46]);
  drawPin(c, pt[0], pt[1], t);
  drawPlaceCard(c, pt[0], pt[1], t);
  drawStats(c, t);
}
function shineFill(c, x0, x1, p, base1, base2) {
  const g = c.createLinearGradient(x0, -60, x1, 60);
  g.addColorStop(0, base1);
  if (p > 0.02 && p < 0.98) { g.addColorStop(clamp(p - 0.1), base1); g.addColorStop(p, '#ffffff'); g.addColorStop(clamp(p + 0.1), base2); }
  g.addColorStop(1, base2);
  return g;
}
function drawTitle(c, t) {
  const a = CUES.title, out = CUES.globe;
  if (t < a || t > out + 0.5) return;
  const u = prog(t, a, a + 0.32), o = prog(t, out - 0.15, out + 0.35);
  const s = lerp(1.9, 1, E.outExpo(u));
  c.save(); c.globalAlpha = clamp(u * 2.5) * (1 - o); c.translate(540, 255 - 140 * E.inCubic(o)); c.scale(s, s);
  if (u < 1) c.filter = `blur(${(1 - E.outExpo(u)) * 14}px)`;
  const p = prog(t, a + 0.55, a + 1.4);
  c.save();
  c.font = font(900, 118); c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '2px';
  c.lineJoin = 'round'; c.lineWidth = 16; c.strokeStyle = '#03101f'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
  c.strokeText('THE COLDEST', 0, -38); c.shadowColor = 'transparent';
  c.fillStyle = shineFill(c, -420, 420, p, '#e9fbff', '#7fdcff'); c.fillText('THE COLDEST', 0, -38);
  c.restore();
  text(c, 'TOWN ON EARTH', 0, 58, { w: 900, s: 60, ls: 12, fill: COL.green, stroke: '#03101f', sw: 12, shadow: 'rgba(0,0,0,0.6)', blur: 18 });
  // underline bars
  const lw = 380 * E.outExpo(prog(t, a + 0.25, a + 0.75));
  c.fillStyle = COL.ice; c.fillRect(-lw / 2, 104, lw, 5);
  c.restore();
}
function drawPin(c, x, y, t) {
  const t0 = CUES.pin, land = t0 + 0.32;
  if (t < t0) return;
  const u = prog(t, t0, land);
  const yoff = -340 * (1 - u * u);
  let sy = 1, sx = 1;
  if (t > land) { const k = Math.exp(-(t - land) / 0.09) * Math.cos((t - land) * 40); sy = 1 - 0.22 * k; sx = 1 + 0.18 * k; }
  // ripples
  for (let k = 0; k < 3; k++) {
    const rt = t - land - k * 0.32;
    if (rt > 0 && rt < 1.3) {
      const ru = rt / 1.3;
      c.save(); c.strokeStyle = `rgba(77,255,58,${0.9 * (1 - ru)})`; c.lineWidth = 6 * (1 - ru) + 1;
      c.beginPath(); c.ellipse(x, y, 20 + 150 * E.outCubic(ru), (20 + 150 * E.outCubic(ru)) * 0.55, 0, 0, 7); c.stroke(); c.restore();
    }
  }
  c.save(); c.fillStyle = `rgba(0,0,0,${0.35 * u})`; c.beginPath(); c.ellipse(x, y, 26 * u, 9 * u, 0, 0, 7); c.fill(); c.restore();
  c.save(); c.translate(x, y + yoff); c.scale(sx * 1.2, sy * 1.2);
  c.shadowColor = 'rgba(77,255,58,0.8)'; c.shadowBlur = 30;
  pinPath(c); const pg = c.createLinearGradient(-34, -104, 34, 0); pg.addColorStop(0, '#8dff7a'); pg.addColorStop(1, '#14b018');
  c.fillStyle = pg; c.fill(); c.shadowColor = 'transparent'; c.lineWidth = 5; c.strokeStyle = '#04210a'; c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -70, 13, 0, 7); c.fill(); c.lineWidth = 4; c.stroke();
  c.restore();
}
function drawPlaceCard(c, px, py, t) {
  const t0 = CUES.pin + 0.75;
  if (t < t0) return;
  const u = E.outExpo(prog(t, t0, t0 + 0.45));
  const cx = 540, top = 735, w = 640 * u, h = 190;
  // connector
  c.save(); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.setLineDash([6, 6]);
  c.beginPath(); c.moveTo(px, py + 12); c.lineTo(px, py + 12 + (top - py - 12) * u); c.stroke(); c.restore();
  if (w < 10) return;
  c.save();
  glass(c, cx - w / 2, top, w, h, 26, { stroke: 'rgba(143,233,255,0.75)', fill: 'rgba(6,24,46,0.86)' });
  c.beginPath(); c.rect(cx - w / 2, top, w, h); c.clip();
  const a = prog(t, t0 + 0.15, t0 + 0.4);
  text(c, 'SAKHA REPUBLIC  ·  RUSSIA', cx, top + 40, { w: 700, s: 24, fill: COL.ice, ls: 4, alpha: a });
  text(c, 'OYMYAKON', cx, top + 98, { w: 900, s: 78, ls: 6, fill: '#fff', alpha: a, shadow: 'rgba(77,255,58,0.5)', blur: 20, sy: 0 });
  const full = '63.46°N   142.79°E', n = Math.floor(full.length * prog(t, t0 + 0.35, t0 + 0.95));
  const cursor = (Math.floor(t * 4) % 2 === 0 && n < full.length) ? '▌' : '';
  text(c, full.slice(0, n) + cursor, cx, top + 154, { fam: 'JBMono', w: 600, s: 28, fill: '#cfeffc', ls: 2 });
  c.restore();
}
function statCard(c, x, y, t0, t, label, value, icon) {
  if (t < t0) return;
  const u = prog(t, t0, t0 + 0.4);
  c.save(); c.globalAlpha = clamp(u * 2); c.translate((1 - E.outBack(u)) * 260, 0);
  glass(c, x, y, 340, 118, 22);
  icon(c, x + 58, y + 59);
  text(c, label, x + 110, y + 38, { fam: 'JBMono', w: 700, s: 21, fill: COL.ice, align: 'left', ls: 2 });
  text(c, value, x + 108, y + 80, { w: 900, s: 48, fill: '#fff', align: 'left' });
  c.restore();
}
function iconPeople(c, x, y) {
  c.save(); c.fillStyle = COL.green;
  for (const [dx, s] of [[-12, 0.8], [12, 1]]) {
    c.beginPath(); c.arc(x + dx, y - 14 * s, 11 * s, 0, 7); c.fill();
    c.beginPath(); c.roundRect(x + dx - 17 * s, y + 2, 34 * s, 26 * s, [14 * s, 14 * s, 4, 4]); c.fill();
  }
  c.restore();
}
function iconMountain(c, x, y) {
  c.save(); c.fillStyle = COL.green; c.beginPath(); c.moveTo(x - 30, y + 22); c.lineTo(x - 6, y - 20); c.lineTo(x + 8, y + 2); c.lineTo(x + 16, y - 8); c.lineTo(x + 32, y + 22); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 6, y - 20); c.lineTo(x - 14, y - 6); c.lineTo(x + 1, y - 7); c.closePath(); c.fill(); c.restore();
}
function drawStats(c, t) {
  const t0 = CUES.pin + 1.05;
  statCard(c, 600, 1215, t0, t, 'POPULATION', '≈ 500', iconPeople);
  statCard(c, 600, 1350, t0 + 0.15, t, 'ELEVATION', '≈ 750 m', iconMountain);
}

// ------------------------------------------------------------------ scene: record
function drawRecord(c, t) {
  const a = CUES.record, c0 = CUES.countStart, c1 = CUES.countEnd;
  const v = -67.7 * E.outCubic(prog(t, c0, c1));
  const hit = t >= c1;
  // thermometer
  const ue = E.outBack(prog(t, a, a + 0.55));
  c.save(); c.translate(-320 * (1 - ue), 0);
  drawThermo(c, 205, v, t);
  c.restore();
  // chip
  if (t > a + 0.3) {
    const u = E.outBack(prog(t, a + 0.3, a + 0.65));
    c.save(); c.translate(660, 330); c.scale(u, u);
    pill(c, 0, 0, 'RECORD LOW', { bg: COL.red, s: 30, glow: 'rgba(255,59,78,0.6)', icon: iconDot });
    c.restore();
  }
  // readout
  const ru = E.outCubic(prog(t, a + 0.15, a + 0.6));
  const punch = hit ? 1 + 0.16 * Math.exp(-(t - c1) / 0.12) : 1;
  c.save(); c.translate(660, 545); c.scale(punch * ru, punch * ru); c.globalAlpha = ru;
  const str = fmtT(v), counting = t > c0 && !hit;
  const o = { fam: 'JBMono', w: 800, s: 158, ls: -4 };
  if (counting) {
    const j = Math.floor(t * FPS);
    text(c, str, 150 - 6 - hash(j) * 6, (hash(j + 3) - 0.5) * 6, { ...o, fill: 'rgba(255,40,80,0.5)', align: 'right' });
    text(c, str, 150 + 6 + hash(j + 1) * 6, 0, { ...o, fill: 'rgba(0,230,255,0.5)', align: 'right' });
  }
  const g = c.createLinearGradient(0, -80, 0, 80); g.addColorStop(0, '#ffffff'); g.addColorStop(1, hit ? '#8fe9ff' : '#d7f6ff');
  text(c, str, 150, 0, { ...o, fill: g, align: 'right', shadow: hit ? 'rgba(80,220,255,0.9)' : 'rgba(0,0,0,0.5)', blur: hit ? 40 : 16, sy: 0 });
  text(c, '°C', 160, -30, { w: 900, s: 76, fill: COL.ice, align: 'left' });
  c.restore();
  // cracks
  if (hit) {
    const u = E.outExpo(prog(t, c1, c1 + 0.3));
    c.save(); c.translate(600, 545); c.strokeStyle = 'rgba(230,250,255,0.9)'; c.shadowColor = 'rgba(120,230,255,0.9)'; c.shadowBlur = 10;
    c.globalAlpha = lerp(1, 0.55, prog(t, c1 + 0.4, c1 + 1.2));
    for (const cr of SPR.cracks) {
      const k = clamp((u - cr.d * 0.5) / (1 - cr.d * 0.5));
      if (k <= 0) continue;
      const n = Math.max(1, Math.floor((cr.pts.length - 1) * k));
      c.lineWidth = cr.d ? 1.6 : 3; c.beginPath(); c.moveTo(cr.pts[0][0], cr.pts[0][1]);
      for (let i = 1; i <= n; i++) c.lineTo(cr.pts[i][0], cr.pts[i][1]);
      c.stroke();
    }
    c.restore();
    // date + fahrenheit
    const d1 = prog(t, c1 + 0.2, c1 + 0.55), d2 = prog(t, c1 + 0.35, c1 + 0.7);
    c.save(); c.globalAlpha = d1; c.translate(0, 30 * (1 - E.outCubic(d1)));
    glass(c, 440, 690, 440, 76, 38, { stroke: 'rgba(143,233,255,0.6)' });
    iconCalendar(c, 490, 728);
    text(c, '6 FEB 1933', 690, 730, { fam: 'JBMono', w: 700, s: 34, fill: '#fff', ls: 2 });
    c.restore();
    c.save(); c.globalAlpha = d2; c.translate(0, 30 * (1 - E.outCubic(d2)));
    text(c, `= ${MINUS}89.9 °F`, 660, 832, { w: 800, s: 44, fill: '#b8dff0', ls: 2 });
    c.restore();
  }
}
function iconCalendar(c, x, y) {
  c.save(); c.fillStyle = COL.ice; rr(c, x - 20, y - 18, 40, 38, 6); c.fill();
  c.fillStyle = COL.red; rr(c, x - 20, y - 18, 40, 12, [6, 6, 0, 0]); c.fill();
  c.fillStyle = '#0a2440'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.fillRect(x - 13 + i * 10, y - 1 + j * 9, 6, 5);
  c.restore();
}
function drawThermo(c, x, v, t) {
  const top = 245, bulbY = 960, scale = vv => lerp(300, 880, (20 - vv) / 90);
  const col = mixHex('#ff5a3c', '#44d4ff', clamp(-v / 45));
  c.save();
  // glass
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.strokeStyle = 'rgba(220,245,255,0.75)'; c.lineWidth = 4;
  c.beginPath(); c.roundRect(x - 40, top, 80, bulbY - top, 40); c.fill(); c.stroke();
  c.beginPath(); c.arc(x, bulbY, 80, 0, 7); c.fill(); c.stroke();
  // mercury
  c.shadowColor = col; c.shadowBlur = 30;
  c.fillStyle = col; const ly = scale(v);
  c.beginPath(); c.roundRect(x - 18, ly, 36, bulbY - ly, 18); c.fill();
  c.beginPath(); c.arc(x, bulbY, 60, 0, 7); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.roundRect(x - 26, top + 30, 10, bulbY - top - 90, 5); c.fill();
  c.beginPath(); c.arc(x - 22, bulbY - 22, 16, 0, 7); c.fill();
  // ticks
  for (let tv = 20; tv >= -70; tv -= 5) {
    const ty = scale(tv), major = tv % 10 === 0;
    c.strokeStyle = 'rgba(220,245,255,0.8)'; c.lineWidth = major ? 3 : 2;
    c.beginPath(); c.moveTo(x + 50, ty); c.lineTo(x + (major ? 78 : 66), ty); c.stroke();
    if (major) text(c, (tv < 0 ? MINUS : '') + Math.abs(tv), x + 90, ty, { fam: 'JBMono', w: 600, s: 26, fill: '#cfeffc', align: 'left' });
  }
  // level marker
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 48, ly); c.lineTo(x - 68, ly - 12); c.lineTo(x - 68, ly + 12); c.closePath(); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ scene: mars
function drawMars(c, t) {
  const a = CUES.mars, hitT = CUES.marsHit;
  // heading
  const hu = E.outCubic(prog(t, a + 0.05, a + 0.45));
  c.save(); c.globalAlpha = hu;
  text(c, 'OYMYAKON', 300, 200 - 30 * (1 - hu), { w: 900, s: 46, fill: '#fff', ls: 4 });
  text(c, 'MARS', 780, 200 - 30 * (1 - hu), { w: 900, s: 46, fill: '#ffb08a', ls: 8 });
  c.restore();
  // badges
  const bl = E.outBack(prog(t, a + 0.05, a + 0.55)), br = E.outBack(prog(t, a + 0.15, a + 0.65));
  c.save(); c.translate(300 - 420 * (1 - bl), 410);
  const ig = c.createRadialGradient(-40, -50, 10, 0, 0, 130); ig.addColorStop(0, '#e9fbff'); ig.addColorStop(0.6, '#6fcff0'); ig.addColorStop(1, '#1b6c9c');
  const won = prog(t, hitT + 0.1, hitT + 0.4);
  c.shadowColor = won > 0 ? `rgba(143,233,255,${0.9 * won})` : 'rgba(0,0,0,0.4)'; c.shadowBlur = 40 + 30 * won;
  c.fillStyle = ig; c.beginPath(); c.arc(0, 0, 130, 0, 7); c.fill(); c.shadowColor = 'transparent';
  snowflake(c, 0, 0, 82, t * 0.4, '#ffffff', 9);
  if (won > 0) { c.strokeStyle = `rgba(77,255,58,${won})`; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 148 + 6 * Math.sin(t * 8), 0, 7); c.stroke(); }
  c.restore();
  c.save(); c.translate(780 + 420 * (1 - br), 410 + Math.sin(t * 1.6) * 6);
  c.shadowColor = 'rgba(255,110,50,0.7)'; c.shadowBlur = 50;
  c.drawImage(SPR.mars, -SPR.mars.width / 2, -SPR.mars.height / 2); c.restore();
  // VS
  const vu = E.outBack(prog(t, a + 0.4, a + 0.7), 2.5);
  c.save(); c.translate(540, 410); c.scale(vu, vu);
  c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; c.beginPath(); c.arc(0, 0, 52, 0, 7); c.fill();
  c.shadowColor = 'transparent'; text(c, 'VS', 0, 3, { w: 900, s: 44, fill: '#0b1a2e' });
  c.restore();
  if (won > 0) {
    c.save(); c.translate(300, 590); const s = E.outBack(won, 2.2); c.scale(s, s); c.rotate(-0.06);
    pill(c, 0, 0, 'COLDER', { bg: COL.green, fg: '#062a0a', s: 30, glow: 'rgba(77,255,58,0.7)', icon: iconCheck });
    c.restore();
  }
  // bars
  const rows = [
    { t: a + 0.75, label: 'YOUR FREEZER', v: -18, c1: '#6d8aa6', c2: '#9fb8cf' },
    { t: a + 1.55, label: 'MARS (AVERAGE)', v: -63, c1: '#b6421c', c2: '#ff8a4c' },
    { t: hitT, label: 'OYMYAKON (RECORD)', v: -67.7, c1: '#1c7fb5', c2: '#9ff0ff' },
  ];
  const x0 = 110, maxW = 860;
  rows.forEach((r, i) => {
    if (t < r.t) return;
    const y = 700 + i * 112, u = E.outCubic(prog(t, r.t, r.t + 0.55)), ap = prog(t, r.t, r.t + 0.15);
    c.save(); c.globalAlpha = ap;
    text(c, r.label, x0 + 4, y - 30, { w: 800, s: 26, fill: i === 2 ? COL.ice : '#e6eef5', align: 'left', ls: 2 });
    c.fillStyle = 'rgba(255,255,255,0.07)'; rr(c, x0, y - 8, maxW, 56, 14); c.fill();
    const w = Math.max(40, maxW * (-r.v / 70) * u);
    const g = c.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, r.c1); g.addColorStop(1, r.c2);
    if (i === 2) { c.shadowColor = 'rgba(143,233,255,0.8)'; c.shadowBlur = 26; }
    c.fillStyle = g; rr(c, x0, y - 8, w, 56, 14); c.fill(); c.shadowColor = 'transparent';
    text(c, fmtT(r.v * u, r.v % 1 ? 1 : 0) + '°C', x0 + w - 16, y + 21, { w: 900, s: 32, fill: '#07121f', align: 'right' });
    c.restore();
  });
}

// ------------------------------------------------------------------ scene: school
function schoolTemp(t) {
  const a = CUES.school, u0 = CUES.until, u1 = CUES.closed;
  if (t < u0) return lerp(-36, -44, E.inOutCubic(prog(t, a, u0)));
  return lerp(-44, -52, E.inOutCubic(prog(t, u0, u1)));
}
function drawSchool(c, t) {
  const a = CUES.school, cl = CUES.closed, closed = t >= cl;
  const bu = E.outBack(prog(t, a, a + 0.5), 1.3);
  c.save(); c.translate(540, 720); c.scale(bu, bu); c.translate(-540, -720);
  // ground snow
  const sg = c.createLinearGradient(0, 690, 0, 760); sg.addColorStop(0, '#f4fbff'); sg.addColorStop(1, '#9cc4dc');
  c.fillStyle = sg; c.beginPath(); c.ellipse(540, 722, 430, 40, 0, 0, 7); c.fill();
  // flag
  c.fillStyle = '#d9e4ee'; c.fillRect(846, 330, 8, 390);
  const fc = ['#ffffff', '#1c57a5', '#d52b1e'];
  for (let k = 0; k < 3; k++) {
    c.fillStyle = fc[k]; c.beginPath();
    for (let i = 0; i <= 20; i++) { const fx = 854 + i * 5, fy = 338 + k * 22 + Math.sin(i * 0.35 - t * 7) * 5 * (i / 20); i ? c.lineTo(fx, fy) : c.moveTo(fx, fy); }
    for (let i = 20; i >= 0; i--) { const fx = 854 + i * 5, fy = 360 + k * 22 + Math.sin(i * 0.35 - t * 7) * 5 * (i / 20); c.lineTo(fx, fy); }
    c.fill();
  }
  // building
  const bg = c.createLinearGradient(0, 470, 0, 705); bg.addColorStop(0, '#c65a40'); bg.addColorStop(1, '#8e3725');
  c.fillStyle = bg; c.fillRect(290, 470, 500, 235);
  c.strokeStyle = 'rgba(60,15,8,0.25)'; c.lineWidth = 2;
  for (let y = 490; y < 705; y += 22) { c.beginPath(); c.moveTo(290, y); c.lineTo(790, y); c.stroke(); }
  // pediment
  c.fillStyle = '#d97b5c'; c.beginPath(); c.moveTo(420, 470); c.lineTo(540, 380); c.lineTo(660, 470); c.closePath(); c.fill();
  c.fillStyle = '#f4fbff'; c.beginPath(); c.moveTo(405, 474); c.lineTo(540, 368); c.lineTo(675, 474); c.lineTo(655, 474); c.lineTo(540, 386); c.lineTo(425, 474); c.closePath(); c.fill();
  // clock
  c.fillStyle = '#fff'; c.beginPath(); c.arc(540, 438, 24, 0, 7); c.fill(); c.strokeStyle = '#3b1a10'; c.lineWidth = 4; c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(540, 438); c.lineTo(540, 422); c.moveTo(540, 438); c.lineTo(552, 444); c.stroke();
  // cornice with snow
  c.fillStyle = '#f4fbff'; rr(c, 278, 458, 524, 20, 10); c.fill();
  for (let x = 290; x < 790; x += 34) { c.beginPath(); c.arc(x + 17, 476, 9, 0, Math.PI); c.fill(); }
  // windows
  const lit = closed ? 0 : 1;
  for (const wy of [500, 595]) for (const wx of [318, 386, 454, 582, 650, 718]) {
    c.save(); c.fillStyle = lit ? '#ffd56b' : '#1a2636';
    if (lit) { c.shadowColor = 'rgba(255,200,90,0.9)'; c.shadowBlur = 22; }
    c.fillRect(wx, wy, 46, 58); c.restore();
    c.strokeStyle = '#f4fbff'; c.lineWidth = 4; c.strokeRect(wx, wy, 46, 58);
    c.beginPath(); c.moveTo(wx + 23, wy); c.lineTo(wx + 23, wy + 58); c.moveTo(wx, wy + 29); c.lineTo(wx + 46, wy + 29); c.lineWidth = 3; c.stroke();
    c.fillStyle = '#f4fbff'; c.fillRect(wx - 4, wy + 56, 54, 7);
  }
  // door + sign
  c.fillStyle = '#4a2418'; c.beginPath(); c.roundRect(508, 600, 64, 105, [32, 32, 0, 0]); c.fill();
  c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(560, 655, 4, 0, 7); c.fill();
  c.fillStyle = '#0d2547'; rr(c, 492, 566, 96, 26, 6); c.fill();
  text(c, 'SCHOOL', 540, 580, { w: 900, s: 18, fill: '#fff', ls: 2 });
  c.fillStyle = '#e8eef5'; c.fillRect(490, 703, 100, 10);
  // kids walking to the door
  if (!closed || t < cl + 0.5) drawKids(c, t, closed ? 1 - prog(t, cl, cl + 0.4) : 1);
  c.restore();
  // OPEN sign
  const ou = E.outBack(prog(t, a + 0.3, a + 0.6), 2);
  if (t > a + 0.3) {
    c.save(); c.translate(540, 292); c.scale(ou * (closed ? 1 - prog(t, cl - 0.05, cl + 0.1) : 1), ou);
    pill(c, 0, 0, 'SCHOOL IS OPEN', { bg: COL.green, fg: '#06290a', s: 34, glow: 'rgba(77,255,58,0.6)', icon: iconCheck });
    c.restore();
  }
  drawSlider(c, t);
  // CLOSED stamp
  if (closed) {
    const u = prog(t, cl, cl + 0.16), s = lerp(2.6, 1, E.inCubic(u));
    c.save(); c.translate(540, 560); c.rotate(-0.16); c.scale(s, s); c.globalAlpha = clamp(u * 1.5);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30;
    c.fillStyle = 'rgba(255,59,78,0.92)'; rr(c, -260, -82, 520, 164, 22); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#fff'; c.lineWidth = 6; rr(c, -244, -66, 488, 132, 14); c.stroke();
    text(c, 'CLOSED', 0, 6, { w: 900, s: 104, fill: '#fff', ls: 8 });
    c.restore();
  }
}
function drawKids(c, t, alpha) {
  const a = CUES.school, cols = ['#ff4d6d', '#ffd166', '#3ec1ff'];
  c.save(); c.globalAlpha = alpha;
  for (let k = 0; k < 3; k++) {
    const u = prog(t, a + 0.2 + k * 0.15, CUES.closed + 0.2);
    const x = lerp(150 - k * 70, 470 - k * 52, u), base = 712, step = Math.sin(t * 14 + k * 2);
    const s = 1 - k * 0.06;
    c.save(); c.translate(x, base - Math.abs(step) * 3); c.scale(s, s);
    c.strokeStyle = '#1b2433'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, -20); c.lineTo(-6 + step * 8, 0); c.moveTo(6, -20); c.lineTo(6 - step * 8, 0); c.stroke();
    c.fillStyle = cols[k]; rr(c, -18, -62, 36, 46, 12); c.fill();
    c.fillStyle = '#2a3b55'; rr(c, -24, -58, 12, 30, 5); c.fill();
    c.fillStyle = '#ffd9b8'; c.beginPath(); c.arc(0, -76, 14, 0, 7); c.fill();
    c.fillStyle = cols[(k + 1) % 3]; c.beginPath(); c.arc(0, -80, 15, Math.PI, 0); c.fill(); c.beginPath(); c.arc(0, -97, 5, 0, 7); c.fill();
    c.restore();
  }
  c.restore();
}
function drawSlider(c, t) {
  const a = CUES.school, x0 = 140, x1 = 940, y = 880, map = v => lerp(x0, x1, (-30 - v) / 30);
  const u = E.outCubic(prog(t, a + 0.2, a + 0.6));
  if (u <= 0) return;
  c.save(); c.globalAlpha = u; c.translate(0, 40 * (1 - u));
  const v = schoolTemp(t), thr = map(-52), over = v <= -52;
  const tg = c.createLinearGradient(x0, 0, thr, 0); tg.addColorStop(0, '#6fd3ff'); tg.addColorStop(1, '#1f7fd1');
  c.fillStyle = 'rgba(255,255,255,0.10)'; rr(c, x0, y - 12, x1 - x0, 24, 12); c.fill();
  c.fillStyle = tg; rr(c, x0, y - 12, map(v) - x0, 24, 12); c.fill();
  // danger zone
  c.save(); rr(c, thr, y - 12, x1 - thr, 24, 12); c.clip();
  c.fillStyle = 'rgba(255,59,78,0.35)'; c.fillRect(thr, y - 12, x1 - thr, 24);
  c.strokeStyle = 'rgba(255,59,78,0.9)'; c.lineWidth = 6;
  for (let x = thr - 30; x < x1 + 30; x += 20) { c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x + 20, y - 14); c.stroke(); }
  c.restore();
  // threshold
  c.strokeStyle = COL.red; c.lineWidth = 4; c.beginPath(); c.moveTo(thr, y - 34); c.lineTo(thr, y + 34); c.stroke();
  text(c, `CLOSES AT ${MINUS}52°C`, thr, y + 62, { w: 900, s: 24, fill: COL.red, ls: 1 });
  for (const tv of [-30, -40]) text(c, `${MINUS}${-tv}°`, map(tv), y + 50, { fam: 'JBMono', w: 600, s: 24, fill: '#cfeffc' });
  // knob + bubble
  const kx = map(v);
  c.fillStyle = '#fff'; c.shadowColor = over ? 'rgba(255,59,78,0.9)' : 'rgba(143,233,255,0.9)'; c.shadowBlur = 24;
  c.beginPath(); c.arc(kx, y, 24, 0, 7); c.fill(); c.shadowColor = 'transparent';
  c.strokeStyle = over ? COL.red : '#1f7fd1'; c.lineWidth = 6; c.stroke();
  const bw = 170;
  c.fillStyle = over ? COL.red : '#0e3a66'; rr(c, kx - bw / 2, y - 100, bw, 58, 16); c.fill();
  c.beginPath(); c.moveTo(kx - 12, y - 43); c.lineTo(kx + 12, y - 43); c.lineTo(kx, y - 30); c.closePath(); c.fill();
  text(c, fmtT(v, 0) + '°C', kx, y - 70, { fam: 'JBMono', w: 800, s: 34, fill: '#fff' });
  c.restore();
}

// ------------------------------------------------------------------ scene: car
function drawCar(c, t) {
  const a = CUES.car, st = CUES.stop, ns = CUES.noStart;
  const running = t < st;
  const freeze = E.outCubic(prog(t, st + 0.2, ns + 0.6));
  const cu = E.outCubic(prog(t, a, a + 0.5));
  // exhaust behind car
  const pipe = [540 - 330 + 18, 690 - 30];
  for (let i = 0; ; i++) {
    const ts = a + 0.25 + i * 0.2;
    if (ts > st || ts > t) break;
    const age = t - ts; if (age > 1.8) continue;
    const u = age / 1.8, r = 16 + 62 * E.outCubic(u);
    const px = pipe[0] - 150 * age - 30 * hash(i) * age - 260 * (1 - cu), py = pipe[1] - 50 * age * age - 20 * age;
    c.globalAlpha = 0.5 * (1 - u) * Math.min(1, age * 8);
    c.drawImage(SPR.snow, px - r, py - r, r * 2, r * 2);
  }
  c.globalAlpha = 1;
  // car into its own layer (so it can be iced over)
  const L = SPR.car, g = L.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, L.width, L.height);
  const vib = running ? Math.sin(t * 62) * 1.8 + noise1(t * 30) * 1.2 : 0;
  g.translate(540 - 260 * (1 - cu), 520 + vib);
  drawCarShape(g, running ? 1 : Math.max(0, 1 - prog(t, st, st + 0.4)));
  // ice
  if (freeze > 0) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(165,228,255,${0.72 * freeze})`; g.fillRect(-600, -600, 1200, 1200);
    g.globalAlpha = freeze; g.drawImage(SPR.frost, -540, -700); g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // snow on roof + icicles
    g.fillStyle = '#f4fbff'; g.beginPath(); g.roundRect(-160, -262 - 24 * freeze, 290, 26 * freeze + 6, 14); g.fill();
    g.beginPath(); g.roundRect(-330, -155 - 12 * freeze, 120, 12 * freeze + 4, 8); g.fill();
    g.beginPath(); g.roundRect(200, -155 - 12 * freeze, 130, 12 * freeze + 4, 8); g.fill();
    const R = rng(5);
    for (let x = -300; x <= 300; x += 22) {
      if (Math.abs(x + 190) < 70 || Math.abs(x - 190) < 70) continue;
      const len = freeze * (10 + R() * 34);
      g.fillStyle = 'rgba(220,248,255,0.95)'; g.beginPath(); g.moveTo(x - 7, -42); g.lineTo(x + 7, -42); g.lineTo(x, -42 + len); g.closePath(); g.fill();
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(L, 0, 170);
  drawCarHud(c, t, running, freeze);
  // WON'T START
  if (t > ns) {
    const u = E.outBack(prog(t, ns, ns + 0.3), 2.2);
    c.save(); c.translate(540, 905); c.scale(u, u); c.rotate(-0.04 + 0.03 * Math.sin((t - ns) * 30) * Math.exp(-(t - ns) / 0.2));
    pill(c, 0, 0, "WON'T START", { bg: COL.red, s: 50, h: 104, padX: 40, glow: 'rgba(255,59,78,0.7)', icon: iconCross });
    c.restore();
  }
}
function drawCarShape(g, lights) {
  // body
  const body = g.createLinearGradient(0, -260, 0, -30); body.addColorStop(0, '#ff6a55'); body.addColorStop(0.5, '#e0392b'); body.addColorStop(1, '#9e2017');
  g.fillStyle = body;
  g.beginPath(); g.moveTo(-200, -150); g.lineTo(-140, -255); g.quadraticCurveTo(-130, -262, -115, -262); g.lineTo(110, -262); g.quadraticCurveTo(128, -262, 138, -252); g.lineTo(210, -152); g.closePath(); g.fill();
  g.beginPath(); g.roundRect(-330, -158, 660, 122, [40, 50, 26, 26]); g.fill();
  // windows
  const gl = g.createLinearGradient(0, -250, 0, -160); gl.addColorStop(0, '#bfeaff'); gl.addColorStop(1, '#4b8fb8');
  g.fillStyle = gl;
  g.beginPath(); g.moveTo(-180, -160); g.lineTo(-130, -244); g.lineTo(-20, -244); g.lineTo(-20, -160); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(0, -160); g.lineTo(0, -244); g.lineTo(108, -244); g.lineTo(178, -160); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(-150, -170); g.lineTo(-115, -236); g.lineTo(-95, -236); g.lineTo(-130, -170); g.closePath(); g.fill();
  // details
  g.strokeStyle = 'rgba(80,10,5,0.55)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-10, -158); g.lineTo(-10, -50); g.moveTo(190, -150); g.lineTo(190, -60); g.stroke();
  g.fillStyle = '#5a120c'; g.fillRect(-70, -128, 34, 8); g.fillRect(120, -128, 34, 8);
  g.fillStyle = '#2b2f36'; g.beginPath(); g.roundRect(-340, -70, 680, 30, 14); g.fill();
  // lights
  g.save(); g.fillStyle = '#fff3b0'; if (lights > 0) { g.shadowColor = `rgba(255,230,120,${lights})`; g.shadowBlur = 40; }
  g.globalAlpha = 0.35 + 0.65 * lights; g.beginPath(); g.ellipse(316, -118, 16, 20, 0, 0, 7); g.fill(); g.restore();
  if (lights > 0) {
    const cone = g.createLinearGradient(320, 0, 620, 0); cone.addColorStop(0, `rgba(255,235,150,${0.35 * lights})`); cone.addColorStop(1, 'rgba(255,235,150,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(325, -130); g.lineTo(640, -200); g.lineTo(640, -20); g.lineTo(325, -105); g.closePath(); g.fill();
  }
  g.save(); g.fillStyle = '#ff2a2a'; if (lights > 0) { g.shadowColor = 'rgba(255,40,40,0.9)'; g.shadowBlur = 24; }
  g.globalAlpha = 0.4 + 0.6 * lights; g.beginPath(); g.roundRect(-336, -136, 16, 36, 6); g.fill(); g.restore();
  g.fillStyle = '#5b6370'; g.fillRect(-350, -48, 34, 12);
  // wheels
  for (const wx of [-190, 190]) {
    g.fillStyle = '#0b0e13'; g.beginPath(); g.arc(wx, -40, 72, Math.PI, 0); g.fill();
    g.fillStyle = '#151a21'; g.beginPath(); g.arc(wx, -36, 60, 0, 7); g.fill();
    g.fillStyle = '#b9c6d2'; g.beginPath(); g.arc(wx, -36, 30, 0, 7); g.fill();
    g.fillStyle = '#6d7b88'; for (let k = 0; k < 5; k++) { const an = k * 1.2566; g.beginPath(); g.arc(wx + Math.cos(an) * 17, -36 + Math.sin(an) * 17, 5, 0, 7); g.fill(); }
  }
}
function drawCarHud(c, t, running, freeze) {
  const a = CUES.car, st = CUES.stop;
  const u = E.outBack(prog(t, a + 0.15, a + 0.55));
  if (u <= 0) return;
  // clock
  c.save(); c.translate(250, 300); c.scale(u, u);
  glass(c, -110, -110, 220, 220, 110, { stroke: running ? 'rgba(77,255,58,0.8)' : 'rgba(255,59,78,0.8)', lw: 4 });
  for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; c.strokeStyle = '#cfeffc'; c.lineWidth = k % 3 ? 3 : 5; c.beginPath(); c.moveTo(Math.cos(an) * 78, Math.sin(an) * 78); c.lineTo(Math.cos(an) * 92, Math.sin(an) * 92); c.stroke(); }
  const spin = Math.min(t, st) - a;
  const mA = spin * 9 - Math.PI / 2, hA = spin * 0.75 - Math.PI / 2;
  c.lineCap = 'round'; c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hA) * 46, Math.sin(hA) * 46); c.stroke();
  c.strokeStyle = running ? COL.green : COL.red; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(mA) * 72, Math.sin(mA) * 72); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill();
  c.restore();
  // status + battery
  c.save(); c.translate(0, 0); c.globalAlpha = clamp(u);
  const blink = Math.floor(t * 3) % 2 === 0;
  text(c, running ? 'ENGINE ON' : 'ENGINE OFF', 410, 245, { w: 900, s: 50, fill: '#fff', align: 'left' });
  pill(c, 410 + 95, 318, running ? '24 / 7' : 'STOPPED', { bg: running ? COL.green : COL.red, fg: running ? '#06290a' : '#fff', s: 30, icon: iconDot });
  // battery
  const lvl = running ? 1 : lerp(1, 0.06, E.outCubic(prog(t, st + 0.1, CUES.noStart + 0.3)));
  const bx = 770, by = 300;
  c.strokeStyle = '#fff'; c.lineWidth = 5; rr(c, bx, by - 34, 150, 68, 12); c.stroke();
  c.fillStyle = '#fff'; c.fillRect(bx + 152, by - 14, 12, 28);
  const bc = lvl > 0.5 ? COL.green : lvl > 0.2 ? COL.gold : COL.red;
  if (!(lvl < 0.15 && blink)) { c.fillStyle = bc; rr(c, bx + 8, by - 26, 134 * lvl, 52, 7); c.fill(); }
  text(c, Math.round(lvl * 100) + '%', bx + 75, by + 66, { fam: 'JBMono', w: 800, s: 30, fill: bc });
  c.restore();
}

// ------------------------------------------------------------------ scene: outro
function drawOutro(c, t) {
  const a = CUES.outro, f = CUES.follow;
  const words = TL.lines[TL.lines.length - 1].phrases[0].words;
  // headline, word by word
  const lines = [[0, 1], [2, 3]];
  lines.forEach((idx, li) => {
    const o = li === 0 ? { w: 900, s: 84, ls: 4 } : { w: 900, s: 112, ls: 2 };
    const strs = idx.map(i => words[i].text.toUpperCase());
    const ws = strs.map(s => measure(c, s, o)), sp = 26, tot = ws.reduce((p, q) => p + q) + sp;
    let x = 540 - tot / 2; const y = li === 0 ? 225 : 335;
    idx.forEach((wi, k) => {
      const w = words[wi], cx = x + ws[k] / 2; x += ws[k] + sp;
      const st = Math.min(w.start - 0.05, a + 0.25 + wi * 0.12);
      if (t < st) return;
      const u = prog(t, st, st + 0.22);
      c.save(); c.translate(cx, y); const s = lerp(1.6, 1, E.outBack(u)); c.scale(s, s); c.globalAlpha = clamp(u * 2);
      const active = t >= w.start && t < w.end + 0.05;
      const fill = li === 1 ? (active ? COL.green : COL.ice) : (active ? COL.green : '#fff');
      text(c, strs[k], 0, 0, { ...o, fill, stroke: '#020812', sw: 16, shadow: 'rgba(0,0,0,0.6)', blur: 20, keepShadow: true });
      c.restore();
    });
  });
  // poll buttons
  const out = E.inCubic(prog(t, f - 0.1, f + 0.2));
  [[365, 'YES', COL.green, iconCheck, a + 0.9], [715, 'NO WAY', COL.red, iconCross, a + 1.05]].forEach(([x, label, col, icon, t0]) => {
    if (t < t0) return;
    const u = E.outBack(prog(t, t0, t0 + 0.3), 2);
    c.save(); c.translate(x, 500 + 260 * out); c.scale(u, u); c.globalAlpha = 1 - out;
    c.fillStyle = 'rgba(6,20,36,0.8)'; c.strokeStyle = col; c.lineWidth = 5;
    c.shadowColor = col; c.shadowBlur = 18; rr(c, -150, -50, 300, 100, 50); c.fill(); c.stroke(); c.shadowColor = 'transparent';
    icon(c, -88, 0, 20, col);
    text(c, label, 22, 2, { w: 900, s: 40, fill: '#fff', ls: 2 });
    c.restore();
  });
  // follow button
  if (t > f) {
    const u = E.outBack(prog(t, f, f + 0.35), 2), tap = f + 0.75;
    const press = t > tap ? 1 - 0.08 * Math.exp(-(t - tap) / 0.08) * Math.sin(Math.min(1, (t - tap) / 0.16) * Math.PI) : 1;
    const done = t > tap + 0.05;
    c.save(); c.translate(540, 520); c.scale(u * press, u * press);
    c.shadowColor = 'rgba(77,255,58,0.8)'; c.shadowBlur = 40 + 12 * Math.sin(t * 6);
    c.fillStyle = done ? '#ffffff' : COL.green; rr(c, -300, -66, 600, 132, 66); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = done ? COL.green : '#062a0a'; c.beginPath(); c.arc(-226, 0, 40, 0, 7); c.fill();
    if (done) iconCheck(c, -226, 0, 22, '#fff');
    else { c.strokeStyle = COL.green; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(-246, 0); c.lineTo(-206, 0); c.moveTo(-226, -20); c.lineTo(-226, 20); c.stroke(); }
    text(c, done ? 'FOLLOWING' : 'FOLLOW FOR MORE', 36, 3, { w: 900, s: done ? 52 : 44, fill: done ? '#0a3a12' : '#062a0a', ls: 2 });
    c.restore();
    // tap ripple + finger
    if (t > tap - 0.5) {
      const fu = E.outCubic(prog(t, tap - 0.5, tap));
      const fx = lerp(150, 318, fu), fy = lerp(800, 532, fu);
      if (t > tap) {
        const ru = prog(t, tap, tap + 0.6);
        c.strokeStyle = `rgba(255,255,255,${1 - ru})`; c.lineWidth = 6; c.beginPath(); c.arc(fx, fy, 20 + 120 * E.outCubic(ru), 0, 7); c.stroke();
      }
      c.save(); c.globalAlpha = 1 - prog(t, tap + 0.5, tap + 0.9);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16;
      c.beginPath(); c.arc(fx, fy, t > tap && t < tap + 0.15 ? 22 : 28, 0, 7); c.fill();
      c.restore();
      // snowflake burst
      if (t > tap) {
        const R = rng(21), bu = prog(t, tap, tap + 1.2);
        for (let k = 0; k < 18; k++) {
          const an = R() * Math.PI * 2, d = (120 + R() * 380) * E.outCubic(bu);
          c.globalAlpha = 1 - bu;
          snowflake(c, 314 + Math.cos(an) * (d + 40), 520 + Math.sin(an) * (d + 40) * 0.8, 8 + R() * 12, t * 2 + k, '#e9fbff', 3);
        }
        c.globalAlpha = 1;
      }
    }
  }
}

// ------------------------------------------------------------------ location chip
function drawLocationChip(c, t) {
  const a = CUES.pin + 1.4, b = CUES.mars - 0.25;
  if (t < a || t > b + 0.3) return;
  const u = E.outCubic(prog(t, a, a + 0.4)) * (1 - prog(t, b, b + 0.3));
  c.save(); c.globalAlpha = u; c.translate(-40 * (1 - u), 0);
  glass(c, 40, 170, 360, 64, 32, { fill: 'rgba(4,16,30,0.7)' });
  c.save(); c.translate(84, 218); c.scale(0.42, 0.42); pinPath(c); c.fillStyle = COL.green; c.fill(); c.fillStyle = '#04210a'; c.beginPath(); c.arc(0, -70, 13, 0, 7); c.fill(); c.restore();
  text(c, 'OYMYAKON, RUSSIA', 116, 203, { w: 800, s: 25, fill: '#fff', align: 'left', ls: 2 });
  c.restore();
}

// ------------------------------------------------------------------ frame
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

window.renderFrame = function (i) {
  const t = i / FPS;
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.globalCompositeOperation = 'source-over';
  drawBackground(c, t);
  drawSnow(c, t, SPR.flakes, false);
  const [sx, sy] = shake(t);
  c.save(); c.translate(sx, sy);
  drawScenes(c, t);
  drawCharacter(c, t);
  c.restore();
  drawSnow(c, t, SPR.big, true);
  drawFrost(c, frostAmount(t));
  drawLocationChip(c, t);
  if (t < CUES.outro - 0.05) drawCaptions(c, t);
  const fl = flash(t);
  if (fl > 0.01) { c.fillStyle = `rgba(225,248,255,${Math.min(0.85, fl)})`; c.fillRect(0, 0, W, H); }
  drawGrainVignette(c, t);
  return t;
};
