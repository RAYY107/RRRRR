// Evora ID — direct manipulation over the live in-game render
//
// The client reports where the ID anchor is on screen and how large the
// 512x256 stage is drawn there. We lay an invisible copy of the design
// (same renderer, animations off) exactly on top of the real DUI sprite.
// Its layers receive the pointer, and the selection frames/handles live
// inside those layers so they inherit every transform exactly.

import { h } from '../dom.js';
import { S, on, setDesign, setUI, commit } from '../store.js';
import { renderDesign } from '../../core/render.js';
import { ensureFonts, fontsOfDesign } from '../../core/fonts.js';
import { clamp, round, get, throttle } from '../../core/util.js';
import { post } from '../nui.js';
import { range } from '../schema.js';
import { SEL_PATH } from './panels/position.js';

const rad = (d) => (d * Math.PI) / 180;

function unrotate(x, y, deg) {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return { x: x * c + y * s, y: -x * s + y * c };
}

export function createGizmo() {
  const root = h('div.gizmo');
  const hit = h('div.hit');
  const stageEl = h('div.gz-stage');
  const stageFrame = h('div.gz-stage-frame');
  const guides = h('div');
  const groupFrame = h('div.gz-group');
  const anchorMark = h('div.gz-anchor');
  root.append(hit, stageEl, guides, anchorMark);

  let ghost = null;
  let drag = null;
  let fontsKey = '';
  let visible = false;

  const cameraRotate = throttle((deg) => post('camera', { rotate: deg }), 40);

  const geometry = () => {
    const a = S.anchor;
    if (!a) return null;
    const W = innerWidth, H = innerHeight;
    const k = (a.h * H) / 256;
    return { cx: a.x * W, cy: a.y * H, k };
  };

  const enabled = () => visible && S.view === 'editor' && S.anchor && S.ui.compare === 'after';

  function place() {
    const g = geometry();
    root.style.display = enabled() ? '' : 'none';
    if (!g) return;
    stageEl.style.left = `${g.cx - 256 * g.k}px`;
    stageEl.style.top = `${g.cy - 128 * g.k}px`;
    stageEl.style.width = '512px';
    stageEl.style.height = '256px';
    stageEl.style.transform = `scale(${g.k})`;
    stageEl.style.setProperty('--inv', String(1 / g.k));
    anchorMark.style.left = `${g.cx}px`;
    anchorMark.style.top = `${g.cy}px`;
  }

  function frame(showHandles, label) {
    const f = h('div.gz-frame');
    if (showHandles) {
      for (const c of ['nw', 'ne', 'sw', 'se']) f.appendChild(h(`div.gz-h.${c}`, { dataset: { handle: 'scale' } }));
      f.appendChild(h('div.gz-rot', { dataset: { handle: 'rotate' } }));
      if (label) f.appendChild(h('div.gz-label', label));
    }
    return f;
  }

  function scaleOf(sel) {
    const g = geometry();
    const d = S.design;
    let s = g.k * d.transform.scale;
    if (sel === 'stage') return g.k;
    if (d.group.on) s *= d.group.scale;
    if (sel === 'group') return s;
    return s * d.layers[sel].scale;
  }

  function decorate() {
    if (!ghost || !geometry()) return;
    const sel = S.ui.selection;
    stageEl.classList.toggle('sel-stage', sel === 'stage');
    const label = drag ? drag.label : null;
    for (const key of ['text', 'image']) {
      const layer = key === 'text' ? ghost.text?.layer : ghost.image?.layer;
      if (!layer) continue;
      layer.dataset.layer = key;
      layer.style.setProperty('--inv', String(1 / Math.max(0.001, scaleOf(key))));
      const hover = frame(false);
      hover.classList.add('hover');
      layer.appendChild(hover);
      if (sel === key) layer.appendChild(frame(true, label));
    }
    groupFrame.remove();
    if (sel === 'group' && S.design.group.on) {
      const r = unionRect();
      if (r) {
        Object.assign(groupFrame.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
        groupFrame.innerHTML = '';
        for (const c of ['nw', 'ne', 'sw', 'se']) groupFrame.appendChild(h(`div.gz-h.${c}`, { dataset: { handle: 'scale' }, style: { pointerEvents: 'auto' } }));
        groupFrame.appendChild(h('div.gz-rot', { dataset: { handle: 'rotate' } }));
        if (label) groupFrame.appendChild(h('div.gz-label', label));
        root.appendChild(groupFrame);
      }
    }
  }

  function render() {
    if (!enabled() || !S.design) return;
    if (ghost) ghost.destroy();
    stageEl.textContent = '';
    stageEl.appendChild(stageFrame);
    ghost = renderDesign(stageEl, S.design, S.displayId, { ghost: true });
    decorate();
    const k = fontsOfDesign(S.design).join('|');
    if (k !== fontsKey) {
      fontsKey = k;
      ensureFonts(fontsOfDesign(S.design)).then(() => { if (!drag) render(); });
    }
  }

  function layerEl(sel) {
    if (!ghost) return null;
    if (sel === 'text') return ghost.text?.layer;
    if (sel === 'image') return ghost.image?.layer;
    return null;
  }

  function unionRect() {
    const rs = [ghost?.text?.layer, ghost?.image?.layer].filter((e) => e && e.style.display !== 'none').map((e) => e.getBoundingClientRect());
    if (!rs.length) return null;
    const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
    const right = Math.max(...rs.map((r) => r.right)), bottom = Math.max(...rs.map((r) => r.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function rectOf(sel) {
    if (sel === 'group') return unionRect();
    if (sel === 'stage') {
      const g = geometry();
      return { left: g.cx - 256 * g.k, top: g.cy - 128 * g.k, width: 512 * g.k, height: 256 * g.k, right: g.cx + 256 * g.k, bottom: g.cy + 128 * g.k };
    }
    const el = layerEl(sel);
    return el ? el.getBoundingClientRect() : null;
  }

  // Screen-pixel delta -> units in the parent space of the selection.
  function toParent(dx, dy, sel) {
    const g = geometry();
    const d = S.design;
    let x = dx / g.k, y = dy / g.k;
    if (sel === 'stage') return { x, y };
    ({ x, y } = unrotate(x, y, d.transform.rotate));
    x /= d.transform.scale; y /= d.transform.scale;
    if (sel === 'group') return { x, y };
    if (d.group.on) {
      ({ x, y } = unrotate(x, y, d.group.rotate));
      x /= d.group.scale; y /= d.group.scale;
    }
    return { x, y };
  }

  function clearGuides() { guides.textContent = ''; }

  function drawGuides(lines) {
    clearGuides();
    if (!S.ui.guides) return;
    const g = geometry();
    for (const l of lines) {
      if (l.axis === 'x') guides.appendChild(h('div.gz-guide.v', { style: { left: `${l.at}px`, top: `${g.cy - 128 * g.k}px`, height: `${256 * g.k}px` } }));
      else guides.appendChild(h('div.gz-guide.h', { style: { top: `${l.at}px`, left: `${g.cx - 256 * g.k}px`, width: `${512 * g.k}px` } }));
    }
  }

  // Alignment against the stage centre and the other element.
  function snapLines(sel) {
    const g = geometry();
    const me = rectOf(sel);
    if (!me) return { dx: 0, dy: 0, lines: [] };
    const xs = [{ at: g.cx }], ys = [{ at: g.cy }];
    const other = sel === 'text' ? 'image' : sel === 'image' ? 'text' : null;
    const or = other && S.design[other === 'image' ? 'image' : 'text'] && (other === 'text' || S.design.image.on) ? rectOf(other) : null;
    if (or) {
      xs.push({ at: or.left }, { at: or.left + or.width / 2 }, { at: or.right });
      ys.push({ at: or.top }, { at: or.top + or.height / 2 }, { at: or.bottom });
    }
    const edgesX = [me.left, me.left + me.width / 2, me.right];
    const edgesY = [me.top, me.top + me.height / 2, me.bottom];
    const threshold = S.ui.snap ? S.ui.snapPx : 0.75;
    const best = (edges, cands) => {
      let out = null;
      for (const e of edges) for (const c of cands) {
        const diff = c.at - e;
        if (Math.abs(diff) <= threshold && (!out || Math.abs(diff) < Math.abs(out.diff))) out = { diff, at: c.at };
      }
      return out;
    };
    const bx = best(edgesX, xs), by = best(edgesY, ys);
    const lines = [];
    if (bx) lines.push({ axis: 'x', at: bx.at });
    if (by) lines.push({ axis: 'y', at: by.at });
    return { dx: S.ui.snap && bx ? bx.diff : 0, dy: S.ui.snap && by ? by.diff : 0, lines };
  }

  function setTransform(sel, patch) {
    const path = SEL_PATH[sel];
    setDesign((d) => Object.assign(get(d, path), patch), { commit: false });
  }

  function startDrag(e, sel, mode) {
    const r = rectOf(sel);
    if (!r) return;
    const path = SEL_PATH[sel];
    const start = { ...get(S.design, path) };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    drag = {
      sel, mode, start, x0: e.clientX, y0: e.clientY, cx, cy,
      d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
      a0: Math.atan2(e.clientY - cy, e.clientX - cx),
      label: null,
    };
    e.preventDefault();
    const move = (ev) => {
      if (!drag) return;
      const { start: s0 } = drag;
      if (mode === 'move') {
        const p = toParent(ev.clientX - drag.x0, ev.clientY - drag.y0, sel);
        const rx = range(`${path}.x`), ry = range(`${path}.y`);
        let nx = clamp(s0.x + p.x, rx.min, rx.max), ny = clamp(s0.y + p.y, ry.min, ry.max);
        setTransform(sel, { x: round(nx, 1), y: round(ny, 1) });
        const sn = snapLines(sel);
        if (sn.dx || sn.dy) {
          const c = toParent(sn.dx, sn.dy, sel);
          nx = clamp(nx + c.x, rx.min, rx.max);
          ny = clamp(ny + c.y, ry.min, ry.max);
          setTransform(sel, { x: round(nx, 1), y: round(ny, 1) });
        }
        drawGuides(sn.lines);
        drag.label = `${round(nx, 0)}, ${round(ny, 0)}`;
      } else if (mode === 'scale') {
        const rs = range(`${path}.scale`);
        const ratio = Math.hypot(ev.clientX - drag.cx, ev.clientY - drag.cy) / drag.d0;
        const ns = round(clamp(s0.scale * ratio, rs.min, rs.max), 3);
        setTransform(sel, { scale: ns });
        drag.label = `${Math.round(ns * 100)}%`;
      } else if (mode === 'rotate') {
        const rr = range(`${path}.rotate`);
        let deg = s0.rotate + ((Math.atan2(ev.clientY - drag.cy, ev.clientX - drag.cx) - drag.a0) * 180) / Math.PI;
        deg = ((deg + 540) % 360) - 180;
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = round(clamp(deg, rr.min, rr.max), 1);
        setTransform(sel, { rotate: deg });
        drag.label = `${deg}°`;
      }
      decorateLabel();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      drag = null;
      clearGuides();
      commit();
      render();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function decorateLabel() {
    const l = root.querySelector('.gz-label');
    if (l && drag) l.textContent = drag.label || '';
  }

  // pointer on a layer or a handle
  stageEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const handle = e.target.closest('[data-handle]');
    const layer = e.target.closest('.ev-layer');
    if (handle) return startDrag(e, S.ui.selection, handle.dataset.handle);
    if (!layer) return;
    const key = layer.dataset.layer;
    let sel = key;
    if (S.design.group.on && S.ui.selection !== key) sel = 'group';
    if (sel !== S.ui.selection) setUI({ selection: sel });
    startDrag(e, sel, 'move');
  });
  stageEl.addEventListener('dblclick', (e) => {
    const layer = e.target.closest('.ev-layer');
    if (layer) setUI({ selection: layer.dataset.layer });
  });
  groupFrame.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('[data-handle]');
    if (handle) startDrag(e, 'group', handle.dataset.handle);
  });

  // empty space: inside the stage moves the whole composition, outside
  // it turns the character; the wheel zooms the camera
  hit.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const g = geometry();
    const inside = g && Math.abs(e.clientX - g.cx) <= 256 * g.k && Math.abs(e.clientY - g.cy) <= 128 * g.k;
    if (inside && enabled()) {
      if (S.ui.selection !== 'stage') setUI({ selection: 'stage' });
      return startDrag(e, 'stage', 'move');
    }
    let lastX = e.clientX;
    const move = (ev) => { const dx = ev.clientX - lastX; lastX = ev.clientX; if (dx) cameraRotate(dx * 0.45); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  hit.addEventListener('wheel', (e) => {
    post('camera', { zoom: e.deltaY > 0 ? 0.12 : -0.12 });
  }, { passive: true });

  on((kind, info) => {
    if (kind === 'design' || kind === 'anchor' || kind === 'view') { place(); render(); }
    if (kind === 'ui' && ('selection' in info || 'compare' in info)) { place(); render(); }
  });
  window.addEventListener('resize', () => { place(); render(); });

  return {
    el: root,
    show(v) { visible = v; place(); render(); },
    nudge(dx, dy) {
      const sel = S.ui.selection;
      const path = SEL_PATH[sel];
      const t = get(S.design, path);
      setDesign((d) => Object.assign(get(d, path), { x: round(t.x + dx, 1), y: round(t.y + dy, 1) }));
    },
  };
}
