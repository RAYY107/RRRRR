// Evora ID — panel: the single image (emblem, URL or Discord avatar)

import { h, ic, clear } from '../../dom.js';
import { S, isAdvanced, setDesign, setUI } from '../../store.js';
import { section, slider, segmented, toggle, colorField, fillEditor, select } from '../../controls.js';
import { errText } from '../../i18n.js';
import { request } from '../../nui.js';

let urlDraft = '';
let discordDraft = '';
let status = null; // { kind: 'ok'|'err'|'busy', text }
let keepRatio = true;

// width / height bindings that keep the aspect ratio when locked
function sizeBind(key) {
  const other = key === 'w' ? 'h' : 'w';
  return {
    path: `image.${key}`,
    get: () => S.design.image[key],
    set: (v, commit = true) => setDesign((d) => {
      const img = d.image;
      if (keepRatio && img[key] > 0) {
        const ratio = img[other] / img[key];
        img[other] = Math.max(8, Math.min(256, Math.round(v * ratio)));
      }
      img[key] = v;
    }, { commit }),
  };
}

function limits() {
  return S.session?.limits?.images || S.session?.settings?.images || { enabled: true, allowUrl: true, allowDiscord: true, hosts: [] };
}

function hostOk(url, lim) {
  if (lim.allowAnyHost) return true;
  const m = /^https:\/\/([^/:?#]+)/i.exec(url);
  if (!m) return false;
  const host = m[1].toLowerCase();
  return (lim.hosts || []).some((a) => host === a || host.endsWith(`.${a}`));
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    const t = setTimeout(() => resolve(null), 8000);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); resolve(null); };
    img.src = url;
  });
}

export default {
  id: 'image',
  icon: 'image',
  key: () => {
    const i = S.design.image;
    return `${S.ui.level}|${i.on}|${i.kind}|${i.tint.on}|${i.attach}|${i.autoWidth}|${i.border.on}|${i.glow.on}|${i.shadow.on}|${status ? status.text : ''}`;
  },
  build(ctx, rebuild) {
    const adv = isAdvanced();
    const img = S.design.image;
    const lim = limits();
    const out = [];

    if (!lim.enabled) return section('الصورة', h('div.empty', 'الصور معطلة على هذا السيرفر.'));

    out.push(section('صورة واحدة', [
      toggle(ctx, 'إظهار الصورة', 'image.on'),
      segmented(ctx, 'المصدر', 'image.kind', [
        { value: 'asset', label: 'شعار', icon: 'emblem' },
        { value: 'url', label: 'رابط', icon: 'link', disabled: !lim.allowUrl },
        { value: 'discord', label: 'ديسكورد', icon: 'discord', disabled: !lim.allowDiscord },
      ], { onChange: () => { status = null; } }),
    ], { hint: 'يسمح بصورة واحدة فقط في التصميم.' }));

    const setStatus = (s) => { status = s; rebuild(); };

    if (img.kind === 'asset') {
      out.push(section('الشعارات', h('div.grid-4', S.boot.assets.map((a) => h('button.asset-tile', {
        type: 'button',
        class: img.asset === a.id && img.on ? 'on' : '',
        title: a.label,
        onClick: () => setDesign((d) => {
          d.image.asset = a.id;
          d.image.on = true;
          if (a.shape === 'pill' || a.shape === 'plate') { d.image.autoWidth = true; d.image.h = Math.max(d.image.h, 56); }
        }, { structure: true }),
      }, h('img', { src: a.file, draggable: 'false' }))))));
    } else if (img.kind === 'url') {
      const input = h('input.input.ltr', { placeholder: 'https://cdn.discordapp.com/…/image.png', value: urlDraft || img.url || '' });
      input.addEventListener('input', () => { urlDraft = input.value.trim(); });
      const preview = h('div.img-preview', img.url ? h('img', { src: img.url, referrerpolicy: 'no-referrer' }) : 'معاينة الصورة');
      const check = async () => {
        const url = (urlDraft || input.value || '').trim();
        if (!/^https:\/\//i.test(url)) return setStatus({ kind: 'err', text: errText('invalid_url') });
        if (!hostOk(url, lim)) return setStatus({ kind: 'err', text: errText('host_not_allowed') });
        setStatus({ kind: 'busy', text: 'جارٍ التحقق من الصورة…' });
        const loaded = await loadImage(url);
        if (!loaded) return setStatus({ kind: 'err', text: errText('load_failed') });
        const res = await request('image.validate', { kind: 'url', url });
        if (!res.ok) return setStatus({ kind: 'err', text: errText(res.error) });
        urlDraft = '';
        setDesign((d) => { d.image.kind = 'url'; d.image.url = res.data.url; d.image.discord = ''; d.image.on = true; }, { structure: true });
        setStatus({ kind: 'ok', text: `تم التحقق · ${String(res.data.kind || '').toUpperCase()}` });
      };
      out.push(section('رابط مباشر', [
        input,
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } }, h('button.btn.sm', { onClick: check }, ic('check', 'sm'), 'تحقق واستخدام')),
        status ? h(`div.msg.${status.kind === 'err' ? 'err' : 'ok'}`, status.text) : null,
        preview,
      ], { hint: `المواقع المسموحة: ${lim.allowAnyHost ? 'أي موقع HTTPS' : (lim.hosts || []).join('، ')}` }));
    } else {
      const input = h('input.input.ltr', { placeholder: '123456789012345678', value: discordDraft || img.discord || '', inputmode: 'numeric' });
      input.addEventListener('input', () => { discordDraft = input.value.replace(/\D/g, ''); input.value = discordDraft; });
      const fetchAvatar = async () => {
        const id = (discordDraft || input.value || '').trim();
        if (!/^\d{17,20}$/.test(id)) return setStatus({ kind: 'err', text: errText('invalid_discord_id') });
        setStatus({ kind: 'busy', text: 'جارٍ جلب صورة ديسكورد…' });
        const res = await request('image.validate', { kind: 'discord', discord: id });
        if (!res.ok) return setStatus({ kind: 'err', text: errText(res.error) });
        discordDraft = '';
        setDesign((d) => { d.image.kind = 'discord'; d.image.discord = id; d.image.url = res.data.url; d.image.on = true; d.image.radius = d.image.radius || 50; d.image.fit = 'cover'; }, { structure: true });
        setStatus({ kind: 'ok', text: 'تم جلب الصورة الرمزية' });
      };
      out.push(section('معرّف ديسكورد', [
        input,
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } }, h('button.btn.sm', { onClick: fetchAvatar }, ic('discord', 'sm'), 'جلب الصورة')),
        status ? h(`div.msg.${status.kind === 'err' ? 'err' : 'ok'}`, status.text) : null,
        h('div.img-preview', img.url ? h('img', { src: img.url, referrerpolicy: 'no-referrer' }) : 'الصورة الرمزية'),
      ], { hint: 'يتم جلب الصورة من الخادم بأمان، ولا يظهر أي مفتاح سري للاعبين.' }));
    }

    if (!img.on) return out;

    out.push(section('الحجم والتموضع', [
      slider(ctx, 'العرض', sizeBind('w'), { min: 8, max: 256, dec: 0 }),
      slider(ctx, 'الارتفاع', sizeBind('h'), { min: 8, max: 256, dec: 0 }),
      toggle(ctx, 'الحفاظ على النسبة', { get: () => keepRatio, set: (v) => { keepRatio = v; } }),
      toggle(ctx, 'عرض تلقائي حسب الرقم', 'image.autoWidth'),
      img.autoWidth ? slider(ctx, 'الهامش', 'image.pad') : null,
      select(ctx, 'الالتصاق بالرقم', 'image.attach', [
        { value: 'none', label: 'حر' }, { value: 'right', label: 'يمين الرقم' }, { value: 'left', label: 'يسار الرقم' },
        { value: 'top', label: 'فوق الرقم' }, { value: 'bottom', label: 'تحت الرقم' },
      ]),
      img.attach !== 'none' ? slider(ctx, 'المسافة', 'image.gap') : null,
      segmented(ctx, 'الترتيب', 'image.order', [{ value: 'back', label: 'خلف الرقم' }, { value: 'front', label: 'أمام الرقم' }]),
      img.kind !== 'asset' ? segmented(ctx, 'الملاءمة', 'image.fit', [{ value: 'cover', label: 'تعبئة' }, { value: 'contain', label: 'احتواء' }]) : null,
      h('button.btn.sm', { style: { marginTop: '4px' }, onClick: () => setUI({ tab: 'position', selection: 'image' }) }, ic('move', 'sm'), 'الموضع والحجم والدوران'),
    ]));

    out.push(section('المظهر', [
      slider(ctx, 'الشفافية', 'image.opacity', { mul: 100, unit: '%' }),
      img.kind !== 'asset' ? slider(ctx, 'استدارة الزوايا', 'image.radius', { unit: '%' }) : null,
      img.kind === 'asset' ? toggle(ctx, 'تلوين الشعار', 'image.tint.on') : null,
      img.kind === 'asset' && img.tint.on ? fillEditor(ctx, 'image.tint.fill', { simple: !adv }) : null,
    ]));

    if (adv) {
      out.push(section('الإطار والتوهج', [
        toggle(ctx, 'إطار', 'image.border.on'),
        img.border.on ? slider(ctx, 'السماكة', 'image.border.width') : null,
        img.border.on ? colorField(ctx, 'اللون', 'image.border.color', 'image.border.alpha') : null,
        toggle(ctx, 'توهج', 'image.glow.on'),
        img.glow.on ? colorField(ctx, 'اللون', 'image.glow.color', 'image.glow.alpha') : null,
        img.glow.on ? slider(ctx, 'نصف القطر', 'image.glow.radius') : null,
        img.glow.on ? slider(ctx, 'القوة', 'image.glow.strength', { mul: 100, unit: '%' }) : null,
        toggle(ctx, 'ظل', 'image.shadow.on'),
        img.shadow.on ? slider(ctx, 'إزاحة X', 'image.shadow.x') : null,
        img.shadow.on ? slider(ctx, 'إزاحة Y', 'image.shadow.y') : null,
        img.shadow.on ? slider(ctx, 'التمويه', 'image.shadow.blur') : null,
        img.shadow.on ? colorField(ctx, 'اللون', 'image.shadow.color', 'image.shadow.alpha') : null,
      ]));
    }
    return out;
  },
};

export function resetImageStatus() { status = null; urlDraft = ''; discordDraft = ''; }
