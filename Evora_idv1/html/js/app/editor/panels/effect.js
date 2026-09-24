// Evora ID — panel: the single effect (presets + timing)

import { h, ltr } from '../../dom.js';
import { S, isAdvanced, setDesign, setUI } from '../../store.js';
import { section, slider, segmented, select, toggle, colorField } from '../../controls.js';
import { effectType, defaultAt } from '../../schema.js';
import { isLetterEffect } from '../../../core/effects.js';

const USES_COLOR = new Set(['soft-glow', 'shine-sweep', 'light-sweep', 'shimmer', 'gradient-flow', 'keyframes']);
const EASE_LABELS = { linear: 'خطي', ease: 'افتراضي', 'ease-in': 'تسارع', 'ease-out': 'تباطؤ', 'ease-in-out': 'تسارع ثم تباطؤ', smooth: 'ناعم', sharp: 'حاد', back: 'ارتداد', steps: 'متقطع' };

export function applyEffectPreset(preset) {
  setDesign((d) => {
    const base = defaultAt('effect');
    base.keyframes = d.effect.keyframes;
    const next = { ...base, ...preset.effect };
    if (!preset.effect.target) next.target = d.effect.target === 'image' && !d.image.on ? 'all' : d.effect.target;
    d.effect = next;
  }, { structure: true });
}

export default {
  id: 'effect',
  icon: 'sparkle',
  key: () => `${S.ui.level}|${S.design.effect.type}|${S.design.effect.loop}|${S.design.image.on}`,
  build(ctx) {
    const adv = isAdvanced();
    const fx = S.design.effect;
    const type = effectType(fx.type);
    const letter = isLetterEffect(fx.type);
    const tiles = [{ id: 'none', label: 'بدون', en: 'None', effect: { type: 'none' } }, ...S.boot.effectPresets];
    const active = tiles.find((p) => p.effect.type === fx.type && p.effect.duration === fx.duration)
      || tiles.find((p) => p.effect.type === fx.type);
    const grid = h('div.grid-2', tiles.map((p) => h('button.fx-tile', {
      type: 'button',
      class: p === active ? 'on' : '',
      onClick: () => applyEffectPreset(p),
    }, h('b', p.label), h('span', p.en))));

    const out = [section('تأثير واحد فقط', grid, { hint: 'يسمح بتأثير نشط واحد للحفاظ على الأداء ووضوح الرقم. اختيار تأثير جديد يستبدل الحالي.' })];
    if (fx.type === 'none') return out;

    out.push(section(`${type ? type.label : fx.type}`, [
      !letter ? segmented(ctx, 'يطبّق على', 'effect.target', [
        { value: 'text', label: 'الرقم' },
        { value: 'image', label: 'الصورة', disabled: !S.design.image.on },
        { value: 'all', label: 'الكل' },
      ]) : h('div.sec-hint', 'تأثير الأحرف يطبّق على كل رقم بتتابع.'),
      slider(ctx, 'السرعة', 'effect.speed', { unit: '×' }),
      slider(ctx, 'الشدة', 'effect.intensity', { mul: 100, unit: '%' }),
      USES_COLOR.has(fx.type) ? colorField(ctx, 'لون التأثير', 'effect.color') : null,
    ]));

    if (adv) {
      out.push(section('التوقيت', [
        select(ctx, 'النوع', 'effect.type', S.boot.effects.filter((e) => e.id !== 'none').map((e) => ({ value: e.id, label: e.label }))),
        slider(ctx, 'المدة', 'effect.duration', { unit: 's' }),
        slider(ctx, 'التأخير', 'effect.delay', { unit: 's' }),
        select(ctx, 'منحنى الحركة', 'effect.easing', S.boot.easings.map((e) => ({ value: e, label: EASE_LABELS[e] || e }))),
        segmented(ctx, 'الاتجاه', 'effect.direction', [{ value: 'normal', label: 'عادي' }, { value: 'reverse', label: 'معكوس' }]),
        toggle(ctx, 'تكرار مستمر', 'effect.loop'),
        !fx.loop ? slider(ctx, 'عدد المرات', 'effect.iterations') : null,
        toggle(ctx, 'ذهاب وإياب', 'effect.pingpong'),
        letter ? slider(ctx, 'التتابع', 'effect.stagger', { unit: 's' }) : null,
        h('button.btn.block', { style: { marginTop: '6px' }, onClick: () => setUI({ timeline: !S.ui.timeline }) }, S.ui.timeline ? 'إخفاء المخطط الزمني' : 'فتح المخطط الزمني'),
      ]));
    } else {
      out.push(h('div.sec-hint', { style: { paddingTop: '12px' } }, 'للتحكم الكامل بالتوقيت والإطارات المفتاحية انتقل إلى الوضع ', ltr('المتقدم', ''), '.'));
    }
    return out;
  },
};
