// Evora ID — panel: character editor (per-character styling rules)

import { h, ic } from '../../dom.js';
import { S, setDesign, setUI } from '../../store.js';
import { section, slider, toggle, fillEditor, select, colorField } from '../../controls.js';
import { defaultAt } from '../../schema.js';
import { charList, selectorMatches } from '../../../core/render.js';
import { clone } from '../../../core/util.js';
import { toast } from '../../ui.js';
import { clipboard, setClipboard } from '../../storage.js';

const QUICK = [
  { mode: 'all', label: 'الكل' }, { mode: 'first', label: 'الأول' }, { mode: 'last', label: 'الأخير' },
  { mode: 'odd', label: 'الفردية' }, { mode: 'even', label: 'الزوجية' }, { mode: 'prefix', label: 'الرموز قبل' }, { mode: 'suffix', label: 'الرموز بعد' },
];

function sameSel(a, b) {
  if (!a || !b || a.mode !== b.mode) return false;
  if (a.mode === 'index') return a.a === b.a;
  if (a.mode === 'range') return a.a === b.a && a.b === b.b;
  if (a.mode === 'list') return JSON.stringify([...(a.list || [])].sort()) === JSON.stringify([...(b.list || [])].sort());
  return true;
}

export function describeSel(sel) {
  switch (sel.mode) {
    case 'all': return 'كل الأحرف';
    case 'first': return 'الرقم الأول';
    case 'last': return 'الرقم الأخير';
    case 'odd': return 'الأرقام الفردية';
    case 'even': return 'الأرقام الزوجية';
    case 'prefix': return 'الرموز قبل الرقم';
    case 'suffix': return 'الرموز بعد الرقم';
    case 'index': return `الرقم ${sel.a + 1}`;
    case 'range': return `من ${sel.a + 1} إلى ${sel.b + 1}`;
    case 'list': return `الأرقام ${(sel.list || []).map((i) => i + 1).join('، ')}`;
    default: return sel.mode;
  }
}

const ruleIndex = () => S.design.text.chars.findIndex((r) => sameSel(r.sel, S.ui.charSel));

function ensureRule(d) {
  let i = d.text.chars.findIndex((r) => sameSel(r.sel, S.ui.charSel));
  if (i < 0) {
    if (d.text.chars.length >= S.boot.limits.CharRules) return -1;
    const style = defaultAt('text.chars.0.style');
    d.text.chars.push({ sel: { a: 0, b: 0, list: [], ...clone(S.ui.charSel) }, style });
    i = d.text.chars.length - 1;
  }
  return i;
}

// Binding to a style property of the selection's rule (created on first edit).
function ruleBind(prop) {
  return {
    path: null,
    get: () => {
      const i = ruleIndex();
      if (i < 0) return defaultAt(`text.chars.0.style.${prop}`);
      return S.design.text.chars[i].style[prop];
    },
    set: (v, commit = true) => setDesign((d) => {
      const i = ensureRule(d);
      if (i >= 0) d.text.chars[i].style[prop] = v;
    }, { commit, structure: ruleIndex() < 0 }),
  };
}

export default {
  id: 'chars',
  icon: 'chars',
  adv: true,
  key: () => {
    const i = ruleIndex();
    const st = i >= 0 ? S.design.text.chars[i].style : {};
    return `${JSON.stringify(S.ui.charSel)}|${S.design.text.chars.length}|${S.design.text.prefix}|${S.design.text.suffix}|${S.displayId}|${S.design.text.numerals}|${!!st.fill}|${!!st.font}|${!!st.glow}|${!!st.outline}|${!!st.shadow}|${st.fill ? st.fill.type : ''}`;
  },
  build(ctx) {
    const text = S.design.text;
    const { chars, digitCount } = charList(text, S.displayId);
    const sel = S.ui.charSel;
    const idx = ruleIndex();
    const rule = idx >= 0 ? text.chars[idx] : null;

    const chip = (c) => {
      const on = selectorMatches(sel, c, digitCount);
      return h('button.char-chip', {
        type: 'button',
        class: `${on ? 'on' : ''} ${c.kind !== 'digit' ? 'affix' : ''}`,
        onClick: (e) => {
          if (c.kind !== 'digit') return setUI({ charSel: { mode: c.kind, a: 0, b: 0, list: [] } });
          let list = sel.mode === 'list' ? [...sel.list] : sel.mode === 'index' ? [sel.a] : [];
          if (e.shiftKey || e.ctrlKey) {
            list = list.includes(c.index) ? list.filter((x) => x !== c.index) : [...list, c.index];
          } else list = [c.index];
          if (!list.length) return setUI({ charSel: { mode: 'all', a: 0, b: 0, list: [] } });
          setUI({ charSel: list.length === 1 ? { mode: 'index', a: list[0], b: 0, list: [] } : { mode: 'list', a: 0, b: 0, list: list.sort((a, b) => a - b) } });
        },
      }, c.ch, c.kind === 'digit' ? h('small', String(c.index + 1)) : null);
    };

    const out = [
      section('اختيار الأحرف', [
        h('div.char-chips', chars.map(chip)),
        h('div.chips', { style: { marginTop: '12px' } }, QUICK.map((q) => h('button.chip', {
          type: 'button', class: sel.mode === q.mode ? 'on' : '', onClick: () => setUI({ charSel: { mode: q.mode, a: 0, b: 0, list: [] } }),
        }, q.label))),
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' } },
          h('span.muted', { style: { fontSize: '11.5px' } }, 'نطاق'),
          h('button.btn.sm', { onClick: () => setUI({ charSel: { mode: 'range', a: 0, b: Math.max(0, Math.min(15, digitCount - 1)), list: [] } }) }, 'تحديد نطاق'),
          sel.mode === 'range' ? h('span.num', `${sel.a + 1}–${sel.b + 1}`) : null),
        sel.mode === 'range' ? slider(ctx, 'من', { get: () => S.ui.charSel.a, set: (v) => setUI({ charSel: { ...S.ui.charSel, a: v } }) }, { min: 0, max: 15, dec: 0 }) : null,
        sel.mode === 'range' ? slider(ctx, 'إلى', { get: () => S.ui.charSel.b, set: (v) => setUI({ charSel: { ...S.ui.charSel, b: v } }) }, { min: 0, max: 15, dec: 0 }) : null,
      ], { hint: 'Shift أو Ctrl لاختيار أكثر من رقم. القواعد تعمل أيضاً مع أي رقم آخر بنفس الترتيب.' }),
    ];

    const style = (prop) => ruleBind(prop);
    const hasOverride = (prop) => !!(rule && rule.style[prop]);
    const overrideToggle = (prop, label, init) => toggle(ctx, label, {
      get: () => hasOverride(prop),
      set: (v) => setDesign((d) => {
        const i = ensureRule(d);
        if (i < 0) return;
        if (v) d.text.chars[i].style[prop] = clone(init());
        else delete d.text.chars[i].style[prop];
      }, { structure: true }),
    });

    out.push(section(`تنسيق: ${describeSel(sel)}`, [
      slider(ctx, 'الحجم', style('scale'), { min: 0.3, max: 2.5, dec: 3, mul: 100, unit: '%' }),
      slider(ctx, 'إزاحة X', style('x'), { min: -60, max: 60, dec: 1 }),
      slider(ctx, 'إزاحة Y', style('y'), { min: -60, max: 60, dec: 1 }),
      slider(ctx, 'الدوران', style('rotate'), { min: -180, max: 180, dec: 1, unit: '°' }),
      slider(ctx, 'الشفافية', style('opacity'), { min: 0, max: 1, dec: 2, mul: 100, unit: '%' }),
      toggle(ctx, 'يشارك في تأثير الأحرف', style('animate')),
      overrideToggle('fill', 'لون خاص', () => clone(S.design.text.fill)),
      hasOverride('fill') ? fillEditor(ctx, `text.chars.${idx}.style.fill`, { simple: false }) : null,
      overrideToggle('font', 'خط خاص', () => S.design.text.font),
      hasOverride('font') ? select(ctx, 'الخط', `text.chars.${idx}.style.font`, S.boot.fonts.filter((f) => f.category !== 'fallback').map((f) => ({ value: f.id, label: f.label }))) : null,
      overrideToggle('glow', 'توهج خاص', () => ({ ...clone(S.design.text.glow), on: true })),
      hasOverride('glow') ? toggle(ctx, 'التوهج مفعّل', `text.chars.${idx}.style.glow.on`) : null,
      hasOverride('glow') ? colorField(ctx, 'لون التوهج', `text.chars.${idx}.style.glow.color`, `text.chars.${idx}.style.glow.alpha`) : null,
      hasOverride('glow') ? slider(ctx, 'نصف القطر', `text.chars.${idx}.style.glow.radius`) : null,
      overrideToggle('outline', 'إطار خاص', () => ({ ...clone(S.design.text.outline), on: true })),
      hasOverride('outline') ? toggle(ctx, 'الإطار مفعّل', `text.chars.${idx}.style.outline.on`) : null,
      hasOverride('outline') ? slider(ctx, 'السماكة', `text.chars.${idx}.style.outline.width`) : null,
      hasOverride('outline') ? colorField(ctx, 'اللون', `text.chars.${idx}.style.outline.color`, `text.chars.${idx}.style.outline.alpha`) : null,
      overrideToggle('shadow', 'ظل خاص', () => ({ ...clone(S.design.text.shadow), on: true })),
      hasOverride('shadow') ? toggle(ctx, 'الظل مفعّل', `text.chars.${idx}.style.shadow.on`) : null,
      h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
        h('button.btn.sm', { disabled: !rule || null, onClick: () => { setClipboard({ kind: 'char', data: clone(rule.style) }); toast('تم نسخ تنسيق الأحرف'); } }, ic('copy', 'sm'), 'نسخ التنسيق'),
        h('button.btn.sm', { disabled: clipboard()?.kind !== 'char' || null, onClick: () => {
          const c = clipboard();
          setDesign((d) => { const i = ensureRule(d); if (i >= 0) d.text.chars[i].style = clone(c.data); }, { structure: true });
        } }, ic('paste', 'sm'), 'لصق التنسيق')),
    ]));

    out.push(section(`القواعد · ${text.chars.length}/${S.boot.limits.CharRules}`, text.chars.length
      ? text.chars.map((r, i) => h('div.rule', { class: sameSel(r.sel, sel) ? 'on' : '', onClick: () => setUI({ charSel: clone(r.sel) }) },
        h('span.grow', describeSel(r.sel)),
        h('button.btn.icon.sm.ghost', { title: 'حذف', onClick: (e) => { e.stopPropagation(); setDesign((d) => { d.text.chars.splice(i, 1); }, { structure: true }); } }, ic('trash', 'sm'))))
      : h('div.empty', 'لا توجد قواعد بعد. اختر أحرفاً وعدّل أي خاصية لإنشاء قاعدة.')));
    return out;
  },
};
