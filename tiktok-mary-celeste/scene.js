/* Mary Celeste TikTok short (flat illustration style, hard cuts): renderFrame(i) draws frame i. */
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

// ------------------------------------------------------------------ init
window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await document.fonts.load(font(800, 60, 'JBMono')); await document.fonts.load(font(600, 60, 'JBMono'));
  await prepCharacter(); prepRig();
  SPR.grain = makeGrain(); SPR.dot = makeSnowSprite();
  const C = CUES;
  SHOTS = [
    { a: 0, draw: shTitle, f: [540, 900], z: [1.0, 1.06] },
    { a: C.finds, draw: shDeck, f: [700, 1100], z: [1.0, 1.06] },
    { a: C.drifting, draw: shScope, f: [540, 820], z: [1.0, 1.08] },
    { a: C.name, draw: shName, f: [540, 760], z: [1.0, 1.07] },
    { a: C.climb, draw: shClimb, f: [540, 1300], z: [1.0, 1.05] },
    { a: C.nobody, draw: shEmpty, f: [600, 1200], z: [1.06, 1.0] },
    { a: C.sails, draw: shSails, f: [540, 700], z: [1.0, 1.08] },
    { a: C.cargo, draw: shCargo, f: [540, 1200], z: [1.0, 1.07] },
    { a: C.food, draw: shFood, f: [540, 1000], z: [1.0, 1.06] },
    { a: C.lifeboat, draw: shLifeboat, f: [500, 1000], z: [1.0, 1.06] },
    { a: C.log, draw: shLog, f: [540, 900], z: [1.0, 1.08] },
    { a: C.ten, draw: shCrew, f: [540, 900], z: [1.0, 1.07] },
    { a: C.why, draw: shEnd, f: [520, 1150], z: [1.0, 1.1] },
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
  const fit = Math.min(1, 920 / measure(c, txt, o));
  c.save(); c.translate(540, CAP_Y); c.scale(s * fit, s * fit); c.globalAlpha = clamp(u * 3);
  text(c, txt, 0, 0, { ...o, fill: w.key ? PC.yellow : '#fff', stroke: '#0a0a12', sw: 12, shadow: 'rgba(0,0,0,0.6)', blur: 10, sy: 4, keepShadow: true });
  c.restore();
}

// ------------------------------------------------------------------ shots
function stormySky(c, t, horizon) {
  c.fillStyle = lin(c, 0, 0, 0, horizon, [[0, PC.sky1], [1, PC.sky2]]); c.fillRect(0, 0, W, horizon + 40);
  for (let k = 0; k < 6; k++) flatCloud(c, ((k * 290 + t * (14 + k * 5)) % 1500) - 200, 260 + k * (horizon - 400) / 6, 360 + k * 40, k % 2 ? PC.cloud1 : PC.cloud2 + 'aa');
}
function shTitle(c, t, lt) {
  stormySky(c, t, 980);
  birds(c, t, 3, 3, 'rgba(20,30,40,0.7)', 600);
  seaLayers(c, 980, t, [PC.sea1, PC.sea2, PC.sea3, PC.sea4]);
  fogBands(c, t, 950, 1020, 3, 0.18);
  tagPill(c, 'ATLANTIC OCEAN', 540, 210, t, 0.1, 'white');
  header(c, 'DECEMBER 1872', t, CUES.year - 0.05, 320, 88);
}
function shDeck(c, t, lt) {
  const a = CUES.finds;
  stormySky(c, t, 1080);
  seaLayers(c, 1080, t, [PC.sea1, PC.sea2, PC.sea3], 10);
  const sp = a + 0.6;
  if (t > sp) { flatShip(c, 820, 1072 + Math.sin(t * 1.5) * 3, 0.16, Math.sin(t * 1.2) * 0.03, t, true, prog(t, sp, sp + 0.3)); callout(c, 'ANOTHER SHIP', 820, 1010, 820, 900, t, sp + 0.15, 'white', 24); }
  // railing + deck
  c.fillStyle = PC.wood1; c.fillRect(0, 1430, W, 26); for (let x = 20; x < W; x += 120) c.fillRect(x, 1450, 18, 80);
  c.fillStyle = PC.wood3; c.fillRect(0, 1520, W, 400);
  c.strokeStyle = PC.wood2; c.lineWidth = 4; for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(540 + k * 70, 1520); c.lineTo(540 + k * 240, H); c.stroke(); }
  c.fillStyle = '#c9b48a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(920, 1860 - k * 14, 120 - k * 18, 34 - k * 4, 0, 0, 7); c.fill(); c.fillStyle = k % 2 ? '#c9b48a' : '#b39c72'; }
  lantern(c, 90, 1250, 0.9, Math.sin(t * 2) * 0.12, t, 0.8);
  tagPill(c, 'YOUR SHIP: DEI GRATIA', 540, 210, t, a + 0.05, 'white', 24);
  const look = E.inOutCubic(prog(t, sp, sp + 0.25)) * 0.12;
  drawHost(c, { pose: 'serious', x: 330, ground: 1830, s: 0.5, flip: 1, head: look + Math.sin(t * 2) * 0.02, headDy: -talk(t) * 4, sy: 1 + 0.006 * Math.sin(t * 2.3), alpha: 1,
    emote: t > sp + 0.1 ? '!' : null, emoteU: prog(t, sp + 0.1, sp + 0.35) }, t);
}
function shScope(c, t, lt) {
  c.fillStyle = '#05080b'; c.fillRect(0, 0, W, H);
  const cx = 540, cy = 820, r = 450;
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip();
  stormySky(c, t, 900);
  seaLayers(c, 900, t, [PC.sea1, PC.sea2, PC.sea3, PC.sea4], 12);
  flatShip(c, lerp(470, 600, lt / 1.9), 905 + Math.sin(t * 1.4) * 8, 0.95, Math.sin(t * 1.1) * 0.05, t, true);
  fogBands(c, t, 850, 1000, 3, 0.15);
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.stroke();
  for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(cx + k * 60, cy - 10); c.lineTo(cx + k * 60, cy + 10); c.stroke(); }
  const vg = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.restore();
  c.strokeStyle = '#2a2f36'; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, r + 12, 0, 7); c.stroke();
  c.strokeStyle = '#59616b'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, r + 2, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
  tagPill(c, 'DRIFTING', 540, 210, t, CUES.drifting + 0.05, 'red');
  tagPill(c, 'NEAR THE AZORES', 540, 1420, t, CUES.drifting + 0.6, 'white', 26);
}
function shName(c, t, lt) {
  for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? PC.wood1 : PC.wood2; c.fillRect(0, k * 96, W, 96); c.fillStyle = PC.wood3; c.fillRect(0, k * 96 + 90, W, 6); for (let x = 60 + (k % 3) * 40; x < W; x += 260) { c.beginPath(); c.arc(x, k * 96 + 48, 5, 0, 7); c.fill(); } }
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; for (let k = 0; k < 40; k++) { const y = hash(k) * 1500, x = hash(k + 3) * W; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 80, y + 6, x + 200, y); c.stroke(); }
  // painted name
  const m = CUES.mary - 0.05, name = 'MARY CELESTE';
  const o = { w: 900, s: 92, ls: 4 }, tw2 = measure(c, name, o) + 8 * name.length;
  let x = 540 - tw2 / 2;
  for (let i = 0; i < name.length; i++) {
    const ch = name[i], cw = measure(c, ch, o) + 8, lt2 = m + i * 0.07;
    if (t > lt2 && ch !== ' ') { const u = E.outBack(prog(t, lt2, lt2 + 0.15), 2.5); c.save(); c.translate(x + cw / 2, 700); c.scale(u, u); text(c, ch, 0, 0, { ...o, ls: 0, fill: PC.cream, shadow: 'rgba(0,0,0,0.35)', blur: 2, sy: 3 }); c.restore(); }
    x += cw;
  }
  text(c, 'NEW YORK', 540, 830, { w: 800, s: 46, ls: 14, fill: PC.cream, alpha: prog(t, m + 0.95, m + 1.2) });
  tagPill(c, 'HER NAME', 540, 470, t, CUES.name + 0.05, 'white');
  // rope + water
  c.strokeStyle = '#c9b48a'; c.lineWidth = 12; c.beginPath(); c.moveTo(900, 0); c.quadraticCurveTo(870 + Math.sin(t * 2) * 20, 700, 905, 1300); c.stroke();
  seaLayers(c, 1500, t, [PC.sea1, PC.sea2, PC.sea3], 22);
  const sp = (t * 0.7) % 1; c.fillStyle = `rgba(220,235,240,${0.8 * (1 - sp)})`;
  for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(200 + k * 95, 1480 - sp * 160 * (0.5 + hash(k)), 10 * (1 - sp) + 3, 0, 7); c.fill(); }
}
function shClimb(c, t, lt) {
  const a = CUES.climb;
  stormySky(c, t, 1300);
  c.fillStyle = '#3b2a20'; c.fillRect(250, 0, 22, 1450); c.fillRect(760, 0, 22, 1450);
  squareSail(c, 260, 150, 420, 300, 360, 30, true, t, 1); squareSail(c, 770, 300, 620, 340, 400, 36, false, t, 2);
  c.strokeStyle = '#3b2a20'; c.lineWidth = 3; for (const [x0, x1] of [[260, 0], [260, 540], [770, 540], [770, W]]) { c.beginPath(); c.moveTo(x0, 60); c.lineTo(x1, 1450); c.stroke(); }
  c.fillStyle = PC.hull; c.fillRect(0, 1450, W, 470);
  c.fillStyle = PC.wood1; c.fillRect(0, 1430, W, 30);
  c.strokeStyle = '#c9b48a'; c.lineWidth = 6; for (const x of [140, 220]) { c.beginPath(); c.moveTo(x, 1440); c.lineTo(x + 10, H); c.stroke(); }
  for (let y = 1500; y < H; y += 70) { c.beginPath(); c.moveTo(140, y); c.lineTo(222, y); c.stroke(); }
  const land = a + 0.75, u = prog(t, a + 0.05, land);
  const yy = lerp(2600, 1700, E.outCubic(u)) - 140 * Math.sin(Math.PI * u);
  const sq = bump(t, land - 0.02, 0.18) * 0.14;
  drawHost(c, { pose: 'serious', x: lerp(420, 560, u), ground: yy, s: 0.5, flip: 1, sx: 1 + sq, sy: 1 - sq, head: -0.08 * bump(t, land, 0.5), alpha: 1 }, t);
  tagPill(c, 'YOU', lerp(420, 560, u), yy - 820, t, land + 0.05, 'white', 28);
}
function shEmpty(c, t, lt) {
  const a = CUES.nobody;
  stormySky(c, t, 900);
  seaLayers(c, 900, t, [PC.sea2, PC.sea3], 8);
  c.fillStyle = '#3b2a20'; c.fillRect(400, 0, 16, 1000); c.fillRect(700, 120, 14, 880);
  squareSail(c, 408, 120, 360, 260, 300, 26, true, t, 4); fillPoly(c, [[706, 200], [706, 760], [900, 740], [880, 260]], PC.sailSh);
  c.fillStyle = PC.wood3; fillPoly(c, [[0, 1000], [W, 1000], [W, H], [0, H]], PC.wood3);
  c.strokeStyle = PC.wood2; c.lineWidth = 4; for (let k = -10; k <= 10; k++) { c.beginPath(); c.moveTo(540 + k * 40, 1000); c.lineTo(540 + k * 220, H); c.stroke(); }
  c.fillStyle = PC.wood1; c.fillRect(0, 960, W, 40);
  c.fillStyle = '#120c08'; fillPoly(c, [[460, 1200], [660, 1200], [690, 1300], [430, 1300]], '#120c08');
  shipWheel(c, 230, 1380, 150, Math.sin(t * 0.9) * 0.5);
  c.fillStyle = '#4e3123'; c.fillRect(210, 1380, 40, 400);
  lantern(c, 880, 560, 1.2, Math.sin(t * 1.8) * 0.25, t, 1);
  fogBands(c, t, 950, 1500, 4, 0.22);
  // host looks around, calls out
  const turn = Math.sin((t - a) * 3.2), flip = turn > 0 ? 1 : -1;
  drawHost(c, { pose: 'serious', x: 680, ground: 1700, s: 0.42, flip, head: turn * 0.12, alpha: 1, sy: 1 + 0.006 * Math.sin(t * 2.3),
    emote: t > a + 0.9 ? '?' : null, emoteU: prog(t, a + 0.9, a + 1.1) }, t);
  bubble(c, 'HELLO?!', 760, 1000, t, a + 0.25, -60);
  header(c, 'NO ONE ABOARD', t, a + 0.05, 270, 76);
}
function shSails(c, t, lt) {
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#3c5868'], [1, '#8ea7b1']]); c.fillRect(0, 0, W, H);
  for (let k = 0; k < 5; k++) flatCloud(c, ((k * 330 + t * 90) % 1600) - 300, 200 + k * 330, 420, PC.cloud2 + '88');
  c.fillStyle = '#3b2a20'; fillPoly(c, [[520, H], [560, H], [550, 0], [530, 0]], '#3b2a20');
  for (const [y, w] of [[260, 520], [720, 700], [1200, 860]]) c.fillRect(540 - w / 2, y - 8, w, 16);
  squareSail(c, 540, 268, 700, 500, 660, 50, true, t, 1);
  squareSail(c, 540, 728, 1180, 680, 820, 70, false, t, 2);
  c.fillStyle = PC.sailSh; c.beginPath(); c.roundRect(130, 1208, 820, 46, 23); c.fill();
  c.strokeStyle = '#2b2320'; c.lineWidth = 3; for (const [x0, y0, x1, y1] of [[540, 0, 0, 1500], [540, 0, W, 1500], [540, 260, 0, 1900], [540, 260, W, 1900]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  callout(c, 'SAILS: STILL SET', 700, 900, 760, 1320, t, CUES.sails + 0.3, 'red', 28);
}
function shCargo(c, t, lt) {
  c.fillStyle = '#4a3020'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#5c3c28'; for (let k = 0; k < 6; k++) { const x = k * 200 + 40; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x - 60, 900, x + 20, 1500); c.lineTo(x + 50, 1500); c.quadraticCurveTo(x - 30, 900, x + 30, 0); c.fill(); }
  c.fillStyle = '#3d281a'; c.fillRect(0, 1450, W, 470);
  const swing = Math.sin(t * 1.6) * 0.3;
  lantern(c, 540, 300, 1.1, swing, t, 1);
  for (const [y, n, w, h, sh] of [[1100, 8, 120, 150, 0.35], [1350, 6, 170, 210, 0.15], [1700, 4, 250, 310, 0.0]]) {
    for (let k = 0; k < n; k++) barrel(c, (k + 0.5) * W / n + (y === 1350 ? 40 : 0), y, w, h, sh);
  }
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 540 + swing * 300, 1200, 520, '255,170,80', 0.22); c.restore();
  for (let k = 0; k < 30; k++) { const x = (hash(k) * W + Math.sin(t + k) * 20), y = ((hash(k + 1) * 1400 - t * 20 * (0.5 + hash(k + 2))) % 1400 + 1400) % 1400; c.fillStyle = 'rgba(255,220,160,0.35)'; c.fillRect(x, y, 3, 3); }
  tagPill(c, 'CARGO HOLD', 540, 210, t, CUES.cargo + 0.05, 'white');
  callout(c, '1,701 BARRELS OF ALCOHOL', 300, 1240, 540, 1520, t, CUES.cargo + 0.3, 'yellow', 26);
}
function shFood(c, t, lt) {
  const a = CUES.food;
  c.fillStyle = '#5a3a24'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#6e4a2f'; for (let x = 0; x < W; x += 90) c.fillRect(x, 0, 84, 1600);
  c.fillStyle = '#3d281a'; c.fillRect(0, 1600, W, 320);
  lantern(c, 160, 360, 1.0, Math.sin(t * 1.4) * 0.15, t, 1);
  const R = rng(5);
  for (const y of [520, 860, 1200]) {
    c.fillStyle = '#6b4329'; c.fillRect(60, y, 960, 24); c.fillStyle = '#4a2d1b'; c.fillRect(60, y + 24, 960, 10);
    let x = 90;
    while (x < 990) {
      const kind = Math.floor(R() * 3);
      if (kind === 0) { const h = 90 + R() * 50; c.fillStyle = ['#b6c7a1', '#d9b77a', '#c98f6a'][Math.floor(R() * 3)]; c.beginPath(); c.roundRect(x, y - h, 70, h, 14); c.fill(); c.fillStyle = '#7a5236'; c.fillRect(x + 8, y - h - 12, 54, 16); x += 90; }
      else if (kind === 1) { c.fillStyle = '#c9b48a'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 6, y - 120, x + 50, y - 140); c.quadraticCurveTo(x + 110, y - 120, x + 100, y); c.fill(); c.strokeStyle = '#8a7350'; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 30, y - 120); c.lineTo(x + 70, y - 118); c.stroke(); x += 125; }
      else { c.fillStyle = '#e6c25a'; c.beginPath(); c.ellipse(x + 50, y - 34, 50, 34, 0, 0, 7); c.fill(); c.fillStyle = '#cfa43f'; c.beginPath(); c.ellipse(x + 50, y - 40, 44, 16, 0, 0, 7); c.fill(); x += 115; }
    }
  }
  for (let k = 0; k < 3; k++) barrel(c, 140 + k * 170, 1800, 150, 190, 0.2 + k * 0.1);
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 300, 700, 600, '255,170,80', 0.18); c.restore();
  callout(c, '6 MONTHS OF FOOD & WATER', 380, 760, 540, 380, t, a + 0.3, 'yellow', 26);
  drawHost(c, { pose: 'thinking', x: 840, ground: 1850, s: 0.48, flip: -1, head: Math.sin(t * 3) * 0.04, alpha: 1, sy: 1 + 0.006 * Math.sin(t * 2.3),
    emote: t > a + 1.0 ? 'sparkle' : null, emoteU: prog(t, a + 1.0, a + 1.2) }, t);
}
function shLifeboat(c, t, lt) {
  const a = CUES.lifeboat, g = CUES.gone;
  stormySky(c, t, 1150);
  seaLayers(c, 1150, t, [PC.sea1, PC.sea2, PC.sea3, PC.sea4], 12);
  fogBands(c, t, 1000, 1300, 3, 0.2);
  c.fillStyle = PC.wood1; c.fillRect(0, 1480, W, 30); c.fillStyle = PC.wood3; c.fillRect(0, 1510, W, 410);
  for (const x of [220, 660]) {
    c.strokeStyle = '#30343a'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, 1500); c.lineTo(x, 900); c.quadraticCurveTo(x, 800, x + 110, 800); c.stroke();
    const sw = Math.sin(t * 2 + x) * 0.25;
    c.save(); c.translate(x + 110, 800); c.rotate(sw); c.strokeStyle = '#c9b48a'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 380); c.stroke();
    c.strokeStyle = '#30343a'; c.lineWidth = 8; c.beginPath(); c.arc(0, 395, 16, Math.PI * 1.8, Math.PI * 1.1); c.stroke(); c.restore();
  }
  const flash = t > g ? (Math.floor((t - g) * 8) % 2 === 0 ? 1 : 0.4) : 0;
  c.save(); c.setLineDash([22, 16]); c.lineDashOffset = -t * 30; c.lineWidth = 6; c.strokeStyle = t > g ? `rgba(224,71,60,${flash})` : 'rgba(255,255,255,0.8)';
  c.beginPath(); c.moveTo(300, 1180); c.lineTo(820, 1180); c.quadraticCurveTo(800, 1290, 700, 1300); c.lineTo(380, 1300); c.quadraticCurveTo(300, 1290, 300, 1180); c.stroke(); c.restore();
  callout(c, 'LIFEBOAT: MISSING', 560, 1300, 560, 1560, t, g, 'red', 30);
  drawHost(c, { pose: 'serious', x: 920, ground: 1860, s: 0.46, flip: -1, head: -0.08 + Math.sin(t * 2) * 0.02, alpha: 1, sy: 1 + 0.006 * Math.sin(t * 2.3),
    emote: t > g + 0.2 ? 'sweat' : null, emoteU: prog(t, g + 0.2, g + 0.4) }, t);
}
function shLog(c, t, lt) {
  const a = CUES.log, nn = CUES.nine;
  c.fillStyle = '#8a5a3a'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; for (let k = 0; k < 30; k++) { const y = k * 70 + 20; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(540, y + 10, W, y); c.stroke(); }
  c.save(); c.translate(540, 700); c.rotate(-0.04);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-440, -440, 900, 900);
  c.fillStyle = '#efe4c8'; c.fillRect(-460, -460, 450, 900); c.fillStyle = '#f5ecd5'; c.fillRect(-10, -460, 470, 900);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-14, -460, 10, 900);
  c.strokeStyle = 'rgba(80,110,160,0.35)'; c.lineWidth = 2; for (let y = -380; y < 420; y += 60) { c.beginPath(); c.moveTo(-440, y); c.lineTo(-30, y); c.moveTo(10, y); c.lineTo(440, y); c.stroke(); }
  text(c, "SHIP'S LOG", -235, -415, { w: 900, s: 30, fill: '#5a4630', ls: 4 });
  const dates = ['Nov 20', 'Nov 21', 'Nov 22', 'Nov 23', 'Nov 24', 'Nov 25'];
  dates.forEach((d, k) => {
    const left = k < 3, x0 = left ? -430 : 20, y = (left ? k : k - 3) * 150 - 360;
    text(c, d, x0, y, { fam: 'JBMono', w: 700, s: 30, fill: '#2f2a4a', align: 'left' });
    c.strokeStyle = '#3a3560'; c.lineWidth = 3;
    for (let l = 0; l < 2; l++) { c.beginPath(); const yy = y + 44 + l * 44, len = 300 + hash(k * 3 + l) * 90; for (let x = 0; x <= len; x += 12) c.lineTo(x0 + x, yy + Math.sin(x * 0.18 + k + l) * 5); c.stroke(); }
  });
  const hl = prog(t, nn - 0.15, nn + 0.1);
  if (hl > 0) { c.strokeStyle = PC.red; c.lineWidth = 7; c.globalAlpha = hl; c.beginPath(); c.roundRect(5, -100, 440, 150, 16); c.stroke(); c.globalAlpha = 1; }
  c.restore();
  // inkwell + quill
  c.fillStyle = '#111'; c.beginPath(); c.roundRect(860, 1380, 120, 100, 20); c.fill();
  c.strokeStyle = '#e9e2d0'; c.lineWidth = 8; c.beginPath(); c.moveTo(910, 1390); c.quadraticCurveTo(980, 1250, 1050, 1180); c.stroke();
  tagPill(c, 'LAST ENTRY: NOV 25', 760, 260, t, nn - 0.05, 'red', 26);
  // the gap: Nov 25 -> Dec 4
  if (t > nn) {
    const u = prog(t, nn, nn + 0.75), n = Math.min(9, Math.floor(u * 9.99));
    c.save(); c.translate(540, 1500);
    for (let k = 0; k < 9; k++) { c.fillStyle = k < n ? PC.red : 'rgba(255,255,255,0.15)'; c.beginPath(); c.roundRect(-400 + k * 90, -30, 70, 60, 10); c.fill(); }
    text(c, 'NOV 25', -400, -70, { fam: 'JBMono', w: 800, s: 26, fill: '#fff', align: 'left' });
    text(c, 'DEC 4', 400, -70, { fam: 'JBMono', w: 800, s: 26, fill: '#fff', align: 'right' });
    if (n >= 9) text(c, '9 DAYS', 0, 110, { w: 900, s: 84, fill: PC.yellow, stroke: '#0a0a12', sw: 10 });
    c.restore();
  }
}
const CREW = [['Benjamin Briggs', 'Captain'], ['Sarah Briggs', "Captain's wife"], ['Sophia Briggs', 'daughter, 2'], ['Albert Richardson', '1st mate'], ['Andrew Gilling', '2nd mate'],
  ['Edward Head', 'cook'], ['Volkert Lorenzen', 'seaman'], ['Boz Lorenzen', 'seaman'], ['Arian Martens', 'seaman'], ['Gottlieb Goodschaad', 'seaman']];
function shCrew(c, t, lt) {
  const a = CUES.ten;
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#a9c9d8'], [1, '#6f9bb5']]); c.fillRect(0, 0, W, H);
  bokeh(c, t, 4, 10, '255,255,255', 0.12);
  c.save(); c.translate(540, 860); c.rotate(0.02);
  c.fillStyle = '#6b4329'; c.beginPath(); c.roundRect(-400, -640, 800, 1320, 30); c.fill();
  c.fillStyle = '#f3ead4'; c.fillRect(-360, -580, 720, 1220);
  c.fillStyle = '#9aa3ad'; c.beginPath(); c.roundRect(-130, -670, 260, 80, 14); c.fill();
  text(c, 'MARY CELESTE', 0, -510, { w: 900, s: 34, fill: '#1d2a33', ls: 2 });
  text(c, 'CREW & PASSENGERS', 0, -460, { w: 900, s: 42, fill: '#1d2a33', ls: 1 });
  CREW.forEach(([n, r], k) => {
    const y = -380 + k * 82;
    text(c, n, -320, y, { w: 800, s: 30, fill: '#1d2a33', align: 'left' });
    text(c, r, 320, y, { w: 600, s: 22, fill: '#6b6b6b', align: 'right' });
    const st = a + 0.35 + k * 0.1, u = prog(t, st, st + 0.1);
    if (u > 0) { c.strokeStyle = PC.red; c.lineWidth = 5; c.beginPath(); c.moveTo(-330, y + 2); c.lineTo(lerp(-330, 330, u), y - 3); c.stroke(); }
  });
  text(c, 'FOUND:', -150, 520, { w: 900, s: 56, fill: '#1d2a33' });
  if (t > a + 1.4) { const u = E.outBack(prog(t, a + 1.4, a + 1.6), 2.5); c.save(); c.translate(120, 520); c.scale(u, u); text(c, '0', 0, 0, { w: 900, s: 110, fill: PC.red }); c.restore(); }
  c.restore();
}
function shEnd(c, t, lt) {
  const a = CUES.why;
  c.fillStyle = lin(c, 0, 0, 0, 1150, [[0, '#3b4a7a'], [0.55, '#e07a6a'], [0.85, '#f6a66b'], [1, '#ffd59e']]); c.fillRect(0, 0, W, H);
  glow(c, 760, 1080, 420, '255,214,150', 0.6); c.fillStyle = '#fff0c9'; c.beginPath(); c.arc(760, 1110, 95, 0, 7); c.fill();
  for (let k = 0; k < 4; k++) flatCloud(c, ((k * 360 + t * 20) % 1500) - 200, 330 + k * 140, 420, k % 2 ? '#c96f7a' : '#f0a08a');
  seaLayers(c, 1150, t, ['#7a5f86', '#5e4c75', '#463b62', '#322c4f'], 10);
  const u = prog(t, a - 0.1, DUR);
  flatShip(c, lerp(700, 900, u), 1150 + Math.sin(t * 1.3) * 4, lerp(0.42, 0.22, u), Math.sin(t) * 0.04, t, true, 1 - 0.85 * u);
  fogBands(c, t, 1000, 1350, 5, 0.12 + 0.18 * u);
  c.fillStyle = '#5a3a28'; c.fillRect(0, 1500, W, 30); for (let x = 20; x < W; x += 120) c.fillRect(x, 1520, 18, 80); c.fillStyle = '#3d281a'; c.fillRect(0, 1590, W, 330);
  lantern(c, 120, 1300, 0.9, Math.sin(t * 1.5) * 0.1, t, 1);
  drawHost(c, { pose: 'serious', x: 340, ground: 1860, s: 0.5, flip: 1, head: 0.06 * E.inOutCubic(prog(t, a + 0.3, a + 1.0)), alpha: 1, sy: 1 + 0.006 * Math.sin(t * 2.3) }, t);
  header(c, 'STILL UNSOLVED', t, CUES.whyWord - 0.05, 270, 80);
}

// ------------------------------------------------------------------ frame: hard cuts, slow camera push on every shot
function shake(t) {
  let x = 0, y = 0;
  for (const [cue, amp] of [[CUES.nobody, 10], [CUES.gone, 12], [CUES.nine, 8], [CUES.whyWord, 10]]) {
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
  // a 2-frame punch on each cut
  const since = t - sh.a;
  if (k > 0 && since < 2 / FPS) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, W, H); }
  const vg = c.createRadialGradient(540, 900, 520, 540, 900, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  drawCaptions(c, t);
  drawGrainVignette(c, t);
  return t;
};
