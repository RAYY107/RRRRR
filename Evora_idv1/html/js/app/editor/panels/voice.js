// Evora ID — panel: "talking now" indicator (shown while the player talks)

import { h, ltr } from '../../dom.js';
import { S, isAdvanced, setDesign, setUI } from '../../store.js';
import { section, slider, segmented, toggle, colorField, fillEditor, select } from '../../controls.js';
import { VOICE_ICONS } from '../../../core/render.js';
import { voiceFontOf } from '../../../core/fonts.js';

// Same rule as the server: letters, spaces, light punctuation. No digits.
const LABEL_OK = /^[A-Za-zء-ٟٮ-ۓ .,!?\-:·•…،؟ـ'/]*$/;

const ICONS = [
  { id: 'none', label: 'بدون' }, { id: 'wave', label: 'موجة' }, { id: 'mic', label: 'مايك' }, { id: 'bars', label: 'مستوى' },
  { id: 'speaker', label: 'سماعة' }, { id: 'ring', label: 'حلقة' }, { id: 'dot', label: 'نقطة' },
];

const BARS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#fff"><rect x="3" y="9" width="3" height="6" rx="1.5"/><rect x="8" y="5" width="3" height="14" rx="1.5"/><rect x="13" y="7" width="3" height="10" rx="1.5"/><rect x="18" y="10" width="3" height="4" rx="1.5"/></g></svg>';

function iconTile(icon) {
  const v = S.design.voice;
  const svg = icon.id === 'bars' ? BARS : VOICE_ICONS[icon.id];
  const glyph = svg
    ? h('span', { style: { width: '22px', height: '22px', background: '#e8eaed', webkitMaskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, maskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, webkitMaskSize: 'contain', maskSize: 'contain', webkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' } })
    : h('span', { style: { fontSize: '11px', color: 'var(--text-3)' } }, '—');
  return h('button.fx-tile', {
    type: 'button', class: v.icon === icon.id ? 'on' : '', style: { alignItems: 'center', height: '64px' },
    onClick: () => setDesign((d) => { d.voice.icon = icon.id; }, { structure: true }),
  }, glyph, h('b', { style: { fontSize: '10.5px' } }, icon.label));
}

export default {
  id: 'voice',
  icon: 'mic',
  key: () => {
    const v = S.design.voice;
    return `${S.ui.level}|${v.on}|${v.label}|${v.showLabel}|${v.icon}|${v.matchText}|${v.bg.on}|${v.bg.border.on}|${v.outline.on}|${v.glow.on}|${v.shadow.on}|${v.idGlow.on}|${voiceFontOf(S.design)}|${S.ui.previewTalk}`;
  },
  build(ctx) {
    const adv = isAdvanced();
    const v = S.design.voice;
    const cfg = S.boot.voice || { enabled: true, labels: [], allowCustom: true };
    const out = [];

    out.push(section('مؤشر التحدث', [
      toggle(ctx, 'إظهار المؤشر أثناء التحدث', 'voice.on'),
      toggle(ctx, 'معاينة وضع التحدث', { get: () => !!S.ui.previewTalk, set: (on) => setUI({ previewTalk: on }) }),
    ], { hint: cfg.enabled === false
      ? 'مؤشر التحدث معطل في إعدادات السيرفر.'
      : 'يظهر فوق رقمك للجميع عندما تضغط زر التحدث (N)، ويظهر لك أيضاً على شاشتك. شكله بالكامل من هنا.' }));
    if (!v.on) return out;

    const input = h('input.input', { value: v.label, maxlength: '24', placeholder: cfg.defaultLabel || 'يتحدث الآن', disabled: cfg.allowCustom === false || null });
    const msg = h('div.msg', { style: { display: 'none' } });
    input.addEventListener('input', () => {
      const val = input.value;
      const ok = LABEL_OK.test(val);
      msg.style.display = ok ? 'none' : '';
      msg.className = 'msg err';
      msg.textContent = 'مسموح بالحروف والمسافات وعلامات الترقيم فقط، بدون أرقام.';
      if (ok) setDesign((d) => { d.voice.label = val; }, { commit: false });
    });
    input.addEventListener('change', () => { if (LABEL_OK.test(input.value)) setDesign((d) => { d.voice.label = input.value.trim(); }); });
    out.push(section('النص', [
      toggle(ctx, 'إظهار النص', 'voice.showLabel'),
      v.showLabel ? input : null,
      v.showLabel ? msg : null,
      v.showLabel ? h('div.chips', { style: { marginTop: '10px' } }, (cfg.labels || []).map((l) => h('button.chip', {
        type: 'button', class: v.label === l ? 'on' : '', onClick: () => setDesign((d) => { d.voice.label = l; }, { structure: true }),
      }, /[A-Za-z]/.test(l) ? ltr(l) : l))) : null,
    ]));

    out.push(section('الأيقونة', [
      h('div.grid-4', ICONS.map(iconTile)),
      v.icon !== 'none' && v.showLabel ? h('div', { style: { marginTop: '12px' } }, segmented(ctx, 'مكانها', 'voice.iconSide', [{ value: 'start', label: 'يمين النص' }, { value: 'end', label: 'يسار النص' }])) : null,
    ]));

    out.push(section('الموضع والحجم', [
      segmented(ctx, 'مكان المؤشر', 'voice.attach', [
        { value: 'top', label: 'فوق' }, { value: 'bottom', label: 'تحت' }, { value: 'right', label: 'يمين' }, { value: 'left', label: 'يسار' },
      ]),
      slider(ctx, 'المسافة', 'voice.gap'),
      slider(ctx, 'الحجم', 'voice.scale', { mul: 100, unit: '%' }),
      adv ? slider(ctx, 'إزاحة X', 'voice.x') : null,
      adv ? slider(ctx, 'إزاحة Y', 'voice.y') : null,
      adv ? slider(ctx, 'الدوران', 'voice.rotate', { unit: '°' }) : null,
    ], { hint: 'يمكنك سحب المؤشر مباشرة فوق شخصيتك أثناء المعاينة.' }));

    const labelFonts = S.boot.labelFonts || [];
    const fontId = voiceFontOf(S.design);
    const font = labelFonts.find((f) => f.id === fontId);
    out.push(section('الخط والألوان', [
      toggle(ctx, 'مطابقة لون الرقم وخطه', 'voice.matchText'),
      !v.matchText ? select(ctx, 'الخط', 'voice.font', labelFonts.map((f) => ({ value: f.id, label: f.label }))) : null,
      font ? segmented(ctx, 'الوزن', 'voice.weight', font.weights.filter((w, i, a) => a.length <= 4 || w % 200 === 0 || w === a[a.length - 1]).map((w) => ({ value: w, label: String(w) })), { small: true }) : null,
      slider(ctx, 'حجم الخط', 'voice.size'),
      adv ? slider(ctx, 'تباعد الأحرف', 'voice.tracking') : null,
      !v.matchText ? fillEditor(ctx, 'voice.fill', { simple: !adv }) : null,
    ], { hint: v.matchText ? 'يأخذ المؤشر لون الرقم، وخطه إن كان يدعم الحروف العربية.' : null }));

    out.push(section('الخلفية', [
      toggle(ctx, 'خلفية', 'voice.bg.on'),
      v.bg.on ? fillEditor(ctx, 'voice.bg.fill', { simple: !adv }) : null,
      v.bg.on ? slider(ctx, 'استدارة الزوايا', 'voice.bg.radius') : null,
      v.bg.on ? slider(ctx, 'هامش أفقي', 'voice.bg.padX') : null,
      v.bg.on ? slider(ctx, 'هامش عمودي', 'voice.bg.padY') : null,
      v.bg.on ? toggle(ctx, 'حدود', 'voice.bg.border.on') : null,
      v.bg.on && v.bg.border.on ? slider(ctx, 'سماكة الحدود', 'voice.bg.border.width') : null,
      v.bg.on && v.bg.border.on ? colorField(ctx, 'لون الحدود', 'voice.bg.border.color', 'voice.bg.border.alpha') : null,
    ]));

    if (adv) {
      out.push(section('الإطار والتوهج والظل', [
        toggle(ctx, 'إطار النص', 'voice.outline.on'),
        v.outline.on ? slider(ctx, 'السماكة', 'voice.outline.width') : null,
        v.outline.on ? colorField(ctx, 'اللون', 'voice.outline.color', 'voice.outline.alpha') : null,
        toggle(ctx, 'توهج', 'voice.glow.on'),
        v.glow.on ? colorField(ctx, 'لون التوهج', 'voice.glow.color', 'voice.glow.alpha') : null,
        v.glow.on ? slider(ctx, 'نصف القطر', 'voice.glow.radius') : null,
        v.glow.on ? slider(ctx, 'القوة', 'voice.glow.strength', { mul: 100, unit: '%' }) : null,
        toggle(ctx, 'ظل', 'voice.shadow.on'),
        v.shadow.on ? slider(ctx, 'إزاحة Y', 'voice.shadow.y') : null,
        v.shadow.on ? slider(ctx, 'التمويه', 'voice.shadow.blur') : null,
        v.shadow.on ? colorField(ctx, 'لون الظل', 'voice.shadow.color', 'voice.shadow.alpha') : null,
      ]));
    }

    out.push(section('الحركة', [
      segmented(ctx, null, 'voice.anim', [
        { value: 'none', label: 'ثابت' }, { value: 'pulse', label: 'نبض' }, { value: 'glow', label: 'توهج' },
        { value: 'bounce', label: 'قفز' }, { value: 'blink', label: 'وميض' }, { value: 'breathe', label: 'تنفس' },
      ], { small: true }),
      h('div', { style: { height: '10px' } }),
      slider(ctx, 'السرعة', 'voice.speed', { unit: '×' }),
      adv ? slider(ctx, 'مدة الظهور', 'voice.fadeMs', { unit: 'ms' }) : null,
    ]));

    out.push(section('الرقم أثناء التحدث', [
      toggle(ctx, 'توهج الرقم', 'voice.idGlow.on'),
      v.idGlow.on ? colorField(ctx, 'اللون', 'voice.idGlow.color') : null,
      v.idGlow.on ? slider(ctx, 'نصف القطر', 'voice.idGlow.radius') : null,
      v.idGlow.on ? slider(ctx, 'القوة', 'voice.idGlow.strength', { mul: 100, unit: '%' }) : null,
      slider(ctx, 'تكبير الرقم', 'voice.idScale', { mul: 100, unit: '%' }),
    ], { hint: 'تأثير إضافي على رقمك نفسه أثناء التحدث فقط.' }));
    return out;
  },
};
