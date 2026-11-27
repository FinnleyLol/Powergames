// Renders scene.html frame by frame with Playwright (headless Chromium) and encodes with ffmpeg.
//   node render.mjs --workers 4            -> build/video.mp4
//   node render.mjs --stills 0.5,4.2,9.0   -> build/stills/t_XX.XX.png (quick preview)
import { createRequire } from 'module';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);
const BUILD = path.join(HERE, 'build');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tiktok-oymyakon/scene.html`);
  const info = await page.evaluate(() => window.init());
  return { page, frames: info.frames };
}

function ffmpegSink(out) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-maxrate', '16M', '-bufsize', '32M', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg ' + code)))));
  return { ff, done };
}

async function main() {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  try {
    if (args.stills) {
      const { page } = await openPage(browser, port);
      fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
      for (const s of args.stills.split(',')) {
        const t = parseFloat(s), i = Math.round(t * 30);
        await page.evaluate(n => window.renderFrame(n), i);
        await page.screenshot({ path: path.join(BUILD, 'stills', `t_${t.toFixed(2).padStart(5, '0')}.png`) });
      }
      console.log('stills written');
      return;
    }
    const workers = parseInt(args.workers || '4', 10);
    const probe = await openPage(browser, port);
    const total = probe.frames;
    await probe.page.close();
    const per = Math.ceil(total / workers);
    const t0 = Date.now();
    let doneFrames = 0;
    const segs = [];
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = w * per, b = Math.min(total, a + per);
      if (a >= b) return;
      const seg = path.join(BUILD, `seg_${w}.mp4`); segs[w] = seg;
      const { page } = await openPage(browser, port);
      const { ff, done } = ffmpegSink(seg);
      for (let i = a; i < b; i++) {
        await page.evaluate(n => window.renderFrame(n), i);
        const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        doneFrames++;
        if (doneFrames % 60 === 0) console.log(`  ${doneFrames}/${total} frames (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      }
      ff.stdin.end(); await done; await page.close();
    }));
    const list = path.join(BUILD, 'segments.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
    await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(BUILD, 'video.mp4')], { stdio: 'inherit' })
      .on('close', c => (c === 0 ? res() : rej(new Error('concat failed')))));
    segs.filter(Boolean).forEach(s => fs.unlinkSync(s));
    console.log(`video: ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } finally {
    await browser.close();
    srv.close();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
