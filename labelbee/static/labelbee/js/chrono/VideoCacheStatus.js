// VideoCacheStatus (module): shows on the chronogram which video frames are in the VideoCache.
//
//   cachedFrames      [{frame, status}] sorted by frame, status "loaded", "pending" or "processing" (any other state is left out)
//   cachedFramesRuns  [{startFrame, endFrame, status}] consecutive frames of the same status (a run can be 1 frame long)
//
// The strip is drawn with d3 in the x axis group, just below the frame axis (it does not overlap it).
// Off by default. While off, no callback is installed in the VideoCache and nothing is computed.
// Frames are chronogram frames (cache frame minus the frame offset of the video).

export const LOADED = "loaded";
export const PENDING = "pending";
export const PROCESSING = "processing";
const STATUS_OF_STATE = { incache: LOADED, inqueue: PENDING, inprocess: PROCESSING }; // VideoCache item.state -> status
const COLOR = { [LOADED]: "#2ca02c", [PENDING]: "#ffd400", [PROCESSING]: "#ff8c00" };

// Frames of `url` held by the VideoCache LRU, with status loaded/pending, sorted by frame.
// Reads the LRU without touching its recency order.
export function collectCachedFrames(lrucache, url, frameOffset) {
  const prefix = url + ":";
  const frames = [];
  lrucache.forEach(function (key, item) {
    if (!key.startsWith(prefix)) return;
    const status = item && STATUS_OF_STATE[item.state];
    if (!status) return;
    const frame = Number(key.slice(prefix.length)) - frameOffset;
    if (Number.isFinite(frame)) frames.push({ frame, status });
  });
  frames.sort((a, b) => a.frame - b.frame);
  return frames;
}

// cachedFrames (sorted) -> intervals of consecutive frames with the same status
export function toRuns(cachedFrames) {
  const runs = [];
  let run = null;
  for (const { frame, status } of cachedFrames) {
    if (run && run.status === status && frame === run.endFrame + 1) run.endFrame = frame;
    else runs.push((run = { startFrame: frame, endFrame: frame, status }));
  }
  return runs;
}

export class VideoCacheStatus {
  // axes: ChronoAxes (xScale, chronoGroup, jQuery events); videoCache: VideoCache
  // getSource(): {url, frameOffset} of the video currently displayed
  constructor(axes, videoCache, getSource, { y = 21, height = 8 } = {}) {
    this.axes = axes;
    this.videoCache = videoCache;
    this.getSource = getSource;
    this.y = y;
    this.height = height;
    this.enabled = false;
    this.cachedFrames = [];
    this.cachedFramesRuns = [];
    this._raf = 0;
    this._onCacheChange = () => this._schedule();

    const parent = axes.chronoGroup.select(".x.axis");
    this.g = (parent.empty() ? axes.chronoGroup : parent)
      .append("g")
      .attr("class", "cacheStatus")
      .attr("transform", "translate(0," + y + ")")
      .style("pointer-events", "none")
      .style("display", "none");
    $(axes).on("axes:changed.cacheStatus", () => this.refresh()); // zoom, pan, resize
  }

  setEnabled(enabled) {
    enabled = !!enabled;
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.videoCache.onStatusChanged = this._onCacheChange;
      this.g.style("display", null);
      this.update();
    } else {
      if (this.videoCache.onStatusChanged === this._onCacheChange) this.videoCache.onStatusChanged = null;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      this.cachedFrames = [];
      this.cachedFramesRuns = [];
      this.g.selectAll("*").remove();
      this.g.style("display", "none");
    }
  }

  // Recompute the lists from the cache, then redraw
  update() {
    if (!this.enabled) return; // guard: no work while off
    const { url, frameOffset } = this.getSource();
    this.cachedFrames = collectCachedFrames(this.videoCache.lrucache, url, frameOffset);
    this.cachedFramesRuns = toRuns(this.cachedFrames);
    this.refresh();
  }

  // Redraw the runs (scales changed)
  refresh() {
    if (!this.enabled) return;
    const x = this.axes.xScale;
    const [x0, x1] = x.range();
    const rects = [];
    for (const r of this.cachedFramesRuns) {
      const a = Math.max(x(r.startFrame - 0.5), x0);
      const b = Math.min(x(r.endFrame + 0.5), x1);
      if (b < x0 || a > x1) continue; // out of the visible domain
      rects.push({ x: a, w: Math.max(1, b - a), status: r.status });
    }
    this.g
      .selectAll("rect.cacheRun")
      .data(rects)
      .join("rect")
      .attr("class", "cacheRun")
      .attr("x", (d) => d.x)
      .attr("width", (d) => d.w)
      .attr("y", 0)
      .attr("height", this.height)
      .style("fill", (d) => COLOR[d.status])
      .style("stroke", (d) => COLOR[d.status]);
  }

  // One update per animation frame, however many cache changes happened
  _schedule() {
    if (!this.enabled || this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.update();
    });
  }

  destroy() {
    this.setEnabled(false);
    $(this.axes).off(".cacheStatus");
    this.g.remove();
  }
}
