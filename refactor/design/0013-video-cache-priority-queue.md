# ADR 0013: VideoCache dynamic queue (priority requests), cancel signal, failed decodes

Status: proposed (maintainer answers 2026-11-19; off plan, follows [ADR 0012](0012-video-cache-status.md))

## Context

`VideoCache` decodes frames one at a time from `queryQueue`, strictly in arrival order. While scrubbing, hovering
or playing, the frame needed now waits behind stale requests. `processQueue` peeks `queryQueue[0]`, awaits the
decode and then `shift()`s, so the queue cannot be reordered during a decode. `cancelQueue` drops queued frames
but cannot stop the frame being decoded, never settles the promises of the dropped frames, and clears
`processingQueue` (a second loop can start during a decode). A failed decode throws out of `processQueue`
and leaves the frame `inqueue` forever.

## Decision

States of a cache entry: `inqueue` (waiting), **`inprocess`** (new: taken out of `queryQueue`, being decoded),
`incache` (loaded). `processQueue` shifts the query first, marks it `inprocess` (`this.currentQuery`), then decodes.

| Call | `incache` / `inprocess` / `inqueue` | unknown frame |
|---|---|---|
| `enqueueFrame` (preload) | return its promise, nothing else | push at the back |
| `enqueueFramePriority` | `inqueue`: move to the front; others: return its promise | push at the front |

Hover (`HoverControl.query`) and `getFrameImageAsync` (display of the current frame) use the priority call;
`preloadFrames` keeps `enqueueFrame`. Stale requests are still processed, after the latest need. A priority
request waits at most for the one decode in flight.

Cancel signal. `cancelQueue` rejects the promise of every queued query with `VideoCache.CANCELED` (a sentinel,
test with `VideoCache.isCanceled(err)`), removes them from the cache, and flags `currentQuery.cancelled` with
its entry removed from the cache. The decode cannot be killed, but the queue stops waiting for it: the loop races
the decode against an abandon signal (`query.abandon`, fired by `cancelQueue`, or by a timeout
`opts.decodeTimeoutMs`, 15 s, treated as a failed decode), so a decode that never ends cannot block the queue
("already processing. ABORTED" forever). If the abandoned decode ends later its result is thrown away. A frame
requested again after a cancel gets a new entry and query.

Failed decode. The entry is removed, the promise rejected with the error, the key (`url:frame`) added to the set
`videoCache.failedDecodeFrames`, and the queue goes on. A later successful decode of the frame removes it from
the set. A cancelled decode never enters the set.

`VideoCacheStatus` gets a third status `processing` (state `inprocess`), orange `#ff8c00`.

## Consequences

Callers that wait on a frame promise must tolerate rejection: `seekFrame` and `HoverControl` ignore `CANCELED`
and log other errors, `preloadFrames` resolves when all its frames have settled (not when `processQueue` returns, which is at once if
a loop is already running).
`seekFrame` (cache mode) ignores an answer unless its frame is still `cacheRequestedFrame` (priority ordering makes
stale answers arrive after newer ones). `OverlayControl.refreshIfLoaded` redraws after a preload only if the frame
is still current and all requested frames are in cache (a failed frame cannot loop). `cancelQueue` also stops leaking a global `query`.

## Addendum: the queue is bounded by the cache size (maintainer, 2026-11-19)

More queued frames than `opts.videoCacheSize` would only be decoded to be evicted by the LRU in turn: wasted work.
`queryQueue.length` is therefore capped at the cache size (the frame in process does not count).

| Call, queue full | Effect |
|---|---|
| `enqueueFramePriority` | the last query of the queue is dropped (entry removed, promise rejected with `CANCELED`) and the new one goes to the front |
| `enqueueFrame` (regular) | rejected with `VideoCache.QUEUE_FULL` (test with `VideoCache.isQueueFull(err)`), nothing is queued |

A frame already known (`incache`, `inprocess`, `inqueue`) is never affected: it needs no space. With a size of 0 a
priority request has nothing to drop and is rejected like a regular one. `preloadFrames` already settles on
rejections, so a preload that does not fit simply loads fewer frames.
