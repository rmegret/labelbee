// Evaluates the ORIGINAL save/export functions of AnnotationIO.js in a vm with stubbed globals
// (slice 2, ADR 0004). Source of truth for the slice 2 goldens until step 3 deletes them.
// Fresh context per call. Tracks/TracksInfo/videoinfo are page globals in the old code: the wrappers
// below set them from the arguments, so cases use the same (Tracks, TracksInfo, videoinfo) signature as
// the module, and mutations of the passed objects are observable.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeRecorder, extractFunction } = require('./stubs');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const SAVE_FUNCTIONS = [
  'convertTracksToV1', 'convertTracksToV2', 'tracksToCSV', 'tracksToBBoxes', 'tracksToBBoxes2',
];
const FIXED_DATE = 'FIXED DATE';

// Returns {fns, rec}: the ORIGINAL functions, in a vm with stubbed globals.
function makeOldSaveImpl() {
  const { rec, stubs } = makeRecorder();
  const io = fs.readFileSync(path.join(JS_DIR, 'AnnotationIO.js'), 'utf8');
  const sandbox = {
    console: { log: stubs.log, error: stubs.error },
    // the old code calls Date() as a function: a string with the current time
    Date: function () { return FIXED_DATE; },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(SAVE_FUNCTIONS.map((n) => extractFunction(io, n)).join('\n'), ctx,
    { filename: 'AnnotationIO.js(extracted)' });
  const fns = {
    convertTracksToV1: (Tracks) => { ctx.Tracks = Tracks; return ctx.convertTracksToV1(); },
    convertTracksToV2: (Tracks, TracksInfo, videoinfo) => {
      ctx.Tracks = Tracks; ctx.TracksInfo = TracksInfo; ctx.videoinfo = videoinfo;
      return ctx.convertTracksToV2();
    },
    tracksToCSV: (Tracks) => ctx.tracksToCSV(Tracks),
    tracksToBBoxes: (Tracks) => ctx.tracksToBBoxes(Tracks),
    tracksToBBoxes2: (Tracks) => ctx.tracksToBBoxes2(Tracks),
  };
  return { fns, rec };
}

module.exports = { makeOldSaveImpl, SAVE_FUNCTIONS, FIXED_DATE };
