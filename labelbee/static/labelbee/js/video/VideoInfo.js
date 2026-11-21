/*
 * VideoInfo: the metadata of the loaded video (`videoinfo`: name, path, fps, nframes, frameoffset, preview, ...), owned by
 * this module (refactor slice 8 step 5, ADR 0015). It was the classic global `var videoinfo` of VideoList.js, replaced
 * as a whole by `VideoManager` (the constructor and `setVideoInfo`); nobody else assigns it.
 *
 * labelbeeBridge.js defines the global `videoinfo` as an accessor over this state, so the classic scripts read it
 * (`videoinfo.nframes`) and `VideoList.js` assigns it (`videoinfo = {...}`) as before. Modules use `getVideoInfo()`.
 */
let videoinfo;

export function getVideoInfo() {
  return videoinfo;
}

export function setVideoInfoObject(info) {
  videoinfo = info;
}
