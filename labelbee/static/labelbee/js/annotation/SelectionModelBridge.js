/*
 * Bridge between the classic scripts and the ES module SelectionModel.js (refactor slice 6, ADR 0009 section 0b): builds the
 * page's `window.selection`. AnnotationStoreBridge.js runs before this one and defines `window.events`.
 */
import { SelectionModel } from './SelectionModel.js';

export const selection = new SelectionModel(window.events);
window.selection = selection; // the modules import `selection` from here; the classic scripts read the global
