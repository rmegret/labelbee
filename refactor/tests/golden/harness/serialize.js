// JSON-safe, order-preserving, realm-independent serialization (keeps NaN/undefined/-0).
'use strict';
function ser(v) {
  if (v === undefined) return { $: 'undefined' };
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { $: 'NaN' };
    if (v === Infinity || v === -Infinity) return { $: String(v) };
    if (Object.is(v, -0)) return { $: '-0' };
    return v;
  }
  if (typeof v === 'function') return { $: 'function' };
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return Array.from(v, ser); // not v.map: it would build a vm-realm array
  const o = {};
  for (const k of Object.keys(v)) o[k] = ser(v[k]);
  return o;
}
module.exports = { ser };
