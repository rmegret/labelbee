// Synthetic fixtures (Q8) for loadTracks/loadTags and the loaders of AnnotationIO.js (slice 3, ADR 0005).
// Case: {name, fn, args(), init?, net?, confirm?, prompt?, pinReturn?}. `args` builds FRESH inputs per run.
// net: {ajax|getJSON|get: {ok: payload} | {err: true}, csv: {ok: rows} | {err: true}, visible: {selector: true}
// for the elements on screen (the from-server dialog)}; file text is given by the event (`files[0].text`,
// `target.result`).
'use strict';

const INFO_EVENTS = { type: 'events-multiframe', source: 'synthetic' };
const INFO_TAGS = { type: 'tags-multiframe', source: 'synthetic' };
const evt = (id, extra = {}) => ({ id, cx: 10, cy: 20, angle: 30, width: 5, height: 6, x: 1, y: 2, ...extra });
const v2 = (extra = {}) => ({ info: { ...INFO_EVENTS, ...extra }, data: { 0: [evt(1), evt(2)], 4: [evt(1)] } });
const v1 = () => ({ 0: { 1: evt(1, { labels: 'pollen' }) }, 5: {} });
const tagsV1 = () => ({ 0: { tags: [{ id: 5, dm: 60 }, { id: 6, dm: 55 }] }, 3: { tags: [{ id: 5, dm: 59 }] } });
const tagsV1NoDM = () => ({ 1: { tags: [{ id: 7 }] } });
const tagsV2 = () => ({ info: { ...INFO_TAGS }, data: tagsV1() });

const csvTrack = (frame, track_id, extra = {}) => ({
  frame: String(frame), track_id: String(track_id), cx: '100.5', cy: '200', angle: '10',
  head_visibility: '1', head_x: '1', head_y: '2', neck_visibility: '0', neck_x: '3', neck_y: '4',
  thorax_visibility: '2', thorax_x: '5', thorax_y: '6', waist_visibility: '0', waist_x: '', waist_y: '',
  tail_visibility: '1', tail_x: '7', tail_y: '8', ...extra,
});
const csvTag = (pre) => ({
  [pre + 'cx']: '11', [pre + 'cy']: '12', [pre + 'hamming']: '0', [pre + 'goodness']: '45.5', [pre + 'dm']: '60',
  [pre + 'p0x']: '1', [pre + 'p0y']: '2', [pre + 'p1x']: '3', [pre + 'p1y']: '4',
  [pre + 'p2x']: '5', [pre + 'p2y']: '6', [pre + 'p3x']: '7', [pre + 'p3y']: '8',
});
const text = (o) => JSON.stringify(o);
const file = (o) => ({ target: { files: [{ name: 'f.json', text: typeof o === 'string' ? o : text(o) }], value: 'C:\\f.json' } });
const read = (s) => ({ target: { result: typeof s === 'string' ? s : text(s) } });
const OLD_TRACKS = () => ({ 9: { 9: evt(9) } });
const OLD_INFO = () => ({ ...INFO_EVENTS, source: 'old', notes: 'old notes' });
const OLD = () => ({ Tracks: OLD_TRACKS(), TracksInfo: OLD_INFO() });

const cases = [
  // ---- loadTracks (apply: store write, notes, refresh) ----
  { name: 'loadTracks v2', fn: 'loadTracks', pinReturn: true, args: () => [v2({ notes: 'my notes' })], init: OLD() },
  { name: 'loadTracks v2 skipRefresh', fn: 'loadTracks', pinReturn: true, args: () => [v2(), true] },
  { name: 'loadTracks v1 object', fn: 'loadTracks', pinReturn: true, args: () => [v1()] },
  { name: 'loadTracks v1 array', fn: 'loadTracks', pinReturn: true, args: () => [[{ 3: evt(3) }]] },
  { name: 'loadTracks empty array (erase)', fn: 'loadTracks', pinReturn: true, args: () => [[]], init: OLD() },
  { name: 'loadTracks wrong format keeps the model', fn: 'loadTracks', pinReturn: true, args: () => [{ a: 1 }], init: OLD() },
  { name: 'loadTracks wrong info.type keeps the model', fn: 'loadTracks', pinReturn: true, args: () => [{ info: INFO_TAGS, data: {} }], init: OLD() },
  { name: 'loadTracks null is rejected with the unsupported-format message (DEBT-710)', fn: 'loadTracks', pinReturn: true, args: () => [null], init: OLD() },
  { name: 'loadTracks number is rejected (DEBT-710)', fn: 'loadTracks', pinReturn: true, args: () => [5], init: OLD() },
  { name: 'loadTracks v2 duplicate ids alerts', fn: 'loadTracks', pinReturn: true, args: () => [{ info: INFO_EVENTS, data: { 0: [evt(1), evt(1)] } }] },
  { name: 'loadTracks v2 without data replaces by empty (DEBT-734)', fn: 'loadTracks', pinReturn: true, args: () => [{ info: INFO_EVENTS }], init: OLD() },
  { name: 'eraseEvents confirmed', fn: 'eraseEvents', args: () => [], confirm: true, init: OLD() },
  { name: 'eraseEvents canceled', fn: 'eraseEvents', args: () => [], confirm: false, init: OLD() },

  // ---- local events file ----
  { name: 'loadEventsFromFile v2', fn: 'loadEventsFromFile', args: () => [file(v2())] },
  { name: 'loadEventsFromFile invalid JSON', fn: 'loadEventsFromFile', args: () => [file('{not json')], init: OLD() },
  { name: 'loadEventsFromFile wrong format is an error shown to the user (Q23)', fn: 'loadEventsFromFile', args: () => [file({ a: 1 })], init: OLD() },
  { name: 'loadEventsFromFile error text is escaped (Q23)', fn: 'loadEventsFromFile', args: () => [file('<img src=x onerror=alert(1)>')], init: OLD() },
  { name: 'loadEventsFromFile canceled', fn: 'loadEventsFromFile', args: () => [{ target: { files: [], value: 'x' } }] },

  // ---- loadTags (decode + apply) ----
  { name: 'loadTags v1 with dm', fn: 'loadTags', pinReturn: true, args: () => [tagsV1()], init: { Tags: {} } },
  { name: 'loadTags v1 without dm', fn: 'loadTags', pinReturn: true, args: () => [tagsV1NoDM()], init: { Tags: {} } },
  { name: 'loadTags v1 empty object', fn: 'loadTags', pinReturn: true, args: () => [{}], init: { Tags: tagsV1() } },
  { name: 'loadTags v1 bad key is rejected whatever the previous Tags (DEBT-713)', fn: 'loadTags', pinReturn: true, args: () => [{ a: { tags: [] } }], init: { Tags: {} } },
  { name: 'loadTags v1 bad key among good ones is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ 0: { tags: [] }, b: { tags: [] } }], init: { Tags: tagsV1() } },
  { name: 'loadTags v1 good keys are accepted whatever the previous Tags (DEBT-713)', fn: 'loadTags', pinReturn: true, args: () => [tagsV1()], init: { Tags: { a: { tags: [] } } } },
  { name: 'loadTags v2', fn: 'loadTags', pinReturn: true, args: () => [tagsV2()], init: { Tags: {} } },
  { name: 'loadTags v2 wrong info.type', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_EVENTS, data: {} }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 without data is rejected, Tags kept (DEBT-733)', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 data null is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: null }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 data not an object is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: 'abc' }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 frame without tags is rejected, Tags kept (DEBT-733)', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: { 0: {} } }], init: { Tags: tagsV1(), TagsInfo: { type: 'tags-multiframe', source: 'old' } } },
  { name: 'loadTags v2 frame tags not an array is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: { 0: { tags: 5 } } }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 later frame without tags is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: { 0: { tags: [] }, 1: { tags: null } } }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 tag not an object is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: { 0: { tags: [{ id: 1 }, 7] } } }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 null frame is rejected (DEBT-733)', fn: 'loadTags', pinReturn: true, args: () => [{ info: INFO_TAGS, data: { 0: null } }], init: { Tags: tagsV1() } },
  { name: 'loadTags v2 info null is rejected', fn: 'loadTags', pinReturn: true, args: () => [{ info: null, data: {} }], init: { Tags: tagsV1() } },
  { name: 'loadTags null is rejected (DEBT-710)', fn: 'loadTags', pinReturn: true, args: () => [null], init: { Tags: tagsV1() } },
  { name: 'loadTags undefined is rejected (DEBT-710)', fn: 'loadTags', pinReturn: true, args: () => [undefined], init: { Tags: tagsV1() } },
  { name: 'loadTags number is rejected (DEBT-710)', fn: 'loadTags', pinReturn: true, args: () => [5], init: { Tags: tagsV1() } },
  { name: 'loadTags string is rejected', fn: 'loadTags', pinReturn: true, args: () => ['abc'], init: { Tags: tagsV1() } },
  { name: 'loadTags array', fn: 'loadTags', pinReturn: true, args: () => [[]], init: { Tags: {} } },
  { name: 'eraseTags confirmed', fn: 'eraseTags', args: () => [], confirm: true, init: { Tags: tagsV1() } },
  { name: 'eraseTags canceled', fn: 'eraseTags', args: () => [], confirm: false, init: { Tags: tagsV1() } },

  // ---- local tags file ----
  { name: 'loadTagsFromFile v2', fn: 'loadTagsFromFile', args: () => [file(tagsV2())], init: { Tags: {} } },
  { name: 'loadTagsFromFile rejected format is an error shown to the user (Q23)', fn: 'loadTagsFromFile', args: () => [file({ info: INFO_EVENTS, data: {} })], init: { Tags: tagsV1() } },
  { name: 'loadTagsFromFile canceled', fn: 'loadTagsFromFile', args: () => [{ target: { files: [], value: 'x' } }] },

  // ---- server: events ----
  { name: 'eventsFromServer ok', fn: 'eventsFromServer', args: () => ['/some/url'], net: { ajax: { ok: v2() } } },
  { name: 'eventsFromServer wrong format keeps the model', fn: 'eventsFromServer', args: () => ['/some/url'], net: { ajax: { ok: { a: 1 } } }, init: OLD() },
  { name: 'eventsFromServer error', fn: 'eventsFromServer', args: () => ['/some/url'], net: { ajax: { err: true } } },
  { name: 'loadEventsFromServerByID ok sets the lineage (DEBT-722)', fn: 'loadEventsFromServerByID', args: () => [12], net: { ajax: { ok: { data: { data: text(v2()) } } } } },
  { name: 'loadEventsFromServerByID wrong format shows the error and rejects (DEBT-722)', fn: 'loadEventsFromServerByID', args: () => [12], net: { ajax: { ok: { data: { data: text({ a: 1 }) } } } }, init: OLD() },
  { name: 'loadEventsFromServerByID request error with the dialog open writes in the dialog (Q23)', fn: 'loadEventsFromServerByID', args: () => [12], net: { ajax: { err: true }, visible: { '#from-server-dialog': true } } },
  { name: 'loadEventsFromServerByID request error shows the error and rejects (DEBT-722)', fn: 'loadEventsFromServerByID', args: () => [12], net: { ajax: { err: true } } },

  // ---- server: tags ----
  { name: 'tagsFromServer ok', fn: 'tagsFromServer', args: () => ['T1', 'div'], net: { getJSON: { ok: { data: { data: tagsV2() } } } }, init: { Tags: {} } },
  { name: 'tagsFromServer null data', fn: 'tagsFromServer', args: () => ['T1', 'div'], net: { getJSON: { ok: { data: { data: null } } } }, init: { Tags: tagsV1() } },
  { name: 'tagsFromServer failure empties Tags (DEBT-719)', fn: 'tagsFromServer', args: () => ['T1', 'div'], net: { getJSON: { err: true } }, init: { Tags: tagsV1() } },

  // ---- CSV, DB ----
  { name: 'loadTracksCSVFromServer ok', fn: 'loadCSVFromServer', args: () => ['/t.csv'], net: { csv: { ok: [csvTrack(0, 1), csvTrack(3, 1)] } } },
  { name: 'loadTracksCSVFromServer request failure (unhandled)', fn: 'loadCSVFromServer', args: () => ['/t.csv'], net: { csv: { err: true } }, init: OLD() },
  { name: 'loadTracksCSVFromServer empty csv', fn: 'loadCSVFromServer', args: () => ['/t.csv'], net: { csv: { ok: [] } } },
  { name: 'loadTrackTaggedCSVFromServer ok', fn: 'loadCSVFromServer', args: () => ['/tt.csv', 'tracks_tagged'], net: { csv: { ok: [csvTrack(0, 1, { track_tagid: '42', tag_id: '42', ...csvTag('tag_') }), csvTrack(1, 2)] } } },
  { name: 'loadTagsCSVFromServer ok (Tracks then Tags)', fn: 'loadCSVFromServer', args: () => ['/g.csv', 'tags'], net: { csv: { ok: [{ ...csvTrack(0, 1), id: '12', dm: '60', ...csvTag('') }] } }, init: { Tags: {} } },
  { name: 'loadTracksCSVFromDB', fn: 'loadTracksCSVFromDB', args: () => [], init: { Tracks: OLD_TRACKS() } },
  { name: 'clickLoadTracksCSVFromServer with URL', fn: 'clickLoadTracksCSVFromServer', args: () => [], prompt: '/u.csv', net: { csv: { ok: [csvTrack(0, 1)] } } },
  { name: 'clickLoadTracksCSVFromServer canceled', fn: 'clickLoadTracksCSVFromServer', args: () => [], prompt: null },
  { name: 'clickLoadTracksCSVFromServer empty', fn: 'clickLoadTracksCSVFromServer', args: () => [], prompt: '' },
  { name: 'clickLoadTracksTaggedCSVFromServer with video', fn: 'clickLoadTracksTaggedCSVFromServer', args: () => [], prompt: 'col1/v.mp4', net: { csv: { ok: [csvTrack(0, 1)] } } },
  { name: 'clickLoadTracksTaggedCSVFromServer canceled', fn: 'clickLoadTracksTaggedCSVFromServer', args: () => [], prompt: null },
];

module.exports = { cases };
