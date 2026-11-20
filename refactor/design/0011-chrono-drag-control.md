# ADR 0011: ChronoDragControl, drag behaviors of the chronogram as pluggable modes

Status: proposed (maintainer answers 2026-11-18; off plan, follows [ADR 0010](0010-hover-control.md))

## Context

What a drag on the chronogram does is wired inside `ChronoAxes.js`: d3.zoom owns click-drag (pan), and the
Ctrl+hover preview (`setTrackFrame`) binds its own handlers by name. There is no way to choose the behavior, no touch
preview, and each behavior removes its handlers by hand, so a forgotten line leaks one.

## Decision

Two ES modules in `labelbee/static/labelbee/js/chrono/`, pure at import time (no DOM, no d3), so `node --test`
exercises them with a fake target. Strategy pattern:

- `ListenerBag.js`: records every listener it adds; `clear()` removes exactly those. A mode cannot leak. Generic,
  reusable elsewhere.
- `ChronoDragControl.js`: the `ChronoDragControl` namespace, everything else in one file:
  - `DragControl(target, modes, {initial})`: owns the current mode, `setMode(name)` detaches the old mode before
    attaching the new one, `onChange(fn)`. Modes are reached by name: `drag.modes.pan`.
  - `Mode` base (`name`, `label`, `attach(target)`, `detach()`): idempotent; subclasses fill `_attach`/`_detach` and
    add their listeners through `this.bag`.
  - `IgnoreMode` (a drag does nothing; a click still seeks), `PanMode` (today's d3.zoom drag, the default),
    `PreviewMode` (click-drag, touch-drag and Ctrl+hover preview the frame). Only `IgnoreMode` exists after step 1.
- The pop-up (a Drag button right of Fit) only calls `setMode`.

Naming: `ChronoDragControl` (capitalized) is the stateless namespace of classes. The running control has state, so
it is one instance, a singleton by convention like `videoControl`: `chronoDragControl = new
ChronoDragControl.DragControl(target, [...])`, with its modes at `chronoDragControl.modes.pan`.

The target is a narrow adapter exposed by `ChronoAxes` (the SVG element, `frameAt(event)`, `idAt(event)`, plot
bounds, `panByPixels`, `emit`), so a mode never reaches into d3 scales or the video. Previews keep going out as the
existing `previewframe:trackmove` / `previewframe:trackend` events; `ChronoControl` seeks the video.

Maintainer answers: Ctrl+hover folds into Preview mode and the Options checkbox goes; Ignore keeps the click; the
mode is not saved (Pan on every load); two-finger pinch zooms in every mode, only the one-finger drag follows the mode.

**Loading.** No bridge file: `ChronoControl.js` (classic script) calls `import("./chrono/ChronoDragControl.js")` once and
stores the namespace in `window.ChronoDragControl`; the chronogram attaches the drag control when the promise resolves.
When `ChronoControl.js` becomes a module, that one call becomes `import * as ChronoDragControl from ...`, the
`window.ChronoDragControl` line is deleted, and the modules do not change.

## Steps (each its own commit)

1. `ListenerBag.js`, `ChronoDragControl.js` (`DragControl`, `Mode`, `IgnoreMode`), Node tests. No page change.
2. Target adapter on `ChronoAxes`, the dynamic import in `ChronoControl.js`; Ignore is the only mode.
3. `PanMode`: the d3.zoom drag behind `attach`/`detach` (filter), default; existing tests unchanged.
4. `PreviewMode`: pointer events, click suppression after a drag, same-frame dedupe in `HoverControl`; `setTrackFrame`
   and its Options checkbox removed; browser tests (mouse, touch, cancel, mode switch mid-drag).
5. The Drag button and pop-up, `#chrono-drag-button`.
6. Record: PLAN, tests README, BEH-340.

## Addendum (2026-11-19): Ctrl+hover is independent of the mode

Maintainer decision, reverting "Ctrl+hover folds into Preview mode": Ctrl+hover previews the frame under the pointer in every
mode (Pan, Ignore, Preview), so that touchpad two-finger lateral scroll (pan), pinch / Ctrl+wheel (zoom) and Ctrl+hover (preview)
work together as one browsing gesture set.
- `CtrlHover` (same file, not a `Mode`): attached by `DragControl` for its whole life, `destroy()` detaches it. It owns the
  `pointermove` / Control `keydown`/`keyup` / `pointerleave` / `blur` handling that `PreviewMode` had.
- It ignores moves with a button pressed (a drag belongs to the mode) and touch pointers; it ends the preview when Ctrl is released,
  the pointer leaves or the window blurs. `PreviewMode` keeps click-drag and touch-drag only.
- Events out are unchanged (`previewframe:trackmove` / `trackend`). d3.zoom already ignores Ctrl+drag; Ctrl+wheel still zooms.
