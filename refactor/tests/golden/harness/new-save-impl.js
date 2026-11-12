// Adapts the save side of the ES module annotation/AnnotationCodec.js to the {fns, rec} shape used by
// run-case.js (slice 2, ADR 0004). Notifier recorded like the page bridge does; Date() replaced by the
// fixed string the goldens were generated with, only for the duration of each call.
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const { makeRecorder } = require('./stubs');
const { SAVE_FUNCTIONS, FIXED_DATE } = require('./save-stubs');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const urlOf = (rel) => pathToFileURL(path.join(JS_DIR, rel)).href;

function withFixedDate(fn) {
  return (...args) => {
    const RealDate = globalThis.Date;
    globalThis.Date = function () { return FIXED_DATE; };
    try { return fn(...args); } finally { globalThis.Date = RealDate; }
  };
}

// Async because the modules are ESM; returns a sync factory usable by runCase.
async function loadNewSaveImpl() {
  const codec = await import(urlOf('annotation/AnnotationCodec.js'));
  const { setNotifier, logging } = await import(urlOf('core/Notifier.js'));
  return function makeNewSaveImpl({ logIO = true } = {}) {
    const { rec, stubs } = makeRecorder();
    setNotifier({ alert: stubs.alert, log: stubs.log, logError: stubs.error });
    logging.io = logIO;
    const fns = {};
    for (const n of SAVE_FUNCTIONS) {
      if (typeof codec[n] !== 'function') throw new Error('AnnotationCodec does not export ' + n);
      fns[n] = codec[n];
    }
    fns.convertTracksToV2 = withFixedDate(codec.convertTracksToV2);
    return { fns, rec };
  };
}

module.exports = { loadNewSaveImpl };
