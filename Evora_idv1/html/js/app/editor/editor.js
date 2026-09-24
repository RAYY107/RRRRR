// Evora ID — editor shell
// Wires navigation, inspector, gizmo, timeline and the save flows. All
// editing is local; only an explicit save sends the design to the server.

import { h, ic, clear, ltr, num, tooltip } from '../dom.js';
import { S, on, emit, setDesign, setUI, undo, redo, commit, loadDesign, dirty, isAdvanced } from '../store.js';
import { T, dur, errText, ago } from '../i18n.js';
import { post, request } from '../nui.js';
import { toast, menu, dialog, confirm, closePopover, popoverOpen, closeTopModal } from '../ui.js';
import { freshDesign, complete } from '../schema.js';
import { createNav, statusBadges } from './nav.js';
import { createInspector } from './inspector.js';
import { createGizmo } from './gizmo.js';
import { createTimeline } from './timeline.js';
import { randomDesign } from '../randomizer.js';
import { resetImageStatus } from './panels/image.js';
import * as store from '../storage.js';
import { clone, debounce, throttle, deepEqual } from '../../core/util.js';
import { designHashJs } from './hash.js';

const TEXT_STYLE_KEYS = ['font', 'weight', 'italic', 'size', 'tracking', 'lineHeight', 'opacity', 'numerals', 'fill', 'fillScope', 'outline', 'shadow', 'glow'];
const IMAGE_STYLE_KEYS = ['w', 'h', 'fit', 'opacity', 'radius', 'tint', 'border', 'glow', 'shadow', 'order', 'autoWidth', 'pad', 'attach', 'gap'];

export function createEditor(app) {
  const root = h('div.editor');
  let startDesign = null;     // design loaded when the editor opened (for revert)

  // ------------------------------------------------------------ helpers
  const scope = () => {
    if (!S.target) return 'self';
    if (S.target.type === 'player') return `player:${S.target.owner}`;
    return `preset:${S.target.id || 'new'}`;
  };
  const sendPreview = throttle(() => {
    if (S.view !== 'editor') return;
    const before = S.ui.compare === 'before';
    post('preview', { design: before ? S.baseline : S.design, displayId: S.displayId });
  }, 45);
  const autosave = debounce(() => {
    if (S.view !== 'editor' || !S.design) return;
    if (!deepEqual(S.design, S.baseline) && !deepEqual(S.design, startDesign)) {
      store.setDraft(scope(), { design: clone(S.design), at: Date.now() });
      draftNote.textContent = `حُفظت المسودة ${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      store.removeDraft(scope());
    }
  }, 700);

  const layoutChanged = debounce(() => {
    if (S.view !== 'editor') return;
    const r = center.getBoundingClientRect();
    if (!r.width) return;
    post('layout', { cx: (r.left + r.width / 2) / innerWidth, cy: 0.5 });
  }, 60);

  // ------------------------------------------------------------ actions
  const actions = {
    scope,
    isDirty: () => dirty(),
    layoutChanged,
    applyPreset(p) {
      const d = complete(clone(p.design));
      d.meta = { preset: p.id, name: p.name };
      loadDesign(d);
      S.ui.compare = 'after';
      store.pushRecent({ kind: 'preset', ref: p.id, name: p.name, design: clone(p.design), at: Date.now() });
      emit('ui', { compare: 'after' });
    },
    loadDesign(d, name) {
      loadDesign(complete(clone(d)));
      if (name) toast(`تم تحميل ${name}`);
    },
    revert() {
      loadDesign(complete(clone(startDesign)));
      toast('تمت استعادة التصميم كما كان');
    },
    startFromDefault() {
      loadDesign(complete(clone(S.session?.defaultDesign || freshDesign())));
    },
    randomize: () => randomStart(),
    async toggleFavorite(kind, ref) {
      const res = await request('favorite.toggle', { kind, ref });
      if (!res.ok) return toast(errText(res.error), 'err');
      S.session.favorites = res.data.favorites;
      emit('session');
      toast(res.data.active ? 'أضيف إلى المفضلة' : 'أزيل من المفضلة');
    },
    saveSlot(slot, currentName) {
      const input = h('input.input', { value: currentName || `التصميم ${slot}`, maxlength: '32' });
      dialog({
        title: `حفظ في التصميم ${slot}`,
        desc: 'يُحفظ التصميم في خانتك دون تطبيقه ودون بدء فترة الانتظار.',
        body: input,
        actions: [
          { label: 'حفظ', primary: true, onClick: async () => {
            const res = await request('slot.save', { slot, name: input.value, design: JSON.stringify(S.design) });
            if (!res.ok) { toast(errText(res.error), 'err'); return false; }
            S.session.slots = res.data.slots;
            emit('session');
            toast('تم حفظ التصميم في خانتك');
            return true;
          } },
          { label: 'إلغاء', ghost: true },
        ],
      });
      setTimeout(() => input.select(), 30);
    },
    async deleteSlot(slot) {
      if (!(await confirm('حذف التصميم المحفوظ؟', 'سيتم حذف هذه الخانة نهائياً.', 'حذف', { danger: true }))) return;
      const res = await request('slot.delete', { slot });
      if (!res.ok) return toast(errText(res.error), 'err');
      S.session.slots = res.data.slots;
      emit('session');
    },
  };

  // ------------------------------------------------------------ layout
  const nav = createNav(actions);
  const center = h('main.center');
  const toolbar = h('div.toolbar.glass');
  const banner = h('div.banner.glass.hidden');
  const contextBar = h('div.context-bar.glass.hidden');
  const draftNote = h('span');
  const statusbar = h('div.statusbar.glass',
    h('span.dot'),
    h('span', 'معاينة حية على شخصيتك'),
    h('span.sep'),
    h('span', h('bdi.en', 'Server ID'), ' ', h('b', { id: 'sbId' })),
    h('span.sep'),
    h('span.muted', 'اسحب حول الشخصية لتدويرها · العجلة للتقريب'),
    h('span.sep'),
    draftNote);
  const timeline = createTimeline();
  center.append(toolbar, banner, contextBar, statusbar, timeline.el);

  const inspHead = h('div.insp-head');
  const inspFoot = h('div.insp-foot');
  const inspector = createInspector({ head: inspHead, foot: inspFoot });
  const gizmo = createGizmo();
  root.append(nav.nav, nav.drawer, center, inspector.el, gizmo.el);

  // ------------------------------------------------------------ toolbar
  function tb(iconName, tip, onClick, { id, text } = {}) {
    const b = h('button.tb-btn', { type: 'button', id: id || null, onClick }, ic(iconName), text ? h('span', text) : null);
    tooltip(b, tip);
    return b;
  }

  function renderToolbar() {
    clear(toolbar);
    const compareSeg = h('div.seg.sm', { style: { width: '120px' } },
      h('button', { type: 'button', class: S.ui.compare === 'before' ? 'on' : '', onClick: () => setUI({ compare: 'before' }) }, 'قبل'),
      h('button', { type: 'button', class: S.ui.compare === 'after' ? 'on' : '', onClick: () => setUI({ compare: 'after' }) }, 'بعد'));
    tooltip(compareSeg, 'قارن بين التصميم المطبّق حالياً والتعديلات');
    const undoB = tb('undo', 'تراجع  Ctrl+Z', () => undo());
    const redoB = tb('redo', 'إعادة  Ctrl+Y', () => redo());
    undoB.disabled = !S.undo.length;
    redoB.disabled = !S.redo.length;
    const styleB = tb('copy', 'نسخ ولصق التنسيق', () => styleMenu(styleB), { text: 'التنسيق' });
    const snapB = tb('magnet', 'الالتقاط', () => setUI({ snap: !S.ui.snap }));
    snapB.classList.toggle('on', S.ui.snap);
    const guideB = tb('guides', 'خطوط الأدلة', () => setUI({ guides: !S.ui.guides }));
    guideB.classList.toggle('on', S.ui.guides);
    toolbar.append(
      undoB, redoB,
      h('span.tb-sep'),
      tb('shuffle', 'توليد تصميم متناسق', () => randomStart(), { text: 'توليد' }),
      styleB,
      h('span.tb-sep'),
      compareSeg,
      h('span.tb-sep'),
      snapB, guideB,
      h('span.tb-sep'),
      tb('zoomIn', 'تقريب', () => post('camera', { zoom: -0.2 })),
      tb('zoomOut', 'تبعيد', () => post('camera', { zoom: 0.2 })),
      tb('rotR', 'تدوير الشخصية', () => post('camera', { rotate: -20 })),
      tb('rotL', 'تدوير الشخصية', () => post('camera', { rotate: 20 })),
      tb('focus', 'إعادة ضبط الكاميرا', () => post('camera', { reset: true })),
      h('span.tb-sep'),
      tb('close', 'إغلاق  Esc', () => app.close()));
  }

  function styleMenu(anchor) {
    const clip = store.clipboard();
    const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, clone(obj[k])]));
    menu(anchor, [
      { head: 'نسخ' },
      { label: 'نسخ تنسيق الرقم', icon: 'text', onClick: () => { store.setClipboard({ kind: 'text', data: pick(S.design.text, TEXT_STYLE_KEYS) }); toast('تم نسخ تنسيق الرقم'); } },
      { label: 'نسخ تنسيق الصورة', icon: 'image', disabled: !S.design.image.on, onClick: () => { store.setClipboard({ kind: 'image', data: pick(S.design.image, IMAGE_STYLE_KEYS) }); toast('تم نسخ تنسيق الصورة'); } },
      { label: 'نسخ التصميم كاملاً', icon: 'copy', onClick: () => { store.setClipboard({ kind: 'design', data: clone(S.design) }); toast('تم نسخ التصميم كاملاً'); } },
      { sep: true },
      { head: 'لصق' },
      { label: 'لصق تنسيق الرقم', icon: 'paste', disabled: clip?.kind !== 'text', onClick: () => setDesign((d) => Object.assign(d.text, clone(clip.data)), { structure: true }) },
      { label: 'لصق تنسيق الصورة', icon: 'paste', disabled: clip?.kind !== 'image' || !S.design.image.on, onClick: () => setDesign((d) => Object.assign(d.image, clone(clip.data)), { structure: true }) },
      { label: 'لصق التصميم كاملاً', icon: 'paste', disabled: clip?.kind !== 'design', onClick: () => loadDesign(complete(clone(clip.data))) },
    ]);
  }

  // ------------------------------------------------------------ randomize
  function randomStart() {
    if (!S.ui.random) S.ui.random = { prev: clone(S.design) };
    setDesign((d) => {
      const r = randomDesign();
      Object.keys(d).forEach((k) => delete d[k]);
      Object.assign(d, r);
    }, { commit: false, structure: true });
    S.ui.compare = 'after';
    renderBanner();
  }

  function randomEnd(apply) {
    const prev = S.ui.random?.prev;
    S.ui.random = null;
    if (apply) commit();
    else if (prev) { S.design = clone(prev); emit('design', { structure: true }); }
    renderBanner();
  }

  // ------------------------------------------------------------ banners
  let draftOffer = null;
  function renderBanner() {
    clear(banner);
    if (S.ui.random) {
      banner.append(ic('shuffle', 'sm'), h('span', 'تصميم مولّد تلقائياً — يمكنك تطبيقه ثم تعديله.'),
        h('button.btn.sm', { onClick: () => randomStart() }, 'توليد آخر'),
        h('button.btn.sm.primary', { onClick: () => randomEnd(true) }, 'تطبيق'),
        h('button.btn.sm.ghost', { onClick: () => randomEnd(false) }, 'تجاهل'));
      banner.classList.remove('hidden');
    } else if (draftOffer) {
      banner.append(ic('drafts', 'sm'), h('span', `لديك مسودة غير محفوظة ${ago(draftOffer.at)}`),
        h('button.btn.sm.primary', { onClick: () => { const d = draftOffer.design; draftOffer = null; renderBanner(); loadDesign(complete(clone(d))); } }, 'متابعة المسودة'),
        h('button.btn.sm.ghost', { onClick: () => { store.removeDraft(scope()); draftOffer = null; renderBanner(); } }, 'تجاهل'));
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
    contextBar.style.top = banner.classList.contains('hidden') ? '70px' : '118px';
  }

  function renderContext() {
    clear(contextBar);
    if (!S.target) { contextBar.classList.add('hidden'); return; }
    contextBar.classList.remove('hidden');
    if (S.target.type === 'player') {
      contextBar.append(ic('user', 'sm'), h('span', 'تعديل تصميم ', h('b', S.target.name || S.target.owner), S.target.serverId ? h('span', ' · ', num(`#${S.target.serverId}`)) : h('span.muted', ' · غير متصل')));
    } else {
      contextBar.append(ic('presets', 'sm'), h('span', S.target.id ? 'تعديل قالب ' : 'قالب جديد', S.target.name ? h('b', ltr(S.target.name)) : null));
    }
    contextBar.append(h('button.btn.sm', { onClick: () => app.backToManager() }, ic('chevronR', 'sm'), 'رجوع للإدارة'));
  }

  // ------------------------------------------------------------ inspector head / foot
  function renderHead() {
    clear(inspHead);
    let title = 'تصميم رقمك';
    let sum = S.session?.record;
    if (S.target?.type === 'player') { title = 'تصميم اللاعب'; sum = S.target.summary; }
    if (S.target?.type === 'preset') { title = S.target.id ? 'تحرير قالب' : 'قالب جديد'; sum = null; }
    inspHead.append(
      h('div.grow', h('div.t', title), h('div.s', sum ? statusBadges(sum, { draft: dirty() }) : h('span', 'أنشئ تصميماً كاملاً ثم احفظه كقالب'))),
      h('div.num', { style: { fontSize: '20px', color: 'var(--text-2)' } }, `#${S.displayId}`));
  }

  function renderFoot() {
    clear(inspFoot);
    const isDirty = dirty();
    if (S.target?.type === 'player') {
      inspFoot.append(
        h('button.btn.primary.block', { disabled: !isDirty || null, onClick: savePlayer }, ic('save', 'sm'), 'حفظ للاعب'),
        h('div.foot-note', isDirty ? 'التعديلات لا تُطبّق على اللاعب قبل الحفظ.' : 'لا توجد تعديلات.'));
      return;
    }
    if (S.target?.type === 'preset') {
      inspFoot.append(
        h('button.btn.primary.block', { onClick: savePreset }, ic('save', 'sm'), S.target.id ? 'حفظ القالب' : 'إنشاء القالب'),
        h('div.foot-note', 'يصبح القالب متاحاً لجميع اللاعبين حسب إعداداته.'));
      return;
    }
    const rec = S.session?.record || {};
    const applies = rec.cooldownApplies !== false && (S.session?.limits?.cooldownSeconds || 0) > 0;
    const waiting = applies && rec.cooldown > 0;
    const locked = rec.locked && !S.session?.perms?.manage;
    let note = 'التعديلات محلية حتى تضغط حفظ.';
    if (locked) note = 'تصميمك مقفل من الإدارة.';
    else if (waiting) note = `يمكنك الحفظ بعد ${dur(rec.cooldown)}`;
    else if (applies && isDirty) note = `بعد الحفظ تبدأ فترة انتظار ${dur(S.session.limits.cooldownSeconds)}.`;
    else if (!isDirty) note = 'لا توجد تعديلات غير محفوظة.';
    const saveBtn = h('button.btn.primary', { style: { flex: '1' }, disabled: !isDirty || waiting || locked || null, onClick: saveSelf }, ic('save', 'sm'), 'حفظ التصميم');
    const slotBtn = h('button.btn.icon', { title: 'حفظ في خانة', onClick: () => {
      const count = S.session?.limits?.slots || 3;
      menu(slotBtn, Array.from({ length: count }, (_, i) => {
        const s = (S.session.slots || []).find((x) => x.slot === i + 1);
        return { label: s ? `${s.name}` : `التصميم ${i + 1} (فارغ)`, icon: 'designs', onClick: () => actions.saveSlot(i + 1, s?.name) };
      }));
    } }, ic('designs', 'sm'));
    tooltip(slotBtn, 'حفظ في خانة دون تطبيق');
    inspFoot.append(h('div.foot-row', saveBtn, slotBtn), h('div.foot-note', waiting ? ic('clock', 'sm') : null, note));
  }

  // ------------------------------------------------------------ saving
  async function saveSelf() {
    const lim = S.session?.limits || {};
    const applies = S.session?.record?.cooldownApplies !== false && lim.cooldownSeconds > 0;
    if (applies && !(await confirm('حفظ التصميم؟', `سيظهر التصميم لجميع اللاعبين فوراً، ولن تتمكن من تعديله مرة أخرى قبل ${dur(lim.cooldownSeconds)}.`, 'حفظ وتطبيق'))) return;
    const res = await request('editor.save', { design: JSON.stringify(S.design) });
    if (!res.ok) {
      const extra = res.extra && res.extra.remaining ? ` (${dur(res.extra.remaining)})` : '';
      return toast(errText(res.error) + extra, 'err');
    }
    S.session.record = res.data;
    S.baseline = clone(S.design);
    startDesign = clone(S.design);
    store.removeDraft(scope());
    store.pushRecent({ kind: 'design', hash: designHashJs(S.design), name: S.design.meta?.name || '', design: clone(S.design), at: Date.now() });
    toast('تم حفظ التصميم وتطبيقه');
    emit('saved');
    refreshChrome();
  }

  function durationPicker(state, settings) {
    const custom = h('input.input.ltr', { type: 'number', min: '1', max: '365', placeholder: 'أيام', style: { width: '90px' } });
    const chips = h('div.chips', (settings.durations || []).map((d) => {
      const b = h('button.chip', { type: 'button', class: state.seconds === d.seconds ? 'on' : '' }, d.label);
      b.addEventListener('click', () => { state.seconds = d.seconds; custom.value = ''; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); b.classList.add('on'); });
      return b;
    }));
    custom.addEventListener('input', () => { const n = parseFloat(custom.value); if (n > 0) { state.seconds = Math.round(n * 86400); chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); } });
    return h('div', chips, h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' } }, h('span.muted', 'مدة مخصصة'), custom, h('span.muted', 'يوم')));
  }

  function savePlayer() {
    const settings = app.managerSettings();
    const cur = S.target.summary || {};
    const state = { mode: cur.mode === 'temporary' && cur.status === 'temporary' ? 'keep' : 'permanent', seconds: settings.defaultSeconds, lock: !!cur.locked };
    const durBox = h('div', { style: { marginTop: '12px' } });
    const renderDur = () => { clear(durBox); if (state.mode === 'temporary') durBox.appendChild(durationPicker(state, settings)); };
    const modeSeg = h('div.seg', [['keep', 'بدون تغيير'], ['permanent', 'دائم'], ['temporary', 'مؤقت']].map(([v, l]) => {
      const b = h('button', { type: 'button', class: state.mode === v ? 'on' : '' }, l);
      b.addEventListener('click', () => { state.mode = v; modeSeg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); renderDur(); });
      return b;
    }));
    const lockIn = h('input', { type: 'checkbox' });
    lockIn.checked = state.lock;
    lockIn.addEventListener('change', () => { state.lock = lockIn.checked; });
    renderDur();
    dialog({
      title: 'حفظ تصميم اللاعب',
      desc: `سيظهر التصميم فوق رقم ${S.target.name || S.target.owner} لجميع اللاعبين.`,
      body: h('div', h('div.sec-title', { style: { marginBottom: '8px' } }, 'الصلاحية'), modeSeg, durBox,
        h('div.toggle-row', { style: { marginTop: '16px' } }, h('label', 'قفل التصميم (يمنع اللاعب من تعديله)'), h('span.toggle', lockIn, h('span')))),
      actions: [
        { label: 'حفظ', primary: true, onClick: async () => {
          const payload = { owner: S.target.owner, design: JSON.stringify(S.design), lock: state.lock };
          if (state.mode === 'permanent') payload.mode = 'permanent';
          if (state.mode === 'temporary') { payload.mode = 'temporary'; payload.seconds = state.seconds; }
          const res = await request('manager.save', payload);
          if (!res.ok) { toast(errText(res.error), 'err'); return false; }
          S.target.summary = res.data;
          S.baseline = clone(S.design);
          startDesign = clone(S.design);
          store.removeDraft(scope());
          toast('تم حفظ تصميم اللاعب');
          refreshChrome();
          return true;
        } },
        { label: 'إلغاء', ghost: true },
      ],
    });
  }

  function savePreset() {
    const t = S.target;
    const name = h('input.input.ltr', { value: t.name || '', maxlength: '48', placeholder: 'Preset name' });
    const desc = h('textarea.input', { maxlength: '160', placeholder: 'وصف قصير للقالب' });
    desc.value = t.description || '';
    const cats = S.boot.categories;
    let cat = t.category || 'custom';
    const catSeg = h('div.chips', cats.map((c) => {
      const b = h('button.chip', { type: 'button', class: c.id === cat ? 'on' : '' }, c.label);
      b.addEventListener('click', () => { cat = c.id; catSeg.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); b.classList.add('on'); });
      return b;
    }));
    const flag = (label, key) => {
      const i = h('input', { type: 'checkbox' });
      i.checked = !!t[key];
      i.addEventListener('change', () => { t[key] = i.checked; });
      return h('div.toggle-row', h('label', label), h('span.toggle', i, h('span')));
    };
    dialog({
      title: t.id ? 'حفظ القالب' : 'إنشاء قالب',
      body: h('div',
        h('div.field.stack', h('label', 'الاسم'), name),
        h('div.field.stack', h('label', 'الوصف'), desc),
        h('div.field.stack', h('label', 'الفئة'), catSeg),
        flag('مميز', 'featured'), flag('مقفل (للإدارة فقط)', 'locked'), flag('مخفي عن اللاعبين', 'hidden')),
      actions: [
        { label: 'حفظ', primary: true, onClick: async () => {
          const payload = { name: name.value, description: desc.value, category: cat, design: JSON.stringify(S.design), featured: !!t.featured, locked: !!t.locked, hidden: !!t.hidden };
          const res = t.id && !t.builtin
            ? await request('preset.update', { id: t.id, ...payload })
            : await request('preset.create', payload);
          if (!res.ok) { toast(errText(res.error), 'err'); return false; }
          app.presetsUpdated(res.data);
          store.removeDraft(scope());
          toast('تم حفظ القالب');
          S.baseline = clone(S.design);
          app.backToManager('presets');
          return true;
        } },
        { label: 'إلغاء', ghost: true },
      ],
    });
  }

  // ------------------------------------------------------------ refresh
  function refreshChrome() {
    renderToolbar();
    renderHead();
    renderFoot();
    const sb = root.querySelector('#sbId');
    if (sb) sb.textContent = String(S.displayId);
  }

  const cooldownTimer = setInterval(() => {
    const rec = S.session?.record;
    if (S.view === 'editor' && rec && rec.cooldown > 0) {
      rec.cooldown = Math.max(0, rec.cooldown - 30);
      renderFoot();
    }
  }, 30000);

  on((kind, info) => {
    if (S.view !== 'editor') return;
    if (kind === 'design') {
      if (S.ui.compare === 'before' && !info.history) { S.ui.compare = 'after'; }
      // a committed edit on top of a generated design keeps it (undo returns to before)
      if (S.ui.random && !info.live && deepEqual(S.committed, S.design)) { S.ui.random = null; renderBanner(); }
      sendPreview();
      if (!info.live) { autosave(); refreshChrome(); }
    }
    if (kind === 'history') { autosave(); refreshChrome(); if (S.ui.random) { S.ui.random = null; renderBanner(); } }
    if (kind === 'ui') {
      if ('compare' in info) { sendPreview(); renderToolbar(); }
      if ('snap' in info || 'guides' in info) renderToolbar();
      if ('nav' in info) layoutChanged();
    }
    if (kind === 'session' || kind === 'saved') { renderHead(); renderFoot(); }
  });

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (S.view !== 'editor') return;
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
    if (e.key === 'Escape') {
      if (popoverOpen()) return closePopover();
      if (closeTopModal()) return;
      if (S.ui.random) return randomEnd(false);
      return app.close();
    }
    if (typing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (!S.target) saveSelf(); }
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      gizmo.nudge(dx, dy);
    }
  });
  window.addEventListener('resize', layoutChanged);

  // ------------------------------------------------------------ open
  return {
    el: root,
    /**
     * open({ design, baseline, target })
     *   design    starting draft
     *   baseline  what is currently live (null = default look)
     */
    open({ design, baseline, target = null }) {
      S.view = 'editor';
      S.target = target;
      S.baseline = baseline ? complete(clone(baseline)) : null;
      startDesign = complete(clone(design));
      S.ui.random = null;
      S.ui.compare = 'after';
      S.ui.selection = 'stage';
      S.ui.timeline = false;
      resetImageStatus();
      loadDesign(startDesign, { resetHistory: true });
      const d = store.getDraft(scope());
      draftOffer = d && !deepEqual(complete(clone(d.design)), startDesign) ? d : null;
      draftNote.textContent = '';
      if (!S.ui.nav) S.ui.nav = target ? 'home' : 'presets';
      nav.render();
      inspector.mount();
      renderBanner();
      renderContext();
      refreshChrome();
      gizmo.show(true);
      timeline.render(true);
      emit('view');
      post('stage', { active: true });
      layoutChanged();
      sendPreview();
    },
    hide() {
      gizmo.show(false);
      autosave.flush();
    },
    destroy() { clearInterval(cooldownTimer); },
    isAdvanced,
  };
}
