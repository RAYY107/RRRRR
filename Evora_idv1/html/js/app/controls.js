// Evora ID — bound editor controls
// Every control binds to a design path (or a custom {get,set} binding) and
// registers an updater in its panel context, so panels are built once and
// only refreshed while the user drags sliders or undoes changes.

import { h, ic, clear, tooltip } from './dom.js';
import { S, setDesign, commit } from './store.js';
import { range, defaultAt } from './schema.js';
import { get, set, clamp, round, clone } from '../core/util.js';
import { rgba, mix } from '../core/color.js';
import { gradientCss } from '../core/render.js';
import { openColorPicker } from './colorpicker.js';
import { menu } from './ui.js';

export function panelCtx() {
  const ups = [];
  return { add: (fn) => ups.push(fn), update: () => ups.forEach((fn) => fn()), ups };
}

export function bind(path) {
  return {
    path,
    get: () => get(S.design, path),
    set: (v, c = true) => setDesign((d) => set(d, path, v), { commit: c }),
  };
}

const asBind = (b) => (typeof b === 'string' ? bind(b) : b);

export function section(title, children, { hint, action, cls = '' } = {}) {
  return h(`div.sec${cls ? '.' + cls : ''}`,
    title ? h('div.sec-head', h('div.sec-title', title), action || null) : null,
    hint ? h('div.sec-hint', hint) : null,
    children);
}

export function field(label, control, { stack = false } = {}) {
  return h(`div.field${stack ? '.stack' : ''}`, label ? h('label', label) : h('span'), control);
}

// ---------------------------------------------------------------- slider
export function slider(ctx, label, target, opts = {}) {
  const b = asBind(target);
  const r = typeof target === 'string' ? range(target) : {};
  const min = opts.min ?? r.min ?? 0;
  const max = opts.max ?? r.max ?? 100;
  const dec = opts.dec ?? r.dec ?? 2;
  const step = opts.step ?? (dec <= 0 ? 1 : 1 / 10 ** Math.min(dec, 3));
  const mul = opts.mul ?? 1;          // display multiplier (100 for %)
  const unit = opts.unit ?? '';
  const input = h('input', { type: 'range', min, max, step });
  const box = h('input.numbox', { type: 'text', spellcheck: 'false' });
  const fmt = (v) => `${round(v * mul, mul !== 1 ? 0 : Math.min(dec, 2))}${unit}`;
  const paintFill = () => input.style.setProperty('--p', `${((input.value - min) / (max - min || 1)) * 100}%`);

  input.addEventListener('input', () => {
    const v = +input.value;
    paintFill();
    box.value = fmt(v);
    b.set(v, false);
    opts.onInput && opts.onInput(v);
  });
  input.addEventListener('change', () => commit());
  input.addEventListener('dblclick', () => {
    const def = b.path ? defaultAt(b.path) : opts.def;
    if (def !== undefined) b.set(def, true);
  });
  box.addEventListener('focus', () => box.select());
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') box.blur();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = +b.get() || 0;
      const d = (e.shiftKey ? 10 : 1) * (dec <= 0 ? 1 : step * (mul !== 1 ? 1 / (step * mul) : 10));
      b.set(round(clamp(cur + (e.key === 'ArrowUp' ? d : -d), min, max), dec), true);
    }
  });
  box.addEventListener('change', () => {
    let v = parseFloat(String(box.value).replace(',', '.'));
    if (Number.isNaN(v)) return update();
    v = clamp(v / mul, min, max);
    b.set(round(v, dec), true);
  });
  const update = () => {
    const v = b.get() ?? min;
    if (document.activeElement !== input) input.value = v;
    paintFill();
    if (document.activeElement !== box) box.value = fmt(+v);
  };
  ctx.add(update);
  update();
  const row = h('div.slider', input, box);
  return label === null ? row : field(label, row);
}

// ---------------------------------------------------------------- toggle
export function toggle(ctx, label, target, { onChange } = {}) {
  const b = asBind(target);
  const input = h('input', { type: 'checkbox' });
  input.addEventListener('change', () => { b.set(input.checked, true); onChange && onChange(input.checked); });
  const update = () => { input.checked = !!b.get(); };
  ctx.add(update);
  update();
  return h('div.toggle-row', h('label', label), h('span.toggle', input, h('span')));
}

// ---------------------------------------------------------------- segmented
export function segmented(ctx, label, target, options, { small = false, onChange } = {}) {
  const b = asBind(target);
  const btns = options.map((o) => {
    const btn = h('button', { type: 'button', disabled: o.disabled || null, onClick: () => { b.set(o.value, true); onChange && onChange(o.value); } },
      o.icon ? ic(o.icon, 'sm') : null, o.label != null ? h('span', o.label) : null);
    if (o.tip) tooltip(btn, o.tip);
    return btn;
  });
  const update = () => {
    const v = b.get();
    btns.forEach((btn, i) => btn.classList.toggle('on', options[i].value === v));
  };
  ctx.add(update);
  update();
  const seg = h(`div.seg${small ? '.sm' : ''}`, btns);
  return label === null ? seg : field(label, seg);
}

// ---------------------------------------------------------------- select
export function select(ctx, label, target, options, { onChange } = {}) {
  const b = asBind(target);
  const text = h('span');
  const btn = h('button.select', { type: 'button' }, text, ic('chevron', 'sm'));
  btn.addEventListener('click', () => {
    const v = b.get();
    menu(btn, options.map((o) => ({ label: o.label, on: o.value === v, onClick: () => { b.set(o.value, true); onChange && onChange(o.value); } })), { align: 'end' });
  });
  const update = () => {
    const o = options.find((x) => x.value === b.get());
    text.textContent = o ? o.label : '—';
  };
  ctx.add(update);
  update();
  return label === null ? btn : field(label, btn);
}

// ---------------------------------------------------------------- colour
export function colorField(ctx, label, colorTarget, alphaTarget, opts = {}) {
  const bc = asBind(colorTarget);
  const ba = alphaTarget ? asBind(alphaTarget) : null;
  const fill = h('i');
  const sw = h('button.swatch', { type: 'button' }, fill);
  const hex = h('input.hex', { spellcheck: 'false' });
  const al = h('span.alpha');
  sw.addEventListener('click', () => {
    openColorPicker(sw, {
      hex: bc.get(),
      alpha: ba ? ba.get() : 1,
      withAlpha: !!ba,
      onInput: (hx, a) => setDesign((d) => { set(d, bc.path, hx); if (ba) set(d, ba.path, a); }, { commit: false }),
      onCommit: (hx, a) => setDesign((d) => { set(d, bc.path, hx); if (ba) set(d, ba.path, a); }, { commit: true }),
    });
  });
  hex.addEventListener('change', () => {
    let v = hex.value.trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.split('').map((c) => c + c).join('');
    if (/^[0-9a-f]{6}$/i.test(v)) bc.set(`#${v.toUpperCase()}`, true);
    else update();
  });
  hex.addEventListener('keydown', (e) => { if (e.key === 'Enter') hex.blur(); });
  const update = () => {
    const c = bc.get() || '#FFFFFF';
    const a = ba ? ba.get() ?? 1 : 1;
    fill.style.background = rgba(c, a);
    if (document.activeElement !== hex) hex.value = c;
    al.textContent = ba ? `${Math.round(a * 100)}%` : '';
  };
  ctx.add(update);
  update();
  const row = h('div.color-field', sw, hex, ba ? al : null);
  return label === null ? row : field(label, row, opts);
}

// ---------------------------------------------------------------- gradient
export const GRADIENTS = [
  ['#FFFFFF', '#A7ACB4'], ['#F9E9B8', '#D4AF37', '#8C6A1C'], ['#FF5A5F', '#A4161A', '#3A3D42'],
  ['#FFFFFF', '#D6DAE0', '#5E636B', '#C8CDD4', '#FFFFFF'], ['#00F0FF', '#7000FF'], ['#FF6AD5', '#C774E8', '#94D0FF'],
  ['#00C9A7', '#4D8EFF', '#B06AB3'], ['#FF512F', '#DD2476'], ['#F6C690', '#B06A2A', '#5A2E10'],
  ['#EFE9F7', '#B8A9D9'], ['#E8F0FF', '#8AB4FF'], ['#44474E', '#121316'],
];

export const toStops = (colors) => colors.map((c, i) => ({ c, p: round((i / Math.max(1, colors.length - 1)) * 100, 1), a: 1 }));

export function gradientEditor(ctx, fillTarget) {
  const b = asBind(fillTarget);
  let selIdx = 0;
  const bar = h('div.grad-bar');
  const barFill = h('div.fill');
  bar.appendChild(barFill);
  const stopsBox = h('div');
  bar.appendChild(stopsBox);
  const stopCtx = panelCtx();
  const stopTools = h('div');

  const stopsPath = () => `${b.path}.stops`;
  const stops = () => b.get()?.stops || [];

  const renderStops = () => {
    clear(stopsBox);
    const list = stops();
    selIdx = Math.min(selIdx, list.length - 1);
    list.forEach((s, i) => {
      const el = h('div.grad-stop', { class: i === selIdx ? 'sel' : '', style: { left: `${s.p}%`, background: rgba(s.c, 1) } });
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selIdx = i;
        renderStops();
        buildTools();
        const r = bar.getBoundingClientRect();
        const move = (ev) => {
          const p = round(clamp(((ev.clientX - r.left) / r.width) * 100, 0, 100), 1);
          setDesign((d) => { get(d, stopsPath())[i].p = p; }, { commit: false });
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          // keep stops ordered and follow the dragged one
          const moved = stops()[i];
          setDesign((d) => { get(d, stopsPath()).sort((x, y) => x.p - y.p); }, { commit: true });
          selIdx = stops().indexOf(stops().find((x) => x === moved));
          if (selIdx < 0) selIdx = 0;
          renderStops();
          buildTools();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
      stopsBox.appendChild(el);
    });
  };

  bar.addEventListener('pointerdown', (e) => {
    if (e.target !== bar && e.target !== barFill) return;
    const list = stops();
    if (list.length >= S.boot.limits.GradientStops) return;
    const r = bar.getBoundingClientRect();
    const p = round(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100), 1);
    const before = [...list].reverse().find((s) => s.p <= p) || list[0];
    const after = list.find((s) => s.p >= p) || list[list.length - 1];
    const t = after.p === before.p ? 0 : (p - before.p) / (after.p - before.p);
    const c = mix(before.c, after.c, t);
    setDesign((d) => {
      const arr = get(d, stopsPath());
      arr.push({ c, p, a: 1 });
      arr.sort((x, y) => x.p - y.p);
    }, { commit: true });
    selIdx = stops().findIndex((s) => s.p === p);
    renderStops();
    buildTools();
  });

  const buildTools = () => {
    clear(stopTools);
    stopCtx.ups.length = 0;
    const list = stops();
    if (!list[selIdx]) return;
    const base = `${stopsPath()}.${selIdx}`;
    stopTools.append(
      colorField(stopCtx, 'لون النقطة', { path: `${base}.c`, get: () => get(S.design, `${base}.c`), set: (v, c) => setDesign((d) => set(d, `${base}.c`, v), { commit: c }) },
        { path: `${base}.a`, get: () => get(S.design, `${base}.a`), set: (v, c) => setDesign((d) => set(d, `${base}.a`, v), { commit: c }) }),
      slider(stopCtx, 'الموضع', { path: `${base}.p`, get: () => get(S.design, `${base}.p`), set: (v, c) => setDesign((d) => set(d, `${base}.p`, v), { commit: c }) }, { min: 0, max: 100, dec: 1, unit: '%' }),
      h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
        h('button.btn.sm', { disabled: list.length <= 2 || null, onClick: () => {
          setDesign((d) => { get(d, stopsPath()).splice(selIdx, 1); }, { commit: true });
          selIdx = Math.max(0, selIdx - 1);
          renderStops();
          buildTools();
        } }, ic('trash', 'sm'), 'حذف النقطة'),
        h('button.btn.sm', { onClick: () => {
          setDesign((d) => { const arr = get(d, stopsPath()); arr.forEach((s) => { s.p = round(100 - s.p, 1); }); arr.sort((x, y) => x.p - y.p); }, { commit: true });
          renderStops();
          buildTools();
        } }, ic('refresh', 'sm'), 'عكس'),
      ),
    );
  };

  let lastLen = -1;
  const update = () => {
    const f = b.get();
    if (!f) return;
    barFill.style.background = gradientCss({ ...f, type: 'linear', angle: 90 });
    if (stops().length !== lastLen) {
      lastLen = stops().length;
      renderStops();
      buildTools();
    } else {
      stopsBox.querySelectorAll('.grad-stop').forEach((el, i) => {
        const s = stops()[i];
        if (s) { el.style.left = `${s.p}%`; el.style.background = rgba(s.c, 1); }
      });
      stopCtx.update();
    }
  };
  ctx.add(update);
  update();

  const presets = h('div.chips', { style: { marginBottom: '12px' } }, GRADIENTS.map((cols) => {
    const btn = h('button.grad-chip', { type: 'button', style: { background: `linear-gradient(90deg, ${cols.join(',')})` } });
    btn.addEventListener('click', () => setDesign((d) => { const f = get(d, b.path); f.stops = toStops(cols); if (f.type === 'solid') f.type = 'linear'; }, { commit: true }));
    return btn;
  }));
  return h('div', bar, stopTools, presets);
}

// ---------------------------------------------------------------- fill
/**
 * Fill editor: solid colour or gradient. `simple` limits the choices to
 * colour / linear gradient with two quick colours.
 */
export function fillEditor(ctx, fillTarget, { simple = false, allowSolidAlpha = true } = {}) {
  const b = asBind(fillTarget);
  const host = h('div');
  let inner = panelCtx();
  let key = null;

  const typeSet = (t) => setDesign((d) => {
    const f = get(d, b.path);
    if (t !== 'solid' && f.type === 'solid' && (!f.stops || f.stops.length < 2 || f.stops.every((s) => s.c === f.stops[0].c))) {
      f.stops = [{ c: f.color, p: 0, a: f.alpha ?? 1 }, { c: mix(f.color, '#000000', 0.45), p: 100, a: 1 }];
    }
    if (t === 'solid' && f.type !== 'solid' && f.stops?.length) f.color = f.stops[0].c;
    f.type = t;
  }, { commit: true, structure: true });

  const build = () => {
    clear(host);
    inner = panelCtx();
    const f = b.get();
    const typeOpts = simple
      ? [{ value: 'solid', label: 'لون' }, { value: 'linear', label: 'متدرج' }]
      : [{ value: 'solid', label: 'لون' }, { value: 'linear', label: 'خطي' }, { value: 'radial', label: 'دائري' }, { value: 'conic', label: 'مخروطي' }];
    host.appendChild(segmented(inner, 'النوع', { get: () => { const t = b.get().type; return simple && t !== 'solid' ? 'linear' : t; }, set: typeSet }, typeOpts));
    if (f.type === 'solid') {
      host.appendChild(colorField(inner, 'اللون', `${b.path}.color`, allowSolidAlpha ? `${b.path}.alpha` : null));
    } else if (simple) {
      const st = f.stops;
      host.appendChild(colorField(inner, 'اللون الأول', `${b.path}.stops.0.c`));
      host.appendChild(colorField(inner, 'اللون الأخير', `${b.path}.stops.${st.length - 1}.c`));
      host.appendChild(slider(inner, 'الاتجاه', `${b.path}.angle`, { unit: '°' }));
    } else {
      host.appendChild(gradientEditor(inner, b.path));
      if (f.type === 'linear' || f.type === 'conic') host.appendChild(slider(inner, 'الزاوية', `${b.path}.angle`, { unit: '°' }));
      if (f.type === 'radial' || f.type === 'conic') {
        host.appendChild(slider(inner, 'المركز X', `${b.path}.cx`, { unit: '%' }));
        host.appendChild(slider(inner, 'المركز Y', `${b.path}.cy`, { unit: '%' }));
      }
    }
  };

  const update = () => {
    const f = b.get();
    if (!f) return;
    const k = `${f.type}|${simple ? f.stops?.length : ''}`;
    if (k !== key) { key = k; build(); } else inner.update();
  };
  ctx.add(update);
  update();
  return host;
}

// Swatch strip that applies a quick solid colour.
export function quickColors(colors, onPick) {
  return h('div.chips', { style: { margin: '2px 0 12px' } }, colors.map((c) => h('button.grad-chip', {
    type: 'button', style: { background: c, width: '26px' }, title: c, onClick: () => onPick(c),
  })));
}

export { clone };
