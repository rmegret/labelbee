// Environment for the slice 3 golden tests (ADR 0005): the REAL setTracks/setTags/loaders of
// AnnotationIO.js evaluated in a `vm` with the page APIs stubbed (jQuery, d3, FileReader, views, Date).
// The AnnotationIO.js functions stay in that file during the whole slice, so the same golden checks
// the code before and after each step. Since step 2 the page globals Tracks, TracksInfo, Tags, TagsInfo and
// tagsHaveDM are the accessors of AnnotationStoreBridge.js over a fresh AnnotationStore per case.
// Every effect on the outside is recorded in order in `rec.fx`.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { makeRecorder, makeHasLabel } = require('./stubs');
const { ser } = require('./serialize');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const urlOf = (rel) => pathToFileURL(path.join(JS_DIR, rel)).href;
const FIXED_DATE = '2000-01-02T03:04:05.000Z';

const IO_FUNCTIONS = [
  'setTracks', 'setEventsProp', 'eraseEvents', 'onReaderLoad', 'loadEventsFromFile0', 'loadEventsFromFile',
  'eraseTags', 'setTags', 'onTagsReaderLoad', 'loadTagsFromFile', 'loadEventsFromServerByID',
  'eventsFromServer', 'loadTracksCSVFromDB', 'loadTracksCSVFromServer', 'loadTagsCSVFromServer',
  'loadTrackTaggedCSVFromServer', 'clickLoadTracksCSVFromServer', 'clickLoadTracksTaggedCSVFromServer',
  'tagsFromServer', 'mainAlert', 'showAjaxError', 'updateEventsNotes',
  // loader helpers (slice 3 step 4)
  'readFileAsText', 'ajaxGetJSON', 'getJSONPromise', 'eventsFromText', 'tagsFromText',
];
const CODEC_FUNCTIONS = [
  'sanitizeEvents', 'tagsAddFrames', 'decodeTags', 'db_to_json', 'tracks_csv_to_json', 'tags_csv_to_json',
  'tags_csv_to_tagjson', 'tracks_tagged_csv_to_json',
];
const STATE_NAMES = ['Tracks', 'TracksInfo', 'Tags', 'TagsInfo', 'tagsHaveDM', 'ttags'];

// Top-level function: from its `function` line to the first line that is exactly `}`.
function extractTopLevel(src, name) {
  const m = new RegExp('\\n((?:async )?function ' + name + '\\()').exec(src);
  if (!m) throw new Error('function not found: ' + name);
  const start = m.index + 1;
  const end = src.indexOf('\n}\n', start);
  return src.slice(start, end + 3);
}

// Chainable jQuery stub: every method call is recorded as ['$', selector, method, args...].
function makeJQuery(rec, net, ctx) {
  const chain = (sel) => new Proxy(function () {}, {
    get: (_, m) => {
      if (m === 'find') return (s) => chain(sel + ' > ' + s);
      if (m === 'val') return (...a) => { rec.fx.push(['$', sel, 'val', ...a.map(ser)]); return ''; };
      return (...a) => { rec.fx.push(['$', sel, String(m), ...a.map(ser)]); return chain(sel); };
    },
  });
  // A throwing callback is recorded by error name (real jQuery lets it propagate to the event loop).
  const guard = (f, ...a) => {
    try { return f(...a); } catch (e) { rec.cbErrors.push(e && e.name); }
  };
  const $ = (sel) => chain(String(sel));
  $.ajax = (o) => {
    rec.fx.push(['ajax', o.type, o.url]);
    if (net.ajax && net.ajax.ok !== undefined) guard(o.success, net.ajax.ok);
    else if (net.ajax && net.ajax.err) guard(o.error, { responseText: 'RT' }, 'ST', 'ET');
  };
  $.get = (url, cb) => {
    rec.fx.push(['get', url]);
    const fail = [];
    const jq = { fail: (f) => { fail.push(f); return jq; } };
    if (net.get && net.get.ok !== undefined) { if (cb) guard(cb, net.get.ok); } else Promise.resolve().then(() => fail.forEach((f) => guard(f)));
    return jq;
  };
  // jQuery runs the callbacks later: success, then .done / .fail in registration order.
  $.getJSON = (url, cb) => {
    rec.fx.push(['getJSON', url]);
    const done = cb ? [cb] : []; const fail = [];
    const jq = { fail: (f) => { fail.push(f); return jq; }, done: (f) => { done.push(f); return jq; } };
    Promise.resolve().then(() => {
      if (net.getJSON && net.getJSON.ok !== undefined) done.forEach((f) => guard(f, net.getJSON.ok));
      else fail.forEach((f) => guard(f));
    });
    return jq;
  };
  return $;
}

// d3.csv stub: a real Promise wrapped so that a rejection nobody handles is recorded, not fatal.
function makeD3(rec, net) {
  return {
    csv: (url) => {
      rec.fx.push(['csv', url]);
      const p = net.csv && net.csv.ok !== undefined ? Promise.resolve(net.csv.ok) : Promise.reject(new Error('csv'));
      return {
        then: (a, b) => {
          const q = p.then(a, b);
          q.catch((e) => rec.rejections.push(e && e.name));
          return q;
        },
      };
    },
  };
}

// Async: loads the ES modules once; returns a sync factory (case) -> env.
async function loadIoEnv() {
  const codec = await import(urlOf('annotation/AnnotationCodec.js'));
  const { setNotifier, logging } = await import(urlOf('core/Notifier.js'));
  const { createAnnotationStore } = await import(urlOf('annotation/AnnotationStore.js'));
  const { installLegacyGlobals } = await import(urlOf('annotation/AnnotationStoreBridge.js'));
  const src = fs.readFileSync(path.join(JS_DIR, 'AnnotationIO.js'), 'utf8');
  const code = IO_FUNCTIONS.map((n) => extractTopLevel(src, n)).join('\n');

  return function makeEnv(c) {
    const { rec, stubs } = makeRecorder();
    rec.fx = []; rec.cbErrors = []; rec.rejections = [];
    setNotifier({ alert: stubs.alert, log: stubs.log, logError: stubs.error });
    logging.io = false;
    codec.configure({ hasLabel: makeHasLabel() });
    const net = c.net || {};
    const fx = (...a) => rec.fx.push(a.map(ser));
    function FileReader() {}
    FileReader.prototype.readAsText = function (file) {
      fx('readAsText');
      Promise.resolve().then(() => {
        try { this.onload({ target: { result: file.text } }); } catch (e) { rec.cbErrors.push(e && e.name); }
      });
    };
    function FixedDate() {}
    FixedDate.prototype.toISOString = () => FIXED_DATE;

    const sandbox = {
      console: { log: stubs.log, error: stubs.error },
      alert: stubs.alert,
      confirm: () => { fx('confirm'); return c.confirm !== false; },
      prompt: (...a) => { fx('prompt', ...a); return c.prompt; },
      Date: FixedDate,
      performance: { now: () => 0 },
      logging: { io: false },
      url_for: (p) => 'URL:' + p,
      jQuery: { isEmptyObject: (o) => { for (const _ in o) return false; return true; } }, // eslint-disable-line
      d3: makeD3(rec, net),
      FileReader,
      // sql.js-like database: one result table, the SQL sent is recorded
      db: {
        exec: (sql) => {
          fx('db.exec', sql);
          return [{ columns: ['frame', 'id', 'cx', 'cy', 'angle', 'width', 'height', 'x', 'y'],
            values: [[0, '1', 10, 20, 100, 300, 600, -140, -280], [3, '1', 12, 22, 102, 300, 600, -138, -278]] }];
        },
      },
      videoControl: { onFrameChanged: () => fx('onFrameChanged') },
      videoManager: { loadVideoManual: (u) => fx('loadVideoManual', u) },
      statusWidget: {
        statusRequest: (...a) => fx('statusRequest', ...a),
        statusUpdate: (...a) => fx('statusUpdate', ...a),
      },
      // `basedOn` (lineage of the next save, BEH-730) is recorded as an effect when it is assigned
      fromServerDialog: Object.defineProperty({ setMessage: (...a) => fx('setMessage', ...a) }, 'basedOn', {
        get: () => undefined, set: (v) => fx('basedOn', v), enumerable: true,
      }),
      theDialog: {},
      refreshChronogram: () => fx('refreshChronogram'),
      adjustChronogramHeight: () => fx('adjustChronogramHeight'),
      // Called with the Tags at that moment: shows what setTags builds ttags from (DEBT-736).
      getTTags: () => { fx('getTTags', Object.keys(ctx.Tags || {})); return { stub: 'ttags' }; },
    };
    CODEC_FUNCTIONS.forEach((n) => { sandbox[n] = codec[n]; });
    const ctx = vm.createContext(sandbox);
    installLegacyGlobals(ctx, createAnnotationStore());
    vm.runInContext('var ttags;', ctx); // declared in the page by ChronoControl.js (`var ttags = {}`)
    ctx.$ = makeJQuery(rec, net, ctx);
    vm.runInContext(code, ctx, { filename: 'AnnotationIO.js(extracted)' });
    writeState(ctx, c.init || {});
    return { ctx, rec, fns: ctx };
  };
}

// State access: the globals of the context. What a case does not give is undefined (as before the store
// existed), not the store's defaults; `ttags` is not store data and stays a plain global.
function writeState(ctx, init) {
  for (const k of STATE_NAMES) if (k in init || k !== 'ttags') ctx[k] = init[k];
}
function readState(ctx) {
  const out = {};
  for (const k of STATE_NAMES) out[k] = ser(vm.runInContext('typeof ' + k + " === 'undefined' ? undefined : " + k, ctx));
  return out;
}

module.exports = { loadIoEnv, readState, extractTopLevel, IO_FUNCTIONS, FIXED_DATE };
