// Evora ID — DUI atlas host
// Renders up to cols x rows designs into fixed 512x256 slots. The client
// maps each slot onto a sprite above a player's head. Messages only
// arrive when a slot's content changes; nothing here runs per frame
// except the CSS animations of the designs themselves.

import { initFonts, ensureFonts, fontsOfDesign } from './core/fonts.js';
import { renderDesign, initAssets } from './core/render.js';
import { resourceName } from './core/util.js';

const atlas = document.getElementById('atlas');
const slots = new Map(); // index -> { el, handle, key, token }
let geom = { cols: 4, rows: 4, slotW: 512, slotH: 256 };
let initialised = false;

function slotEl(index) {
  let s = slots.get(index);
  if (!s) {
    const el = document.createElement('div');
    el.className = 'slot';
    const i = index - 1;
    el.style.left = `${(i % geom.cols) * geom.slotW}px`;
    el.style.top = `${Math.floor(i / geom.cols) * geom.slotH}px`;
    atlas.appendChild(el);
    s = { el, handle: null, key: null, token: 0 };
    slots.set(index, s);
  }
  return s;
}

function clear(index) {
  const s = slots.get(index);
  if (!s) return;
  s.token++;
  s.key = null;
  if (s.handle) s.handle.destroy();
  s.handle = null;
}

async function setSlot(msg) {
  const s = slotEl(msg.slot);
  if (s.key === msg.key && s.handle) return;
  const token = ++s.token;
  s.key = msg.key;
  if (!msg.design) {
    clear(msg.slot);
    return;
  }
  // fonts first, so the swap happens once with the final glyphs
  await ensureFonts(fontsOfDesign(msg.design));
  if (token !== s.token) return;
  const old = s.handle;
  try {
    s.handle = renderDesign(s.el, msg.design, msg.id);
  } catch (e) {
    s.handle = null;
  }
  if (old) old.destroy();
}

function handle(msg) {
  if (typeof msg === 'string') {
    try { msg = JSON.parse(msg); } catch { return; }
  }
  if (!msg || typeof msg !== 'object') return;
  switch (msg.type) {
    case 'init': {
      const next = { cols: msg.cols, rows: msg.rows, slotW: msg.slotW, slotH: msg.slotH };
      const changed = JSON.stringify(next) !== JSON.stringify(geom) || !initialised;
      geom = next;
      atlas.style.width = `${geom.cols * geom.slotW}px`;
      atlas.style.height = `${geom.rows * geom.slotH}px`;
      initFonts(msg.fonts, msg.fallback, 'fonts/');
      initAssets(msg.assets, '');
      // repeated init messages (sent defensively by the client) are harmless
      if (changed) for (const k of [...slots.keys()]) { clear(k); slots.get(k).el.remove(); slots.delete(k); }
      initialised = true;
      break;
    }
    case 'slot':
      setSlot(msg);
      break;
    case 'clear':
      clear(msg.slot);
      break;
    default:
      break;
  }
}

window.addEventListener('message', (e) => handle(e.data));

// Tell the client the page is live (also after a DUI reload).
fetch(`https://${resourceName()}/renderHostReady`, { method: 'POST', body: '{}' }).catch(() => {});

// test hook (not used in game)
window.__evoraHost = { handle };
