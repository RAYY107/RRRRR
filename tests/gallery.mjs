// Renders every preset through the real DUI host page (html/render.html)
// in headless Chromium and saves a contact sheet: tests/out/presets.png
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, '..', 'Evora_idv1', 'html');
const data = JSON.parse(fs.readFileSync(path.join(here, 'out', 'data.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const cols = 4;
const presets = data.presets;
const rows = Math.ceil(presets.length / cols);
const ids = [7, 42, 128, 5, 1024, 63, 9, 311];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: cols * 512, height: rows * 256 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
await page.goto(`http://127.0.0.1:${port}/render.html`);
await page.addStyleTag({ content: `
  body { background: #2a2d33 !important; }
  .slot { background: radial-gradient(ellipse at 50% 60%, #4a4f57 0%, #1d1f23 75%); outline: 1px solid #000; }
  .slot::after { content: attr(data-name); position: absolute; left: 8px; bottom: 6px; font: 12px sans-serif; color: #9aa0a6; }
` });
await page.evaluate(({ data, cols, rows }) => {
  window.__evoraHost.handle({ type: 'init', cols, rows, slotW: 512, slotH: 256, fonts: data.fonts, fallback: data.fallback, assets: data.assets, labels: data.labelFonts, defaultLabel: data.defaultLabel });
}, { data, cols, rows });
for (let i = 0; i < presets.length; i++) {
  await page.evaluate(({ i, p, id }) => {
    window.__evoraHost.handle({ type: 'slot', slot: i + 1, id, key: p.id, design: p.design, talking: i % 2 === 0 });
  }, { i, p: presets[i], id: ids[i % ids.length] });
}
await page.waitForTimeout(2500);
await page.evaluate((names) => {
  document.querySelectorAll('.slot').forEach((el) => {
    const i = (parseInt(el.style.top) / 256) * 4 + parseInt(el.style.left) / 512;
    el.dataset.name = names[i];
  });
}, presets.map((p) => `${p.id} · ${p.category}`));
await page.screenshot({ path: path.join(here, 'out', 'presets.png') });
const real = errors.filter((e) => !/ERR_CONNECTION_REFUSED|404/.test(e)); // renderHostReady ping + favicon
console.log('errors:', real.length ? real : 'none');
await browser.close();
server.close();
