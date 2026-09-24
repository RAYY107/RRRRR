// Evora ID — editor state + history
// The draft design is local until the player saves. History snapshots are
// taken on "commit" (end of a drag, a slider release, a preset...), never
// on every mouse move.

import { clone, deepEqual } from '../core/util.js';
import { prefs, setPrefs } from './storage.js';

const listeners = new Set();
const p = prefs();

export const S = {
  boot: null,           // static data from the client (schema, fonts, effects...)
  session: null,        // bootstrap data from the server
  mode: null,           // 'self' | 'manage'
  view: null,           // 'editor' | 'manager'
  presets: [],
  presetVersion: null,
  design: null,         // current draft
  baseline: null,       // design active on the server when editing started (null = default look)
  committed: null,
  undo: [],
  redo: [],
  displayId: 0,         // the REAL server id rendered in previews
  target: null,         // null = own design | { type:'player', ... } | { type:'preset', ... }
  anchor: null,         // on-screen anchor of the live ID
  ui: {
    level: p.level,     // 'simple' | 'advanced'
    nav: 'presets',
    tab: 'text',
    selection: 'stage', // stage | group | text | image
    compare: 'after',
    snap: p.snap,
    guides: p.guides,
    snapPx: p.snapPx,
    timeline: false,
    charSel: { mode: 'all', a: 0, b: 0, list: [] },
    kf: 0,
    random: null,
  },
};

export function on(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(kind, info = {}) {
  for (const fn of [...listeners]) {
    try { fn(kind, info); } catch (e) { console.error(e); }
  }
}

function doCommit() {
  if (deepEqual(S.committed, S.design)) return false;
  S.undo.push(S.committed);
  if (S.undo.length > 120) S.undo.shift();
  S.redo = [];
  S.committed = clone(S.design);
  return true;
}

export function setDesign(mutator, { commit = true, structure = false } = {}) {
  mutator(S.design);
  if (commit) doCommit();
  emit('design', { structure, live: !commit });
}

export function commit() {
  if (doCommit()) emit('history');
}

export function undo() {
  if (!S.undo.length) return;
  S.redo.push(clone(S.design));
  S.design = S.undo.pop();
  S.committed = clone(S.design);
  emit('design', { structure: true, history: true });
}

export function redo() {
  if (!S.redo.length) return;
  S.undo.push(clone(S.design));
  S.design = S.redo.pop();
  S.committed = clone(S.design);
  emit('design', { structure: true, history: true });
}

export function loadDesign(d, { resetHistory = false } = {}) {
  if (resetHistory) {
    S.undo = [];
    S.redo = [];
    S.design = clone(d);
    S.committed = clone(d);
  } else {
    S.design = clone(d);
    doCommit();
  }
  emit('design', { structure: true });
}

export function setUI(patch) {
  Object.assign(S.ui, patch);
  if ('level' in patch || 'snap' in patch || 'guides' in patch || 'snapPx' in patch) {
    setPrefs({ level: S.ui.level, snap: S.ui.snap, guides: S.ui.guides, snapPx: S.ui.snapPx });
  }
  emit('ui', patch);
}

export const isAdvanced = () => S.ui.level === 'advanced';
export const dirty = () => !deepEqual(S.design, S.baseline);
