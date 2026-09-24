// Evora ID — small shared helpers (render host + editor)

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const round = (v, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};

export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

export function get(obj, path) {
  let o = obj;
  for (const k of path.split('.')) {
    if (o == null) return undefined;
    o = o[k];
  }
  return o;
}

export function set(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isObj(o[keys[i]]) && !Array.isArray(o[keys[i]])) o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

export function debounce(fn, ms) {
  let t = 0;
  const d = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  d.cancel = () => clearTimeout(t);
  return d;
}

// Leading + trailing throttle.
export function throttle(fn, ms) {
  let last = 0, timer = 0, lastArgs = null;
  return (...a) => {
    const now = performance.now();
    lastArgs = a;
    if (now - last >= ms) {
      last = now;
      fn(...a);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = 0;
        last = performance.now();
        fn(...lastArgs);
      }, ms - (now - last));
    }
  };
}

let uidN = 0;
export const uid = (p = 'u') => `${p}${(++uidN).toString(36)}`;

// Resource name for NUI callbacks, in NUI frames and DUI pages alike.
export function resourceName() {
  if (typeof window.GetParentResourceName === 'function') return window.GetParentResourceName();
  const host = location.hostname || '';
  return host.replace(/^cfx-nui-/, '') || 'Evora_idv1';
}
