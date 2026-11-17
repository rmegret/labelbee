/*
 * Bridge between the classic scripts and core/Notifier.js (refactor ADR 0003): exposes the
 * debug-level flags as the global `logging`, same object, so `logging.io = true` from the
 * console or legacy code is seen by the modules. Removed when no classic script reads it.
 */
import { logging, refreshLog } from './Notifier.js';

window.logging = logging;

// Refresh log (slice 6, ADR 0009), read from the console and the tests; written by core/RefreshInstrumentBridge.js
window.refreshLog = refreshLog;
