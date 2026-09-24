// Evora ID — design thumbnails (rendered with the same renderer as the
// in-world DUI; frozen until hovered to keep the UI light)

import { h } from './dom.js';
import { renderDesign } from '../core/render.js';
import { ensureFonts, fontsOfDesign } from '../core/fonts.js';

const pending = new WeakMap();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      io.unobserve(e.target);
      const fn = pending.get(e.target);
      if (fn) fn();
    }
  }
}, { rootMargin: '120px' });

export function thumb(design, id, { w = 160, h: height = 80, zoom = 1.3, live = false, fluid = false } = {}) {
  const el = h('div.thumb', { style: fluid ? { width: '100%', aspectRatio: `${w} / ${height}` } : { width: `${w}px`, height: `${height}px` } });
  if (!design) return el;
  let handle = null;
  let disposed = false;
  const render = async () => {
    await ensureFonts(fontsOfDesign(design));
    if (disposed) return;
    if (fluid && el.clientWidth) {
      height = Math.round((el.clientWidth * height) / w);
      w = el.clientWidth;
    }
    try {
      handle = renderDesign(el, design, id, { static: !live });
    } catch (e) {
      return;
    }
    const s = (w / 512) * zoom;
    handle.stage.style.transform = `scale(${s})`;
    handle.stage.style.left = `${w / 2 - 256 * s}px`;
    handle.stage.style.top = `${height / 2 - 128 * s}px`;
  };
  pending.set(el, render);
  io.observe(el);
  el._dispose = () => { disposed = true; io.unobserve(el); if (handle) handle.destroy(); };
  el.addEventListener('mouseenter', () => el.classList.add('ev-play'));
  el.addEventListener('mouseleave', () => el.classList.remove('ev-play'));
  return el;
}

// Fit thumbnails to their container width.
export function thumbFit(design, id, width) {
  return thumb(design, id, { w: width, h: Math.round(width / 2) });
}
