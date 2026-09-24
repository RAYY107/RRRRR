// Evora ID — animation timeline (advanced mode)
// Visual control of the single effect: delay, duration, repeats, easing and
// (for the custom effect) keyframes. Simple mode never shows it.

import { h, ic, clear } from '../dom.js';
import { S, on, setDesign, setUI, commit, isAdvanced } from '../store.js';
import { panelCtx, slider, toggle, select, segmented } from '../controls.js';
import { effectType, defaultAt } from '../schema.js';
import { clamp, round, clone } from '../../core/util.js';
import { isLetterEffect } from '../../core/effects.js';

const EASE_LABELS = { linear: 'خطي', ease: 'افتراضي', 'ease-in': 'تسارع', 'ease-out': 'تباطؤ', 'ease-in-out': 'تسارع/تباطؤ', smooth: 'ناعم', sharp: 'حاد', back: 'ارتداد', steps: 'متقطع' };

export function createTimeline() {
  const el = h('div.timeline.glass.hidden');
  const main = h('div.tl-main');
  const side = h('div.tl-side');
  el.append(main, side);
  let ctx = panelCtx();
  let key = '';
  let raf = 0;
  let t0 = performance.now();
  let playhead = null;
  let geom = null;

  const shown = () => S.view === 'editor' && S.ui.timeline && isAdvanced() && S.design && S.design.effect.type !== 'none';

  const kfPath = (i) => `effect.keyframes.${i}`;

  function totals() {
    const fx = S.design.effect;
    const dur = fx.duration / (fx.speed || 1);
    const reps = fx.loop ? 2 : Math.max(1, fx.iterations);
    const total = Math.max(1, fx.delay + dur * Math.min(reps, 4));
    return { dur, reps, total };
  }

  function buildTrack() {
    const fx = S.design.effect;
    const { dur, reps, total } = totals();
    const track = h('div.tl-track');
    const width = main.clientWidth - 32 || 600;
    const pps = width / total;
    geom = { pps, dur, total };
    const ruler = h('div.tl-ruler');
    const step = total > 12 ? 2 : total > 5 ? 1 : 0.5;
    for (let t = 0; t <= total + 0.001; t += step) ruler.appendChild(h('span', { style: { left: `${t * pps}px` } }, `${round(t, 1)}s`));
    track.appendChild(ruler);

    const laneA = h('div.tl-lane.a');
    if (fx.delay > 0) laneA.appendChild(h('div.tl-delay', { style: { left: '0px', width: `${fx.delay * pps}px` } }));
    const bar = h('div.tl-bar', { style: { left: `${fx.delay * pps}px`, width: `${Math.max(12, dur * pps)}px` } },
      h('div.edge.l', { dataset: { edge: 'l' } }), h('span', `${round(dur, 2)}s`), h('div.edge.r', { dataset: { edge: 'r' } }));
    laneA.appendChild(bar);
    for (let i = 1; i < Math.min(reps, 4); i++) {
      laneA.appendChild(h('div.tl-ghost', { style: { left: `${(fx.delay + dur * i) * pps}px`, width: `${dur * pps}px` } }));
    }
    track.appendChild(laneA);

    bar.addEventListener('pointerdown', (e) => {
      const edge = e.target.dataset.edge;
      const x0 = e.clientX;
      const d0 = fx.delay, du0 = fx.duration;
      const move = (ev) => {
        const dt = (ev.clientX - x0) / pps;
        setDesign((d) => {
          if (edge === 'r') d.effect.duration = round(clamp((du0 / (d.effect.speed || 1) + dt) * (d.effect.speed || 1), 0.2, 20), 2);
          else if (edge === 'l') {
            const nd = clamp(d0 + dt, 0, 10);
            const end = d0 + du0 / (d.effect.speed || 1);
            d.effect.delay = round(nd, 2);
            d.effect.duration = round(clamp((end - nd) * (d.effect.speed || 1), 0.2, 20), 2);
          } else d.effect.delay = round(clamp(d0 + dt, 0, 10), 2);
        }, { commit: false });
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); commit(); render(true); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    const laneB = h('div.tl-lane.b');
    if (fx.type === 'keyframes') {
      fx.keyframes.forEach((k, i) => {
        const dia = h('div.tl-kf', { class: S.ui.kf === i ? 'on' : '', style: { left: `${(fx.delay + k.t * dur) * pps}px` }, title: `${Math.round(k.t * 100)}%` });
        dia.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          setUI({ kf: i });
          if (i === 0 || i === fx.keyframes.length - 1) return;
          const x0 = e.clientX, t0k = k.t;
          const move = (ev) => {
            const nt = clamp(t0k + (ev.clientX - x0) / pps / dur, 0.01, 0.99);
            setDesign((d) => { d.effect.keyframes[i].t = round(nt, 3); }, { commit: false });
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            setDesign((d) => { d.effect.keyframes.sort((a, b) => a.t - b.t); }, { commit: true });
            render(true);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
        laneB.appendChild(dia);
      });
    } else if (isLetterEffect(fx.type)) {
      const n = Math.min(8, String(S.displayId).length + (S.design.text.prefix?.length || 0) + (S.design.text.suffix?.length || 0));
      for (let i = 0; i < n; i++) {
        laneB.appendChild(h('div.tl-ghost', { style: { left: `${(fx.delay + i * fx.stagger) * pps}px`, width: `${dur * pps}px`, opacity: String(1 - i * 0.08) } }));
      }
    }
    track.appendChild(laneB);
    playhead = h('div.tl-playhead');
    track.appendChild(playhead);
    return track;
  }

  function buildSide() {
    clear(side);
    ctx = panelCtx();
    const fx = S.design.effect;
    if (fx.type === 'keyframes') {
      const i = clamp(S.ui.kf, 0, fx.keyframes.length - 1);
      const p = kfPath(i);
      side.append(
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          h('b', { style: { fontSize: '11.5px' } }, `الإطار ${i + 1} · ${Math.round(fx.keyframes[i].t * 100)}%`),
          h('button.btn.icon.sm.ghost', {
            title: 'حذف الإطار',
            disabled: fx.keyframes.length <= 2 || i === 0 || i === fx.keyframes.length - 1 || null,
            onClick: () => { setDesign((d) => { d.effect.keyframes.splice(i, 1); }, { structure: true }); setUI({ kf: Math.max(0, i - 1) }); },
          }, ic('trash', 'sm'))),
        slider(ctx, 'الشفافية', `${p}.opacity`, { mul: 100, unit: '%' }),
        slider(ctx, 'الحجم', `${p}.scale`, { mul: 100, unit: '%' }),
        slider(ctx, 'X', `${p}.x`),
        slider(ctx, 'Y', `${p}.y`),
        slider(ctx, 'الدوران', `${p}.rotate`, { unit: '°' }),
        slider(ctx, 'التوهج', `${p}.glow`, { mul: 100, unit: '%' }),
        slider(ctx, 'التمويه', `${p}.blur`),
      );
    } else {
      side.append(
        select(ctx, 'المنحنى', 'effect.easing', S.boot.easings.map((e) => ({ value: e, label: EASE_LABELS[e] || e }))),
        slider(ctx, 'السرعة', 'effect.speed', { unit: '×' }),
        toggle(ctx, 'تكرار مستمر', 'effect.loop'),
        !fx.loop ? slider(ctx, 'المرات', 'effect.iterations') : null,
        toggle(ctx, 'ذهاب وإياب', 'effect.pingpong'),
        segmented(ctx, 'الاتجاه', 'effect.direction', [{ value: 'normal', label: 'عادي' }, { value: 'reverse', label: 'معكوس' }], { small: true }),
        isLetterEffect(fx.type) ? slider(ctx, 'التتابع', 'effect.stagger', { unit: 's' }) : null,
      );
    }
  }

  function render(force = false) {
    const vis = shown();
    el.classList.toggle('hidden', !vis);
    if (!vis) { cancelAnimationFrame(raf); raf = 0; return; }
    const fx = S.design.effect;
    const k = JSON.stringify([fx.type, fx.delay, fx.duration, fx.speed, fx.loop, fx.iterations, fx.stagger, fx.keyframes.map((x) => x.t), S.ui.kf, fx.pingpong, fx.easing, fx.direction]);
    if (!force && k === key) { ctx.update(); return; }
    key = k;
    clear(main);
    const type = effectType(fx.type);
    main.append(
      h('div.tl-head',
        ic('timeline', 'sm'),
        h('span.t', `المخطط الزمني · ${type ? type.label : fx.type}`),
        h('span.grow'),
        fx.type === 'keyframes'
          ? h('button.btn.sm', { disabled: fx.keyframes.length >= S.boot.limits.Keyframes || null, onClick: addKeyframe }, ic('plus', 'sm'), 'إطار')
          : h('button.btn.sm', { onClick: toCustom }, 'تحويل إلى إطارات مخصصة'),
        h('button.btn.sm.ghost', { onClick: () => { t0 = performance.now(); setDesign(() => {}, { commit: false }); } }, ic('refresh', 'sm'), 'إعادة التشغيل'),
        h('button.btn.icon.sm.ghost', { title: 'إغلاق', onClick: () => setUI({ timeline: false }) }, ic('close', 'sm'))),
      buildTrack());
    buildSide();
    if (!raf) tick();
  }

  function addKeyframe() {
    setDesign((d) => {
      const kf = d.effect.keyframes;
      let gapAt = 0, gap = 0;
      for (let i = 0; i < kf.length - 1; i++) if (kf[i + 1].t - kf[i].t > gap) { gap = kf[i + 1].t - kf[i].t; gapAt = i; }
      const a = kf[gapAt], b = kf[gapAt + 1];
      const mid = {};
      for (const key of Object.keys(a)) mid[key] = round((a[key] + b[key]) / 2, 3);
      kf.splice(gapAt + 1, 0, mid);
      setUI({ kf: gapAt + 1 });
    }, { structure: true });
  }

  function toCustom() {
    setDesign((d) => {
      d.effect.type = 'keyframes';
      if (!d.effect.keyframes || d.effect.keyframes.length < 2) d.effect.keyframes = clone(defaultAt('effect.keyframes'));
    }, { structure: true });
    setUI({ kf: 0 });
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!geom || !playhead) return;
    const { total } = geom;
    const t = ((performance.now() - t0) / 1000) % total;
    playhead.style.left = `${t * geom.pps}px`;
  }

  on((kind, info) => {
    if (kind === 'design' || kind === 'view') render(!!info.structure);
    if (kind === 'ui' && ('timeline' in info || 'level' in info || 'kf' in info)) render(true);
  });
  window.addEventListener('resize', () => render(true));
  return { el, render };
}
