// Evora ID — panel: layers and the text+image group

import { h, ic } from '../../dom.js';
import { S, setDesign, setUI } from '../../store.js';
import { section } from '../../controls.js';
import { effectType } from '../../schema.js';
import { T } from '../../i18n.js';

// Bake the group transform into both layers (visual result unchanged).
export function ungroup(d) {
  const g = d.group;
  const rad = (g.rotate * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  for (const key of ['text', 'image']) {
    const l = d.layers[key];
    const x = l.x * g.scale, y = l.y * g.scale;
    l.x = +(g.x + x * cos - y * sin).toFixed(1);
    l.y = +(g.y + x * sin + y * cos).toFixed(1);
    l.scale = +(l.scale * g.scale).toFixed(3);
    l.rotate = +(((l.rotate + g.rotate + 540) % 360) - 180).toFixed(1);
  }
  d.group = { on: false, x: 0, y: 0, scale: 1, rotate: 0 };
}

export default {
  id: 'layers',
  icon: 'layers',
  adv: true,
  key: () => `${S.design.group.on}|${S.design.image.on}|${S.design.layers.text.hidden}|${S.design.layers.image.hidden}|${S.ui.selection}|${S.design.effect.type}|${S.design.effect.target}|${S.design.image.order}`,
  build() {
    const d = S.design;
    const row = (sel, label, iconName, { child = false, hideKey = null } = {}) => h('div.layer-row', {
      class: `${S.ui.selection === sel ? 'on' : ''} ${child ? 'child' : ''}`,
      onClick: () => setUI({ selection: sel }),
    },
    ic(iconName, 'sm'),
    h('span.grow', label),
    hideKey ? h('button.eye', {
      title: 'إظهار / إخفاء',
      onClick: (e) => { e.stopPropagation(); setDesign((x) => { x.layers[hideKey].hidden = !x.layers[hideKey].hidden; }, { structure: true }); },
    }, ic(d.layers[hideKey].hidden ? 'eyeOff' : 'eye', 'sm')) : null);

    const fx = effectType(d.effect.type);
    const rows = [row('stage', `${T.sel.stage} (كل التصميم)`, 'focus')];
    const layerRows = [];
    const imageRow = d.image.on ? row('image', T.sel.image, 'image', { child: d.group.on, hideKey: 'image' }) : null;
    const textRow = row('text', T.sel.text, 'text', { child: d.group.on, hideKey: 'text' });
    if (d.image.order === 'front') layerRows.push(imageRow, textRow); else layerRows.push(textRow, imageRow);
    if (d.group.on) rows.push(row('group', T.sel.group, 'group'));
    rows.push(...layerRows.filter(Boolean));

    return [
      section('الطبقات', rows, { hint: 'التصميم يحتوي على نص واحد وصورة واحدة كحد أقصى. التجميع يحرّكهما معاً.' }),
      section('التجميع', h('div.grid-2',
        d.group.on
          ? h('button.btn.sm', { onClick: () => { setDesign((x) => ungroup(x), { structure: true }); setUI({ selection: 'text' }); } }, ic('ungroup', 'sm'), 'فك التجميع')
          : h('button.btn.sm', { disabled: !d.image.on || null, onClick: () => { setDesign((x) => { x.group = { on: true, x: 0, y: 0, scale: 1, rotate: 0 }; }, { structure: true }); setUI({ selection: 'group' }); } }, ic('group', 'sm'), 'تجميع النص والصورة'),
        h('button.btn.sm', { disabled: !d.group.on || null, onClick: () => setDesign((x) => { Object.assign(x.group, { x: 0, y: 0, scale: 1, rotate: 0 }); }) }, 'إعادة ضبط المجموعة'),
        h('button.btn.sm', { disabled: !d.image.on || null, onClick: () => setDesign((x) => { x.image.order = x.image.order === 'front' ? 'back' : 'front'; }, { structure: true }) }, ic('front', 'sm'), d.image.order === 'front' ? 'الصورة للخلف' : 'الصورة للأمام'))),
      section('طبقة التأثير', h('div.layer-row', { onClick: () => setUI({ tab: 'effect' }) },
        ic('sparkle', 'sm'),
        h('span.grow', fx && fx.id !== 'none' ? fx.label : 'بدون تأثير'),
        fx && fx.id !== 'none' ? h('span.badge', { style: { textDecoration: 'none' } }, { text: 'الرقم', image: 'الصورة', all: 'الكل' }[d.effect.target]) : null)),
    ];
  },
};
