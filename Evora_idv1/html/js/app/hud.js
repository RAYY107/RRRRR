// Evora ID — on-screen "talking now" indicator for the local player.
// Styled by the player's own design (voice section); shown while they talk.

import { initLabelFonts, ensureFonts, fontsOfDesign } from '../core/fonts.js';
import { renderVoiceBadge } from '../core/render.js';

const el = document.getElementById('hud');
let cfg = null;
let badge = null;
let current = null;

function place() {
  if (!cfg || !el) return;
  const [v, hz] = String(cfg.position || 'bottom-center').split('-');
  const st = el.style;
  st.left = st.right = st.top = st.bottom = 'auto';
  let tx = '0', ty = '0';
  if (hz === 'left') st.left = `${24 + cfg.offsetX}px`;
  else if (hz === 'right') st.right = `${24 - cfg.offsetX}px`;
  else { st.left = `calc(50% + ${cfg.offsetX}px)`; tx = '-50%'; }
  if (v === 'top') st.top = `${cfg.offsetY}px`;
  else if (v === 'bottom') st.bottom = `${cfg.offsetY}px`;
  else { st.top = '50%'; ty = '-50%'; }
  st.transform = `translate(${tx}, ${ty}) scale(${cfg.scale || 1})`;
  st.transformOrigin = `${hz === 'left' ? 'left' : hz === 'right' ? 'right' : 'center'} ${v === 'top' ? 'top' : v === 'bottom' ? 'bottom' : 'center'}`;
}

export function hudInit(data) {
  cfg = data;
  initLabelFonts(data.labels, data.defaultLabel, 'fonts/');
  place();
}

export async function hudStyle(design) {
  current = design;
  if (badge) { badge.destroy(); badge = null; }
  if (!design || !el) return;
  await ensureFonts(fontsOfDesign(design));
  if (current !== design) return;
  badge = renderVoiceBadge(el, design);
}

export function hudShow(on) {
  if (el) el.classList.toggle('on', !!on);
}
