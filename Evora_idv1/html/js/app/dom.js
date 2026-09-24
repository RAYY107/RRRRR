// Evora ID — tiny DOM helpers

import { icon } from './icons.js';

export function h(tag, props, ...children) {
  if (props instanceof Node || typeof props === 'string' || typeof props === 'number' || Array.isArray(props)) {
    children.unshift(props);
    props = null;
  }
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = `${el.className} ${v}`.trim();
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  // thumbnails own a <style> element with their effect keyframes
  el.querySelectorAll('.thumb').forEach((t) => t._dispose && t._dispose());
  while (el.firstChild) el.firstChild.remove();
  return el;
}

export function ic(name, cls) {
  return icon(name, cls);
}

// Latin text inside Arabic UI (names, units, ids).
export const ltr = (text, cls = 'en') => h(`bdi.${cls}`, { dir: 'ltr' }, text);
export const num = (text) => h('bdi.num', { dir: 'ltr' }, String(text));

let tipEl = null;
export function tooltip(el, text) {
  el.addEventListener('mouseenter', () => {
    if (!text) return;
    tipEl = tipEl || document.body.appendChild(h('div.tip'));
    tipEl.textContent = typeof text === 'function' ? text() : text;
    tipEl.style.display = 'block';
    const r = el.getBoundingClientRect();
    const tr = tipEl.getBoundingClientRect();
    let top = r.bottom + 8;
    if (top + tr.height > innerHeight - 8) top = r.top - tr.height - 8;
    tipEl.style.top = `${top}px`;
    tipEl.style.left = `${Math.max(8, Math.min(innerWidth - tr.width - 8, r.left + r.width / 2 - tr.width / 2))}px`;
  });
  el.addEventListener('mouseleave', () => { if (tipEl) tipEl.style.display = 'none'; });
  return el;
}

export function hideTip() {
  if (tipEl) tipEl.style.display = 'none';
}
