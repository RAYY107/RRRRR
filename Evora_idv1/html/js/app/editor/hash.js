// Evora ID — small stable hash for local de-duplication (recent designs)

export function designHashJs(design) {
  const s = JSON.stringify(design);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
