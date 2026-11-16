/*
 * Notifier: where alerts and logs of extracted modules go, and the debug-level flags that
 * switch them (refactor ADR 0003). Modules import the bare functions; the page replaces
 * the handlers once with setNotifier() and reaches `logging` through core/NotifierBridge.js.
 */

/** Debugging levels (moved from labelBee.js) */
export const logging = {
  rects: false,
  frameEvents: false,
  guiEvents: false,
  submitEvents: false,
  mouseEvents: false,
  mouseMoveEvents: false,
  keyEvents: false,
  overlay: false,
  selectionEvents: false,
  chrono: false,
  videoEvents: true,
  canvasEvents: false,
  idPrediction: false,
  axesEvents: false,
  zoomTag: false,
  zoomOverlay: false,
  videoList: true,
  io: false,
  store: false,
  storeCheckValid: false
};

const handlers = {
  alert: (msg) => {
    if (typeof globalThis.alert === "function") globalThis.alert(msg);
    else console.warn(msg);
  },
  log: (...args) => console.log(...args),
  logError: (...args) => console.error(...args),
};

export const alert = (msg) => handlers.alert(msg);
export const log = (...args) => handlers.log(...args);
export const logError = (...args) => handlers.logError(...args);
export const logIO = () => logging.io; // read at call time: the flag can change at runtime

/* Replace any subset of alert, log, logError */
export function setNotifier(newHandlers) {
  Object.assign(handlers, newHandlers);
}
