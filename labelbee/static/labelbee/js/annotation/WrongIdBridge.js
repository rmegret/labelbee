/*
 * Bridge between the classic scripts and the ES module WrongId.js (refactor slice 5 step 5, ADR 0008):
 * exposes the namespace `WrongId` on window.
 */
import * as WrongId from './WrongId.js';

window.WrongId = WrongId;
