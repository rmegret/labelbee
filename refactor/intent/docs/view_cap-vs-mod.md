<!-- GENERATED from ../cap-vs-mod.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Capabilities versus proposed modules

Conventions: [README.md](../README.md). Capabilities: [capabilities.md](../capabilities.md). Modules: part (b) of each group in [modules.md](../modules.md) (~62 named modules, all proposals). Module names are as written there; `g1`..`g8` is the group whose `modules.md` section defines the module.

Fit: **ok** = one clear owner; **~** = owned, but split over groups or hidden inside a bigger module; **dup** = proposed twice under different names.

## 1. Capability leaf to modules

| CAP | Primary modules | Also involved | Fit | Note |
|---|---|---|---|---|
| [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages") Dataset and video pages | `catalog-pages`, `persistence`, `rest-api` (g1) | `core`, `file-serving`, `identity` | ok | |
| [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login") User admin and login | `identity`, `persistence` (g1) | `SessionAuth` (g7) | ~ | client login state is defined in group 7 |
| [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video") Load video metadata and video | `VideoSource`/`VideoCatalog`, `VideoInfo` (g2) | `file-serving` (g1) | ok | |
| [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek") Play and seek | `FrameSync`, `FrameBackend` (x2), `PlaybackController` (g2) | `KeyMap`, `FrameRenderer` (g4) | ok | `FrameBackend` is two rows, same name |
| [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window") Time axis and view window | `ChronoAxesView`, `ChronoWindowBars` (g3) | `ChronoPanel`, `TrackWindow` (g4) | ~ | track window is shared with the overlay ([SEAM-405](view_seams.md#seam-405-track-window-shared-with-the-chronogram "Track window shared with the chronogram")) |
| [CAP-302](view_capabilities.md#cap-302-id-axis-and-layout "ID axis and layout") ID axis and layout | `ChronoAxesView` (g3) | `derive/ids.js` (g8), `ChronoPanel` | ~ | ID order logic lives in group 8 |
| [CAP-303](view_capabilities.md#cap-303-event-display "Event display") Event display | `ChronoLayers` (g3) | `derive/events.js` (g8) | ok | |
| [CAP-304](view_capabilities.md#cap-304-tag-display "Tag display") Tag display | `ChronoLayers` (g3) | `derive/tagintervals.js` (g8) | ~ | tags are "later" in `ChronoLayers` |
| [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation") Event navigation | `ChronoNavigation` (g3) | | ok | |
| [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes") Bee track boxes | `BoxLayer`, `BoxEditing`, `TrackLayer`+`TrackWindow`, `IdPrediction` (g4) | `ViewTransform`, `CanvasLayout`, `FrameRenderer`, `OverlayOptions` | ok | 8 modules for one leaf: the CAP is coarse |
| [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame") Tag display on the frame | `TagLayer` (g4) | | ok | |
| [CAP-403](view_capabilities.md#cap-403-skeleton-overlay "Skeleton overlay") Skeleton overlay | `BoxLayer` (g4, skeleton drawing) | `keypoints` (g5, data) | ~ | no module of its own |
| [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling") Skeleton labelling | `keypoints`, `zoom-view` (g5) | | ok | |
| [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix") Tag ID assignment and fix | `tag-fix`, `tag-image`, `alternate-tags-panel`, `zoom-view` (g5) | | ok | |
| [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes") Behavior labels and notes | `LabelModel`, `LabelPanel`, `ObservationForm` (g6) | | ok | |
| [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits") Pollination visits | `VisitEditor`, `SpanEditor` (g6) | `InteractionModes` (g4) | dup | `InteractionModes` also holds `VisitWidget`, `TimelineWidget`, pick-frame |
| [CAP-603](view_capabilities.md#cap-603-summaries-and-statistics "Summaries and statistics") Summaries and statistics | `AnnotationStats`/`ObsTable` (g6) | | ok | |
| [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo") Annotation model, selection and undo | `AnnotationStore`, `ObservationSchema` (g7) | `SelectionModel`, `UndoStack` (g6) | ~ | one CAP, two groups |
| [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save") Local file load and save | `LocalFileIO`, `AnnotationCodec`, `LoadSaveDialogs` (g7) | | ok | |
| [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save") Server load and save | `ServerAnnotationClient`, `LoadSaveDialogs`, `AnnotationCodec` (g7) | server: `annotation-store`, `rest-api`, `persistence` (g1) | ok | `annotation-store` (g1) vs `AnnotationStore` (g7): near-identical names |
| [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import") External-tool import | `AnnotationCodec` (g7) | `ServerAnnotationClient` (CSV fetchers) | ~ | no module of its own |
| [CAP-705](view_capabilities.md#cap-705-export "Export") Export | `AnnotationCodec`, `LocalFileIO` (g7) | `zoom-view` (frame export), `FrameRenderer.exportFrame` | ~ | spread over 4 modules, none named for it |
| [CAP-706](view_capabilities.md#cap-706-experimental-db-sources "Experimental DB sources") Experimental DB sources | `DevDbSources` (g7) | | ok | |
| [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising") Load-time sanitising | `AnnotationCodec` (g7) | | ~ | inside the codec |
| [CAP-801](view_capabilities.md#cap-801-filters "Filters") Filters | `derive/filters.js` (g8) | `TagFilter` (g4), "filter panel controller" (g8, unnamed) | dup | same thing proposed in g4 and g8 |
| [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines") Derived-structure pipelines | `derive/pipeline.js`, `flatten`, `events`, `ids`, `tagintervals` (g8) | `ChronoData` (g3) | dup | `ChronoData` (g3) is `derive/pipeline.js` (g8) |
| [CAP-803](view_capabilities.md#cap-803-annotation-clean-up "Annotation clean-up") Annotation clean-up | `derive/tools.js` (`findObsolete`) (g8) | `tag-fix` (g5, `delete*`) | ~ | split over two groups |
| [CAP-804](view_capabilities.md#cap-804-tag-interpolation-and-motion-direction "Tag interpolation and motion direction") Tag interpolation and motion direction | `derive/tools.js` (g8) | | ok | |

Count: 28 leaves, 15 ok, 10 ~, 3 dup.

## 2. Modules with no single CAP

| Module | Role | Serves |
|---|---|---|
| `core`, `ops` (g1) | server infrastructure, diagnostics | all server CAPs; `ops` none |
| `PageShell`, `KeyMap` (g2) | page layout; all shortcuts ([DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place")) | all front-end CAPs |
| `AjaxErrorReporting`, `SessionAuth` (g7) | shared error display; client login state | [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")..700 |
| `ViewTransform`, `CanvasLayout`, `OverlayOptions` (g4) | canvas math and options | [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")..403, 501 |
| `ChronoPanel` (g3) | chronogram DOM controls | [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")..305 |
| `SelectionModel`, `UndoStack` (g6) | selection, undo | [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), 501, 601, 701 |

## 3. Reading

- **Alignment is good where one group maps to one layer**: [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users"), 200, 300, 500, 600 and the I/O half of 700.
- **Three things are proposed twice** (the `dup` rows): derived data (`ChronoData` / `derive/*`), tag filters (`TagFilter` / `derive/filters.js`), visit and span modes (`InteractionModes` / `VisitEditor` + `SpanEditor`). One canonical module each must be chosen before any step builds on them.
- **Four modules sit in a different group than their CAP**: `SelectionModel` and `UndoStack` (g6, [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")), `SessionAuth` (g7, [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")), `TagFilter` (g4, [CAP-801](view_capabilities.md#cap-801-filters "Filters")).
- **Leaves without an owner module**: [CAP-403](view_capabilities.md#cap-403-skeleton-overlay "Skeleton overlay"), 704, 705, 707 live inside bigger modules.
- **Naming is not uniform**: kebab-case (g1, g5), PascalCase (g2..g4, g6, g7), `derive/x.js` (g8); `annotation-store` and `AnnotationStore` coexist.
