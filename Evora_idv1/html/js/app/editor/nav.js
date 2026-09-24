// Evora ID — navigation rail + drawer (home, designs, presets, favourites, drafts)

import { h, ic, clear, ltr, num, tooltip } from '../dom.js';
import { S, on, setUI } from '../store.js';
import { T, dur, ago, errText } from '../i18n.js';
import { thumb } from '../thumbs.js';
import { request } from '../nui.js';
import { toast, dialog, confirm } from '../ui.js';
import * as store from '../storage.js';
import { clone } from '../../core/util.js';

let presetQuery = '';
let presetCat = 'all';

export function statusBadges(summary, { draft = false } = {}) {
  const out = [];
  if (!summary) return out;
  const st = summary.status || 'none';
  out.push(h(`span.badge.${st}`, T.status[st]));
  if (st === 'temporary' && summary.expiresIn) out.push(h('span.badge.time', ic('hourglass', 'sm'), dur(summary.expiresIn)));
  if (summary.cooldown > 0) out.push(h('span.badge.cooldown', T.status.cooldown));
  if (summary.locked) out.push(h('span.badge.locked', ic('lock', 'sm'), T.status.locked));
  if (draft) out.push(h('span.badge.draft', T.status.draft));
  return out;
}

export function createNav(actions) {
  const items = h('div');
  const nav = h('nav.nav.glass',
    h('div.brand', h('div.brand-mark', 'E'), h('div', h('div.brand-name', ltr('Evora ID')), h('div.brand-sub', 'مصمم شكل رقم الهوية'))),
    h('div.nav-group', 'المحرر'),
    items,
    h('div.nav-spacer'),
    h('div.nav-foot',
      h('div.seg', { id: 'levelSeg' }),
      h('div.credit', h('span', ltr('Evora')), h('span', ltr('Made by LR')))));
  const drawerTitle = h('div.drawer-title');
  const drawerDesc = h('div.drawer-desc');
  const drawerBody = h('div.drawer-body');
  const drawer = h('section.drawer.glass',
    h('div.drawer-head', h('div', drawerTitle, drawerDesc), h('button.btn.icon.sm.ghost', { title: 'طي', onClick: () => setUI({ nav: null }) }, ic('chevronR', 'sm'))),
    drawerBody);

  const sections = () => {
    const own = !S.target;
    return [
      { id: 'home', icon: 'home' },
      own ? { id: 'designs', icon: 'designs' } : null,
      { id: 'presets', icon: 'presets', count: S.presets.length },
      own ? { id: 'favorites', icon: 'star', count: (S.session?.favorites || []).length } : null,
      { id: 'drafts', icon: 'drafts' },
    ].filter(Boolean);
  };

  function renderItems() {
    clear(items);
    for (const s of sections()) {
      items.appendChild(h('button.nav-item', {
        type: 'button', class: S.ui.nav === s.id ? 'active' : '',
        onClick: () => setUI({ nav: S.ui.nav === s.id ? null : s.id }),
      }, ic(s.icon), h('span', T.nav[s.id]), s.count ? h('span.count', String(s.count)) : null));
    }
    const seg = nav.querySelector('#levelSeg');
    clear(seg);
    for (const [v, l] of [['simple', 'بسيط'], ['advanced', 'متقدم']]) {
      seg.appendChild(h('button', { type: 'button', class: S.ui.level === v ? 'on' : '', onClick: () => setUI({ level: v }) }, l));
    }
  }

  // ------------------------------------------------------------ cards
  function presetCard(p) {
    const favs = S.session?.favorites || [];
    const fav = favs.some((f) => f.kind === 'preset' && f.ref === p.id);
    const locked = p.locked && !S.session?.perms?.manage;
    const active = S.design?.meta?.preset === p.id;
    const star = h('button.star', { type: 'button', class: fav ? 'on' : '', title: 'المفضلة' }, ic('star', 'sm'));
    star.addEventListener('click', (e) => { e.stopPropagation(); actions.toggleFavorite('preset', p.id); });
    const card = h('div.card', { class: active ? 'sel' : '', style: locked ? { opacity: '.55' } : null },
      thumb(p.design, S.displayId, { w: 140, h: 70, zoom: 1.65, fluid: true }),
      h('div.flags',
        p.featured ? h('span.badge.featured', ic('star', 'sm')) : null,
        p.locked ? h('span.badge.locked', ic('lock', 'sm')) : null),
      h('div.meta',
        h('div', { style: { minWidth: 0 } }, h('div.name', ltr(p.name)), h('div.sub', p.nameAr || T.fontCats[p.category] || '')),
        S.target ? null : star));
    card.addEventListener('click', () => {
      if (locked) return toast(errText('preset_locked'), 'err');
      actions.applyPreset(p);
    });
    tooltip(card, p.description || '');
    return card;
  }

  function slotCard(slotNo, slot) {
    const favs = S.session?.favorites || [];
    const fav = favs.some((f) => f.kind === 'slot' && f.ref === String(slotNo));
    return h('div.card', { style: { cursor: 'default', marginBottom: '10px' } },
      slot ? thumb(slot.design, S.displayId, { w: 298, h: 110, zoom: 1.4, fluid: true }) : h('div.thumb', { style: { height: '110px', display: 'grid', placeItems: 'center', color: 'var(--text-4)', fontSize: '11.5px' } }, 'فارغ'),
      h('div.meta',
        h('div', h('div.name', slot ? slot.name : `التصميم ${slotNo}`), h('div.sub', slot?.updatedAt ? ago(slot.updatedAt * 1000) : 'لا يوجد تصميم محفوظ')),
        slot ? h('button.star', { type: 'button', class: fav ? 'on' : '', onClick: () => actions.toggleFavorite('slot', slotNo) }, ic('star', 'sm')) : null),
      h('div', { style: { display: 'flex', gap: '6px', padding: '6px 4px 2px' } },
        slot ? h('button.btn.sm', { onClick: () => actions.loadDesign(slot.design, slot.name) }, 'تحميل') : null,
        h('button.btn.sm', { onClick: () => actions.saveSlot(slotNo, slot?.name) }, ic('save', 'sm'), slot ? 'استبدال بالحالي' : 'حفظ الحالي هنا'),
        slot ? h('button.btn.icon.sm.ghost', { title: 'حذف', onClick: () => actions.deleteSlot(slotNo) }, ic('trash', 'sm')) : null));
  }

  // ------------------------------------------------------------ sections
  const builders = {
    home() {
      const sum = S.target?.type === 'player' ? S.target.summary : S.session?.record;
      const preset = S.design?.meta?.preset ? S.presets.find((p) => p.id === S.design.meta.preset) : null;
      const out = [
        h('div.id-hero', h('div.big', num(S.displayId)), h('div.txt',
          S.target?.type === 'player' ? h('div', 'تعديل تصميم ', h('b', S.target.name || S.target.owner)) : h('div', 'رقم هويتك الحقيقي'),
          h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' } }, statusBadges(sum, { draft: actions.isDirty() })))),
      ];
      if (S.target?.type !== 'preset' && sum) {
        out.push(h('div', { style: { margin: '14px 0' } },
          h('div.kv', h('span', 'الحالة'), h('span', T.status[sum.status] || '—')),
          h('div.kv', h('span', 'القالب'), h('span', preset ? ltr(preset.name) : 'مخصص')),
          sum.status === 'temporary' ? h('div.kv', h('span', 'ينتهي بعد'), h('span', dur(sum.expiresIn))) : null,
          !S.target ? h('div.kv', h('span', 'التعديل التالي'), h('span', sum.cooldown > 0 && sum.cooldownApplies !== false ? `بعد ${dur(sum.cooldown)}` : 'متاح الآن')) : null));
      }
      out.push(h('div.grid-2', { style: { marginTop: '8px' } },
        h('button.btn', { onClick: () => actions.randomize() }, ic('shuffle', 'sm'), 'توليد تصميم'),
        h('button.btn', { onClick: () => actions.revert() }, ic('refresh', 'sm'), 'التراجع عن كل شيء'),
        h('button.btn', { onClick: () => actions.startFromDefault() }, ic('focus', 'sm'), 'البدء من الافتراضي'),
        h('button.btn', { onClick: () => setUI({ nav: 'presets' }) }, ic('presets', 'sm'), 'تصفح القوالب')));
      const recent = store.recent().slice(0, 4);
      if (recent.length) {
        out.push(h('div.sec-title', { style: { margin: '22px 0 10px' } }, 'مؤخراً'));
        out.push(h('div.grid-2', recent.map((r) => {
          const c = h('div.card', thumb(r.design, S.displayId, { w: 140, h: 70, zoom: 1.65, fluid: true }), h('div.meta', h('div.name', r.name ? ltr(r.name) : 'تصميم مخصص')));
          c.addEventListener('click', () => actions.loadDesign(r.design, r.name));
          return c;
        })));
      }
      return out;
    },
    designs() {
      const slots = S.session?.slots || [];
      const count = S.session?.limits?.slots || 3;
      const out = [];
      for (let i = 1; i <= count; i++) out.push(slotCard(i, slots.find((s) => s.slot === i)));
      const recent = store.recent();
      out.push(h('div.sec-title', { style: { margin: '18px 0 10px' } }, 'المستخدمة مؤخراً'));
      out.push(recent.length ? h('div.grid-2', recent.map((r) => {
        const c = h('div.card', thumb(r.design, S.displayId, { w: 140, h: 70, zoom: 1.65, fluid: true }), h('div.meta', h('div', h('div.name', r.name ? ltr(r.name) : 'تصميم مخصص'), h('div.sub', ago(r.at)))));
        c.addEventListener('click', () => actions.loadDesign(r.design, r.name));
        return c;
      })) : h('div.empty', 'لا توجد تصاميم مستخدمة مؤخراً.'));
      return out;
    },
    presets() {
      const grid = h('div.grid-2');
      const renderGrid = () => {
        clear(grid);
        const q = presetQuery.trim().toLowerCase();
        const list = S.presets.filter((p) => (!p.hidden || S.target) && (presetCat === 'all' || (presetCat === 'featured' ? p.featured : p.category === presetCat))
          && (!q || p.name.toLowerCase().includes(q) || (p.nameAr || '').includes(q) || (p.description || '').includes(q)));
        list.forEach((p) => grid.appendChild(presetCard(p)));
        if (!list.length) grid.appendChild(h('div.empty', { style: { gridColumn: '1 / -1' } }, 'لا توجد قوالب مطابقة.'));
      };
      const search = h('input.input', { placeholder: 'ابحث في القوالب', value: presetQuery });
      search.addEventListener('input', () => { presetQuery = search.value; renderGrid(); });
      const cats = [{ id: 'all', label: 'الكل' }, { id: 'featured', label: 'مميزة' },
        ...S.boot.categories.filter((c) => S.presets.some((p) => p.category === c.id))];
      const chips = h('div.chips', { style: { margin: '10px 0 14px' } }, cats.map((c) => {
        const b = h('button.chip', { type: 'button', class: presetCat === c.id ? 'on' : '' }, c.label);
        b.addEventListener('click', () => { presetCat = c.id; chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); b.classList.add('on'); renderGrid(); });
        return b;
      }));
      renderGrid();
      return [h('div.search', search, ic('search', 'sm')), chips, grid];
    },
    favorites() {
      const favs = S.session?.favorites || [];
      if (!favs.length) return h('div.empty', ic('star'), h('div', 'لم تضف شيئاً إلى المفضلة بعد.'), h('div', 'اضغط على النجمة في أي قالب أو تصميم محفوظ.'));
      const presets = favs.filter((f) => f.kind === 'preset').map((f) => S.presets.find((p) => p.id === f.ref)).filter(Boolean);
      const slots = favs.filter((f) => f.kind === 'slot').map((f) => (S.session.slots || []).find((s) => String(s.slot) === f.ref)).filter(Boolean);
      return [
        slots.length ? h('div.sec-title', { style: { margin: '4px 0 10px' } }, 'تصاميمي') : null,
        slots.map((s) => slotCard(s.slot, s)),
        presets.length ? h('div.sec-title', { style: { margin: '12px 0 10px' } }, 'القوالب') : null,
        presets.length ? h('div.grid-2', presets.map(presetCard)) : null,
      ];
    },
    drafts() {
      const scope = actions.scope();
      const current = store.getDraft(scope);
      const snaps = store.snapshots();
      const card = (d, { onContinue, onDelete, label, time }) => h('div.card', { style: { cursor: 'default', marginBottom: '10px' } },
        thumb(d, S.displayId, { w: 298, h: 100, zoom: 1.4, fluid: true }),
        h('div.meta', h('div', h('div.name', label), h('div.sub', ago(time)))),
        h('div', { style: { display: 'flex', gap: '6px', padding: '6px 4px 2px' } },
          h('button.btn.sm', { onClick: onContinue }, 'متابعة'),
          h('button.btn.sm.ghost', { onClick: onDelete }, ic('trash', 'sm'), 'حذف')));
      const out = [
        h('button.btn.block', { style: { marginBottom: '16px' }, onClick: () => { store.addSnapshot({ id: `s${Date.now()}`, design: clone(S.design), at: Date.now(), label: `نسخة ${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}` }); toast('تم حفظ نسخة كمسودة'); renderDrawer(); } }, ic('plus', 'sm'), 'حفظ نسخة من الحالي'),
      ];
      out.push(h('div.sec-title', { style: { margin: '0 0 10px' } }, 'الحفظ التلقائي'));
      out.push(current ? card(current.design, {
        label: 'آخر تعديلات غير محفوظة',
        time: current.at,
        onContinue: () => actions.loadDesign(current.design),
        onDelete: () => { store.removeDraft(scope); renderDrawer(); },
      }) : h('div.empty', 'لا توجد مسودة تلقائية. كل تعديل يُحفظ هنا تلقائياً حتى تضغط حفظ.'));
      if (snaps.length) {
        out.push(h('div.sec-title', { style: { margin: '10px 0 10px' } }, 'نسخ محفوظة'));
        snaps.forEach((s) => out.push(card(s.design, {
          label: s.label, time: s.at,
          onContinue: () => actions.loadDesign(s.design),
          onDelete: () => { store.removeSnapshot(s.id); renderDrawer(); },
        })));
      }
      return out;
    },
  };

  function renderDrawer() {
    const id = S.ui.nav;
    drawer.classList.toggle('collapsed', !id);
    if (!id || !builders[id]) { actions.layoutChanged(); return; }
    drawerTitle.textContent = T.nav[id];
    drawerDesc.textContent = T.navDesc[id];
    const scroll = drawerBody.scrollTop;
    clear(drawerBody);
    [builders[id]()].flat(Infinity).forEach((c) => c && drawerBody.appendChild(c));
    drawerBody.scrollTop = scroll;
    actions.layoutChanged();
  }

  on((kind, info) => {
    if (S.view !== 'editor') return;
    if (kind === 'ui' && ('nav' in info || 'level' in info)) { renderItems(); renderDrawer(); }
    if (kind === 'session' || kind === 'presets' || kind === 'view') { renderItems(); renderDrawer(); }
    if (kind === 'design' && info.history !== undefined && S.ui.nav === 'home') renderDrawer();
    if (kind === 'saved') renderDrawer();
  });

  return {
    nav, drawer,
    render() { renderItems(); renderDrawer(); },
    renderDrawer,
    presetsReload: renderDrawer,
    request,
  };
}
