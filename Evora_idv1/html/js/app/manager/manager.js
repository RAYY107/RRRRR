// Evora ID — management interface (evora.idname.manage)

import { h, ic, clear, ltr, num, tooltip } from '../dom.js';
import { S, on, emit } from '../store.js';
import { T, dur, errText, ago } from '../i18n.js';
import { request } from '../nui.js';
import { toast, dialog, confirm } from '../ui.js';
import { thumb } from '../thumbs.js';
import { statusBadges } from '../editor/nav.js';
import { freshDesign, complete } from '../schema.js';
import { clone, debounce } from '../../core/util.js';

const PAGES = [
  { id: 'players', icon: 'users', title: 'اللاعبون', desc: 'اللاعبون المتصلون الآن وحالة تصميم كل منهم.' },
  { id: 'designs', icon: 'designs', title: 'كل التصاميم', desc: 'جميع التصاميم المحفوظة، للاعبين المتصلين وغير المتصلين.', filter: 'all' },
  { id: 'temporary', icon: 'hourglass', title: 'المؤقتة', desc: 'تصاميم لها تاريخ انتهاء.', filter: 'temporary' },
  { id: 'permanent', icon: 'infinity', title: 'الدائمة', desc: 'تصاميم بلا تاريخ انتهاء.', filter: 'permanent' },
  { id: 'expired', icon: 'clock', title: 'المنتهية', desc: 'تصاميم مؤقتة انتهت صلاحيتها ولم تعد تظهر. يمكن تمديدها أو تحويلها لدائمة.', filter: 'expired' },
  { id: 'presets', icon: 'presets', title: 'القوالب', desc: 'القوالب الرسمية المتاحة للاعبين. أنشئ، عدّل، رتّب، ميّز أو اقفل.' },
  { id: 'audit', icon: 'audit', title: 'السجل', desc: 'آخر الإجراءات الإدارية. تُرسل أيضاً إلى الويب هوك إن كان مفعّلاً.' },
  { id: 'settings', icon: 'settings', title: 'الإعدادات', desc: 'ملخص الإعدادات الحالية. التعديل من config/config.lua.' },
];

const PLAYER_FILTERS = [
  ['all', 'الكل'], ['permanent', 'دائم'], ['temporary', 'مؤقت'], ['expired', 'منتهي'], ['none', 'بدون تصميم'], ['cooldown', 'انتظار'], ['locked', 'مقفل'],
];

export function createManager(app) {
  const st = { page: 'players', search: '', filter: 'all', rows: [], total: 0, pageNo: 1, pageSize: 40, selected: null, detail: null, loading: false };

  const navItems = h('div');
  const nav = h('nav.nav.glass',
    h('div.brand', h('div.brand-mark', 'E'), h('div', h('div.brand-name', ltr('Evora ID')), h('div.brand-sub', 'الإدارة'))),
    h('div.nav-group', 'الإدارة'),
    navItems,
    h('div.nav-spacer'),
    h('div.nav-foot',
      h('button.btn.block', { onClick: () => app.close() }, ic('close', 'sm'), 'إغلاق'),
      h('div.credit', h('span', ltr('Evora')), h('span', ltr('Made by LR')))));
  const headTitle = h('div.t');
  const headDesc = h('div.d');
  const tools = h('div.mg-tools');
  const stats = h('div.stats');
  const list = h('div.mg-list');
  const detail = h('aside.mg-detail');
  const body = h('div.mg-body', list, detail);
  const root = h('div.manager', nav, h('div.mg-main', h('div.mg-head', h('div.grow', headTitle, headDesc), tools), h('div', { style: { display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0 } }, stats, body)));

  const page = () => PAGES.find((p) => p.id === st.page);

  // ------------------------------------------------------------ nav
  function renderNav() {
    clear(navItems);
    const s = S.session?.stats || {};
    const counts = { players: s.online, temporary: s.storedTemporary, permanent: s.storedPermanent, expired: s.storedExpired, presets: S.presets.length };
    for (const p of PAGES) {
      if (p.id === 'presets' || p.id === 'audit') navItems.appendChild(h('div.nav-group', p.id === 'presets' ? 'المحتوى' : 'النظام'));
      navItems.appendChild(h('button.nav-item', { type: 'button', class: st.page === p.id ? 'active' : '', onClick: () => go(p.id) },
        ic(p.icon), h('span', p.title), counts[p.id] != null ? h('span.count', String(counts[p.id])) : null));
    }
  }

  function renderStats() {
    clear(stats);
    const s = S.session?.stats || {};
    if (!['players', 'designs'].includes(st.page)) { stats.style.display = 'none'; return; }
    stats.style.display = '';
    const stat = (v, l) => h('div.stat', h('div.v', num(v ?? 0)), h('div.l', l));
    stats.append(stat(s.online, 'متصل الآن'), stat(s.storedPermanent, 'تصاميم دائمة'), stat(s.storedTemporary, 'تصاميم مؤقتة'), stat(s.storedExpired, 'منتهية'));
  }

  // ------------------------------------------------------------ header tools
  function renderTools() {
    clear(tools);
    const p = page();
    headTitle.textContent = p.title;
    headDesc.textContent = p.desc;
    if (['players', 'designs', 'temporary', 'permanent', 'expired'].includes(st.page)) {
      const search = h('input.input', { placeholder: st.page === 'players' ? 'ابحث برقم الهوية أو الاسم' : 'ابحث بالاسم أو الحساب', value: st.search, style: { width: '260px' } });
      search.addEventListener('input', debounce(() => { st.search = search.value; st.pageNo = 1; load(); }, 280));
      tools.append(h('div.search', search, ic('search', 'sm')));
      tools.append(h('button.btn.icon', { title: 'تحديث', onClick: () => load() }, ic('refresh', 'sm')));
    }
    if (st.page === 'presets') {
      tools.append(h('button.btn.primary', { onClick: () => app.openPresetEditor({ type: 'preset', category: 'custom' }, freshDesign()) }, ic('plus', 'sm'), 'قالب جديد'));
    }
  }

  function filterChips() {
    if (st.page !== 'players') return null;
    return h('div.chips', { style: { margin: '0 0 12px' } }, PLAYER_FILTERS.map(([v, l]) => h('button.chip', {
      type: 'button', class: st.filter === v ? 'on' : '', onClick: () => { st.filter = v; load(); },
    }, l)));
  }

  // ------------------------------------------------------------ data
  async function load() {
    st.loading = true;
    const p = page();
    let res;
    if (st.page === 'players') res = await request('manager.players', { filter: st.filter, search: st.search });
    else if (p.filter) res = await request('manager.designs', { filter: p.filter, search: st.search, page: st.pageNo });
    else if (st.page === 'audit') res = await request('manager.audit', { limit: 150 });
    else { st.loading = false; renderList(); return; }
    st.loading = false;
    if (!res.ok) { toast(errText(res.error), 'err'); return; }
    st.rows = res.data.rows || [];
    st.total = res.data.total ?? st.rows.length;
    st.pageSize = res.data.pageSize || st.pageSize;
    renderList();
  }

  // ------------------------------------------------------------ list
  function presetName(id) {
    const p = S.presets.find((x) => x.id === id);
    return p ? p.name : (id ? id : '');
  }

  function row(r) {
    const el = h('div.prow', { class: st.selected === r.owner ? 'sel' : '' },
      thumb(r.design || S.session?.defaultDesign, r.serverId || S.displayId, { w: 112, h: 56, zoom: 1.4 }),
      h('div.sid', r.serverId ? num(`#${r.serverId}`) : h('span.muted', { style: { fontSize: '11px' } }, 'غير متصل')),
      h('div', { style: { minWidth: 0 } }, h('div.pname', r.name || '—'), h('div.owner', r.owner)),
      h('div.badges', statusBadges(r)),
      h('div', { style: { fontSize: '11.5px', color: 'var(--text-3)', minWidth: 0 } },
        r.presetId ? h('div', ltr(presetName(r.presetId))) : h('div', r.design ? 'مخصص' : '—'),
        r.updatedAt ? h('div', { style: { fontSize: '10.5px', color: 'var(--text-4)', marginTop: '3px' } }, ago(r.updatedAt * 1000)) : null),
      h('div', { style: { textAlign: 'left' } }, h('button.btn.sm', { onClick: (e) => { e.stopPropagation(); openEditor(r); } }, 'تعديل')));
    el.addEventListener('click', () => select(r));
    return el;
  }

  function renderList() {
    clear(list);
    renderStats();
    if (['players', 'designs', 'temporary', 'permanent', 'expired'].includes(st.page)) {
      const chips = filterChips();
      if (chips) list.appendChild(chips);
      list.appendChild(h('div.table-head', h('span', 'التصميم'), h('span', 'الرقم'), h('span', 'اللاعب'), h('span', 'الحالة'), h('span', 'القالب'), h('span')));
      if (!st.rows.length) list.appendChild(h('div.empty', ic('search'), h('div', st.loading ? 'جارٍ التحميل…' : 'لا توجد نتائج.')));
      st.rows.forEach((r) => list.appendChild(row(r)));
      if (page().filter && st.total > st.pageSize) {
        const pages = Math.ceil(st.total / st.pageSize);
        list.appendChild(h('div.pager',
          h('button.btn.sm', { disabled: st.pageNo <= 1 || null, onClick: () => { st.pageNo--; load(); } }, ic('chevronR', 'sm')),
          h('span', 'صفحة ', num(st.pageNo), ' من ', num(pages)),
          h('button.btn.sm', { disabled: st.pageNo >= pages || null, onClick: () => { st.pageNo++; load(); } }, ic('chevronL', 'sm'))));
      }
    } else if (st.page === 'presets') renderPresets();
    else if (st.page === 'audit') renderAudit();
    else if (st.page === 'settings') renderSettings();
  }

  // ------------------------------------------------------------ detail
  async function select(r) {
    st.selected = r.owner;
    list.querySelectorAll('.prow').forEach((x) => x.classList.remove('sel'));
    body.classList.add('detail');
    clear(detail);
    detail.appendChild(h('div.empty', 'جارٍ التحميل…'));
    const res = await request('manager.get', { owner: r.owner });
    if (st.selected !== r.owner) return;
    if (!res.ok) {
      // players without any stored row yet can still receive a design
      if (res.error === 'target_not_found' && r.online) { st.detail = { owner: r.owner, name: r.name, serverId: r.serverId, online: true, design: null, summary: { status: 'none' } }; }
      else { clear(detail); detail.appendChild(h('div.empty', errText(res.error))); return; }
    } else st.detail = res.data;
    renderList();
    renderDetail();
  }

  function renderDetail() {
    const d = st.detail;
    clear(detail);
    if (!d) return;
    const sum = d.summary || {};
    const isOn = d.design != null;
    const modeState = { mode: sum.mode === 'temporary' ? 'temporary' : 'permanent', seconds: S.session.settings.defaultSeconds };
    const durBox = h('div', { style: { marginTop: '10px' } });
    const renderDur = () => { clear(durBox); if (modeState.mode === 'temporary') durBox.appendChild(durationChips(modeState)); };
    const modeSeg = h('div.seg', [['permanent', 'دائم'], ['temporary', 'مؤقت']].map(([v, l]) => {
      const b = h('button', { type: 'button', class: modeState.mode === v ? 'on' : '' }, l);
      b.addEventListener('click', () => { modeState.mode = v; modeSeg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); renderDur(); });
      return b;
    }));
    renderDur();
    const lockIn = h('input', { type: 'checkbox' });
    lockIn.checked = !!sum.locked;
    lockIn.addEventListener('change', () => act('manager.lock', { owner: d.owner, locked: lockIn.checked }, lockIn.checked ? 'تم قفل التصميم' : 'تم فتح التصميم'));

    detail.append(
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
        h('div', h('div', { style: { fontSize: '15px', fontWeight: 600 } }, d.name || '—'), h('div.owner', { style: { font: '10.5px var(--mono)', color: 'var(--text-4)', marginTop: '4px', direction: 'ltr', textAlign: 'right' } }, d.owner)),
        h('button.btn.icon.sm.ghost', { onClick: () => { body.classList.remove('detail'); st.selected = null; renderList(); } }, ic('close', 'sm'))),
      thumb(d.design || S.session?.defaultDesign, d.serverId || S.displayId, { w: 336, h: 150, zoom: 1.3, live: true, fluid: true }),
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '12px 0 4px' } },
        d.serverId ? h('span.badge.permanent', { style: { textDecoration: 'none' } }, 'متصل ', num(`#${d.serverId}`)) : h('span.badge.none', 'غير متصل'),
        statusBadges(sum)),
      h('div.sec',
        h('div.sec-head', h('div.sec-title', 'التصميم')),
        h('div.grid-2',
          h('button.btn', { onClick: () => openEditor(d) }, ic('palette', 'sm'), 'تعديل التصميم'),
          h('button.btn', { onClick: () => pickPreset(d, false) }, ic('presets', 'sm'), 'تطبيق قالب'),
          S.session.settings.allowForce ? h('button.btn', { onClick: () => pickPreset(d, true) }, ic('lock', 'sm'), 'فرض تصميم') : null,
          h('button.btn.danger', { disabled: !isOn || null, onClick: async () => {
            if (await confirm('حذف التصميم؟', `سيعود رقم ${d.name || d.owner} إلى الشكل الافتراضي.`, 'حذف', { danger: true })) act('manager.delete', { owner: d.owner }, 'تم حذف التصميم');
          } }, ic('trash', 'sm'), 'حذف التصميم'))),
      h('div.sec',
        h('div.sec-head', h('div.sec-title', 'الصلاحية')),
        sum.status === 'temporary' ? h('div.sec-hint', `ينتهي بعد ${dur(sum.expiresIn)}`) : sum.status === 'expired' ? h('div.sec-hint', 'انتهت صلاحية هذا التصميم ولم يعد يظهر.') : null,
        modeSeg, durBox,
        h('button.btn.block', { style: { marginTop: '12px' }, disabled: !isOn || null, onClick: () => {
          const payload = { owner: d.owner, mode: modeState.mode };
          if (modeState.mode === 'temporary') payload.seconds = modeState.seconds;
          act('manager.expiration', payload, 'تم تحديث الصلاحية');
        } }, 'تطبيق الصلاحية')),
      h('div.sec',
        h('div.sec-head', h('div.sec-title', 'القفل')),
        h('div.toggle-row', h('label', 'منع اللاعب من تعديل تصميمه'), h('span.toggle', lockIn, h('span')))),
      h('div.sec',
        h('div.sec-head', h('div.sec-title', 'فترة الانتظار')),
        h('div.kv', h('span', 'المتبقي'), h('span', sum.cooldown > 0 ? dur(sum.cooldown) : 'لا يوجد')),
        h('button.btn.block', { style: { marginTop: '10px' }, disabled: !(sum.cooldown > 0) || null, onClick: () => act('manager.cooldown', { owner: d.owner }, 'تمت إعادة ضبط فترة الانتظار') }, ic('refresh', 'sm'), 'إعادة ضبط فترة الانتظار')),
    );
  }

  function durationChips(state) {
    const settings = S.session.settings;
    const custom = h('input.input.ltr', { type: 'number', min: '1', max: '365', placeholder: 'أيام', style: { width: '80px', height: '28px' } });
    const chips = h('div.chips', (settings.durations || []).map((d) => {
      const b = h('button.chip', { type: 'button', class: state.seconds === d.seconds ? 'on' : '' }, d.label);
      b.addEventListener('click', () => { state.seconds = d.seconds; custom.value = ''; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); b.classList.add('on'); });
      return b;
    }));
    custom.addEventListener('input', () => { const n = parseFloat(custom.value); if (n > 0) { state.seconds = Math.round(n * 86400); chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); } });
    return h('div', chips, h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' } }, h('span.muted', 'مخصص'), custom, h('span.muted', 'يوم')));
  }

  async function act(action, payload, okText) {
    const res = await request(action, payload);
    if (!res.ok) return toast(errText(res.error), 'err');
    toast(okText);
    await refreshStats();
    await load();
    if (st.selected) {
      const r = st.rows.find((x) => x.owner === st.selected) || { owner: st.selected };
      await select(r);
    }
  }

  async function refreshStats() {
    const res = await request('manager.stats', { presetVersion: S.presetVersion });
    if (res.ok) {
      S.session.stats = res.data.stats;
      if (res.data.presets) { S.presets = res.data.presets; S.presetVersion = res.data.presetVersion; }
      renderNav();
    }
  }

  function pickPreset(d, force) {
    const state = { preset: null, mode: 'permanent', seconds: S.session.settings.defaultSeconds };
    const grid = h('div.grid-4', { style: { maxHeight: '340px', overflowY: 'auto', padding: '2px' } }, S.presets.map((p) => {
      const c = h('div.card', thumb(p.design, d.serverId || S.displayId, { w: 150, h: 75, zoom: 1.6, fluid: true }), h('div.meta', h('div.name', ltr(p.name))));
      c.addEventListener('click', () => { state.preset = p.id; grid.querySelectorAll('.card').forEach((x) => x.classList.remove('sel')); c.classList.add('sel'); });
      return c;
    }));
    const durBox = h('div', { style: { marginTop: '10px' } });
    const modeSeg = h('div.seg', { style: { width: '220px' } }, [['permanent', 'دائم'], ['temporary', 'مؤقت']].map(([v, l]) => {
      const b = h('button', { type: 'button', class: state.mode === v ? 'on' : '' }, l);
      b.addEventListener('click', () => { state.mode = v; modeSeg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); clear(durBox); if (v === 'temporary') durBox.appendChild(durationChips(state)); });
      return b;
    }));
    dialog({
      title: force ? 'فرض تصميم' : 'تطبيق قالب',
      desc: force ? 'يُطبّق القالب ويُقفل التصميم فلا يستطيع اللاعب تغييره حتى تفتحه الإدارة.' : `اختر قالباً كاملاً لتطبيقه على ${d.name || d.owner}.`,
      wide: true,
      body: h('div', grid, h('div', { style: { marginTop: '16px' } }, h('div.sec-title', { style: { marginBottom: '8px' } }, 'الصلاحية'), modeSeg, durBox)),
      actions: [
        { label: force ? 'فرض' : 'تطبيق', primary: true, onClick: async () => {
          if (!state.preset) { toast('اختر قالباً أولاً', 'err'); return false; }
          const payload = { owner: d.owner, presetId: state.preset, mode: state.mode };
          if (state.mode === 'temporary') payload.seconds = state.seconds;
          await act(force ? 'manager.force' : 'manager.applyPreset', payload, force ? 'تم فرض التصميم' : 'تم تطبيق القالب');
          return true;
        } },
        { label: 'إلغاء', ghost: true },
      ],
    });
  }

  async function openEditor(r) {
    let d = r;
    if (!r.summary) {
      const res = await request('manager.get', { owner: r.owner });
      if (res.ok) d = res.data;
      else d = { owner: r.owner, name: r.name, serverId: r.serverId, online: r.online, design: null, summary: { status: 'none' } };
    }
    app.openPlayerEditor({ type: 'player', owner: d.owner, name: d.name, serverId: d.serverId, online: d.online, summary: d.summary }, d.design);
  }

  // ------------------------------------------------------------ presets
  function renderPresets() {
    const grid = h('div.preset-admin');
    const flag = (p, key, icon, label) => {
      const b = h('button.btn.icon.sm', { class: p[key] ? 'primary' : '', title: label, onClick: () => presetAction('preset.update', { id: p.id, [key]: !p[key] }) }, ic(icon, 'sm'));
      tooltip(b, label);
      return b;
    };
    S.presets.forEach((p, i) => {
      grid.appendChild(h('div.card', { style: { cursor: 'default' } },
        thumb(p.design, S.displayId, { w: 240, h: 104, zoom: 1.5, fluid: true }),
        h('div.flags',
          p.builtin ? h('span.badge', 'مدمج') : h('span.badge.permanent', 'مخصص'),
          p.hidden ? h('span.badge.hidden', ic('eyeOff', 'sm')) : null),
        h('div.meta', h('div', { style: { minWidth: 0 } }, h('div.name', ltr(p.name)), h('div.sub', `${p.nameAr || ''} · ${(S.boot.categories.find((c) => c.id === p.category) || {}).label || p.category}`))),
        h('div.acts',
          p.builtin
            ? h('button.btn.sm', { onClick: () => presetAction('preset.duplicate', { id: p.id }) }, ic('copy', 'sm'), 'تكرار')
            : h('button.btn.sm', { onClick: () => app.openPresetEditor({ type: 'preset', id: p.id, name: p.name, description: p.description, category: p.category, featured: p.featured, locked: p.locked, hidden: p.hidden }, p.design) }, 'تعديل'),
          flag(p, 'featured', 'star', 'مميز'),
          flag(p, 'locked', 'lock', 'مقفل للإدارة'),
          flag(p, 'hidden', 'eyeOff', 'مخفي عن اللاعبين'),
          h('span', { style: { flex: 1 } }),
          h('button.btn.icon.sm.ghost', { title: 'تقديم', disabled: i === 0 || null, onClick: () => move(i, -1) }, ic('arrowUp', 'sm')),
          h('button.btn.icon.sm.ghost', { title: 'تأخير', disabled: i === S.presets.length - 1 || null, onClick: () => move(i, 1) }, ic('arrowDown', 'sm')),
          !p.builtin ? h('button.btn.icon.sm.ghost', { title: 'حذف', onClick: async () => {
            if (await confirm('حذف القالب؟', `سيتم حذف ${p.name} نهائياً. التصاميم المطبّقة منه لن تتأثر.`, 'حذف', { danger: true })) presetAction('preset.delete', { id: p.id });
          } }, ic('trash', 'sm')) : null)));
    });
    list.appendChild(grid);
  }

  async function presetAction(action, payload) {
    const res = await request(action, payload);
    if (!res.ok) return toast(errText(res.error), 'err');
    S.presets = res.data.presets;
    S.presetVersion = res.data.presetVersion;
    emit('presets');
    toast('تم تحديث القوالب');
    renderNav();
    renderList();
  }

  function move(i, delta) {
    const ids = S.presets.map((p) => p.id);
    const j = i + delta;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    presetAction('preset.reorder', { ids });
  }

  // ------------------------------------------------------------ audit / settings
  function renderAudit() {
    list.appendChild(h('div.audit-row.h', h('span', 'الوقت'), h('span', 'الإجراء'), h('span', 'المسؤول'), h('span', 'الهدف'), h('span', 'التفاصيل')));
    if (!st.rows.length) list.appendChild(h('div.empty', 'لا توجد سجلات بعد.'));
    for (const r of st.rows) {
      list.appendChild(h('div.audit-row',
        h('span.num', { style: { fontSize: '11px', color: 'var(--text-3)' } }, new Date(r.at * 1000).toLocaleString('en-GB')),
        h('span', T.audit[r.action] || r.action),
        h('span', r.actor_name || '—'),
        h('span', r.target_name || h('span.owner', { style: { font: '10.5px var(--mono)', color: 'var(--text-4)' } }, r.target || '—')),
        h('span', { style: { color: 'var(--text-3)' } }, r.detail || '')));
    }
  }

  function renderSettings() {
    const s = S.session.settings || {};
    const card = (title, rows) => h('div.settings-card', h('h4', title), rows.map(([k, v]) => h('div.kv', h('span', k), h('span', v))));
    list.appendChild(h('div.settings-grid',
      card('النظام', [['إطار العمل', ltr(s.framework || '—')], ['قاعدة البيانات', s.database ? 'متصلة' : 'غير متصلة'], ['سجل الويب هوك', s.webhook ? 'مفعّل' : 'غير مفعّل']]),
      card('التعديل الذاتي', [['فترة الانتظار', s.cooldownSeconds ? dur(s.cooldownSeconds) : 'معطلة'], ['المدراء معفون', s.managersExempt ? 'نعم' : 'لا'], ['خانات التصاميم', num(s.slots)]]),
      card('التصاميم المؤقتة', [['المدة الافتراضية', dur(s.defaultSeconds)], ['الحد الأقصى', dur(s.maxSeconds)], ['فرض التصاميم', s.allowForce ? 'مسموح' : 'معطل']]),
      card('الصور', [['الصور', s.images?.enabled ? 'مفعّلة' : 'معطلة'], ['الروابط', s.images?.allowUrl ? 'مسموحة' : 'معطلة'], ['ديسكورد', s.images?.allowDiscord ? 'مسموح' : 'معطل'], ['المتحركة GIF', s.images?.allowGif ? 'مسموحة' : 'معطلة'], ['الحجم الأقصى', ltr(`${Math.round((s.images?.maxBytes || 0) / 1048576)} MB`)]]),
      card('العرض', [['أقصى مسافة', ltr(`${s.maxDistance} m`)], ['طريقة الإظهار', { always: 'دائماً', hold: 'عند الضغط', toggle: 'تبديل' }[s.displayMode] || s.displayMode], ['القالب الافتراضي', ltr(s.defaultPreset || 'native')]]),
      card('الصلاحيات', [['تعديل ذاتي', ltr('evora.idname.self')], ['إدارة', ltr('evora.idname.manage')], ['تجاوز الانتظار', ltr('evora.idname.bypass')]])));
  }

  function go(id) {
    st.page = id;
    st.search = '';
    st.filter = 'all';
    st.pageNo = 1;
    st.rows = [];
    st.selected = null;
    body.classList.remove('detail');
    renderNav();
    renderTools();
    renderList();
    load();
  }

  on((kind) => {
    if (S.view !== 'manager') return;
    if (kind === 'presets' && st.page === 'presets') renderList();
  });

  return {
    el: root,
    open(pageId) {
      S.view = 'manager';
      go(pageId || st.page || 'players');
    },
  };
}
