/* Eiffel Tower con TikTok short: deterministic canvas animation. renderFrame(i) draws frame i. */
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


// ================================================================== Eiffel Tower con: sceneries + animated host
let WORDS;
const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
function glow(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
const bump = (t, a, d) => (t < a || t > a + d ? 0 : Math.sin(Math.PI * (t - a) / d));

// ------------------------------------------------------------------ host rig (head/body split)
const RIG = {
  serious: { pivot: [505, 445], mouth: [500, 336], badge: [598, 640], hand: [800, 520],
    head: [[0, 0], [1024, 0], [1024, 495], [670, 495], [670, 445], [345, 445], [345, 495], [0, 495]] },
  thinking: { pivot: [560, 440], mouth: [580, 318], badge: [600, 660], hand: [600, 470],
    head: [[0, 0], [1024, 0], [1024, 490], [660, 490], [660, 440], [380, 440], [380, 520], [0, 520]] },
  thumbsup: { pivot: [505, 445], mouth: [510, 326], badge: [598, 640], hand: [805, 520],
    head: [[0, 0], [1024, 0], [1024, 370], [755, 370], [755, 480], [670, 480], [670, 445], [345, 445], [345, 495], [0, 495]] },
};
function prepRig() {
  for (const [k, R] of Object.entries(RIG)) {
    const P = POSES[k], im = P.img;
    R.x0 = P.x0; R.y0 = P.y0;
    const full = mk(im.width + PAD * 2, im.height + PAD * 2), g = full.getContext('2d');
    g.shadowColor = 'rgba(77,255,58,0.45)'; g.shadowBlur = 16; g.drawImage(im, PAD, PAD);
    g.shadowColor = 'rgba(255,255,255,0.5)'; g.shadowBlur = 4; g.drawImage(im, PAD, PAD);
    g.shadowColor = 'transparent'; g.drawImage(im, PAD, PAD);
    const ox = P.x0 - PAD, oy = P.y0 - PAD;
    const poly = gg => { gg.beginPath(); R.head.forEach(([x, y], i) => (i ? gg.lineTo(x - ox, y - oy) : gg.moveTo(x - ox, y - oy))); gg.closePath(); };
    const head = mk(full.width, full.height), hg = head.getContext('2d');
    poly(hg); hg.clip(); hg.drawImage(full, 0, 0);
    const body = mk(full.width, full.height), bg = body.getContext('2d');
    bg.drawImage(full, 0, 0); bg.globalCompositeOperation = 'destination-out'; poly(bg); bg.fill();
    R.headImg = head; R.body = body;
  }
}
function walk(t, t0, t1, x0, x1, period) {
  const u = prog(t, t0, t1);
  const moving = t > t0 && t < t1;
  const ph = (t - t0) / period * Math.PI;
  return { x: lerp(x0, x1, u), bob: moving ? Math.abs(Math.sin(ph)) * 16 : 0, lean: moving ? Math.sin(ph) * 0.035 : 0 };
}
function dust(c, x, ground, t, steps) {
  for (const ts of steps) {
    const a = t - ts; if (a < 0 || a > 0.45) continue;
    const u = a / 0.45;
    for (const sgn of [-1, 1]) {
      c.globalAlpha = 0.35 * (1 - u); c.fillStyle = '#d8d0c0';
      c.beginPath(); c.arc(x + sgn * (30 + 50 * u), ground - 6 - 10 * u, 8 + 14 * u, 0, 7); c.fill();
    }
  }
  c.globalAlpha = 1;
}
function drawMustache(c, m, u) {
  if (u <= 0) return;
  c.save(); c.translate(m[0], m[1] - 4); c.scale(u * 1.15, u * 1.15); c.fillStyle = '#141414';
  for (const sg of [-1, 1]) {
    c.save(); c.scale(sg, 1); c.beginPath(); c.moveTo(0, -8);
    c.bezierCurveTo(25, -28, 62, -22, 80, -2); c.bezierCurveTo(94, 10, 108, -6, 103, -24);
    c.bezierCurveTo(118, -4, 104, 24, 78, 20); c.bezierCurveTo(50, 16, 20, 18, 0, 12); c.closePath(); c.fill(); c.restore();
  }
  c.restore();
}
function star(c, x, y, r, n = 5, inner = 0.45) {
  c.beginPath();
  for (let k = 0; k < n * 2; k++) { const a = -Math.PI / 2 + k * Math.PI / n, rr2 = k % 2 ? r * inner : r; k ? c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : c.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  c.closePath();
}
function drawBadge(c, p, u) {
  c.save(); c.translate(p[0], p[1]); c.scale(u, u);
  c.fillStyle = '#f5c542'; c.strokeStyle = '#8a6412'; c.lineWidth = 6; star(c, 0, 0, 46); c.fill(); c.stroke();
  c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(-10, -10, 8, 0, 7); c.fill();
  c.restore();
}
function holdSign(c, R, flip, u, label) {
  if (u <= 0) return;
  const [hx, hy] = R.hand;
  c.save(); c.translate(hx, hy); c.scale(u, u);
  c.strokeStyle = '#7a4a22'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 60); c.lineTo(60, -330); c.stroke();
  c.translate(110, -470); c.rotate(0.08);
  c.fillStyle = '#e9c98f'; c.strokeStyle = '#7a4a22'; c.lineWidth = 14; rr(c, -230, -120, 460, 240, 18); c.fill(); c.stroke();
  c.scale(flip, 1);
  text(c, label, 0, 4, { w: 900, s: 84, fill: '#b91c1c', ls: 2 });
  c.restore();
}
function drawEmote(c, type, x, y, u, t) {
  if (u <= 0) return;
  c.save(); c.translate(x, y); const s = E.outBack(clamp(u * 3), 2.4); c.scale(s, s);
  if (type === '!' || type === '?') {
    c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 5;
    c.beginPath(); c.ellipse(0, 0, 46, 54, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-10, 46); c.lineTo(-26, 76); c.lineTo(8, 50); c.fill();
    text(c, type, 0, 4, { w: 900, s: 74, fill: type === '!' ? '#e11d48' : '#2563eb' });
  } else if (type === 'sparkle') {
    for (let k = 0; k < 3; k++) {
      const a = t * 3 + k * 2.1, r = 16 + 8 * Math.sin(t * 8 + k);
      c.fillStyle = '#fde047'; star(c, Math.cos(a) * 40, Math.sin(a) * 30, r, 4, 0.3); c.fill();
    }
  } else if (type === 'sweat') {
    c.fillStyle = '#7dd3fc'; c.strokeStyle = '#0c4a6e'; c.lineWidth = 3;
    const dy = (t * 60) % 40;
    c.beginPath(); c.moveTo(0, -24 + dy); c.quadraticCurveTo(18, 4 + dy, 0, 14 + dy); c.quadraticCurveTo(-18, 4 + dy, 0, -24 + dy); c.fill(); c.stroke();
  }
  c.restore();
}
function drawHost(c, st, t) {
  if (!st || st.alpha <= 0) return;
  const R = RIG[st.pose], s = st.s, flip = st.flip || 1, air = st.air || 0;
  c.save(); c.globalAlpha = 0.32 * st.alpha; c.fillStyle = '#000';
  c.beginPath(); c.ellipse(st.x, st.ground, 165 * s * (1 - 0.3 * clamp(air / 150)), 26 * s, 0, 0, 7); c.fill(); c.restore();
  c.save(); c.globalAlpha = st.alpha;
  c.translate(st.x, st.ground - air); c.rotate(st.lean || 0);
  c.scale(flip * s * (st.sx || 1), s * (st.sy || 1)); c.translate(-512, -1522);
  const ox = R.x0 - PAD, oy = R.y0 - PAD;
  c.drawImage(R.body, ox, oy);
  if (st.badge) drawBadge(c, R.badge, st.badge);
  c.save(); c.translate(R.pivot[0], R.pivot[1] + (st.headDy || 0)); c.rotate(st.head || 0); c.translate(-R.pivot[0], -R.pivot[1]);
  c.drawImage(R.headImg, ox, oy);
  drawMustache(c, R.mouth, st.mustache || 0);
  c.restore();
  if (st.sign) holdSign(c, R, flip, st.sign, st.signLabel || 'FOR SALE');
  c.restore();
  if (st.emote) {
    const hy = st.ground - air - 1500 * s * (st.sy || 1);
    drawEmote(c, st.emote, st.x + 170 * s * flip, hy - 10, st.emoteU, t);
  }
}
function talk(t) { const i = Math.floor(t * FPS); return TL.voiceEnv[Math.max(0, Math.min(TL.voiceEnv.length - 1, i))] || 0; }

// ------------------------------------------------------------------ scenery helpers
function cloud(c, x, y, w, col) {
  c.fillStyle = col; c.beginPath();
  for (const [dx, dy, r] of [[-0.35, 0.05, 0.22], [-0.12, -0.12, 0.28], [0.15, -0.06, 0.25], [0.36, 0.06, 0.2], [0, 0.1, 0.25]]) { c.moveTo(x + dx * w + r * w, y + dy * w); c.arc(x + dx * w, y + dy * w, r * w, 0, 7); }
  c.fill();
}
const EIFFEL = [[0.19, 0], [0.135, 0.16], [0.152, 0.165], [0.152, 0.192], [0.118, 0.192], [0.075, 0.36], [0.09, 0.365], [0.09, 0.388], [0.068, 0.388],
  [0.022, 0.8], [0.032, 0.805], [0.032, 0.832], [0.018, 0.832], [0.012, 0.9], [0.007, 0.93], [0.002, 1.0]];
function eiffelPath(c, x, base, h) {
  c.beginPath();
  c.moveTo(x - 0.19 * h, base);
  for (const [w, y] of EIFFEL) c.lineTo(x - w * h, base - y * h);
  for (let i = EIFFEL.length - 1; i >= 0; i--) { const [w, y] = EIFFEL[i]; c.lineTo(x + w * h, base - y * h); }
  c.lineTo(x + 0.115 * h, base);
  c.bezierCurveTo(x + 0.1 * h, base - 0.08 * h, x + 0.04 * h, base - 0.11 * h, x, base - 0.112 * h);
  c.bezierCurveTo(x - 0.04 * h, base - 0.11 * h, x - 0.1 * h, base - 0.08 * h, x - 0.115 * h, base);
  c.closePath();
}
function eiffel(c, x, base, h, fill, lattice, lights, t) {
  c.save(); eiffelPath(c, x, base, h); c.fillStyle = fill; c.fill(); c.clip();
  c.strokeStyle = lattice; c.lineWidth = Math.max(1, h * 0.0025);
  const step = h * 0.022;
  c.beginPath();
  for (let k = -60; k < 60; k++) { c.moveTo(x - 0.2 * h + k * step, base); c.lineTo(x - 0.2 * h + k * step + h, base - h); c.moveTo(x + 0.2 * h - k * step, base); c.lineTo(x + 0.2 * h - k * step - h, base - h); }
  c.stroke();
  c.fillStyle = lattice;
  for (const [y0, y1] of [[0.165, 0.192], [0.365, 0.388], [0.805, 0.832]]) c.fillRect(x - 0.2 * h, base - y1 * h, 0.4 * h, (y1 - y0) * h * 0.5);
  c.restore();
  if (lights) {
    for (let k = 0; k < 26; k++) {
      const yy = [0.18, 0.375, 0.82][k % 3], w = [0.14, 0.085, 0.028][k % 3];
      const xx = x + (hash(k) - 0.5) * 2 * w * h, y = base - yy * h + (hash(k + 9) - 0.5) * 8;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + k * 1.7);
      glow(c, xx, y, 14, '255,214,120', 0.7 * tw * lights);
    }
  }
}
function buildingsLayer(w, h, baseY, seed, col, litProb) {
  const cv2 = mk(w, h), c = cv2.getContext('2d'), R = rng(seed);
  let x = -20;
  while (x < w + 20) {
    const bw = 140 + R() * 130, bh = 200 + R() * 170, top = baseY - bh;
    c.fillStyle = col.wall; c.fillRect(x, top, bw, bh + 10);
    c.fillStyle = col.roof; c.beginPath(); c.moveTo(x - 8, top); c.lineTo(x + 16, top - 62); c.lineTo(x + bw - 16, top - 62); c.lineTo(x + bw + 8, top); c.closePath(); c.fill();
    for (let k = 0; k < 2; k++) { const cx = x + 30 + R() * (bw - 60); c.fillRect(cx, top - 95, 16, 40); }
    for (let dx = 28; dx < bw - 30; dx += 46) { c.fillStyle = R() < litProb ? col.lit : col.win; c.fillRect(x + dx, top - 48, 18, 24); }
    for (let wy = top + 24; wy < baseY - 60; wy += 58) {
      for (let dx = 18; dx < bw - 26; dx += 42) { c.fillStyle = R() < litProb ? col.lit : col.win; c.fillRect(x + dx, wy, 20, 34); }
      c.fillStyle = col.line; c.fillRect(x + 6, wy + 38, bw - 12, 4);
    }
    c.fillStyle = col.line; c.fillRect(x, top, 4, bh); x += bw + 4;
  }
  return cv2;
}
function streetLamp(c, x, base, h, t, on = 1) {
  c.fillStyle = '#1b1222'; c.fillRect(x - 6, base - h, 12, h); c.fillRect(x - 18, base - 14, 36, 14);
  c.fillRect(x - 26, base - h - 6, 52, 8);
  c.fillStyle = on ? '#ffe2a0' : '#556'; rr(c, x - 18, base - h - 58, 36, 52, 6); c.fill();
  c.fillStyle = '#1b1222'; c.beginPath(); c.moveTo(x - 26, base - h - 58); c.lineTo(x, base - h - 82); c.lineTo(x + 26, base - h - 58); c.fill();
  if (on) { const f = 0.85 + 0.15 * Math.sin(t * 13 + x); glow(c, x, base - h - 32, 230, '255,200,120', 0.45 * f); glow(c, x, base + 10, 200, '255,190,110', 0.18 * f); }
}
function birds(c, t, seed, n, col, y0) {
  const R = rng(seed);
  c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const sp = 60 + R() * 50, x = W + 100 - ((t * sp + R() * 900) % (W + 300)), y = y0 + R() * 220 + Math.sin(t * 1.5 + k) * 10;
    const f = Math.sin(t * 10 + k * 2) * 10, s = 0.7 + R() * 0.6;
    c.beginPath(); c.moveTo(x - 16 * s, y - f * s); c.quadraticCurveTo(x - 6 * s, y - 4 * s, x, y); c.quadraticCurveTo(x + 6 * s, y - 4 * s, x + 16 * s, y - f * s); c.stroke();
  }
}
function personSil(c, x, base, s, col, hat) { // simple 1920s gentleman silhouette (seated or standing torso)
  c.save(); c.translate(x, base); c.scale(s, s); c.fillStyle = col;
  c.beginPath(); c.moveTo(-60, 0); c.quadraticCurveTo(-62, -120, -30, -140); c.lineTo(30, -140); c.quadraticCurveTo(62, -120, 60, 0); c.fill();
  c.beginPath(); c.arc(0, -175, 36, 0, 7); c.fill();
  if (hat === 'top') { c.fillRect(-30, -260, 60, 70); c.fillRect(-48, -198, 96, 12); }
  else { c.beginPath(); c.arc(0, -205, 34, Math.PI, 0); c.fill(); c.fillRect(-50, -206, 100, 10); }
  c.restore();
}

// ------------------------------------------------------------------ init
window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  const world = await (await fetch('node_modules/world-atlas/countries-110m.json')).json();
  WORLD.land = topojson.feature(world, world.objects.land);
  WORLD.borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await document.fonts.load(font(800, 60, 'JBMono')); await document.fonts.load(font(600, 60, 'JBMono'));
  await prepCharacter(); prepRig();
  SPR.dot = makeSnowSprite(); SPR.grain = makeGrain();
  SPR.L1 = mk(W, H); SPR.L2 = mk(W, H);
  SPR.duskFar = buildingsLayer(1400, 1500, 1370, 3, { wall: '#5a2a62', roof: '#4a1f55', win: '#6b3672', lit: '#ffb86b', line: '#4a1f55' }, 0.12);
  SPR.duskMid = buildingsLayer(1400, 1600, 1520, 7, { wall: '#3a1838', roof: '#2a0f2a', win: '#4a2246', lit: '#ffcc70', line: '#2a0f2a' }, 0.3);
  SPR.dayMid = buildingsLayer(1400, 1600, 1440, 11, { wall: '#efe2c6', roof: '#6f7f96', win: '#8fa6bf', lit: '#b7cbe0', line: '#d9c9a8' }, 0.2);
  SPR.nightL = buildingsLayer(900, 1900, 1900, 17, { wall: '#141a33', roof: '#0c1024', win: '#1f2747', lit: '#ffcf7a', line: '#0c1024' }, 0.22);
  SPR.stars = Array.from({ length: 160 }, (_, i) => ({ x: hash(i) * W, y: hash(i + 0.3) * 1100, s: 1 + hash(i + 0.7) * 2, tw: hash(i + 0.9) * 6 }));
  SCENES = [
    { id: 'paris', a: 0, b: CUES.hotel, draw: sceneParis },
    { id: 'hotel', a: CUES.hotel, b: CUES.cash, draw: sceneHotel },
    { id: 'cash', a: CUES.cash, b: CUES.train, draw: sceneCash },
    { id: 'train', a: CUES.train, b: CUES.back, draw: sceneTrain },
    { id: 'day', a: CUES.back, b: CUES.police, draw: sceneDay },
    { id: 'police', a: CUES.police, b: DUR + 1, draw: scenePolice },
  ];
  WORDS = TL.lines.flatMap(l => l.phrases.flatMap(p => p.words));
  return { frames: Math.round(DUR * FPS) };
};
const PAL = {};  // palette() is not used: every scene paints its own scenery

// ------------------------------------------------------------------ captions: one word at a time
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
  text(c, txt, 0, 0, { ...o, fill: w.key ? '#ffd23f' : '#fff', stroke: '#0a0a14', sw: 13, shadow: 'rgba(0,0,0,0.75)', blur: 16, sy: 5, keepShadow: true });
  c.restore();
}

// ------------------------------------------------------------------ scene 1: Paris at sunset (host walks in)
const WALK1 = [0.25, 1.75, 0.25];
function sceneParis(c, t) {
  const cam = t * 9;
  c.fillStyle = lin(c, 0, 0, 0, 1400, [[0, '#1d0b3a'], [0.35, '#5b1f6a'], [0.58, '#c2416c'], [0.78, '#f07c4a'], [0.95, '#ffc46b']]);
  c.fillRect(0, 0, W, H);
  glow(c, 790, 1250, 620, '255,170,90', 0.55);
  c.fillStyle = '#ffe2a6'; c.beginPath(); c.arc(790, 1250, 120, 0, 7); c.fill();
  c.globalAlpha = 0.55;
  for (let k = 0; k < 5; k++) { const x = ((k * 330 + t * (12 + k * 4)) % 1500) - 250, y = 430 + k * 140; c.fillStyle = k % 2 ? '#ff8fa3' : '#ffb38a'; c.beginPath(); c.ellipse(x, y, 230, 18, 0, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  birds(c, t, 4, 6, 'rgba(40,10,40,0.8)', 520);
  c.drawImage(SPR.duskFar, -100 - cam * 0.3, 0);
  eiffel(c, 610 - cam * 0.5, 1460, 1090, '#2a1235', 'rgba(110,60,120,0.55)', 0.8 * prog(t, 0.3, 1.2), t);
  // SOLD tag swinging from the tower
  const eT = CUES.eiffel + 0.05;
  if (t > eT) {
    const u = prog(t, eT, eT + 0.3), sw = 0.5 * Math.exp(-(t - eT - 0.3) / 0.6) * Math.cos((t - eT) * 6);
    const ax = 610 - cam * 0.5 + 34, ay = 1460 - 0.82 * 1090;
    c.save(); c.translate(ax, ay - 600 * (1 - E.outBack(u, 1.3))); c.rotate(sw); c.scale(1.5, 1.5);
    c.strokeStyle = '#f6e7c8'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 90); c.stroke();
    c.fillStyle = '#fff4dc'; c.strokeStyle = '#7c2d12'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-90, 110); c.lineTo(60, 110); c.lineTo(100, 160); c.lineTo(60, 210); c.lineTo(-90, 210); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#7c2d12'; c.beginPath(); c.arc(70, 160, 9, 0, 7); c.fill();
    const st = prog(t, eT + 0.3, eT + 0.45);
    if (st > 0) { c.save(); c.translate(-12, 160); c.rotate(-0.15); c.scale(lerp(2, 1, st), lerp(2, 1, st)); c.globalAlpha = st; text(c, 'SOLD', 0, 2, { w: 900, s: 54, fill: '#dc2626', ls: 2 }); c.restore(); }
    c.restore();
  }
  c.drawImage(SPR.duskMid, -150 - cam * 0.8, 0);
  // street
  c.fillStyle = lin(c, 0, 1500, 0, H, [[0, '#4a2448'], [1, '#160a1a']]); c.fillRect(0, 1500, W, 420);
  c.strokeStyle = 'rgba(255,190,140,0.10)'; c.lineWidth = 2;
  for (let k = -12; k < 14; k++) { c.beginPath(); c.moveTo(540 + k * 40, 1500); c.lineTo(540 + k * 160, H); c.stroke(); }
  for (let y = 1530; y < H; y += 30 + (y - 1500) * 0.12) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  streetLamp(c, 120 - cam * 1.1, 1880, 640, t, prog(t, 0.4, 0.6));
  streetLamp(c, 1000 - cam * 1.1, 1880, 640, t, prog(t, 0.5, 0.7));
  // title
  if (t > CUES.year - 0.05) {
    const u = prog(t, CUES.year - 0.05, CUES.year + 0.6), out = prog(t, CUES.victor - 0.2, CUES.victor + 0.2);
    const str = 'PARIS', n = Math.ceil(u * 5);
    c.save(); c.globalAlpha = 1 - out;
    text(c, str.slice(0, n), 540, 230, { w: 900, s: 120, ls: 30, fill: '#fff1d6', stroke: '#3a0f3a', sw: 12, shadow: 'rgba(0,0,0,0.5)', blur: 20 });
    text(c, '1925', 540, 330, { fam: 'JBMono', w: 800, s: 54, ls: 16, fill: '#ffcf8a', alpha: prog(t, CUES.year + 0.4, CUES.year + 0.7) });
    c.restore();
  }
  // Lustig card
  const vt = CUES.victor - 0.05;
  if (t > vt) {
    const u = E.outBack(prog(t, vt, vt + 0.35), 1.6), out = E.inCubic(prog(t, CUES.eiffel + 0.4, CUES.eiffel + 0.75));
    c.save(); c.translate(250 - 500 * out, 560); c.rotate(-0.08 + 0.02 * Math.sin(t * 2)); c.scale(u, u);
    c.fillStyle = '#f3e3c3'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 12; c.fillRect(-160, -210, 320, 420); c.shadowColor = 'transparent';
    c.fillStyle = '#c9a877'; c.fillRect(-140, -190, 280, 270);
    personSil(c, 0, 80, 0.95, '#3b2a1a', 'top');
    c.fillStyle = '#f3e3c3'; c.beginPath(); c.ellipse(0, -100, 22, 6, 0, 0, 7); c.fill();
    text(c, 'VICTOR LUSTIG', 0, 120, { w: 900, s: 32, fill: '#3b2a1a', ls: 1 });
    c.save(); c.translate(0, 172); c.rotate(-0.06); pill(c, 0, 0, 'CON MAN', { bg: '#dc2626', s: 26 }); c.restore();
    c.restore();
  }
  // host
  const w1 = walk(t, WALK1[0], WALK1[1], -170, 300, WALK1[2]);
  const sd = CUES.sold;
  const look = E.inOutCubic(prog(t, 1.9, 2.3)) * 0.07 - E.inOutCubic(prog(t, CUES.victor, CUES.victor + 0.3)) * 0.16 + E.inOutCubic(prog(t, CUES.eiffel, CUES.eiffel + 0.3)) * 0.2;
  const dbl = Math.sin((t - sd) * 40) * 0.12 * Math.exp(-(t - sd) / 0.15) * (t > sd ? 1 : 0);
  const jump = 90 * bump(t, sd + 0.05, 0.42);
  const sq = bump(t, sd - 0.05, 0.1) * 0.1 + bump(t, sd + 0.47, 0.14) * 0.12;
  dust(c, w1.x, 1770, t, Array.from({ length: 6 }, (_, k) => WALK1[0] + k * WALK1[2]));
  drawHost(c, { pose: 'serious', x: w1.x, ground: 1770, s: 0.5, flip: 1, air: w1.bob + jump, lean: w1.lean, head: look + dbl + Math.sin(t * 9) * 0.02 * talk(t),
    headDy: -talk(t) * 6, sx: 1 + sq, sy: 1 - sq + 0.006 * Math.sin(t * 2.3), alpha: 1, emote: t > sd && t < sd + 1.1 ? '!' : null, emoteU: prog(t, sd, sd + 0.3) * (1 - prog(t, sd + 0.9, sd + 1.1)) }, t);
}

// ------------------------------------------------------------------ scene 2: the hotel salon (host plays Lustig)
function sceneHotel(c, t) {
  const a = CUES.hotel, cam = (t - a) * 10;
  c.fillStyle = lin(c, 0, 0, 0, 1350, [[0, '#7a1628'], [1, '#4a0c19']]); c.fillRect(0, 0, W, 1350);
  c.save(); c.globalAlpha = 0.09; c.fillStyle = '#ffd98a';
  for (let y = 40; y < 1050; y += 110) for (let x = (y / 110 % 2) * 60; x < W; x += 120) { star(c, x - cam * 0.3, y, 18, 4, 0.35); c.fill(); }
  c.restore();
  c.fillStyle = '#c99a3e'; c.fillRect(0, 1040, W, 18);
  c.fillStyle = '#3a0912'; c.fillRect(0, 1058, W, 300);
  c.strokeStyle = 'rgba(201,154,62,0.6)'; c.lineWidth = 4;
  for (let x = 30; x < W; x += 210) c.strokeRect(x - cam * 0.6, 1090, 170, 220);
  // window with Paris at blue hour
  const wx = 70 - cam * 0.5;
  c.save(); c.beginPath(); c.rect(wx, 220, 330, 780); c.clip();
  c.fillStyle = lin(c, 0, 220, 0, 1000, [[0, '#1b2a5a'], [1, '#5a76b5']]); c.fillRect(wx, 220, 330, 780);
  eiffel(c, wx + 200, 1000, 520, '#0f1733', 'rgba(80,110,170,0.5)', 1, t);
  c.fillStyle = '#0d1430'; for (let k = 0; k < 6; k++) c.fillRect(wx + k * 60, 880 + (k % 3) * 30, 56, 200);
  for (let k = 0; k < 14; k++) { c.fillStyle = hash(k) < 0.5 ? '#ffcf7a' : '#2a3560'; c.fillRect(wx + 10 + hash(k + 1) * 300, 900 + hash(k + 2) * 90, 8, 10); }
  c.restore();
  c.strokeStyle = '#d4a24c'; c.lineWidth = 16; c.strokeRect(wx, 220, 330, 780);
  c.lineWidth = 8; c.beginPath(); c.moveTo(wx + 165, 220); c.lineTo(wx + 165, 1000); c.moveTo(wx, 560); c.lineTo(wx + 330, 560); c.stroke();
  // curtains
  for (const [cx, dir] of [[wx - 10, -1], [wx + 340, 1]]) {
    c.fillStyle = lin(c, cx - 70, 0, cx + 70, 0, [[0, '#5c0a17'], [0.5, '#a3182f'], [1, '#5c0a17']]);
    c.beginPath(); c.moveTo(cx - 70, 160); c.lineTo(cx + 70, 160); c.quadraticCurveTo(cx + 20 * dir, 700, cx + 70, 1040); c.lineTo(cx - 70, 1040); c.closePath(); c.fill();
    c.fillStyle = '#d4a24c'; c.fillRect(cx - 74, 640, 148, 16);
  }
  c.fillStyle = '#d4a24c'; c.fillRect(wx - 100, 150, 530, 22);
  // painting
  c.fillStyle = '#d4a24c'; c.fillRect(640 - cam * 0.4, 330, 330, 260);
  c.fillStyle = lin(c, 0, 345, 0, 575, [[0, '#7fb2d9'], [1, '#e9d8a6']]); c.fillRect(658 - cam * 0.4, 348, 294, 224);
  c.fillStyle = '#4b7a3f'; c.beginPath(); c.moveTo(658 - cam * 0.4, 572); c.quadraticCurveTo(800 - cam * 0.4, 470, 952 - cam * 0.4, 540); c.lineTo(952 - cam * 0.4, 572); c.fill();
  // chandelier
  c.save(); c.translate(560, 0); c.rotate(Math.sin(t * 0.8) * 0.01);
  c.strokeStyle = '#d4a24c'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 120); c.stroke();
  c.fillStyle = '#d4a24c'; c.beginPath(); c.ellipse(0, 200, 150, 30, 0, 0, 7); c.fill(); c.fillRect(-10, 110, 20, 90);
  for (let k = 0; k < 7; k++) {
    const x = -150 + k * 50, f = 0.8 + 0.2 * Math.sin(t * 9 + k * 2);
    c.fillStyle = '#f5e6c4'; c.fillRect(x - 5, 150, 10, 36);
    glow(c, x, 140, 70, '255,210,130', 0.55 * f);
    c.fillStyle = 'rgba(220,240,255,0.8)'; c.beginPath(); c.moveTo(x, 232); c.lineTo(x + 7, 252); c.lineTo(x, 272); c.lineTo(x - 7, 252); c.fill();
  }
  c.restore();
  // floor
  c.fillStyle = lin(c, 0, 1350, 0, H, [[0, '#5a3418'], [1, '#2a160a']]); c.fillRect(0, 1350, W, 570);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
  for (let k = -10; k < 12; k++) { c.beginPath(); c.moveTo(540 + k * 60 - cam, 1350); c.lineTo(540 + k * 220 - cam * 2, H); c.stroke(); }
  // dealers + table
  const dl = CUES.dealers;
  const dealerX = [150, 300, 450, 600];
  dealerX.forEach((x, k) => {
    const u = E.outBack(prog(t, dl + k * 0.12, dl + k * 0.12 + 0.3), 2);
    if (u <= 0) return;
    c.save(); c.translate(x - cam * 0.8, 1300); c.scale(u, u);
    personSil(c, 0, 0, 0.75, ['#1f2937', '#27303d', '#1a2230', '#2b2f3a'][k], k % 2 ? 'top' : 'bowler');
    c.fillStyle = '#f2d2b0'; c.beginPath(); c.arc(0, -131, 24, 0, 7); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(-8, -134, 3.5, 0, 7); c.arc(8, -134, 3.5, 0, 7); c.fill();
    c.restore();
    const rd = CUES.rid + 0.6 + k * 0.08;
    if (t > rd) {
      const bu = E.outBack(prog(t, rd, rd + 0.3), 2);
      c.save(); c.translate(x - cam * 0.8 + 30, 1300 - 230); c.scale(bu, bu);
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, 34, 30, 0, 0, 7); c.fill(); c.beginPath(); c.arc(-24, 34, 7, 0, 7); c.fill();
      text(c, '$', 0, 2, { w: 900, s: 40, fill: '#15803d' });
      c.restore();
    }
  });
  c.fillStyle = '#c99a3e'; c.fillRect(70 - cam * 0.9, 1290, 680, 14);
  c.fillStyle = lin(c, 0, 1300, 0, 1460, [[0, '#3b1d0c'], [1, '#1f0f06']]); c.fillRect(80 - cam * 0.9, 1304, 660, 160);
  c.fillStyle = '#1d5b3a'; c.fillRect(70 - cam * 0.9, 1272, 680, 20);
  // fake ID card, then the plans of the tower
  const of = CUES.official - 0.05, rid = CUES.rid;
  if (t > of && t < rid + 0.1) {
    const u = E.outBack(prog(t, of, of + 0.35), 1.5), out = E.inCubic(prog(t, rid - 0.35, rid));
    c.save(); c.translate(770 + 500 * out, 760); c.rotate(0.05); c.scale(u, u);
    c.fillStyle = '#f7f0dc'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; rr(c, -230, -150, 460, 300, 18); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#1e3a8a'; rr(c, -230, -150, 460, 70, [18, 18, 0, 0]); c.fill();
    text(c, 'GOVERNMENT OFFICIAL', 0, -114, { w: 900, s: 30, fill: '#fff', ls: 1 });
    c.fillStyle = '#c9b48a'; c.fillRect(-200, -60, 130, 170); personSil(c, -135, 100, 0.55, '#5b4630', 'top');
    text(c, 'M. LUSTIG', 40, -30, { w: 900, s: 34, fill: '#1f2937', align: 'left' });
    text(c, 'Deputy Director', 40, 14, { w: 600, s: 24, fill: '#374151', align: 'left' });
    text(c, 'Ministry of Posts', 40, 48, { w: 600, s: 24, fill: '#374151', align: 'left' });
    const sp = prog(t, CUES.official + 0.6, CUES.official + 0.75);
    if (sp > 0) { c.save(); c.translate(80, 70); c.rotate(-0.25); const ss = lerp(2.4, 1, sp); c.scale(ss, ss); c.globalAlpha = sp; c.strokeStyle = '#dc2626'; c.lineWidth = 8; rr(c, -120, -46, 240, 92, 10); c.stroke(); text(c, 'FAKE', 0, 4, { w: 900, s: 66, fill: '#dc2626', ls: 6 }); c.restore(); }
    c.restore();
  }
  if (t > rid - 0.2) {
    const u = E.outBack(prog(t, rid - 0.2, rid + 0.2), 1.4);
    c.save(); c.translate(780 - 600 * (1 - u), 740); c.rotate(-0.04);
    c.fillStyle = '#1e4f8f'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.fillRect(-220, -290, 440, 560); c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; for (let k = -220; k <= 220; k += 30) { c.beginPath(); c.moveTo(k, -290); c.lineTo(k, 270); c.stroke(); }
    for (let k = -290; k <= 270; k += 30) { c.beginPath(); c.moveTo(-220, k); c.lineTo(220, k); c.stroke(); }
    c.save(); eiffelPath(c, 0, 200, 430); c.strokeStyle = '#e6f0ff'; c.lineWidth = 3; c.stroke(); c.restore();
    text(c, '7,300 TONS OF IRON', 0, 240, { fam: 'JBMono', w: 800, s: 26, fill: '#e6f0ff' });
    const sp = prog(t, rid + 0.3, rid + 0.45);
    if (sp > 0) { c.save(); c.translate(0, -60); c.rotate(-0.22); const ss = lerp(2.4, 1, sp); c.scale(ss, ss); c.globalAlpha = sp; c.fillStyle = 'rgba(220,38,38,0.9)'; rr(c, -180, -50, 360, 100, 12); c.fill(); text(c, 'FOR SCRAP', 0, 4, { w: 900, s: 58, fill: '#fff', ls: 3 }); c.restore(); }
    c.restore();
  }
  // host as Lustig: mustache, badge, turns to the dealers
  const pr = CUES.pretended + 0.2, mu = E.outBack(prog(t, pr, pr + 0.3), 2.5);
  const turn = prog(t, dl - 0.1, dl + 0.15), flip = turn < 0.5 ? 1 - turn * 2 : -(turn * 2 - 1);
  const nod = Math.sin((t - CUES.official) * 14) * 0.08 * Math.exp(-(t - CUES.official) / 0.25) * (t > CUES.official ? 1 : 0);
  const pose = t > rid + 0.05 ? 'thumbsup' : 'serious';
  const pj = 50 * bump(t, rid + 0.05, 0.3);
  const enter = E.outCubic(prog(t, a - 0.1, a + 0.5));
  drawHost(c, { pose, x: lerp(1200, 860, enter) - cam * 1.1, ground: 1830, s: 0.52, flip: Math.abs(flip) < 0.05 ? 0.05 : flip, air: pj, head: nod + Math.sin(t * 9) * 0.02 * talk(t), headDy: -talk(t) * 5,
    sy: 1 + 0.006 * Math.sin(t * 2.3), alpha: 1, mustache: mu, badge: E.outBack(prog(t, CUES.official, CUES.official + 0.3), 2.5),
    emote: t > pr && t < pr + 0.9 ? 'sparkle' : t > rid + 0.1 ? 'sparkle' : null, emoteU: t > rid + 0.1 ? prog(t, rid + 0.1, rid + 0.4) : prog(t, pr, pr + 0.2) * (1 - prog(t, pr + 0.7, pr + 0.9)) }, t);
}

// ------------------------------------------------------------------ scene 3: the payment (no host)
function banknote(c, x, y, s, rot, k) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = k % 2 ? '#d9c9a0' : '#a9c4b8'; c.fillRect(-90, -45, 180, 90);
  c.strokeStyle = 'rgba(60,50,30,0.6)'; c.lineWidth = 3; c.strokeRect(-82, -37, 164, 74);
  c.fillStyle = 'rgba(60,50,30,0.35)'; c.beginPath(); c.ellipse(-40, 0, 24, 28, 0, 0, 7); c.fill();
  text(c, '1000', 35, 2, { w: 900, s: 28, fill: '#3b2f1a' });
  c.restore();
}
function sceneCash(c, t) {
  const a = CUES.cash, pd = CUES.paid, ft = CUES.fortune;
  const z = lerp(1.0, 1.08, prog(t, a, CUES.train));
  c.save(); c.translate(540, 1100); c.scale(z, z); c.translate(-540, -1100);
  c.fillStyle = lin(c, 0, 0, 0, 1200, [[0, '#0a2a20'], [1, '#124a37']]); c.fillRect(0, 0, W, 1250);
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 6; for (let x = 0; x < W; x += 180) c.strokeRect(x + 20, 120, 140, 520);
  c.fillStyle = '#3d2412'; c.fillRect(0, 700, W, 30);
  c.fillStyle = lin(c, 0, 1180, 0, H, [[0, '#6b3a1c'], [1, '#2e170a']]); c.fillRect(0, 1180, W, 740);
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, 1180, W, 10);
  // banker's lamp
  glow(c, 240, 980, 560, '255,214,120', 0.45);
  c.fillStyle = '#c9a24a'; c.fillRect(230, 900, 20, 300); c.beginPath(); c.ellipse(240, 1205, 90, 22, 0, 0, 7); c.fill();
  c.fillStyle = lin(c, 120, 0, 360, 0, [[0, '#0b5d3b'], [0.5, '#1fa36a'], [1, '#0b5d3b']]);
  c.beginPath(); c.moveTo(110, 900); c.quadraticCurveTo(240, 790, 370, 900); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,230,150,0.25)'; c.beginPath(); c.moveTo(130, 900); c.lineTo(350, 900); c.lineTo(520, 1250); c.lineTo(-40, 1250); c.closePath(); c.fill();
  // briefcase
  const u = E.outBack(prog(t, a, a + 0.4), 1.4), open = E.outBack(prog(t, pd, pd + 0.4), 1.6);
  c.save(); c.translate(640, 1420); c.scale(u, u);
  c.fillStyle = '#2b1608'; rr(c, -260, -40, 520, 230, 20); c.fill();
  c.fillStyle = '#e9dcc0';
  for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { c.fillStyle = (k + j) % 2 ? '#d9c9a0' : '#a9c4b8'; c.fillRect(-230 + k * 118, -30 + j * 22 - 10 * open, 108, 60); }
  c.save(); c.translate(0, -40); c.scale(1, Math.cos(open * 1.25)); c.fillStyle = '#4a2a12'; rr(c, -260, -200, 520, 200, 20); c.fill(); c.restore();
  c.fillStyle = '#5a3417'; rr(c, -260, 60, 520, 130, 20); c.fill();
  c.fillStyle = '#c9a24a'; c.fillRect(-120, 40, 40, 26); c.fillRect(80, 40, 40, 26);
  c.restore();
  // money bursting out
  if (t > ft - 0.15) {
    const R = rng(33);
    for (let k = 0; k < 26; k++) {
      const st = ft - 0.15 + R() * 0.4, age = t - st;
      const ang = -Math.PI / 2 + (R() - 0.5) * 2.2, sp = 700 + R() * 700;
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp, rot = (R() - 0.5) * 8;
      if (age < 0) continue;
      const x = 640 + vx * age, y = 1380 + vy * age + 900 * age * age;
      banknote(c, x, y, 0.8 + age * 1.2, rot * age, k);
    }
    for (let k = 0; k < 14; k++) {
      const st = ft + R() * 0.3, age = t - st; if (age < 0) continue;
      const x = 640 + (R() - 0.5) * 900 * age, y = 1380 - (500 + R() * 400) * age + 1200 * age * age;
      c.fillStyle = '#f5c542'; c.beginPath(); c.ellipse(x, y, 16, 16 * Math.abs(Math.cos(t * 12 + k)), 0, 0, 7); c.fill();
    }
    glow(c, 640, 1380, 500, '255,215,100', 0.35 * Math.exp(-(t - ft) / 0.6));
  }
  c.restore();
}

// ------------------------------------------------------------------ scene 4: night train to Austria (no host)
function sceneTrain(c, t) {
  const a = CUES.train, b = CUES.back, au = CUES.austria, by = CUES.buyer, em = CUES.embarrassed;
  c.fillStyle = lin(c, 0, 0, 0, 1300, [[0, '#050a1f'], [0.6, '#142a5c'], [1, '#2e4f8a']]); c.fillRect(0, 0, W, H);
  for (const s of SPR.stars) { c.fillStyle = `rgba(230,240,255,${0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + s.tw))})`; c.fillRect(s.x, s.y, s.s, s.s); }
  glow(c, 820, 360, 300, '220,230,255', 0.35);
  c.fillStyle = '#f4f1de'; c.beginPath(); c.arc(820, 360, 90, 0, 7); c.fill();
  c.fillStyle = 'rgba(180,180,160,0.35)'; for (const [dx, dy, r] of [[-30, -20, 18], [20, 25, 12], [35, -30, 9]]) { c.beginPath(); c.arc(820 + dx, 360 + dy, r, 0, 7); c.fill(); }
  const mtn = (base, amp, seed, col, snow, off) => {
    const R = rng(seed); const pts = []; for (let x = -100; x <= W + 300; x += 230) pts.push([x, base - R() * amp]);
    c.fillStyle = col; c.beginPath(); c.moveTo(-100 - off, H);
    pts.forEach(([x, y], i) => { const xm = x - off; if (i === 0) c.lineTo(xm, y); else { const [px, py] = pts[i - 1]; c.lineTo((px + x) / 2 - off, Math.min(py, y) - 130); c.lineTo(xm, y); } });
    c.lineTo(W + 100, H); c.closePath(); c.fill();
    if (snow) { c.fillStyle = snow; pts.forEach(([x, y], i) => { if (i === 0) return; const [px, py] = pts[i - 1]; const tx = (px + x) / 2 - off, ty = Math.min(py, y) - 130; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - 62, ty + 70); c.lineTo(tx - 20, ty + 58); c.lineTo(tx + 10, ty + 78); c.lineTo(tx + 62, ty + 70); c.closePath(); c.fill(); }); }
  };
  const pan = (t - a) * 14;
  mtn(1150, 260, 5, '#1d2f5a', 'rgba(220,230,255,0.5)', pan * 0.2);
  mtn(1280, 200, 9, '#132447', 'rgba(200,215,245,0.35)', pan * 0.4);
  // river
  c.fillStyle = lin(c, 0, 1560, 0, H, [[0, '#0d1b3d'], [1, '#050a1f']]); c.fillRect(0, 1560, W, 360);
  for (let k = 0; k < 18; k++) { const y = 1590 + k * 18, w = 40 + hash(k) * 120, x = 820 + Math.sin(t * 2 + k) * 30 - w / 2; c.fillStyle = `rgba(240,240,220,${0.35 - k * 0.015})`; c.fillRect(x, y, w, 3); }
  // viaduct
  c.fillStyle = '#34406e'; c.fillRect(0, 1320, W, 40);
  for (let k = 0; k < 7; k++) {
    const x = k * 220 - (pan * 0.6 % 220);
    c.fillStyle = lin(c, x, 0, x + 220, 0, [[0, '#2b3561'], [0.5, '#3a4778'], [1, '#2b3561']]);
    c.beginPath(); c.moveTo(x, 1360); c.lineTo(x + 220, 1360); c.lineTo(x + 220, 1600); c.lineTo(x + 190, 1600); c.quadraticCurveTo(x + 110, 1420, x + 30, 1600); c.lineTo(x, 1600); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(190,205,255,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 190, 1600); c.quadraticCurveTo(x + 110, 1420, x + 30, 1600); c.stroke();
  }
  c.fillStyle = 'rgba(200,215,255,0.5)'; c.fillRect(0, 1318, W, 4);
  c.fillStyle = '#1b2244'; for (let x = -(pan * 0.6 % 40); x < W; x += 40) c.fillRect(x, 1300, 6, 20);
  // train
  const tx = lerp(120, 1500, prog(t, a - 0.1, b + 0.1));
  const tr = (x, y, w, h, col) => { c.fillStyle = col; rr(c, x, y, w, h, 10); c.fill(); };
  for (let k = 0; k < 3; k++) {
    const x = tx - 300 - k * 290;
    tr(x, 1200, 270, 110, '#1f4d3a'); c.fillStyle = '#0e2a1f'; c.fillRect(x, 1190, 270, 14);
    for (let j = 0; j < 5; j++) { const f = 0.85 + 0.15 * Math.sin(t * 7 + j + k * 3); c.fillStyle = `rgba(255,214,120,${f})`; c.fillRect(x + 18 + j * 50, 1220, 34, 40); }
    for (const wx2 of [x + 50, x + 220]) { c.fillStyle = '#111'; c.beginPath(); c.arc(wx2, 1314, 18, 0, 7); c.fill(); }
  }
  c.fillStyle = '#151515'; rr(c, tx - 40, 1170, 300, 140, 12); c.fill();
  c.fillStyle = '#222'; rr(c, tx - 40, 1100, 110, 210, 10); c.fill(); c.fillStyle = 'rgba(255,214,120,0.85)'; c.fillRect(tx - 20, 1125, 40, 40);
  c.fillStyle = '#111'; c.fillRect(tx + 190, 1110, 40, 70); c.fillRect(tx + 180, 1104, 60, 12);
  c.fillStyle = '#b91c1c'; c.fillRect(tx - 40, 1290, 300, 12);
  glow(c, tx + 262, 1240, 260, '255,230,150', 0.5);
  c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(tx + 262, 1240, 14, 0, 7); c.fill();
  for (let k = 0; k < 3; k++) { const wx2 = tx + 20 + k * 80, ang = t * 12; c.fillStyle = '#7f1d1d'; c.beginPath(); c.arc(wx2, 1305, 26, 0, 7); c.fill(); c.strokeStyle = '#fca5a5'; c.lineWidth = 3; c.beginPath(); c.moveTo(wx2 + Math.cos(ang) * 22, 1305 + Math.sin(ang) * 22); c.lineTo(wx2 - Math.cos(ang) * 22, 1305 - Math.sin(ang) * 22); c.stroke(); }
  for (let k = 0; k < 14; k++) {
    const st = a + k * 0.28, age = t - st; if (age < 0 || age > 3) continue;
    const sx = lerp(120, 1500, prog(st, a - 0.1, b + 0.1)) + 210 - age * 60, sy = 1100 - age * 120, r = 30 + age * 55;
    c.globalAlpha = 0.5 * (1 - age / 3); c.drawImage(SPR.dot, sx - r, sy - r, r * 2, r * 2);
  }
  c.globalAlpha = 1;
  // map inset: Paris -> Vienna
  if (t > au - 0.5) {
    const u = E.outBack(prog(t, au - 0.5, au - 0.15), 1.4);
    c.save(); c.translate(280, 380); c.scale(u, u); c.translate(-280, -380);
    c.fillStyle = 'rgba(8,16,40,0.85)'; c.strokeStyle = 'rgba(160,200,255,0.6)'; c.lineWidth = 3; rr(c, 50, 170, 460, 400, 26); c.fill(); c.stroke();
    c.save(); rr(c, 50, 170, 460, 400, 26); c.clip();
    const P = d3.geoMercator().fitExtent([[60, 180], [500, 560]], { type: 'MultiPoint', coordinates: [[-3, 43], [19, 54]] });
    const path = d3.geoPath(P, c);
    c.fillStyle = '#25406e'; c.beginPath(); path(WORLD.land); c.fill();
    c.strokeStyle = 'rgba(160,200,255,0.35)'; c.lineWidth = 1.2; c.beginPath(); path(WORLD.borders); c.stroke();
    const pa = P([2.35, 48.86]), vi = P([16.37, 48.21]);
    const ru = E.inOutCubic(prog(t, au - 0.1, au + 0.8));
    const mx = (pa[0] + vi[0]) / 2, my = Math.min(pa[1], vi[1]) - 90;
    c.strokeStyle = '#ffd23f'; c.lineWidth = 5; c.setLineDash([12, 10]); c.beginPath();
    for (let i = 0; i <= 40 * ru; i++) { const s = i / 40, x = (1 - s) * (1 - s) * pa[0] + 2 * (1 - s) * s * mx + s * s * vi[0], y = (1 - s) * (1 - s) * pa[1] + 2 * (1 - s) * s * my + s * s * vi[1]; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([]);
    for (const [p, lbl] of [[pa, 'PARIS'], [vi, 'VIENNA']]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(p[0], p[1], 9, 0, 7); c.fill(); text(c, lbl, p[0], p[1] + 32, { w: 900, s: 24, fill: '#fff', stroke: '#081028', sw: 6 }); }
    c.restore(); c.restore();
  }
  // the embarrassed buyer
  if (t > by - 0.1) {
    const u = E.outBack(prog(t, by - 0.1, by + 0.25), 1.6), bl = prog(t, em, em + 0.5);
    c.save(); c.translate(780, 1640); c.scale(u, u);
    c.fillStyle = '#f4ead5'; c.strokeStyle = '#111'; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 210, 0, 7); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.arc(0, 0, 202, 0, 7); c.clip();
    c.fillStyle = '#9fb8d8'; c.fillRect(-210, -210, 420, 420);
    c.fillStyle = '#2b2f3a'; c.beginPath(); c.moveTo(-150, 210); c.quadraticCurveTo(-140, 70, 0, 60); c.quadraticCurveTo(140, 70, 150, 210); c.fill();
    c.fillStyle = '#f2d2b0'; c.beginPath(); c.arc(0, -30, 92, 0, 7); c.fill();
    c.fillStyle = `rgba(239,68,68,${0.15 + 0.6 * bl})`; c.beginPath(); c.ellipse(-48, -5, 30, 18, 0, 0, 7); c.ellipse(48, -5, 30, 18, 0, 0, 7); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 6; c.beginPath(); c.arc(-34, -40, 12, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(22, -46); c.arc(34, -40, 12, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.beginPath(); c.moveTo(-26, 36); c.quadraticCurveTo(0, 22 - 8 * bl, 26, 36); c.stroke();
    const hatDown = 40 * E.outBack(prog(t, em + 0.2, em + 0.5), 2);
    c.fillStyle = '#1f2937'; c.beginPath(); c.arc(0, -112 + hatDown, 78, Math.PI, 0); c.fill(); c.fillRect(-110, -116 + hatDown, 220, 16);
    c.restore();
    if (bl > 0) drawEmote(c, 'sweat', 140, -120, bl, t);
    c.restore();
    const pu = E.outBack(prog(t, em + 0.6, em + 0.9), 2);
    if (pu > 0) {
      c.save(); c.translate(330, 1700); c.scale(pu, pu); c.rotate(-0.06);
      c.fillStyle = '#1e3a8a'; rr(c, -130, -50, 260, 100, 14); c.fill(); text(c, 'POLICE', 0, 4, { w: 900, s: 50, fill: '#fff', ls: 4 });
      c.strokeStyle = '#ef4444'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-120, -70); c.lineTo(120, 70); c.moveTo(120, -70); c.lineTo(-120, 70); c.stroke();
      c.restore();
    }
  }
}

// ------------------------------------------------------------------ scene 5: Paris in daylight, he is back (host)
function sceneDay(c, t) {
  const a = CUES.back, cam = (t - a) * 16;
  c.fillStyle = lin(c, 0, 0, 0, 1450, [[0, '#4fb3f6'], [0.7, '#a9dcfa'], [1, '#eaf8ff']]); c.fillRect(0, 0, W, H);
  glow(c, 900, 220, 320, '255,250,210', 0.7); c.fillStyle = '#fffbe0'; c.beginPath(); c.arc(900, 220, 70, 0, 7); c.fill();
  for (let k = 0; k < 4; k++) cloud(c, ((k * 380 + t * (18 + k * 6)) % 1500) - 200, 300 + k * 160, 220 + k * 30, 'rgba(255,255,255,0.92)');
  birds(c, t, 8, 4, 'rgba(40,60,90,0.7)', 420);
  c.drawImage(SPR.dayMid, -150 - cam * 0.25, 0);
  eiffel(c, 560 - cam * 0.4, 1460, 1120, '#7b5a3c', 'rgba(190,150,105,0.6)', 0, t);
  // trees + lawn + gravel
  for (let k = 0; k < 9; k++) { const x = k * 140 - (cam * 0.7 % 140) - 40, y = 1440; c.fillStyle = '#2f6b2f'; c.fillRect(x - 6, y - 40, 12, 60); c.fillStyle = k % 2 ? '#3f8a3a' : '#4a9a44'; c.beginPath(); c.arc(x, y - 80, 70, 0, 7); c.fill(); }
  c.fillStyle = lin(c, 0, 1460, 0, H, [[0, '#7cc36b'], [1, '#4f9a45']]); c.fillRect(0, 1460, W, 120);
  c.fillStyle = lin(c, 0, 1560, 0, H, [[0, '#e8d3a8'], [1, '#cdb184']]); c.fillRect(0, 1560, W, 360);
  // pigeons
  for (let k = 0; k < 3; k++) { const x = 150 + k * 90 - cam * 0.9, y = 1700 + (k % 2) * 30, peck = Math.max(0, Math.sin(t * 6 + k * 2)) * 8; c.fillStyle = '#7b8494'; c.beginPath(); c.ellipse(x, y, 26, 16, 0, 0, 7); c.fill(); c.beginPath(); c.arc(x - 22, y - 14 + peck, 10, 0, 7); c.fill(); c.fillStyle = '#f59e0b'; c.fillRect(x - 36, y - 14 + peck, 8, 4); }
  // café awning
  c.save(); c.translate(-cam * 1.2, 0);
  for (let k = 0; k < 7; k++) { c.fillStyle = k % 2 ? '#fff' : '#d62839'; c.beginPath(); c.moveTo(k * 70, 0); c.lineTo(k * 70 + 70, 0); c.lineTo(k * 70 + 70, 150); c.arc(k * 70 + 35, 150, 35, 0, Math.PI); c.closePath(); c.fill(); }
  c.restore();
  // host tiptoes back in with a sign
  const w5 = walk(t, a + 0.25, a + 1.45, 1260, 790, 0.2);
  const ag = CUES.again;
  dust(c, w5.x, 1800, t, Array.from({ length: 6 }, (_, k) => a + 0.25 + k * 0.2));
  drawHost(c, { pose: 'thumbsup', x: w5.x, ground: 1800, s: 0.5, flip: -1, air: w5.bob * 0.7 + 40 * bump(t, ag + 0.05, 0.35), lean: w5.lean - 0.05 * (t < a + 1.45 ? 1 : 0),
    head: Math.sin(t * 5) * 0.04, sy: 1 + 0.006 * Math.sin(t * 2.3), alpha: 1, mustache: 1, sign: E.outBack(prog(t, CUES.sell - 0.1, CUES.sell + 0.2), 2),
    emote: t > ag ? 'sparkle' : null, emoteU: prog(t, ag, ag + 0.3) }, t);
  const agu = prog(t, ag + 0.1, ag + 0.25);
  if (agu > 0) { c.save(); c.translate(w5.x - 200, 1050); c.rotate(-0.18); const ss = lerp(2.4, 1, agu); c.scale(ss, ss); c.globalAlpha = agu; pill(c, 0, 0, 'AGAIN!', { bg: '#dc2626', s: 40, glow: 'rgba(220,38,38,0.6)' }); c.restore(); }
}

// ------------------------------------------------------------------ scene 6: police, the escape, WANTED (no host)
function scenePolice(c, t) {
  const a = CUES.police, cl = CUES.called, bt = CUES.but, aw = CUES.away;
  const z = lerp(1, 1.08, E.inOutCubic(prog(t, aw + 0.3, DUR)));
  c.save(); c.translate(540, 900); c.scale(z, z); c.translate(-540, -900);
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#04060f'], [0.5, '#0d1330'], [1, '#05070f']]); c.fillRect(0, 0, W, H);
  glow(c, 540, 820, 380, '120,150,255', 0.18);
  // one-point perspective street
  const vp = [540, 880];
  c.fillStyle = '#0b1026'; c.beginPath(); c.moveTo(0, 0); c.lineTo(400, 0); c.lineTo(470, 820); c.lineTo(470, 960); c.lineTo(0, 1500); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(W, 0); c.lineTo(680, 0); c.lineTo(610, 820); c.lineTo(610, 960); c.lineTo(W, 1500); c.closePath(); c.fill();
  for (const side of [-1, 1]) {
    for (let r = 0; r < 7; r++) for (let k = 0; k < 4; k++) {
      const d = 0.15 + k * 0.2, x = 540 + side * lerp(540, 80, d) - (side > 0 ? 0 : 30 * (1 - d)), y = lerp(80 + r * 190, 880 + (r - 3) * 26, d);
      const ww = 60 * (1 - d) + 10, hh = 90 * (1 - d) + 14;
      const lit = hash(r * 7 + k + (side > 0 ? 50 : 0)) < 0.35;
      c.fillStyle = lit ? `rgba(255,207,122,${0.75 + 0.2 * Math.sin(t * 3 + r + k)})` : '#18203f'; c.fillRect(x - ww / 2, y, ww, hh);
    }
  }
  // the buyer's window with a ringing phone
  const ph = cl - 0.45;
  c.fillStyle = 'rgba(255,207,122,0.95)'; c.fillRect(90, 380, 180, 220);
  if (t > ph - 0.3) {
    const ring = t > ph && t < ph + 0.9, sh = ring ? Math.sin(t * 60) * 4 : 0;
    c.save(); c.translate(180 + sh, 560); c.fillStyle = '#111';
    c.fillRect(-8, -110, 16, 100); c.beginPath(); c.ellipse(0, -10, 40, 12, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, -118, 18, 12, 0, 0, 7); c.fill();
    c.fillRect(24, -100, 10, 50); c.beginPath(); c.ellipse(29, -46, 14, 10, 0, 0, 7); c.fill();
    if (ring) { c.strokeStyle = '#111'; c.lineWidth = 4; for (const sg of [-1, 1]) { c.beginPath(); c.arc(0, -90, 60, sg > 0 ? -0.6 : Math.PI - 0.6, sg > 0 ? 0.6 : Math.PI + 0.6); c.stroke(); } }
    c.restore();
    if (t > ph + 0.6) personSil(c, 210, 600, 0.9, '#1b1b1b', 'bowler');
  }
  // wet street with reflections
  c.fillStyle = lin(c, 0, 960, 0, H, [[0, '#0d1226'], [1, '#03050c']]); c.beginPath(); c.moveTo(470, 960); c.lineTo(610, 960); c.lineTo(W, 1500); c.lineTo(W, H); c.lineTo(0, H); c.lineTo(0, 1500); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120,140,200,0.15)'; c.lineWidth = 2;
  for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(540 + k * 8, 960); c.lineTo(540 + k * 140, H); c.stroke(); }
  streetLamp(c, 880, 1700, 600, t, 1);
  // police with lanterns
  if (t > cl + 0.4) {
    for (let k = 0; k < 2; k++) {
      const u = prog(t, cl + 0.4 + k * 0.2, aw + 1.2), d = lerp(0.05, 0.6, u);
      const x = 540 + (k ? 40 : -60) * (1 + d * 6), y = lerp(950, 1500, d), s = lerp(0.25, 1.1, d), bob = Math.abs(Math.sin(t * 10 + k)) * 8 * s;
      const sweep = Math.sin(t * 2.5 + k * 2) * 0.6;
      c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x + 40 * s, y - 120 * s - bob);
      c.rotate(sweep * 0.5 + (k ? -0.25 : 0.25));
      const cg = c.createLinearGradient(0, 0, 0, 620 * s); cg.addColorStop(0, 'rgba(255,236,170,0.35)'); cg.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = cg; c.beginPath(); c.moveTo(-8, 0); c.lineTo(-150 * s, 620 * s); c.lineTo(150 * s, 620 * s); c.lineTo(8, 0); c.closePath(); c.fill();
      c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x + 40 * s + Math.sin(sweep) * 200 * s, y + 380 * s, 170 * s, '255,236,170', 0.22); c.restore();
      c.save(); c.translate(x, y - bob); c.scale(s, s); c.fillStyle = '#0a0f24';
      c.beginPath(); c.moveTo(-50, 0); c.quadraticCurveTo(-56, -150, -26, -170); c.lineTo(26, -170); c.quadraticCurveTo(56, -150, 50, 0); c.fill();
      c.beginPath(); c.arc(0, -200, 30, 0, 7); c.fill(); c.fillRect(-30, -246, 60, 30); c.fillRect(-36, -222, 72, 8);
      glow(c, 40, -120, 50, '255,230,150', 0.9); c.restore();
    }
  }
  // Lustig's silhouette runs off and vanishes
  if (t > bt - 0.1 && t < aw + 0.5) {
    const u = prog(t, bt - 0.1, aw + 0.1), x = lerp(-150, 1000, E.inOutCubic(u)), bob = Math.abs(Math.sin(t * 16)) * 14;
    const fade = 1 - prog(t, aw + 0.05, aw + 0.3);
    c.save(); c.globalAlpha = fade; c.translate(x, 1700 - bob); c.rotate(0.12);
    c.fillStyle = '#000'; c.beginPath(); c.moveTo(-60, 0); c.lineTo(-40, -190); c.lineTo(40, -190); c.lineTo(70, 0); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, -225, 34, 0, 7); c.fill(); c.fillRect(-30, -320, 60, 80); c.fillRect(-48, -246, 96, 12);
    c.fillRect(50, -120, 80, 60);
    const leg = Math.sin(t * 16) * 30; c.lineWidth = 18; c.strokeStyle = '#000'; c.beginPath(); c.moveTo(-10, -10); c.lineTo(-10 + leg, 60); c.moveTo(20, -10); c.lineTo(20 - leg, 60); c.stroke();
    c.restore();
    if (t > aw) { const pu = prog(t, aw, aw + 0.6); c.globalAlpha = 0.7 * (1 - pu); for (let k = 0; k < 7; k++) { const an = k / 7 * 6.28, r = 40 + 160 * pu; c.drawImage(SPR.dot, 1000 + Math.cos(an) * r - 60, 1580 + Math.sin(an) * r * 0.6 - 60, 120, 120); } c.globalAlpha = 1; }
  }
  // WANTED poster
  const wp = aw + 0.4;
  if (t > wp) {
    const u = E.outBack(prog(t, wp, wp + 0.35), 1.3), flap = Math.sin(t * 7) * 0.03 * (1 - prog(t, wp, wp + 2));
    c.save(); c.translate(540, 560 - 700 * (1 - u)); c.rotate(-0.05 + flap);
    c.fillStyle = '#e9dbb4'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 16; c.fillRect(-250, -330, 500, 640); c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(120,90,40,0.5)'; c.lineWidth = 4; c.strokeRect(-230, -310, 460, 600);
    text(c, 'WANTED', 0, -245, { w: 900, s: 96, fill: '#3b2410', ls: 8 });
    c.fillStyle = '#cdb98a'; c.fillRect(-150, -180, 300, 280); personSil(c, 0, 95, 1.05, '#3b2410', 'top');
    c.fillStyle = '#cdb98a'; c.beginPath(); c.ellipse(0, -75, 24, 7, 0, 0, 7); c.fill();
    text(c, 'VICTOR LUSTIG', 0, 150, { w: 900, s: 44, fill: '#3b2410', ls: 2 });
    text(c, 'CON MAN · STILL AT LARGE', 0, 210, { fam: 'JBMono', w: 700, s: 24, fill: '#6b4a24', ls: 1 });
    c.fillStyle = '#9a8a6a'; for (const [x, y] of [[-230, -310], [230, -310], [-230, 290], [230, 290]]) { c.beginPath(); c.arc(x * 0.95, y * 0.96, 8, 0, 7); c.fill(); }
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ frame
window.renderFrame = function (i) {
  const t = i / FPS;
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  drawScenes(c, t);
  drawCaptions(c, t);
  drawGrainVignette(c, t);
  return t;
};
