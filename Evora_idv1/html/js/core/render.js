// Evora ID — design renderer (shared by the DUI atlas and the editor)
//
// renderDesign(container, design, id) builds the DOM for one design on a
// 512x256 unit stage. `id` is the player's REAL server id; the design
// only controls how that number is drawn.
//
// DOM
//   .ev-stage                      512x256, clips the composition
//     .ev-root                     transform (whole composition), origin = stage centre
//       .ev-group                  group transform (text + image)
//         .ev-all                  effect target "all"
//           .ev-layer.ev-image     image layer  > .ev-fx > .ev-img
//           .ev-layer.ev-text      text layer   > .ev-fx > .ev-line > .ev-ch*
//   Each character: .ev-ch (static offset/rotate + filters) > .ev-ch-a (letter
//   animation) > .ev-ch-s (outline) + .ev-ch-f (fill) [+ .ev-ch-x (sweep)]

import { fontStack, labelStack, voiceFontOf } from './fonts.js';
import { rgba } from './color.js';
import { buildEffect, effectNeedsOverlay } from './effects.js';

export const STAGE_W = 512;
export const STAGE_H = 256;

const NUMERALS = {
  latin: '0123456789',
  arabic: '٠١٢٣٤٥٦٧٨٩',
  persian: '۰۱۲۳۴۵۶۷۸۹',
};

let assetMap = new Map();
let assetBase = 'assets/';
let instanceN = 0;

export function initAssets(list, base = '') {
  assetBase = base;
  assetMap = new Map((list || []).map((a) => [a.id, a]));
}

export function assetUrl(id) {
  const a = assetMap.get(id);
  return a ? assetBase + a.file : '';
}

export function formatDigits(id, numerals) {
  const s = String(Math.max(0, Math.floor(Number(id) || 0)));
  const map = NUMERALS[numerals] || NUMERALS.latin;
  return [...s].map((c) => map[c.charCodeAt(0) - 48] ?? c);
}

// Characters of the rendered ID: decorative prefix, real digits, suffix.
export function charList(text, id) {
  const out = [];
  const pre = [...(text.prefix || '')];
  const digits = formatDigits(id, text.numerals);
  const suf = [...(text.suffix || '')];
  pre.forEach((ch, i) => out.push({ ch, kind: 'prefix', index: i }));
  digits.forEach((ch, i) => out.push({ ch, kind: 'digit', index: i }));
  suf.forEach((ch, i) => out.push({ ch, kind: 'suffix', index: i }));
  out.forEach((c, pos) => { c.pos = pos; });
  return { chars: out, digitCount: digits.length };
}

export function selectorMatches(sel, c, digitCount) {
  if (!sel) return false;
  switch (sel.mode) {
    case 'all': return true;
    case 'prefix': return c.kind === 'prefix';
    case 'suffix': return c.kind === 'suffix';
    default: break;
  }
  if (c.kind !== 'digit') return false;
  const i = c.index;
  switch (sel.mode) {
    case 'index': return i === sel.a;
    case 'range': return i >= Math.min(sel.a, sel.b) && i <= Math.max(sel.a, sel.b);
    case 'list': return Array.isArray(sel.list) && sel.list.includes(i);
    case 'first': return i === 0;
    case 'last': return i === digitCount - 1;
    case 'odd': return i % 2 === 0;   // 1st, 3rd, 5th ...
    case 'even': return i % 2 === 1;  // 2nd, 4th ...
    default: return false;
  }
}

// Effective style of one character after applying every matching rule.
// Offsets/rotation add up, scale/opacity multiply, the rest overrides.
export function charStyle(text, c, digitCount) {
  const st = {
    fill: text.fill, font: text.font, weight: text.weight,
    scale: c.kind === 'digit' ? 1 : text.affixScale,
    x: 0, y: 0, rotate: 0, opacity: 1,
    outline: text.outline, shadow: text.shadow, glow: text.glow, animate: true,
  };
  for (const rule of text.chars || []) {
    if (!selectorMatches(rule.sel, c, digitCount)) continue;
    const s = rule.style || {};
    if (s.fill) st.fill = s.fill;
    if (s.font) st.font = s.font;
    if (s.weight) st.weight = s.weight;
    if (s.outline) st.outline = s.outline;
    if (s.shadow) st.shadow = s.shadow;
    if (s.glow) st.glow = s.glow;
    st.scale *= s.scale ?? 1;
    st.x += s.x ?? 0;
    st.y += s.y ?? 0;
    st.rotate += s.rotate ?? 0;
    st.opacity *= s.opacity ?? 1;
    if (typeof s.animate === 'boolean') st.animate = s.animate;
  }
  return st;
}

export function stopsCss(stops) {
  return (stops || []).map((s) => `${rgba(s.c, s.a)} ${s.p}%`).join(', ');
}

export function gradientCss(fill, override = {}) {
  const f = { ...fill, ...override };
  if (f.type === 'linear') return `linear-gradient(${f.angle}deg, ${stopsCss(f.stops)})`;
  if (f.type === 'radial') return `radial-gradient(circle farthest-corner at ${f.cx}% ${f.cy}%, ${stopsCss(f.stops)})`;
  if (f.type === 'conic') return `conic-gradient(from ${f.angle}deg at ${f.cx}% ${f.cy}%, ${stopsCss(f.stops)})`;
  return 'none';
}

// CSS declarations painting a fill into text (solid or gradient).
export function applyTextFill(el, fill) {
  if (!fill || fill.type === 'solid') {
    el.style.color = rgba(fill?.color || '#FFFFFF', fill?.alpha ?? 1);
    el.style.webkitTextFillColor = '';
    el.style.backgroundImage = '';
    return false;
  }
  el.style.backgroundImage = gradientCss(fill);
  el.style.webkitBackgroundClip = 'text';
  el.style.backgroundClip = 'text';
  el.style.color = 'transparent';
  el.style.webkitTextFillColor = 'transparent';
  return true;
}

// Paints a fill as a plain background (image tint, shapes).
export function applyBoxFill(el, fill) {
  if (!fill || fill.type === 'solid') {
    el.style.background = rgba(fill?.color || '#FFFFFF', fill?.alpha ?? 1);
  } else {
    el.style.background = gradientCss(fill);
  }
}

export function filterCss(shadow, glow) {
  const parts = [];
  if (glow && glow.on && glow.strength > 0 && glow.radius > 0) {
    const a = glow.alpha * glow.strength;
    parts.push(`drop-shadow(0 0 ${Math.max(1, glow.radius * 0.35)}px ${rgba(glow.color, Math.min(1, a * 1.1))})`);
    parts.push(`drop-shadow(0 0 ${glow.radius}px ${rgba(glow.color, a)})`);
  }
  if (shadow && shadow.on) {
    parts.push(`drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur * 0.5}px ${rgba(shadow.color, shadow.alpha)})`);
  }
  return parts.join(' ');
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function layerTransform(l, anchorX = '-50%') {
  return `translate(${l.x}px, ${l.y}px) rotate(${l.rotate}deg) scale(${l.scale}) translate(${anchorX}, -50%)`;
}

export function rootTransform(t) {
  return `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`;
}

export function groupTransform(g) {
  if (!g || !g.on) return 'none';
  return `translate(${g.x}px, ${g.y}px) rotate(${g.rotate}deg) scale(${g.scale})`;
}

const ANCHOR = { center: '-50%', left: '0%', right: '-100%' };

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function buildText(design, id, overlay) {
  const text = design.text;
  const layer = el('div', 'ev-layer ev-text');
  const fx = el('div', 'ev-fx');
  const line = el('div', 'ev-line');
  layer.appendChild(fx);
  fx.appendChild(line);
  layer.style.transform = layerTransform(design.layers.text, ANCHOR[text.align] || '-50%');
  layer.style.opacity = text.opacity;
  if (design.layers.text.hidden) layer.style.display = 'none';

  const { chars, digitCount } = charList(text, id);
  const nodes = [];
  chars.forEach((c, n) => {
    const st = charStyle(text, c, digitCount);
    const ch = el('span', `ev-ch c${c.pos} k-${c.kind}${st.animate ? ' anim' : ''}`);
    const a = el('span', 'ev-ch-a');
    const f = el('span', 'ev-ch-f');
    f.textContent = c.ch;

    ch.style.fontFamily = fontStack(st.font);
    ch.style.fontWeight = st.weight;
    ch.style.fontStyle = text.italic ? 'italic' : 'normal';
    ch.style.fontSize = `${text.size * st.scale}px`;
    ch.style.lineHeight = String(text.lineHeight);
    if (st.x || st.y || st.rotate) ch.style.transform = `translate(${st.x}px, ${st.y}px) rotate(${st.rotate}deg)`;
    if (st.opacity !== 1) ch.style.opacity = st.opacity;
    const filter = filterCss(st.shadow, st.glow);
    if (filter) ch.style.filter = filter;

    // spacing: tracking between characters, affixGap between affixes and digits
    const next = chars[n + 1];
    let gap = next ? text.tracking : 0;
    if (next && c.kind !== next.kind) gap += text.affixGap;
    if (gap) ch.style.marginRight = `${gap}px`;

    if (st.outline && st.outline.on && st.outline.width > 0) {
      const s = el('span', 'ev-ch-s');
      s.textContent = c.ch;
      s.style.webkitTextStroke = `${st.outline.width * 2}px ${rgba(st.outline.color, st.outline.alpha)}`;
      a.appendChild(s);
    }
    const gradient = applyTextFill(f, st.fill);
    a.appendChild(f);
    if (overlay) {
      const x = el('span', 'ev-ch-x');
      x.textContent = c.ch;
      a.appendChild(x);
    }
    ch.appendChild(a);
    line.appendChild(ch);
    nodes.push({ el: ch, fillEl: f, pos: c.pos, kind: c.kind, index: c.index, animate: st.animate, gradient, fill: st.fill, glow: st.glow });
  });

  return { layer, fx, line, nodes, textScope: text.fillScope };
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

function buildImage(design, overlay, onError) {
  const img = design.image;
  const layer = el('div', 'ev-layer ev-image');
  const fx = el('div', 'ev-fx');
  const box = el('div', 'ev-img');
  layer.appendChild(fx);
  fx.appendChild(box);
  layer.style.transform = layerTransform(design.layers.image);
  layer.style.opacity = img.opacity;
  if (design.layers.image.hidden) layer.style.display = 'none';
  box.style.width = `${img.w}px`;
  box.style.height = `${img.h}px`;

  const filter = filterCss(img.shadow, img.glow);
  if (filter) fx.style.filter = filter;

  let maskUrl = null;
  if (img.kind === 'asset') {
    const asset = assetMap.get(img.asset);
    const fill = img.tint && img.tint.on ? img.tint.fill : { type: 'solid', color: '#FFFFFF', alpha: 1 };
    if (asset && asset.shape) {
      box.classList.add(`ev-shape-${asset.shape}`);
      const border = img.border && img.border.on && img.border.width > 0 ? img.border : null;
      if (asset.shape === 'line') {
        const bar = el('div', 'ev-bar');
        bar.style.height = `${Math.max(2, img.h * 0.22)}px`;
        applyBoxFill(bar, fill);
        box.appendChild(bar);
      } else if (asset.shape === 'corners') {
        const c = el('div', 'ev-corners');
        c.style.setProperty('--cl', `${Math.max(6, img.h * 0.3)}px`);
        c.style.setProperty('--ct', `${border ? border.width : Math.max(2, img.h * 0.05)}px`);
        applyBoxFill(c, fill);
        box.appendChild(c);
        maskUrl = null;
      } else if (asset.shape === 'pill') {
        applyBoxFill(box, fill);
        box.style.borderRadius = '9999px';
        if (border) box.style.boxShadow = `inset 0 0 0 ${border.width}px ${rgba(border.color, border.alpha)}`;
      } else {
        // plate: notched rectangle; the border is an outer plate behind the fill
        if (border) {
          const outer = el('div', 'ev-plate-outer');
          outer.style.background = rgba(border.color, border.alpha);
          box.appendChild(outer);
          const inner = el('div', 'ev-plate-inner');
          inner.style.inset = `${border.width}px`;
          applyBoxFill(inner, fill);
          box.appendChild(inner);
        } else {
          const inner = el('div', 'ev-plate-inner');
          inner.style.inset = '0';
          applyBoxFill(inner, fill);
          box.appendChild(inner);
        }
      }
    } else if (asset) {
      maskUrl = assetBase + asset.file;
      if (img.tint && img.tint.on) {
        const m = el('div', 'ev-mask');
        m.style.webkitMaskImage = `url("${maskUrl}")`;
        m.style.maskImage = `url("${maskUrl}")`;
        applyBoxFill(m, img.tint.fill);
        box.appendChild(m);
      } else {
        const i = el('img', 'ev-pic contain');
        i.src = maskUrl;
        i.draggable = false;
        box.appendChild(i);
      }
    }
  } else if (img.url) {
    const i = el('img', `ev-pic ${img.fit}`);
    i.referrerPolicy = 'no-referrer';
    i.draggable = false;
    i.addEventListener('error', () => {
      // "Image unavailable": hide the image, keep the ID readable
      layer.style.display = 'none';
      if (onError) onError(img.url);
    }, { once: true });
    i.src = img.url;
    box.appendChild(i);
    box.style.borderRadius = `${img.radius}%`;
    if (img.border && img.border.on && img.border.width > 0) {
      box.style.boxShadow = `0 0 0 ${img.border.width}px ${rgba(img.border.color, img.border.alpha)}`;
    }
  }

  if (overlay) {
    const x = el('div', 'ev-img-x');
    if (maskUrl) {
      x.style.webkitMaskImage = `url("${maskUrl}")`;
      x.style.maskImage = `url("${maskUrl}")`;
    } else {
      x.style.borderRadius = img.kind === 'asset' ? (assetMap.get(img.asset)?.shape === 'pill' ? '9999px' : '0') : `${img.radius}%`;
    }
    box.appendChild(x);
  }
  return { layer, fx, box };
}

// ---------------------------------------------------------------------------
// Voice — "talking now" indicator
// ---------------------------------------------------------------------------

const SVGNS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"';
export const VOICE_ICONS = {
  wave: `<svg ${SVGNS}><circle cx="5.5" cy="12" r="2.4" fill="#fff"/><path d="M10 8.3a5.2 5.2 0 0 1 0 7.4M13.6 5.6a9 9 0 0 1 0 12.8M17.2 3a12.8 12.8 0 0 1 0 18" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/></svg>`,
  mic: `<svg ${SVGNS}><rect x="8.8" y="2.5" width="6.4" height="12" rx="3.2" fill="#fff"/><path d="M5.4 11a6.6 6.6 0 0 0 13.2 0M12 17.6V21M8.6 21h6.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  dot: `<svg ${SVGNS}><circle cx="12" cy="12" r="5.5" fill="#fff"/></svg>`,
  speaker: `<svg ${SVGNS}><path d="M3.5 9h4l5.5-4.5v15L7.5 15h-4z" fill="#fff"/><path d="M16.3 8.6a4.8 4.8 0 0 1 0 6.8M19 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  ring: `<svg ${SVGNS}><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="12" cy="12" r="2.8" fill="#fff"/></svg>`,
};

const svgUrl = (svg) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

function outlineFilter(o) {
  if (!o || !o.on || !(o.width > 0)) return '';
  const c = rgba(o.color, o.alpha);
  const w = Math.min(4, o.width);
  return `drop-shadow(${w}px 0 0 ${c}) drop-shadow(-${w}px 0 0 ${c}) drop-shadow(0 ${w}px 0 ${c}) drop-shadow(0 -${w}px 0 ${c})`;
}

/** Builds the voice indicator layer (visible when an ancestor has .ev-talking). */
export function buildVoice(design) {
  const v = design.voice;
  const layer = el('div', 'ev-layer ev-voicel');
  const fx = el('div', `ev-vfx a-${v.anim}`);
  const box = el('div', 'ev-vbox');
  const content = el('div', 'ev-vcontent');
  layer.appendChild(fx);
  fx.appendChild(box);
  box.appendChild(content);

  const fill = v.matchText ? design.text.fill : v.fill;
  const mainColor = fill.type === 'solid' ? fill.color : (fill.stops?.[0]?.c || '#FFFFFF');
  layer.style.setProperty('--vs', String(v.speed || 1));
  layer.style.setProperty('--vfade', `${v.fadeMs}ms`);
  layer.style.setProperty('--vc', rgba(mainColor, 0.85));
  layer.style.transform = layerTransform(v);

  content.style.fontFamily = labelStack(voiceFontOf(design));
  content.style.fontWeight = v.weight;
  content.style.fontSize = `${v.size}px`;
  const filters = [outlineFilter(v.outline), filterCss(v.shadow, v.glow)].filter(Boolean).join(' ');
  if (filters) content.style.filter = filters;

  if (v.bg.on) {
    applyBoxFill(box, v.bg.fill);
    box.style.borderRadius = `${v.bg.radius}px`;
    box.style.padding = `${v.bg.padY}px ${v.bg.padX}px`;
    if (v.bg.border.on && v.bg.border.width > 0) box.style.boxShadow = `inset 0 0 0 ${v.bg.border.width}px ${rgba(v.bg.border.color, v.bg.border.alpha)}`;
  }

  let icon = null;
  if (v.icon === 'bars') {
    icon = el('span', 'ev-vicon ev-vbars');
    for (let i = 0; i < 4; i++) {
      const bar = el('i');
      applyBoxFill(bar, fill);
      icon.appendChild(bar);
    }
  } else if (VOICE_ICONS[v.icon]) {
    icon = el('span', 'ev-vicon');
    icon.style.webkitMaskImage = svgUrl(VOICE_ICONS[v.icon]);
    icon.style.maskImage = svgUrl(VOICE_ICONS[v.icon]);
    applyBoxFill(icon, fill);
  }
  if (icon) {
    icon.style.width = `${v.size * 1.05}px`;
    icon.style.height = `${v.size * 1.05}px`;
  }
  let label = null;
  if (v.showLabel && v.label) {
    label = el('span', 'ev-vlabel');
    label.textContent = v.label;
    if (v.tracking) label.style.letterSpacing = `${v.tracking}px`;
    applyTextFill(label, fill);
  }
  const parts = v.iconSide === 'end' ? [label, icon] : [icon, label];
  parts.filter(Boolean).forEach((p) => content.appendChild(p));
  if (!label && !icon) layer.style.display = 'none';
  return { layer, box };
}

/** Standalone indicator (on-screen HUD). Always visible. */
export function renderVoiceBadge(container, design) {
  const { layer } = buildVoice(design);
  layer.classList.add('ev-badge');
  layer.style.transform = `scale(${design.voice.scale})`;
  container.appendChild(layer);
  return { el: layer, destroy: () => layer.remove() };
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Render a design into `container`.
 * opts.static   pause animations (thumbnails)
 * opts.ghost    no effects at all (editor hit-testing layer)
 * opts.onImageError(url)
 * Returns { stage, root, group, all, text, image, destroy(), relayout() }.
 */
export function renderDesign(container, design, id, opts = {}) {
  const inst = `ev-i${++instanceN}`;
  const stage = el('div', `ev-stage ${inst}${opts.static ? ' ev-static' : ''}${opts.ghost ? ' ev-ghost' : ''}`);
  const root = el('div', 'ev-root');
  const group = el('div', 'ev-group');
  const all = el('div', 'ev-all');
  stage.appendChild(root);
  root.appendChild(group);
  group.appendChild(all);

  root.style.transform = rootTransform(design.transform);
  group.style.transform = groupTransform(design.group);

  const fx = design.effect || { type: 'none' };
  const useFx = !opts.ghost && fx.type && fx.type !== 'none';
  const overlayText = useFx && effectNeedsOverlay(fx.type) && fx.target !== 'image';
  const overlayImage = useFx && effectNeedsOverlay(fx.type) && fx.target !== 'text';

  let image = null;
  const hasImage = design.image && design.image.on;
  if (hasImage) image = buildImage(design, overlayImage, opts.onImageError);
  const text = buildText(design, id, overlayText);

  if (image && design.image.order === 'front') {
    all.appendChild(text.layer);
    all.appendChild(image.layer);
  } else {
    if (image) all.appendChild(image.layer);
    all.appendChild(text.layer);
  }
  const voice = design.voice && design.voice.on && !opts.noVoice ? buildVoice(design) : null;
  if (voice) all.appendChild(voice.layer);

  container.appendChild(stage);

  let styleEl = null;
  const handle = {
    stage, root, group, all, text, image, voice, inst,
    relayout() {
      // whole-text gradients: every character samples its slice of one
      // gradient spanning the full line
      const lw = text.line.offsetWidth || 1;
      const lh = text.line.offsetHeight || 1;
      const metrics = [];
      for (const n of text.nodes) {
        const off = n.el.offsetLeft;
        const offY = n.el.offsetTop;
        const w = n.el.offsetWidth;
        metrics.push({ pos: n.pos, off, w });
        if (n.gradient && text.textScope === 'text') {
          n.fillEl.style.backgroundSize = `${lw}px ${lh}px`;
          n.fillEl.style.backgroundPosition = `${-off}px ${-offY}px`;
          n.fillEl.style.backgroundRepeat = 'no-repeat';
        }
      }
      // backgrounds that stretch to the rendered ID width
      const T = design.layers.text;
      const I = design.layers.image;
      if (image && design.image.autoWidth) {
        const tw = lw * T.scale;
        const w = Math.max(8, (tw + design.image.pad * 2) / Math.max(0.01, I.scale));
        image.box.style.width = `${w}px`;
      }
      // image attached to a side of the ID: follows the real text width
      handle.imagePos = image ? { x: I.x, y: I.y } : null;
      if (image && design.image.attach && design.image.attach !== 'none') {
        const tw = lw * T.scale;
        const th = lh * T.scale;
        const iw = image.box.offsetWidth * I.scale;
        const ih = image.box.offsetHeight * I.scale;
        const align = design.text.align;
        const cx = T.x + (align === 'left' ? tw / 2 : align === 'right' ? -tw / 2 : 0);
        const cy = T.y;
        const gap = design.image.gap;
        let x = cx;
        let y = cy;
        switch (design.image.attach) {
          case 'left': x = cx - tw / 2 - gap - iw / 2; break;
          case 'right': x = cx + tw / 2 + gap + iw / 2; break;
          case 'top': y = cy - th / 2 - gap - ih / 2; break;
          case 'bottom': y = cy + th / 2 + gap + ih / 2; break;
          default: break;
        }
        x += I.x;
        y += I.y;
        handle.imagePos = { x, y };
        image.layer.style.transform = layerTransform({ ...I, x, y });
      }
      // voice indicator attached to a side of the ID
      handle.voicePos = null;
      if (voice) {
        const V = design.voice;
        const tw = lw * T.scale;
        const th = lh * T.scale;
        const vw = voice.layer.offsetWidth * V.scale;
        const vh = voice.layer.offsetHeight * V.scale;
        const align = design.text.align;
        const cx = T.x + (align === 'left' ? tw / 2 : align === 'right' ? -tw / 2 : 0);
        // reference box: the ID, extended by an image attached on the same side
        let top = T.y - th / 2, bottom = T.y + th / 2, left = cx - tw / 2, right = cx + tw / 2;
        if (image && handle.imagePos && design.image.attach === V.attach) {
          const iw = image.box.offsetWidth * I.scale / 2, ih = image.box.offsetHeight * I.scale / 2;
          top = Math.min(top, handle.imagePos.y - ih);
          bottom = Math.max(bottom, handle.imagePos.y + ih);
          left = Math.min(left, handle.imagePos.x - iw);
          right = Math.max(right, handle.imagePos.x + iw);
        }
        let x = cx, y = T.y;
        if (V.attach === 'top') y = top - V.gap - vh / 2;
        else if (V.attach === 'bottom') y = bottom + V.gap + vh / 2;
        else if (V.attach === 'left') x = left - V.gap - vw / 2;
        else x = right + V.gap + vw / 2;
        x += V.x;
        y += V.y;
        handle.voicePos = { x, y };
        voice.layer.style.transform = layerTransform({ ...V, x, y });
      }

      let css = '';
      if (useFx) {
        css += buildEffect(design, {
          scope: `.${inst}`,
          lineW: lw,
          lineH: lh,
          chars: metrics,
          nodes: text.nodes,
          imageW: image ? image.box.offsetWidth : 0,
        });
      }
      // the ID itself while its player talks
      const V = design.voice;
      if (V && V.on && ((V.idGlow && V.idGlow.on) || V.idScale > 1)) {
        const g = V.idGlow;
        const glow = g && g.on && g.strength > 0
          ? `filter:drop-shadow(0 0 ${Math.max(1, g.radius * 0.35)}px ${rgba(g.color, Math.min(1, g.strength * 1.1))}) drop-shadow(0 0 ${g.radius}px ${rgba(g.color, g.strength)});`
          : '';
        const scale = V.idScale > 1 ? `transform:scale(${V.idScale});` : '';
        css += `.${inst} .ev-text .ev-line{transition:filter ${V.fadeMs}ms, transform ${V.fadeMs}ms;}`;
        css += `.ev-talking .${inst} .ev-text .ev-line, .ev-talking.${inst} .ev-text .ev-line{${glow}${scale}}`;
      }
      if (styleEl) { styleEl.remove(); styleEl = null; }
      if (css) {
        styleEl = document.createElement('style');
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
      }
    },
    destroy() {
      if (styleEl) styleEl.remove();
      stage.remove();
    },
  };
  handle.relayout();
  return handle;
}
