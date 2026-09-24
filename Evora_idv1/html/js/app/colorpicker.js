// Evora ID — colour picker popover (HSV + alpha + hex + swatches)

import { h } from './dom.js';
import { popover } from './ui.js';
import { hexToHsv, hsvToHex, normalizeHex, rgba } from '../core/color.js';
import { clamp, round } from '../core/util.js';
import { swatches, pushSwatch } from './storage.js';

const PALETTE = [
  '#FFFFFF', '#E6E8EB', '#B9BEC6', '#8E949E', '#5C6168', '#2A2D33', '#16171A', '#000000', '#F7F3EE',
  '#F9E9B8', '#D4AF37', '#B06A2A', '#FF5A5F', '#C9184A', '#FF4FB8', '#9B6BD6', '#4D8EFF', '#00E5FF',
];

/**
 * openColorPicker(anchor, { hex, alpha, withAlpha, onInput(hex, a), onCommit(hex, a) })
 */
export function openColorPicker(anchor, opts) {
  let hsv = hexToHsv(opts.hex || '#FFFFFF');
  let a = opts.alpha ?? 1;
  const withAlpha = opts.withAlpha !== false;

  const sv = h('div.sv');
  const svKnob = h('div.knob');
  sv.appendChild(svKnob);
  const hue = h('div.bar.hue');
  const hueThumb = h('div.thumb');
  hue.appendChild(hueThumb);
  const alphaFill = h('i');
  const alpha = h('div.bar.alpha', alphaFill);
  const alphaThumb = h('div.thumb');
  alpha.appendChild(alphaThumb);
  const hexIn = h('input.input.ltr', { style: { height: '28px', fontFamily: 'var(--mono)', fontSize: '11.5px' } });
  const aIn = h('input.numbox', { style: { width: '52px' } });

  const hex = () => hsvToHex(hsv);
  const paint = () => {
    const pure = hsvToHex({ h: hsv.h, s: 1, v: 1 });
    sv.style.background = pure;
    svKnob.style.left = `${hsv.s * 100}%`;
    svKnob.style.top = `${(1 - hsv.v) * 100}%`;
    hueThumb.style.left = `${(hsv.h / 360) * 100}%`;
    alphaFill.style.background = `linear-gradient(to right, ${rgba(hex(), 0)}, ${rgba(hex(), 1)})`;
    alphaThumb.style.left = `${a * 100}%`;
    if (document.activeElement !== hexIn) hexIn.value = hex();
    if (document.activeElement !== aIn) aIn.value = `${Math.round(a * 100)}%`;
  };
  const emit = (commit) => {
    const hx = hex();
    if (commit) { pushSwatch(hx); opts.onCommit && opts.onCommit(hx, round(a, 2)); }
    else opts.onInput && opts.onInput(hx, round(a, 2));
  };

  const drag = (el, fn) => {
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      const move = (ev) => { const r = el.getBoundingClientRect(); fn((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height); paint(); emit(false); };
      const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); emit(true); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      move(e);
    });
  };
  drag(sv, (x, y) => { hsv = { ...hsv, s: clamp(x, 0, 1), v: clamp(1 - y, 0, 1) }; });
  drag(hue, (x) => { hsv = { ...hsv, h: clamp(x, 0, 0.9999) * 360 }; });
  if (withAlpha) drag(alpha, (x) => { a = clamp(x, 0, 1); });

  hexIn.addEventListener('change', () => {
    const v = normalizeHex(hexIn.value);
    if (v) { hsv = hexToHsv(v); paint(); emit(true); } else paint();
  });
  aIn.addEventListener('change', () => {
    const v = parseFloat(aIn.value);
    if (!Number.isNaN(v)) { a = clamp(v / 100, 0, 1); paint(); emit(true); } else paint();
  });

  const sw = (list) => h('div.swatches', list.map((c) => h('button', {
    style: { background: c }, title: c,
    onClick: () => { hsv = hexToHsv(c); paint(); emit(true); },
  })));

  const recent = swatches();
  const content = h('div.picker',
    sv, hue, withAlpha ? alpha : null,
    h('div.row', hexIn, withAlpha ? aIn : null),
    sw(PALETTE),
    recent.length ? sw(recent) : null,
  );
  const pop = popover(anchor, content, { width: 264 });
  paint();
  return pop;
}
