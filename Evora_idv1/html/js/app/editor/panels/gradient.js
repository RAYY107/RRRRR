// Evora ID — panel: detailed gradient editor

import { h } from '../../dom.js';
import { S, setDesign } from '../../store.js';
import { section, fillEditor, segmented } from '../../controls.js';

export default {
  id: 'gradient',
  icon: 'gradient',
  adv: true,
  key: () => `${S.design.text.fill.type === 'solid'}`,
  build(ctx) {
    if (S.design.text.fill.type === 'solid') {
      return section('التدرج', h('div.empty',
        h('div', 'لون الرقم الحالي لون واحد.'),
        h('button.btn.sm', { style: { marginTop: '12px' }, onClick: () => setDesign((d) => {
          const c = d.text.fill.color;
          d.text.fill.type = 'linear';
          d.text.fill.angle = 180;
          d.text.fill.stops = [{ c, p: 0, a: 1 }, { c: '#4A4F57', p: 100, a: 1 }];
        }, { structure: true }) }, 'تحويل إلى تدرج')));
    }
    return [
      section('التدرج', [fillEditor(ctx, 'text.fill')], { hint: 'اضغط على الشريط لإضافة نقطة لون، واسحب النقاط لتحريكها.' }),
      section('النطاق', [
        segmented(ctx, null, 'text.fillScope', [{ value: 'text', label: 'الرقم كاملاً' }, { value: 'char', label: 'كل حرف' }]),
      ]),
    ];
  },
};
