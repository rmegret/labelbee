// Adapts the ES module annotation/AnnotationCodec.js to the {fns, rec} shape used by run-case.js.
// Connects it like the page bridge (AnnotationCodecBridge.js): alert/console recorded through the Notifier, logging.io on.
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const { makeRecorder, FUNCTIONS } = require('./stubs');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const urlOf = (rel) => pathToFileURL(path.join(JS_DIR, rel)).href;

// Async because the modules are ESM; returns a sync factory usable by runCase.
async function loadNewImpl() {
  const codec = await import(urlOf('annotation/AnnotationCodec.js'));
  const { setNotifier, logging } = await import(urlOf('core/Notifier.js'));
  return function makeNewImpl({ logIO = true } = {}) {
    const { rec, stubs } = makeRecorder();
    setNotifier({ alert: stubs.alert, log: stubs.log, logError: stubs.error });
    logging.io = logIO;
    const fns = {};
    for (const n of FUNCTIONS) {
      if (typeof codec[n] !== 'function') throw new Error('AnnotationCodec does not export ' + n);
      fns[n] = codec[n];
    }
    return { fns, rec };
  };
}

module.exports = { loadNewImpl };
