/*
 * CSV schemas: which kind of data a CSV file holds, from its file suffix and its column list, and which
 * loader of annotation/ServerIO.js adapts it into the store. Used by the "from /data" loader dialog to show the
 * category, filter by type, and validate the header before loading.
 *
 * Pure, except `fetchCsvHeader` (browser fetch). `loader` names a loader of annotation/ServerIO.js ('tracks',
 * 'tags', 'tracks_tagged') or is null for a recognized format that has no loader yet.
 */

const quad = (prefix) => [0, 1, 2, 3].flatMap(i => [prefix + 'p' + i + 'x', prefix + 'p' + i + 'y']);
const TAG_QUAD = quad('tag_');
const TRACK_COLS = ['frame', 'track_id', 'cx', 'cy', 'angle'];
const PART_NAMES = ['head', 'neck', 'thorax', 'waist', 'tail'];
const PART_COLS = PART_NAMES.flatMap(n => [n + '_x', n + '_y', n + '_visibility']);

/*
 * `mapping`: how the columns of the file are adapted into the LabelBee event fields, one row per (grouped) field:
 * {field, show (columns, compact notation), columns (exact list, for the validation and the `ignored` row), rule}.
 * The fields are grouped: `position` is x, y, cx, cy, width, height; `tag` is the whole tag record; `parts` the keypoints.
 * Columns of the file that appear in no row are shown as `ignored`.
 */
const M_PARTS = { field: 'parts', show: 'head|neck|thorax|waist|tail _x, _y, _visibility', columns: PART_COLS,
  rule: 'one part per keypoint with visibility > 0' };
const M_POS_CENTER = { field: 'position', show: 'cx, cy', columns: ['cx', 'cy'],
  rule: 'cx, cy kept; x, y derived (cx-150, cy-300); width, height fixed 300x600' };
const M_TAG = (cols, show, rule) => ({ field: 'tag', show, columns: cols, rule });
const TAG_FULL = ['tag_id', 'tag_cx', 'tag_cy', 'tag_hamming', 'tag_goodness', 'tag_dm', ...TAG_QUAD];
const TAG_FULL_SHOW = 'tag_id, tag_cx, tag_cy, tag_hamming, tag_goodness, tag_dm, tag_p[0-3][xy]';
const TAG_RULE = 'tag {id, c, hamming, goodness, dm, p: 4 corners}, only on rows with a tag_id';

// Order does not matter: the longest matching suffix wins, ties are broken by the most required columns.
export const SCHEMAS = [
  {
    key: 'tracks_tagged', label: 'Tracks (tagged tracks)', suffixes: ['.tracks_tagged.csv'],
    required: [...TRACK_COLS, 'track_tagid', 'tag_id'],
    optional: ['tag_cx', 'tag_cy', 'tag_hamming', 'tag_goodness', 'tag_dm', ...TAG_QUAD, 'head_visibility', 'head_x', 'head_y'],
    loader: 'tracks_tagged',
    note: 'one event per detection',
    mapping: [
      { field: 'id', show: 'track_tagid, else track_id', columns: ['track_tagid', 'track_id'], rule: 'tagid when set, else "T" + track_id' },
      { field: 'frame', show: 'frame', columns: ['frame'], rule: '' },
      M_POS_CENTER,
      { field: 'angle', show: 'angle', columns: ['angle'], rule: 'angle + 90' },
      M_PARTS,
      M_TAG(TAG_FULL, TAG_FULL_SHOW, TAG_RULE),
    ],
  },
  {
    key: 'tracks+tags', label: 'Tracks + tags', suffixes: ['.tracks+tags.csv'],
    required: [...TRACK_COLS, 'tag_id', 'tag_cx', 'tag_cy'],
    optional: ['tag_hamming', 'tag_goodness', 'tag_dm', ...TAG_QUAD, 'head_visibility', 'head_x', 'head_y'],
    loader: 'tracks',
    note: 'one event per detection',
    mapping: [
      { field: 'id', show: 'track_id', columns: ['track_id'], rule: '' },
      { field: 'frame', show: 'frame', columns: ['frame'], rule: '' },
      M_POS_CENTER,
      { field: 'angle', show: 'angle', columns: ['angle'], rule: 'angle + 90' },
      M_PARTS,
      M_TAG(TAG_FULL, TAG_FULL_SHOW, TAG_RULE),
    ],
  },
  {
    key: 'tracks', label: 'Tracks', suffixes: ['tracks.csv', '.tracks.crops.csv', '.augmented.csv'],
    required: TRACK_COLS,
    optional: ['head_visibility', 'head_x', 'head_y', 'neck_visibility', 'tail_visibility', 'tag_id'],
    loader: 'tracks',
    note: 'one event per detection',
    mapping: [
      { field: 'id', show: 'track_id', columns: ['track_id'], rule: '' },
      { field: 'frame', show: 'frame', columns: ['frame'], rule: '' },
      M_POS_CENTER,
      { field: 'angle', show: 'angle', columns: ['angle'], rule: 'angle + 90' },
      M_PARTS,
      M_TAG(TAG_FULL, TAG_FULL_SHOW, TAG_RULE),
    ],
  },
  {
    key: 'tags', label: 'Tags (LabelBee)', suffixes: ['tags.csv'],
    required: ['frame', 'id', 'cx', 'cy', 'hamming', 'goodness', 'dm', 'p0x', 'p0y', 'p1x', 'p1y', 'p2x', 'p2y', 'p3x', 'p3y', 'cx_tag', 'cy_tag'],
    optional: [],
    loader: 'tags',
    note: 'loaded into both Tracks (the events) and Tags (rows with dm != 0)',
    mapping: [
      { field: 'id', show: 'id', columns: ['id'], rule: '' },
      { field: 'frame', show: 'frame', columns: ['frame'], rule: '' },
      M_POS_CENTER,
      { field: 'angle', show: 'angle', columns: ['angle'], rule: 'angle + 90' },
      M_PARTS,
      { field: 'tag (Tags store)', show: 'id, cx_tag, cy_tag, hamming, goodness, dm, p[0-3][xy]',
        columns: ['cx_tag', 'cy_tag', 'hamming', 'goodness', 'dm', ...quad('')], rule: 'tag {id, c, hamming, goodness, dm, p}, rows with dm = 0 are skipped' },
    ],
  },
  {
    key: 'tags_pipeline', label: 'Tags (pipeline)', suffixes: ['.tags.csv'],
    required: ['frame', 'det_id', 'track_id', 'tag_id', 'tag_cx', 'tag_cy', 'tag_hamming', 'tag_dm', ...TAG_QUAD],
    optional: ['tag_goodness', 'tag_H', 'tag_ntags'],
    loader: null, note: 'decoded tags only, no bee geometry: use the tracks+tags file instead',
  },
  {
    key: 'events', label: 'Track events', suffixes: ['.events.csv', '.events_tagged.csv'],
    required: ['track_id', 'track_event', 'track_startframe', 'track_startx', 'track_starty', 'track_starta',
      'track_endframe', 'track_endx', 'track_endy', 'track_enda'],
    optional: ['track_shape', 'track_tagid'],
    loader: 'events',
    note: 'one row per track, loaded as two events (start and end)',
    mapping: [
      { field: 'id', show: 'track_id', columns: ['track_id'], rule: '"T" + track_id' },
      { field: 'frame', show: 'track_startframe, track_endframe', columns: ['track_startframe', 'track_endframe'],
        rule: 'one event at each; frames < 0 (before the clip) skipped' },
      { field: 'position', show: 'track_startx/y, track_endx/y', columns: ['track_startx', 'track_starty', 'track_endx', 'track_endy'],
        rule: 'cx, cy; x, y derived (cx-150, cy-300); width, height fixed 300x600' },
      { field: 'angle', show: 'track_starta, track_enda', columns: ['track_starta', 'track_enda'], rule: 'angle + 90' },
      { field: 'span', show: 'track_startframe, track_endframe', columns: ['track_startframe', 'track_endframe'],
        rule: 'span {f1, f2} = the whole track, on both events (unclipped, f1 may be < 0)' },
      { field: 'labels', show: 'track_event, track_shape', columns: ['track_event', 'track_shape'], rule: 'both as labels' },
      { field: 'tag', show: 'track_tagid', columns: ['track_tagid'], rule: 'partial tag {id, frame}, only when set' },
    ],
  },
  {
    key: 'detections', label: 'Detections', suffixes: ['.detections.csv'],
    required: ['frame', 'detection_id', 'bbox_x', 'bbox_y', 'bbox_width', 'bbox_height'],
    optional: PART_COLS,
    loader: 'detections',
    note: 'raw detections, before tracking',
    mapping: [
      { field: 'id', show: 'detection_id', columns: ['detection_id'], rule: '' },
      { field: 'frame', show: 'frame', columns: ['frame'], rule: '' },
      { field: 'position', show: 'bbox_x, bbox_y, bbox_width, bbox_height', columns: ['bbox_x', 'bbox_y', 'bbox_width', 'bbox_height'],
        rule: 'x, y, width, height; cx, cy derived (x+width/2, y+height/2)' },
      { field: 'angle', show: '(none)', columns: [], rule: '0' },
      M_PARTS,
    ],
  },
  {
    key: 'pollentag', label: 'Pollen/tag boxes', suffixes: ['.pollentag.csv'],
    required: ['frame', 'det_id', 'track_id', 'cls', 'conf', 'x1', 'y1', 'x2', 'y2'],
    optional: [],
    loader: null, note: 'pollen/tag detector boxes on the crops',
  },
  {
    key: 'packets', label: 'Video packets', suffixes: ['.packets.csv'],
    required: ['frame', 'pts', 'pts_time'],
    optional: [],
    loader: null, note: 'video packet timestamps',
  },
];

/**
 * The loading table of `schema` applied to a file with these `columns`: rows {field, show, rule, status}, where
 * status is 'ok' (all its columns are in the file), 'partial', or 'absent' (none), plus a last row `ignored` with
 * the columns of the file used by no row. Null when the schema has no mapping (no loader).
 */
export function mappingTable(schema, columns) {
  if (!schema || !schema.mapping) return null;
  const have = new Set(columns);
  const used = new Set();
  const rows = schema.mapping.map(m => {
    m.columns.forEach(c => used.add(c));
    const n = m.columns.filter(c => have.has(c)).length;
    const status = m.columns.length === 0 || n === m.columns.length ? 'ok' : n === 0 ? 'absent' : 'partial';
    return { field: m.field, show: m.show, rule: m.rule, status };
  });
  const ignored = columns.filter(c => !used.has(c));
  rows.push({ field: 'ignored', show: ignored.join(', ') || '(none)', rule: '', status: 'ok' });
  return rows;
}

export function schemaByKey(key) {
  return SCHEMAS.find(s => s.key === key) || null;
}

/** Categories for a filter menu: [{key, label, loadable}] */
export function categories() {
  return SCHEMAS.map(s => ({ key: s.key, label: s.label, loadable: s.loader != null }));
}

function basename(uri) {
  const clean = String(uri).split(/[?#]/)[0];
  return decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1));
}

function suffixLength(schema, filename) {
  const name = filename.toLowerCase();
  let best = 0;
  for (const suf of schema.suffixes) {
    if (name.endsWith(suf) && suf.length > best) best = suf.length;
  }
  return best;
}

/** Schema announced by the file name alone (longest suffix wins), or null. Not a CSV: null. */
export function classifyFilename(uri) {
  const filename = basename(uri);
  let best = null, bestLen = 0;
  for (const s of SCHEMAS) {
    const len = suffixLength(s, filename);
    if (len > bestLen) { best = s; bestLen = len; }
  }
  return best;
}

/** Split the header line of a CSV (comma separated, optional double quotes, optional BOM). */
export function parseHeaderLine(line) {
  const text = String(line).replace(/^﻿/, '').replace(/\r?\n.*$/s, '');
  const cols = [];
  let cur = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return cols.map(c => c.trim());
}

/** Required columns of `schema` missing from `columns`, and the optional ones present. */
export function checkColumns(schema, columns) {
  const have = new Set(columns);
  return {
    missing: schema.required.filter(c => !have.has(c)),
    optionalPresent: schema.optional.filter(c => have.has(c)),
  };
}

/**
 * Detect the schema of a file from its name and its columns.
 * Returns {filename, bySuffix, byColumns, chosen, status, missing, optionalPresent, message}:
 *  - bySuffix: schema announced by the suffix (or null); byColumns: all schemas whose required columns are
 *    present, most specific first (most required columns).
 *  - chosen: what would be loaded: the suffix schema when it validates, otherwise the most specific
 *    column match that has a loader, otherwise the suffix schema or the best column match, otherwise null.
 *  - status: 'ok' (suffix schema validates), 'invalid' (suffix schema, columns missing), 'by-columns' (no
 *    usable suffix schema, but the columns match another one) or 'unknown'.
 *  - canLoad: chosen has a loader and the columns validate against it.
 */
export function detectSchema(uri, columns) {
  const filename = basename(uri);
  const bySuffix = classifyFilename(uri);
  const byColumns = SCHEMAS
    .filter(s => checkColumns(s, columns).missing.length === 0)
    .sort((a, b) => b.required.length - a.required.length);

  let chosen = null, status = 'unknown';
  if (bySuffix && checkColumns(bySuffix, columns).missing.length === 0) {
    chosen = bySuffix; status = 'ok';
  } else {
    const alt = byColumns.find(s => s.loader != null) || byColumns[0] || null;
    if (alt) { chosen = alt; status = 'by-columns'; }
    if (bySuffix && !alt) { chosen = bySuffix; status = 'invalid'; }
    else if (bySuffix && alt) status = 'by-columns';
  }

  const check = chosen ? checkColumns(chosen, columns) : { missing: [], optionalPresent: [] };
  const suffixCheck = bySuffix ? checkColumns(bySuffix, columns) : null;
  const canLoad = chosen != null && chosen.loader != null && check.missing.length === 0;

  let message;
  if (status === 'ok') message = 'Columns match "' + chosen.label + '".';
  else if (status === 'invalid') message = 'Suffix says "' + bySuffix.label + '" but required columns are missing: ' + suffixCheck.missing.join(', ') + '.';
  else if (status === 'by-columns') {
    message = (bySuffix
      ? 'Suffix says "' + bySuffix.label + '" (missing: ' + suffixCheck.missing.join(', ') + '), but the columns match "' + chosen.label + '".'
      : 'Unknown suffix, but the columns match "' + chosen.label + '".');
  } else message = 'Not a recognized schema (no known suffix, no matching columns).';
  if (chosen && chosen.loader == null) message += ' No loader yet for this type.';

  return {
    filename, columns, bySuffix, byColumns, chosen, status, canLoad,
    missing: check.missing, optionalPresent: check.optionalPresent, message,
    mapping: mappingTable(chosen, columns),
  };
}

/**
 * Read the header line of a CSV from a URL without downloading the whole file: reads the stream until the
 * first newline, then cancels it.
 */
export async function fetchCsvHeader(uri, maxBytes = 65536) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText + ' for ' + uri);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (text.indexOf('\n') < 0 && text.length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return parseHeaderLine(text);
}

/** fetchCsvHeader + detectSchema */
export async function inspectUri(uri) {
  const columns = await fetchCsvHeader(uri);
  return detectSchema(uri, columns);
}
