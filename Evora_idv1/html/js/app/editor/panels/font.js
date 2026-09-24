// Evora ID — panel: font browser

import { h, clear, ltr } from '../../dom.js';
import { S, setDesign } from '../../store.js';
import { section, segmented, toggle } from '../../controls.js';
import { fontById, nearestWeight } from '../../schema.js';
import { T } from '../../i18n.js';
import { fontStack, loadAllFonts } from '../../../core/fonts.js';

let query = '';
let cat = 'all';

const CAT_GROUPS = {
  all: null,
  arabic: ['arabic', 'arabic-display', 'arabic-serif'],
  sans: ['sans'],
  display: ['display', 'condensed'],
  tech: ['tech', 'mono'],
  serif: ['serif', 'arabic-serif'],
  retro: ['retro'],
};
const CAT_LABELS = { all: 'الكل', arabic: 'عربي', sans: 'حديث', display: 'عرض', tech: 'تقني', serif: 'كلاسيكي', retro: 'ريترو' };

export default {
  id: 'font',
  icon: 'font',
  key: () => `${S.design.text.font}`,
  build(ctx) {
    loadAllFonts();
    const list = h('div.font-list');
    const render = () => {
      clear(list);
      const fonts = S.boot.fonts.filter((f) => f.category !== 'fallback'
        && (!CAT_GROUPS[cat] || CAT_GROUPS[cat].includes(f.category))
        && (!query || f.label.toLowerCase().includes(query.toLowerCase())));
      for (const f of fonts) {
        const arabic = f.numerals.includes('arabic');
        list.appendChild(h('button.font-item', {
          type: 'button',
          class: f.id === S.design.text.font ? 'on' : '',
          onClick: () => setDesign((d) => {
            d.text.font = f.id;
            d.text.weight = nearestWeight(f.id, d.text.weight);
          }, { structure: true }),
        },
        h('span.sample', { style: { fontFamily: fontStack(f.id), fontWeight: f.weights.includes(700) ? 700 : f.weights[f.weights.length - 1] } }, arabic ? '07 ٧٢' : '0247'),
        h('span', { style: { flex: 1, textAlign: 'right' } },
          h('div', ltr(f.label)),
          h('div.tag', T.fontCats[f.category] || f.category))));
      }
      if (!fonts.length) list.appendChild(h('div.empty', 'لا توجد خطوط مطابقة'));
    };
    const search = h('input.input', { placeholder: 'ابحث عن خط', value: query });
    search.addEventListener('input', () => { query = search.value; render(); });
    const chips = h('div.chips', { style: { marginTop: '10px' } }, Object.keys(CAT_GROUPS).map((k) => {
      const b = h('button.chip', { type: 'button', class: k === cat ? 'on' : '' }, CAT_LABELS[k]);
      b.addEventListener('click', () => { cat = k; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); b.classList.add('on'); render(); });
      return b;
    }));
    render();
    const font = fontById(S.design.text.font);
    const weights = (font?.weights || [400]).map((w) => ({ value: w, label: String(w) }));
    return [
      section('الوزن', [
        segmented(ctx, null, 'text.weight', weights, { small: true }),
        h('div', { style: { height: '10px' } }),
        toggle(ctx, 'مائل', 'text.italic'),
      ]),
      section(`الخطوط · ${S.boot.fonts.length - 1}`, [h('div.search', search, h('span')), chips, list], { hint: 'جميع الخطوط مرخصة للاستخدام التجاري (SIL OFL).' }),
    ];
  },
};
