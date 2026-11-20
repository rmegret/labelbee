# ADR 0010: HoverControl, one owner of the hover preview queries

Status: proposed (requested by the maintainer 2026-11-18, off plan, follows the Ctrl+hover preview toggle)

## Context

The Ctrl+hover preview of the chronogram seeks in `cache-preview` mode
(`labelbee/static/labelbee/js/VideoControl.js`, `seekFrame`): it enqueues the frame in `VideoCache`, reads the
cache synchronously, and displays the image only if it was already there. When it was not, the function returns and
nothing listens to the promise of the query: the frame is decoded later, lands in the cache, but the display stays on
the previous frame until the next mouse move. Listening naively would be wrong too: the answer of a query can arrive
after the mouse moved to another frame or left the chronogram, and must not repaint then.

## Decision

`labelbee/static/labelbee/js/HoverControl.js` (classic script, after `VideoControl.js`), `videoControl.hover`.
It is the only place that issues preview queries and consumes their answers.

- State: `active` (a hover session is running) and `latest` (the one query that is still relevant: `{key, frame, shown}`,
  `key = video url + ':' + frame`, or `null`).
- `query(frame)`: starts the session if needed, sets `latest`, enqueues the frame in `VideoCache`; if the image is
  already cached it is applied at once, else it is applied when the promise resolves.
- Relevance is decided at answer time, by `key`, not by a query counter: an answer is applied iff the session is
  active and `latest.key` equals the key it answers. So a frame hovered again before its first answer came back
  still gets its refresh, once (`shown`: both waiters hold the same promise), while an answer for a frame the mouse
  has left, or after the session ended, is dropped.
- `end()`: session over, `latest = null`; every pending answer becomes stale.
- Applying an answer is what `seekFrame` did before: set `cacheImage` and `cacheFrame`, call
  `onFrameChangedCachePreview`. `seekFrame` keeps the saved mode and frame handling and only delegates the
  `cache-preview` branch to `query`, and calls `end` when the preview ends.
- `stats = {applied, stale}` counts the outcomes, for the browser tests and for debugging.

Not done here: removing from `VideoCache.queryQueue` the queries that went stale. The cache is shared with the
`cache` mode and `preloadCache`, which can await the same promise, so cancelling a decode needs its own step. A stale
query is still decoded (it fills the cache); only its refresh is cancelled.

## Consequences

- A preview on an uncached frame shows it as soon as it is decoded, when still hovered.
- Behavior change by design (a fix, not a refactor step): the display used to stay on the old frame.
- Tests: `refactor/tests/browser/test_n_hover_control.py`, with a gate in front of `VideoCache.getImageForce`
  so the answer arrives when the test says.
