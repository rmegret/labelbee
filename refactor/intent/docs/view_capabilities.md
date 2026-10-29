<!-- GENERATED from ../capabilities.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Capabilities (CAP)

Conventions: [README.md](../README.md). Edit this file; read the generated view
[docs/view_capabilities.md](view_capabilities.md) (links added by `tools/spec_view.py`).
Eight groups (`CAP-100 to CAP-800`, general to technical) and
their leaves (`CAP-Gnn`, `G` = group at creation). All items are `status: draft`,
`confidence: inferred` (read from the page and code, nothing run). `origin` is left out until
the maintainer answers the linked `OQ` ([QUESTIONS.md](../../QUESTIONS.md)). Page =
`labelbee_page.html`. Debts (`DEBT`) are named in the
text until `debt.md` exists.

Product purpose (`[read]` `labelbee/static/labelbee/README.txt:1`): video annotation
software for **behavior tracking of bees**. Users are presumably researchers who label
bee activity at the hive entrance in recorded video, plus admins ([OQ-001](../../QUESTIONS.md#oq-001 "Users and purpose")).
Annotation is presumably semi-automatic: tags are detected offline, the human verifies,
corrects and adds behavior ([OQ-002](../../QUESTIONS.md#oq-002 "Tag pipeline boundary"), [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee")).

Groups 3-6 are surfaces owning their display and simple visible edits; group 7 owns the
model; group 8 holds the pipelines. Options toggles, shortcuts and click modes belong to the
surface or action they affect.

## Contents

| ID | Name |
|---|---|
| **CAP-100** | **[Manage data and users](#cap-100-manage-data-and-users)** |
| CAP-101 | [Dataset and video pages](#cap-101-dataset-and-video-pages) |
| CAP-102 | [User administration and login](#cap-102-user-administration-and-login) |
| **CAP-200** | **[Load and play video](#cap-200-load-and-play-video)** |
| CAP-201 | [Load video metadata and video](#cap-201-load-video-metadata-and-video) |
| CAP-202 | [Play and seek](#cap-202-play-and-seek) |
| **CAP-300** | **[Temporal display and navigation](#cap-300-temporal-display-and-navigation)** |
| CAP-301 | [Time axis and view window](#cap-301-time-axis-and-view-window) |
| CAP-302 | [ID axis and layout](#cap-302-id-axis-and-layout) |
| CAP-303 | [Event display](#cap-303-event-display) |
| CAP-304 | [Tag display](#cap-304-tag-display) |
| CAP-305 | [Event navigation](#cap-305-event-navigation) |
| **CAP-400** | **[Overlay display and annotations](#cap-400-overlay-display-and-annotations)** |
| CAP-401 | [Bee track boxes](#cap-401-bee-track-boxes) |
| CAP-402 | [Tag display on the frame](#cap-402-tag-display-on-the-frame) |
| CAP-403 | [Skeleton overlay](#cap-403-skeleton-overlay) |
| **CAP-500** | **[Zoom view and details editing](#cap-500-zoom-view-and-details-editing)** |
| CAP-501 | [Skeleton labelling](#cap-501-skeleton-labelling) |
| CAP-502 | [Tag ID assignment and fix](#cap-502-tag-id-assignment-and-fix) |
| **CAP-600** | **[Labels, dashboards and specialized annotations](#cap-600-labels-dashboards-and-specialized-annotations)** |
| CAP-601 | [Behavior labels and notes](#cap-601-behavior-labels-and-notes) |
| CAP-602 | [Pollination visits](#cap-602-pollination-visits) |
| CAP-603 | [Summaries and statistics](#cap-603-summaries-and-statistics) |
| **CAP-700** | **[Annotation model and IO](#cap-700-annotation-model-and-io)** |
| CAP-701 | [Annotation model, selection and undo](#cap-701-annotation-model-selection-and-undo) |
| CAP-702 | [Local file load and save](#cap-702-local-file-load-and-save) |
| CAP-703 | [Server load and save](#cap-703-server-load-and-save) |
| CAP-704 | [External-tool import](#cap-704-external-tool-import) |
| CAP-705 | [Export](#cap-705-export) |
| CAP-706 | [Experimental DB sources](#cap-706-experimental-db-sources) |
| CAP-707 | [Load-time sanitising](#cap-707-load-time-sanitising) |
| **CAP-800** | **[Data filtering and processing](#cap-800-data-filtering-and-processing)** |
| CAP-801 | [Filters](#cap-801-filters) |
| CAP-802 | [Derived-structure pipelines](#cap-802-derived-structure-pipelines) |
| CAP-803 | [Annotation clean-up](#cap-803-annotation-clean-up) |
| CAP-804 | [Tag interpolation and motion direction](#cap-804-tag-interpolation-and-motion-direction) |

## CAP-100: Manage data and users

Server pages outside the annotator: datasets, videos, users, login.

### CAP-101: Dataset and video pages

Organize videos into datasets, browse them and open one in the annotator (gallery pages).

- **Group:** [CAP-100](#cap-100-manage-data-and-users "Manage data and users")
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `datasets_page`, `videos_page`, `add_dataset_page`, `edit_video_page`
  - [labelbee/models.py](../../../labelbee/models.py): `Video`, `DataSet`
- **Links:** T-003, [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [OQ-001](../../QUESTIONS.md#oq-001 "Users and purpose")

### CAP-102: User administration and login

Log in and manage users and roles (admin).

- **Group:** [CAP-100](#cap-100-manage-data-and-users "Manage data and users")
- **Code:**
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `manage_users_page`
  - [labelbee/blueprints/auth/auth.py](../../../labelbee/blueprints/auth/auth.py): `user_profile_page`
  - [labelbee/models.py](../../../labelbee/models.py): `User`, `Role`
- **Links:** -001

## CAP-200: Load and play video

Load video metadata and the video from the server, play, seek. Owns the current frame position and shows the video info.

### CAP-201: Load video metadata and video

Pick a video from the server list inside the annotator, load its metadata (`videoinfo`) and the video; show the video info panel.

- **Group:** [CAP-200](#cap-200-load-and-play-video "Load and play video")
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager`, `VideoManager.selectVideoByID`, `VideoManager.loadVideoManual`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.loadVideo`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Video Info panel`
- **Links:** T-003, [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine")

### CAP-202: Play and seek

Play, step and seek frame by frame; preview and cache modes. Owns the current frame position (future frame-sync seam).

- **Group:** [CAP-200](#cap-200-load-and-play-video "Load and play video")
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.seekFrame`, `VideoControl.playPauseVideo`, `VideoControl.playTick`, `VideoCache`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Preview panel`
- **Links:** V-002, [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine")

## CAP-300: Temporal display and navigation

Chronogram of tracks, tags and events over time. Display only: requests seeks, never owns the frame, and adapts to the filters and order it receives from [CAP-800](#cap-800-data-filtering-and-processing "Data filtering and processing"). `ChronoControlActivitiesLegacy.js` (~800 lines) is legacy: `DEBT`.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js)

### CAP-301: Time axis and view window

Time axis taken from the video; zoom and shift of the time domain; mousewheel mode; marks for the current and preview frame; video span; track-window span shared with the overlay.

- **Group:** [CAP-300](#cap-300-temporal-display-and-navigation "Temporal display and navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `scaleTimeDomain`, `shiftTimeDomain`, `updateTimeMark`, `updateVideoSpan`, `updateTrackWindowSpan`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `ChronoAxes`
- **Links:** P-202, [CAP-401](#cap-401-bee-track-boxes "Bee track boxes")

### CAP-302: ID axis and layout

One row per bee ID or tag ID, ordered and sized by the chronogram. It only adapts to the filters and ordering it receives from [CAP-800](#cap-800-data-filtering-and-processing "Data filtering and processing"); the filter buttons live in [CAP-801](#cap-801-filters "Filters").

- **Group:** [CAP-300](#cap-300-temporal-display-and-navigation "Temporal display and navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoYDomain`, `sortIds`, `chronoAdjust`
- **Links:** P-801, [CAP-802](#cap-802-derived-structure-pipelines "Derived-structure pipelines")

### CAP-303: Event display

Observations drawn as intervals: individual versus merged events, behavior labels and colors, events with a skeleton highlighted, tracks without a tag, visits read-only. Reads ready-made structures and labels through [CAP-802](#cap-802-derived-structure-pipelines "Derived-structure pipelines") (labels are edited one by one in [CAP-601](#cap-601-behavior-labels-and-notes "Behavior labels and notes")).

- **Group:** [CAP-300](#cap-300-temporal-display-and-navigation "Temporal display and navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderActivities`, `renderChrono_danglingTracks`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `ChronoAxes`
- **Links:** P-601, [CAP-602](#cap-602-pollination-visits "Pollination visits"), [CAP-802](#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics")

### CAP-304: Tag display

Tag detection intervals, free tags (not yet in a track), wrongid virtual intervals, Hamming-based display. Reads structures built by [CAP-802](#cap-802-derived-structure-pipelines "Derived-structure pipelines").

- **Group:** [CAP-300](#cap-300-temporal-display-and-navigation "Temporal display and navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderActivities`, `updateTagIntervals`, `updateTagsLabels`
- **Links:** P-402, [CAP-502](#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [CAP-802](#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

### CAP-305: Event navigation

Click and double-click to request a seek and a selection; go to first, last, next and previous event (any ID or one ID; observation, tag or free-tag events); next and previous ID; auto and event-seek modes. Never owns the frame position.

- **Group:** [CAP-300](#cap-300-temporal-display-and-navigation "Temporal display and navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`, `gotoNextEvent`, `gotoPreviousEvent`, `onAxesClick`, `onClickNextID`
- **Links:** P-202, [CAP-701](#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo"), [OQ-008](../../QUESTIONS.md#oq-008 "Chronogram role")

## CAP-400: Overlay display and annotations

Boxes, tags and skeletons drawn on the frame. Simple visible edits: draw, move, bee ID, delete, click modes. Tags are shown, not assigned.

### CAP-401: Bee track boxes

Draw, move, rotate, delete boxes and assign the bee ID on the overlay; click modes.

- **Group:** [CAP-400](#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl`, `fabric.BeeRect`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Annotations panel (BeeID, box angle)`
- **Links:** T-001, [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts")

### CAP-402: Tag display on the frame

Show detected tags, orientation and tracks over the video; tags are displayed here, not assigned.

- **Group:** [CAP-400](#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTags`, `plotTagsTracks`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#showTags`
- **Links:** T-002, [CAP-502](#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [CAP-801](#cap-801-filters "Filters")

### CAP-403: Skeleton overlay

Draw the skeleton (labelled keypoints, stored in `obs.parts`) of each bee on the main overlay when skeleton display is on (`zoomOverlay.flagShowParts`). Display only: the keypoints are placed in [CAP-501](#cap-501-skeleton-labelling "Skeleton labelling").

- **Group:** [CAP-400](#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect._drawParts`
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.flagShowParts`
- **Links:** T-001, [CAP-501](#cap-501-skeleton-labelling "Skeleton labelling"), [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling")

## CAP-500: Zoom view and details editing

Magnified bee with its own overlay. Skeleton, alternate tags, tag ID assignment and fix: home of tag review.

### CAP-501: Skeleton labelling

Place the skeleton keypoints (head, neck, thorax, waist, tail; stored as `obs.parts`) on the magnified bee, with a label per click. Shown on the main overlay by [CAP-403](#cap-403-skeleton-overlay "Skeleton overlay").

- **Group:** [CAP-500](#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay`, `ZoomOverlay.onButtonClickAddRemovePartLabel`, `ZoomOverlay.keypointLabelsFromServer`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Parts labeling panel`
- **Links:** T-001, [CAP-403](#cap-403-skeleton-overlay "Skeleton overlay"), [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling")

### CAP-502: Tag ID assignment and fix

Review detected tags, open alternate decodings, assign a tag ID to a track and fix wrong decodes. Primary home of tag review.

- **Group:** [CAP-500](#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.updateDistractors`, `ZoomOverlay.bakeTagFix`, `ZoomOverlay.onToggleButtonShowAlternate`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Alternate Tags panel`
- **Links:** T-002, [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [CAP-402](#cap-402-tag-display-on-the-frame "Tag display on the frame"), [OQ-002](../../QUESTIONS.md#oq-002 "Tag pipeline boundary")

## CAP-600: Labels, dashboards and specialized annotations

Labels, notes, behavior flags, visits (edit GUI), read-only summaries and statistics for overview, which may trigger a selection in the overlay.

### CAP-601: Behavior labels and notes

Toggle fanning, pollen, entering, leaving, wrongID, falsealarm; free-text labels and notes on the selected observation. Labels are edited one by one here. They are generic ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")): the six predefined labels are a target for plugins, and their current hard-coding is `DEBT`.

- **Group:** [CAP-600](#cap-600-labels-dashboards-and-specialized-annotations "Labels, dashboards and specialized annotations")
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelToggle`, `submit_bee`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labels`, `#notes`
- **Links:** T-001, [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics")

### CAP-602: Pollination visits

Annotate visits as frame spans, with start and end picked in pick-frame mode. Stored as a subfield of events in `Tracks` (`DEBT`: no proper structure yet).

- **Group:** [CAP-600](#cap-600-labels-dashboards-and-specialized-annotations "Labels, dashboards and specialized annotations")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget`, `TimelineWidget`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#visitblock`
- **Links:** T-001, [CAP-303](#cap-303-event-display "Event display"), [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine")

### CAP-603: Summaries and statistics

Read-only overview of the annotation: events info, statistics and the observation table (tooltip, flash on selection). Mainly for overview; may trigger a selection in the overlay.

- **Group:** [CAP-600](#cap-600-labels-dashboards-and-specialized-annotations "Labels, dashboards and specialized annotations")
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateAnnotationStatistics`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderObsTable`, `updateObsTable`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Events info panel`
- **Links:** P-802, [CAP-701](#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")

## CAP-700: Annotation model and IO

In-memory model (`Tracks`, `Tags`), selection, undo; load and save (local, server, experimental DB), formats, load-time sanitising.

### CAP-701: Annotation model, selection and undo

Owns `Tracks`, `Tags`, the current selection and the undo stack; the single place views read and edit.

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Observation`, `getObsHandle`, `storeObs`, `changeObservationID`, `cacheTags`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByID`, `undoPush`, `undoPop`, `deleteSelected`
- **Links:** T-001, [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")

### CAP-702: Local file load and save

Load and save tracks and tags as local files (JSON v1/v2, CSV).

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEventsFromFile`, `saveEventsToFile`, `loadTagsFromFile`, `saveTagsToFile`, `convertTracksToV2`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `I/O Local storage panel`
- **Links:** T-004, [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for"), [OQ-010](../../QUESTIONS.md#oq-010 "Server versus local storage")

### CAP-703: Server load and save

Load annotations from the server and save a snapshot as a new record with `created_from_id` lineage.

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`, `eventsFromServer`, `tracksListFromServer`, `FromServerDialog`
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`, `AnnotationAPI`
- **Links:** T-004, [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [OQ-010](../../QUESTIONS.md#oq-010 "Server versus local storage")

### CAP-704: External-tool import

Read output of external tools: `tracks_tagged` CSV, tags CSV and JSON.

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tracks_tagged_csv_to_json`, `tags_csv_to_json`, `tags_csv_to_tagjson`, `loadTrackTaggedCSVFromServer`
- **Links:** T-004, [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee")

### CAP-705: Export

Export tracks as CSV and as bounding boxes.

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tracksToCSV`, `tracksToBBoxes`, `saveEventsToCSV`, `saveEventsToBBoxes`
- **Links:** T-004

### CAP-706: Experimental DB sources

Load tracks from SQLite or DuckDB (experimental IO).

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTracksCSVFromDB`, `db_to_json`
  - [labelbee/static/labelbee/js/SQLiteDB.js](../../../labelbee/static/labelbee/js/SQLiteDB.js)
  - [labelbee/static/labelbee/js/DuckDB.js](../../../labelbee/static/labelbee/js/DuckDB.js)
- **Links:** T-004

### CAP-707: Load-time sanitising

Validate and normalise loaded files into a valid `Tracks`/`Tags` (duplicate ids, formats).

- **Group:** [CAP-700](#cap-700-annotation-model-and-io "Annotation model and IO")
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `sanitizeEvents`, `setTracks`, `setTags`
- **Links:** T-004, [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable")

## CAP-800: Data filtering and processing

Functional pipelines (tag integration, events to intervals, flat structures, tag intervals), filter options, clean-up. Target: pure functions only.

### CAP-801: Filters

User options that hide, select or order data for the views: hide falsealarm/wrongID, tag filters (Hamming), and the chronogram ID buttons (restrict to ID, exclude ID, hide invalid, hide flowers). The buttons guide the processing; the views, including the chronogram, only receive the result.

- **Group:** [CAP-800](#cap-800-data-filtering-and-processing "Data filtering and processing")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `click_restrictID`, `click_excludeID`, `click_hideInvalid`, `click_hideFlowers`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Tag filtering panel`
- **Links:** P-302, [CAP-402](#cap-402-tag-display-on-the-frame "Tag display on the frame")

### CAP-802: Derived-structure pipelines

Functional stages from `Tracks`/`Tags` to the structures views read: tag integration, events to intervals, flat structures, tag intervals and labels. Today rebuilt on each refresh, with mutation of `Tracks` (`DEBT`, see analysis/06 C9).

- **Group:** [CAP-800](#cap-800-data-filtering-and-processing "Data filtering and processing")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`, `updateChronogramData`, `createIntervalList`, `updateFlatTracks`, `getTTags`, `updateTagIntervals`
- **Links:** P-303, [CAP-304](#cap-304-tag-display "Tag display"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

### CAP-803: Annotation clean-up

User-triggered bulk removal of obsolete events. Writes `Tracks` directly (`DEBT`); no undo today.

- **Group:** [CAP-800](#cap-800-data-filtering-and-processing "Data filtering and processing")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `cleanObsoleteEvents`, `cleanObsoleteEventsCB`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#cleanObsoleteEventsButton`
- **Links:** -009

### CAP-804: Tag interpolation and motion direction

`interpolateTags` fills gaps in tag detections (writes `Tags`) and `computeMotionDirection` derives motion; no page button found, so use is unverified. Recorded as a `DEBT` unit: to be made a pure pipeline stage or removed.

- **Group:** [CAP-800](#cap-800-data-filtering-and-processing "Data filtering and processing")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `interpolateTags`, `computeMotionDirection`
- **Links:** T-002
