// Evora ID — coherent random designs
// Not independent random values: a mood is chosen first, then a font, a
// palette and an effect that belong to that mood, with balanced layout.

import { S } from './store.js';
import { freshDesign, fontById, nearestWeight } from './schema.js';
import { mix, luminance } from '../core/color.js';
import { clone } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const between = (a, b, dec = 0) => +(a + Math.random() * (b - a)).toFixed(dec);

const MOODS = {
  minimal: {
    fonts: ['inter', 'sora', 'outfit', 'space-grotesk', 'readex', 'alexandria', 'montserrat', 'jetbrains-mono'],
    palettes: [['#FFFFFF', '#B9BEC6'], ['#F4F5F6', '#8E949E'], ['#E8F0FF', '#9DB6DC'], ['#F7F3EE', '#C8B9A6']],
    effects: [null, null, 'fx-fade', 'fx-deep-breath', 'fx-float'],
    gradient: 0.5, outline: 0.15, glow: 0.15, emblem: 0.25, emblems: ['ring', 'line', 'spark', 'star4'],
    weights: [500, 600, 700],
  },
  metallic: {
    fonts: ['russo-one', 'orbitron', 'exo2', 'oswald', 'black-ops-one', 'michroma', 'big-shoulders', 'tektur'],
    palettes: [['#FFFFFF', '#C8CDD4', '#5E636B'], ['#F9E9B8', '#D4AF37', '#8C6A1C'], ['#F6C690', '#B06A2A', '#5A2E10'], ['#FF5A5F', '#A4161A', '#3A3D42'], ['#EEF1F4', '#9AA3AD', '#4A4F57']],
    effects: ['fx-slow-shine', 'fx-quick-shine', 'fx-light-sweep', 'fx-shimmer'],
    gradient: 1, outline: 0.9, glow: 0.3, emblem: 0.5, emblems: ['chevron', 'shield', 'hex', 'bolt', 'diamond', 'crown'],
    weights: [800, 900, 700],
  },
  neon: {
    fonts: ['righteous', 'audiowide', 'monoton', 'zen-dots', 'oxanium', 'tektur', 'chakra-petch'],
    palettes: [['#FF4FB8'], ['#00E5FF'], ['#D4FF1F'], ['#B388FF'], ['#FF6A3D'], ['#39FF7A']],
    effects: ['fx-neon-flicker', 'fx-soft-glow', 'fx-pulse', 'fx-rgb'],
    gradient: 0.2, outline: 0.3, glow: 1, emblem: 0.2, emblems: ['bolt', 'star4', 'triangle', 'orbit'],
    weights: [700, 400],
  },
  elegant: {
    fonts: ['cinzel', 'playfair', 'bodoni-moda', 'amiri', 'markazi', 'el-messiri', 'aref-ruqaa', 'abril-fatface'],
    palettes: [['#FFF6DA', '#D8B45A'], ['#F7F3EE', '#C8B9A6'], ['#EFE9F7', '#B8A9D9'], ['#FFFFFF', '#CFC6B8']],
    effects: [null, 'fx-float', 'fx-soft-glow', 'fx-shimmer', 'fx-slow-shine'],
    gradient: 0.7, outline: 0.3, glow: 0.35, emblem: 0.45, emblems: ['laurel', 'crown', 'halo', 'crescent', 'star4'],
    weights: [700, 800, 900],
  },
  cyber: {
    fonts: ['oxanium', 'chakra-petch', 'tektur', 'share-tech-mono', 'space-mono', 'orbitron', 'handjet'],
    palettes: [['#7CF8D4'], ['#00F0FF', '#7000FF'], ['#C8FAFF', '#5AC8FA'], ['#F4F5F6'], ['#39FF7A']],
    effects: ['fx-digital', 'fx-glitch', 'fx-rgb', 'fx-light-sweep', 'fx-letter-flicker'],
    gradient: 0.45, outline: 0.4, glow: 0.7, emblem: 0.35, emblems: ['triangle', 'cross', 'bars', 'hex', 'frame'],
    weights: [700, 600],
  },
  arabic: {
    fonts: ['cairo', 'tajawal', 'changa', 'lalezar', 'reem-kufi', 'rakkas', 'lemonada', 'noto-kufi', 'kufam', 'aref-ruqaa', 'el-messiri', 'blaka'],
    palettes: [['#FFFFFF', '#B9BEC6'], ['#FFD27A', '#FF6A00'], ['#F5ECFF', '#9B6BD6'], ['#4FACFE', '#00F2FE'], ['#F9E9B8', '#D4AF37']],
    effects: [null, 'fx-float', 'fx-letter-wave', 'fx-soft-glow', 'fx-slow-shine'],
    gradient: 0.7, outline: 0.4, glow: 0.35, emblem: 0.35, emblems: ['crescent', 'star4', 'flame', 'spark', 'halo'],
    weights: [700, 800, 900],
    numerals: 'arabic',
  },
  dark: {
    fonts: ['anton', 'bebas-neue', 'unbounded', 'teko', 'staatliches', 'big-shoulders'],
    palettes: [['#44474E', '#121316'], ['#1B1C1F'], ['#3A3D43', '#0E0F12']],
    effects: [null, 'fx-deep-breath', 'fx-blur-pulse', 'fx-light-sweep'],
    gradient: 0.6, outline: 1, glow: 0.5, emblem: 0.25, emblems: ['ring', 'line', 'frame'],
    weights: [800, 700, 400],
    lightOutline: true,
  },
};

export function randomDesign() {
  const moodKey = pick(Object.keys(MOODS));
  const M = MOODS[moodKey];
  const d = freshDesign();
  const fontId = pick(M.fonts.filter((f) => fontById(f)));
  const font = fontById(fontId);
  const palette = pick(M.palettes);
  const main = palette[0];

  d.text.font = fontId;
  d.text.weight = nearestWeight(fontId, pick(M.weights));
  d.text.size = between(78, 100);
  d.text.tracking = pick([0, 0, 2, 4, 6]);
  if (M.numerals && font?.numerals?.includes('arabic')) d.text.numerals = 'arabic';

  if (palette.length > 1 && chance(M.gradient)) {
    d.text.fill = { type: 'linear', color: main, alpha: 1, angle: pick([180, 180, 90, 135]), cx: 50, cy: 50, stops: palette.map((c, i) => ({ c, p: Math.round((i / (palette.length - 1)) * 100), a: 1 })) };
  } else {
    d.text.fill = { ...d.text.fill, type: 'solid', color: main, alpha: 1 };
  }

  const bright = luminance(main) > 0.35;
  if (chance(M.outline)) {
    d.text.outline = { on: true, width: pick([1, 1.5, 2, 2.5]), color: M.lightOutline ? '#C9CDD3' : (bright ? '#111214' : '#E6E8EB'), alpha: 1 };
  }
  d.text.shadow = { on: !M.lightOutline || chance(0.5), x: 0, y: pick([3, 4, 6]), blur: pick([6, 8, 12]), color: '#000000', alpha: pick([0.5, 0.6, 0.7]) };
  if (chance(M.glow)) {
    d.text.glow = { on: true, color: moodKey === 'dark' ? '#FFFFFF' : mix(main, '#FFFFFF', 0.1), alpha: 0.85, radius: between(10, 24), strength: moodKey === 'neon' ? between(0.6, 0.85, 2) : between(0.2, 0.45, 2) };
  }

  if (chance(0.15)) {
    const pair = pick([['[', ']'], ['‹', '›'], ['«', '»'], ['⟨', '⟩']]);
    d.text.prefix = pair[0];
    d.text.suffix = pair[1];
    d.text.affixScale = 0.7;
    d.text.chars = [
      { sel: { mode: 'prefix', a: 0, b: 0, list: [] }, style: { scale: 1, x: 0, y: 0, rotate: 0, opacity: 0.7, animate: true } },
      { sel: { mode: 'suffix', a: 0, b: 0, list: [] }, style: { scale: 1, x: 0, y: 0, rotate: 0, opacity: 0.7, animate: true } },
    ];
  }

  if (chance(M.emblem) && S.design?.image?.kind !== 'url') {
    const asset = pick(M.emblems);
    const side = asset === 'frame' || asset === 'laurel' || asset === 'ring' ? 'none' : asset === 'line' ? 'bottom' : pick(['left', 'right', 'right', 'top']);
    d.image = {
      ...d.image,
      on: true, kind: 'asset', asset, url: '', discord: '',
      w: side === 'none' ? 120 : 34, h: side === 'none' ? 120 : 34,
      autoWidth: asset === 'line' || asset === 'frame', pad: asset === 'frame' ? 30 : 4,
      attach: side, gap: side === 'top' ? -8 : 8, order: 'back', opacity: side === 'none' ? 0.5 : 1,
      tint: { on: true, fill: palette.length > 1 ? { type: 'linear', color: main, alpha: 1, angle: 180, cx: 50, cy: 50, stops: palette.map((c, i) => ({ c, p: Math.round((i / (palette.length - 1)) * 100), a: 1 })) } : { ...d.image.tint.fill, type: 'solid', color: main, alpha: 1 } },
    };
    if (asset === 'line') d.image.h = 12;
    if (asset === 'frame') { d.image.w = 140; d.image.h = 90; }
    d.layers.image = { x: 0, y: side === 'right' ? -4 : 0, scale: 1, rotate: 0, hidden: false };
    d.layers.text.x = side === 'left' ? 22 : side === 'right' ? -22 : 0;
  } else if (S.design?.image?.on && S.design.image.kind !== 'asset') {
    // keep the player's own picture, it is part of their identity
    d.image = clone(S.design.image);
    d.layers.image = clone(S.design.layers.image);
  }

  const fxId = pick(M.effects);
  if (fxId) {
    const preset = S.boot.effectPresets.find((p) => p.id === fxId);
    if (preset) {
      d.effect = { ...d.effect, ...clone(preset.effect) };
      d.effect.intensity = Math.min(1, Math.max(0.1, +(d.effect.intensity * between(0.8, 1.1, 2)).toFixed(2)));
      if (!d.image.on && d.effect.target === 'image') d.effect.target = 'all';
    }
  }
  d.meta = { preset: '', name: '' };
  return d;
}
