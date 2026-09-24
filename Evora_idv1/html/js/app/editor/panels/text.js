// Evora ID — panel: text (numerals, size, spacing, decorative symbols)

import { h, num } from '../../dom.js';
import { S, isAdvanced, setDesign } from '../../store.js';
import { section, slider, segmented, toggle } from '../../controls.js';
import { fontById } from '../../schema.js';

const PAIRS = [['[', ']'], ['(', ')'], ['{', '}'], ['<', '>'], ['«', '»'], ['‹', '›'], ['⟨', '⟩']];

function idHero() {
  const own = !S.target || S.target.type !== 'player';
  return h('div.id-hero',
    h('div.big', num(S.displayId)),
    h('div.txt', own
      ? 'هذا رقمك الحقيقي في السيرفر. المحرر يغيّر شكله فقط ولا يغيّر الرقم أبداً.'
      : 'رقم اللاعب الحقيقي. التصميم يغيّر شكل الرقم فقط.'));
}

function affixRow(key, label) {
  const cur = S.design.text[key];
  const sym = S.boot.affixes;
  const current = h('div.char-chip', { style: { minWidth: '64px', height: '36px', fontSize: '18px' } }, cur || h('span.muted', { style: { fontSize: '11px' } }, 'لا يوجد'));
  const add = (c) => setDesign((d) => {
    const chars = [...(d.text[key] || '')];
    if (chars.length >= S.boot.limits.AffixChars) chars.shift();
    chars.push(c);
    d.text[key] = chars.join('');
  }, { structure: true });
  return h('div', { style: { marginBottom: '14px' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
      h('span', { style: { fontSize: '11.5px', color: 'var(--text-3)', width: '70px' } }, label),
      current,
      h('button.btn.sm.ghost', { disabled: !cur || null, onClick: () => setDesign((d) => { d.text[key] = ''; }, { structure: true }) }, 'مسح')),
    h('div.chips', sym.map((c) => h('button.chip', { type: 'button', style: { minWidth: '30px', justifyContent: 'center', padding: '0 6px', fontSize: '13px' }, onClick: () => add(c) }, c))));
}

export default {
  id: 'text',
  icon: 'text',
  key: () => `${S.ui.level}|${S.design.text.prefix}|${S.design.text.suffix}|${S.design.text.font}|${S.displayId}`,
  build(ctx) {
    const adv = isAdvanced();
    const font = fontById(S.design.text.font);
    const nums = font?.numerals || ['latin'];
    const numOpts = [
      { value: 'latin', label: '7  إنجليزية' },
      { value: 'arabic', label: '٧  عربية' },
      { value: 'persian', label: '۷  فارسية' },
    ];
    return [
      section('رقم الهوية', idHero()),
      section('الأرقام', [
        segmented(ctx, null, 'text.numerals', numOpts),
        h('div.sec-hint', { style: { marginTop: '8px' } }, nums.includes(S.design.text.numerals)
          ? 'نفس الرقم تماماً، الاختلاف في شكل الحروف فقط.'
          : 'هذا الخط لا يحتوي على هذه الأرقام، سيُستخدم خط بديل مناسب تلقائياً.'),
        slider(ctx, 'الحجم', 'text.size'),
        slider(ctx, 'تباعد الأحرف', 'text.tracking'),
        adv ? slider(ctx, 'ارتفاع السطر', 'text.lineHeight') : null,
        adv ? segmented(ctx, 'المحاذاة', 'text.align', [
          { value: 'right', label: 'يمين' }, { value: 'center', label: 'وسط' }, { value: 'left', label: 'يسار' },
        ]) : null,
        slider(ctx, 'الشفافية', 'text.opacity', { mul: 100, unit: '%' }),
      ]),
      section('الرموز الزخرفية', [
        h('div.chips', { style: { marginBottom: '14px' } }, PAIRS.map(([a, b]) => h('button.chip', {
          type: 'button', onClick: () => setDesign((d) => { d.text.prefix = a; d.text.suffix = b; }, { structure: true }),
        }, `${a} 7 ${b}`))),
        affixRow('prefix', 'قبل الرقم'),
        affixRow('suffix', 'بعد الرقم'),
        adv ? slider(ctx, 'حجم الرموز', 'text.affixScale', { mul: 100, unit: '%' }) : null,
        adv ? slider(ctx, 'المسافة', 'text.affixGap') : null,
      ], { hint: 'رموز تحيط بالرقم للزينة فقط. لا يمكن إضافة أرقام أو حروف.' }),
      adv ? section('السلوك', [toggle(ctx, 'يتلاشى مع المسافة', 'transform.fade')]) : null,
    ];
  },
};
