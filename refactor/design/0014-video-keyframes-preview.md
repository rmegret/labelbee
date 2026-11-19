# ADR 0014: Keyframes from the packets sidecar, "Preview Keyframes Only", hover performance report

Status: proposed (maintainer request 2026-11-19; off plan, follows [ADR 0010](0010-hover-control.md),
[ADR 0011](0011-chrono-drag-control.md) and [ADR 0013](0013-video-cache-priority-queue.md))

## Context

A hover preview decodes a frame by seeking the cache `<video>` ([ADR 0013](0013-video-cache-priority-queue.md)).
A keyframe can be decoded alone; any other frame needs the decoder to run from the previous keyframe
(up to 49 frames in the gurabo videos: one keyframe every 50 frames). The pipeline (`fix_cfr`) writes the
packets of each video in `<video>.packets.csv` (columns `frame`, `key_frame` 1/0, timestamps; see
`tests/webapp/data/sample_gurabo/README.md`), next to `<video>.stream.json`. LabelBee does not read it
(`labelbee/static/labelbee/js/annotation/CsvSchemas.js`: schema `packets`, `loader: null`).

## Decision

One ES module `labelbee/static/labelbee/js/chrono/VideoKeyframes.js`, a plain module (no bridge), loaded by a
dynamic `import()` in `initChrono()` like [ADR 0012](0012-video-cache-status.md). Namespace `VideoKeyframes`
(global for now), running object `videoKeyframes`.

- `parsePackets(text)`: pure, returns the sorted array of the `frame` values whose `key_frame` is 1, or `null`
  if the header lacks `frame` or `key_frame`. Tested with `node --test`.
- `nearestKeyframe(keyframes, frame)`: pure, binary search; on a tie the earlier keyframe.
- `VideoKeyframes.load(videoUrl)`: fetches `<videoUrl>.packets.csv` on each `video:loaded`; a missing or invalid
  file leaves `keyframes` null (`available == false`), silently (no console error: most videos have none).
  The packet `frame` is the frame of the video file, i.e. the VideoCache frame (chronogram frame is that minus
  `videoinfo.frameoffset`).
- Option "Preview Keyframes Only" (`#chrono-drag-keyframes`), a checkbox at the bottom of the Drag menu,
  disabled with an explanatory title while no packets are loaded, off by default, not saved (like the drag mode).
- Effect: `HoverControl.snap` (null, or `(frame) -> frame`, chronogram frames) is applied at the top of
  `HoverControl.query`, so the preview shows the keyframe nearest to the pointer and a pointer moving inside one
  keyframe interval issues no new query. Seeking, playing and the other modes are not affected.

Performance report. `refactor/tests/perf/keyframe_hover_perf.py` is a standalone script (not collected by
pytest): it serves the gurabo sample with the dev webapp, loads it in Playwright and times
`VideoCache.getImageForce` (seek + decode + JPEG encode, LRU bypassed) for keyframes vs non-keyframes with three
access orders (random, sequential, reverse sequential), then writes a Markdown report (table of
n / mean / median / p95 / max ms) to `refactor/scratch/keyframe-hover-perf.md`. The Chromium of Playwright cannot
decode H.264: unless the browser can play the original, the script re-encodes the clip to VP9 with the same
keyframe positions (`ffmpeg -force_key_frames`) and says so in the report.

## Consequences

The first use of the packets sidecar; the `packets` schema in `CsvSchemas.js` keeps `loader: null` (it is read by
`VideoKeyframes`, not by the annotation loaders). A video has no keyframes list until its sidecar loads, so the
option is unavailable for the first moments after a video change.
