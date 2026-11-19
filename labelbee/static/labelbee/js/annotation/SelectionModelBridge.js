/*
 * Bridge between the classic scripts and the ES module SelectionModel.js (refactor slice 6, ADR 0009 section 0b): builds the
 * page's `window.selection`. AnnotationStoreBridge.js runs before this one and defines `window.events`.
 */
import { SelectionModel } from './SelectionModel.js';

window.selection = new SelectionModel(window.events);
