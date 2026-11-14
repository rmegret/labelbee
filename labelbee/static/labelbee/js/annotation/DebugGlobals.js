/*
 * Console-only debug globals (refactor slice 4, ADR 0007, step 5): `Tracks`, `TracksInfo` as read-only views of the
 * stored events, for inspection in the browser console and in watch expressions. Page code must not use them: the
 * accessor throws when its caller is a script (a stack frame with a URL), and allows it when the caller is the console
 * (an anonymous frame, `<anonymous>:1:1` in Chromium, `debugger eval code` in Firefox).
 *
 * Off by default. `window.installDebugGlobals()` (defined by AnnotationStoreBridge.js) turns them on from the console;
 * loading the page with `?debug_globals` does it at startup. Not part of the application: nothing in the page may
 * depend on it. The heuristic is a stack-frame test, not a security boundary.
 */

// name -> [value, what page code must use instead]
const DEBUG_GLOBALS = {
  Tracks: [(store) => store.events.toObject(), 'events (events.get, events.getFrame, events.forEach)'],
  TracksInfo: [(store) => store.events.info, 'events.info'],
};

/** Is the caller of the accessor a script? `stack` is `new Error().stack` taken in the accessor; frame 0 is the accessor. */
export function callerIsPageCode(stack) {
  const frames = String(stack)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^Error\b/.test(l));
  const caller = frames[1];
  return caller !== undefined && caller.includes('://');
}

/** Defines the debug globals on `target` (the page's window) as guarded read-only accessors over `store`. Idempotent. */
export function installDebugGlobals(target, store) {
  for (const [name, [value, instead]] of Object.entries(DEBUG_GLOBALS)) {
    Object.defineProperty(target, name, {
      get() {
        const stack = new Error().stack;
        if (callerIsPageCode(stack)) {
          const caller = String(stack).split('\n').map((l) => l.trim()).filter((l) => l && !/^Error\b/.test(l))[1];
          throw new Error(
            `${name} is a console-only debug global (annotation/DebugGlobals.js): page code must use ${instead}. Read from: ${caller}`
          );
        }
        return value(store);
      },
      set() {
        throw new Error(`${name} is a read-only debug global: use ${instead}`);
      },
      enumerable: false,
      configurable: true,
    });
  }
}

export const DEBUG_GLOBAL_NAMES = Object.keys(DEBUG_GLOBALS);
