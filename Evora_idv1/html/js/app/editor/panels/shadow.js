// Evora ID — panel: shadow + glow of the ID

import { S } from '../../store.js';
import { section, slider, toggle, colorField } from '../../controls.js';

export default {
  id: 'shadow',
  icon: 'shadow',
  adv: true,
  key: () => `${S.design.text.shadow.on}|${S.design.text.glow.on}`,
  build(ctx) {
    const t = S.design.text;
    return [
      section('الظل', [
        toggle(ctx, 'تفعيل الظل', 'text.shadow.on'),
        t.shadow.on ? colorField(ctx, 'اللون', 'text.shadow.color', 'text.shadow.alpha') : null,
        t.shadow.on ? slider(ctx, 'إزاحة X', 'text.shadow.x') : null,
        t.shadow.on ? slider(ctx, 'إزاحة Y', 'text.shadow.y') : null,
        t.shadow.on ? slider(ctx, 'التمويه', 'text.shadow.blur') : null,
      ]),
      section('التوهج', [
        toggle(ctx, 'تفعيل التوهج', 'text.glow.on'),
        t.glow.on ? colorField(ctx, 'اللون', 'text.glow.color', 'text.glow.alpha') : null,
        t.glow.on ? slider(ctx, 'نصف القطر', 'text.glow.radius') : null,
        t.glow.on ? slider(ctx, 'القوة', 'text.glow.strength', { mul: 100, unit: '%' }) : null,
      ], { hint: 'التوهج القوي جميل لكن يقلل وضوح الرقم من بعيد، استخدمه باعتدال.' }),
    ];
  },
};
