# ADR 0012: VideoCacheStatus, video cache content shown on the chronogram

Status: proposed (maintainer request 2026-11-19; off plan)

## Context

The only view of the `VideoCache` is the text `used/size,Qn` in `#cache-status`. Whether the frames around the
current one are decoded, or still queued, is invisible, which makes scrubbing and preview lag hard to understand.

## Decision

One ES module `labelbee/static/labelbee/js/chrono/VideoCacheStatus.js`, a plain module (no bridge file), loaded by
one dynamic `import()` in `initChrono()` like [ADR 0011](0011-chrono-drag-control.md). The namespace
`VideoCacheStatus` is global for now; the running object is `videoCacheStatus`.

- `cachedFrames`: `[{frame, status}]` sorted by frame, built from the `VideoCache` LRU for the displayed video.
  `status` is `loaded` (cache state `incache`) or `pending` (`inqueue`). Any other state is not listed.
- `cachedFramesRuns`: `[{startFrame, endFrame, status}]`, consecutive frames of the same status; a run may be one
  frame (`startFrame == endFrame`). Pure functions `collectCachedFrames`, `toRuns`, tested with `node --test`.
- `refresh()`: d3 draws one `rect.cacheRun` per visible run in a `g.cacheStatus` of the x axis group, just below the
  axis background (y 21..29, inside the 50 px bottom margin), no overlap with the axis. Green `#2ca02c` loaded,
  yellow `#ffd400` pending; fill and stroke have the same color. Redrawn on `axes:changed` (zoom, pan, resize).
- Option Options/Chronogram "Show Video Cache status" (`#showVideoCacheStatus`), off by default, not saved.
- Guard: `VideoCache.onStatusChanged` (called from `updateStatus()`) is set only while the option is on, so while off
  the cache does no extra work and no list is built. Several changes in one animation frame cause one update.

## Consequences

`VideoCache` gains one nullable callback. The LRU is read with `forEach` (no recency change). Frames are
chronogram frames: cache frame minus `videoinfo.frameoffset`.
