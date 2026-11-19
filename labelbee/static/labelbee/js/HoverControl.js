/**
 * HoverControl: owner of the hover preview queries (ADR 0010).
 *
 * The chronogram Ctrl+hover preview asks for frames that may not be in the VideoCache yet.
 * This is the only place that issues those queries and consumes their answers. State:
 *   active  a hover session is running (between the first query and end())
 *   latest  the only query whose answer is still relevant: {key, frame, shown}, or null
 *           (shown: its image was applied, a second waiter on the same promise does nothing)
 * An answer is applied iff the session is active and its key is still the latest one,
 * so a frame hovered again before its first answer came back is still refreshed, while
 * the answer for a frame we moved away from, or after the session ended, is dropped.
 *
 * @constructor
 * @param {VideoControl} videoControl  provides videoCache, video.src, cacheImage/cacheFrame
 *                                     and onFrameChangedCachePreview()
 */
function HoverControl(videoControl) {
  this.videoControl = videoControl;
  this.active = false;
  this.latest = null;
  this.stats = { applied: 0, stale: 0 };
  this.snap = null; // optional (frame) -> frame, applied to every hovered frame (e.g. nearest keyframe, ADR 0014)
}
HoverControl.prototype = {};

HoverControl.prototype._key = function (url, cacheFrame) {
  return url + ":" + cacheFrame;
};

// Is the answer for this key still wanted?
HoverControl.prototype.isRelevant = function (key) {
  return this.active && this.latest !== null && this.latest.key === key;
};

// Hover over `frame`: show it now if cached, otherwise as soon as it is available and still wanted
HoverControl.prototype.query = function (frame) {
  if (this.snap) frame = this.snap(frame);
  let vc = this.videoControl;
  let url = vc.video.src;
  let cacheFrame = frame + videoinfo.frameoffset;
  let key = this._key(url, cacheFrame);

  // Same frame as the latest query (pointer still over it): already shown or pending, nothing to redo
  if (this.active && this.latest !== null && this.latest.key === key) return;

  this.active = true;
  this.latest = { key: key, frame: frame, shown: false };

  let promise = vc.videoCache.enqueueFramePriority(url, cacheFrame, videoinfo.videofps);
  vc.videoCache.processQueue();
  let img = vc.videoCache.getFrameImageSync(url, cacheFrame);
  if (img) {
    this._apply(key, frame, img);
    return;
  }
  if (logging.frameEvents)
    console.log("HoverControl.query: not in cache, waiting for", key);
  Promise.resolve(promise).then(
    (img) => this._apply(key, frame, img),
    (err) => { if (!VideoCache.isCanceled(err)) console.error("HoverControl.query: frame query failed", key, err); }
  );
};

// Hover ended (the video goes back to the frame before the preview): pending answers become stale
HoverControl.prototype.end = function () {
  this.active = false;
  this.latest = null;
};

HoverControl.prototype._apply = function (key, frame, img) {
  if (!this.isRelevant(key)) {
    this.stats.stale++;
    if (logging.frameEvents)
      console.log("HoverControl: answer for", key, "is stale, no refresh");
    return;
  }
  if (!img) return; // decode failed or cancelled: nothing to show
  if (this.latest.shown) return; // same frame queried twice while pending: its other waiter was first
  this.latest.shown = true;
  this.stats.applied++;
  let vc = this.videoControl;
  vc.cacheImage = img;
  vc.cacheFrame = frame;
  vc.onFrameChangedCachePreview();
};
