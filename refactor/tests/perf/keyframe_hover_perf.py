#!/usr/bin/env python
"""Hover preview cost on keyframes vs non-keyframes (ADR 0014). Standalone script, not collected by pytest.

Serves the gurabo sample (tests/webapp/data/sample_gurabo) with a throw-away copy of the dev webapp, opens it in
Playwright's Chromium and times `videoControl.videoCache.getImageForce(url, frame, fps)` (seek + decode + JPEG
encode of the frame, the LRU is bypassed) for keyframes and for non-keyframes, with three access orders:
random, sequential (frame after frame, increasing) and reverse sequential (decreasing).
Writes a Markdown report (default refactor/scratch/keyframe-hover-perf.md, git-ignored) and prints it.

    conda activate labelbeedev        # ffmpeg, ffprobe, playwright
    python refactor/tests/perf/keyframe_hover_perf.py [--n 40] [--reps 3] [--seed 1] [--out report.md] [--headed]

The Chromium of Playwright cannot decode H.264: if it cannot play the original clip, the script re-encodes it to
VP9 (same frames, keyframes forced at the same positions) and says so in the report. Keyframes are read from the
video file itself (ffprobe), the packets.csv sidecar is only compared with them.
"""
import argparse
import datetime
import json
import os
import platform
import random
import shutil
import socket
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SAMPLE = REPO / "tests" / "webapp" / "data" / "sample_gurabo"
CLIP = SAMPLE / "sample_gurabo.cfr.mp4"
PACKETS = SAMPLE / "sample_gurabo.cfr.mp4.packets.csv"
H264_TYPE = 'video/mp4; codecs="avc1.4d001f"'
DECODE_TIMEOUT_MS = 10000

DECODE_JS = """async ([frame, timeoutMs]) => {
  const vc = videoControl.videoCache, url = videoControl.video.src;
  const t0 = performance.now();
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), timeoutMs); });
  try { await Promise.race([vc.getImageForce(url, frame, videoinfo.videofps), timeout]); }
  catch (e) { return {ms: null, error: String((e && e.message) || e)}; }
  finally { clearTimeout(timer); }
  return {ms: performance.now() - t0};
}"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def probe_video(path):
    """(nframes, width, height, fps, keyframes) of the video file, from ffprobe."""
    info = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,codec_name",
         "-of", "json", str(path)], check=True, capture_output=True, text=True).stdout)["streams"][0]
    flags = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=flags", "-of", "csv=p=0", str(path)],
        check=True, capture_output=True, text=True).stdout.split()
    num, den = info["r_frame_rate"].split("/")
    keyframes = [i for i, f in enumerate(flags) if f.startswith("K")]
    return len(flags), info["width"], info["height"], int(num) / int(den), keyframes, info["codec_name"]


def sidecar_keyframes():
    lines = PACKETS.read_text().splitlines()
    head = lines[0].split(",")
    return [int(r.split(",")[head.index("frame")]) for r in lines[1:] if r.split(",")[head.index("key_frame")] == "1"]


def prepare_video(dst, can_h264, keyframes, fps):
    """Copy of the clip the browser can play: the original if it can play H.264, else a VP9 re-encode with the same keyframes."""
    if can_h264:
        shutil.copy(CLIP, dst)
        return "original H.264 (the browser plays it)"
    times = ",".join(f"{k / fps:.4f}" for k in keyframes)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(CLIP), "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p",
         "-b:v", "0", "-crf", "32", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1",
         "-g", "100000", "-keyint_min", "100000", "-force_key_frames", times, "-movflags", "+faststart", str(dst)],
        check=True)
    return "VP9 re-encode (Chromium of Playwright cannot play the H.264 original), keyframes forced at the original positions"


def build_webapp(root, can_h264, fps_hint=20):
    web = root / "tests" / "webapp"
    sample = web / "data" / "sample"
    sample.mkdir(parents=True)
    shutil.copy(REPO / "tests" / "webapp" / "serve.py", web / "serve.py")
    os.symlink(REPO / "labelbee", root / "labelbee")
    n0, w0, h0, fps0, kf0, _ = probe_video(CLIP)
    how = prepare_video(sample / "sample.mp4", can_h264, kf0, fps0)
    nframes, width, height, fps, keyframes, codec = probe_video(sample / "sample.mp4")
    (sample / "sample.info.json").write_text(json.dumps(
        {"fps": fps, "nframes": nframes, "duration": nframes / fps, "width": width, "height": height}))
    shutil.copy(PACKETS, sample / "sample.mp4.packets.csv")
    return dict(how=how, codec=codec, nframes=nframes, width=width, height=height, fps=fps, keyframes=keyframes,
                original_keyframes=kf0)


def start_server(root):
    port = free_port()
    proc = subprocess.Popen([sys.executable, str(root / "tests" / "webapp" / "serve.py"), "--port", str(port), "--quiet"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            urllib.request.urlopen(url + "/_dev/status", timeout=1).read()
            return proc, url
        except Exception:
            time.sleep(0.1)
    proc.terminate()
    raise RuntimeError("the dev webapp did not start")


def sequences(keyframes, nframes, n, rng):
    """{(kind, order): [frames]} with n+1 frames each (the first one only positions the decoder, it is not measured)."""
    kset = set(keyframes)
    non = [f for f in range(nframes) if f not in kset]
    runs, run = [], []                              # runs of consecutive non-keyframes
    for f in range(nframes):
        if f in kset:
            runs, run = (runs + [run] if run else runs), []
        else:
            run.append(f)
    runs = runs + [run] if run else runs
    m = n + 1
    seqs = {}
    # keyframes: random picks without immediate repeat (a repeat is not a seek), else cycling in the order
    last, rnd = None, []
    for _ in range(m):
        pick = rng.choice([k for k in keyframes if k != last] or keyframes)
        rnd.append(pick)
        last = pick
    seqs[("keyframe", "random")] = rnd
    seqs[("keyframe", "sequential")] = [sorted(keyframes)[i % len(keyframes)] for i in range(m)]
    seqs[("keyframe", "reverse")] = [sorted(keyframes, reverse=True)[i % len(keyframes)] for i in range(m)]
    seqs[("non-keyframe", "random")] = rng.sample(non, min(m, len(non)))
    longest = max(runs, key=len)
    length = min(m, len(longest))
    start = rng.randrange(0, len(longest) - length + 1)
    asc = longest[start:start + length]
    seqs[("non-keyframe", "sequential")] = asc
    seqs[("non-keyframe", "reverse")] = asc[::-1]
    return seqs


def stats(values):
    v = sorted(values)
    p95 = v[min(len(v) - 1, int(round(0.95 * (len(v) - 1))))]
    return dict(n=len(v), mean=statistics.mean(v), median=statistics.median(v), p95=p95, max=v[-1])


def measure(page, seqs, reps):
    results = {}
    for key, frames in seqs.items():
        ms, errors = [], 0
        for _ in range(reps):
            for i, frame in enumerate(frames):
                r = page.evaluate(DECODE_JS, [frame, DECODE_TIMEOUT_MS])
                if i == 0:
                    continue
                if r["ms"] is None:
                    errors += 1
                else:
                    ms.append(r["ms"])
        results[key] = dict(stats(ms) if ms else dict(n=0), errors=errors, frames=frames[1:])
    return results


def report(meta, args, browser, results, can_h264):
    f = lambda x: f"{x:.1f}"
    out = [f"# Hover preview cost: keyframes vs non-keyframes ({datetime.date.today()})", "",
           "Time of `VideoCache.getImageForce` (seek + decode + JPEG encode of one frame, cache bypassed) in the page of the dev webapp.", "",
           "| | |", "|---|---|",
           f"| clip | `sample_gurabo.cfr.mp4`, {meta['nframes']} frames, {meta['width']}x{meta['height']}, {meta['fps']:g} fps |",
           f"| decoded video | {meta['how']} |",
           f"| keyframes (from the decoded file) | {meta['keyframes']} |",
           f"| keyframes in packets.csv | {sidecar_keyframes()}" + (" (same)" if sidecar_keyframes() == meta["keyframes"] else " (**differ**)") + " |",
           f"| browser | {browser}, {'headed' if args.headed else 'headless'}; {platform.platform()} |",
           f"| samples | {args.n} per cell x {args.reps} repetition(s), first frame of each sequence not counted, seed {args.seed} |", "",
           "## Decode time (ms)", "",
           "| frames | order | n | mean | median | p95 | max | failed |", "|---|---|---|---|---|---|---|---|"]
    for (kind, order), r in results.items():
        if r["n"]:
            out.append(f"| {kind} | {order} | {r['n']} | {f(r['mean'])} | {f(r['median'])} | {f(r['p95'])} | {f(r['max'])} | {r['errors']} |")
        else:
            out.append(f"| {kind} | {order} | 0 | - | - | - | - | {r['errors']} |")
    out += ["", "## Non-keyframe / keyframe (median)", "", "| order | ratio |", "|---|---|"]
    for order in ("random", "sequential", "reverse"):
        k, n = results[("keyframe", order)], results[("non-keyframe", order)]
        out.append(f"| {order} | " + (f"{n['median'] / k['median']:.2f}x" if k["n"] and n["n"] else "n/a") + " |")
    out += ["", "## Notes", "",
            "- The gurabo clip has few keyframes (one every 50 frames): the keyframe cells cycle over them, never twice the same frame in a row (a repeat is not a seek).",
            "- Non-keyframe sequential / reverse use one run of consecutive non-keyframes (no keyframe inside).",
            "- Each measurement waits for the previous one: this is the decode cost of one hover query, not throughput under load."]
    if not can_h264:
        out.append("- VP9 is not H.264: absolute times and the keyframe penalty differ with the codec; the ordering of the cells is the result to read.")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--n", type=int, default=40, help="measured frames per cell and repetition (default 40)")
    ap.add_argument("--reps", type=int, default=3, help="repetitions of each cell (default 3)")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", type=Path, default=REPO / "refactor" / "scratch" / "keyframe-hover-perf.md")
    ap.add_argument("--headed", action="store_true")
    args = ap.parse_args()
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            sys.exit(f"{tool} not found: activate the conda environment `labelbeedev` (refactor/tests/devenv/)")
    from playwright.sync_api import sync_playwright

    root = Path(tempfile.mkdtemp(prefix="keyframe_perf_"))
    proc = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=not args.headed)
            page = browser.new_page(viewport={"width": 1600, "height": 1000})
            page.set_content("<video id=v></video>")
            can_h264 = bool(page.evaluate("(t) => document.getElementById('v').canPlayType(t)", H264_TYPE))
            meta = build_webapp(root, can_h264)
            proc, base = start_server(root)
            page.goto(f"{base}/labelbee/gui#video_id=1", wait_until="load")
            page.wait_for_function("window.videoControl && videoControl.video && videoControl.video.readyState >= 2"
                                   " && videoinfo && videoinfo.nframes", timeout=30000)
            page.evaluate(DECODE_JS, [0, 30000])      # warm-up: loads the video of the cache, not measured
            rng = random.Random(args.seed)
            results = measure(page, sequences(meta["keyframes"], meta["nframes"], args.n, rng), args.reps)
            text = report(meta, args, f"Chromium {browser.version}", results, can_h264)
            browser.close()
    finally:
        if proc:
            proc.terminate()
        shutil.rmtree(root, ignore_errors=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text)
    print(text)
    print(f"report written to {args.out}")


if __name__ == "__main__":
    main()
