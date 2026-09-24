// Evora ID — panel: position / scale / rotation of the selection

import { h, ic } from '../../dom.js';
import { S, isAdvanced, setDesign, setUI } from '../../store.js';
import { section, slider, toggle } from '../../controls.js';
import { T } from '../../i18n.js';

export const SEL_PATH = { stage: 'transform', group: 'group', text: 'layers.text', image: 'layers.image', voice: 'voice' };

export function selectionOptions() {
  const o = [{ value: 'stage', label: T.sel.stage }];
  if (S.design.group.on) o.push({ value: 'group', label: T.sel.group });
  o.push({ value: 'text', label: T.sel.text });
  if (S.design.image.on) o.push({ value: 'image', label: T.sel.image });
  if (S.design.voice && S.design.voice.on) o.push({ value: 'voice', label: T.sel.voice });
  return o;
}

function reset(path, keys) {
  setDesign((d) => {
    const t = path.split('.').reduce((o, k) => o[k], d);
    for (const k of keys) t[k] = k === 'scale' ? 1 : 0;
  });
}

export default {
  id: 'position',
  icon: 'move',
  key: () => `${S.ui.level}|${S.ui.selection}|${S.design.group.on}|${S.design.image.on}|${S.design.image.attach}|${S.design.voice && S.design.voice.on}`,
  build(ctx) {
    const adv = isAdvanced();
    const sel = SEL_PATH[S.ui.selection] ? S.ui.selection : 'stage';
    const path = SEL_PATH[sel];
    const opts = selectionOptions();
    const selector = h('div.seg', opts.map((o) => h('button', { type: 'button', class: o.value === sel ? 'on' : '', onClick: () => setUI({ selection: o.value }) }, o.label)));
    const attached = (sel === 'image' && S.design.image.attach !== 'none') || sel === 'voice';
    return [
      section('العنصر المحدد', [selector], { hint: 'يمكنك أيضاً سحب العناصر مباشرة فوق شخصيتك في المعاينة.' }),
      section(attached ? 'إزاحة عن الرقم' : 'الموضع', [
        slider(ctx, 'X', `${path}.x`),
        slider(ctx, 'Y', `${path}.y`),
        h('div', { style: { display: 'flex', gap: '6px', margin: '2px 0 10px' } },
          h('button.btn.sm', { onClick: () => setDesign((d) => { path.split('.').reduce((o, k) => o[k], d).x = 0; }) }, ic('alignH', 'sm'), 'توسيط أفقي'),
          h('button.btn.sm', { onClick: () => setDesign((d) => { path.split('.').reduce((o, k) => o[k], d).y = 0; }) }, ic('alignV', 'sm'), 'توسيط عمودي')),
      ]),
      section('الحجم والدوران', [
        slider(ctx, 'الحجم', `${path}.scale`, { mul: 100, unit: '%' }),
        slider(ctx, 'الدوران', `${path}.rotate`, { unit: '°' }),
      ]),
      section('إعادة الضبط', h('div.grid-2',
        h('button.btn.sm', { onClick: () => reset(path, ['x', 'y']) }, 'الموضع'),
        h('button.btn.sm', { onClick: () => reset(path, ['scale']) }, 'الحجم'),
        h('button.btn.sm', { onClick: () => reset(path, ['rotate']) }, 'الدوران'),
        h('button.btn.sm', { onClick: () => reset(path, ['x', 'y', 'scale', 'rotate']) }, 'الكل'))),
      section('أدلة المحاذاة', [
        toggle(ctx, 'الالتقاط', { get: () => S.ui.snap, set: (v) => setUI({ snap: v }) }),
        toggle(ctx, 'خطوط الأدلة', { get: () => S.ui.guides, set: (v) => setUI({ guides: v }) }),
        adv ? slider(ctx, 'حساسية الالتقاط', { get: () => S.ui.snapPx, set: (v) => setUI({ snapPx: v }) }, { min: 2, max: 24, dec: 0, unit: 'px' }) : null,
      ]),
    ];
  },
};
