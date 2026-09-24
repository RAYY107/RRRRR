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
  const set = new Set(ids.filter(Boolean));
  if (fallback.arabic) set.add(fallback.arabic);
  if (fallback.symbols) set.add(fallback.symbols);
  return Promise.all([...set].map(loadOne));
}

export function fontsOfDesign(design) {
  const ids = [design?.text?.font];
  for (const rule of design?.text?.chars || []) {
    if (rule?.style?.font) ids.push(rule.style.font);
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
