// VideoKeyframes (module): keyframes of the video, from its `<video>.packets.csv` sidecar (ADR 0014).
//
//   keyframes  sorted array of the frames of the video file whose packet is a keyframe, or null if no sidecar
//
// Frames are those of the video file (VideoCache frames: chronogram frame plus `getVideoInfo().frameoffset`).
// A keyframe decodes alone, any other frame needs the decoder to run from the previous keyframe.

// Sorted keyframe frames of a packets.csv text, or null if the header has no `frame` / `key_frame` column
export function parsePackets(text) {
  const lines = String(text).split(/\r?\n/);
  const header = (lines.shift() || "").split(",").map((s) => s.trim());
  const iFrame = header.indexOf("frame");
  const iKey = header.indexOf("key_frame");
  if (iFrame < 0 || iKey < 0) return null;
  const keyframes = [];
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split(",");
    if (Number(cells[iKey]) === 1) keyframes.push(Number(cells[iFrame]));
  }
  return keyframes.sort((a, b) => a - b);
}

// Keyframe nearest to `frame` in the sorted array (the earlier one on a tie), or `frame` if the array is empty
export function nearestKeyframe(keyframes, frame) {
  if (!keyframes || keyframes.length === 0) return frame;
  let lo = 0, hi = keyframes.length - 1; // first index with keyframes[i] >= frame
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keyframes[mid] < frame) lo = mid + 1;
    else hi = mid;
  }
  const after = keyframes[lo];
  if (after < frame || lo === 0) return after; // past the last keyframe, or before the first one
  const before = keyframes[lo - 1];
  return frame - before <= after - frame ? before : after;
}

export class VideoKeyframes {
  constructor() {
    this.keyframes = null;
    this.url = null; // video whose sidecar was asked last, a late answer for another video is dropped
  }

  get available() {
    return this.keyframes !== null && this.keyframes.length > 0;
  }

  isKeyframe(frame) {
    return this.available && this.keyframes.includes(frame);
  }

  nearest(frame) {
    return nearestKeyframe(this.keyframes, frame);
  }

  // Read `<videoUrl>.packets.csv`; no sidecar or an invalid one leaves keyframes null, without an error
  async load(videoUrl) {
    this.url = videoUrl;
    this.keyframes = null;
    let keyframes = null;
    try {
      const response = await fetch(videoUrl + ".packets.csv");
      if (response.ok) keyframes = parsePackets(await response.text());
    } catch (e) {
      keyframes = null;
    }
    if (this.url === videoUrl) this.keyframes = keyframes;
    return this.available;
  }
}
