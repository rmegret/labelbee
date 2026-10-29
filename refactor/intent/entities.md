# Entities (ENT)

Conventions: [README.md](README.md). Edit this file; read the generated view [docs/view_entities.md](docs/view_entities.md).
Fields are summarized from
[analysis/04-data-model.md](../analysis/04-data-model.md) (4.1, 4.4), which has the
detail and the evidence. All items are `status: draft`, `confidence: inferred`.

## Contents

<!-- toc -->

## ENT-001: Observation (annotation of one bee in one frame)

Stored in the global `Tracks`, indexed by frame then bee ID (IDs are strings). Fields:
`ID`, `frame`, `time`, box (`x y width height`, plus redundant `cx cy`), `angle`,
`labels` (comma string) and `bool_acts` (4 flags, redundant with labels), `notes`.
Optional: `parts` (skeleton keypoints), `newid` (wrongid), `fix` (tag fix), `visit`, `span`.
`tag` is attached at runtime and is not saved.

- **Code:**
  - `Model.js`: `Observation`, `copyObs`, `cloneObs`
- **Links:** T-002, CAP-401, CAP-601, CAP-501, CAP-602, CAP-701, OQ-003, OQ-006

## ENT-002: Tag detection

Stored in the global `Tags`, indexed by frame. Fields: `id` (int), `frame`, center `c`,
4 corners `p`, `hamming`, `goodness`, optionally `dm`. Tag IDs are ints, bee IDs are
strings; untagged tracks get `T<n>` ids in the `tracks_tagged` CSV.

- **Code:**
  - `Model.js`: `cacheTags`, `getTags`
  - `AnnotationIO.js`: `tagsAddFrames`
- **Links:** T-001, CAP-402, CAP-502, OQ-002

## ENT-003: Video

Server record `Video` plus client `videoinfo` (name, fps, number of frames, start time,
preview URLs, frame offset).

- **Code:**
  - `labelbee/models.py`: `Video`
  - `VideoControl.js`: `VideoControl`
- **Links:** P-201, CAP-101

## ENT-004: Annotation file / record

A serialized `Tracks` or `Tags` set: JSON v1, JSON v2 (`info.type` = `events-multiframe`
or `tags-multiframe`), CSV, `tracks_tagged` CSV (read only). On the server it is a
`VideoData` row whose text payload holds the JSON, with `created_from_id` lineage.
Format table: [analysis/04](../analysis/04-data-model.md) 4.4.

- **Code:**
  - `labelbee/models.py`: `VideoData`
  - `AnnotationIO.js`: `convertTracksToV1`, `convertTracksToV2`, `setTracks`
- **Links:** P-702, CAP-703, INV-003, OQ-003

## ENT-005: Dataset

Named group of videos, managed by admins through the gallery pages.

- **Code:**
  - `labelbee/models.py`: `DataSet`
- **Links:** P-101
