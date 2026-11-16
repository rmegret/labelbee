#!/usr/bin/env python3
"""Extract a short clip + its pipeline sidecars from a gurabo4 video (standard library + ffmpeg).

    python3 extract_sample.py                         # defaults: col03, 152_01_R_190817090000, frames 289-308
    python3 extract_sample.py --start 289 --nframes 20 --out .

Reads  <root>/mp4/<col>/<video>             (CFR video, 2560x1440 @ 20 fps)
       <root>/mp4/<col>/<video>.packets.csv (keyframe flags)
       <root>/tracks/<col>/<video>.<suffix> (cyindibee_video sidecars)
Writes sample_gurabo.cfr.mp4 and sample_gurabo.cfr.mp4.<suffix> next to this script.

The video is NOT re-encoded (stream copy): the requested window is extended outwards so that it starts on a
keyframe and ends just before the next one, and the sidecars are cut on the same extended window.
See README.md for the output format. Frame numbers are rebased so that the first frame of the clip is 0.
"""
import argparse
import csv
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_NAME = "sample_gurabo.cfr.mp4"
FPS = 20

# Suffixes with a per-detection `frame` column
PER_FRAME = ["detections.csv", "tracks.csv", "tracks.crops.csv", "tags.csv", "tracks+tags.csv",
             "pollentag.csv", "augmented.csv", "tracks_tagged.csv"]
# Suffixes with one row per track (track_startframe / track_endframe)
PER_TRACK = ["events.csv", "events_tagged.csv"]


def filter_per_frame(src, dst, start, end, video_name, drop_first_col=False, tracks_out=None):
    """Keep rows with start <= frame < end, rebase `frame`, rewrite video_name / crop_filepath."""
    n = 0
    with open(src, newline="") as fi, open(dst, "w", newline="") as fo:
        r = csv.reader(fi)
        w = csv.writer(fo, lineterminator="\n")
        head = next(r)
        w.writerow(["index"] + head[1:] if drop_first_col else head)
        col = {c: i for i, c in enumerate(head)}
        ifr = col["frame"]
        for row in r:
            f = int(row[ifr])
            if f >= end:  # sidecars are sorted by frame: stop reading the rest of the (up to 400 MB) file
                break
            if f < start:
                continue
            row[ifr] = str(f - start)
            for c in ("track_startframe", "track_endframe"):  # merged track-level columns (tracks_tagged.csv)
                if c in col and row[col[c]] != "":
                    row[col[c]] = str(int(float(row[col[c]])) - start)
            if "video_name" in col:
                row[col["video_name"]] = video_name
            if "crop_filepath" in col:  # absolute path of the full dataset: make it relative
                row[col["crop_filepath"]] = "crops/" + row[col["crop_filename"]]
            if drop_first_col:
                row[0] = str(n)
            if tracks_out is not None and "track_id" in col and row[col["track_id"]] != "":
                tracks_out.add(row[col["track_id"]])
            w.writerow(row)
            n += 1
    return n


def filter_per_track(src, dst, start, track_ids):
    """Keep the rows of the tracks seen in the clip; rebase track_startframe/track_endframe (may fall outside the clip)."""
    n = 0
    with open(src, newline="") as fi, open(dst, "w", newline="") as fo:
        r = csv.reader(fi)
        w = csv.writer(fo, lineterminator="\n")
        head = next(r)
        w.writerow(head)
        col = {c: i for i, c in enumerate(head)}
        for row in r:
            if row[col["track_id"]] not in track_ids:
                continue
            for c in ("track_startframe", "track_endframe"):
                row[col[c]] = str(int(float(row[col[c]])) - start)
            w.writerow(row)
            n += 1
    return n


def slice_packets(src, dst, start, end):
    """Rows [start, end) of <video>.packets.csv; `frame` and the timestamps are rebased to start at 0 like the clip."""
    rebase = ["pts", "pts_time", "dts", "dts_time", "dts_orig", "dts_time_orig"]  # pts_orig is 0 for the .avi source
    n = 0
    with open(src, newline="") as fi, open(dst, "w", newline="") as fo:
        r = csv.DictReader(fi)
        w = csv.DictWriter(fo, r.fieldnames, lineterminator="\n")
        w.writeheader()
        first = None
        for row in r:
            f = int(row["frame"])
            if f >= end:
                break
            if f < start:
                continue
            if first is None:
                first = {c: float(row[c]) for c in rebase}
            row["frame"] = str(f - start)
            for c in rebase:
                v = float(row[c]) - first[c]
                row[c] = f"{v:.6f}" if c.endswith("_time") or c.endswith("_time_orig") else str(int(v))
            w.writerow(row)
            n += 1
    return n


def write_stream_info(src, dst, clip, start, nframes, source_name):
    """Copy of <video>.stream.json whose `video_info` (the cfr video) is refreshed from ffprobe on the clip.
    `video_info_orig` (the original .avi, not shipped) is kept as provenance."""
    info = json.loads(Path(src).read_text())
    probe = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_streams", "-of", "json",
         str(clip)], check=True, capture_output=True, text=True).stdout)["streams"][0]
    probe["nb_frames"] = probe.get("nb_frames", str(nframes))
    for k in info["video_info"]:
        if k != "video_path" and k in probe:
            info["video_info"][k] = probe[k]
    info["video_info"]["video_path"] = clip.name
    info["extract"] = {"source_video": source_name, "first_source_frame": start, "nframes": nframes,
                       "note": "video_info describes this clip; video_info_orig describes the full original file"}
    Path(dst).write_text(json.dumps(info, indent=4) + "\n")


def snap_to_keyframes(packets_csv, start, end):
    """Extend [start, end) to [k0, k1): k0 = last keyframe <= start, k1 = first keyframe >= end (or end of video)."""
    keys, nframes = [], 0
    with open(packets_csv, newline="") as f:
        for row in csv.DictReader(f):
            nframes = int(row["frame"]) + 1
            if row["key_frame"] == "1":
                keys.append(int(row["frame"]))
    k0 = max(k for k in keys if k <= start)
    k1 = min((k for k in keys if k >= end), default=nframes)
    return k0, k1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default="/mnt/data/gurabo4")
    ap.add_argument("--col", default="col03")
    ap.add_argument("--video", default="152_01_R_190817090000.cfr.mp4")
    ap.add_argument("--start", type=int, default=289, help="first frame of the clip in the source video")
    ap.add_argument("--nframes", type=int, default=FPS)
    ap.add_argument("--out", default=str(HERE))
    a = ap.parse_args()

    root, out = Path(a.root), Path(a.out)
    video = root / "mp4" / a.col / a.video
    tdir = root / "tracks" / a.col

    # Window extended to keyframes, so that the video can be copied without re-encoding
    req_start, req_end = a.start, a.start + a.nframes
    a.start, end = snap_to_keyframes(Path(str(video) + ".packets.csv"), req_start, req_end)
    a.nframes = end - a.start
    print(f"requested frames [{req_start}, {req_end}) -> keyframe-aligned [{a.start}, {end}) = {a.nframes} frames")

    # Video: stream copy (original resolution, coordinates in the CSVs stay valid). The start is a keyframe, so
    # -ss before -i is exact; -frames:v stops after the clip instead of reading the rest of the hour.
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a.start / FPS:.3f}", "-i", str(video),
                    "-frames:v", str(a.nframes), "-an", "-c:v", "copy", "-movflags", "+faststart",
                    str(out / OUT_NAME)], check=True)

    print(f"packets.csv: {slice_packets(Path(str(video) + '.packets.csv'), out / (OUT_NAME + '.packets.csv'), a.start, end)} rows")
    write_stream_info(Path(str(video) + ".stream.json"), out / (OUT_NAME + ".stream.json"), out / OUT_NAME,
                      a.start, a.nframes, a.video)

    track_ids = set()
    for suf in PER_FRAME:
        n = filter_per_frame(tdir / f"{a.video}.{suf}", out / f"{OUT_NAME}.{suf}", a.start, end, OUT_NAME,
                             drop_first_col=(suf == "tracks_tagged.csv"),
                             tracks_out=track_ids if suf == "tracks.csv" else None)
        print(f"{suf}: {n} rows")
    for suf in PER_TRACK:
        n = filter_per_track(tdir / f"{a.video}.{suf}", out / f"{OUT_NAME}.{suf}", a.start, track_ids)
        print(f"{suf}: {n} rows")
    (out / f"{OUT_NAME}.events.csv.config.json").write_text(
        (tdir / f"{a.video}.events.csv.config.json").read_text())

    (out / (OUT_NAME + "source.json")).write_text(json.dumps({
        "source_root": a.root, "colony_dir": a.col, "source_video": a.video,
        "requested_source_frames": [req_start, req_end],
        "first_source_frame": a.start, "nframes": a.nframes, "fps": FPS,
    }, indent=1) + "\n")


if __name__ == "__main__":
    main()
