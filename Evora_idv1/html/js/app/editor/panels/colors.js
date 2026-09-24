// Evora ID — panel: colours (main fill, quick picks)

import { h } from '../../dom.js';
import { S, isAdvanced, setDesign, setUI } from '../../store.js';
import { section, fillEditor, quickColors, segmented, slider, GRADIENTS, toStops } from '../../controls.js';

const QUICK = ['#FFFFFF', '#E6E8EB', '#B9BEC6', '#F9E9B8', '#D4AF37', '#FF5A5F', '#FF4FB8', '#9B6BD6', '#4D8EFF', '#00E5FF', '#39FF7A', '#111214'];

export default {
  id: 'colors',
  icon: 'palette',
  key: () => `${S.ui.level}`,
  build(ctx) {
    const adv = isAdvanced();
    return [
      section('لون الرقم', [
        fillEditor(ctx, 'text.fill', { simple: true }),
        quickColors(QUICK, (c) => setDesign((d) => { d.text.fill.type = 'solid'; d.text.fill.color = c; d.text.fill.alpha = 1; }, { structure: true })),
      ]),
      section('تدرجات جاهزة', [
        h('div.chips', GRADIENTS.map((cols) => h('button.grad-chip', {
          type: 'button', style: { background: `linear-gradient(90deg, ${cols.join(',')})` },
          onClick: () => setDesign((d) => { d.text.fill.type = 'linear'; d.text.fill.angle = 180; d.text.fill.stops = toStops(cols); }, { structure: true }),
        }))),
        adv ? h('button.link', { style: { marginTop: '12px' }, onClick: () => setUI({ tab: 'gradient' }) }, 'تحرير التدرج بالتفصيل') : null,
      ]),
      adv ? section('نطاق التدرج', [
        segmented(ctx, null, 'text.fillScope', [{ value: 'text', label: 'الرقم كاملاً' }, { value: 'char', label: 'كل حرف' }]),
      ], { hint: 'تدرج واحد يمتد على الرقم كله، أو تدرج مستقل لكل حرف.' }) : null,
      section('الشفافية', [slider(ctx, 'الرقم', 'text.opacity', { mul: 100, unit: '%' })]),
    ];
  },
};
