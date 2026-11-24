// Environment for the slice 3 golden tests (ADR 0005): the REAL loadTracks/loadTags/loaders of
// Load.js, FileImport.js, ServerIO.js and core/Alerts.js (AnnotationIO.js until slice 8 step 6b) evaluated in a `vm` with the page APIs stubbed (jQuery, d3, FileReader, views, Date).
// The functions stay the same code before and after each step of slice 8 (they moved to modules in steps 6b and 6c), so the same golden checks
// them; since step 2 the data lives in a fresh
// AnnotationStore per case (the bridge installs `AnnotationStore` and `events`; there are no data globals any more).
// Every effect on the outside is recorded in order in `rec.fx`.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { makeRecorder } = require('./stubs');
const { ser } = require('./serialize');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const urlOf = (rel) => pathToFileURL(path.join(JS_DIR, rel)).href;
const FIXED_DATE = '2000-01-02T03:04:05.000Z';

// form/EventsNotes.js: updateEventsNotes (slice 8 step 13a); the erase and prompt handlers are in Load.js and ServerIO.js since the same step
const IO_SOURCES = ['annotation/Load.js', 'annotation/FileImport.js', 'io/LocalFile.js', 'io/ServerIO.js', 'annotation/ServerIO.js', 'core/Alerts.js', 'form/EventsNotes.js'];
const IO_FUNCTIONS = [
  'loadTracks', 'eraseEvents', 'loadEventsFromFile',
  'eraseTags', 'loadTags', 'loadTagsFromFile', 'loadEventsFromServerByID',
  'eventsFromServer', 'loadTracksCSVFromDB', 'loadCSVFromRows', 'loadCSVFromServer',
  'clickLoadTracksCSVFromServer', 'clickLoadTracksTaggedCSVFromServer',
  'tagsFromServer', 'mainAlert', 'showAjaxError', 'updateEventsNotes',
  // loader helpers (slice 3 step 4)
  'readFileAsText', 'ajaxGetJSON', 'getJSONPromise', 'fetchCSVRows', 'loadTracksFromText', 'loadTagsFromText',
  // load errors (slice 3 step 5, Q23)
  'escapeHTML', 'showLoadError', 'reportLoadError',
];
const CODEC_FUNCTIONS = [
  'sanitizeEvents', 'tagsAddFrames', 'decodeTags', 'db_to_json', 'tracks_csv_to_json', 'tags_csv_to_json',
  'tags_csv_to_tagjson', 'tracks_tagged_csv_to_json', 'events_csv_to_json', 'detections_csv_to_json',
];

// Top-level function: from its `function` line to the first line that is exactly `}`.
function extractTopLevel(src, name) {
  const m = new RegExp('\\n(?:export )?((?:async )?function ' + name + '\\()').exec(src);
  if (!m) throw new Error('function not found: ' + name);
  const start = m.index + m[0].length - m[1].length;
  const end = src.indexOf('\n}\n', start);
  return src.slice(start, end + 3);
}

// Chainable jQuery stub: every method call is recorded as ['$', selector, method, args...].
function makeJQuery(rec, net, ctx) {
  const chain = (sel) => new Proxy(function () {}, {
    get: (_, m) => {
      if (m === 'find') return (s) => chain(sel + ' > ' + s);
      // case.visible: {selector: true} for the elements that are on screen
      if (m === 'is') return (q) => { rec.fx.push(['$', sel, 'is', q]); return !!(net.visible && net.visible[sel]); };
      // jQuery data() of an element that was never made a bootstrap modal: undefined (mainAlert reads bs.modal)
      if (m === 'data') return (...a) => { rec.fx.push(['$', sel, 'data', ...a.map(ser)]); return undefined; };
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

// d3.csv stub: a real Promise. A rejection nobody handles is recorded by run-io-case (unhandledRejection).
function makeD3(rec, net) {
  return {
    csv: (url) => {
      rec.fx.push(['csv', url]);
      return net.csv && net.csv.ok !== undefined ? Promise.resolve(net.csv.ok) : Promise.reject(new Error('csv'));
    },
  };
}

// Async: loads the ES modules once; returns a sync factory (case) -> env.
async function loadIoEnv() {
  const codec = await import(urlOf('annotation/AnnotationCodec.js'));
  const { classifyFilename } = await import(urlOf('annotation/CsvSchemas.js'));
  const { setNotifier, logging } = await import(urlOf('core/Notifier.js'));
  const { createAnnotationStore } = await import(urlOf('annotation/AnnotationStore.js'));
  const { installLegacyGlobals } = await import(urlOf('annotation/AnnotationStoreBridge.js'));
  // Since slice 8 steps 6b and 6c the functions are in ES modules; they are evaluated here as strict scripts (what a module is),
  // without their import and export keywords, over the stubs below.
  const src = IO_SOURCES.map((f) => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
  const code = '"use strict";\n' + IO_FUNCTIONS.map((n) => extractTopLevel(src, n)).join('\n');

  return function makeEnv(c) {
    const { rec, stubs } = makeRecorder();
    rec.fx = []; rec.cbErrors = []; rec.rejections = [];
    setNotifier({ alert: stubs.alert, log: stubs.log, logError: stubs.error });
    logging.io = false;
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
      // the views are refreshed through the page's `refresh` (RefreshBridge.js); the steps are recorded under the names of the page
      refresh: { chrono: () => fx('refreshChronogram'), frame: () => fx('onFrameChanged') },
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
      adjustChronogramHeight: () => fx('adjustChronogramHeight'),
    };
    CODEC_FUNCTIONS.forEach((n) => { sandbox[n] = codec[n]; });
    sandbox.classifyFilename = classifyFilename;
    const ctx = vm.createContext(sandbox);
    installLegacyGlobals(ctx, createAnnotationStore());
    ctx.$ = makeJQuery(rec, net, ctx);
    vm.runInContext(code, ctx, { filename: 'Load.js+FileImport.js+LocalFile.js+io/ServerIO.js+ServerIO.js+Alerts.js(extracted)' });
    writeState(ctx, c.init || {});
    return { ctx, rec, fns: ctx };
  };
}

// State access: the globals of the context. What a case does not give is undefined (as before the store
// existed), not the store's defaults.
// The stored events and the tags are no longer page globals (slice 4 step 5): they are read and set through the
// store, under the same names, so the golden keys do not change.
function writeState(ctx, init) {
  const store = ctx.AnnotationStore;
  store.replaceTracks(init.Tracks, init.TracksInfo);
  store.replaceTags(init.Tags, init.TagsInfo);
}
function readState(ctx) {
  const store = ctx.AnnotationStore;
  return {
    Tracks: ser(store.events.toObject()),
    TracksInfo: ser(store.events.info),
    Tags: ser(store.getTags()),
    TagsInfo: ser(store.getTagsInfo()),
    tagsHaveDM: ser(store.getTagsHaveDM()),
  };
}

module.exports = { loadIoEnv, readState, extractTopLevel, IO_FUNCTIONS, FIXED_DATE };
