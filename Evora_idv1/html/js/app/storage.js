// Evora ID — local, per-player browser storage (drafts, recent, prefs).
// Nothing here is authoritative: saved designs live on the server.

const K = { drafts: 'evora.drafts.v1', snaps: 'evora.snapshots.v1', recent: 'evora.recent.v1', prefs: 'evora.prefs.v1', swatches: 'evora.swatches.v1', clip: 'evora.clipboard.v1' };

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// ---- autosave drafts (one per editing scope)
export function getDraft(scope) {
  return read(K.drafts, {})[scope] || null;
}
export function setDraft(scope, draft) {
  const all = read(K.drafts, {});
  all[scope] = draft;
  write(K.drafts, all);
}
export function removeDraft(scope) {
  const all = read(K.drafts, {});
  delete all[scope];
  write(K.drafts, all);
}
export function allDrafts() {
  return read(K.drafts, {});
}

// ---- manual snapshots
export function snapshots() { return read(K.snaps, []); }
export function addSnapshot(snap) {
  const list = [snap, ...snapshots()].slice(0, 8);
  write(K.snaps, list);
  return list;
}
export function removeSnapshot(id) {
  const list = snapshots().filter((s) => s.id !== id);
  write(K.snaps, list);
  return list;
}

// ---- recent designs / presets
export function recent() { return read(K.recent, []); }
export function pushRecent(item) {
  const key = item.kind === 'preset' ? `p:${item.ref}` : `d:${item.hash}`;
  const list = [item, ...recent().filter((r) => (r.kind === 'preset' ? `p:${r.ref}` : `d:${r.hash}`) !== key)].slice(0, 12);
  write(K.recent, list);
  return list;
}

// ---- preferences
export function prefs() {
  return { level: 'simple', snap: true, guides: true, snapPx: 8, ...read(K.prefs, {}) };
}
export function setPrefs(p) { write(K.prefs, { ...prefs(), ...p }); }

// ---- recent colours
export function swatches() { return read(K.swatches, []); }
export function pushSwatch(hex) {
  const list = [hex, ...swatches().filter((s) => s !== hex)].slice(0, 9);
  write(K.swatches, list);
}

// ---- style clipboard
export function clipboard() { return read(K.clip, null); }
export function setClipboard(v) { write(K.clip, v); }
