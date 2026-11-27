/* Hauptmann von Köpenick TikTok short (German, flat style, hard cuts): renderFrame(i) draws frame i. */
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


// ================================================================== Mary Celeste: flat illustration shots with hard cuts
let SHOTS;
const PC = {
  sky1: '#5f97c4', sky2: '#d7e9f2', cloud1: '#ffffff', cloud2: '#c3d8e4', sea1: '#2f8fae', sea2: '#25789a', sea3: '#1d6383', sea4: '#174f6b', foam: '#e6f4f8',
  wood1: '#9a6a45', wood2: '#865a39', wood3: '#6e4a2f', woodHi: '#b07c52', sail: '#e8dfc8', sailSh: '#cfc4a8', hull: '#2a211d', cream: '#efe6d2',
  lamp: '#ffc94a', red: '#e0473c', ink: '#1d2a33', white: '#ffffff', yellow: '#ffd23f',
};
function fillPoly(c, pts, col) { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
function waveBand(c, y, amp, len, speed, t, col, ph, foam) {
  c.fillStyle = col; c.beginPath(); c.moveTo(-10, H + 10);
  for (let x = -10; x <= W + 10; x += 18) c.lineTo(x, y + Math.sin(x / len * 6.283 + t * speed + ph) * amp + Math.sin(x / (len * 0.43) + t * speed * 1.7 + ph * 2) * amp * 0.35);
  c.lineTo(W + 10, H + 10); c.closePath(); c.fill();
  if (foam) {
    c.strokeStyle = foam; c.lineWidth = 3; c.lineCap = 'round';
    for (let x = 30; x < W; x += 170) {
      const xx = (x + t * speed * 18 + ph * 50) % (W + 100) - 50, yy = y + Math.sin(xx / len * 6.283 + t * speed + ph) * amp;
      c.beginPath(); c.moveTo(xx - 30, yy + 4); c.quadraticCurveTo(xx, yy - 6, xx + 34, yy + 4); c.stroke();
    }
  }
}
function seaLayers(c, y0, t, cols, amp = 14) {
  cols.forEach((col, k) => waveBand(c, y0 + k * (k + 1) * 26, amp * (1 + k * 0.5), 260 + k * 120, 0.9 + k * 0.35, t, col, k * 1.7, PC.foam + '88'));
}
function flatCloud(c, x, y, w, col) {
  c.fillStyle = col; c.beginPath(); c.roundRect(x - w / 2, y - w * 0.08, w, w * 0.16, w * 0.08); c.fill();
  c.beginPath(); c.arc(x - w * 0.12, y - w * 0.08, w * 0.13, 0, 7); c.arc(x + w * 0.1, y - w * 0.12, w * 0.16, 0, 7); c.fill();
}
function fogBands(c, t, y0, y1, n, alpha) {
  for (let k = 0; k < n; k++) {
    const y = lerp(y0, y1, k / Math.max(1, n - 1)), w = 600 + hash(k) * 500, x = ((k * 377 + t * (25 + k * 9)) % (W + w)) - w / 2;
    c.fillStyle = `rgba(205,215,220,${alpha})`; c.beginPath(); c.roundRect(x - w / 2, y - 30, w, 60, 30); c.fill();
  }
}
function bokeh(c, t, seed, n, rgb, a) {
  const R = rng(seed);
  for (let k = 0; k < n; k++) {
    const x = R() * W, y = R() * H * 0.7, r = 20 + R() * 50, tw = 0.6 + 0.4 * Math.sin(t * 0.8 + k);
    glow(c, x + Math.sin(t * 0.2 + k) * 10, y, r, rgb, a * tw);
  }
}
function squareSail(c, cx, yT, yB, wT, wB, bulge, torn, t, k) {
  const fl = Math.sin(t * 3 + k) * 6;
  c.fillStyle = PC.sail; c.beginPath();
  c.moveTo(cx - wT / 2, yT); c.lineTo(cx + wT / 2, yT);
  c.quadraticCurveTo(cx + wB / 2 + bulge * 0.3, (yT + yB) / 2, cx + wB / 2, yB);
  if (torn) { for (let i = 0; i <= 8; i++) { const x = cx + wB / 2 - i * wB / 8; c.lineTo(x, yB - (i % 2 ? 26 + fl : 0) - (yB - yT) * 0.25); } }
  else c.quadraticCurveTo(cx, yB + bulge + fl, cx - wB / 2, yB);
  c.quadraticCurveTo(cx - wB / 2 - bulge * 0.3, (yT + yB) / 2, cx - wT / 2, yT); c.closePath(); c.fill();
  c.fillStyle = PC.sailSh; c.beginPath(); c.moveTo(cx + wT * 0.15, yT); c.lineTo(cx + wT / 2, yT); c.quadraticCurveTo(cx + wB / 2 + bulge * 0.3, (yT + yB) / 2, cx + wB / 2, yB); c.lineTo(cx + wB * 0.2, yB); c.closePath(); c.fill();
}
function flatShip(c, x, y, s, rot, t, torn, alpha = 1) {
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.strokeStyle = '#3b2a20'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(110, -420); c.lineTo(340, -95); c.moveTo(110, -420); c.lineTo(-230, -30); c.moveTo(-60, -400); c.lineTo(-230, -30); c.moveTo(-60, -400); c.lineTo(110, -420); c.stroke();
  c.fillStyle = '#3b2a20'; c.fillRect(106, -430, 9, 400); c.fillRect(-65, -405, 9, 375);
  c.lineWidth = 7; c.beginPath(); c.moveTo(240, -45); c.lineTo(345, -95); c.stroke();
  // fore square sails
  for (const [yy, ww] of [[-385, 120], [-300, 150], [-210, 175], [-120, 195]]) { c.fillStyle = '#3b2a20'; c.fillRect(110 - ww / 2, yy - 4, ww, 7); }
  if (!torn) squareSail(c, 110, -385, -305, 118, 148, 18, false, t, 1);
  squareSail(c, 110, -300, -215, 148, 172, 22, torn, t, 2);
  if (!torn) squareSail(c, 110, -210, -125, 172, 192, 22, false, t, 3);
  // main gaff sail and jib
  fillPoly(c, [[-56, -360], [-56, -70], [-215, -78], [-196, -330]], torn ? PC.sailSh : PC.sail);
  if (torn) fillPoly(c, [[-56, -360], [-56, -220], [-140, -230], [-150, -300]], PC.sail);
  fillPoly(c, [[112, -380], [336, -98], [150, -70]], PC.sail);
  if (torn) { c.strokeStyle = PC.sail; c.lineWidth = 6; c.beginPath(); c.moveTo(250, -150); c.quadraticCurveTo(290 + Math.sin(t * 6) * 20, -120, 320 + Math.sin(t * 7) * 30, -60); c.stroke(); }
  // hull
  c.fillStyle = PC.hull; c.beginPath(); c.moveTo(-235, -30); c.lineTo(205, -30); c.quadraticCurveTo(252, -30, 262, -54); c.lineTo(232, 22); c.quadraticCurveTo(200, 54, 150, 58); c.lineTo(-180, 58); c.quadraticCurveTo(-226, 52, -238, 10); c.closePath(); c.fill();
  c.fillStyle = '#d9cfb8'; c.fillRect(-228, -14, 452, 8);
  c.restore();
}
function lantern(c, x, y, s, swing, t, on = 1) {
  c.save(); c.translate(x, y); c.rotate(swing); c.scale(s, s);
  c.strokeStyle = '#1a1410'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -60); c.lineTo(0, 0); c.stroke();
  if (on) { const f = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3); c.globalCompositeOperation = 'lighter'; glow(c, 0, 50, 260, '255,190,90', 0.38 * f * on); c.globalCompositeOperation = 'source-over'; }
  fillPoly(c, [[-26, 0], [26, 0], [34, 18], [-34, 18]], '#2b2320');
  c.fillStyle = on ? PC.lamp : '#6b6250'; c.beginPath(); c.roundRect(-24, 18, 48, 62, 8); c.fill();
  c.fillStyle = '#2b2320'; c.fillRect(-26, 18, 6, 62); c.fillRect(20, 18, 6, 62); c.fillRect(-30, 80, 60, 12);
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-12, 26, 6, 40);
  c.restore();
}
function barrel(c, x, y, w, h, shade) {
  c.fillStyle = mixHex('#7a4a2a', '#2a1a10', shade); c.beginPath(); c.roundRect(x - w / 2, y - h, w, h, w * 0.18); c.fill();
  c.fillStyle = mixHex('#8f5a34', '#33200f', shade); c.beginPath(); c.ellipse(x, y - h, w / 2, w * 0.14, 0, 0, 7); c.fill();
  c.fillStyle = mixHex('#3a3a3a', '#151515', shade); c.fillRect(x - w / 2, y - h * 0.78, w, h * 0.06); c.fillRect(x - w / 2, y - h * 0.28, w, h * 0.06);
}
function shipWheel(c, x, y, r, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = '#6b4329'; c.lineCap = 'round';
  c.lineWidth = r * 0.12; c.beginPath(); c.arc(0, 0, r * 0.75, 0, 7); c.stroke();
  for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r); c.stroke(); c.lineWidth = r * 0.14; c.beginPath(); c.moveTo(0, -r * 0.9); c.lineTo(0, -r * 1.12); c.stroke(); }
  c.fillStyle = '#8a5a3a'; c.beginPath(); c.arc(0, 0, r * 0.16, 0, 7); c.fill();
  c.restore();
}

// ----- labels in the style of the references: header text, pills, callouts, speech bubbles
function header(c, str, t, t0, y = 260, size = 70) {
  if (t < t0) return;
  const u = prog(t, t0, t0 + 0.25);
  c.save(); c.globalAlpha = u; c.translate(0, -20 * (1 - E.outCubic(u)));
  text(c, str, 540, y, { w: 900, s: size, fill: '#fff', ls: 3, stroke: 'rgba(0,0,0,0.55)', sw: 10, shadow: 'rgba(0,0,0,0.4)', blur: 14 });
  c.restore();
}
function tagPill(c, str, x, y, t, t0, style = 'red', size = 26) {
  if (t < t0) return;
  const u = E.outBack(prog(t, t0, t0 + 0.28), 2);
  const o = { w: 900, s: size, ls: 2 }, w = measure(c, str, o) + size * 1.5, h = size * 1.65;
  c.save(); c.translate(x, y); c.scale(u, u);
  if (style === 'red') { c.fillStyle = PC.red; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill(); text(c, str, 0, 1, { ...o, fill: '#fff' }); }
  else if (style === 'yellow') { c.fillStyle = PC.yellow; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill(); text(c, str, 0, 1, { ...o, fill: '#1b1b1b' }); }
  else { c.fillStyle = 'rgba(15,25,35,0.6)'; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); text(c, str, 0, 1, { ...o, fill: '#fff' }); }
  c.restore();
}
function callout(c, str, px, py, lx, ly, t, t0, style = 'red', size = 26) {
  if (t < t0) return;
  const u = E.outCubic(prog(t, t0, t0 + 0.2));
  c.save(); c.strokeStyle = style === 'red' ? PC.red : style === 'yellow' ? PC.yellow : '#fff'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(px, py); c.lineTo(lerp(px, lx, u), lerp(py, ly, u)); c.stroke();
  c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(px, py, 8, 0, 7); c.fill(); c.restore();
  tagPill(c, str, lx, ly, t, t0 + 0.12, style, size);
}
function bubble(c, str, x, y, t, t0, tailX = -40) {
  if (t < t0) return;
  const u = E.outBack(prog(t, t0, t0 + 0.25), 2.2);
  const o = { w: 900, s: 34, ls: 1 }, w = measure(c, str, o) + 56, h = 76;
  c.save(); c.translate(x, y); c.scale(u, u);
  c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 5;
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 16); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(tailX - 14, h / 2 - 3); c.lineTo(tailX - 6, h / 2 + 30); c.lineTo(tailX + 16, h / 2 - 3); c.fill(); c.stroke();
  c.fillRect(tailX - 12, h / 2 - 6, 26, 6);
  text(c, str, 0, 2, { ...o, fill: '#111' });
  c.restore();
}


// ================================================================== Köpenick: flat people, animals and places (1906)
const KC = {
  skin: '#f2cfae', skinSh: '#e0b48f', prussian: '#24345e', prussianSh: '#1b2747', red: '#c8312b', gold: '#e2b437', brass: '#c99a2e',
  black: '#1d1d22', grey: '#6b6f78', brown: '#7a4a2a', cream: '#f3ead4', brick: '#b5533c', brickSh: '#8f3d2b',
};
// ----- people (front view, flat). o: coat, pants, hat, mustache, beard, glasses, belly, pose, walk, talk, face, facing, apron, chain, epaulettes, medals, sword, rifle, dress, hairCol
function arm(c, sx, sy, ang, col, len = 150) {
  c.save(); c.translate(sx, sy); c.rotate(ang);
  c.fillStyle = col; c.beginPath(); c.roundRect(-17, 0, 34, len, 17); c.fill();
  c.fillStyle = KC.skin; c.beginPath(); c.arc(0, len, 17, 0, 7); c.fill();
  c.restore();
}
function hat(c, type, o) {
  if (type === 'pickel') {
    c.fillStyle = KC.black; c.beginPath(); c.ellipse(0, -452, 72, 52, 0, Math.PI, 0); c.fill(); c.fillRect(-76, -456, 152, 14);
    c.fillStyle = KC.brass; c.beginPath(); c.moveTo(-9, -500); c.lineTo(0, -545); c.lineTo(9, -500); c.fill(); c.fillRect(-12, -504, 24, 8);
    c.beginPath(); c.arc(0, -470, 15, 0, 7); c.fill();
    if (o.plume) { c.fillStyle = '#f4f4f4'; c.beginPath(); c.ellipse(0, -560, 18, 30, 0, 0, 7); c.fill(); }
  } else if (type === 'officer') {
    c.fillStyle = KC.prussian; c.beginPath(); c.roundRect(-76, -500, 152, 46, 18); c.fill();
    c.fillStyle = KC.red; c.fillRect(-70, -470, 140, 14);
    c.fillStyle = KC.black; c.beginPath(); c.ellipse(0, -452, 64, 14, 0, 0, Math.PI); c.fill();
    c.fillStyle = KC.gold; c.beginPath(); c.arc(0, -478, 8, 0, 7); c.fill();
  } else if (type === 'top') {
    c.fillStyle = KC.black; c.fillRect(-48, -560, 96, 110); c.fillRect(-76, -458, 152, 14);
  } else if (type === 'bowler') {
    c.fillStyle = '#2b2b30'; c.beginPath(); c.arc(0, -458, 60, Math.PI, 0); c.fill(); c.fillRect(-80, -462, 160, 12);
  } else if (type === 'cap') {
    c.fillStyle = o.capCol || '#5b5a52'; c.beginPath(); c.ellipse(0, -455, 74, 40, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(30, -452, 60, 12, 0.1, 0, 7); c.fill();
  } else if (type === 'lady') {
    c.fillStyle = o.hatCol || '#7b3f61'; c.beginPath(); c.ellipse(0, -455, 120, 22, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, -478, 60, 36, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#f0c3d4'; c.beginPath(); c.arc(40, -486, 14, 0, 7); c.fill();
  } else if (type === 'bald') {
    c.fillStyle = o.hairCol || '#cfcfcf'; c.beginPath(); c.ellipse(-60, -410, 14, 30, 0, 0, 7); c.ellipse(60, -410, 14, 30, 0, 0, 7); c.fill();
  } else {
    c.fillStyle = o.hairCol || '#4a3628'; c.beginPath(); c.ellipse(0, -448, 66, 34, 0, Math.PI, 0); c.fill();
  }
}
function face(c, o, t) {
  const blink = ((t * 0.7 + (o.seed || 0)) % 3.1) < 0.12 ? 0.12 : 1;
  const shock = o.face === 'shock', happy = o.face === 'happy', angry = o.face === 'angry';
  c.fillStyle = '#1d1d22';
  for (const sx of [-24, 24]) { c.beginPath(); c.ellipse(sx, -415, shock ? 10 : 8, (shock ? 11 : 9) * blink, 0, 0, 7); c.fill(); }
  c.strokeStyle = '#1d1d22'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-36, angry ? -438 : shock ? -446 : -437); c.lineTo(-12, angry ? -430 : shock ? -444 : -437);
  c.moveTo(36, angry ? -438 : shock ? -446 : -437); c.lineTo(12, angry ? -430 : shock ? -444 : -437); c.stroke();
  if (o.glasses) { c.lineWidth = 4; c.beginPath(); c.arc(-24, -415, 17, 0, 7); c.moveTo(41, -415); c.arc(24, -415, 17, 0, 7); c.moveTo(-7, -415); c.lineTo(7, -415); c.stroke(); }
  const talkO = o.talk ? Math.abs(Math.sin(t * 13)) * o.talk : 0;
  if (shock) { c.fillStyle = '#5a1d1d'; c.beginPath(); c.ellipse(0, -372, 12, 16, 0, 0, 7); c.fill(); }
  else if (talkO > 0.05) { c.fillStyle = '#5a1d1d'; c.beginPath(); c.ellipse(0, -374, 14, 4 + 12 * talkO, 0, 0, 7); c.fill(); }
  else { c.beginPath(); if (happy) c.arc(0, -385, 18, 0.2, Math.PI - 0.2); else { c.moveTo(-14, -374); c.lineTo(14, -374); } c.stroke(); }
  if (o.mustache === 'kaiser') {
    c.fillStyle = '#3a2a1e'; c.beginPath(); c.moveTo(0, -392);
    c.bezierCurveTo(-30, -400, -55, -390, -66, -420); c.bezierCurveTo(-60, -392, -30, -380, 0, -384);
    c.bezierCurveTo(30, -380, 60, -392, 66, -420); c.bezierCurveTo(55, -390, 30, -400, 0, -392); c.fill();
  } else if (o.mustache) {
    c.fillStyle = o.mustache === true ? '#5a4030' : o.mustache; c.beginPath(); c.ellipse(-20, -390, 26, 11, 0.15, 0, 7); c.ellipse(20, -390, 26, 11, -0.15, 0, 7); c.fill();
  }
  if (o.beard) { c.fillStyle = o.beard; c.beginPath(); c.moveTo(-50, -400); c.quadraticCurveTo(-46, -330, 0, -322); c.quadraticCurveTo(46, -330, 50, -400); c.quadraticCurveTo(0, -368, -50, -400); c.fill(); }
  c.fillStyle = KC.skinSh; c.beginPath(); c.ellipse(0, -398, 7, 5, 0, 0, 7); c.fill();
}
function person(c, x, ground, s, o, t) {
  if (o.alpha === 0) return;
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x, ground, 90 * s, 14 * s, 0, 0, 7); c.fill();
  c.translate(x, ground); c.scale(s * (o.facing || 1), s);
  const ph = o.walk ?? null, leg = ph !== null ? Math.sin(ph) * 0.38 : 0, bob = ph !== null ? -Math.abs(Math.cos(ph)) * 10 : 0;
  c.translate(0, bob + (o.jump || 0));
  const coat = o.coat || '#55606e', pants = o.pants || '#2e3138', bw = 150 + (o.belly || 0) * 70;
  if (o.dress) { c.fillStyle = o.dress; c.beginPath(); c.moveTo(-90, 0); c.lineTo(90, 0); c.lineTo(48, -200); c.lineTo(-48, -200); c.closePath(); c.fill(); }
  else for (const sd of [-1, 1]) {
    c.save(); c.translate(sd * 26, -175); c.rotate(sd * leg);
    c.fillStyle = pants; c.beginPath(); c.roundRect(-17, 0, 34, 168, 12); c.fill();
    c.fillStyle = '#18181c'; c.beginPath(); c.ellipse(6, 170, 26, 12, 0, 0, 7); c.fill();
    c.restore();
  }
  // arms behind the body when hanging
  const pose = o.pose || 'stand';
  const swing = ph !== null ? Math.sin(ph) * 0.45 : 0;
  const armAng = {
    stand: [-0.1, 0.1], walk: [swing, -swing], salute: [0.1, 2.72], point: [0.1, -1.5], up: [-2.7, 2.7], hammer: [0.25, 2.2 + Math.sin(t * 16) * 0.5],
    hold: [0.1, 0.9], shrug: [-0.9, 0.9], wave: [0.1, 2.6 + Math.sin(t * 10) * 0.3], carry: [0.6, -0.6],
  }[pose];
  const shY = -322, shX = bw / 2 - 10;
  c.fillStyle = coat; c.beginPath(); c.roundRect(-bw / 2, -345, bw, 190, [44, 44, 18, 18]); c.fill();
  if (o.long) { c.beginPath(); c.moveTo(-bw / 2, -170); c.lineTo(bw / 2, -170); c.lineTo(bw / 2 + 10, -70); c.lineTo(-bw / 2 - 10, -70); c.closePath(); c.fill(); }
  if (o.apron) { c.fillStyle = o.apron; c.beginPath(); c.roundRect(-55, -300, 110, 230, 14); c.fill(); }
  if (o.trim) { c.fillStyle = KC.red; c.fillRect(-26, -345, 52, 18); }
  if (o.buttons) { c.fillStyle = KC.gold; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(0, -305 + k * 36, 6, 0, 7); c.fill(); } }
  if (o.belt) { c.fillStyle = '#1b1b1b'; c.fillRect(-bw / 2, -195, bw, 16); c.fillStyle = KC.gold; c.fillRect(-12, -197, 24, 20); }
  if (o.chain) { c.strokeStyle = KC.gold; c.lineWidth = 6; c.beginPath(); c.arc(0, -330, 58, 0.25, Math.PI - 0.25); c.stroke(); c.fillStyle = KC.gold; c.beginPath(); c.arc(0, -268, 14, 0, 7); c.fill(); }
  if (o.medals) { for (let k = 0; k < 3; k++) { c.fillStyle = [KC.gold, '#d0d4da', KC.red][k]; c.beginPath(); c.arc(-48 + k * 22, -285, 9, 0, 7); c.fill(); } }
  if (o.epaulettes) { c.fillStyle = KC.gold; c.beginPath(); c.ellipse(-bw / 2 + 12, -340, 30, 12, 0, 0, 7); c.ellipse(bw / 2 - 12, -340, 30, 12, 0, 0, 7); c.fill(); }
  if (o.sword) { c.strokeStyle = '#c9ced6'; c.lineWidth = 7; c.beginPath(); c.moveTo(-bw / 2 + 10, -190); c.lineTo(-bw / 2 - 20, -20); c.stroke(); c.fillStyle = KC.gold; c.fillRect(-bw / 2 - 2, -205, 22, 12); }
  arm(c, -shX, shY, armAng[0], coat);
  arm(c, shX, shY, armAng[1], coat);
  if (o.rifle) { c.save(); c.translate(-shX - 10, -200); c.rotate(-0.25); c.fillStyle = '#4a3020'; c.fillRect(-7, -260, 14, 280); c.fillStyle = '#55585f'; c.fillRect(-4, -300, 8, 60); c.restore(); }
  if (o.box) { c.fillStyle = '#4a4d55'; c.beginPath(); c.roundRect(40, -270, 120, 90, 10); c.fill(); c.fillStyle = KC.gold; c.fillRect(90, -240, 20, 20); }
  if (o.paper) { c.save(); c.translate(shX + 20, shY - 170); c.rotate(-0.2); c.fillStyle = '#f2eee2'; c.fillRect(-60, -80, 120, 150); c.fillStyle = '#333'; c.fillRect(-48, -66, 96, 14); for (let k = 0; k < 5; k++) c.fillRect(-48, -40 + k * 18, 96, 5); c.restore(); }
  if (pose === 'hammer') { const an = armAng[1], hx = shX - Math.sin(an) * 150, hy = shY + Math.cos(an) * 150; c.save(); c.translate(hx, hy); c.rotate(an + Math.PI / 2); c.fillStyle = '#7a4a2a'; c.fillRect(-6, -10, 80, 12); c.fillStyle = '#55585f'; c.fillRect(70, -26, 22, 44); c.restore(); }
  if (o.shoe) { c.fillStyle = '#3b2418'; c.beginPath(); c.ellipse(-shX + 30, shY + 160, 50, 22, -0.2, 0, 7); c.fill(); }
  // head
  c.fillStyle = KC.skin; c.fillRect(-16, -360, 32, 30);
  c.beginPath(); c.arc(0, -405, 64, 0, 7); c.fill();
  c.beginPath(); c.arc(-64, -405, 12, 0, 7); c.arc(64, -405, 12, 0, 7); c.fill();
  face(c, o, t);
  hat(c, o.hat || 'hair', o);
  c.restore();
}
// ----- animals
function horse(c, x, ground, s, t, facing = 1, carriage = true) {
  c.save(); c.translate(x, ground); c.scale(s * facing, s);
  const tr = t * 11;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(-120, 0, 330, 18, 0, 0, 7); c.fill();
  if (carriage) {
    c.strokeStyle = '#3a2a1e'; c.lineWidth = 8; c.beginPath(); c.moveTo(-60, -150); c.lineTo(-210, -150); c.stroke();
    c.fillStyle = '#1f2a2e'; c.beginPath(); c.roundRect(-470, -330, 260, 200, 26); c.fill();
    c.fillStyle = '#f5d98a'; c.beginPath(); c.roundRect(-430, -300, 80, 80, 10); c.fill(); c.beginPath(); c.roundRect(-330, -300, 80, 80, 10); c.fill();
    c.fillStyle = '#c99a2e'; c.fillRect(-470, -160, 260, 10);
    for (const wx of [-420, -260]) { c.save(); c.translate(wx, -60); c.rotate(-tr * 0.5); c.strokeStyle = '#2a1d14'; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 58, 0, 7); c.stroke(); c.lineWidth = 5; for (let k = 0; k < 6; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 56); c.stroke(); } c.restore(); }
    person(c, -330, -330, 0.38, { coat: '#2f3340', hat: 'top', mustache: true, pose: 'hold', seed: 3 }, t);
  }
  for (const [lx, ph] of [[-110, 0], [-80, Math.PI], [70, Math.PI], [100, 0]]) {
    c.save(); c.translate(lx, -110); c.rotate(Math.sin(tr + ph) * 0.45); c.fillStyle = '#6b3e22'; c.fillRect(-9, 0, 18, 104); c.fillStyle = '#2a1a10'; c.fillRect(-11, 98, 22, 12); c.restore();
  }
  c.fillStyle = '#8a5230'; c.beginPath(); c.ellipse(0, -150, 140, 62, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(80, -190); c.lineTo(150, -290); c.lineTo(190, -270); c.lineTo(130, -150); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(200, -270, 56, 26, 0.5, 0, 7); c.fill();
  c.fillStyle = '#3a2214'; c.beginPath(); c.moveTo(90, -200); c.lineTo(150, -300); c.lineTo(160, -285); c.lineTo(110, -180); c.fill();
  c.beginPath(); c.moveTo(-140, -160); c.quadraticCurveTo(-190 + Math.sin(t * 5) * 10, -120, -180, -60); c.lineTo(-165, -60); c.quadraticCurveTo(-170, -120, -130, -150); c.fill();
  c.fillStyle = '#1d1d22'; c.beginPath(); c.arc(208, -282, 5, 0, 7); c.fill();
  c.restore();
}
function dog(c, x, ground, s, t, bark) {
  c.save(); c.translate(x, ground - (bark ? Math.abs(Math.sin(t * 14)) * 8 : 0)); c.scale(s, s);
  c.fillStyle = '#a0683c'; c.beginPath(); c.ellipse(0, -60, 70, 34, 0, 0, 7); c.fill();
  for (const lx of [-45, -25, 30, 50]) c.fillRect(lx - 6, -40, 12, 40);
  c.beginPath(); c.arc(70, -95, 32, 0, 7); c.fill();
  c.fillStyle = '#6e4423'; c.beginPath(); c.ellipse(58, -122, 12, 24, -0.4, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-68, -70); c.lineTo(-110, -110 + Math.sin(t * 15) * 10); c.lineTo(-64, -58); c.fill();
  c.fillStyle = '#1d1d22'; c.beginPath(); c.arc(80, -100, 5, 0, 7); c.arc(102, -92, 6, 0, 7); c.fill();
  c.restore();
}
function pigeons(c, t, list) {
  for (const [x, y, k] of list) {
    const peck = Math.max(0, Math.sin(t * 6 + k * 2)) * 8;
    c.fillStyle = '#7b8494'; c.beginPath(); c.ellipse(x, y, 26, 16, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(x - 22, y - 14 + peck, 10, 0, 7); c.fill(); c.fillStyle = '#f59e0b'; c.fillRect(x - 36, y - 14 + peck, 8, 4);
  }
}
// ----- places
function berlinRow(w, h, base, seed, cols) {
  const cv2 = mk(w, h), c = cv2.getContext('2d'), R = rng(seed);
  let x = -10;
  while (x < w) {
    const bw = 200 + R() * 120, bh = 520 + R() * 200, top = base - bh, col = cols[Math.floor(R() * cols.length)];
    c.fillStyle = col; c.fillRect(x, top, bw, bh);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, top, bw, 18); c.fillRect(x, top + 150, bw, 10);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, top + 140, bw, 8);
    for (let wy = top + 50; wy < base - 170; wy += 115) for (let wx = x + 26; wx < x + bw - 40; wx += 62) {
      c.fillStyle = '#f7f1e3'; c.fillRect(wx - 5, wy - 5, 42, 72); c.fillStyle = R() < 0.25 ? '#ffd98a' : '#5f7f9a'; c.fillRect(wx, wy, 32, 62);
      c.fillStyle = '#f7f1e3'; c.fillRect(wx + 14, wy, 4, 62);
    }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 20, base - 160, bw - 40, 140);
    c.fillStyle = ['#2f6b52', '#8a2f2f', '#2d4a7a'][Math.floor(R() * 3)]; c.fillRect(x + 14, base - 175, bw - 28, 26);
    x += bw;
  }
  return cv2;
}
function street(c, y0, col1, col2) {
  c.fillStyle = col1; c.fillRect(0, y0, W, H - y0);
  c.fillStyle = col2; c.fillRect(0, y0, W, 26);
  c.strokeStyle = 'rgba(0,0,0,0.09)'; c.lineWidth = 2;
  for (let y = y0 + 40; y < H; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 34 % 2) * 30; x < W; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 34); c.stroke(); } }
}
function gasLamp(c, x, base, h) {
  c.fillStyle = '#26303a'; c.fillRect(x - 6, base - h, 12, h); c.fillRect(x - 20, base - 12, 40, 12);
  c.fillStyle = '#f3e3a8'; c.beginPath(); c.moveTo(x - 24, base - h - 60); c.lineTo(x + 24, base - h - 60); c.lineTo(x + 16, base - h); c.lineTo(x - 16, base - h); c.closePath(); c.fill();
  c.fillStyle = '#26303a'; c.beginPath(); c.moveTo(x - 30, base - h - 60); c.lineTo(x, base - h - 86); c.lineTo(x + 30, base - h - 60); c.fill();
}
function rathaus(c, x, base, s, t) {
  c.save(); c.translate(x, base); c.scale(s, s);
  c.fillStyle = KC.brick; c.fillRect(-420, -620, 840, 620);
  c.fillStyle = KC.brickSh; for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(-420 + k * 120, -620); c.lineTo(-360 + k * 120, -690); c.lineTo(-300 + k * 120, -620); c.fill(); }
  c.fillStyle = KC.brick; c.fillRect(-70, -1000, 140, 400);
  c.fillStyle = '#33465a'; c.beginPath(); c.moveTo(-85, -1000); c.lineTo(0, -1200); c.lineTo(85, -1000); c.fill();
  c.fillStyle = KC.cream; c.beginPath(); c.arc(0, -910, 42, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -910); c.lineTo(0, -940); c.moveTo(0, -910); c.lineTo(20, -900); c.stroke();
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
    if (r === 1 && (k === 2 || k === 3)) continue;
    const wx = -360 + k * 130, wy = -540 + r * 240;
    c.fillStyle = KC.cream; c.beginPath(); c.roundRect(wx - 6, wy - 6, 82, 152, [40, 40, 4, 4]); c.fill();
    c.fillStyle = '#55708a'; c.beginPath(); c.roundRect(wx, wy, 70, 140, [35, 35, 2, 2]); c.fill();
  }
  c.fillStyle = KC.cream; c.beginPath(); c.roundRect(-90, -250, 180, 250, [90, 90, 0, 0]); c.fill();
  c.fillStyle = '#3a2418'; c.beginPath(); c.roundRect(-74, -234, 148, 234, [74, 74, 0, 0]); c.fill();
  c.fillStyle = KC.cream; c.fillRect(-180, -300, 360, 40); text(c, 'RATHAUS', 0, -279, { w: 900, s: 30, fill: KC.brickSh, ls: 6 });
  c.restore();
}
function newspaper(c, x, y, w, rot, head, sub, lang) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = '#f5f0e1'; c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 20; c.shadowOffsetY = 8; c.fillRect(-w / 2, -w * 0.65, w, w * 1.3); c.shadowColor = 'transparent';
  c.fillStyle = '#222'; c.fillRect(-w / 2 + 20, -w * 0.65 + 20, w - 40, 6);
  text(c, lang, 0, -w * 0.65 + 50, { w: 800, s: w * 0.06, fill: '#555', ls: 3 });
  text(c, head, 0, -w * 0.38, { w: 900, s: w * 0.1, fill: '#111' });
  text(c, sub, 0, -w * 0.26, { w: 900, s: w * 0.1, fill: '#111' });
  c.fillStyle = '#bbb'; c.fillRect(-w / 2 + 24, -w * 0.15, w * 0.42, w * 0.5);
  c.fillStyle = '#999'; for (let k = 0; k < 9; k++) c.fillRect(-w / 2 + 24 + w * 0.48, -w * 0.15 + k * w * 0.06, w * 0.4, w * 0.025);
  c.restore();
}
function mapInset(c, t, t0) {
  if (t < t0) return;
  const u = E.outBack(prog(t, t0, t0 + 0.3), 1.4);
  c.save(); c.translate(290, 420); c.scale(u, u);
  c.fillStyle = '#f3ead4'; c.strokeStyle = '#3b3b3b'; c.lineWidth = 4; c.beginPath(); c.roundRect(-230, -190, 460, 380, 24); c.fill(); c.stroke();
  c.fillStyle = '#cfe3c1'; c.beginPath(); c.roundRect(-210, -170, 420, 340, 16); c.fill();
  c.strokeStyle = '#7fb3d5'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-210, -30); c.bezierCurveTo(-80, -60, 0, 40, 210, 120); c.stroke();
  c.fillStyle = '#d9b8a0'; c.beginPath(); c.ellipse(-110, -70, 90, 70, 0, 0, 7); c.fill();
  const ru = E.inOutCubic(prog(t, t0 + 0.2, t0 + 1.2));
  c.strokeStyle = KC.red; c.lineWidth = 7; c.setLineDash([16, 12]); c.beginPath(); c.moveTo(-110, -70);
  for (let i = 1; i <= 30 * ru; i++) { const s2 = i / 30; c.lineTo(lerp(-110, 130, s2), lerp(-70, 70, s2) - Math.sin(s2 * Math.PI) * 50); } c.stroke(); c.setLineDash([]);
  c.fillStyle = '#222'; c.beginPath(); c.arc(-110, -70, 10, 0, 7); c.arc(130, 70, 10, 0, 7); c.fill();
  text(c, 'BERLIN', -110, -120, { w: 900, s: 30, fill: '#222' });
  text(c, 'KÖPENICK', 120, 115, { w: 900, s: 30, fill: KC.red });
  c.restore();
}

// ------------------------------------------------------------------ init
window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await document.fonts.load(font(800, 60, 'JBMono'));
  await prepCharacter(); prepRig();
  SPR.grain = makeGrain(); SPR.dot = makeSnowSprite();
  SPR.row1 = berlinRow(1400, 1500, 1420, 3, ['#e3c9a1', '#d9b38a', '#cfd6c4', '#e8c3b0', '#d8cbb0']);
  SPR.row2 = berlinRow(1400, 1600, 1500, 9, ['#c9b48f', '#b9a07c', '#c4c9b8', '#d3a991']);
  const C = CUES;
  SHOTS = [
    { a: 0, draw: shBerlin, f: [540, 1100], z: [1.0, 1.06] },
    { a: C.schuster, draw: shSchuster, f: [540, 1100], z: [1.0, 1.07] },
    { a: C.troedler, draw: shTroedler, f: [540, 1100], z: [1.0, 1.06] },
    { a: C.uniform, draw: shDressUp, f: [540, 1000], z: [1.0, 1.08] },
    { a: C.street, draw: shOrders, f: [540, 1150], z: [1.0, 1.06] },
    { a: C.soldiers, draw: shSoldiers, f: [540, 1200], z: [1.0, 1.05] },
    { a: C.train, draw: shTrain, f: [540, 1100], z: [1.0, 1.06] },
    { a: C.rathaus, draw: shRathaus, f: [540, 1000], z: [1.0, 1.06] },
    { a: C.mayor, draw: shMayor, f: [600, 1200], z: [1.0, 1.06] },
    { a: C.kasse, draw: shKasse, f: [540, 1000], z: [1.0, 1.07] },
    { a: C.arrest, draw: shArrest, f: [540, 1100], z: [1.0, 1.06] },
    { a: C.kaiser, draw: shKaiser, f: [540, 900], z: [1.0, 1.07] },
    { a: C.famous, draw: shFamous, f: [540, 900], z: [1.0, 1.06] },
    { a: C.end, draw: shEnd, f: [560, 1150], z: [1.0, 1.1] },
  ];
  SHOTS.forEach((s, i) => (s.b = i + 1 < SHOTS.length ? SHOTS[i + 1].a : DUR + 1));
  WORDS = TL.lines.flatMap(l => l.phrases.flatMap(p => p.words));
  return { frames: Math.round(DUR * FPS) };
};

// ------------------------------------------------------------------ captions: one word at a time, white with yellow key words
const CAP_Y = 960, CAP_SIZE = 64;
function drawCaptions(c, t) {
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i], nxt = WORDS[i + 1];
    const end = nxt && nxt.start - w.end < 0.6 ? nxt.start - 0.03 : w.end + 0.3;
    if (t >= w.start - 0.04 && t < end) { idx = i; break; }
  }
  if (idx < 0) return;
  const w = WORDS[idx], txt = w.text.replace(/[.,:]+$/, '').toUpperCase();
  const u = prog(t, w.start - 0.04, w.start + 0.1);
  const s = lerp(0.7, 1, E.outBack(u, 2.2));
  const o = { w: 900, s: CAP_SIZE, ls: 1 };
  const fit = Math.min(1, 940 / measure(c, txt, o));
  c.save(); c.translate(540, CAP_Y); c.scale(s * fit, s * fit); c.globalAlpha = clamp(u * 3);
  text(c, txt, 0, 0, { ...o, fill: w.key ? PC.yellow : '#fff', stroke: '#0a0a12', sw: 12, shadow: 'rgba(0,0,0,0.6)', blur: 10, sy: 4, keepShadow: true });
  c.restore();
}

// ------------------------------------------------------------------ shots
const VOIGT = { coat: '#6b5a48', pants: '#3a332c', hat: 'cap', capCol: '#4a4238', mustache: '#6a5a4a', seed: 1 };
const CAPTAIN = { coat: KC.prussian, pants: '#22283a', hat: 'officer', mustache: '#6a5a4a', buttons: true, trim: true, epaulettes: true, belt: true, sword: true, long: true, seed: 1 };
const SOLDIER = { coat: KC.prussian, pants: '#22283a', hat: 'pickel', buttons: true, trim: true, belt: true, rifle: true };
function sky(c, top, bot, h) { c.fillStyle = lin(c, 0, 0, 0, h, [[0, top], [1, bot]]); c.fillRect(0, 0, W, h); }
const WALK0 = [0.2, 1.7, 0.25];
function shBerlin(c, t, lt) {
  sky(c, '#8ec5e8', '#fde3c3', 1300);
  for (let k = 0; k < 3; k++) flatCloud(c, ((k * 420 + t * 20) % 1500) - 200, 260 + k * 170, 300, '#ffffff');
  birds(c, t, 6, 4, 'rgba(60,60,80,0.7)', 380);
  c.drawImage(SPR.row1, -100 - t * 12, 0);
  // autumn trees
  for (let k = 0; k < 4; k++) { const x = 140 + k * 270 - t * 18; c.fillStyle = '#5a3b26'; c.fillRect(x - 8, 1330, 16, 140); c.fillStyle = k % 2 ? '#e08a2e' : '#d0612b'; c.beginPath(); c.arc(x, 1300, 80, 0, 7); c.arc(x - 50, 1340, 55, 0, 7); c.arc(x + 50, 1340, 55, 0, 7); c.fill(); }
  street(c, 1470, '#a3a3a3', '#c7c2b8');
  gasLamp(c, 940 - t * 25, 1500, 420);
  person(c, 760 - t * 40, 1600, 0.7, { dress: '#7b3f61', coat: '#7b3f61', hat: 'lady', pose: 'walk', walk: t * 7, facing: -1, seed: 2 }, t);
  person(c, 900 - t * 30, 1630, 0.72, { coat: '#3e4a3a', hat: 'bowler', mustache: true, pose: 'walk', walk: t * 7 + 1, facing: -1, seed: 4 }, t);
  horse(c, lerp(1500, -500, t / 2.2), 1760, 0.7, t, -1, true);
  header(c, 'BERLIN, 1906', t, CUES.year - 0.05, 260, 84);
  const w0 = walk(t, WALK0[0], WALK0[1], -150, 250, WALK0[2]);
  drawHost(c, { pose: 'serious', x: w0.x, ground: 1880, s: 0.42, flip: 1, air: w0.bob, lean: w0.lean, head: Math.sin(t * 2) * 0.03, alpha: 1 }, t);
}
function shSchuster(c, t, lt) {
  c.fillStyle = '#c9a27a'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#b48c63'; for (let x = 0; x < W; x += 110) c.fillRect(x, 0, 6, 1500);
  c.fillStyle = '#7fb3d5'; c.fillRect(620, 260, 340, 420); c.fillStyle = '#f3ead4'; c.fillRect(620, 260, 340, 14); c.fillRect(785, 260, 10, 420); c.fillRect(620, 460, 340, 10); c.fillRect(620, 666, 340, 14);
  c.save(); c.globalAlpha = 0.25; c.fillStyle = '#fff6d0'; c.beginPath(); c.moveTo(620, 680); c.lineTo(960, 680); c.lineTo(700, 1500); c.lineTo(250, 1500); c.closePath(); c.fill(); c.restore();
  c.fillStyle = '#6b4329'; c.fillRect(60, 520, 420, 20);
  for (let k = 0; k < 4; k++) { c.fillStyle = ['#3b2418', '#7a4a2a', '#1d1d22', '#5a3a28'][k]; c.beginPath(); c.ellipse(120 + k * 100, 500, 42, 18, 0, 0, 7); c.fill(); }
  c.fillStyle = '#5a3a28'; c.fillRect(0, 1500, W, 420);
  c.fillStyle = '#8a5a3a'; c.fillRect(180, 1350, 700, 40); c.fillRect(220, 1390, 30, 160); c.fillRect(810, 1390, 30, 160);
  person(c, 540, 1720, 1.25, { ...VOIGT, apron: '#8a6a4a', pose: 'hammer', shoe: true, face: 'neutral' }, t);
  tagPill(c, 'SCHUSTER', 540, 300 + 80, t, CUES.schuster + 0.1, 'white');
  tagPill(c, 'ARBEITSLOS', 790, 760, t, CUES.schuster + 0.5, 'red');
  // little "no money" coin icon
  if (t > CUES.schuster + 0.8) { const u = E.outBack(prog(t, CUES.schuster + 0.8, CUES.schuster + 1.1), 2); c.save(); c.translate(250, 760); c.scale(u, u); c.fillStyle = KC.gold; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill(); c.strokeStyle = KC.red; c.lineWidth = 9; c.beginPath(); c.moveTo(-50, -50); c.lineTo(50, 50); c.stroke(); c.restore(); }
}
function shopInterior(c, t) {
  c.fillStyle = '#5d3a5a'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#6c4569'; for (let y = 0; y < 1500; y += 120) c.fillRect(0, y, W, 4);
  lantern(c, 540, 120, 1.1, Math.sin(t * 1.3) * 0.08, t, 1);
  c.fillStyle = '#3a2418'; c.fillRect(80, 380, 920, 14);
  const cols = ['#8a2f2f', '#2d4a7a', '#4a6b3a', '#7a5a2a', KC.prussian, '#6b6b6b', '#9a5a7a'];
  for (let k = 0; k < 7; k++) {
    const x = 140 + k * 130, sw = Math.sin(t * 1.5 + k) * 0.04;
    c.save(); c.translate(x, 394); c.rotate(sw);
    c.strokeStyle = '#ccc'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 20); c.stroke();
    c.fillStyle = cols[k]; c.beginPath(); c.moveTo(-55, 30); c.lineTo(55, 30); c.lineTo(62, 300); c.lineTo(-62, 300); c.closePath(); c.fill();
    c.restore();
  }
  c.fillStyle = '#3a2418'; c.fillRect(0, 1500, W, 420);
}
function shTroedler(c, t, lt) {
  const a = CUES.troedler;
  shopInterior(c, t);
  person(c, 820, 1420, 0.95, { coat: '#5a4636', pants: '#333', hat: 'bald', hairCol: '#d0d0d0', beard: '#d0d0d0', glasses: true, belly: 0.4, pose: lt > 0.6 ? 'hold' : 'stand', talk: 0.6, seed: 5 }, t);
  c.fillStyle = '#7a4a2a'; c.fillRect(560, 1250, 520, 260); c.fillStyle = '#8f5a34'; c.fillRect(540, 1230, 540, 30);
  person(c, 300, 1760, 1.05, { ...VOIGT, pose: lt > 0.5 ? 'point' : 'stand', facing: 1 }, t);
  if (lt > 0.6) for (let k = 0; k < 3; k++) { const u = prog(t, a + 0.6 + k * 0.1, a + 0.9 + k * 0.1); if (u <= 0) continue; c.fillStyle = KC.gold; c.beginPath(); c.arc(lerp(440, 650, u), 1230 - Math.sin(u * Math.PI) * 120, 16, 0, 7); c.fill(); }
  tagPill(c, 'TRÖDELHÄNDLER', 820, 520, t, a + 0.1, 'white');
  bubble(c, 'DIE DA, BITTE!', 380, 760, t, a + 0.45, -40);
}
function shDressUp(c, t, lt) {
  const a = CUES.uniform;
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1f3b73'], [1, '#2f5aa8']]); c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.22; c.fillStyle = '#fff3c4'; c.beginPath(); c.moveTo(440, 0); c.lineTo(640, 0); c.lineTo(860, 1650); c.lineTo(220, 1650); c.closePath(); c.fill(); c.restore();
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(540, 1720, 320, 54, 0, 0, 7); c.fill();
  const p1 = prog(t, a + 0.05, a + 0.3), p2 = prog(t, a + 0.33, a + 0.58), p3 = prog(t, a + 0.61, a + 0.86);
  const o = p1 >= 1 ? { ...CAPTAIN, hat: p2 >= 1 ? 'officer' : 'cap', capCol: '#4a4238', sword: p3 >= 1 } : { ...VOIGT };
  const pop2 = 1 + 0.08 * bump(t, a + 0.05, 0.25) + 0.08 * bump(t, a + 0.33, 0.25) + 0.08 * bump(t, a + 0.61, 0.25);
  person(c, 540, 1720, 1.3 * pop2, { ...o, pose: p3 >= 1 ? 'salute' : 'stand', face: p3 >= 1 ? 'happy' : 'neutral' }, t);
  for (const [p, lbl, x, y, px, py] of [[p1, 'MANTEL', 0, 0, 500, 1420], [p2, 'MÜTZE', 0, 0, 560, 1090], [p3, 'SÄBEL', 0, 0, 400, 1600]]) {
    if (p > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, px, py, 120 * (1 - p) + 20, '255,230,150', 0.5 * (1 - p)); c.restore(); }
  }
  callout(c, 'MANTEL', 500, 1420, 200, 1290, t, a + 0.08, 'white', 28);
  callout(c, 'MÜTZE', 590, 1090, 860, 760, t, a + 0.36, 'white', 28);
  callout(c, 'SÄBEL', 400, 1600, 190, 1680, t, a + 0.64, 'white', 28);
  header(c, 'HAUPTMANN', t, a + 0.9, 260, 86);
  if (t > a + 0.85) drawEmote(c, 'sparkle', 700, 1060, prog(t, a + 0.85, a + 1.0), t);
}
function shOrders(c, t, lt) {
  const a = CUES.street, bf = CUES.befehle;
  sky(c, '#9fd0f0', '#e9f4fb', 1200);
  c.drawImage(SPR.row2, -80 - lt * 15, -60);
  street(c, 1440, '#9b9b9b', '#bdb7ab');
  gasLamp(c, 150, 1480, 420);
  person(c, 470, 1770, 1.1, { ...CAPTAIN, pose: t > bf - 0.3 ? 'point' : 'stand', talk: t > a + 0.3 ? 0.9 : 0, face: 'angry' }, t);
  bubble(c, 'HALT! MIR NACH!', 470, 560, t, bf - 0.25, -30);
  person(c, 880, 1700, 0.75, { dress: '#3f6b7a', coat: '#3f6b7a', hat: 'lady', hatCol: '#8a2f5a', face: t > bf ? 'shock' : 'neutral', pose: t > bf ? 'up' : 'stand', seed: 7 }, t);
  dog(c, 760, 1800, 0.8, t, t > bf + 0.3);
  if (t > bf + 0.35) bubble(c, 'WUFF!', 820, 1560, t, bf + 0.35, -40);
  drawHost(c, { pose: 'serious', x: 170, ground: 1890, s: 0.42, flip: 1, head: 0.06 * Math.sin(t * 3), alpha: 1, emote: t > bf ? '?' : null, emoteU: prog(t, bf, bf + 0.25) }, t);
}
function shSoldiers(c, t, lt) {
  const a = CUES.soldiers, so = CUES.sofort;
  sky(c, '#7fc0ea', '#dff1fb', 1250);
  for (let k = 0; k < 3; k++) flatCloud(c, ((k * 400 + t * 15) % 1500) - 200, 300 + k * 150, 320, '#ffffff');
  c.drawImage(SPR.row1, -200, -80);
  c.fillStyle = '#d9c7a0'; c.fillRect(0, 1350, W, 570);
  const stopped = t > so - 0.1;
  for (let k = 0; k < 5; k++) {
    const x = (stopped ? 160 : lerp(-300, 160, prog(t, a, so))) + k * 190, march = stopped ? null : t * 9 + k * 0.2;
    person(c, x, 1680 + (k % 2) * 50, 0.82, { ...SOLDIER, pose: stopped ? 'salute' : 'walk', walk: march, facing: 1, seed: k + 10 }, t);
  }
  tagPill(c, 'SOLDATEN', 540, 300, t, a + 0.05, 'white');
  if (stopped) { const u = E.outBack(prog(t, so, so + 0.25), 2.5); c.save(); c.translate(540, 520); c.scale(u, u); tagPill(c, 'JAWOHL, HERR HAUPTMANN!', 0, 0, t, so, 'red', 30); c.restore(); }
}
function shTrain(c, t, lt) {
  const a = CUES.train;
  sky(c, '#86c7ee', '#f2e6c8', 1250);
  for (let k = 0; k < 3; k++) flatCloud(c, ((k * 420 + t * 25) % 1600) - 200, 320 + k * 120, 300, '#ffffff');
  c.fillStyle = '#9cc77a'; c.fillRect(0, 1150, W, 770);
  c.fillStyle = '#7fb35e'; for (let k = 0; k < 8; k++) { const x = ((k * 170 - lt * 260) % 1360 + 1360) % 1360 - 140; c.beginPath(); c.arc(x, 1160, 70, Math.PI, 0); c.fill(); }
  c.fillStyle = '#6aa3c9'; c.fillRect(0, 1640, W, 90);
  // train on a track
  c.fillStyle = '#5a4a3a'; c.fillRect(0, 1500, W, 14);
  const tx = lerp(-200, 260, prog(t, a, a + 1.6));
  for (let k = 0; k < 3; k++) {
    const x = tx - k * 330;
    c.fillStyle = '#2f5d3a'; c.beginPath(); c.roundRect(x, 1340, 310, 150, 14); c.fill();
    for (let j = 0; j < 4; j++) { c.fillStyle = '#cfe6f0'; c.fillRect(x + 20 + j * 72, 1365, 54, 54); c.fillStyle = KC.black; c.beginPath(); c.ellipse(x + 47 + j * 72, 1400, 18, 13, 0, Math.PI, 0); c.fill(); c.fillStyle = KC.brass; c.beginPath(); c.moveTo(x + 44 + j * 72, 1388); c.lineTo(x + 47 + j * 72, 1374); c.lineTo(x + 50 + j * 72, 1388); c.fill(); }
    for (const wx of [x + 60, x + 250]) { c.fillStyle = '#222'; c.beginPath(); c.arc(wx, 1495, 22, 0, 7); c.fill(); }
  }
  c.fillStyle = '#1d1d22'; c.beginPath(); c.roundRect(tx + 330, 1360, 260, 130, 14); c.fill(); c.fillRect(tx + 480, 1300, 110, 190); c.fillRect(tx + 360, 1300, 36, 70);
  c.fillStyle = KC.red; c.fillRect(tx + 330, 1480, 260, 12);
  for (let k = 0; k < 3; k++) { const wx = tx + 370 + k * 80; c.fillStyle = '#8a1d1d'; c.beginPath(); c.arc(wx, 1490, 28, 0, 7); c.fill(); }
  for (let k = 0; k < 8; k++) { const age = (lt * 3 + k / 8) % 1; c.globalAlpha = 0.6 * (1 - age); c.drawImage(SPR.dot, tx + 378 - age * 260 - 30 - age * 40, 1280 - age * 200 - 30 - age * 40, 60 + age * 80, 60 + age * 80); }
  c.globalAlpha = 1;
  mapInset(c, t, a + 0.05);
}
function shRathaus(c, t, lt) {
  const a = CUES.rathaus;
  sky(c, '#8fcbef', '#eaf5fb', 1300);
  for (let k = 0; k < 2; k++) flatCloud(c, ((k * 500 + t * 18) % 1500) - 200, 260 + k * 200, 340, '#ffffff');
  rathaus(c, 540, 1460, 0.95, t);
  street(c, 1460, '#a8a29a', '#c7c0b4');
  person(c, 430, 1520, 0.52, { ...SOLDIER, rifle: true, seed: 21 }, t);
  person(c, 650, 1520, 0.52, { ...SOLDIER, rifle: true, seed: 22 }, t);
  pigeons(c, t, [[180, 1700, 0], [250, 1740, 1], [880, 1720, 2]]);
  if (lt > 0.2) { for (let k = 0; k < 3; k++) { const u = prog(t, a + 0.15 + k * 0.05, a + 1.2); const x = 560 + k * 60 + u * 400, y = 1700 - u * 500; c.fillStyle = '#7b8494'; c.beginPath(); c.ellipse(x, y, 24, 12, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x - 30, y - 30 * Math.sin(t * 30)); c.lineTo(x + 10, y); c.fill(); } }
  tagPill(c, 'RATHAUS KÖPENICK', 540, 230, t, a + 0.05, 'red');
  drawHost(c, { pose: 'serious', x: 900, ground: 1880, s: 0.42, flip: -1, head: -0.06, alpha: 1, emote: t > a + 0.3 ? '!' : null, emoteU: prog(t, a + 0.3, a + 0.5) }, t);
}
function shMayor(c, t, lt) {
  const a = CUES.mayor, mw = CUES.mayorWord;
  c.fillStyle = '#3f6b55'; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.12; c.fillStyle = '#e8f0d0'; for (let y = 60; y < 1400; y += 120) for (let x = (y / 120 % 2) * 60; x < W; x += 120) { star(c, x, y, 16, 4, 0.4); c.fill(); } c.restore();
  c.fillStyle = '#c99a2e'; c.fillRect(300, 300, 480, 340); c.fillStyle = '#8fb7c9'; c.fillRect(320, 320, 440, 300); c.fillStyle = '#6a9a5a'; c.fillRect(320, 520, 440, 100);
  c.fillStyle = '#4a2e1c'; c.fillRect(0, 1500, W, 420);
  const led = prog(t, mw + 0.5, a + 2.0);
  const mx = lerp(420, 160, E.inCubic(led));
  c.fillStyle = '#6b4329'; c.fillRect(120, 1300, 600, 40); c.fillRect(150, 1340, 40, 220); c.fillRect(650, 1340, 40, 220);
  c.fillStyle = '#f3ead4'; c.fillRect(250, 1270, 150, 30);
  person(c, mx, 1700, 1.0, { coat: '#1f1f26', pants: '#2b2b33', hat: 'bald', hairCol: '#7a6a5a', mustache: '#7a6a5a', chain: true, belly: 0.7, face: t > mw ? 'shock' : 'neutral', pose: t > mw && led < 0.05 ? 'up' : 'stand', walk: led > 0 && led < 1 ? t * 8 : null, seed: 30 }, t);
  for (let k = 0; k < 2; k++) {
    const sx = lerp(1250, k ? 640 : 820, E.outCubic(prog(t, a - 0.1, a + 0.5))) - (led > 0 ? 260 * E.inCubic(led) : 0);
    person(c, sx, 1730 + k * 20, 0.9, { ...SOLDIER, rifle: true, pose: led > 0 && led < 1 ? 'walk' : 'stand', walk: t * 8 + k, seed: 31 + k }, t);
  }
  tagPill(c, 'BÜRGERMEISTER', 420, 860 - 60, t, mw - 0.05, 'white');
  bubble(c, 'WAS?!', 520, 1060 + 30, t, mw + 0.12, -60);
  tagPill(c, 'VERHAFTET', 720, 300 - 60, t, mw + 0.5, 'red', 34);
}
function shKasse(c, t, lt) {
  const a = CUES.kasse, mk2 = CUES.mark;
  c.fillStyle = '#596574'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#4a5462'; for (let x = 0; x < W; x += 180) c.fillRect(x, 0, 8, 1500);
  c.fillStyle = '#3a4250'; c.fillRect(0, 1500, W, 420);
  const open = E.outBack(prog(t, a + 0.1, a + 0.5), 1.4);
  c.save(); c.translate(560, 1180);
  c.fillStyle = '#2e333c'; c.beginPath(); c.roundRect(-260, -60, 520, 300, 20); c.fill();
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -60, 340 * open + 1, '255,215,100', 0.45 * open); c.restore();
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#c9d8b8' : '#e3d6a8'; c.fillRect(-220 + k * 90, -40 - 20 * open, 80, 50); }
  c.save(); c.translate(0, -60); c.scale(1, Math.cos(open * 1.3)); c.fillStyle = '#3c424d'; c.beginPath(); c.roundRect(-260, -180, 520, 180, 20); c.fill(); c.restore();
  c.fillStyle = KC.gold; c.fillRect(-30, 0, 60, 50);
  c.restore();
  if (t > mk2 - 0.1) {
    const u = E.outBack(prog(t, mk2 - 0.1, mk2 + 0.2), 1.8), v = 4000 * E.outCubic(prog(t, mk2, mk2 + 0.9));
    c.save(); c.translate(540, 300); c.scale(u, u);
    text(c, (v >= 3999.5 ? '4.000+' : Math.round(v).toLocaleString('de-DE')) + ' MARK', 0, 0, { w: 900, s: 92, fill: PC.yellow, stroke: '#1b1b1b', sw: 14 });
    c.restore();
    const R = rng(7);
    for (let k = 0; k < 14; k++) { const st = mk2 + R() * 0.5, age = t - st; if (age < 0) continue; const x = 560 + (R() - 0.5) * 900 * age, y = 1120 - (600 + R() * 400) * age + 1300 * age * age; c.fillStyle = k % 2 ? KC.gold : '#e3d6a8'; c.beginPath(); c.ellipse(x, y, 18, 18 * Math.abs(Math.cos(t * 10 + k)), 0, 0, 7); c.fill(); }
  }
  tagPill(c, 'STADTKASSE', 560, 1500, t, a + 0.05, 'white');
  person(c, lerp(860, 1300, E.inCubic(prog(t, mk2 + 0.8, CUES.arrest))), 1760, 0.8, { ...CAPTAIN, box: t > mk2 + 0.6, pose: t > mk2 + 0.6 ? 'carry' : 'stand', face: 'happy', walk: t > mk2 + 0.8 ? t * 8 : null }, t);
  drawHost(c, { pose: 'thinking', x: 180, ground: 1880, s: 0.42, flip: 1, head: Math.sin(t * 3) * 0.04, alpha: 1, emote: t > mk2 + 0.2 ? 'sweat' : null, emoteU: prog(t, mk2 + 0.2, mk2 + 0.4) }, t);
}
function shArrest(c, t, lt) {
  const a = CUES.arrest;
  sky(c, '#8a9aa8', '#c5ccd2', 1300);
  c.drawImage(SPR.row2, -200, -60);
  c.fillStyle = 'rgba(120,135,150,0.35)'; c.fillRect(0, 0, W, 1450);
  street(c, 1450, '#7d8187', '#9da1a7');
  c.strokeStyle = 'rgba(220,230,240,0.55)'; c.lineWidth = 3;
  for (let k = 0; k < 60; k++) { const x = (hash(k) * W + t * 300) % W, y = (hash(k + 1) * H + t * 1400) % H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y + 40); c.stroke(); }
  // calendar 16 -> 26 Oct
  const flip = prog(t, a + 0.2, a + 0.65), day = Math.round(lerp(16, 26, flip));
  c.save(); c.translate(540, 470);
  c.fillStyle = '#fff'; c.beginPath(); c.roundRect(-170, -150, 340, 300, 20); c.fill();
  c.fillStyle = KC.red; c.beginPath(); c.roundRect(-170, -150, 340, 80, [20, 20, 0, 0]); c.fill();
  text(c, 'OKTOBER 1906', 0, -110, { w: 900, s: 30, fill: '#fff', ls: 2 });
  text(c, String(day), 0, 30, { w: 900, s: 130, fill: '#1d1d22' });
  c.restore();
  if (flip >= 1) tagPill(c, '+10 TAGE', 540, 700 - 30, t, a + 0.65, 'yellow', 30);
  const cuff = t > a + 1.0;
  person(c, 400, 1770, 1.0, { ...VOIGT, face: cuff ? 'shock' : 'neutral', pose: cuff ? 'up' : 'stand', seed: 1 }, t);
  person(c, lerp(1150, 720, E.outCubic(prog(t, a, a + 0.6))), 1790, 1.0, { coat: '#22304f', pants: '#1c2233', hat: 'pickel', mustache: true, buttons: true, belt: true, pose: cuff ? 'point' : 'walk', walk: t < a + 0.6 ? t * 9 : null, face: 'angry', seed: 40 }, t);
  tagPill(c, 'GEFASST', 760, 1180, t, a + 1.0, 'red', 34);
}
function shKaiser(c, t, lt) {
  const a = CUES.kaiser;
  c.fillStyle = '#7a1424'; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? '#8e1a2c' : '#6a101e'; c.fillRect(k * 120, 0, 120, 1450); }
  c.fillStyle = KC.gold; c.fillRect(0, 1430, W, 20);
  c.fillStyle = '#4a2a14'; c.fillRect(0, 1450, W, 470);
  person(c, 540, 1640, 1.1, { coat: KC.prussian, pants: '#22283a', hat: 'pickel', plume: true, mustache: 'kaiser', buttons: true, medals: true, epaulettes: true, belt: true, pose: 'hold', face: 'neutral', seed: 50 }, t);
  c.fillStyle = '#6b4329'; c.fillRect(100, 1440, 880, 50); c.fillRect(140, 1490, 50, 300); c.fillRect(890, 1490, 50, 300);
  c.fillStyle = '#f5ecd5'; c.save(); c.translate(560, 1418); c.rotate(-0.05); c.fillRect(-150, -26, 300, 52); c.restore();
  const wq = Math.sin(t * 14) * 10 * (t > a + 0.3 && t < a + 0.9 ? 1 : 0);
  c.strokeStyle = '#f2f2f2'; c.lineWidth = 8; c.beginPath(); c.moveTo(640 + wq, 1405); c.quadraticCurveTo(720, 1320, 790, 1250); c.stroke();
  tagPill(c, 'KAISER WILHELM II.', 540, 250, t, a + 0.05, 'white', 28);
  tagPill(c, '1908', 860, 360, t, a + 0.3, 'yellow', 28);
  const sp = prog(t, a + 1.0, a + 1.15);
  if (sp > 0) { c.save(); c.translate(540, 1560); c.rotate(-0.12); const ss = lerp(2.4, 1, sp); c.scale(ss, ss); c.globalAlpha = sp; c.strokeStyle = '#2f9e44'; c.lineWidth = 10; c.beginPath(); c.roundRect(-250, -60, 500, 120, 14); c.stroke(); text(c, 'BEGNADIGT', 0, 4, { w: 900, s: 76, fill: '#2f9e44', ls: 4 }); c.restore(); }
}
function shFamous(c, t, lt) {
  const a = CUES.famous;
  c.fillStyle = '#ffd166'; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.25; c.translate(540, 900); c.rotate(t * 0.2); c.fillStyle = '#fff3c4';
  for (let k = 0; k < 12; k++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-90, -1400); c.lineTo(90, -1400); c.closePath(); c.fill(); } c.restore();
  const papers = [[300, 520, -0.15, 'DER HAUPTMANN', 'VON KÖPENICK', 'DEUTSCH'], [780, 640, 0.12, 'THE CAPTAIN', 'OF KÖPENICK', 'ENGLISH'], [380, 1360, 0.1, 'LE CAPITAINE', 'DE KÖPENICK', 'FRANÇAIS']];
  papers.forEach(([x, y, r, h1, h2, lang], k) => {
    const st = a + 0.05 + k * 0.35; if (t < st) return;
    const u = E.outBack(prog(t, st, st + 0.35), 1.4);
    c.save(); c.translate(x, y); c.rotate((1 - u) * 6); c.scale(u, u); newspaper(c, 0, 0, 400, r, h1, h2, lang); c.restore();
  });
  person(c, 830, 1680, 0.82, { coat: '#4a3a2a', pants: '#2e2e2e', hat: 'cap', capCol: '#3a3a3a', pose: 'wave', paper: true, talk: 1, face: 'happy', seed: 60 }, t);
  bubble(c, 'EXTRABLATT!', 760, 1080 + 40, t, a + 1.2, 40);
  tagPill(c, 'WILHELM VOIGT', 540, 230, t, a + 0.05, 'red', 30);
  drawHost(c, { pose: 'thumbsup', x: 230, ground: 1890, s: 0.42, flip: 1, head: Math.sin(t * 8) * 0.05, air: Math.abs(Math.sin(t * 7)) * 10, alpha: 1, emote: 'sparkle', emoteU: prog(t, a + 0.4, a + 0.6) }, t);
}
function shEnd(c, t, lt) {
  const a = CUES.end;
  shopInterior(c, t);
  // the uniform alone on a hanger with a price tag
  c.save(); c.translate(540, 520); c.rotate(Math.sin(t * 1.6) * 0.04);
  c.strokeStyle = '#ccc'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, -120); c.lineTo(0, -60); c.moveTo(-110, -10); c.lineTo(0, -60); c.lineTo(110, -10); c.stroke();
  c.fillStyle = KC.prussian; c.beginPath(); c.moveTo(-120, -10); c.lineTo(120, -10); c.lineTo(140, 420); c.lineTo(-140, 420); c.closePath(); c.fill();
  c.fillStyle = KC.red; c.fillRect(-30, -10, 60, 20); c.fillStyle = KC.gold; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(0, 40 + k * 60, 8, 0, 7); c.fill(); }
  c.beginPath(); c.ellipse(-110, -6, 34, 12, 0, 0, 7); c.ellipse(110, -6, 34, 12, 0, 0, 7); c.fill();
  c.save(); c.translate(130, 60); c.rotate(0.3 + Math.sin(t * 3) * 0.15);
  c.strokeStyle = '#f3ead4'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 60); c.stroke();
  c.fillStyle = '#f3ead4'; c.beginPath(); c.roundRect(-60, 60, 150, 80, 10); c.fill(); text(c, 'BILLIG', 15, 102, { w: 900, s: 30, fill: KC.red }); c.restore();
  c.restore();
  person(c, 860, 1720, 0.82, { coat: '#5a4636', pants: '#333', hat: 'bald', hairCol: '#d0d0d0', beard: '#d0d0d0', glasses: true, belly: 0.4, pose: 'shrug', face: 'happy', seed: 5 }, t);
  drawHost(c, { pose: 'thinking', x: 240, ground: 1880, s: 0.46, flip: 1, head: 0.06 * E.inOutCubic(prog(t, a + 0.4, a + 1.0)), alpha: 1, emote: t > CUES.uniformEnd ? '?' : null, emoteU: prog(t, CUES.uniformEnd, CUES.uniformEnd + 0.25) }, t);
  tagPill(c, 'DIE UNIFORM', 540, 230, t, CUES.uniformEnd - 0.05, 'yellow', 30);
}

// ------------------------------------------------------------------ frame: hard cuts, slow camera push on every shot
function shake(t) {
  let x = 0, y = 0;
  for (const [cue, amp] of [[CUES.sofort + 0.05, 8], [CUES.mayorWord + 0.1, 10], [CUES.arrest + 1.0, 8], [CUES.kaiser + 1.0, 10]]) {
    if (t >= cue && t < cue + 0.8) { const k = amp * Math.exp(-(t - cue) / 0.13); x += k * noise1(t * 40 + cue * 10); y += k * noise1(t * 43 + cue * 20 + 7); }
  }
  return [x, y];
}
window.renderFrame = function (i) {
  const t = i / FPS;
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.globalCompositeOperation = 'source-over';
  let k = 0; while (k + 1 < SHOTS.length && t >= SHOTS[k + 1].a) k++;
  const sh = SHOTS[k], u = prog(t, sh.a, sh.b), z = lerp(sh.z[0], sh.z[1], E.inOutCubic(u));
  const [sx, sy] = shake(t);
  c.save(); c.translate(sh.f[0] + sx, sh.f[1] + sy); c.scale(z, z); c.translate(-sh.f[0], -sh.f[1]);
  sh.draw(c, t, t - sh.a);
  c.restore();
  if (k > 0 && t - sh.a < 2 / FPS) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, W, H); }
  const vg = c.createRadialGradient(540, 900, 560, 540, 900, 1300); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  drawCaptions(c, t);
  drawGrainVignette(c, t);
  return t;
};
