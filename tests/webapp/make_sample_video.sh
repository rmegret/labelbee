#!/usr/bin/env bash
# Makes the sample video of the dev webapp (needs ffmpeg and ffprobe).
#
#   tests/webapp/make_sample_video.sh                              # synthetic test pattern (not committed)
#   tests/webapp/make_sample_video.sh --from SRC [--start 12.5] [--duration 2]
#                                                                  # short extract of a real video (to commit)
#
# Output (in tests/webapp/data/sample/):
#   sample.mp4            the real extract (small, 480 px wide, 20 fps, 40 frames, no audio, every frame a keyframe
#                         so that frame stepping is exact). This is the file to commit.
#   sample.info.json      fps, nframes, duration, width, height of sample.mp4, read by serve.py (no ffprobe at run
#                         time). Commit it with the video.
#   sample.synthetic.mp4 and sample.synthetic.info.json: the synthetic fallback, git-ignored. serve.py uses
#                         sample.mp4 when it exists.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")" && pwd)/data/sample"
SRC=""; START="0"; DURATION="2"
while [ $# -gt 0 ]; do
  case "$1" in
    --from) SRC="$2"; shift 2 ;;
    --start) START="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || { echo "ffmpeg and ffprobe are required" >&2; exit 1; }
mkdir -p "$OUT_DIR"

ENC=(-an -c:v libx264 -pix_fmt yuv420p -crf 30 -preset veryfast -g 1 -movflags +faststart)
if [ -n "$SRC" ]; then
  [ -f "$SRC" ] || { echo "source not found: $SRC" >&2; exit 1; }
  OUT="$OUT_DIR/sample.mp4"
  ffmpeg -v error -y -ss "$START" -i "$SRC" -t "$DURATION" -vf "fps=20,scale=480:-2" "${ENC[@]}" "$OUT"
else
  OUT="$OUT_DIR/sample.synthetic.mp4"
  ffmpeg -v error -y -f lavfi -i "testsrc2=size=480x270:rate=20:duration=$DURATION" "${ENC[@]}" "$OUT"
fi

probe() { ffprobe -v error -count_frames -select_streams v:0 -show_entries "stream=$1" -of default=nw=1:nk=1 "$OUT"; }
W=$(probe width); H=$(probe height); NF=$(probe nb_read_frames); DUR=$(probe duration)
INFO="${OUT%.mp4}.info.json"
cat >"$INFO" <<EOF
{"fps": 20, "nframes": $NF, "duration": $DUR, "width": $W, "height": $H}
EOF
echo "wrote $OUT ($(du -k "$OUT" | cut -f1) KB, ${W}x${H}, $NF frames) and $(basename "$INFO")"
