// Evora ID — popovers, menus, dialogs, toasts

import { h, ic, clear } from './dom.js';

let openPop = null;

export function closePopover() {
  if (openPop) {
    const p = openPop;
    openPop = null;
    p.el.remove();
    document.removeEventListener('pointerdown', p.outside, true);
    if (p.onClose) p.onClose();
  }
}

export function popover(anchor, content, { onClose, width, align = 'end' } = {}) {
  closePopover();
  const el = h('div.pop', content);
  if (width) el.style.width = `${width}px`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const pr = el.getBoundingClientRect();
  let left = align === 'end' ? r.right - pr.width : r.left;
  left = Math.max(8, Math.min(innerWidth - pr.width - 8, left));
  let top = r.bottom + 6;
  if (top + pr.height > innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  const outside = (e) => {
    if (!el.contains(e.target) && !anchor.contains(e.target)) closePopover();
  };
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  openPop = { el, outside, onClose };
  return { el, close: closePopover };
}

export const popoverOpen = () => openPop !== null;

// items: { label, icon, onClick, disabled, on, sep, hint, head }
export function menu(anchor, items, opts = {}) {
  const content = items.map((it) => {
    if (it.sep) return h('div.menu-sep');
    if (it.head) return h('div.menu-label', it.head);
    return h('button.menu-item', {
      class: it.on ? 'on' : '',
      disabled: it.disabled || null,
      onClick: () => { closePopover(); it.onClick && it.onClick(); },
    }, it.icon ? ic(it.icon, 'sm') : null, h('span', it.label), it.hint ? h('span.k', it.hint) : null, it.on ? ic('check', 'sm') : null);
  });
  return popover(anchor, content, opts);
}

// ---- dialogs
let modalStack = [];

export function dialog({ title, desc, body, actions = [], wide = false, onClose }) {
  const wrap = h('div.modal-wrap');
  const close = () => {
    wrap.remove();
    modalStack = modalStack.filter((m) => m !== api);
    if (onClose) onClose();
  };
  const acts = h('div.acts', actions.map((a) => h(`button.btn${a.primary ? '.primary' : ''}${a.ghost ? '.ghost' : ''}`, {
    disabled: a.disabled || null,
    onClick: async (e) => {
      if (a.onClick) {
        e.currentTarget.disabled = true;
        const keep = await a.onClick(api);
        e.currentTarget.disabled = false;
        if (keep === false) return;
      }
      close();
    },
  }, a.icon ? ic(a.icon, 'sm') : null, a.label)));
  const modal = h(`div.modal${wide ? '.wide' : ''}`, h('h3', title), desc ? h('div.d', desc) : null, body || null, actions.length ? acts : null);
  wrap.appendChild(modal);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
  const api = { close, el: modal };
  modalStack.push(api);
  return api;
}

export function closeTopModal() {
  const m = modalStack[modalStack.length - 1];
  if (m) { m.close(); return true; }
  return false;
}

export function confirm(title, desc, okLabel = 'تأكيد', { danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    dialog({
      title,
      desc,
      actions: [
        { label: okLabel, primary: !danger, onClick: () => { done = true; resolve(true); } },
        { label: 'إلغاء', ghost: true },
      ],
      onClose: () => { if (!done) resolve(false); },
    });
  });
}

// ---- toasts
let toastBox = null;
export function toast(message, kind = 'ok') {
  toastBox = toastBox || document.body.appendChild(h('div.toasts'));
  const t = h(`div.toast${kind === 'err' ? '.err' : ''}`, ic(kind === 'err' ? 'info' : 'check', 'sm'), h('span', message));
  toastBox.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 2600);
  setTimeout(() => t.remove(), 3000);
}

export function clearToasts() {
  if (toastBox) clear(toastBox);
}
