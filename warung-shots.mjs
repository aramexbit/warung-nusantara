// Warung Nusantara screenshots: serves game/ on :8091, opens each ?shot= scene from
// shots.json in headless Chromium, waits for window.__shotReady, and writes the JPEG
// into screenshots/. Exits non-zero on any console/page error or an oversized shot.
// Usage: node warung-shots.mjs [shot-name ...] — no args = all 4 shots.
import { chromium } from '/home/hatch/workspace/xe-audit/sdk/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';

const ROOT = '/home/hatch/workspace/makefun/warung-nusantara';
const SHOTS = JSON.parse(readFileSync(`${ROOT}/shots.json`, 'utf8'));
const only = process.argv.slice(2);
const list = only.length ? SHOTS.filter((s) => only.includes(s.name.replace('.jpg', ''))) : SHOTS;
mkdirSync(`${ROOT}/screenshots`, { recursive: true });

const server = spawn('node', ['serve.ts', '--port', '8091'], {
  cwd: ROOT, env: { ...process.env }, stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const errs = [];
let fail = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  for (const s of list) {
    const name = s.name.replace('.jpg', '');
    await page.goto(`http://localhost:8091/${s.query}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 120000 });
    await page.waitForTimeout(400);
    const out = `${ROOT}/screenshots/${s.name}`;
    await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
    const kb = Math.round(statSync(out).size / 1024);
    console.log(`[${name}] ${out} ${kb} KiB ${kb <= 256 ? 'OK' : 'TOO BIG'}`);
    if (kb > 256) fail = 1;
  }
} finally {
  await browser.close();
  server.kill();
}
if (errs.length) {
  console.log('PAGE ERRORS:');
  for (const e of errs) console.log(' - ' + e);
  fail = 1;
}
process.exit(fail);
