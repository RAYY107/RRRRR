// Evora ID — font registry (FontFace API, lazy loading)
// Families come from config/fonts.lua. Each font is registered as
// "evora-<id>" and only downloaded when a design actually uses it.

const registry = new Map();   // id -> { faces: FontFace[], loaded: Promise|null, numerals }
let fallback = { arabic: null, symbols: null };
let base = 'fonts/';

export function initFonts(list, fb, baseUrl = 'fonts/') {
  base = baseUrl;
  fallback = fb || fallback;
  for (const f of list || []) {
    if (registry.has(f.id)) continue;
    const faces = (f.files || []).map((file) => new FontFace(`evora-${f.id}`, `url("${base}${file.src}")`, {
      weight: String(file.weight),
      style: 'normal',
      display: 'block',
    }));
    faces.forEach((face) => document.fonts.add(face));
    registry.set(f.id, { faces, loaded: null, numerals: f.numerals || ['latin'], label: f.label });
  }
}

// Label fonts: full Arabic + Latin sets for non-ID text (voice indicator).
const labels = new Map();
let defaultLabel = 'plex-ar';

export function initLabelFonts(list, def, baseUrl = 'fonts/') {
  if (def) defaultLabel = def;
  for (const f of list || []) {
    if (labels.has(f.id)) continue;
    const faces = (f.files || []).map((file) => new FontFace(`evora-label-${f.id}`, `url("${baseUrl}${file.src}")`, {
      weight: String(file.weight), style: 'normal', display: 'block', unicodeRange: file.range || 'U+0-10FFFF',
    }));
    faces.forEach((face) => document.fonts.add(face));
    labels.set(f.id, { faces, loaded: null });
  }
}

export const hasLabelFont = (id) => labels.has(id);

// The label font a design's voice indicator uses.
export function voiceFontOf(design) {
  const v = design?.voice;
  if (!v) return defaultLabel;
  if (v.matchText && labels.has(design.text?.font)) return design.text.font;
  return labels.has(v.font) ? v.font : defaultLabel;
}

export function labelStack(id) {
  const parts = [];
  if (labels.has(id)) parts.push(`"evora-label-${id}"`);
  if (id !== defaultLabel && labels.has(defaultLabel)) parts.push(`"evora-label-${defaultLabel}"`);
  parts.push('"Evora UI"', 'sans-serif');
  return parts.join(', ');
}

function loadLabel(id) {
  const entry = labels.get(id);
  if (!entry) return Promise.resolve();
  if (!entry.loaded) entry.loaded = Promise.all(entry.faces.map((f) => f.load().catch(() => null)));
  return entry.loaded;
}

export function hasFont(id) {
  return registry.has(id);
}

function loadOne(id) {
  const entry = registry.get(id);
  if (!entry) return Promise.resolve();
  if (!entry.loaded) {
    entry.loaded = Promise.all(entry.faces.map((f) => f.load().catch(() => null)));
  }
  return entry.loaded;
}

// Loads the fonts a design needs (+ fallbacks). Resolves even on failure.
export function ensureFonts(ids) {
  const labelIds = ids.filter((x) => typeof x === 'string' && x.startsWith('label:')).map((x) => x.slice(6));
  const set = new Set(ids.filter((x) => x && !String(x).startsWith('label:')));
  labelIds.forEach((id) => { set.add(`__label__${id}`); });
  if (fallback.arabic) set.add(fallback.arabic);
  if (fallback.symbols) set.add(fallback.symbols);
  return Promise.all([...set].map((id) => (id.startsWith('__label__') ? loadLabel(id.slice(9)) : loadOne(id))));
}

export function fontsOfDesign(design) {
  const ids = [design?.text?.font];
  for (const rule of design?.text?.chars || []) {
    if (rule?.style?.font) ids.push(rule.style.font);
  }
  if (design?.voice?.on) {
    ids.push(`label:${voiceFontOf(design)}`);
    if (voiceFontOf(design) !== defaultLabel) ids.push(`label:${defaultLabel}`);
  }
  return ids;
}

export function fontStack(id) {
  const parts = [];
  if (id && registry.has(id)) parts.push(`"evora-${id}"`);
  if (fallback.arabic && fallback.arabic !== id) parts.push(`"evora-${fallback.arabic}"`);
  if (fallback.symbols) parts.push(`"evora-${fallback.symbols}"`);
  parts.push('sans-serif');
  return parts.join(', ');
}

export function supportsNumerals(id, numerals) {
  const entry = registry.get(id);
  return !entry || entry.numerals.includes(numerals);
}

export function loadAllFonts() {
  return Promise.all([...registry.keys()].map(loadOne));
}
