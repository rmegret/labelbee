/*
 * Bridge between the classic scripts and the ES module SelectionModel.js (refactor slice 6, ADR 0009 section 0b): builds the
 * page's `window.selection`.
 */
import { SelectionModel } from './SelectionModel.js';
import { events } from './AnnotationStore.js';

export const selection = new SelectionModel(events);
window.selection = selection; // the modules import `selection` from here; the classic scripts read the global
