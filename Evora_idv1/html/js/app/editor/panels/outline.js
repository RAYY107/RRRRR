// Evora ID — panel: outline of the ID

import { S } from '../../store.js';
import { section, slider, toggle, colorField } from '../../controls.js';

export default {
  id: 'outline',
  icon: 'outline',
  adv: true,
  key: () => `${S.design.text.outline.on}`,
  build(ctx) {
    const o = S.design.text.outline;
    return section('الإطار الخارجي', [
      toggle(ctx, 'تفعيل الإطار', 'text.outline.on'),
      o.on ? slider(ctx, 'السماكة', 'text.outline.width') : null,
      o.on ? colorField(ctx, 'اللون', 'text.outline.color', 'text.outline.alpha') : null,
    ], { hint: 'إطار داكن رفيع يحسّن قراءة الرقم فوق الخلفيات الفاتحة.' });
  },
};
