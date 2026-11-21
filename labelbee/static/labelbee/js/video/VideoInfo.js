/*
 * VideoInfo: the metadata of the loaded video (`videoinfo`: name, path, fps, nframes, frameoffset, preview, ...), owned by
 * this module (refactor slice 8 step 5, ADR 0015). It was the classic global `var videoinfo` of VideoList.js; there is no
 * global any more. Modules import `getVideoInfo`; labelbeeBridge.js installs `getVideoInfo` and `setVideoInfoObject` on
 * `window` for the classic scripts, which call them (`getVideoInfo().nframes`).
 *
 * Two kinds of write: the whole object is replaced with `setVideoInfoObject` (VideoManager: the default at construction,
 * `setVideoInfo` when a video is selected); the fields are updated in place on the object `getVideoInfo()` returns
 * (VideoControl.js, VideoList.js). Callers must not keep the object: a new video replaces it.
 */
let videoinfo;

export function getVideoInfo() {
  return videoinfo;
}

export function setVideoInfoObject(info) {
  videoinfo = info;
}
