// Shared constants of the slice 2 golden tests (ADR 0004): the functions of the save side and the fixed
// string standing for Date(). The goldens were generated from the original functions of AnnotationIO.js
// (git history: commit e1831be7, harness/old-save-impl.js); step 3 deleted them.
'use strict';

const SAVE_FUNCTIONS = [
  'convertTracksToV1', 'convertTracksToV2', 'tracksToCSV', 'tracksToBBoxes', 'tracksToBBoxes2',
];
const FIXED_DATE = 'FIXED DATE';

module.exports = { SAVE_FUNCTIONS, FIXED_DATE };
