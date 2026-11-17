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
  storeCheckValid: false,
  refresh: false, // echo each refresh entry to the console and record its trigger (caller); the log itself is always recorded
  tagMissCenter: true // log a tag without center (partial tag, e.g. loaded from an events CSV) instead of failing
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

/*
 * Refresh log (refactor slice 6, ADR 0009): what refreshed, in which order, how long. One entry per call of an entry point:
 * a command of the events (`store`, instant), a frame change (`frame`, instant) or a view refresh wrapped by
 * core/RefreshInstrumentBridge.js (`derived`, `chrono`, `table`, `overlay`, `zoom`, `form`: `what` is the function name).
 * Entries are pushed when the call starts (parents before children) with the nesting `depth`, the duration is set when it
 * ends. Always recorded (a ring buffer, no console output); `logging.refresh = true` also writes each entry to the
 * console and records the trigger, the function that asked for it (reads the call stack, so it costs).
 * From the console: `refreshLog`, `refreshLog.tree()` (one line, nesting in parentheses), `refreshLog.showTree()` (indented, with durations), `refreshLog.summary()`.
 */
const REFRESH_LOG_MAX = 2000;
let refreshSeq = 0;
let refreshDepth = 0;
export const refreshLog = [];
refreshLog.clear = () => { refreshLog.length = 0; };
/* `[{phase, n, ms}]`: the number of entries and the total time per phase (a nested call is counted in its own phase and
 * again in the `ms` of its parent), to compare two scenarios */
refreshLog.summary = (from = 0) => {
  const out = {};
  for (const e of refreshLog.slice(from)) {
    const r = (out[e.phase] = out[e.phase] || { phase: e.phase, n: 0, ms: 0 });
    r.n += 1;
    r.ms += e.ms;
  }
  return Object.values(out);
};
const entryLabel = (e) => (e.phase === "store" ? `store:${e.what.split(" ")[0]}` : e.what || e.phase);
/* The entries as one nested sequence: `a,b(c,d),e`; consecutive identical siblings as `xN` */
refreshLog.tree = (from = 0) => {
  const entries = refreshLog.slice(from);
  const parse = (i, depth) => {
    const items = []; // [label, count, children]
    while (i < entries.length && entries[i].depth >= depth) {
      const e = entries[i++];
      let kids = "";
      if (i < entries.length && entries[i].depth > depth) [kids, i] = parse(i, depth + 1);
      const last = items[items.length - 1];
      if (last && last[0] === entryLabel(e) && last[2] === kids) last[1] += 1;
      else items.push([entryLabel(e), 1, kids]);
    }
    return [items.map(([l, n, k]) => l + (n > 1 ? `x${n}` : "") + (k ? `(${k})` : "")).join(","), i];
  };
  return entries.length ? parse(0, entries[0].depth)[0] : "";
};

/* Prints the entries to the console, one line each, indented by 2 spaces per nesting level:
 * `seq phase what ms [trigger] total_ms`. `[trigger]` only when recorded (`logging.refresh`); `total_ms` is the sum of the `ms`
 * of the entry and of all its subtree (a recorded `ms` already includes its children's time, so this counts nested time again). */
refreshLog.showTree = (from = 0) => {
  const entries = refreshLog.slice(from);
  const base = entries.length ? entries[0].depth : 0;
  const lines = entries.map((e, i) => {
    let total = e.ms;
    for (let j = i + 1; j < entries.length && entries[j].depth > e.depth; j++) total += entries[j].ms;
    const r = (x) => Math.round(x * 100) / 100;
    return `${"  ".repeat(Math.max(0, e.depth - base))}${e.seq} ${e.phase} ${e.what} ${r(e.ms)} ${e.trigger ? `[${e.trigger}] ` : ""}${r(total)}`;
  });
  if (entries.length && !entries.some((e) => e.trigger)) lines.push("(no trigger recorded: set `logging.refresh = true` before the action)");
  console.log(lines.join("\n"));
};

/* The function that asked for a refresh: first stack frame outside the refresh machinery. Only when `logging.refresh`. */
const REFRESH_INTERNAL_FILES = /(Notifier|RefreshInstrumentBridge|annotation\/Events)\.js/;
function refreshTrigger() {
  if (!logging.refresh) return null;
  const lines = (new Error().stack || "").split("\n").slice(1);
  for (const l of lines) {
    const m = /at (?:async )?([\w$.#<>]+) \(?([^)]*?)\)?$/.exec(l.trim());
    if (!m || REFRESH_INTERNAL_FILES.test(m[2])) continue;
    return `${m[1]} (${m[2].replace(/^.*\/js\//, "")})`;
  }
  return "?";
}

function pushRefresh(phase, what) {
  const e = { seq: ++refreshSeq, t: Math.round(performance.now() * 10) / 10, depth: refreshDepth, phase, what: what == null ? "" : String(what), ms: 0, trigger: refreshTrigger() };
  refreshLog.push(e);
  if (refreshLog.length > REFRESH_LOG_MAX) refreshLog.shift();
  return e;
}
function echoRefresh(e) {
  if (logging.refresh) console.log(`refresh#${e.seq} ${"  ".repeat(e.depth)}${e.phase}${e.what ? " " + e.what : ""}${e.ms ? ` ${e.ms} ms` : ""}${e.trigger ? ` <- ${e.trigger}` : ""}`);
}

/* An instant entry (no duration) */
export function logRefresh(phase, what) {
  echoRefresh(pushRefresh(phase, what));
}

/* Runs `fn` and logs it as `phase` with its duration; entries logged while it runs are nested one level deeper. Returns its result */
export function timedRefresh(phase, what, fn) {
  const e = pushRefresh(phase, what);
  const t0 = performance.now();
  refreshDepth++;
  try {
    return fn();
  } finally {
    refreshDepth--;
    e.ms = Math.round((performance.now() - t0) * 100) / 100;
    echoRefresh(e);
  }
}
