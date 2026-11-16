# sample_gurabo: 5 s of real hive video with real pipeline outputs

Test data for the LabelBee webapp, extracted from a real recording of the *gurabo4* dataset
(colony `col03`, video `152_01_R_190817090000.cfr.mp4`, 2019-08-17 09:00, 1 h, 2560x1440, 20 fps).
Unlike [`../sample/`](../sample/) (synthetic bees, LabelBee's own formats), these files are
**unmodified output of the `cyindibee_video` pipeline** (detect -> track -> crop -> tags -> tagmerge -> events),
restricted to a few seconds, so they show the real columns, ids and noise.

| | |
|---|---|
| Source frames | 250-349 of the source video (100 frames = 5.0 s, from 00:00:12.500 = `2019-08-17 09:00:12.500`) |
| Clip frames | 0-99: **frame numbers are rebased** (`frame = source_frame - 250`) |
| Why 5 s | the video is **copied without re-encoding**, so the cut must start on a keyframe (one every 50 frames) and end just before the next one. The wanted second, source frames 289-308, straddles two such groups, hence 250-349 |
| Why that second | track 36 crosses the entrance with a decoded tag (1641): clip frames 39-58, the only tagged track of the clip |
| Content | 23 tracks (ids 5-48), 923 tracked detections (~9 per frame), 2 of them `virtual` |
| Origin of the choice | `source.json` (requested window, extended window), `extract_sample.py` (the extraction) |

## Files

Naming follows the pipeline: `<video>.<suffix>`, with `<video>` = `sample_gurabo.cfr.mp4`.
All coordinates are in pixels of the 2560x1440 frame. All CSV are comma separated with a header.

| file | rows | one row per | produced by (`cyindibee_video`) |
|---|---|---|---|
| `sample_gurabo.cfr.mp4` | 100 frames | frame | `fix_cfr` output, cut by `extract_sample.py` with **stream copy** (h264 as in the source, no audio) |
| `.packets.csv` | 100 | video packet (= frame) | `fix_cfr`: packet timestamps of the cfr video and of the original `.avi` |
| `.stream.json` | - | - | `fix_cfr`: ffprobe info of the cfr video (`video_info`) and of the original (`video_info_orig`) |
| `.detections.csv` | 1001 | detection | `do_detection` (YOLO pose, raw) |
| `.tracks.csv` | 923 | detection kept after cleaning/NMS | `do_tracking` |
| `.tracks.crops.csv` | 923 | same as tracks | `do_secondary_inference --crop` |
| `.tags.csv` | 5 | decoded AprilTag | `TagsEngine --tags` |
| `.tracks+tags.csv` | 923 | same as tracks | `do_tag_merge` |
| `.events.csv` | 23 | **track** | `do_event_classification` |
| `.events.csv.config.json` | - | - | parameters used for the events |
| `.events_tagged.csv` | 1 | track that has a tag id | `do_event_classification` |
| `.tracks_tagged.csv` | 20 | detection of a tagged track | `process_track_tagged` |
| `.augmented.csv` | 923 | same as tracks | `cb secondary` (every engine's scalar columns merged into crops) |
| `.pollentag.csv` | 49 | pollen/tag box | pollen/tag detector run on the crops (**no writer in `cyindibee_video`**: columns documented from the data) |
| `source.json` | - | - | provenance of the extraction |
| `extract_sample.py` | - | - | regenerates everything above from `/mnt/data/gurabo4` |

The reference for the pipeline columns is `docs/output-schemas.md` of `cyindibee_video`;
what follows is the subset needed to read these files.

### Conventions

- `frame`: 0-indexed, rebased to the clip (source frame - 250). Timestamp of frame `f` is `2019-08-17 09:00:12.500 + f/20 s` (see `timestamp` in `.tracks+tags.csv`, which keeps the real wall-clock time, i.e. is **not** rebased).
- `video_name` is rewritten to `sample_gurabo.cfr.mp4`; `crop_filepath` is rewritten to `crops/<crop_filename>`.
  The crop JPGs are **not** included, and `crop_filename` keeps the **source** numbering (`..T<track>_F<source frame>.jpg`).
- `track_id` is the id in the full video (0-indexed, not renumbered: ids 5..48 here). `det_id` is the per-frame detection index.
- Keypoints: `head`, `neck`, `thorax`, `waist`, `tail`, each with `_x`, `_y`, `_conf`, `_visibility` (2 if `_conf` >= 0.5, else 0).
- Booleans are `True`/`False`; empty cell = NaN.

### `.detections.csv` (raw YOLO)

`video_name, frame, detection_id` (1-based per frame), `bbox_x, bbox_y` (**center** of the box), `bbox_width, bbox_height, bbox_confidence`,
then the 5 keypoints x `_x,_y,_conf,_visibility`. Invisible keypoints are at (0,0).
This is the only file whose id column is named `detection_id` (it is `det_id` everywhere else).

### `.tracks.csv`

`frame, det_id, score, video_name`, the detection columns (bbox, keypoints), then:

| column | meaning |
|---|---|
| `waist_src`, `angle_src` | which keypoints were used to get the waist (`waist` = detected, else interpolated, e.g. `head,tail`) and the angle (e.g. `head,tail`) |
| `track_id` | persistent track id |
| `cx, cy` | bee position = waist (x, y) |
| `angle` | orientation in degrees |
| `virtual` | True if the row fills a gap (no real detection); 2 rows in this sample (their `det_id` is >= 10000, they have no row in `.detections.csv`) |
| `vx, vy` | velocity (px/frame) |
| `cost` | Hungarian assignment cost (px) |
| `pcx, pcy, pa, pvx, pvy` | prediction for the next frame; empty on the first row of a track |

Detections discarded by cleaning or NMS are in `.detections.csv` but not here (1001 vs 923 rows).

### `.packets.csv` and `.stream.json` (video)

`.packets.csv`, one row per frame: `frame`, `key_frame` (1 = keyframe; here frames 0 and 50), `pts, pts_time, dts, dts_time`
(timestamps of the cfr clip; `pts` in units of the time base 1/10240, i.e. 512 per frame), `flags`, then the same information for the original
`.avi` before the cfr conversion with the suffix `_orig` (`key_frame_orig, dts_orig, dts_time_orig, flags_orig, pts_orig, pts_time_orig`).
`frame` and all timestamps are rebased to start at 0 like the clip (`pts_orig` is 0 everywhere in the source: an `.avi` without pts).
The values of `pts`/`pts_time` equal what `ffprobe` reports on `sample_gurabo.cfr.mp4`.

`.stream.json`: two ffprobe stream dictionaries written by `fix_cfr`. `video_info` describes the cfr video and was
**refreshed with ffprobe on this clip** (`nb_frames` 100, `duration` 5.0, `bit_rate`, `video_path`...); `video_info_orig` describes the full original
recording and is kept unmodified (`nb_frames` 72000, `video_path` of the source `.avi`). An added `extract` key records the source video and
first source frame.

### `.tracks.crops.csv`

`.tracks.csv` plus: `dorsal_len` (head->tail distance), `crop_bee_scale`, `save_crop` (True if a JPG was dumped for this row),
`crop_filename`, `crop_filepath`, `crop_M00..crop_M12` (2x3 affine crop -> frame, for `cv2.warpAffine` with `WARP_INVERSE_MAP`),
and `tags.id, tags.dm, tags.n` (tag id, decision margin and number of tags found on this detection's crop; 0 when none).

### `.tags.csv`

`frame, det_id, track_id` (link to tracks), `tag_id`, `tag_hamming` (0 = perfect), `tag_goodness`, `tag_dm` (decision margin: main quality
signal), `tag_cx, tag_cy` (center), `tag_p0x..tag_p3y` (4 corners), `tag_H` (3x3 homography, flattened, as a quoted string),
`tag_dx, tag_dy` (crop offset), `tag_ntags`. Note `tag_id` can be wrong when `tag_hamming` > 0 or `tag_dm` is low:
the track-level `track_tagid` (below) only trusts `tag_dm` >= `dm_min`.

### `.tracks+tags.csv`

`tracks.csv` left-joined with `tags.csv` on `(frame, det_id)`; adds `timestamp` (`YYYY-MM-DD HH:MM:SS.mmm`). Rows without a tag have empty `tag_*`.
Column order differs from `tracks.csv` (`frame, det_id, track_id, tag_id, video_name, cx, cy, angle, virtual, tag_hamming, tag_dm, ...`).

### `.events.csv` and `.events_tagged.csv` (track level)

One row per track of the whole video that appears in the clip, **so these are full-track values, not clipped to the second**:
`track_startframe`/`track_endframe` are rebased like `frame` and can therefore be negative (track started before the clip, e.g. -250)
or larger than 99 (up to 719); `track_length` is the real length. In this clip there are 9 `exit`, 8 `unknown` and 6 `noise` tracks (no `entrance`).

| column | meaning |
|---|---|
| `track_id` | as in tracks |
| `track_shape` | `<start zone>_<end zone>`: `inside` / `outside` of the hive entrance, e.g. `outside_inside` |
| `track_event` | `entrance`, `exit`, `entrance_partial`, `exit_partial`, `walking`, `noise` or `unknown` |
| `track_startframe/x/y/a`, `track_endframe/x/y/a` | first and last frame, position and angle |
| `track_length` | number of frames of the track |
| `track_starttime`, `track_endtime` | wall-clock times (real, not rebased) |
| `track_tagid` | tag id of the track (best `tag_dm` >= `dm_min`), empty if none |
| `track_hastag` | a tag was decoded at least once |
| `track_dm`, `track_ntagidunique`, `track_ntagid` | best decision margin, distinct tag ids decoded, number of decodings |

`.events_tagged.csv` is `.events.csv` restricted to the rows with a `track_tagid` (here only track 36, tag 1641).
`.events.csv.config.json` holds the classification parameters: `{"type": "entrance-exit", "inside": 1000, "outside": 400, "entrance_top": true, "dm_min": 30}`
(`inside`/`outside`/`entrance_top` define the zones used for `track_shape`; `dm_min` is the minimal tag decision margin; see `track_classification.py` in `cyindibee_video` for the exact rule).

### `.tracks_tagged.csv`

Detection-level rows of the tracks that have a `track_tagid`: `.tracks+tags.csv` left-joined with `.events_tagged.csv` on `track_id`
(all columns of both; the `track_*` columns are repeated on each row). The first column is the unnamed pandas index; it is renamed `index` and renumbered from 0 here.

### `.augmented.csv`

`.tracks.crops.csv` plus the scalar outputs of the secondary engines: `pollentag.pollen_n, pollentag.pollen_score, pollentag.tag_n, pollentag.tag_score`
(number and best score of pollen / tag boxes found on this detection's crop).

### `.pollentag.csv`

One row per box found on the crops: `frame, det_id, track_id`, `cls` (`pollen` or `tag`), `conf`,
`x1, y1, x2, y2` (box in **crop** coordinates) and `fx1, fy1, fx2, fy2` (same box in **frame** coordinates).
In this sample 33 `tag` boxes and 16 `pollen` boxes.

## Not included

- Crop JPGs (`crops/`) and ReID features (`.reid_features.h5`).
- Anything outside source frames 250-349: see `extract_sample.py` to cut another window (`--start`, `--nframes`; it is extended to keyframes
  and the sidecars are cut on the same window; the sidecars are read only up to the window, so it runs in seconds). It needs read access to `/mnt/data/gurabo4`.

## Relation to the webapp's own formats

The files of [`../sample/`](../sample/) (which the dev webapp serves) use a different, simpler layout:
`tracks.csv` = `frame, track_id, cx, cy, angle, <part>_visibility/_x/_y` (no `det_id`, `bbox_*`, `score`), and
`tags.csv` = `frame, id, cx, cy, hamming, goodness, dm, p0x..p3y` (`id`, not `tag_id`).
This folder keeps the pipeline's own layout; it is the raw material for such conversions. (Not checked here: whether the webapp loaders accept these files as is.)
