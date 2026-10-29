<!-- GENERATED from ../entities.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Entities (ENT)

Conventions: [README.md](../README.md). Edit this file; read the generated view [docs/view_entities.md](view_entities.md).
Fields are summarized from
[analysis/04-data-model.md](../../analysis/04-data-model.md) (4.1, 4.4), which has the
detail and the evidence. All items are `status: draft`, `confidence: inferred`.

## Contents

| ID | Name |
|---|---|
| ENT-001 | [Observation (annotation of one bee in one frame)](#ent-001-observation-annotation-of-one-bee-in-one-frame) |
| ENT-002 | [Tag detection](#ent-002-tag-detection) |
| ENT-003 | [Video](#ent-003-video) |
| ENT-004 | [Annotation file / record](#ent-004-annotation-file--record) |
| ENT-005 | [Dataset](#ent-005-dataset) |

## ENT-001: Observation (annotation of one bee in one frame)

Stored in the global `Tracks`, indexed by frame then bee ID (IDs are strings). Fields:
`ID`, `frame`, `time`, box (`x y width height`, plus redundant `cx cy`), `angle`,
`labels` (comma string) and `bool_acts` (4 flags, redundant with labels), `notes`.
Optional: `parts` (skeleton keypoints), `newid` (wrongid), `fix` (tag fix), `visit`, `span`.
`tag` is attached at runtime and is not saved.

- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Observation`, `copyObs`, `cloneObs`
- **Links:** T-002, [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling"), [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics")

## ENT-002: Tag detection

Stored in the global `Tags`, indexed by frame. Fields: `id` (int), `frame`, center `c`,
4 corners `p`, `hamming`, `goodness`, optionally `dm`. Tag IDs are ints, bee IDs are
strings; untagged tracks get `T<n>` ids in the `tracks_tagged` CSV.

- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `cacheTags`, `getTags`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tagsAddFrames`
- **Links:** T-001, [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [OQ-002](../../QUESTIONS.md#oq-002 "Tag pipeline boundary")

## ENT-003: Video

Server record `Video` plus client `videoinfo` (name, fps, number of frames, start time,
preview URLs, frame offset).

- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `Video`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl`
- **Links:** P-201, [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")

## ENT-004: Annotation file / record

A serialized `Tracks` or `Tags` set: JSON v1, JSON v2 (`info.type` = `events-multiframe`
or `tags-multiframe`), CSV, `tracks_tagged` CSV (read only). On the server it is a
`VideoData` row whose text payload holds the JSON, with `created_from_id` lineage.
Format table: [analysis/04](../../analysis/04-data-model.md) 4.4.

- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `VideoData`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV1`, `convertTracksToV2`, `setTracks`
- **Links:** P-702, [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for")

## ENT-005: Dataset

Named group of videos, managed by admins through the gallery pages.

- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `DataSet`
- **Links:** P-101
