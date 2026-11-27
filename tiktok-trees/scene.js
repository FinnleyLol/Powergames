/* Trees-vs-stars TikTok short: deterministic canvas animation. renderFrame(i) draws frame i. */
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
function makeGalaxy(n) {
  const R = rng(77), warm = [], blue = [], pink = [];
  for (let i = 0; i < n; i++) {
    const arm = i % 2, r = Math.pow(R(), 0.65);
    const a = arm * Math.PI + r * 5.4 + (R() - 0.5) * (0.35 + 0.9 * (1 - r));
    const p = { r: r + (R() - 0.5) * 0.08, a, s: 0.8 + R() * 1.8 * (1 - r * 0.5), tw: R() * 6.28 };
    (r < 0.2 ? warm : R() < 0.07 ? pink : blue).push(p);
  }
  for (let i = 0; i < 500; i++) { // halo / disc dust
    const r = Math.pow(R(), 0.5) * 1.05;
    blue.push({ r, a: R() * 6.283, s: 0.6 + R() * 1.1, tw: R() * 6.28 });
  }
  return [[warm, '255,224,170'], [blue, '190,215,255'], [pink, '255,140,200']];
}
function drawGalaxy(c, cx, cy, R, tilt, rot, alpha, t) {
  if (alpha <= 0.01) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  const cg = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45);
  cg.addColorStop(0, `rgba(255,235,200,${0.9 * alpha})`); cg.addColorStop(0.25, `rgba(255,190,140,${0.35 * alpha})`); cg.addColorStop(1, 'rgba(120,100,255,0)');
  c.fillStyle = cg; c.save(); c.translate(cx, cy); c.scale(1, tilt); c.translate(-cx, -cy); c.beginPath(); c.arc(cx, cy, R * 0.45, 0, 7); c.fill(); c.restore();
  const hg = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
  hg.addColorStop(0, `rgba(110,90,255,${0.25 * alpha})`); hg.addColorStop(1, 'rgba(110,90,255,0)');
  c.fillStyle = hg; c.save(); c.translate(cx, cy); c.scale(1, tilt); c.translate(-cx, -cy); c.beginPath(); c.arc(cx, cy, R * 1.1, 0, 7); c.fill(); c.restore();
  for (const [pts, col] of SPR.galaxy) {
    for (const p of pts) {
      const a = p.a + rot * (1.3 - 0.5 * p.r);
      const x = cx + Math.cos(a) * p.r * R, y = cy + Math.sin(a) * p.r * R * tilt;
      const tw = 0.55 + 0.45 * Math.sin(t * 3 + p.tw);
      c.fillStyle = `rgba(${col},${(0.75 * tw * alpha).toFixed(3)})`;
      const s = p.s * (R / 430);
      c.fillRect(x - s / 2, y - s / 2, s + 0.6, s + 0.6);
    }
  }
  c.restore();
}
function makeStars() {
  const R = rng(5);
  return Array.from({ length: 240 }, () => ({ x: R() * W, y: R() * H, s: 0.7 + R() * 1.9, tw: R() * 6.28, f: 1 + R() * 3 }));
}
function makeBokeh() {
  const R = rng(8);
  return Array.from({ length: 34 }, () => ({ x: R() * W, y: R() * H, r: 5 + R() * 16, sp: 12 + R() * 30, ph: R() * 6.28, a: 0.12 + R() * 0.25 }));
}
function pine(c, x, base, h, col1, col2) {
  const w = h * 0.62;
  c.fillStyle = '#5a3a22'; c.fillRect(x - h * 0.05, base - h * 0.16, h * 0.1, h * 0.17);
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, col1); g.addColorStop(1, col2);
  c.fillStyle = g;
  for (let k = 0; k < 3; k++) {
    const top = base - h * (0.38 + k * 0.29) - h * 0.06, bot = base - h * (0.12 + k * 0.25), ww = w * (1 - k * 0.24);
    c.beginPath(); c.moveTo(x, top - h * 0.06); c.lineTo(x + ww / 2, bot); c.quadraticCurveTo(x, bot + h * 0.05, x - ww / 2, bot); c.closePath(); c.fill();
  }
}
function oak(c, x, base, h, col1, col2) {
  c.fillStyle = '#6b4428'; c.beginPath(); c.moveTo(x - h * 0.06, base); c.lineTo(x - h * 0.035, base - h * 0.5); c.lineTo(x + h * 0.035, base - h * 0.5); c.lineTo(x + h * 0.06, base); c.closePath(); c.fill();
  const g = c.createRadialGradient(x - h * 0.15, base - h * 0.8, h * 0.05, x, base - h * 0.62, h * 0.5);
  g.addColorStop(0, col1); g.addColorStop(1, col2); c.fillStyle = g;
  for (const [dx, dy, r] of [[0, -0.72, 0.3], [-0.2, -0.58, 0.22], [0.2, -0.58, 0.22], [-0.1, -0.88, 0.2], [0.12, -0.86, 0.2]]) {
    c.beginPath(); c.arc(x + dx * h, base + dy * h, r * h, 0, 7); c.fill();
  }
}
function makeTreeSprite() {
  const c = mk(32, 40), g = c.getContext('2d');
  pine(g, 16, 39, 38, '#7dff6a', '#1f9e3a');
  return c;
}
function makePlots() {
  const R = rng(9), pts = [];
  while (pts.length < 380) {
    const lon = R() * 360 - 180, lat = Math.asin(R() * 2 - 1) * 180 / Math.PI;
    if (lat < -45 || lat > 68) continue;
    if (d3.geoContains(WORLD.land, [lon, lat])) pts.push([lon, lat, R()]);
  }
  return pts;
}

// ------------------------------------------------------------------ init
window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  const world = await (await fetch('node_modules/world-atlas/countries-110m.json')).json();
  WORLD.land = topojson.feature(world, world.objects.land);
  WORLD.borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
  WORLD.grat = d3.geoGraticule10();
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await document.fonts.load(font(800, 60, 'JBMono')); await document.fonts.load(font(600, 60, 'JBMono'));
  await prepCharacter();
  SPR.dot = makeSnowSprite(); SPR.grain = makeGrain(); SPR.dots = makeDots();
  SPR.galaxy = makeGalaxy(2600); SPR.stars = makeStars(); SPR.bokeh = makeBokeh(); SPR.tree = makeTreeSprite();
  SPR.plots = makePlots();
  SPR.L1 = mk(W, H); SPR.L2 = mk(W, H); SPR.cam = mk(W, H);
  SCENES = [
    { id: 'hook', a: 0, b: CUES.galaxy, draw: drawHook },
    { id: 'galaxy', a: CUES.galaxy, b: CUES.earth, draw: drawGalaxyScene },
    { id: 'earth', a: CUES.earth, b: CUES.perPerson, draw: drawEarth },
    { id: 'person', a: CUES.perPerson, b: CUES.cut, draw: drawPerPerson },
    { id: 'cut', a: CUES.cut, b: CUES.outro, draw: drawCut },
    { id: 'outro', a: CUES.outro, b: DUR + 1, draw: drawOutro },
  ];
  CHAR_KEYS = [
    { t: 0, pose: 'serious', x: 540, y: 1110, s: 0.64 },
    { t: CUES.galaxy, pose: 'thinking', x: 790, y: 1110, s: 0.64 },
    { t: CUES.earth, pose: 'serious', x: 290, y: 1110, s: 0.64 },
    { t: CUES.perPerson, pose: 'thumbsup', x: 770, y: 1110, s: 0.64 },
    { t: CUES.cut, pose: 'thinking', x: 300, y: 1110, s: 0.64 },
    { t: CUES.outro, pose: 'serious', x: 540, y: 1020, s: 0.76 },
  ];
  CHUNKS = buildChunks();
  return { frames: Math.round(DUR * FPS) };
};

// ------------------------------------------------------------------ captions (centre of the screen, smaller)
const CAP_Y = 960, CAP_SIZE = 60;
function buildChunks() {
  const chunks = [];
  TL.lines.forEach(line => {
    line.phrases.forEach(ph => {
      let cur = null;
      for (const w of ph.words) {
        const txt = w.text.replace(/[.,]+$/, '').toUpperCase();
        if (!cur || cur.words.length >= 3 || cur.len + txt.length > 17) { cur = { words: [], len: 0 }; chunks.push(cur); }
        cur.words.push({ ...w, txt }); cur.len += txt.length + 1;
      }
    });
  });
  chunks.forEach((c, i) => {
    c.start = c.words[0].start - 0.06;
    const nxt = chunks[i + 1];
    const endSelf = c.words[c.words.length - 1].end + 0.35;
    c.end = nxt && nxt.start - endSelf < 0.25 ? nxt.start : Math.min(endSelf + (nxt ? 0 : 1.5), DUR);
  });
  return chunks;
}
function drawCaptions(c, t) {
  const ch = CHUNKS.find(k => t >= k.start && t < k.end);
  if (!ch) return;
  const o = { w: 900, s: CAP_SIZE, ls: 1 };
  const sp = 30, widths = ch.words.map(w => measure(c, w.txt, o));
  const total = widths.reduce((a, b) => a + b, 0) + sp * (ch.words.length - 1);
  const fit = Math.min(1, 900 / total), y = CAP_Y;
  const outU = prog(t, ch.end - 0.08, ch.end);
  c.save(); c.translate(540, y); c.scale(fit, fit); c.translate(-540, -y);
  let x = 540 - total / 2;
  ch.words.forEach((w, i) => {
    const wx = x + widths[i] / 2; x += widths[i] + sp;
    if (t < w.start - 0.03) return;
    const u = prog(t, w.start - 0.03, w.start + 0.14);
    const active = t >= w.start - 0.03 && t < w.end + 0.02;
    const sc = lerp(0.55, 1, E.outBack(u)) * (active ? 1.05 : 1) * (1 - 0.15 * outU);
    const fill = active ? COL.green : w.key ? COL.gold : '#fff';
    c.save(); c.translate(wx, y - 8 * (1 - E.outCubic(u))); c.scale(sc, sc); c.globalAlpha = clamp(u * 3) * (1 - outU);
    text(c, w.txt, 0, 0, { ...o, fill, stroke: '#020812', sw: 12, shadow: 'rgba(0,0,0,0.7)', blur: 14, sy: 5, keepShadow: true });
    c.restore();
  });
  c.restore();
}

// ------------------------------------------------------------------ background
const PAL = {
  hook: ['#050a1a', '#0b1f2e', '#3fae5a'], galaxy: ['#03040f', '#120b30', '#6d5cff'],
  earth: ['#020a14', '#06243a', '#2f9be0'], person: ['#03140c', '#0b3320', '#3fdc6a'],
  cut: ['#140605', '#2e0f0c', '#ff5a3c'], outro: ['#05080f', '#101826', '#4dff3a'],
};
const STAR_AMT = { hook: 0.7, galaxy: 1, earth: 0.9, person: 0.25, cut: 0.15, outro: 0.4 };
function starAmount(t) {
  const i = sceneIndex(t), cur = STAR_AMT[SCENES[i].id];
  if (i === 0) return cur;
  return lerp(STAR_AMT[SCENES[i - 1].id], cur, E.inOutCubic(prog(t, SCENES[i].a - 0.15, SCENES[i].a + 0.45)));
}
function drawBackground(c, t) {
  const [top, bot, glow] = palette(t);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(540, 560, 40, 540, 560, 860);
  rg.addColorStop(0, glow + '50'); rg.addColorStop(1, glow + '00');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  const sa = starAmount(t);
  for (const s of SPR.stars) {
    const a = sa * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.f + s.tw)));
    c.fillStyle = `rgba(230,240,255,${a.toFixed(3)})`; c.fillRect(s.x, s.y, s.s, s.s);
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const b of SPR.bokeh) {
    const y = ((b.y - t * b.sp) % (H + 60) + H + 60) % (H + 60) - 30, x = b.x + Math.sin(t * 0.7 + b.ph) * 20;
    c.globalAlpha = b.a * (1 - sa * 0.5); c.drawImage(SPR.dot, x - b.r, y - b.r, b.r * 2, b.r * 2);
  }
  c.restore();
  c.save(); c.fillStyle = c.createPattern(SPR.dots, 'repeat'); c.globalAlpha = 0.6; c.fillRect(0, 0, W, H); c.restore();
}
function shake(t) {
  let x = 0, y = 0;
  const ev = [[CUES.title + 0.04, 12], [CUES.n400, 6], [CUES.trillion + 0.85, 22], [CUES.n15, 12], [CUES.cool + 0.05, 26]];
  for (let k = 0; k < 4; k++) ev.push([CUES.we + 0.15 + k * 0.55, 9]);
  for (const [cue, amp] of ev) {
    if (t >= cue && t < cue + 0.8) { const k = amp * Math.exp(-(t - cue) / 0.13); x += k * noise1(t * 40 + cue * 10); y += k * noise1(t * 43 + cue * 20 + 7); }
  }
  return [x, y];
}
function flash(t) {
  let a = 0;
  for (const [cue, amp] of [[CUES.title + 0.02, 0.35], [CUES.trillion + 0.85, 0.5], [CUES.cool + 0.05, 0.3]]) if (t >= cue) a += amp * Math.exp(-(t - cue) / 0.09);
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
  st.y += (1 - E.outBack(prog(t, 0.25, 0.85), 1.4)) * 900;
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
  const deadpan = t > CUES.cool;
  y -= st.hop * 60 + (deadpan ? 0 : voiceEnv(t) * 10 + Math.sin(t * 2.3) * 3);
  let sx = 1, sy = 1 + (deadpan ? 0 : Math.sin(t * 2.3) * 0.006), white = 0;
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

// ------------------------------------------------------------------ scene 1: hook (trees > stars)
function headlineWord(c, str, x, y, t0, t, fromX, o) {
  if (t < t0) return;
  const u = prog(t, t0, t0 + 0.3);
  c.save(); c.translate(lerp(fromX, x, E.outExpo(u)), y); const s = lerp(1.5, 1, E.outBack(u)); c.scale(s, s); c.globalAlpha = clamp(u * 3);
  text(c, str, 0, 0, { w: 900, s: 112, ls: 4, stroke: '#030a12', sw: 16, shadow: 'rgba(0,0,0,0.6)', blur: 20, sy: 6, keepShadow: true, ...o });
  c.restore();
}
function panel(c, x, y, w, h, t0, t, fromX, glowCol, inner) {
  if (t < t0) return;
  const u = E.outCubic(prog(t, t0, t0 + 0.45));
  c.save(); c.translate(lerp(fromX, 0, u), 0); c.globalAlpha = clamp(u * 2);
  c.save(); c.shadowColor = glowCol; c.shadowBlur = 40; rr(c, x, y, w, h, 34); c.fillStyle = 'rgba(4,12,24,0.85)'; c.fill(); c.restore();
  c.save(); rr(c, x, y, w, h, 34); c.clip(); inner(c); c.restore();
  rr(c, x, y, w, h, 34); c.lineWidth = 3; c.strokeStyle = glowCol; c.stroke();
  c.restore();
}
const HOOK_TREES = (() => {
  const R = rng(31), out = [];
  for (let i = 0; i < 17; i++) { const d = R(); out.push({ x: 75 + R() * 390, d, h: 70 + d * 150, kind: R() < 0.7 ? 0 : 1, k: i }); }
  return out.sort((a, b) => a.d - b.d);
})();
function drawHook(c, t) {
  const tt = CUES.trees, ts = CUES.stars;
  headlineWord(c, 'TREES', 285, 250, tt, t, -300, { fill: COL.green });
  headlineWord(c, 'STARS', 800, 250, ts, t, 1380, { fill: COL.gold });
  if (t > CUES.title) {
    const flip = ts + 0.5, pre = t < flip + 0.12;
    const u = pre ? E.outBack(prog(t, CUES.title, CUES.title + 0.35), 2.5) : E.outElastic(prog(t, flip + 0.12, flip + 0.8));
    const fx = pre ? Math.cos(Math.PI / 2 * prog(t, flip, flip + 0.12)) : 1;
    c.save(); c.translate(542, 248); c.scale(u * fx, u);
    c.fillStyle = '#fff'; c.shadowColor = 'rgba(255,255,255,0.7)'; c.shadowBlur = 30; c.beginPath(); c.arc(0, 0, 56, 0, 7); c.fill();
    c.shadowColor = 'transparent'; text(c, pre ? '?' : '>', pre ? 0 : 3, pre ? 2 : -4, { w: 900, s: pre ? 80 : 92, fill: '#081220' });
    c.restore();
  }
  // forest panel
  panel(c, 50, 380, 470, 480, CUES.title, t, -560, 'rgba(77,255,58,0.85)', g => {
    const sky = g.createLinearGradient(0, 380, 0, 860); sky.addColorStop(0, '#0b2a3a'); sky.addColorStop(1, '#174a35');
    g.fillStyle = sky; g.fillRect(50, 380, 470, 480);
    g.fillStyle = '#123d24'; g.beginPath(); g.moveTo(50, 760); g.quadraticCurveTo(200, 690, 300, 730); g.quadraticCurveTo(420, 770, 520, 720); g.lineTo(520, 860); g.lineTo(50, 860); g.fill();
    for (const tr of HOOK_TREES) {
      const t0 = tt + 0.05 + tr.k * 0.05; if (t < t0) continue;
      const u = E.outBack(prog(t, t0, t0 + 0.35), 2.2), base = 760 + tr.d * 90;
      g.save(); g.translate(tr.x, base); g.scale(1, u); g.translate(-tr.x, -base);
      const c1 = mixHex('#2f8f4a', '#7dff6a', tr.d), c2 = mixHex('#0f4a25', '#1f9e3a', tr.d);
      tr.kind ? oak(g, tr.x, base, tr.h, c1, c2) : pine(g, tr.x, base, tr.h, c1, c2);
      g.restore();
    }
  });
  // galaxy panel
  panel(c, 560, 380, 470, 480, CUES.title + 0.1, t, 1100, 'rgba(255,209,102,0.85)', g => {
    g.fillStyle = '#05041a'; g.fillRect(560, 380, 470, 480);
    const a = prog(t, ts - 0.1, ts + 0.5);
    drawGalaxy(g, 795, 620, lerp(150, 210, E.outCubic(a)), 0.55, t * 0.35, 0.45 + 0.55 * a, t);
  });
  // labels under the panels
  const la = prog(t, ts + 0.7, ts + 1.0);
  if (la > 0) {
    c.save(); c.globalAlpha = la;
    text(c, '~3 TRILLION', 285, 815, { fam: 'JBMono', w: 800, s: 34, fill: '#fff', stroke: '#030a12', sw: 8 });
    text(c, '100–400 BILLION', 795, 815, { fam: 'JBMono', w: 800, s: 34, fill: '#fff', stroke: '#030a12', sw: 8 });
    c.restore();
  }
}

// ------------------------------------------------------------------ scene 2: the Milky Way
function drawGalaxyScene(c, t) {
  const a = CUES.galaxy, u = E.outCubic(prog(t, a, a + 1.4));
  const R = lerp(260, 440, u), rot = t * 0.3;
  drawGalaxy(c, 540, 500, R, 0.5, rot, clamp(prog(t, a - 0.1, a + 0.4)), t);
  // label
  const lu = E.outCubic(prog(t, a + 0.4, a + 0.8));
  if (lu > 0) {
    c.save(); c.globalAlpha = lu;
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(640, 430); c.lineTo(760, 300); c.lineTo(760 + 160 * lu, 300); c.stroke();
    text(c, 'MILKY WAY', 770, 278, { w: 900, s: 40, fill: '#fff', align: 'left', ls: 3 });
    text(c, 'OUR GALAXY', 770, 324, { fam: 'JBMono', w: 600, s: 24, fill: '#bdb6ff', align: 'left', ls: 2 });
    c.restore();
  }
  // "you are here"
  const yu = prog(t, a + 0.9, a + 1.2);
  if (yu > 0) {
    const ang = 2.2 + rot * (1.3 - 0.5 * 0.58), px = 540 + Math.cos(ang) * 0.58 * R, py = 500 + Math.sin(ang) * 0.58 * R * 0.5;
    c.save(); c.globalAlpha = yu;
    const pr = (t * 1.2) % 1;
    c.strokeStyle = `rgba(77,255,58,${1 - pr})`; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 10 + 30 * pr, 0, 7); c.stroke();
    c.fillStyle = COL.green; c.beginPath(); c.arc(px, py, 8, 0, 7); c.fill();
    text(c, 'YOU ARE HERE', px, py + 34, { fam: 'JBMono', w: 800, s: 22, fill: COL.green, stroke: '#03040f', sw: 6 });
    c.restore();
  }
  // numbers
  const n1 = CUES.n100, n4 = CUES.n400;
  const goldG = () => { const g = c.createLinearGradient(0, 740, 0, 840); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, '#ffb43b'); return g; };
  if (t > n1) {
    const k = E.outBack(prog(t, n1, n1 + 0.3), 2);
    c.save(); c.translate(n4 < t ? 388 : 540, 790); c.scale(k, k);
    text(c, '100', 0, 0, { w: 900, s: 96, fill: goldG(), stroke: '#120b30', sw: 12, shadow: 'rgba(255,180,60,0.5)', blur: 24, sy: 0, keepShadow: true });
    c.restore();
  }
  if (t > n4) {
    const k = E.outBack(prog(t, n4, n4 + 0.3), 2);
    c.save(); c.translate(522, 790); c.scale(k, k); text(c, '–', 0, -6, { w: 900, s: 80, fill: '#fff' }); c.restore();
    c.save(); c.translate(660, 790); c.scale(k, k);
    text(c, '400', 0, 0, { w: 900, s: 96, fill: goldG(), stroke: '#120b30', sw: 12, shadow: 'rgba(255,180,60,0.5)', blur: 24, sy: 0, keepShadow: true });
    c.restore();
    const b = prog(t, n4 + 0.15, n4 + 0.45);
    text(c, 'BILLION STARS', 540, 868, { w: 900, s: 40, fill: '#fff', ls: 8, alpha: b });
  }
}

// ------------------------------------------------------------------ scene 3: counting the trees
function satellite(c, x, y, s, ang) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = '#1d4f8f'; c.strokeStyle = '#9fd0ff'; c.lineWidth = 2;
  for (const dx of [-62, 30]) { c.fillRect(dx, -14, 32, 28); c.strokeRect(dx, -14, 32, 28); c.beginPath(); c.moveTo(dx + 16, -14); c.lineTo(dx + 16, 14); c.moveTo(dx, 0); c.lineTo(dx + 32, 0); c.stroke(); }
  c.fillStyle = '#d9dee6'; rr(c, -18, -16, 36, 32, 6); c.fill();
  c.fillStyle = '#ffd166'; c.fillRect(-18, -4, 36, 8);
  c.strokeStyle = '#d9dee6'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 16); c.lineTo(0, 28); c.stroke();
  c.fillStyle = '#ff4d4d'; c.beginPath(); c.arc(0, 30, 4, 0, 7); c.fill();
  c.restore();
}
function commas(n) { return Math.round(n).toLocaleString('en-US'); }
function drawEarth(c, t) {
  const a = CUES.earth, trl = CUES.trillion, hit = trl + 0.85;
  const cx = 540, cy = 480, gu = E.outBack(prog(t, a, a + 0.6), 1.3);
  const pulse = t > hit ? 1 + 0.06 * Math.exp(-(t - hit) / 0.15) : 1;
  const r = 270 * gu * pulse;
  const lon = -60 + (t - a) * 14, lat = 8;
  const P = d3.geoOrthographic().scale(r).translate([cx, cy]).rotate([-lon, -lat, 0]).clipAngle(90).precision(0.6);
  const path = d3.geoPath(P, c);
  // satellite orbit
  const sat = prog(t, CUES.satellite - 0.2, CUES.satellite + 0.4);
  const th = (t - a) * 1.5, ox = 390, oy = 120, rotO = -0.35;
  const sp = [Math.cos(th) * ox, Math.sin(th) * oy];
  const sx = cx + sp[0] * Math.cos(rotO) - sp[1] * Math.sin(rotO), sy = cy + sp[0] * Math.sin(rotO) + sp[1] * Math.cos(rotO);
  const front = Math.sin(th) > 0;
  const orbit = (from, to) => {
    c.save(); c.translate(cx, cy); c.rotate(rotO); c.strokeStyle = `rgba(160,220,255,${0.45 * sat})`; c.setLineDash([10, 10]); c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(0, 0, ox, oy, 0, from, to); c.stroke(); c.restore();
  };
  if (sat > 0) { orbit(Math.PI, 2 * Math.PI); if (!front) satellite(c, sx, sy, 0.9 * sat, rotO); }
  // globe
  c.save();
  const ag = c.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.2);
  ag.addColorStop(0, 'rgba(120,220,255,0.5)'); ag.addColorStop(1, 'rgba(120,220,255,0)');
  c.fillStyle = ag; c.beginPath(); c.arc(cx, cy, r * 1.2, 0, 7); c.fill();
  const og = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  og.addColorStop(0, '#1d6aa6'); og.addColorStop(1, '#061a33');
  c.beginPath(); path({ type: 'Sphere' }); c.fillStyle = og; c.fill();
  c.save(); c.beginPath(); path({ type: 'Sphere' }); c.clip();
  c.beginPath(); path(WORLD.grat); c.strokeStyle = 'rgba(150,220,255,0.12)'; c.lineWidth = 1; c.stroke();
  const lg = c.createLinearGradient(cx, cy - r, cx, cy + r); lg.addColorStop(0, '#5fe08a'); lg.addColorStop(1, '#1e7a3f');
  c.beginPath(); path(WORLD.land); c.fillStyle = lg; c.fill();
  c.beginPath(); path(WORLD.borders); c.strokeStyle = 'rgba(10,60,30,0.45)'; c.lineWidth = 1; c.stroke();
  // forest plots
  const shown = Math.floor(SPR.plots.length * prog(t, CUES.plots - 0.1, CUES.plotsEnd));
  const center = [lon, lat];
  for (let i = 0; i < shown; i++) {
    const p = SPR.plots[i];
    if (d3.geoDistance([p[0], p[1]], center) > Math.PI / 2 - 0.05) continue;
    const q = P([p[0], p[1]]);
    const age = t - (CUES.plots - 0.1 + (CUES.plotsEnd - CUES.plots + 0.1) * i / SPR.plots.length);
    const k = E.outBack(clamp(age / 0.25), 3);
    c.fillStyle = 'rgba(255,240,120,0.95)'; c.beginPath(); c.arc(q[0], q[1], 3.4 * k * gu, 0, 7); c.fill();
  }
  const sh = c.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r * 1.04);
  sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.55, 'rgba(0,10,30,0)'); sh.addColorStop(1, 'rgba(0,8,25,0.6)');
  c.fillStyle = sh; c.fillRect(0, 0, W, H);
  c.restore();
  c.beginPath(); path({ type: 'Sphere' }); c.strokeStyle = 'rgba(170,235,255,0.6)'; c.lineWidth = 2.5; c.stroke();
  c.restore();
  if (sat > 0) {
    orbit(0, Math.PI);
    if (front) {
      // scan beam
      c.save(); c.globalAlpha = 0.25 * sat;
      const bg = c.createLinearGradient(sx, sy, cx, cy); bg.addColorStop(0, 'rgba(140,240,255,0.9)'); bg.addColorStop(1, 'rgba(140,240,255,0)');
      c.fillStyle = bg; const nx = cx - sx, ny = cy - sy, L = Math.hypot(nx, ny), px = -ny / L, py = nx / L;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + nx * 0.7 + px * 90, sy + ny * 0.7 + py * 90); c.lineTo(sx + nx * 0.7 - px * 90, sy + ny * 0.7 - py * 90); c.closePath(); c.fill();
      c.restore();
      satellite(c, sx, sy, 1.05 * sat, rotO);
    }
  }
  // tree burst on the hit
  if (t > hit) {
    const bu = prog(t, hit, hit + 1.0), R = rng(17);
    for (let k = 0; k < 22; k++) {
      const an = (k / 22) * Math.PI * 2 + R() * 0.2, d = r + 40 + 110 * E.outCubic(bu) * (0.6 + R() * 0.6);
      c.globalAlpha = 1 - bu * bu; const s = 0.9 + R() * 0.6;
      c.drawImage(SPR.tree, cx + Math.cos(an) * d - 16 * s, cy + Math.sin(an) * d - 20 * s, 32 * s, 40 * s);
    }
    c.globalAlpha = 1;
  }
  // counters
  const p0 = CUES.plots, out1 = prog(t, trl - 0.45, trl - 0.2);
  if (t > p0 - 0.1 && out1 < 1) {
    const u = E.outBack(prog(t, p0 - 0.1, p0 + 0.25));
    const val = 400000 * E.outCubic(prog(t, p0, CUES.plotsEnd));
    c.save(); c.translate(540, 820 - 60 * E.inCubic(out1)); c.scale(u, u); c.globalAlpha = 1 - out1;
    glass(c, -300, -52, 600, 104, 52, { stroke: 'rgba(255,240,120,0.7)' });
    c.fillStyle = 'rgba(255,240,120,0.95)'; c.beginPath(); c.arc(-238, 0, 12, 0, 7); c.fill();
    text(c, commas(val) + (val > 399999 ? '+' : ''), -205, -8, { fam: 'JBMono', w: 800, s: 46, fill: '#fff', align: 'left' });
    text(c, 'FOREST PLOTS', 150, -8, { w: 900, s: 26, fill: '#ffef9a', ls: 2 });
    c.restore();
  }
  if (t > trl - 0.4) {
    const t0 = trl - 0.35, u = E.outCubic(prog(t, t0 - 0.05, t0 + 0.25));
    const v = 3.04e12 * (1 - Math.pow(1 - prog(t, t0, hit), 2));
    const punch = t > hit ? 1 + 0.12 * Math.exp(-(t - hit) / 0.12) : 1;
    c.save(); c.translate(540, 815); c.scale(u * punch, u * punch); c.globalAlpha = u;
    text(c, 'TREES ON EARTH', 0, -62, { w: 900, s: 30, fill: '#bff5c9', ls: 6 });
    const g = c.createLinearGradient(0, -40, 0, 40); g.addColorStop(0, '#eaffef'); g.addColorStop(1, COL.green);
    text(c, commas(v), 0, 6, { fam: 'JBMono', w: 800, s: 64, fill: g, stroke: '#021a0c', sw: 10, shadow: t > hit ? 'rgba(77,255,58,0.8)' : 'rgba(0,0,0,0.5)', blur: t > hit ? 34 : 12, sy: 0, keepShadow: true });
    c.restore();
  }
}

// ------------------------------------------------------------------ scene 4: 375 trees per human
function drawPerPerson(c, t) {
  const a = CUES.perPerson, g0 = a + 0.25;
  const cols = 25, rows = 15, x0 = 90, y0 = 200, cw = 36, ch = 35;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const t0 = g0 + (q + r) * 0.026;
    if (t < t0) continue;
    const u = E.outBack(prog(t, t0, t0 + 0.25), 2.4);
    const x = x0 + q * cw + cw / 2, y = y0 + r * ch + ch;
    const sway = Math.sin(t * 2 + q * 0.4 + r * 0.3) * 0.04;
    c.save(); c.translate(x, y); c.rotate(sway); c.scale(u, u); c.drawImage(SPR.tree, -14, -34, 28, 35); c.restore();
  }
  const n = CUES.n375;
  if (t > n - 0.1) {
    const u = E.outBack(prog(t, n - 0.1, n + 0.25), 1.8);
    const v = 375 * E.outCubic(prog(t, n - 0.05, n + 0.7));
    c.save(); c.translate(540, 800); c.scale(u, u);
    text(c, `${Math.round(v)} TREES`, 0, 0, { w: 900, s: 92, fill: COL.green, stroke: '#021a0c', sw: 14, shadow: 'rgba(77,255,58,0.55)', blur: 30, sy: 0, keepShadow: true });
    c.restore();
  }
  const hm = CUES.human;
  if (t > hm - 0.05) {
    const u = E.outBack(prog(t, hm - 0.05, hm + 0.25), 2);
    c.save(); c.translate(540, 872); c.scale(u, u);
    pill(c, 0, 0, 'PER HUMAN', { bg: '#ffffff', fg: '#0b3320', s: 30, icon: iconPerson });
    c.restore();
    // "your share" tag above the host
    const st = charState(t), tu = E.outBack(prog(t, hm + 0.25, hm + 0.55), 2);
    if (tu > 0) {
      c.save(); c.translate(st.x, 1062 + Math.sin(t * 5) * 4); c.scale(tu, tu);
      pill(c, 0, 0, 'YOUR SHARE', { bg: COL.green, fg: '#06290a', s: 24, glow: 'rgba(77,255,58,0.7)' });
      c.fillStyle = COL.green; c.beginPath(); c.moveTo(-12, 22); c.lineTo(12, 22); c.lineTo(0, 38); c.closePath(); c.fill();
      c.restore();
    }
  }
}
function iconPerson(c, x, y, r, col) {
  c.save(); c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.42, 0, 7); c.fill();
  c.beginPath(); c.roundRect(x - r * 0.7, y - r * 0.05, r * 1.4, r * 0.95, [r * 0.6, r * 0.6, 3, 3]); c.fill(); c.restore();
}

// ------------------------------------------------------------------ scene 5: the catch
function drawCut(c, t) {
  const a = CUES.cut, ct = CUES.catch, we = CUES.we;
  // warning sign during "the catch?"
  if (t > ct - 0.1 && t < we + 0.5) {
    const u = E.outBack(prog(t, ct - 0.1, ct + 0.2), 2.5), o = prog(t, we, we + 0.3);
    c.save(); c.translate(540, 480); c.scale(u * (1 - o), u * (1 - o)); c.rotate(Math.sin(t * 30) * 0.04);
    c.fillStyle = COL.red; c.shadowColor = 'rgba(255,59,78,0.8)'; c.shadowBlur = 40;
    c.beginPath(); c.moveTo(0, -150); c.lineTo(165, 130); c.lineTo(-165, 130); c.closePath(); c.lineJoin = 'round'; c.lineWidth = 30; c.strokeStyle = COL.red; c.stroke(); c.fill();
    c.shadowColor = 'transparent'; text(c, '!', 0, 30, { w: 900, s: 190, fill: '#fff' });
    c.restore();
  }
  // forest row that gets chopped
  if (t > we - 0.2) {
    const gu = E.outCubic(prog(t, we - 0.2, we + 0.2));
    c.save(); c.globalAlpha = gu;
    const gg = c.createLinearGradient(0, 570, 0, 620); gg.addColorStop(0, '#5a3a22'); gg.addColorStop(1, '#2a1a10');
    c.fillStyle = gg; rr(c, 60, 576, 960, 30, 15); c.fill();
    const xs = [200, 413, 627, 840];
    xs.forEach((x, k) => {
      const tc = we + 0.15 + k * 0.55, base = 580, h = 280;
      const fall = E.inCubic(prog(t, tc + 0.05, tc + 0.7));
      const bounce = t > tc + 0.7 ? Math.sin((t - tc - 0.7) * 25) * 0.05 * Math.exp(-(t - tc - 0.7) / 0.12) : 0;
      const ang = (fall + bounce) * (Math.PI / 2 - 0.08);
      const shakeX = t > tc && t < tc + 0.15 ? Math.sin(t * 120) * 4 : 0;
      c.save(); c.translate(x + shakeX, base); c.rotate(ang); c.globalAlpha = gu * (1 - 0.55 * prog(t, tc + 1.0, tc + 1.4));
      if (k % 2) oak(c, 0, 0, h, '#7dff6a', '#1f9e3a'); else pine(c, 0, 0, h, '#7dff6a', '#1f9e3a');
      c.restore();
      if (t > tc) { // stump + chips
        c.fillStyle = '#c89a6a'; rr(c, x - 16, base - 22, 32, 24, 4); c.fill();
        const cu = prog(t, tc, tc + 0.6), R = rng(40 + k);
        for (let i = 0; i < 9; i++) {
          const vx = (R() - 0.3) * 260, vy = -200 - R() * 220, tt = cu * 0.6;
          c.globalAlpha = gu * (1 - cu); c.fillStyle = '#e8c08c';
          c.fillRect(x + vx * tt, base - 16 + vy * tt + 900 * tt * tt, 7, 5);
        }
        c.globalAlpha = gu;
      }
    });
    c.restore();
  }
  // counter
  const n = CUES.n15;
  if (t > n - 0.1) {
    const u = E.outBack(prog(t, n - 0.1, n + 0.25), 1.6);
    const v = 15e9 * (1 - Math.pow(1 - prog(t, n - 0.05, n + 0.7), 2));
    c.save(); c.translate(540, 790); c.scale(u, u);
    text(c, 'TREES CUT EVERY YEAR', 0, -58, { w: 900, s: 28, fill: '#ffb3a8', ls: 4 });
    text(c, MINUS + commas(v), 0, 6, { fam: 'JBMono', w: 800, s: 62, fill: '#ff5a4c', stroke: '#1a0504', sw: 10, shadow: 'rgba(255,60,60,0.55)', blur: 26, sy: 0, keepShadow: true });
    c.restore();
    const pu = E.outBack(prog(t, n + 0.8, n + 1.1), 2);
    if (pu > 0) { c.save(); c.translate(540, 872); c.scale(pu, pu); pill(c, 0, 0, '≈ 480 EVERY SECOND', { bg: COL.red, s: 28, icon: iconDot }); c.restore(); }
  }
}

// ------------------------------------------------------------------ scene 6: dry ending
function drawOutro(c, t) {
  const f = CUES.follow;
  if (t > f - 0.05) {
    const u = E.outBack(prog(t, f - 0.05, f + 0.3), 2);
    c.save(); c.translate(540, 640); c.scale(u, u);
    c.shadowColor = 'rgba(77,255,58,0.6)'; c.shadowBlur = 36;
    c.fillStyle = COL.green; rr(c, -230, -64, 460, 128, 64); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#062a0a'; c.beginPath(); c.arc(-160, 0, 40, 0, 7); c.fill();
    c.strokeStyle = COL.green; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(-180, 0); c.lineTo(-140, 0); c.moveTo(-160, -20); c.lineTo(-160, 20); c.stroke();
    text(c, 'FOLLOW', 40, 3, { w: 900, s: 60, fill: '#062a0a', ls: 4 });
    c.restore();
  }
}
// deadpan zoom on the host's face when he says "cool"
function camera(t) {
  const u = E.outExpo(prog(t, CUES.cool + 0.05, CUES.cool + 0.2));
  if (u <= 0) return null;
  const fx = 540, fy = 1020 + 400 * 0.76;
  return { u, z: lerp(1, 1.75, u), fx, fy, tx: lerp(fx, 540, u), ty: lerp(fy, 700, u) };
}

// ------------------------------------------------------------------ frame
window.renderFrame = function (i) {
  const t = i / FPS;
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.globalCompositeOperation = 'source-over';
  drawBackground(c, t);
  const [sx, sy] = shake(t);
  const cam = camera(t);
  c.save(); c.translate(sx, sy);
  if (cam) { c.translate(cam.tx, cam.ty); c.scale(cam.z, cam.z); c.translate(-cam.fx, -cam.fy); }
  drawScenes(c, t);
  drawCharacter(c, t);
  c.restore();
  // glitch on "the catch?"
  if (t > CUES.catch && t < CUES.catch + 0.4) {
    const j = Math.floor(t * FPS);
    for (let k = 0; k < 7; k++) {
      const y = hash(j * 7 + k) * H, h = 20 + hash(j * 13 + k) * 90, dx = (hash(j * 3 + k) - 0.5) * 90;
      c.drawImage(cv, 0, y, W, h, dx, y, W, h);
    }
    c.fillStyle = `rgba(255,40,60,${0.18 * (1 - prog(t, CUES.catch, CUES.catch + 0.4))})`; c.fillRect(0, 0, W, H);
  }
  if (cam) { // deadpan vignette
    const vg = c.createRadialGradient(540, 760, 300, 540, 760, 1100);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.55 * cam.u})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }
  drawCaptions(c, t);
  const fl = flash(t);
  if (fl > 0.01) { c.fillStyle = `rgba(235,255,240,${Math.min(0.8, fl)})`; c.fillRect(0, 0, W, H); }
  drawGrainVignette(c, t);
  return t;
};
