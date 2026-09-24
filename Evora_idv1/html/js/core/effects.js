// Evora ID — effect engine
// A design has exactly ONE effect. This module turns it into scoped CSS
// (keyframes + animation rules) for one rendered instance. Animations run
// on compositor-friendly properties wherever possible.

import { rgba, mix } from './color.js';
import { stopsCss } from './render.js';

const EASE = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  smooth: 'cubic-bezier(.45,.05,.25,1)',
  sharp: 'cubic-bezier(.7,0,.3,1)',
  back: 'cubic-bezier(.34,1.56,.64,1)',
  steps: 'steps(6, end)',
};

const OVERLAY = new Set(['shine-sweep', 'light-sweep', 'shimmer']);
const LETTER = new Set(['letter-wave', 'letter-bounce', 'letter-float', 'letter-flicker']);

export const effectNeedsOverlay = (type) => OVERLAY.has(type);
export const isLetterEffect = (type) => LETTER.has(type);

function timing(fx, extraDelay = 0) {
  const dur = Math.max(0.05, fx.duration / (fx.speed || 1));
  const iter = fx.loop ? 'infinite' : String(fx.iterations || 1);
  let dir = fx.direction === 'reverse' ? 'reverse' : 'normal';
  if (fx.pingpong) dir = fx.direction === 'reverse' ? 'alternate-reverse' : 'alternate';
  return { dur, delay: (fx.delay || 0) + extraDelay, iter, dir, ease: EASE[fx.easing] || 'ease-in-out' };
}

const anim = (name, t, ease) =>
  `${name} ${t.dur.toFixed(3)}s ${ease || t.ease} ${t.delay.toFixed(3)}s ${t.iter} ${t.dir} both`;

function targets(scope, fx) {
  const t = fx.target || 'all';
  if (t === 'text') return [`${scope} .ev-text > .ev-fx`];
  if (t === 'image') return [`${scope} .ev-image > .ev-fx`];
  return [`${scope} .ev-all`];
}

function kf(name, frames) {
  return `@keyframes ${name}{${Object.entries(frames).map(([k, v]) => `${k}{${v}}`).join('')}}`;
}

function glowColor(ctx, fx) {
  const n = ctx.nodes?.find((x) => x.glow && x.glow.on);
  if ((fx.target === 'text' || fx.target === 'all') && n) return n.glow.color;
  return fx.color || '#FFFFFF';
}

// Simple whole-target animations: frames applied to the target selectors.
function simple(scope, fx, name, frames, ease) {
  const t = timing(fx);
  return kf(name, frames) + targets(scope, fx).map((s) => `${s}{animation:${anim(name, t, ease)}}`).join('');
}

// Sweeping light band (text: per character, aligned on the whole line).
function sweep(scope, fx, ctx, { band, alpha, angle, pause, count = 1 }) {
  const t = timing(fx);
  const color = fx.color || '#FFFFFF';
  const a = Math.min(1, alpha);
  const bandImg = count > 1
    ? `linear-gradient(${angle}deg, transparent 0%, ${rgba(color, a * 0.6)} 18%, transparent 30%, transparent 55%, ${rgba(color, a)} 72%, transparent 88%)`
    : `linear-gradient(${angle}deg, transparent 0%, ${rgba(color, a * 0.35)} 35%, ${rgba(color, a)} 50%, ${rgba(color, a * 0.35)} 65%, transparent 100%)`;
  const end = pause ? `${Math.round((1 - pause) * 100)}%` : '100%';
  let css = '';
  if (fx.target !== 'image') {
    const lw = ctx.lineW;
    for (const c of ctx.chars) {
      const name = `${scope.slice(1)}-sw${c.pos}`;
      const from = -band - c.off;
      const to = lw + band * 0.2 - c.off;
      const frames = { '0%': `background-position:${from}px 0` };
      frames[end] = `background-position:${to}px 0`;
      if (pause) frames['100%'] = `background-position:${to}px 0`;
      css += kf(name, frames);
      css += `${scope} .ev-ch.c${c.pos} .ev-ch-x{background-image:${bandImg};background-size:${band}px 100%;animation:${anim(name, t)}}`;
    }
  }
  if (fx.target !== 'text' && ctx.imageW) {
    const name = `${scope.slice(1)}-swi`;
    const w = ctx.imageW;
    const frames = { '0%': `background-position:${-band}px 0` };
    frames[end] = `background-position:${w + band * 0.2}px 0`;
    if (pause) frames['100%'] = `background-position:${w + band * 0.2}px 0`;
    css += kf(name, frames);
    css += `${scope} .ev-img-x{background-image:${bandImg};background-size:${band}px 100%;animation:${anim(name, t)}}`;
  }
  return css;
}

function letters(scope, fx, ctx, name, frames) {
  const stagger = fx.stagger || 0;
  let css = kf(name, frames);
  let i = 0;
  for (const c of ctx.chars) {
    const node = ctx.nodes.find((n) => n.pos === c.pos);
    if (!node || !node.animate) continue;
    const t = timing(fx, stagger * i);
    css += `${scope} .ev-ch.c${c.pos} > .ev-ch-a{animation:${anim(name, t)}}`;
    i++;
  }
  return css;
}

function gradientFlow(scope, fx, ctx) {
  const t = timing(fx);
  const lw = Math.max(1, ctx.lineW);
  let css = '';
  for (const n of ctx.nodes) {
    const c = ctx.chars.find((m) => m.pos === n.pos);
    let stops;
    if (n.fill && n.fill.type !== 'solid' && n.fill.stops?.length) {
      const s = n.fill.stops;
      // mirrored so one tile loops seamlessly
      stops = [...s.map((x) => ({ ...x, p: x.p / 2 })), ...[...s].reverse().map((x) => ({ ...x, p: 50 + (100 - x.p) / 2 }))];
    } else {
      const base = n.fill?.color || '#FFFFFF';
      const hi = fx.color && fx.color !== base ? fx.color : mix(base, '#FFFFFF', 0.6);
      stops = [{ c: base, p: 0, a: 1 }, { c: hi, p: 25, a: 1 }, { c: base, p: 50, a: 1 }, { c: hi, p: 75, a: 1 }, { c: base, p: 100, a: 1 }];
    }
    const img = `linear-gradient(90deg, ${stopsCss(stops)})`;
    const name = `${scope.slice(1)}-gf${n.pos}`;
    const from = -c.off;
    const to = -c.off - lw * 2;
    css += kf(name, { from: `background-position:${from}px 0`, to: `background-position:${to}px 0` });
    css += `${scope} .ev-ch.c${n.pos} .ev-ch-f{background-image:${img}!important;background-size:${lw * 2}px 100%!important;background-repeat:repeat-x!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;animation:${anim(name, t, 'linear')}}`;
  }
  return css;
}

function custom(scope, fx, ctx) {
  const name = `${scope.slice(1)}-kf`;
  const color = glowColor(ctx, fx);
  const frames = {};
  for (const k of fx.keyframes || []) {
    const filters = [];
    if (k.glow > 0) filters.push(`drop-shadow(0 0 ${6 + k.glow * 18}px ${rgba(color, Math.min(1, k.glow))})`);
    else filters.push(`drop-shadow(0 0 0 ${rgba(color, 0)})`);
    filters.push(`blur(${k.blur || 0}px)`);
    frames[`${Math.round(k.t * 1000) / 10}%`] =
      `opacity:${k.opacity};transform:translate(${k.x}px,${k.y}px) rotate(${k.rotate}deg) scale(${k.scale});filter:${filters.join(' ')}`;
  }
  return simple(scope, fx, name, frames);
}

/**
 * Build scoped CSS for the design's single effect.
 * ctx: { scope, lineW, lineH, chars:[{pos,off,w}], nodes, imageW }
 */
export function buildEffect(design, ctx) {
  const fx = design.effect;
  if (!fx || !fx.type || fx.type === 'none') return '';
  const S = ctx.scope;
  const id = S.slice(1);
  const I = Math.max(0, Math.min(1, fx.intensity ?? 0.5));

  switch (fx.type) {
    case 'soft-glow': {
      const c = glowColor(ctx, fx);
      const r = 6 + I * 22;
      return simple(S, fx, `${id}-glow`, {
        '0%': `filter:drop-shadow(0 0 ${r * 0.2}px ${rgba(c, 0.15 * I)}) drop-shadow(0 0 ${r * 0.4}px ${rgba(c, 0.1 * I)})`,
        '50%': `filter:drop-shadow(0 0 ${r * 0.45}px ${rgba(c, 0.75 * I + 0.15)}) drop-shadow(0 0 ${r}px ${rgba(c, 0.55 * I + 0.1)})`,
        '100%': `filter:drop-shadow(0 0 ${r * 0.2}px ${rgba(c, 0.15 * I)}) drop-shadow(0 0 ${r * 0.4}px ${rgba(c, 0.1 * I)})`,
      });
    }
    case 'pulse':
      return simple(S, fx, `${id}-pulse`, {
        '0%,100%': 'opacity:1', '50%': `opacity:${(1 - 0.75 * I).toFixed(3)}`,
      });
    case 'breathe':
      return simple(S, fx, `${id}-br`, {
        '0%,100%': 'transform:scale(1);opacity:1',
        '50%': `transform:scale(${(1 + 0.09 * I).toFixed(4)});opacity:${(1 - 0.3 * I).toFixed(3)}`,
      });
    case 'wave': {
      const a = (8 * I).toFixed(2), y = (7 * I).toFixed(2);
      return simple(S, fx, `${id}-wave`, {
        '0%,100%': `transform:rotate(${-a}deg) translateY(0)`,
        '25%': `transform:rotate(0deg) translateY(${-y}px)`,
        '50%': `transform:rotate(${a}deg) translateY(0)`,
        '75%': `transform:rotate(0deg) translateY(${y}px)`,
      });
    }
    case 'float':
      return simple(S, fx, `${id}-float`, {
        '0%,100%': 'transform:translateY(0)', '50%': `transform:translateY(${(-16 * I).toFixed(2)}px)`,
      });
    case 'shimmer':
      return sweep(S, fx, ctx, { band: 60 + 40 * I, alpha: 0.35 + 0.55 * I, angle: 110, pause: 0, count: 2 });
    case 'shine-sweep':
      return sweep(S, fx, ctx, { band: 34 + 30 * I, alpha: 0.5 + 0.5 * I, angle: 105, pause: 0.45 });
    case 'light-sweep':
      return sweep(S, fx, ctx, { band: 140 + 80 * I, alpha: 0.25 + 0.45 * I, angle: 100, pause: 0.15 });
    case 'flicker': {
      const lo = (1 - 0.85 * I).toFixed(3), mid = (1 - 0.45 * I).toFixed(3);
      return simple(S, fx, `${id}-fl`, {
        '0%,19%,21%,23%,55%,57%,100%': 'opacity:1',
        '20%': `opacity:${lo}`, '22%': `opacity:${mid}`, '56%': `opacity:${lo}`, '80%': 'opacity:1', '81%': `opacity:${mid}`, '82%': 'opacity:1',
      }, 'linear');
    }
    case 'rgb-shift': {
      const d = (1 + 4 * I).toFixed(2);
      const f = (x) => `filter:drop-shadow(${x}px 0 0 rgba(255,40,90,.7)) drop-shadow(${-x}px 0 0 rgba(0,220,255,.7))`;
      return simple(S, fx, `${id}-rgb`, { '0%,100%': f(0), '20%': f(d), '40%': f(-d * 0.6), '60%': f(d * 0.4), '80%': f(0) });
    }
    case 'rainbow':
      return simple(S, fx, `${id}-rb`, { from: 'filter:hue-rotate(0deg)', to: `filter:hue-rotate(${Math.round(360 * Math.max(0.1, I))}deg)` }, 'linear');
    case 'color-shift':
      return simple(S, fx, `${id}-cs`, { '0%,100%': 'filter:hue-rotate(0deg)', '50%': `filter:hue-rotate(${Math.round(180 * I)}deg)` });
    case 'gradient-flow':
      return fx.target === 'image' ? '' : gradientFlow(S, { ...fx, target: 'text' }, ctx);
    case 'glitch': {
      const x = (6 * I).toFixed(1);
      return simple(S, fx, `${id}-gl`, {
        '0%,84%,100%': 'transform:translate(0,0);clip-path:inset(0 0 0 0)',
        '86%': `transform:translate(${-x}px,0);clip-path:inset(18% 0 58% 0)`,
        '88%': `transform:translate(${x}px,0);clip-path:inset(62% 0 8% 0)`,
        '90%': `transform:translate(${-x / 2}px,0);clip-path:inset(38% 0 36% 0)`,
        '92%': 'transform:translate(0,0);clip-path:inset(0 0 0 0)',
        '95%': `transform:translate(${x / 2}px,0) skewX(${(-8 * I).toFixed(1)}deg);clip-path:inset(0 0 70% 0)`,
      }, 'linear');
    }
    case 'digital-glitch': {
      const x = (4 * I).toFixed(1);
      return simple(S, fx, `${id}-dg`, {
        '0%,100%': 'transform:none;opacity:1;filter:none',
        '10%': `transform:translateX(${x}px) skewX(${(10 * I).toFixed(1)}deg);filter:hue-rotate(40deg)`,
        '20%': `transform:translateX(${-x}px);opacity:${(1 - 0.4 * I).toFixed(2)}`,
        '30%': 'transform:none;opacity:1;filter:none',
        '60%': 'transform:none',
        '62%': `transform:translate(${-x}px, ${(x / 2).toFixed(1)}px);filter:hue-rotate(-60deg)`,
        '64%': 'transform:none;filter:none',
      }, 'steps(1, end)');
    }
    case 'fade':
      return simple(S, fx, `${id}-fd`, { '0%,100%': 'opacity:1', '50%': `opacity:${(1 - 0.9 * I).toFixed(3)}` });
    case 'scale-pulse': {
      const s = (1 + 0.16 * I).toFixed(4);
      return simple(S, fx, `${id}-sp`, {
        '0%,40%,100%': 'transform:scale(1)', '12%': `transform:scale(${s})`, '24%': 'transform:scale(1)', '32%': `transform:scale(${(1 + 0.1 * I).toFixed(4)})`,
      });
    }
    case 'rotation': {
      if (I >= 0.99) {
        return simple(S, fx, `${id}-rot`, { from: 'transform:rotate(0deg)', to: 'transform:rotate(360deg)' }, 'linear');
      }
      const a = (180 * I).toFixed(1);
      return simple(S, fx, `${id}-rot`, { '0%,100%': `transform:rotate(${-a}deg)`, '50%': `transform:rotate(${a}deg)` });
    }
    case 'blur-pulse':
      return simple(S, fx, `${id}-bl`, { '0%,100%': 'filter:blur(0px)', '50%': `filter:blur(${(0.5 + 3.5 * I).toFixed(2)}px)` });
    case 'letter-wave':
      return letters(S, fx, ctx, `${id}-lw`, {
        '0%,60%,100%': 'transform:translateY(0)', '30%': `transform:translateY(${(-14 * I).toFixed(2)}px)`,
      });
    case 'letter-bounce':
      return letters(S, fx, ctx, `${id}-lb`, {
        '0%,100%': 'transform:translateY(0) scale(1,1)',
        '20%': `transform:translateY(0) scale(${(1 + 0.08 * I).toFixed(3)},${(1 - 0.08 * I).toFixed(3)})`,
        '40%': `transform:translateY(${(-20 * I).toFixed(2)}px) scale(1,1)`,
        '60%': 'transform:translateY(0) scale(1,1)',
        '75%': `transform:translateY(${(-6 * I).toFixed(2)}px)`,
      });
    case 'letter-float':
      return letters(S, fx, ctx, `${id}-lf`, {
        '0%,100%': 'transform:translateY(0) rotate(0deg)',
        '50%': `transform:translateY(${(-10 * I).toFixed(2)}px) rotate(${(4 * I).toFixed(2)}deg)`,
      });
    case 'letter-flicker': {
      const lo = (1 - 0.95 * I).toFixed(3);
      // stepped easing = a clean blink (cursor), otherwise an organic flicker
      if (fx.easing === 'steps') {
        return letters(S, fx, ctx, `${id}-lk`, { '0%,49.9%': 'opacity:1', '50%,100%': `opacity:${lo}` });
      }
      return letters(S, fx, ctx, `${id}-lk`, {
        '0%,6%,10%,100%': 'opacity:1', '7%': `opacity:${lo}`, '9%': `opacity:${(1 - 0.5 * I).toFixed(3)}`, '8%': 'opacity:1',
      });
    }
    case 'keyframes':
      return custom(S, fx, ctx);
    default:
      return '';
  }
}
