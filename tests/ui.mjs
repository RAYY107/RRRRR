// Drives the real NUI (html/index.html) in headless Chromium with a mocked
// client/server bridge and saves screenshots to tests/out/.
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

const presets = data.presets.map((p) => ({ ...p }));
const byId = Object.fromEntries(presets.map((p) => [p.id, p]));
const boot = {
  brand: { name: 'Evora', credit: 'Made by LR' }, stage: { w: 512, h: 256 },
  schema: data.schema, defaults: data.defaults, fonts: data.fonts, fontFallback: data.fallback, assets: data.assets,
  effects: data.effects, effectPresets: data.effectPresets, easings: data.easings, categories: data.categories,
  affixes: data.affixes, numerals: data.numerals, limits: data.limits, editor: { snap: 8, minZoom: 1.1, maxZoom: 3.6 },
  labelFonts: data.labelFonts, defaultLabel: data.defaultLabel, voice: data.voice,
};
const selfBootstrap = {
  serverId: 7, name: 'Layla', perms: { self: true, manage: true, bypass: false },
  design: byId['crimson-steel'].design,
  record: { status: 'permanent', mode: 'permanent', cooldown: 0, cooldownApplies: true, locked: false, presetId: 'crimson-steel', hasDesign: true },
  slots: [{ slot: 1, name: 'Crimson', design: byId['crimson-steel'].design, updatedAt: Math.floor(Date.now() / 1000) - 7200 }],
  favorites: [{ kind: 'preset', ref: 'aurora' }, { kind: 'preset', ref: 'obsidian-crown' }],
  presetVersion: 3, presets,
  limits: { cooldownSeconds: 259200, slots: 3, favorites: 40, images: { enabled: true, allowUrl: true, allowDiscord: true, hosts: ['cdn.discordapp.com', 'i.imgur.com'], maxBytes: 4194304, allowGif: true } },
  dbAvailable: true, defaultDesign: byId['evora-classic'].design,
};
const names = ['Layla', 'Omar', 'Faris', 'Noor', 'Sami', 'Hala', 'Yousef', 'Rami', 'Dana', 'Kareem'];
const statuses = ['permanent', 'temporary', 'none', 'permanent', 'expired', 'temporary', 'permanent', 'none', 'permanent', 'temporary'];
const rows = names.map((n, i) => ({
  serverId: [7, 12, 3, 41, 18, 5, 27, 9, 33, 64][i], name: n, owner: `vrp:${100 + i * 7}`, online: true,
  status: statuses[i], mode: statuses[i] === 'temporary' || statuses[i] === 'expired' ? 'temporary' : 'permanent',
  expiresIn: statuses[i] === 'temporary' ? 86400 * (i + 1) + 3600 : null, locked: i === 3, cooldown: i === 1 ? 90000 : 0,
  presetId: statuses[i] === 'none' ? null : presets[(i * 5) % presets.length].id,
  design: statuses[i] === 'none' ? null : presets[(i * 5) % presets.length].design,
}));
const managerBootstrap = {
  serverId: 7, perms: { self: true, manage: true, bypass: true }, presetVersion: 3, presets,
  stats: { online: 10, permanent: 4, temporary: 3, expired: 1, none: 2, storedPermanent: 128, storedTemporary: 23, storedExpired: 6 },
  settings: { framework: 'vrp_modern', database: true, cooldownSeconds: 259200, managersExempt: true, durations: [{ label: '3 أيام', seconds: 259200 }, { label: '7 أيام', seconds: 604800 }, { label: '30 يوماً', seconds: 2592000 }], defaultSeconds: 604800, maxSeconds: 31536000, slots: 3, webhook: true, allowForce: true, images: selfBootstrap.limits.images, maxDistance: 22, displayMode: 'always', defaultPreset: 'evora-classic' },
  defaultDesign: byId['evora-classic'].design,
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_/.test(m.text())) errors.push(m.text()); });

await page.addInitScript(({ selfBootstrap, managerBootstrap, rows }) => {
  window.__posts = [];
  window.__EVORA_MOCK__ = {
    async post(name, data) {
      window.__posts.push({ name, data });
      if (name === 'preview') window.__preview && window.__preview(data);
      if (name !== 'request') return true;
      const a = data.action;
      const ok = (d) => ({ ok: true, data: d });
      if (a === 'manager.players') return ok({ rows });
      if (a === 'manager.designs') return ok({ rows: rows.filter((r) => r.status !== 'none'), total: 157, page: 1, pageSize: 40 });
      if (a === 'manager.get') { const r = rows.find((x) => x.owner === data.payload.owner); return ok({ ...r, summary: { status: r.status, mode: r.mode, expiresIn: r.expiresIn, locked: r.locked, cooldown: r.cooldown } }); }
      if (a === 'manager.audit') return ok({ rows: [{ at: Date.now() / 1000 - 60, action: 'apply_preset', actor_name: 'Admin Faris', target_name: 'Omar', detail: 'Crimson Steel' }, { at: Date.now() / 1000 - 400, action: 'reset_cooldown', actor_name: 'Admin Faris', target_name: 'Noor', detail: '' }, { at: Date.now() / 1000 - 3600, action: 'preset_create', actor_name: 'Admin Hala', detail: 'Midnight Gold (c-midnight-gold)' }] });
      if (a === 'manager.stats') return ok({ stats: managerBootstrap.stats, presetVersion: 3 });
      if (a === 'editor.save') return ok({ ...selfBootstrap.record, cooldown: 259200 });
      if (a === 'image.validate') return ok({ url: data.payload.url || 'https://cdn.discordapp.com/embed/avatars/0.png', kind: 'png' });
      return ok({});
    },
  };
}, { selfBootstrap, managerBootstrap, rows });

await page.goto(`http://127.0.0.1:${port}/index.html`);
// simulated game world + the DUI render of the preview at the anchor
await page.addStyleTag({ content: `
  html { background: radial-gradient(ellipse at 52% 70%, #5a5147 0%, #2b2b2e 45%, #121316 100%) !important; }
  #world { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
  #ped { position: fixed; left: calc(50% - 90px); top: 42%; width: 180px; height: 560px; border-radius: 90px 90px 30px 30px;
         background: linear-gradient(180deg, #2f3136 0%, #1e1f22 100%); box-shadow: 0 0 80px rgba(0,0,0,.5); }
  #ped::before { content: ''; position: absolute; left: 50%; top: -120px; width: 104px; height: 128px; margin-left: -52px; border-radius: 50%; background: #7a6152; }
  #dui { position: fixed; transform-origin: 0 0; }
` });
await page.evaluate(() => {
  const w = document.createElement('div'); w.id = 'world';
  w.innerHTML = '<div id="ped"></div><div id="dui"></div>';
  document.body.prepend(w);
});

await page.evaluate(({ boot }) => window.postMessage({ action: 'boot', data: boot }, '*'), { boot });
await page.waitForTimeout(200);

// mirror the preview into the fake world, the way the DUI sprite would
await page.evaluate(async () => {
  const { renderDesign } = await import('./js/core/render.js');
  const { ensureFonts, fontsOfDesign } = await import('./js/core/fonts.js');
  let handle = null;
  window.__preview = async ({ design, displayId, talking }) => {
    const d = design || window.__default;
    if (!d) return;
    await ensureFonts(fontsOfDesign(d));
    const host = document.getElementById('dui');
    host.classList.toggle('ev-talking', !!talking);
    if (handle) handle.destroy();
    handle = renderDesign(host, d, displayId);
    const a = window.__anchor;
    if (!a) return;
    const k = (a.h * innerHeight) / 256;
    host.style.left = `${a.x * innerWidth - 256 * k}px`;
    host.style.top = `${a.y * innerHeight - 128 * k}px`;
    host.style.transform = `scale(${k})`;
  };
});

async function openSelf() {
  await page.evaluate(({ selfBootstrap }) => {
    window.__default = selfBootstrap.defaultDesign;
    window.__anchor = { x: 0.5, y: 0.3, w: 0.34, h: 0.34 * 16 / 9 / 2 * 1.0 };
    window.postMessage({ action: 'open', mode: 'self', data: selfBootstrap }, '*');
  }, { selfBootstrap });
  await page.waitForTimeout(300);
  // centre of the free area reported by the NUI (layout callback) -> anchor there
  await page.evaluate(() => {
    const layout = [...window.__posts].reverse().find((p) => p.name === 'layout');
    const cx = layout ? layout.data.cx : 0.5;
    window.__anchor = { x: cx, y: 0.3, w: 0.3, h: 0.3 * (innerWidth / innerHeight) / 2 };
    document.getElementById('ped').style.left = `${cx * innerWidth - 90}px`;
    window.postMessage({ action: 'anchor', data: window.__anchor }, '*');
    const last = [...window.__posts].reverse().find((p) => p.name === 'preview');
    if (last) window.__preview(last.data);
  });
  await page.waitForTimeout(1200);
}

await openSelf();
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-simple.png') });

// click a preset card, then check the preview changed
await page.locator('.drawer .card').nth(8).click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-preset.png') });

// advanced mode, effect tab + timeline
await page.locator('#levelSeg button').nth(1).click();
await page.locator('.tab', { hasText: 'التأثير' }).click();
await page.waitForTimeout(200);
await page.locator('.panel button', { hasText: 'فتح المخطط الزمني' }).click().catch(() => {});
await page.locator('.editor .nav-item', { hasText: 'القوالب' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-advanced.png') });

// character editor
await page.locator('.tab', { hasText: 'الأحرف' }).click();
await page.waitForTimeout(200);
await page.locator('.char-chip').nth(0).click();
await page.locator('.panel .slider input[type=range]').first().fill('1.4');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-chars.png') });

// undo / redo sanity
const before = await page.evaluate(() => document.querySelectorAll('.rule').length);
await page.keyboard.press('Control+z');
await page.waitForTimeout(200);
const afterUndo = await page.evaluate(() => document.querySelectorAll('.rule').length);

// randomize
await page.locator('.tb-btn', { hasText: 'توليد' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-random.png') });
await page.locator('.banner button', { hasText: 'تطبيق' }).click();

// gizmo drag of the text layer
const layer = page.locator('.gz-stage .ev-text');
const box = await layer.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 4, { steps: 8 });
  await page.screenshot({ path: path.join(here, 'out', 'ui-editor-drag.png') });
  await page.mouse.up();
}

// image tab
await page.locator('.tab', { hasText: 'الصورة' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-image.png') });

// voice tab: talking preview on the live character
await page.locator('.tab', { hasText: 'الصوت' }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-voice.png') });
await page.locator('.panel .fx-tile', { hasText: 'مستوى' }).click();
await page.locator('.panel .chip', { hasText: 'On Mic' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-voice2.png') });
// on-screen HUD
await page.evaluate(({ boot, d }) => {
  window.postMessage({ action: 'hudInit', data: { labels: boot.labelFonts, defaultLabel: boot.defaultLabel, position: 'bottom-center', offsetX: 0, offsetY: 120, scale: 1 } }, '*');
  window.postMessage({ action: 'hudStyle', data: { design: d } }, '*');
  window.postMessage({ action: 'hud', on: true }, '*');
}, { boot, d: byId['aurora'].design });

// manager
await page.evaluate(({ managerBootstrap }) => window.postMessage({ action: 'open', mode: 'manage', data: managerBootstrap }, '*'), { managerBootstrap });
await page.waitForTimeout(900);
await page.locator('.prow').nth(1).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(here, 'out', 'ui-manager.png') });
await page.locator('.manager .nav-item', { hasText: 'القوالب' }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(here, 'out', 'ui-manager-presets.png') });
await page.locator('.manager .nav-item', { hasText: 'السجل' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(here, 'out', 'ui-manager-audit.png') });

// manager -> edit a player's design in the live editor
await page.locator('.manager .nav-item', { hasText: 'اللاعبون' }).click();
await page.waitForTimeout(700);
await page.locator('.prow button', { hasText: 'تعديل' }).nth(3).click();
await page.waitForTimeout(900);
const ctxText = await page.locator('.context-bar').innerText();
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-player.png') });
await page.locator('.insp-foot button', { hasText: 'حفظ للاعب' }).isDisabled();
await page.locator('.context-bar button').click();
await page.waitForTimeout(500);
// manager -> new preset
await page.locator('.manager .nav-item', { hasText: 'القوالب' }).click();
await page.waitForTimeout(500);
await page.locator('.mg-tools button', { hasText: 'قالب جديد' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(here, 'out', 'ui-editor-preset-new.png') });
console.log('context bar:', ctxText.replace(/\s+/g, ' '));

const saves = await page.evaluate(() => window.__posts.filter((p) => p.name === 'request').map((p) => p.data.action));
console.log('rules before/after undo:', before, afterUndo);
console.log('requests:', [...new Set(saves)].join(', '));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
