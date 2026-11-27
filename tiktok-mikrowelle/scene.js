/* Die Mikrowelle: ein geschmolzener Schokoriegel (German TikTok short, flat style, hard cuts): renderFrame(i) draws frame i. */
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


// ================================================================== Microwave video: radar lab 1945, chocolate, popcorn, egg, Radarange, 2 dollars
function hostAt(st, ox, oy) { return [st.x + (st.flip || 1) * st.s * (ox - 512), st.ground - (st.air || 0) - st.s * (1522 - oy)]; }
const SPENCER = { coat: '#3b4a63', pants: '#2b3240', hat: 'hair', hairCol: '#b9b2a6', glasses: true, seed: 5 };
const COLLEAGUE = { coat: '#f4f4f4', pants: '#4a4a4a', hat: 'hair', hairCol: '#6b3a1f', mustache: '#6b3a1f', seed: 9 };
const BOSS = { coat: '#24262f', pants: '#24262f', hat: 'bald', hairCol: '#d0d0d0', mustache: '#d0d0d0', belly: 0.6, chain: true, seed: 12 };

// ----- props
function waveArcs(c, x, y, dir, t, rgb, n = 5, maxR = 700, spread = 0.5) {
  c.save(); c.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const u = ((t * 0.9 + k / n) % 1), r = 40 + u * maxR;
    c.strokeStyle = `rgba(${rgb},${0.55 * (1 - u)})`; c.lineWidth = 10 - 6 * u;
    c.beginPath(); c.arc(x, y, r, dir - spread, dir + spread); c.stroke();
  }
  c.restore();
}
function dial(c, x, y, r, ang) {
  c.fillStyle = '#f3ead4'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#2b2b30'; c.lineWidth = 4; c.stroke();
  c.strokeStyle = '#c8312b'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8); c.stroke();
}
function magnetron(c, x, y, w, h, t, hot) {
  c.fillStyle = '#7a8f84'; c.beginPath(); c.roundRect(x, y, w, h, 14); c.fill();
  c.fillStyle = '#66796f'; c.fillRect(x + w - 40, y, 40, h);
  c.fillStyle = '#55665c'; c.beginPath(); c.roundRect(x + 24, y + 24, w - 48, 190, 10); c.fill();
  for (let k = 0; k < 3; k++) dial(c, x + 80 + k * ((w - 160) / 2), y + 100, 42, -2.4 + 1.2 * k + Math.sin(t * (3 + k) + k) * 0.5 * (0.4 + hot));
  for (let k = 0; k < 6; k++) {
    const on = hash(Math.floor(t * 6) + k * 7) > 0.45 - hot * 0.3;
    c.fillStyle = on ? ['#ff5a4a', '#5aff7a', '#ffc94a'][k % 3] : '#3a4440';
    c.beginPath(); c.arc(x + 60 + k * ((w - 120) / 5), y + 180, 11, 0, 7); c.fill();
  }
  c.strokeStyle = '#5e7066'; c.lineWidth = 6;
  for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(x + 50, y + h - 220 + k * 26); c.lineTo(x + w - 90, y + h - 220 + k * 26); c.stroke(); }
}
function horn(c, x, y, len, dir, glowA) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.fillStyle = '#c08a4e'; c.beginPath(); c.moveTo(0, -40); c.lineTo(len, -100); c.lineTo(len, 100); c.lineTo(0, 40); c.closePath(); c.fill();
  c.fillStyle = '#9c6c39'; c.fillRect(len - 14, -100, 14, 200);
  c.restore();
  glow(c, x + dir * len, y, 260, '255,150,60', glowA);
}
function scope(c, x, y, r, t) {
  c.fillStyle = '#2b3a3f'; c.beginPath(); c.roundRect(x - r - 30, y - r - 30, 2 * r + 60, 2 * r + 80, 16); c.fill();
  c.fillStyle = '#0d2a1a'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(90,255,140,0.35)'; c.lineWidth = 2; for (const rr2 of [0.33, 0.66, 1]) { c.beginPath(); c.arc(x, y, r * rr2, 0, 7); c.stroke(); }
  const a = t * 2.4;
  c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
  for (let k = 0; k < 14; k++) { c.strokeStyle = `rgba(90,255,140,${0.6 * (1 - k / 14)})`; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a - k * 0.04) * r, y + Math.sin(a - k * 0.04) * r); c.stroke(); }
  for (let k = 0; k < 4; k++) { const ba = hash(k) * 6.28, d = (a - ba) % 6.28; if (d > 0 && d < 2) { c.fillStyle = `rgba(150,255,170,${1 - d / 2})`; c.beginPath(); c.arc(x + Math.cos(ba) * r * (0.3 + 0.6 * hash(k + 4)), y + Math.sin(ba) * r * (0.3 + 0.6 * hash(k + 4)), 7, 0, 7); c.fill(); } }
  c.restore();
}
function radarDish(c, x, y, r, t) {
  c.fillStyle = '#8d979e'; c.fillRect(x - 12, y, 24, 300); c.fillRect(x - 60, y + 280, 120, 20);
  const sx = Math.cos(t * 1.6), w = Math.abs(sx) * r + 14;
  c.fillStyle = sx > 0 ? '#eef2f4' : '#b9c3c8'; c.beginPath(); c.ellipse(x, y, w, r * 0.9, 0, 0, 7); c.fill();
  c.strokeStyle = '#7d878e'; c.lineWidth = 6; c.stroke();
  c.strokeStyle = '#59636a'; c.lineWidth = 8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * r * 0.9, y - 10); c.stroke();
  c.fillStyle = '#59636a'; c.beginPath(); c.arc(x + sx * r * 0.9, y - 10, 14, 0, 7); c.fill();
}
function chocoBar(c, x, y, w, h, melt) {
  // exposed chocolate (top) above a red wrapper; melt 0..1 sags the top and erases the segment grid
  c.fillStyle = '#5a3220';
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + melt * 140); c.quadraticCurveTo(x + w / 2, y + melt * 420, x + w, y + melt * 140); c.lineTo(x + w, y + h); c.closePath(); c.fill();
  c.save(); c.globalAlpha = 1 - melt; c.fillStyle = '#6e3f29';
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.roundRect(x + 22 + i * (w / 2 - 6), y + 22 + j * 120, w / 2 - 38, 100, 10); c.fill(); }
  c.restore();
  c.fillStyle = '#c8312b'; c.fillRect(x - 10, y + h - 220, w + 20, 220);
  c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.beginPath();
  for (let k = 0; k <= 20; k++) { const xx = x - 10 + k * (w + 20) / 20, yy = y + h - 120 + Math.sin(k * 0.9) * 18; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
}
function puff(c, x, y, r, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = '#fff8e6'; for (let k = 0; k < 5; k++) { const a = k * 1.256; c.beginPath(); c.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.55, 0, 7); c.fill(); }
  c.fillStyle = '#f3c75a'; c.beginPath(); c.arc(r * 0.1, r * 0.15, r * 0.22, 0, 7); c.fill();
  c.restore();
}
function eggShape(c, x, y, s, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = '#fbf6ea'; c.beginPath(); c.moveTo(0, -70); c.bezierCurveTo(48, -70, 58, 20, 52, 34); c.bezierCurveTo(44, 70, -44, 70, -52, 34); c.bezierCurveTo(-58, 20, -48, -70, 0, -70); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.08)'; c.beginPath(); c.ellipse(16, 20, 26, 40, 0.2, 0, 7); c.fill();
  c.restore();
}
function goo(c, x, y, s, t, t0) {
  // egg on a face: white splat, yolk, sliding drips
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#fffdf6'; c.beginPath();
  for (let k = 0; k <= 16; k++) { const a = k / 16 * 6.283, r = 120 + 40 * Math.sin(k * 2.7) + 20 * hash(k); k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); } c.fill();
  for (let k = 0; k < 4; k++) { const len = clamp((t - t0) * 60 * (0.6 + hash(k + 9))) * 1 + Math.min(220, (t - t0) * (70 + 40 * hash(k))); const xx = -90 + k * 60; c.beginPath(); c.roundRect(xx - 12, 40, 24, len + 40, 12); c.fill(); c.beginPath(); c.arc(xx, 80 + len, 16, 0, 7); c.fill(); }
  c.fillStyle = '#ffb21f'; c.beginPath(); c.arc(30, -20, 52, 0, 7); c.fill(); c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(16, -36, 16, 0, 7); c.fill();
  c.restore();
}
function bill(c, x, y, w, rot, label = '1') {
  const h = w * 0.43;
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = '#7fb77e'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 8); c.fill();
  c.strokeStyle = '#3f7a45'; c.lineWidth = Math.max(2, w * 0.02); c.strokeRect(-w / 2 + w * 0.05, -h / 2 + h * 0.1, w * 0.9, h * 0.8);
  c.fillStyle = '#cfe6c2'; c.beginPath(); c.ellipse(0, 0, w * 0.16, h * 0.32, 0, 0, 7); c.fill();
  text(c, label, -w * 0.36, -h * 0.24, { w: 900, s: w * 0.14, fill: '#2f5f35' }); text(c, label, w * 0.36, h * 0.24, { w: 900, s: w * 0.14, fill: '#2f5f35' });
  text(c, '$', 0, 2, { w: 900, s: w * 0.2, fill: '#3f7a45' });
  c.restore();
}
function rays(c, x, y, t, col1, col2) {
  c.fillStyle = col1; c.fillRect(0, 0, W, H);
  c.fillStyle = col2; c.save(); c.translate(x, y); c.rotate(t * 0.15);
  for (let k = 0; k < 16; k++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 2400, k * 0.3927, k * 0.3927 + 0.2); c.closePath(); c.fill(); }
  c.restore();
}
function pocketChoco(c, x, ground, s, facing) {
  const px = x - 45 * s * facing, py = ground - 300 * s;
  c.fillStyle = '#5a3220'; c.fillRect(px - 11 * s, py - 34 * s, 22 * s, 36 * s);
  c.fillStyle = '#c8312b'; c.fillRect(px - 12 * s, py - 10 * s, 24 * s, 12 * s);
  c.fillStyle = '#34425a'; c.beginPath(); c.roundRect(px - 20 * s, py, 40 * s, 34 * s, 4 * s); c.fill();
}

// ------------------------------------------------------------------ init
window.init = async function () {
  TL = await (await fetch('build/timeline.json')).json();
  CUES = TL.cues; FPS = TL.fps; DUR = TL.duration;
  await document.fonts.load(font(900, 60)); await document.fonts.load(font(800, 60)); await document.fonts.load(font(600, 60));
  await prepCharacter(); prepRig();
  SPR.grain = makeGrain(); SPR.dot = makeSnowSprite();
  const C = CUES;
  SHOTS = [
    { a: 0, draw: shStreet, f: [540, 1000], z: [1.0, 1.06] },
    { a: C.ing, draw: shLab, f: [540, 1100], z: [1.0, 1.06] },
    { a: C.melt, draw: shShock, f: [540, 900], z: [1.0, 1.1] },
    { a: C.schoko - 0.05, draw: shPocket, f: [540, 1000], z: [1.0, 1.08] },
    { a: C.mais, draw: shPopcorn, f: [540, 1150], z: [1.0, 1.06] },
    { a: C.egg, draw: shEgg, f: [420, 1250], z: [1.0, 1.12] },
    { a: C.explode, draw: shBoom, f: [420, 1200], z: [1.08, 1.14] },
    { a: C.explode + 0.75, draw: shFace, f: [540, 900], z: [1.0, 1.06] },
    { a: C.micro, draw: shOven, f: [540, 1000], z: [1.0, 1.06] },
    { a: C.first, draw: shRadarange, f: [540, 1100], z: [1.0, 1.05] },
    { a: C.kost, draw: shPrice, f: [540, 900], z: [1.0, 1.08] },
    { a: C.pay, draw: shOffice, f: [540, 1100], z: [1.0, 1.05] },
    { a: C.dollar, draw: shTwo, f: [540, 1000], z: [1.0, 1.08] },
  ];
  SHOTS.forEach((s, i) => (s.b = i + 1 < SHOTS.length ? SHOTS[i + 1].a : DUR + 1));
  WORDS = TL.lines.flatMap(l => l.phrases.flatMap(p => p.words));
  return { frames: Math.round(DUR * FPS) };
};

// ------------------------------------------------------------------ shots
const WALK0 = [0.1, 1.1, 0.25];
function shStreet(c, t) {
  c.fillStyle = lin(c, 0, 0, 0, 1500, [[0, '#7cc6f2'], [1, '#e3f5ff']]); c.fillRect(0, 0, W, 1560);
  glow(c, 880, 300, 300, '255,240,200', 0.7); c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(880, 300, 70, 0, 7); c.fill();
  for (let k = 0; k < 3; k++) flatCloud(c, ((150 + k * 420 + t * (18 + k * 8)) % 1500) - 200, 420 + k * 130, 260 + k * 40, 'rgba(255,255,255,0.9)');
  birds(c, t, 4, 4, '#3d5a73', 520);
  c.fillStyle = '#9cc7a4'; c.beginPath(); c.moveTo(0, 1300); for (let x = 0; x <= W; x += 60) c.lineTo(x, 1250 + Math.sin(x * 0.01) * 40); c.lineTo(W, 1560); c.lineTo(0, 1560); c.fill();
  // brick lab building with radar on the roof
  c.fillStyle = '#b5533c'; c.fillRect(380, 900, 700, 660); c.fillStyle = '#8f3d2b'; c.fillRect(370, 880, 720, 30);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { c.fillStyle = hash(i * 3 + j) > 0.6 ? '#ffe9a8' : '#3d5a73'; c.fillRect(430 + i * 128, 960 + j * 170, 80, 110); c.fillStyle = '#e9dccb'; c.fillRect(430 + i * 128, 1068 + j * 170, 80, 8); }
  radarDish(c, 760, 600, 170, t);
  // street, a 1940s car rolling past
  c.fillStyle = '#e4dccb'; c.fillRect(0, 1560, W, 80); c.fillStyle = '#8c8c8c'; c.fillRect(0, 1640, W, 280);
  c.fillStyle = '#f2f2f2'; for (let x = 0; x < W; x += 180) c.fillRect(x + 40, 1780, 90, 12);
  const cx = 1400 - t * 420;
  c.fillStyle = '#2f5d7c'; c.beginPath(); c.roundRect(cx - 170, 1690, 340, 80, 30); c.fill(); c.beginPath(); c.roundRect(cx - 90, 1630, 170, 80, 36); c.fill();
  c.fillStyle = '#bfe3f7'; c.fillRect(cx - 70, 1648, 60, 40); c.fillRect(cx + 4, 1648, 56, 40);
  c.fillStyle = '#1d1d22'; for (const wx of [-100, 100]) { c.beginPath(); c.arc(cx + wx, 1772, 34, 0, 7); c.fill(); }
  const w0 = walk(t, WALK0[0], WALK0[1], -160, 330, WALK0[2]);
  dust(c, w0.x, 1800, t, [0.35, 0.6, 0.85]);
  drawHost(c, { pose: 'serious', x: w0.x, ground: 1800, s: 0.62, flip: 1, air: w0.bob, lean: w0.lean, head: -0.2 * E.outCubic(prog(t, 1.3, 1.6)), alpha: 1, emote: t > 1.5 ? '?' : null, emoteU: prog(t, 1.5, 1.75) }, t);
  header(c, '1945', t, 0.3, 270, 130);
  tagPill(c, 'RADARFORSCHUNG', 760, 380, t, 1.0, 'white', 34);
}
function labRoom(c, t) {
  c.fillStyle = lin(c, 0, 0, 0, 1560, [[0, '#456878'], [1, '#2f4a58']]); c.fillRect(0, 0, W, 1560);
  c.fillStyle = '#577a89'; c.fillRect(50, 0, 30, 1560); c.fillRect(110, 0, 20, 1560); for (let y = 200; y < 1560; y += 320) { c.fillRect(40, y, 50, 24); c.fillRect(102, y + 60, 36, 20); }
  c.fillStyle = '#253740'; c.fillRect(0, 1560, W, 360); c.fillStyle = '#2d434e'; for (let x = 0; x < W; x += 160) c.fillRect(x, 1560, 6, 360);
  c.save(); c.globalAlpha = 0.12 + 0.02 * Math.sin(t * 9); c.fillStyle = '#fff3c4'; c.beginPath(); c.moveTo(470, 120); c.lineTo(610, 120); c.lineTo(900, 1560); c.lineTo(180, 1560); c.fill(); c.restore();
  c.fillStyle = '#1d2a30'; c.beginPath(); c.moveTo(460, 120); c.lineTo(620, 120); c.lineTo(580, 60); c.lineTo(500, 60); c.fill(); c.fillRect(536, 0, 8, 60);
}
function shLab(c, t) {
  const C = CUES, hot = prog(t, C.radar, C.radar + 0.4);
  labRoom(c, t);
  c.fillStyle = '#6b4a2f'; c.fillRect(20, 1330, 400, 34); c.fillRect(40, 1364, 24, 200); c.fillRect(380, 1364, 24, 200);
  scope(c, 220, 1180, 95, t);
  magnetron(c, 640, 760, 380, 800, t, hot);
  horn(c, 640, 1160, 90, -1, 0.25 + 0.25 * hot);
  waveArcs(c, 550, 1160, Math.PI, t, '255,190,120', 5, 520, 0.45);
  const x = 320, g = 1900, s = 1.8;
  person(c, x, g, s, { ...SPENCER, pose: 'stand' }, t);
  pocketChoco(c, x, g, s, 1);
  callout(c, 'PERCY SPENCER', x, g - 470 * s, 300, 560, t, C.ing + 0.5, 'white', 40);
  if (t > C.radar) glow(c, 830, 1000, 380, '120,255,160', 0.18 * hot);
  tagPill(c, 'RADARGERÄT', 830, 680, t, C.radar, 'red', 42);
}
function shShock(c, t) {
  const C = CUES, sh = t > C.melt + 0.3;
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#4d7383'], [1, '#2a4250']]); c.fillRect(0, 0, W, H);
  for (let k = 0; k < 7; k++) glow(c, hash(k + 1) * W, 200 + hash(k + 2) * 1400, 140, '255,200,140', 0.18);
  waveArcs(c, 1200, 900, Math.PI, t, '255,190,120', 6, 900, 0.6);
  person(c, 540, 2115, 3.0, { ...SPENCER, face: sh ? 'shock' : 'neutral' }, t);
  drawEmote(c, '!', 790, 560, prog(t, C.melt + 0.3, C.melt + 0.55), t);
  if (sh) drawEmote(c, 'sweat', 300, 700, prog(t, C.melt + 0.5, C.melt + 0.7), t);
  header(c, 'PLÖTZLICH…', t, C.melt + 0.05, 260, 80);
}
function shPocket(c, t) {
  const C = CUES, u = E.inOutCubic(prog(t, C.geschmolzen - 0.25, C.geschmolzen + 0.8));
  c.fillStyle = '#3b4a63'; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.07; c.strokeStyle = '#ffffff'; c.lineWidth = 3; for (let k = -40; k < 60; k++) { c.beginPath(); c.moveTo(k * 40, 0); c.lineTo(k * 40 + 1920, H); c.stroke(); } c.restore();
  c.fillStyle = '#2e3a50'; c.beginPath(); c.moveTo(0, 0); c.lineTo(160, 0); c.lineTo(90, H); c.lineTo(0, H); c.fill();
  waveArcs(c, 1180, 760, Math.PI, t, '255,190,120', 6, 900, 0.5);
  chocoBar(c, 370, 560 + Math.sin(t * 3) * 4, 340, 620, u);
  c.fillStyle = '#34425a'; c.beginPath(); c.roundRect(250, 1020, 580, 520, 22); c.fill();
  c.setLineDash([18, 14]); c.strokeStyle = '#6a7ea0'; c.lineWidth = 5; c.beginPath(); c.roundRect(268, 1038, 544, 484, 16); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#5a3220';
  for (let k = 0; k < 5; k++) { const len = u * (90 + hash(k + 3) * 300), xx = 400 + k * 70; if (len < 2) continue; c.beginPath(); c.roundRect(xx - 14, 1000, 28, len + 20, 14); c.fill(); c.beginPath(); c.arc(xx, 1020 + len, 20, 0, 7); c.fill(); }
  if (u > 0.2) { c.save(); c.strokeStyle = `rgba(255,255,255,${0.4 * u})`; c.lineWidth = 8; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { const yy = 520 - ((t * 160 + k * 90) % 260); c.beginPath(); c.moveTo(460 + k * 80 + Math.sin(yy * 0.03) * 20, yy + 120); c.quadraticCurveTo(480 + k * 80, yy + 60, 460 + k * 80 + Math.sin(yy * 0.03 + 1) * 20, yy); c.stroke(); } c.restore(); }
  tagPill(c, 'SCHOKORIEGEL', 540, 400, t, C.schoko + 0.1, 'white', 46);
  if (t > C.geschmolzen) { c.save(); c.translate(540, 1700); c.rotate(-0.05); tagPill(c, 'GESCHMOLZEN!', 0, 0, t, C.geschmolzen, 'red', 54); c.restore(); }
}
function shPopcorn(c, t) {
  const C = CUES, p0 = C.popcorn;
  c.fillStyle = lin(c, 0, 0, 0, 1600, [[0, '#1d2742'], [1, '#2b3658']]); c.fillRect(0, 0, W, 1600);
  c.fillStyle = '#141a2c'; c.fillRect(0, 1600, W, 320);
  c.fillStyle = '#0f1a3a'; c.fillRect(680, 240, 300, 380); c.strokeStyle = '#3a4a70'; c.lineWidth = 14; c.strokeRect(680, 240, 300, 380); c.beginPath(); c.moveTo(830, 240); c.lineTo(830, 620); c.stroke();
  for (let k = 0; k < 12; k++) { c.fillStyle = `rgba(255,255,230,${0.5 + 0.5 * Math.sin(t * 3 + k * 2)})`; c.beginPath(); c.arc(700 + hash(k) * 260, 260 + hash(k + 5) * 340, 3, 0, 7); c.fill(); }
  c.fillStyle = '#f3ead4'; c.beginPath(); c.arc(920, 330, 34, 0, 7); c.fill();
  magnetron(c, -140, 640, 400, 960, t, 0.8);
  horn(c, 260, 1160, 120, 1, 0.4 + 0.1 * Math.sin(t * 7));
  waveArcs(c, 390, 1160, 0, t, '255,170,90', 5, 420, 0.5);
  const air = bump(t, p0 + 0.05, 0.45) * 160;
  const st = { pose: 'serious', x: 720, ground: 1860, s: 0.6, flip: -1, air, sy: 1 + air / 1400, head: t > p0 + 0.6 ? Math.sin(t * 5) * 0.06 : -0.05, alpha: 1,
    emote: t > p0 + 0.9 ? 'sparkle' : t > p0 ? '!' : null, emoteU: t > p0 + 0.9 ? prog(t, p0 + 0.9, p0 + 1.1) : prog(t, p0, p0 + 0.2) };
  drawHost(c, st, t);
  const hp = hostAt(st, 800, 540), bx = hp[0] - 20, by = hp[1] - 30;
  c.fillStyle = '#d9b27a'; c.beginPath(); c.moveTo(bx - 60, by - 70); c.lineTo(bx + 60, by - 70); c.lineTo(bx + 70, by + 80); c.lineTo(bx - 70, by + 80); c.fill();
  c.fillStyle = '#c49a5e'; c.fillRect(bx - 60, by - 70, 120, 18);
  if (t < p0 + 0.3) for (let k = 0; k < 7; k++) { c.fillStyle = '#f3c23a'; c.beginPath(); c.ellipse(bx - 45 + k * 15 + Math.sin(t * 40 + k) * 3 * prog(t, C.mais, p0), by - 76 + Math.cos(t * 37 + k) * 3, 9, 12, 0, 0, 7); c.fill(); }
  for (let k = 0; k < 70; k++) {
    const t0 = p0 + Math.pow(hash(k), 1.6) * 0.7; if (t < t0) continue;
    const dt = t - t0, vx = (hash(k + 1) - 0.5) * 1500, vy = -1200 - hash(k + 2) * 1100;
    let x = bx + vx * dt, y = by - 70 + vy * dt + 1300 * dt * dt;
    y = Math.min(y, 1830 + hash(k + 3) * 70);
    puff(c, x, y, 30 + hash(k + 4) * 22, dt * 6 * (hash(k + 5) - 0.5));
  }
  if (t > p0 + 0.6) { const hd = hostAt(st, 520, 120); for (let k = 0; k < 3; k++) puff(c, hd[0] - 40 + k * 40, hd[1] - 10 - (k % 2) * 16, 20, k); }
  tagPill(c, 'MAIS', bx, by - 190, t, C.mais + 0.4, 'white', 40);
  header(c, 'POPCORN!', t, p0, 300, 110);
}
function eggLab(c, t, boom) {
  const C = CUES;
  c.fillStyle = lin(c, 0, 0, 0, 1380, [[0, '#d7eadf'], [1, '#bcd9c8']]); c.fillRect(0, 0, W, 1380);
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3; for (let y = 0; y < 1380; y += 110) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(620, 220, 360, 260, 12); c.fill(); c.fillStyle = '#e1ece6'; c.fillRect(640, 240, 320, 220);
  c.fillStyle = '#c8312b'; c.fillRect(670, 280, 120, 10); c.fillRect(670, 320, 200, 10); c.fillRect(670, 360, 160, 10);
  c.fillStyle = '#a87445'; c.fillRect(0, 1380, W, 40); c.fillStyle = '#8c5d34'; c.fillRect(0, 1420, W, 200); c.fillStyle = '#9fb5a8'; c.fillRect(0, 1620, W, 300);
  horn(c, -20, 1180, 160, 1, 0.35);
  waveArcs(c, 140, 1180, 0, t, '255,170,90', 5, 300, 0.45);
  c.fillStyle = '#9aa3ad'; c.beginPath(); c.roundRect(310, 1250, 220, 130, [0, 0, 26, 26]); c.fill(); c.fillStyle = '#b9c1c9'; c.fillRect(296, 1236, 248, 22); c.fillStyle = '#7d868f'; c.fillRect(530, 1280, 60, 16);
  const lean = boom ? 0.18 * E.outBack(prog(t, C.explode, C.explode + 0.3)) : lerp(0, -0.14, E.inOutCubic(prog(t, C.egg, C.explode)));
  c.save(); c.translate(780, 1840); c.rotate(lean); c.translate(-780, -1840);
  person(c, 780, 1840, 1.35, { ...COLLEAGUE, facing: -1, face: boom ? 'shock' : 'happy' }, t);
  if (boom) goo(c, 780, 1840 - 405 * 1.35, 0.55, t, C.explode);
  c.restore();
}
function shEgg(c, t) {
  const C = CUES, amp = E.inCubic(prog(t, C.egg + 0.3, C.explode)) * 0.3;
  eggLab(c, t, false);
  eggShape(c, 420, 1176 + Math.abs(Math.sin(t * 40)) * -8 * amp * 3, 1.0, Math.sin(t * 40) * amp);
  if (amp > 0.1) { c.strokeStyle = `rgba(30,30,30,${amp * 2})`; c.lineWidth = 5; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(420 + sg * 80, 1110); c.lineTo(420 + sg * 110, 1090); c.moveTo(420 + sg * 86, 1150); c.lineTo(420 + sg * 120, 1150); c.stroke(); } }
  tagPill(c, 'EI', 420, 1010, t, C.egg + 0.5, 'white', 44);
  drawEmote(c, '?', 690, 1000, prog(t, C.egg + 0.8, C.egg + 1.0), t);
}
function shBoom(c, t) {
  const C = CUES, u = prog(t, C.explode, C.explode + 0.35);
  eggLab(c, t, true);
  c.save(); c.translate(420, 1180); c.scale(E.outBack(u, 2), E.outBack(u, 2));
  c.fillStyle = '#ffd23f'; star(c, 0, 0, 300, 14, 0.62); c.fill(); c.fillStyle = '#fff3b0'; star(c, 0, 0, 200, 12, 0.6); c.fill();
  c.restore();
  for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283 + hash(k), d = 60 + E.outCubic(u) * (260 + hash(k + 2) * 260); c.fillStyle = k % 3 ? '#fffdf6' : '#ffb21f'; c.beginPath(); c.arc(420 + Math.cos(a) * d, 1180 + Math.sin(a) * d, 20 + hash(k + 4) * 26, 0, 7); c.fill(); }
  if (u > 0.2) { c.save(); c.translate(420, 1180); c.rotate(-0.1); text(c, 'PLATSCH!', 0, 0, { w: 900, s: 92, fill: '#c8312b', stroke: '#ffffff', sw: 12 }); c.restore(); }
  if (t < C.explode + 0.08) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(0, 0, W, H); }
}
function shFace(c, t) {
  const C = CUES;
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#d7eadf'], [1, '#a9cdb8']]); c.fillRect(0, 0, W, H);
  for (let k = 0; k < 6; k++) glow(c, hash(k + 11) * W, hash(k + 12) * H, 200, '255,255,255', 0.35);
  person(c, 540, 2115, 3.0, { ...COLLEAGUE, face: 'shock' }, t);
  goo(c, 540, 860, 1.25, t, C.explode + 0.75);
  for (let k = 0; k < 4; k++) { c.fillStyle = '#ffffff'; c.save(); c.translate(380 + k * 110, 540 + (k % 2) * 30); c.rotate(k); c.beginPath(); c.moveTo(-22, 0); c.lineTo(18, -14); c.lineTo(10, 18); c.fill(); c.restore(); }
  tagPill(c, 'KOLLEGE', 540, 330, t, C.explode + 0.85, 'white', 44);
  callout(c, 'MITTEN INS GESICHT', 640, 860, 540, 1560, t, C.gesicht, 'red', 46);
}
function shOven(c, t) {
  const C = CUES, ding = C.first - 0.4;
  rays(c, 540, 960, t, '#ffd6e0', '#ffe6ec');
  c.save(); c.translate(540, 1500); c.rotate(-0.06); c.fillStyle = '#f3ead4'; c.fillRect(-300, -170, 600, 340);
  c.fillStyle = '#b9ad94'; for (let k = 0; k < 6; k++) c.fillRect(-250, -110 + k * 40, k % 2 ? 380 : 480, 10);
  c.restore();
  if (t > C.mikro + 0.4) { const u = E.outBack(prog(t, C.mikro + 0.4, C.mikro + 0.65), 2.2); c.save(); c.translate(680, 1540); c.rotate(-0.25); c.scale(u, u); c.strokeStyle = '#c8312b'; c.lineWidth = 10; c.strokeRect(-150, -50, 300, 100); text(c, 'PATENT', 0, 4, { w: 900, s: 60, fill: '#c8312b', ls: 4 }); c.restore(); }
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(500, 1200, 380, 30, 0, 0, 7); c.fill();
  c.fillStyle = '#f7f7f9'; c.beginPath(); c.roundRect(150, 700, 720, 480, 30); c.fill();
  c.fillStyle = '#2a2f3a'; c.beginPath(); c.roundRect(190, 740, 470, 400, 18); c.fill();
  c.save(); c.beginPath(); c.roundRect(190, 740, 470, 400, 18); c.clip();
  const on = t < ding;
  if (on) { c.fillStyle = 'rgba(255,233,168,0.35)'; c.fillRect(190, 740, 470, 400); }
  c.fillStyle = '#c9ced6'; c.beginPath(); c.ellipse(425, 1080, 190, 34, 0, 0, 7); c.fill();
  c.fillStyle = '#e8e2d6'; c.beginPath(); c.ellipse(425 + Math.sin(t * 2.4) * 40, 1040, 110, 26, 0, 0, Math.PI); c.fill();
  for (let k = 0; k < 5; k++) puff(c, 380 + k * 22 + Math.sin(t * 2.4) * 40, 1010 - (k % 2) * 20, 22, k);
  c.restore();
  c.fillStyle = '#e4e6ea'; c.fillRect(690, 740, 150, 400);
  c.fillStyle = '#1d1d22'; c.beginPath(); c.roundRect(705, 760, 120, 60, 8); c.fill();
  const left = Math.max(0, Math.ceil(ding - t));
  text(c, `0:0${Math.min(9, left)}`, 765, 792, { w: 800, s: 36, fill: on ? '#7dff9a' : '#ff6b5a' });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { c.fillStyle = '#c9ced6'; c.beginPath(); c.roundRect(712 + i * 38, 850 + j * 44, 30, 30, 6); c.fill(); }
  c.fillStyle = '#8a8f96'; c.fillRect(700, 1010, 130, 50);
  if (!on) bubble(c, 'DING!', 760, 600, t, ding, -30);
  drawHost(c, { pose: t > C.mikro ? 'thumbsup' : 'serious', x: 920, ground: 1880, s: 0.45, flip: -1, head: Math.sin(t * 3) * 0.05, alpha: 1, emote: t > C.mikro + 0.2 ? 'sparkle' : null, emoteU: prog(t, C.mikro + 0.2, C.mikro + 0.4) }, t);
  header(c, 'DIE MIKROWELLE', t, C.mikro, 290, 92);
}
function shRadarange(c, t) {
  const C = CUES, z = C.zwei, k2 = C.kilo;
  c.fillStyle = lin(c, 0, 0, 0, 1600, [[0, '#c9f0de'], [1, '#a9e0c8']]); c.fillRect(0, 0, W, 1600);
  c.fillStyle = '#ffffff'; c.fillRect(0, 1100, W, 16);
  c.fillStyle = '#ffffff'; c.fillRect(60, 260, 300, 380); c.fillStyle = '#9fd8ff'; c.fillRect(80, 280, 260, 340); flatCloud(c, 160 + Math.sin(t * 0.6) * 30, 400, 180, '#ffffff');
  c.fillStyle = '#ff9fb4'; c.beginPath(); c.moveTo(50, 250); c.quadraticCurveTo(120 + Math.sin(t * 2) * 12, 450, 90, 660); c.lineTo(50, 660); c.fill(); c.beginPath(); c.moveTo(370, 250); c.quadraticCurveTo(300 + Math.sin(t * 2 + 1) * 12, 450, 330, 660); c.lineTo(370, 660); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(210, 800, 56, 0, 7); c.fill(); c.strokeStyle = '#1d1d22'; c.lineWidth = 5; c.stroke();
  c.beginPath(); c.moveTo(210, 800); c.lineTo(210 + Math.cos(t * 6.28 / 4 - 1.57) * 42, 800 + Math.sin(t * 6.28 / 4 - 1.57) * 42); c.moveTo(210, 800); c.lineTo(230, 774); c.stroke();
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#f7c6d3' : '#ffffff'; c.fillRect(i * 90, 1600 + j * 80, 90, 80); }
  // the Radarange cabinet
  const x0 = 560, x1 = 880, top = 560, bot = 1700;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse((x0 + x1) / 2, bot, 230, 26, 0, 0, 7); c.fill();
  c.fillStyle = '#ddd7c9'; c.beginPath(); c.roundRect(x0, top, x1 - x0, bot - top, 18); c.fill(); c.fillStyle = '#c9c2b2'; c.fillRect(x1 - 40, top, 40, bot - top);
  c.fillStyle = '#8a8f96'; c.beginPath(); c.roundRect(x0 + 24, top + 24, x1 - x0 - 88, 200, 10); c.fill();
  for (let k = 0; k < 2; k++) dial(c, x0 + 90 + k * 120, top + 110, 40, Math.sin(t * 2 + k) - 1);
  c.fillStyle = hash(Math.floor(t * 3)) > 0.4 ? '#ff5a4a' : '#5a2a2a'; c.beginPath(); c.arc(x0 + 90, top + 190, 12, 0, 7); c.fill();
  c.fillStyle = '#c9ced6'; c.beginPath(); c.roundRect(x0 + 24, top + 300, x1 - x0 - 88, 420, 12); c.fill();
  c.fillStyle = '#2a2f3a'; c.beginPath(); c.roundRect(x0 + 60, top + 360, x1 - x0 - 160, 240, 10); c.fill();
  c.fillStyle = '#9aa1a8'; c.fillRect(x1 - 110, top + 420, 18, 120);
  c.strokeStyle = '#b3ab99'; c.lineWidth = 6; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(x0 + 40, top + 800 + k * 34); c.lineTo(x1 - 70, top + 800 + k * 34); c.stroke(); }
  // measuring tape
  if (t > z) {
    const u = E.outCubic(prog(t, z, z + 0.7)), yT = bot - u * (bot - top);
    c.fillStyle = '#ffd23f'; c.fillRect(920, yT, 40, bot - yT); c.fillStyle = '#1d1d22';
    for (let y = bot; y > yT; y -= 57) c.fillRect(920, y, (Math.round((bot - y) / 57) % 5 ? 14 : 26), 4);
    c.fillStyle = '#c8312b'; c.beginPath(); c.roundRect(900, bot - 30, 80, 60, 10); c.fill();
    tagPill(c, 'FAST 2 M', 900, 470, t, z + 0.6, 'yellow', 44);
  }
  // 340 kg weight drops
  if (t > k2) {
    const u = prog(t, k2, k2 + 0.28), y = lerp(-200, 1700, u * u);
    c.fillStyle = '#2b2b30'; c.beginPath(); c.roundRect(80, y - 190, 220, 190, [60, 60, 20, 20]); c.fill();
    c.strokeStyle = '#2b2b30'; c.lineWidth = 26; c.beginPath(); c.arc(190, y - 200, 60, Math.PI, 0); c.stroke();
    text(c, '340 KG', 190, y - 90, { w: 900, s: 40, fill: '#ffffff' });
    if (u >= 1) for (let k = 0; k < 2; k++) { const d = prog(t, k2 + 0.28, k2 + 0.7); c.globalAlpha = 0.5 * (1 - d); c.fillStyle = '#d8d0c0'; c.beginPath(); c.arc(190 + (k ? 1 : -1) * (130 + 60 * d), 1690, 20 + 20 * d, 0, 7); c.fill(); c.globalAlpha = 1; }
  }
  const air = bump(t, z + 0.3, 0.55) * 230 + bump(t, k2 + 0.3, 0.3) * 60;
  drawHost(c, { pose: 'serious', x: 400, ground: 1760, s: 0.6, flip: 1, air, sy: 1 + air / 1500, sx: 1 - air / 2500, head: -0.22, alpha: 1,
    emote: t > k2 + 0.3 ? '!' : t > z + 0.9 ? 'sweat' : null, emoteU: t > k2 + 0.3 ? prog(t, k2 + 0.3, k2 + 0.5) : prog(t, z + 0.9, z + 1.1) }, t);
  header(c, 'DIE ERSTE', t, C.first + 0.05, 280, 90);
  tagPill(c, '1947', 540, 400, t, C.first + 0.3, 'white', 44);
}
function shPrice(c, t) {
  const C = CUES;
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#ffe3ea'], [1, '#ffc0d1']]); c.fillRect(0, 0, W, H);
  for (let k = 0; k < 16; k++) { const x = hash(k) * W + Math.sin(t * 2 + k) * 50, y = ((t * (240 + hash(k + 1) * 160) + hash(k + 2) * 2200) % 2300) - 200; bill(c, x, y, 190, Math.sin(t * 3 + k) * 0.6, '1'); }
  const u = E.outBack(prog(t, C.kost + 0.05, C.kost + 0.4), 1.4), sw = Math.sin(t * 3.2) * 0.12 * Math.exp(-(t - C.kost) * 0.8);
  c.save(); c.translate(540, lerp(-700, 0, u));
  c.strokeStyle = '#7a5a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(sw) * 640, 640); c.stroke();
  c.translate(Math.sin(sw) * 640, 640); c.rotate(-sw);
  c.fillStyle = '#f6e7c1'; c.beginPath(); c.moveTo(0, -40); c.lineTo(300, 40); c.lineTo(300, 380); c.lineTo(-300, 380); c.lineTo(-300, 40); c.closePath(); c.fill();
  c.strokeStyle = '#c9b48a'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#ffc0d1'; c.beginPath(); c.arc(0, 30, 22, 0, 7); c.fill();
  text(c, t > C.preis ? '5000 $' : '? ? ?', 0, 220, { w: 900, s: t > C.preis ? 130 : 110, fill: '#1d1d22' });
  c.restore();
  tagPill(c, 'PREIS', 540, 1320, t, C.kost + 0.3, 'red', 44);
}
function shOffice(c, t) {
  const C = CUES, a = C.pay;
  c.fillStyle = '#efe3c8'; c.fillRect(0, 0, W, 900); c.fillStyle = '#8a5a3a'; c.fillRect(0, 900, W, 700); c.fillStyle = '#5a3a26'; c.fillRect(0, 1600, W, 320); c.fillStyle = '#4c3020'; for (let x = 0; x < W; x += 120) c.fillRect(x, 1600, 5, 320); c.fillStyle = '#7a4e32'; for (let x = 0; x < W; x += 135) c.fillRect(x, 900, 8, 700);
  c.fillStyle = '#6b3f22'; c.fillRect(0, 880, W, 26);
  c.fillStyle = '#ffffff'; c.fillRect(520, 170, 460, 560); c.fillStyle = '#a9d8f5'; c.fillRect(540, 190, 420, 520);
  flatCloud(c, 640 + ((t * 25) % 300), 300, 160, '#ffffff');
  c.fillStyle = '#7fa3c0'; for (let k = 0; k < 6; k++) { const hh = 160 + hash(k + 20) * 260; c.fillRect(550 + k * 70, 710 - hh, 60, hh); }
  c.fillStyle = '#ffffff'; c.fillRect(745, 190, 10, 520); c.fillRect(540, 440, 420, 10);
  c.fillStyle = '#3a2a1e'; c.fillRect(100, 260, 260, 200); c.fillStyle = '#e8dcc0'; c.fillRect(116, 276, 228, 168); radarDish(c, 230, 350, 50, t * 0.3);
  person(c, 780, 1760, 1.6, { ...BOSS, pose: t > a + 0.8 && t < a + 1.6 ? 'hold' : 'stand', talk: t > a + 1.4 ? 0.4 : 0 }, t);
  c.fillStyle = '#6b3f22'; c.fillRect(420, 1440, 700, 480); c.fillStyle = '#7d4a2a'; c.fillRect(400, 1420, 700, 40);
  c.fillStyle = '#2f6b3a'; c.beginPath(); c.ellipse(990, 1340, 80, 34, 0, Math.PI, 0); c.fill(); c.fillStyle = '#c9a23a'; c.fillRect(984, 1340, 12, 80); glow(c, 990, 1360, 160, '255,230,150', 0.35);
  const eu = E.inOutCubic(prog(t, a + 0.9, a + 1.6)); c.save(); c.translate(lerp(700, 480, eu), 1410); c.rotate(-0.05);
  c.fillStyle = '#f3ead4'; c.fillRect(-90, -50, 180, 100); c.strokeStyle = '#c9b48a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-90, -50); c.lineTo(0, 10); c.lineTo(90, -50); c.stroke(); c.restore();
  person(c, 230, 1920, 1.7, { ...SPENCER, face: 'happy', pose: t > a + 1.6 ? 'point' : 'stand' }, t);
  bubble(c, '$ $ $ ?', 330, 1060, t, a + 0.5, -60);
  callout(c, 'SPENCER', 230, 1920 - 470 * 1.7, 200, 640, t, a + 0.2, 'white', 40);
  callout(c, 'SEINE FIRMA', 780, 1760 - 470 * 1.6, 800, 600, t, a + 0.9, 'white', 40);
}
function shTwo(c, t) {
  const C = CUES, d = C.dollar;
  c.fillStyle = '#7d4a2a'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 6; for (let k = 0; k < 30; k++) { c.beginPath(); c.moveTo(0, k * 70 + 20); c.bezierCurveTo(300, k * 70 + 40 * Math.sin(k), 700, k * 70 - 30, W, k * 70 + 25); c.stroke(); }
  glow(c, 980, 200, 520, '255,230,150', 0.35);
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(540, 1480, 340, 40, 0, 0, 7); c.fill();
  c.fillStyle = '#f3ead4'; c.fillRect(240, 1220, 600, 260); c.fillStyle = '#e6d9bb'; c.beginPath(); c.moveTo(240, 1220); c.lineTo(540, 1060); c.lineTo(840, 1220); c.fill();
  for (const [k, dx, rot] of [[0, -110, -0.14], [1, 120, 0.12]]) {
    const u = E.outBack(prog(t, d + 0.05 + k * 0.2, d + 0.45 + k * 0.2), 1.6);
    if (u <= 0) continue;
    bill(c, 540 + dx * u, lerp(1260, 900, u) + Math.sin(t * 3 + k) * 6, 380, rot * u + Math.sin(t * 2 + k) * 0.03, '1');
  }
  c.fillStyle = '#f3ead4'; c.fillRect(240, 1240, 600, 240); c.strokeStyle = '#c9b48a'; c.lineWidth = 5; c.beginPath(); c.moveTo(240, 1480); c.lineTo(540, 1330); c.lineTo(840, 1480); c.stroke();
  tagPill(c, 'ZWEI DOLLAR', 540, 330, t, d + 0.1, 'yellow', 76);
  tagPill(c, 'MIKROWELLE: 5000 $', 540, 500, t, d + 1.0, 'white', 36);
  tagPill(c, 'SPENCER: 2 $', 540, 590, t, d + 1.4, 'red', 36);
  const hu = E.outBack(prog(t, d + 0.7, d + 1.1), 1.6);
  drawHost(c, { pose: 'thinking', x: 900, ground: lerp(2500, 1940, hu), s: 0.5, flip: -1, head: t > d + 2.0 ? Math.sin(t * 12) * 0.08 : 0, alpha: hu > 0 ? 1 : 0,
    emote: t > d + 2.0 ? 'sweat' : t > d + 1.2 ? '!' : null, emoteU: t > d + 2.0 ? prog(t, d + 2.0, d + 2.2) : prog(t, d + 1.2, d + 1.4) }, t);
}

// ------------------------------------------------------------------ frame: hard cuts, slow camera push on every shot
function shake(t) {
  let x = 0, y = 0;
  for (const [cue, amp] of [[CUES.geschmolzen, 5], [CUES.popcorn, 7], [CUES.explode, 14], [CUES.kilo + 0.28, 10], [CUES.dollar + 0.5, 5]]) {
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
  const vg = c.createRadialGradient(540, 900, 560, 540, 900, 1300); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  drawCaptions(c, t);
  drawGrainVignette(c, t);
  return t;
};
