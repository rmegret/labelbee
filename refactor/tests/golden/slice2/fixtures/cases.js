// Synthetic fixtures (Q8) for the save/export functions of slice 2 (ADR 0004).
// Each case: {name, fn, args(rec)}; args build FRESH inputs per run (the functions mutate them).
// convertTracksToV1 takes (Tracks); convertTracksToV2 (Tracks, TracksInfo, videoinfo); the CSV/BBox
// functions (Tracks).
'use strict';

// bool_acts order: fanning, pollen, entering, leaving (BEH-701)
const obs = (ID, extra = {}) => ({
  ID, time: 0, frame: 0, x: 10.12345, y: 20.6789, cx: 0, cy: 0, width: 30.5555, height: 40, angle: 1.5,
  notes: '', labels: '', ...extra,
});
// the flags are derived from labels (ADR 0008 step 4): labels that give those flags
const NAMES = ['fanning', 'pollen', 'entering', 'leaving'];
const flags = (...idx) => ({ labels: idx.map((i) => NAMES[i]).join(',') });

const tracks2 = () => ({
  0: { 1: obs(1, { frame: 0, labels: 'pollen' }), 2: obs(2, { frame: 0, notes: 'a note' }) },
  3: { 1: obs(1, { frame: 3, x: 11, y: 21, width: 31, height: 41 }) },
});
const info = (extra = {}) => ({ type: 'events-multiframe', source: 'synthetic', notes: 'n', ...extra });
const vinfo = () => ({ name: 'vid', width: 100, height: 50, preview: { w: 1 } });

const V2 = (name, tracks, ti = info, vi = vinfo) =>
  ({ name, fn: 'convertTracksToV2', args: () => [tracks(), ti(), vi()] });
const V1 = (name, tracks) => ({ name, fn: 'convertTracksToV1', args: () => [tracks()] });
const CSV = (name, tracks) => ({ name, fn: 'tracksToCSV', args: () => [tracks()] });
const BB = (name, tracks) => ({ name, fn: 'tracksToBBoxes', args: () => [tracks()] });
const BB2 = (name, tracks) => ({ name, fn: 'tracksToBBoxes2', args: () => [tracks()] });

// observations with every flag combination, one per frame
const flagTracks = () => ({
  0: { 1: obs(1, { ...flags() }) },
  1: { 1: obs(1, { ...flags(0) }) },
  2: { 1: obs(1, { ...flags(1) }) },
  3: { 1: obs(1, { ...flags(2) }) },
  4: { 1: obs(1, { ...flags(3) }) },
  5: { 1: obs(1, { ...flags(0, 1, 2, 3) }) },
});
const noBoolActs = () => { const o = obs(1); delete o.bool_acts; return { 0: { 1: o } }; };

// Tracks as the page holds it (`var Tracks = []`): an array, with holes
const sparseArray = () => { const t = []; t[2] = { 1: obs(1, { frame: 2 }) }; t[5] = { 4: obs(4, { frame: 5 }) }; return t; };

const cases = [
  // ---- convertTracksToV2 ----
  V2('v2 basic two frames two ids', tracks2),
  V2('v2 Tracks as array with holes', sparseArray),
  V2('v2 empty Tracks object', () => ({})),
  V2('v2 empty Tracks array', () => []),
  V2('v2 null frame skipped', () => ({ 0: null, 1: { 1: obs(1) } })),
  V2('v2 empty frame kept as []', () => ({ 0: {}, 1: { 1: obs(1) } })),
  V2('v2 null event skipped', () => ({ 0: { 1: null, 2: obs(2) } })),
  V2('v2 id taken from the key, not from ID', () => ({ 0: { 5: obs(99) } })),
  V2('v2 frame keys in numeric order', () => ({ 10: { 1: obs(1) }, 2: { 1: obs(1) }, 1: { 1: obs(1) } })),
  V2('v2 history absent', tracks2),
  V2('v2 history array', tracks2, () => info({ history: ['Loaded on x'] })),
  V2('v2 history string throws', tracks2, () => info({ history: 'Loaded in Labelbee on 2024-01-01' })),
  V2('v2 old formatnote and videoinfo overwritten', tracks2, () => info({ formatnote: 'old', videoinfo: { name: 'old' } })),
  V2('v2 TracksInfo extra fields round-trip', tracks2, () => info({ basedon: 12, custom: { a: [1, 2] } })),
  V2('v2 rounding to 3 decimals', () => ({
    0: {
      1: obs(1, { x: 1.0004, y: 1.0005, width: 2.0006, height: 0.0004 }),
      2: obs(2, { x: -1.0005, y: 1e-9, width: 100.9995, height: 3 }),
    },
  })),
  V2('v2 removed fields and kept unknown fields', () => ({
    0: { 1: obs(1, { marked: true, permanent: true, parts: [[1, 2]], newid: 7, fix: 1, visit: 'v', span: 3, tag: 4, custom: 'k' }) },
  })),
  V2('v2 stored cx cy are recomputed', () => ({ 0: { 1: obs(1, { cx: 999, cy: 999 }) } })),
  V2('v2 non-numeric x gives NaN', () => ({ 0: { 1: obs(1, { x: 'a' }) } })),
  V2('v2 missing geometry gives NaN', () => { const o = obs(1); delete o.x; delete o.width; return { 0: { 1: o } }; }),
  V2('v2 absent time frame angle notes labels stay absent', () => {
    const o = { ID: 1, x: 1, y: 2, width: 3, height: 4 };
    return { 0: { 1: o } };
  }),
  V2('v2 videoinfo undefined', tracks2, info, () => undefined),

  // ---- convertTracksToV1 ----
  V1('v1 basic two frames two ids', tracks2),
  V1('v1 returns an array with holes', () => ({ 2: { 1: obs(1, { frame: 2 }) } })),
  V1('v1 Tracks as array with holes', sparseArray),
  V1('v1 empty Tracks', () => ({})),
  V1('v1 null frame and null event skipped', () => ({ 0: null, 1: { 1: null, 2: obs(2) } })),
  V1('v1 empty frame kept as {}', () => ({ 0: {} })),
  V1('v1 keeps ID and bool_acts, drops marked and permanent', () => ({
    0: { 1: obs(1, { marked: true, permanent: true, ...flags(1) }) },
  })),
  V1('v1 rounding to 3 decimals', () => ({ 0: { 1: obs(1, { x: 1.0004, y: 1.0005, width: 2.0006, height: 0.0004 }) } })),

  // ---- tracksToCSV ----
  CSV('csv basic', tracks2),
  CSV('csv every flag combination', flagTracks),
  CSV('csv empty Tracks', () => ({})),
  CSV('csv undefined Tracks', () => undefined),
  CSV('csv null frame skipped', () => ({ 0: null, 1: { 1: obs(1, { ...flags(0) }) } })),
  CSV('csv Tracks as array with holes', sparseArray),
  CSV('csv uses ID, not the key', () => ({ 0: { 5: obs(99, { ...flags(2) }) } })),
  CSV('csv an observation without bool_acts exports (DEBT-727 gone)', noBoolActs),
  CSV('csv null event throws', () => ({ 0: { 1: null } })),

  // ---- tracksToBBoxes (unused, header and column order differ) ----
  BB('bbox basic', tracks2),
  BB('bbox every flag combination', flagTracks),
  BB('bbox empty Tracks', () => ({})),
  BB('bbox undefined Tracks', () => undefined),
  BB('bbox an observation without bool_acts exports (DEBT-727 gone)', noBoolActs),

  // ---- tracksToBBoxes2 ----
  BB2('bbox2 basic', tracks2),
  BB2('bbox2 every flag combination', flagTracks),
  BB2('bbox2 empty Tracks', () => ({})),
  BB2('bbox2 undefined Tracks', () => undefined),
  BB2('bbox2 null frame skipped', () => ({ 0: null, 1: { 1: obs(1) } })),
  BB2('bbox2 Tracks as array with holes', sparseArray),
  BB2('bbox2 floating-point noise is not rounded', () => ({ 0: { 1: obs(1, { x: 0.1, y: 0.2, width: 0.2, height: 0.1 }) } })),
  BB2('bbox2 missing angle gives NaN', () => { const o = obs(1); delete o.angle; return { 0: { 1: o } }; }),
  BB2('bbox2 an observation without bool_acts exports (DEBT-727 gone)', noBoolActs),
  BB2('bbox2 null event throws', () => ({ 0: { 1: null } })),
];

module.exports = { cases };
