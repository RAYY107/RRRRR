// Evora ID — client view of the shared schema (shared/schema.lua).
// Used for control ranges and defaults; the server re-validates everything.

import { S } from './store.js';
import { clone, isObj } from '../core/util.js';

export function specAt(path) {
  let spec = S.boot.schema;
  for (const key of path.split('.')) {
    if (!spec) return null;
    if (spec.t === 'obj') spec = spec.fields[key];
    else if (spec.t === 'arr') spec = spec.item;
    else return null;
  }
  return spec;
}

export function defaultOf(spec) {
  if (!spec) return undefined;
  switch (spec.t) {
    case 'obj': {
      const o = {};
      for (const [k, f] of Object.entries(spec.fields)) if (!f.optional) o[k] = defaultOf(f);
      return o;
    }
    case 'arr': return clone(spec.def || []);
    default: return clone(spec.def);
  }
}

export const defaultAt = (path) => defaultOf(specAt(path));

export function range(path) {
  const s = specAt(path) || {};
  return { min: s.min ?? 0, max: s.max ?? 100, dec: s.dec ?? 2 };
}

// Fill in anything missing (older / partial designs) from schema defaults.
export function complete(design) {
  const fill = (spec, v) => {
    if (!spec) return v;
    if (spec.t === 'obj') {
      const src = isObj(v) ? v : {};
      const out = {};
      for (const [k, f] of Object.entries(spec.fields)) {
        if (f.optional) { if (src[k] !== undefined && src[k] !== null) out[k] = fill(f, src[k]); }
        else out[k] = src[k] === undefined || src[k] === null ? defaultOf(f) : fill(f, src[k]);
      }
      return out;
    }
    if (spec.t === 'arr') return Array.isArray(v) ? v.map((x) => fill(spec.item, x)) : defaultOf(spec);
    return v === undefined || v === null ? clone(spec.def) : v;
  };
  return fill(S.boot.schema, design || {});
}

export function freshDesign() {
  return complete(clone(S.boot.defaults));
}

export const fontById = (id) => S.boot.fonts.find((f) => f.id === id);
export const effectType = (id) => S.boot.effects.find((e) => e.id === id);
export const assetById = (id) => S.boot.assets.find((a) => a.id === id);
export const presetById = (id) => S.presets.find((p) => p.id === id);

export function nearestWeight(fontId, w) {
  const f = fontById(fontId);
  if (!f || !f.weights?.length) return w;
  return f.weights.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), f.weights[0]);
}
