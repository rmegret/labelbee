/*
 * Bridge between the classic scripts and the ES module EventTree.js: exposes the namespace `EventTree`
 * (used by updateEventTree in SelectionControl.js).
 */
import * as EventTree from './EventTree.js';

window.EventTree = EventTree;
