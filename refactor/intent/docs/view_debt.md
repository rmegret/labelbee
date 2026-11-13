<!-- GENERATED from ../debt.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Debt (DEBT)

Conventions: [README.md](../README.md). Edit this file; read the generated view [docs/view_debt.md](view_debt.md).
Known hacks, accidents and bugs found by reading the code (`[read]`, nothing run). Each states the intended
replacement when known. All items are `status: draft`, `confidence: inferred`. Grouped by the capability
group of the drafter (ID block `DEBT-G01..`).

## Contents

| ID | Name |
|---|---|
| DEBT-101 | [Annotation lineage `created_from_id` is never stored](#debt-101-annotation-lineage-created_from_id-is-never-stored) |
| DEBT-102 | [Saving a snapshot not based on a loaded record probably fails](#debt-102-saving-a-snapshot-not-based-on-a-loaded-record-probably-fails) |
| DEBT-103 | [`created_by_id` trusted from the client](#debt-103-created_by_id-trusted-from-the-client) |
| DEBT-104 | [`allusers` flag is a string, "own records" filter breaks](#debt-104-allusers-flag-is-a-string-own-records-filter-breaks) |
| DEBT-105 | [Authorization gaps in the API](#debt-105-authorization-gaps-in-the-api) |
| DEBT-106 | [Inconsistent envelopes and failures returned with HTTP 200](#debt-106-inconsistent-envelopes-and-failures-returned-with-http-200) |
| DEBT-107 | [Security hygiene: CSRF exemption, secrets in log, committed credential](#debt-107-security-hygiene-csrf-exemption-secrets-in-log-committed-credential) |
| DEBT-108 | [`/admin/version` public, shell-based and escaped](#debt-108-adminversion-public-shell-based-and-escaped) |
| DEBT-109 | [Manage users: role wipe and no rollback](#debt-109-manage-users-role-wipe-and-no-rollback) |
| DEBT-110 | [Broken and orphan templates](#debt-110-broken-and-orphan-templates) |
| DEBT-111 | [Dataset deletion cannot be done from the UI](#debt-111-dataset-deletion-cannot-be-done-from-the-ui) |
| DEBT-112 | [Edit video page defects](#debt-112-edit-video-page-defects) |
| DEBT-113 | [Video upload and delete are unsafe](#debt-113-video-upload-and-delete-are-unsafe) |
| DEBT-114 | [Annotator route ignores its parameters and has dead code](#debt-114-annotator-route-ignores-its-parameters-and-has-dead-code) |
| DEBT-115 | [Dead, duplicated or inconsistent backend code](#debt-115-dead-duplicated-or-inconsistent-backend-code) |
| DEBT-116 | [Download and range handling defects](#debt-116-download-and-range-handling-defects) |
| DEBT-117 | [Gallery page cosmetics and external dependencies](#debt-117-gallery-page-cosmetics-and-external-dependencies) |
| DEBT-118 | [Tag-file load uses a nonexistent route](#debt-118-tag-file-load-uses-a-nonexistent-route) |
| DEBT-121 | [API login reports SUCCESS for inactive users](#debt-121-api-login-reports-success-for-inactive-users) |
| DEBT-122 | [Two `Marshmallow` objects, the one used by the schemas is never initialised](#debt-122-two-marshmallow-objects-the-one-used-by-the-schemas-is-never-initialised) |
| DEBT-123 | [Gallery POST handlers copy the profile form onto the current user](#debt-123-gallery-post-handlers-copy-the-profile-form-onto-the-current-user) |
| DEBT-124 | [Posted `timestamp` of an annotation record is loaded as a datetime](#debt-124-posted-timestamp-of-an-annotation-record-is-loaded-as-a-datetime) |
| DEBT-201 | [Ctrl+Right and Ctrl+Shift+Right fall through to a second move](#debt-201-ctrlright-and-ctrlshiftright-fall-through-to-a-second-move) |
| DEBT-202 | [delayedSeekFrame is cleared before it is used](#debt-202-delayedseekframe-is-cleared-before-it-is-used) |
| DEBT-203 | [Router and hash-listener bugs](#debt-203-router-and-hash-listener-bugs) |
| DEBT-204 | [Async video selection does not await what it starts](#debt-204-async-video-selection-does-not-await-what-it-starts) |
| DEBT-205 | [Load errors throw inside callbacks; promises never settle](#debt-205-load-errors-throw-inside-callbacks-promises-never-settle) |
| DEBT-206 | [Shortcut `p` does nothing](#debt-206-shortcut-p-does-nothing) |
| DEBT-207 | [Dead and misplaced key handling around the ID field](#debt-207-dead-and-misplaced-key-handling-around-the-id-field) |
| DEBT-208 | [Obsolete video/preview code still shipped](#debt-208-obsolete-videopreview-code-still-shipped) |
| DEBT-209 | [Cache seeks have no staleness check](#debt-209-cache-seeks-have-no-staleness-check) |
| DEBT-210 | [VideoCache queue defects](#debt-210-videocache-queue-defects) |
| DEBT-211 | [Play button state display](#debt-211-play-button-state-display) |
| DEBT-213 | [Mode switch does not resynchronize the displayed frame](#debt-213-mode-switch-does-not-resynchronize-the-displayed-frame) |
| DEBT-214 | [Global variables and implicit globals](#debt-214-global-variables-and-implicit-globals) |
| DEBT-215 | [eval and hard-coded sample record in loadVideoManual](#debt-215-eval-and-hard-coded-sample-record-in-loadvideomanual) |
| DEBT-216 | [Frame offset and fps edits recompute inconsistently](#debt-216-frame-offset-and-fps-edits-recompute-inconsistently) |
| DEBT-217 | [Quick Help contradicts the code](#debt-217-quick-help-contradicts-the-code) |
| DEBT-219 | [Frame bounds test lets NaN/undefined through](#debt-219-frame-bounds-test-lets-nanundefined-through) |
| DEBT-220 | [Cache-mode playback never stops at the end](#debt-220-cache-mode-playback-never-stops-at-the-end) |
| DEBT-221 | [Time conversions disagree on frameoffset; local ISO formatting](#debt-221-time-conversions-disagree-on-frameoffset-local-iso-formatting) |
| DEBT-223 | [Fixed 20 fps assumptions](#debt-223-fixed-20-fps-assumptions) |
| DEBT-224 | [Fullscreen call is WebKit-only and has dead code](#debt-224-fullscreen-call-is-webkit-only-and-has-dead-code) |
| DEBT-225 | [Template markup defects in the video block](#debt-225-template-markup-defects-in-the-video-block) |
| DEBT-226 | [Dead collapse-event code and debug output in init](#debt-226-dead-collapse-event-code-and-debug-output-in-init) |
| DEBT-227 | [`.video_id` shows `#video_id=undefined` before any video](#debt-227-video_id-shows-video_idundefined-before-any-video) |
| DEBT-228 | [videoLoad status row: request logged at completion, error before any request](#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request) |
| DEBT-229 | [Features init uses a block id that does not match the checkbox handler](#debt-229-features-init-uses-a-block-id-that-does-not-match-the-checkbox-handler) |
| DEBT-230 | [Hard-coded gurabo4 video+tracks loader](#debt-230-hard-coded-gurabo4-videotracks-loader) |
| DEBT-301 | [Default renderer omits tag intervals, crosses, parts and individual events](#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events) |
| DEBT-302 | [Chronogram is a god object over free globals](#debt-302-chronogram-is-a-god-object-over-free-globals) |
| DEBT-303 | [Wrong comment/behavior for the pan clamp](#debt-303-wrong-commentbehavior-for-the-pan-clamp) |
| DEBT-304 | [xdomainFocus uses a zoom API that D3 no longer has (TypeError)](#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror) |
| DEBT-305 | [Redraw and layout are expensive and loop-prone](#debt-305-redraw-and-layout-are-expensive-and-loop-prone) |
| DEBT-306 | [ID axis ordering and remap fall-through](#debt-306-id-axis-ordering-and-remap-fall-through) |
| DEBT-307 | [Four label colors hard-coded in CSS and JS](#debt-307-four-label-colors-hard-coded-in-css-and-js) |
| DEBT-308 | [Hard-coded ROI and dangling-mark colors](#debt-308-hard-coded-roi-and-dangling-mark-colors) |
| DEBT-309 | [Show Events off leaves stale intervals](#debt-309-show-events-off-leaves-stale-intervals) |
| DEBT-310 | [Legacy file contains live and dead code, and is always loaded](#debt-310-legacy-file-contains-live-and-dead-code-and-is-always-loaded) |
| DEBT-311 | [Redraw overwrites labeled/virtual tag intervals](#debt-311-redraw-overwrites-labeledvirtual-tag-intervals) |
| DEBT-312 | [Dead interaction code](#debt-312-dead-interaction-code) |
| DEBT-313 | [Navigation sorts shared arrays in place and mixes id types](#debt-313-navigation-sorts-shared-arrays-in-place-and-mixes-id-types) |
| DEBT-314 | [Next/Prev ID blocked by RestrictID; side effects](#debt-314-nextprev-id-blocked-by-restrictid-side-effects) |
| DEBT-315 | ["Show on Chrono" button is outside the synchronisation class](#debt-315-show-on-chrono-button-is-outside-the-synchronisation-class) |
| DEBT-316 | [Chronogram file writes annotations](#debt-316-chronogram-file-writes-annotations) |
| DEBT-317 | [Selected-ID outline for an ID without a row](#debt-317-selected-id-outline-for-an-id-without-a-row) |
| DEBT-318 | [Tag branch of validTagIdsDomain reads a field tag intervals do not have](#debt-318-tag-branch-of-validtagidsdomain-reads-a-field-tag-intervals-do-not-have) |
| DEBT-401 | [plotTag leaves the canvas state unbalanced](#debt-401-plottag-leaves-the-canvas-state-unbalanced) |
| DEBT-402 | [Dead `Tags` branch of `getTag` and global `tagMode`](#debt-402-dead-tags-branch-of-gettag-and-global-tagmode) |
| DEBT-403 | [Dead code in the overlay file](#debt-403-dead-code-in-the-overlay-file) |
| DEBT-404 | [ID prediction conflict path and string ID arithmetic](#debt-404-id-prediction-conflict-path-and-string-id-arithmetic) |
| DEBT-405 | [submit_bee failures are silent or misreported](#debt-405-submit_bee-failures-are-silent-or-misreported) |
| DEBT-406 | [Two parallel encodings of labels in overlay drawing and creation](#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation) |
| DEBT-407 | [Module state held in implicit globals](#debt-407-module-state-held-in-implicit-globals) |
| DEBT-408 | [Canvas sizing issues](#debt-408-canvas-sizing-issues) |
| DEBT-409 | [Box clone omits span, predicted and tag; drawing re-reads Tracks; transparent prediction crashes (severity H)](#debt-409-box-clone-omits-span-predicted-and-tag-drawing-re-reads-tracks-transparent-prediction-crashes-severity-h) |
| DEBT-410 | [Interactive creation details](#debt-410-interactive-creation-details) |
| DEBT-411 | [User-typed JavaScript executed with Function(); odd color coefficient](#debt-411-user-typed-javascript-executed-with-function-odd-color-coefficient) |
| DEBT-412 | [hardRefresh does too much](#debt-412-hardrefresh-does-too-much) |
| DEBT-413 | [TimelineWidget zoom and size buttons are broken](#debt-413-timelinewidget-zoom-and-size-buttons-are-broken) |
| DEBT-414 | [Experimental timeline preloads the wrong frames](#debt-414-experimental-timeline-preloads-the-wrong-frames) |
| DEBT-415 | [Pick Flower reads flowers from frame 0 and edits Tracks directly](#debt-415-pick-flower-reads-flowers-from-frame-0-and-edits-tracks-directly) |
| DEBT-501 | [Tag-view checkbox default contradicts HTML; initial button states target wrong ids](#debt-501-tag-view-checkbox-default-contradicts-html-initial-button-states-target-wrong-ids) |
| DEBT-502 | [Selection change refreshes the zoom twice and re-syncs on every drag event](#debt-502-selection-change-refreshes-the-zoom-twice-and-re-syncs-on-every-drag-event) |
| DEBT-503 | [Dead branch in overlay drawing and unbalanced canvas state](#debt-503-dead-branch-in-overlay-drawing-and-unbalanced-canvas-state) |
| DEBT-504 | [exportZoomImage has no guard for no selection and mixes responsibilities](#debt-504-exportzoomimage-has-no-guard-for-no-selection-and-mixes-responsibilities) |
| DEBT-505 | [Pixel-level tag processing in the UI object, with undeclared globals](#debt-505-pixel-level-tag-processing-in-the-ui-object-with-undeclared-globals) |
| DEBT-506 | [Alternate list is computed from the previous refresh's tag bits](#debt-506-alternate-list-is-computed-from-the-previous-refreshs-tag-bits) |
| DEBT-508 | [Keypoint vocabulary is a hard-coded global map](#debt-508-keypoint-vocabulary-is-a-hard-coded-global-map) |
| DEBT-509 | [Renaming a marker is not synced to the observation](#debt-509-renaming-a-marker-is-not-synced-to-the-observation) |
| DEBT-510 | [Marker offset of 3 px and mixed origin conventions](#debt-510-marker-offset-of-3-px-and-mixed-origin-conventions) |
| DEBT-511 | [Parts display toggle spread over three modules](#debt-511-parts-display-toggle-spread-over-three-modules) |
| DEBT-512 | [Label list editing leftovers](#debt-512-label-list-editing-leftovers) |
| DEBT-513 | [Preset dialog reports success on a malformed file; route only in legacy](#debt-513-preset-dialog-reports-success-on-a-malformed-file-route-only-in-legacy) |
| DEBT-514 | [rotateTag marks the bee as wrongid even for a pure rotation and clears obs.newid](#debt-514-rotatetag-marks-the-bee-as-wrongid-even-for-a-pure-rotation-and-clears-obsnewid) |
| DEBT-515 | [Tag fix helpers have undeclared globals and heavy side effects](#debt-515-tag-fix-helpers-have-undeclared-globals-and-heavy-side-effects) |
| DEBT-516 | [Hamming-matrix alternate source is dead code; inline onclick ids](#debt-516-hamming-matrix-alternate-source-is-dead-code-inline-onclick-ids) |
| DEBT-517 | [bakeTagFix defects](#debt-517-baketagfix-defects) |
| DEBT-518 | [onClickAlternateTag leftovers](#debt-518-onclickalternatetag-leftovers) |
| DEBT-519 | [Undo of tag fixes is partial](#debt-519-undo-of-tag-fixes-is-partial) |
| DEBT-520 | [deleteFalsealarmTags changes the container type of Tags[F].tags](#debt-520-deletefalsealarmtags-changes-the-container-type-of-tagsftags) |
| DEBT-601 | [Predefined labels hard-coded in several places](#debt-601-predefined-labels-hard-coded-in-several-places) |
| DEBT-602 | [Label normalization hijacks single letters and does not deduplicate](#debt-602-label-normalization-hijacks-single-letters-and-does-not-deduplicate) |
| DEBT-603 | [`bool_acts` shim and its dead helpers](#debt-603-bool_acts-shim-and-its-dead-helpers) |
| DEBT-604 | [`submit_bee` return values and ignored argument](#debt-604-submit_bee-return-values-and-ignored-argument) |
| DEBT-605 | [Visits as events with ad-hoc subfields, two incompatible forms](#debt-605-visits-as-events-with-ad-hoc-subfields-two-incompatible-forms) |
| DEBT-606 | [VisitWidget code defects](#debt-606-visitwidget-code-defects) |
| DEBT-607 | [`copyObs` omits `span`, so new visits and undeleted events lose it](#debt-607-copyobs-omits-span-so-new-visits-and-undeleted-events-lose-it) |
| DEBT-608 | [TimelineWidget is unfinished and broken](#debt-608-timelinewidget-is-unfinished-and-broken) |
| DEBT-609 | [Pick-frame panel built inside `OverlayControl.hardRefresh`](#debt-609-pick-frame-panel-built-inside-overlaycontrolhardrefresh) |
| DEBT-610 | [Events-info and statistics defects](#debt-610-events-info-and-statistics-defects) |
| DEBT-611 | [Observation table rebuilt on every refresh, gated by an accordion CSS class](#debt-611-observation-table-rebuilt-on-every-refresh-gated-by-an-accordion-css-class) |
| DEBT-612 | [Selection state split across globals and the Fabric canvas](#debt-612-selection-state-split-across-globals-and-the-fabric-canvas) |
| DEBT-613 | [Undelete loses `span`; may overwrite a new observation](#debt-613-undelete-loses-span-may-overwrite-a-new-observation) |
| DEBT-614 | [Undo covers only deletion; dead branches](#debt-614-undo-covers-only-deletion-dead-branches) |
| DEBT-615 | [Undo button label uses `.val()` on a `<button>`](#debt-615-undo-button-label-uses-val-on-a-button) |
| DEBT-616 | [Dead `p` shortcut](#debt-616-dead-p-shortcut) |
| DEBT-617 | [Other dead or leaky code in SelectionControl.js](#debt-617-other-dead-or-leaky-code-in-selectioncontroljs) |
| DEBT-618 | [Legacy Pick Flower has side effects and failure paths](#debt-618-legacy-pick-flower-has-side-effects-and-failure-paths) |
| DEBT-619 | [Unvalidated or silently dropped input in label and ID editors](#debt-619-unvalidated-or-silently-dropped-input-in-label-and-id-editors) |
| DEBT-620 | [Dead branches and shadowed keys in `onKeyDown`](#debt-620-dead-branches-and-shadowed-keys-in-onkeydown) |
| DEBT-701 | [Observation carries bool_acts next to labels](#debt-701-observation-carries-bool_acts-next-to-labels) |
| DEBT-702 | [copyObs copies a hand-maintained field list](#debt-702-copyobs-copies-a-hand-maintained-field-list) |
| DEBT-703 | [cacheTags tests the wrong variable](#debt-703-cachetags-tests-the-wrong-variable) |
| DEBT-704 | [Runtime fields (tag, span) are written into saved files](#debt-704-runtime-fields-tag-span-are-written-into-saved-files) |
| DEBT-705 | [No dirty flag; beforeunload always prompts](#debt-705-no-dirty-flag-beforeunload-always-prompts) |
| DEBT-706 | [v2 save mutates TracksInfo and crashes when history is a string](#debt-706-v2-save-mutates-tracksinfo-and-crashes-when-history-is-a-string) |
| DEBT-707 | [C1, convertTracksToV1 mutates live Tracks](#debt-707-c1-converttrackstov1-mutates-live-tracks) |
| DEBT-708 | [saveEventsToFile with an unknown format downloads "null"](#debt-708-saveeventstofile-with-an-unknown-format-downloads-null) |
| DEBT-709 | [Silent failures when loading local files](#debt-709-silent-failures-when-loading-local-files) |
| DEBT-710 | [Dead "array" branch, unreachable non-object branch, misleading v1 source string](#debt-710-dead-array-branch-unreachable-non-object-branch-misleading-v1-source-string) |
| DEBT-711 | [v1 validation and normalization are weak](#debt-711-v1-validation-and-normalization-are-weak) |
| DEBT-712 | [Implicit globals and double refresh in the IO code](#debt-712-implicit-globals-and-double-refresh-in-the-io-code) |
| DEBT-713 | [setTags v1 validation inspects the previous Tags global](#debt-713-settags-v1-validation-inspects-the-previous-tags-global) |
| DEBT-714 | [saveTagsToFile v2 writes an undeclared global obj](#debt-714-savetagstofile-v2-writes-an-undeclared-global-obj) |
| DEBT-715 | [setTags DM detection and discarded file info](#debt-715-settags-dm-detection-and-discarded-file-info) |
| DEBT-716 | [Recent-file dialog assumptions](#debt-716-recent-file-dialog-assumptions) |
| DEBT-717 | [Advanced-file dialog bugs](#debt-717-advanced-file-dialog-bugs) |
| DEBT-718 | [Invisible error messages in FromServerDialog.loadEvents](#debt-718-invisible-error-messages-in-fromserverdialogloadevents) |
| DEBT-719 | [Server tag loading: unrouted URL, undefined return, empties Tags on failure](#debt-719-server-tag-loading-unrouted-url-undefined-return-empties-tags-on-failure) |
| DEBT-720 | [eventsToServer: ignored argument, undefined fields, CSS-only gating](#debt-720-eventstoserver-ignored-argument-undefined-fields-css-only-gating) |
| DEBT-721 | [Stale lineage basedOn](#debt-721-stale-lineage-basedon) |
| DEBT-722 | [loadEventsFromServerByID uses undefined variables and does not await](#debt-722-loadeventsfromserverbyid-uses-undefined-variables-and-does-not-await) |
| DEBT-723 | [Deprecated server list loaders](#debt-723-deprecated-server-list-loaders) |
| DEBT-724 | [Auth code lives in AnnotationIO.js](#debt-724-auth-code-lives-in-annotationiojs) |
| DEBT-725 | [CSV loaders: no error handling, hard-coded paths, unsequenced video and CSV](#debt-725-csv-loaders-no-error-handling-hard-coded-paths-unsequenced-video-and-csv) |
| DEBT-726 | [Near-identical CSV converters; tags CSV loader unreachable](#debt-726-near-identical-csv-converters-tags-csv-loader-unreachable) |
| DEBT-727 | [Exports ignore labels and notes and crash on missing bool_acts](#debt-727-exports-ignore-labels-and-notes-and-crash-on-missing-bool_acts) |
| DEBT-728 | [tracksToBBoxes unused and log message stale](#debt-728-trackstobboxes-unused-and-log-message-stale) |
| DEBT-729 | [Experimental DB path is unreachable and half-built](#debt-729-experimental-db-path-is-unreachable-and-half-built) |
| DEBT-730 | [SQLiteDB.js upload replaces only the module-local db](#debt-730-sqlitedbjs-upload-replaces-only-the-module-local-db) |
| DEBT-731 | [Dead loaders and debug helpers](#debt-731-dead-loaders-and-debug-helpers) |
| DEBT-732 | [FilePickerFromServerDialog error handler never reports](#debt-732-filepickerfromserverdialog-error-handler-never-reports) |
| DEBT-733 | [setTags replaces Tags before unguarded steps](#debt-733-settags-replaces-tags-before-unguarded-steps) |
| DEBT-734 | [v2 file without data replaces the model with an empty one silently](#debt-734-v2-file-without-data-replaces-the-model-with-an-empty-one-silently) |
| DEBT-735 | [labelListFromServer reports success when nothing was loaded, no error path in the dialog](#debt-735-labellistfromserver-reports-success-when-nothing-was-loaded-no-error-path-in-the-dialog) |
| DEBT-736 | [setTags builds ttags from stale chronogram data](#debt-736-settags-builds-ttags-from-stale-chronogram-data) |
| DEBT-737 | [tagsAddFrames silently skips non-object tag entries](#debt-737-tagsaddframes-silently-skips-non-object-tag-entries) |
| DEBT-801 | [Stale intervals when "Show Events" is off](#debt-801-stale-intervals-when-show-events-is-off) |
| DEBT-802 | [Read path mutates Tracks (obs.tag never cleared)](#debt-802-read-path-mutates-tracks-obstag-never-cleared) |
| DEBT-803 | [Implicit globals and shared mutable products](#debt-803-implicit-globals-and-shared-mutable-products) |
| DEBT-804 | [obs.cx/cy written by the read path, bool_acts used for activity](#debt-804-obscxcy-written-by-the-read-path-bool_acts-used-for-activity) |
| DEBT-805 | [Same-frame rows split intervals (overlap)](#debt-805-same-frame-rows-split-intervals-overlap) |
| DEBT-806 | [Aggregated labels only on the last interval of each ID](#debt-806-aggregated-labels-only-on-the-last-interval-of-each-id) |
| DEBT-807 | [tagMode dead branches and stale flatTags in getTTags](#debt-807-tagmode-dead-branches-and-stale-flattags-in-getttags) |
| DEBT-808 | [Frame/ID filtering duplicated across stages](#debt-808-frameid-filtering-duplicated-across-stages) |
| DEBT-809 | [Hamming/DM average diluted by sentinel frames](#debt-809-hammingdm-average-diluted-by-sentinel-frames) |
| DEBT-810 | [labeling.leaving never produced](#debt-810-labelingleaving-never-produced) |
| DEBT-811 | [Quadratic tag labelling, magic margin 20](#debt-811-quadratic-tag-labelling-magic-margin-20) |
| DEBT-812 | [Virtual interval keeps the old row](#debt-812-virtual-interval-keeps-the-old-row) |
| DEBT-813 | [hideFlowers only partial](#debt-813-hideflowers-only-partial) |
| DEBT-814 | [Inconsistent ID list parsing, uninitialised excludeIDArray](#debt-814-inconsistent-id-list-parsing-uninitialised-excludeidarray) |
| DEBT-815 | [Frame filter default max -1 excludes everything](#debt-815-frame-filter-default-max--1-excludes-everything) |
| DEBT-816 | [Dead ID remap text input](#debt-816-dead-id-remap-text-input) |
| DEBT-817 | [Dead RGB contrast button, RGB coefficient](#debt-817-dead-rgb-contrast-button-rgb-coefficient) |
| DEBT-818 | [ROI filter state split between page and globals](#debt-818-roi-filter-state-split-between-page-and-globals) |
| DEBT-819 | [User JavaScript filters via Function(), dead tagsIDFilter](#debt-819-user-javascript-filters-via-function-dead-tagsidfilter) |
| DEBT-820 | [Domain order discards sortIds; sortIds mutates input; Set passed](#debt-820-domain-order-discards-sortids-sortids-mutates-input-set-passed) |
| DEBT-821 | [cleanObsoleteEvents hard-coded rules, destructive, no undo](#debt-821-cleanobsoleteevents-hard-coded-rules-destructive-no-undo) |
| DEBT-822 | [interpolateTags is console-only, mutates Tags](#debt-822-interpolatetags-is-console-only-mutates-tags) |
| DEBT-823 | [computeMotionDirection discards its result; cacheTags wrong key](#debt-823-computemotiondirection-discards-its-result-cachetags-wrong-key) |
| DEBT-824 | [Unvalidated filter inputs](#debt-824-unvalidated-filter-inputs) |

## DEBT-101: Annotation lineage `created_from_id` is never stored

`AnnotationsAPI.post` reads the key `created_from` from the schema-loaded dict, but `VideoDataSchema` only produces `created_from_id`, so `add_video_data(created_from=None)` always stores `NULL`. The client sends `created_from_id` (`fromServerDialog.basedOn`) and shows it back in the save alert. The documented single-writer snapshot lineage ([DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")) does not exist in the database. [read]
Intended replacement: read `created_from_id` (validate that the parent record exists).

- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
  - [labelbee/database/annotation/schema.py](../../../labelbee/database/annotation/schema.py): `VideoDataSchema`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`
- **Links:** [BEH-144](view_cap-100-manage-data-users.md#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)"), [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-101](../../QUESTIONS.md#oq-101 "Is `created_from_id` supposed to be stored, and does the first save work?")

## DEBT-102: Saving a snapshot not based on a loaded record probably fails

The client sends `created_from_id=` (empty text: jQuery serializes `undefined` as empty) when nothing was loaded; `fields.Integer` rejects `""`, `schema.loads` raises `ValidationError`, nothing handles it (HTTP 500). `fromServerDialog.basedOn` is only assigned after a load. [read] for the code path, outcome [inferred] (needs a run).

- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`
- **Links:** [BEH-144](view_cap-100-manage-data-users.md#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)"), [OQ-101](../../QUESTIONS.md#oq-101 "Is `created_from_id` supposed to be stored, and does the first save work?")

## DEBT-103: `created_by_id` trusted from the client

`POST /annotations` takes `created_by_id` from the form instead of `current_user`: any logged-in user can create records attributed to another user; (what `add_video_data` stores for an unknown id was not re-read [inferred]). The resource reads `created_by_id` and looks the user up with `get_user_by_id` (`annotations.py`) [read].
Intended replacement: ignore the field and use `current_user.id`.

- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
- **Links:** [BEH-144](view_cap-100-manage-data-users.md#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)")

## DEBT-104: `allusers` flag is a string, "own records" filter breaks

`AnnotationsAPI.get` treats any non-empty `allusers` text as a user id (`created_by_id == "false"` / `"true"`). The advanced load dialog always sends `allusers=true|false`, so it likely lists nothing in both modes. No role check exists for seeing other users' records. [read] code; outcome [inferred].
Intended: parse a boolean; decide who may list all users ([OQ-103](../../QUESTIONS.md#oq-103 "Intended meaning of 'Show files from all users'")).

- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `showAdvancedLoadingDialog`
- **Links:** [BEH-143](view_cap-100-manage-data-users.md#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)"), [OQ-103](../../QUESTIONS.md#oq-103 "Intended meaning of 'Show files from all users'")

## DEBT-105: Authorization gaps in the API

Pages for dataset/video editing are admin only, but the API is looser: any authenticated user can PUT/DELETE datasets, PUT videos, POST videos, DELETE any annotation record, read any annotation record, and list datasets with creators' emails. Only PUT annotation and DELETE video check the admin role. [read]

- **Code:**
  - [labelbee/blueprints/api/resources/dataset.py](../../../labelbee/blueprints/api/resources/dataset.py): `DatasetAPI`, `DatasetListAPI`
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoAPI`, `VideoListAPI`
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationAPI`
- **Links:** [BEH-105](view_cap-100-manage-data-users.md#beh-105-page-access-control-login-and-role-checks "Page access control (login and role checks)"), [BEH-136](view_cap-100-manage-data-users.md#beh-136-api-edit-video "API edit video"), [BEH-138](view_cap-100-manage-data-users.md#beh-138-api-list-datasets "API list datasets"), [BEH-141](view_cap-100-manage-data-users.md#beh-141-api-update-dataset "API update dataset"), [BEH-142](view_cap-100-manage-data-users.md#beh-142-api-delete-dataset "API delete dataset"), [BEH-147](view_cap-100-manage-data-users.md#beh-147-api-delete-annotation-record "API delete annotation record"), [OQ-102](../../QUESTIONS.md#oq-102 "Who may create, edit and delete datasets, videos and annotation records?")

## DEBT-106: Inconsistent envelopes and failures returned with HTTP 200

Error bodies with `status_code` 400/500 are sent with HTTP 200 (videos GET, video GET, annotation GET); `rawdata` swallows every exception into `{"status":"error",...}` with HTTP 200; envelopes differ (`success/status_code/data`, bare list, `status: SUCCESS|FAIL`); `Login.get` performs a logout. Auth is a manual `if not current_user.is_authenticated` in every method. [read]
Intended: one envelope and real HTTP statuses plus a decorator.

- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoListAPI`, `VideoAPI`
  - [labelbee/blueprints/api/resources/rawdata.py](../../../labelbee/blueprints/api/resources/rawdata.py): `RawDataAPI`
  - [labelbee/blueprints/api/resources/auth.py](../../../labelbee/blueprints/api/resources/auth.py): `Login`
- **Links:** [BEH-129](view_cap-100-manage-data-users.md#beh-129-api-conventions-envelopes-status-codes-errors "API conventions: envelopes, status codes, errors"), [BEH-131](view_cap-100-manage-data-users.md#beh-131-api-logout "API logout"), [BEH-148](view_cap-100-manage-data-users.md#beh-148-api-raw-data-browser-apiv1rawdata "API raw data browser (`/api/v1/rawdata`)")

## DEBT-107: Security hygiene: CSRF exemption, secrets in log, committed credential

The whole API blueprint is CSRF exempt while using cookie sessions (`csrf.exempt(api.bp)`), including login/logout and deletions. `create_app` logs the whole `app.config` (SECRET_KEY, DB URI with password) to `flask_errors.log`. `labelbee/settings/local_settings_example.py` contains a hard-coded mail account and password (value not copied here). [read]

- **Code:**
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`
  - [labelbee/settings/local_settings_example.py](../../../labelbee/settings/local_settings_example.py): `MAIL_PASSWORD`
- **Links:** [BEH-101](view_cap-100-manage-data-users.md#beh-101-application-factory-and-logging "Application factory and logging"), [BEH-104](view_cap-100-manage-data-users.md#beh-104-csrf-protection-policy "CSRF protection policy")

## DEBT-108: `/admin/version` public, shell-based and escaped

No role check on the route (the handler has only `@bp.route`); runs `git` subprocesses (`FileNotFoundError` when `git` is missing, `CalledProcessError` when the folder is not a repository: both HTTP 500); the HTML built by string concatenation is auto-escaped by Jinja so the markup shows as text. [read]

- **Code:**
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `version_page`
  - [labelbee/blueprints/admin/templates/version_page.html](../../../labelbee/blueprints/admin/templates/version_page.html): `webapp_version`
- **Links:** [BEH-127](view_cap-100-manage-data-users.md#beh-127-version-information-page "Version information page")

## DEBT-109: Manage users: role wipe and no rollback

`populateFormFields` does not preselect the user's roles, and `edit_user` replaces roles wholesale, so saving a user without re-selecting roles removes all roles (an admin editing themselves loses admin). A failed `commit` is swallowed without `rollback`, so the following `user_list()` query in the same request probably raises `PendingRollbackError` (HTTP 500) instead of the "Could not edit user" alert [inferred]. A failed validation shows no alert (the `editing` flag is set only after a valid POST); whether field errors are shown depends on the Flask-User `render_field` macro [inferred, library]. `edit_user` with an unknown id raises `AttributeError` (HTTP 500). The table body loops over an undefined `videos` [inferred, template part not re-read]. There is no way in the UI to create users or roles; if self-registration is dropped ([OQ-104](../../QUESTIONS.md#oq-104 "Is open self-registration intended, and which role should new users get?")), a create-user form in Manage Users would be the replacement. [read] except where marked

- **Code:**
  - [labelbee/blueprints/admin/templates/manage_users_page.html](../../../labelbee/blueprints/admin/templates/manage_users_page.html): `populateFormFields`
  - [labelbee/database/user/api.py](../../../labelbee/database/user/api.py): `edit_user`
- **Links:** [BEH-124](view_cap-100-manage-data-users.md#beh-124-manage-users-page-user-table "Manage users page: user table"), [BEH-125](view_cap-100-manage-data-users.md#beh-125-manage-users-page-edit-form "Manage users page: edit form"), [BEH-126](view_cap-100-manage-data-users.md#beh-126-edit_user-semantics "`edit_user` semantics"), [OQ-104](../../QUESTIONS.md#oq-104 "Is open self-registration intended, and which role should new users get?")

## DEBT-110: Broken and orphan templates

`video_data_details_page.html` uses unqualified endpoint names (`video_data_page`, `edit_video_data_page`, `get_video_data_raw_v2`, `labelbee_user_page`), while all gallery endpoints are blueprint-qualified (`gallery.video_data_page`, `labelbee.labelbee_user_page`): the page raises `BuildError` at the first `url_for` in the table row for any record, although it is linked from the video data table. `add_video.html` has no route in `gallery.py` and uses the unqualified `url_for('video_data_page')`; `edit_video_data.html` has no route and uses the unqualified `url_for('edit_video_data_page')`; `video_registry.html` is an empty block with an invalid `{% end block}` tag [read].

- **Code:**
  - [labelbee/blueprints/gallery/templates/video_data_details_page.html](../../../labelbee/blueprints/gallery/templates/video_data_details_page.html): `#video_info`
  - [labelbee/blueprints/gallery/templates/add_video.html](../../../labelbee/blueprints/gallery/templates/add_video.html): `#videos_table`
  - [labelbee/blueprints/gallery/templates/edit_video_data.html](../../../labelbee/blueprints/gallery/templates/edit_video_data.html): `video_data form`
  - [labelbee/blueprints/admin/templates/video_registry.html](../../../labelbee/blueprints/admin/templates/video_registry.html): `empty template`
- **Links:** [BEH-116](view_cap-100-manage-data-users.md#beh-116-annotation-record-details-page "Annotation record details page"), [BEH-146](view_cap-100-manage-data-users.md#beh-146-api-update-annotation-record-metadata "API update annotation record metadata")

## DEBT-111: Dataset deletion cannot be done from the UI

`/delete_dataset` GET renders a template named after a URL (500) and no page links to it; the "Delete Dataset" button of the edit page POSTs to the create-dataset API (`/api/v1/datasets?id=`), which fails for the missing name (or would create a dataset). The "Add Video to Dataset" button opens the JSON video list. [read]

- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `delete_dataset`
  - [labelbee/blueprints/gallery/templates/edit_dataset.html](../../../labelbee/blueprints/gallery/templates/edit_dataset.html): `delete form`
- **Links:** [BEH-111](view_cap-100-manage-data-users.md#beh-111-delete-dataset-route "Delete dataset route"), [BEH-118](view_cap-100-manage-data-users.md#beh-118-edit-dataset-page-admin "Edit dataset page (admin)")

## DEBT-112: Edit video page defects

Prefilled timestamp format (`YYYY-MM-DD HH:MM:SS`) does not match the parsed format (`%Y-%m-%dT%H:%M:%S`), so an unchanged submit raises `ValueError`; `video` undefined without the `video` parameter; heading uses `video.name`; blank fields cannot clear values; the `UserProfileForm` boilerplate copied in every gallery handler is [DEBT-123](#debt-123-gallery-post-handlers-copy-the-profile-form-onto-the-current-user "Gallery POST handlers copy the profile form onto the current user"). [read] for the handler, [inferred] for `edit_video` and the heading.

- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `edit_video_page`
  - [labelbee/database/video/api.py](../../../labelbee/database/video/api.py): `edit_video`
- **Links:** [BEH-117](view_cap-100-manage-data-users.md#beh-117-edit-video-page-admin "Edit video page (admin)")

## DEBT-113: Video upload and delete are unsafe

`POST /videos` writes `$ROOT_PATH/<video_name>.mp4` with no name sanitation (path traversal), overwrites existing files, and on DB failure (including the duplicate `file_name`+`path` constraint) deletes the file, which may belong to the existing record. `location` is ignored (constant 10), `path` constant `/videos`, `timestamp` stored from an unparsed string, `frames` is a float. `DELETE` removes `$ROOT_PATH/<file_name>` (differs from the upload layout, ignores `path`) and its rollback path rebuilds a `Video` from the serialized dict. No UI uses either. [read]

- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoListAPI`, `VideoAPI`
- **Links:** [BEH-134](view_cap-100-manage-data-users.md#beh-134-api-upload-video "API upload video"), [BEH-137](view_cap-100-manage-data-users.md#beh-137-api-delete-video "API delete video"), [OQ-106](../../QUESTIONS.md#oq-106 "How are videos registered in practice, and are upload/delete endpoints used?")

## DEBT-114: Annotator route ignores its parameters and has dead code

`labelbee_user_page` ignores `video_url` / `tag_file` (constants for `gurabo10avi`), calls an undefined `upload_dir` inside a bare `except`, has an anonymous branch that is unreachable because the route is `login_required` and passes template variables the template never renders (`userid`, `video_url`, `tag_file`). The home page promises "limited functionality" without login. [read]

- **Code:**
  - [labelbee/blueprints/labelbee/labelbee.py](../../../labelbee/blueprints/labelbee/labelbee.py): `labelbee_user_page`
- **Links:** [BEH-107](view_cap-100-manage-data-users.md#beh-107-home-page "Home page"), [BEH-119](view_cap-100-manage-data-users.md#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links")

## DEBT-115: Dead, duplicated or inconsistent backend code

`CustomUserManager` / `MyRegisterForm` unused (so the register template references missing fields); `USER_ENABLE_REGISTRATION` is not a Flask-User key; `database/*/model.py` duplicates models (`annotation/model.py` redefines `VideoData`); helpers `create_user` (`role_id=2` default), `change_user_role` (sets `user.role`, which the `User` model does not define: it has `roles`), `delete_user`, `search_video` have no caller in active code; the only references are in `labelbee/legacy/views.py`, which imports `create_user, edit_user` from `labelbee.user_management`, which does not exist (no `user_management.py` nor package), so that import can never succeed; `DataSetSchema.timestamp` has no column; `UsersRoles` as a model; ~10 `hasframe*` adhoc columns; `app.py`/`models.py` circular import; `tests/` target an old layout [inferred, not re-read]. [read] for the rest except `delete_user`/`search_video` internals.

- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `CustomUserManager`, `MyRegisterForm`, `UsersRoles`
  - [labelbee/database/user/api.py](../../../labelbee/database/user/api.py): `create_user`, `change_user_role`
  - [labelbee/database/dataset/schema.py](../../../labelbee/database/dataset/schema.py): `DataSetSchema`
  - [labelbee/database/annotation/model.py](../../../labelbee/database/annotation/model.py): `VideoData`
- **Links:** [BEH-121](view_cap-100-manage-data-users.md#beh-121-self-registration-page "Self-registration page"), [BEH-138](view_cap-100-manage-data-users.md#beh-138-api-list-datasets "API list datasets"), [BEH-151](view_cap-100-manage-data-users.md#beh-151-persistent-records-and-constraints "Persistent records and constraints")

## DEBT-116: Download and range handling defects

`/data/<path>` has no authentication and serves `os.path.join(bp.root_path, "../static/data")`, i.e. `labelbee/blueprints/static/data` (the `labelbee/blueprints/static/` directory does not exist in this checkout), not the `labelbee/static/data` that the home and gallery links assume ([OQ-105](../../QUESTIONS.md#oq-105 "Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?")); suffix range `bytes=-N` fails with HTTP 500 (regex result not checked), a multi-range header is answered with its first range only; `mimetypes.guess_type(path)[0]` concatenated as a string raises when the type is unknown (HTTP 500 for a Range request); `dir_listing` calls `abort`, which `flask_range_requests.py` does not import (NameError on a missing directory) [read]; unsafe paths give 500; response is always 206 for any Range, with no `Accept-Ranges`; `pages/files.html` is a bare `<ul>` fragment; verbose `print` debugging. [read]

- **Code:**
  - [labelbee/blueprints/download/flask_range_requests.py](../../../labelbee/blueprints/download/flask_range_requests.py): `send_from_directory_partial`, `dir_listing`
  - [labelbee/blueprints/download/download.py](../../../labelbee/blueprints/download/download.py): `send_data`
- **Links:** [BEH-148](view_cap-100-manage-data-users.md#beh-148-api-raw-data-browser-apiv1rawdata "API raw data browser (`/api/v1/rawdata`)"), [BEH-149](view_cap-100-manage-data-users.md#beh-149-static-data-download-with-byte-ranges-data "Static data download with byte ranges (`/data`)"), [OQ-105](../../QUESTIONS.md#oq-105 "Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?")

## DEBT-117: Gallery page cosmetics and external dependencies

Datasets and dataset header show empty "Date and Time" and the creator as a bare user id; headings print an undefined `uri`; videos table sorted by Colony (index 2) while the intent looks like date; the `database_menu` highlight keys do not match the datasets page; `DataTables` JS/CSS loaded from `cdn.datatables.net` (external dependency, page breaks offline); `video_data_page.html` loads jQuery itself (`jquery.js` under `extern`, probably a second copy next to the layout's [inferred]) and has a `<link src=...>` typo for the jquery-ui css [read]; the CSRF/ajaxSetup block is copy-pasted into each page; the annotation table "JSON" link lists the whole video rather than the record; File Name column is empty because save never sets `file_name`/`path`. [read]

- **Code:**
  - [labelbee/blueprints/gallery/templates/datasets_page.html](../../../labelbee/blueprints/gallery/templates/datasets_page.html): `#datasets_table`
  - [labelbee/blueprints/gallery/templates/videos_page.html](../../../labelbee/blueprints/gallery/templates/videos_page.html): `#videos_table`
  - [labelbee/blueprints/gallery/templates/video_data_page.html](../../../labelbee/blueprints/gallery/templates/video_data_page.html): `#video_data_table`
- **Links:** [BEH-106](view_cap-100-manage-data-users.md#beh-106-shared-page-layout-and-navigation "Shared page layout and navigation"), [BEH-109](view_cap-100-manage-data-users.md#beh-109-datasets-list-page "Datasets list page"), [BEH-113](view_cap-100-manage-data-users.md#beh-113-videos-table-columns-and-interactions "Videos table columns and interactions"), [BEH-115](view_cap-100-manage-data-users.md#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page")

## DEBT-118: Tag-file load uses a nonexistent route

`tagsFromServer` requests `rest/v2/annotation/<id>`, a route of a former API version not served by this backend (only `/api/v1/annotation/<id>` exists), so loading a `tag` record from the server fails (`setTags([])`). [read] route absent; outcome [inferred]. Cross-group with [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import").

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tagsFromServer`
  - [labelbee/blueprints/api/__init__.py](../../../labelbee/blueprints/api/__init__.py): `api`
- **Links:** [BEH-145](view_cap-100-manage-data-users.md#beh-145-api-load-one-annotation-record-server-load-step-2 "API load one annotation record (server load, step 2)"), [OQ-107](../../QUESTIONS.md#oq-107 "Size limits and tag-record storage of annotation records")

## DEBT-121: API login reports SUCCESS for inactive users

`Login.post` ignores the boolean result of `login_user(user)` (Flask-Login refuses inactive users) and always answers SUCCESS after a correct password. [inferred from library behavior]

- **Code:**
  - [labelbee/blueprints/api/resources/auth.py](../../../labelbee/blueprints/api/resources/auth.py): `Login`
- **Links:** [BEH-130](view_cap-100-manage-data-users.md#beh-130-api-login "API login")

## DEBT-122: Two `Marshmallow` objects, the one used by the schemas is never initialised

`labelbee/app.py` defines a module-level `ma = Marshmallow()`; `create_app` creates a local `ma = Marshmallow(app)` and calls `ma.init_app(app)` on it, so the local shadows the global. The schemas import the module-level object (`from labelbee.app import ma` in `database/video/schema.py`, `database/annotation/schema.py`, `database/user/schemas.py`), which is never bound to the app. Consequences were not run [inferred]. [read]
Intended replacement: initialise the module-level extension object in `create_app`.

- **Code:**
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`, `ma`
  - [labelbee/database/video/schema.py](../../../labelbee/database/video/schema.py): `VideoSchema`
- **Links:** [BEH-153](view_cap-100-manage-data-users.md#beh-153-extensions-csrf-mode-and-blueprint-registration "Extensions, CSRF mode and blueprint registration"), [SEAM-103](view_seams.md#seam-103-resources-and-pages-to-persistence-layer "Resources and pages to persistence layer")

## DEBT-123: Gallery POST handlers copy the profile form onto the current user

`/add_dataset`, `/delete_dataset`, `/videos`, `/videodata`, `/video_data_details`, `/edit_video` and `/edit_dataset` each build a `UserProfileForm`, and on a valid POST run `populate_obj(current_user)` and `db.session.commit()` before their own action (only `/datasets` has the copy commented out). The side effect is meaningless there; a user without first and last name cannot create a dataset or edit a video; an invalid form re-renders without a message; the redirects drop the query parameters. Whether it is deliberate is [OQ-108](../../QUESTIONS.md#oq-108 "Do gallery form POSTs have to copy the profile names onto the current user?"). [read]
Intended replacement: drop the form from these handlers.

- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `add_dataset_page`, `videos_page`, `edit_video_page`, `video_data_page`, `video_data_details_page`, `edit_dataset_page`
- **Links:** [BEH-154](view_cap-100-manage-data-users.md#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [DEBT-112](#debt-112-edit-video-page-defects "Edit video page defects"), [OQ-108](../../QUESTIONS.md#oq-108 "Do gallery form POSTs have to copy the profile names onto the current user?")

## DEBT-124: Posted `timestamp` of an annotation record is loaded as a datetime

`VideoDataSchema.timestamp` is `fields.DateTime()`, so `schema.loads` yields a `datetime`, which `AnnotationsAPI.post` passes unchanged to `add_video_data(timestamp: str = None)`. `add_video_data` then calls `datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S")` on it, which raises `TypeError` with no handler (HTTP 500) for a posted timestamp; only an omitted or empty timestamp works (then UTC now). The annotator never sends it. [read] Intended: decide the contract ([OQ-110](../../QUESTIONS.md#oq-110 "What should a client-supplied `timestamp` do when saving an annotation record?")).

- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
  - [labelbee/database/annotation/schema.py](../../../labelbee/database/annotation/schema.py): `VideoDataSchema`
  - [labelbee/database/annotation/api.py](../../../labelbee/database/annotation/api.py): `add_video_data`
- **Links:** [BEH-144](view_cap-100-manage-data-users.md#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)"), [OQ-110](../../QUESTIONS.md#oq-110 "What should a client-supplied `timestamp` do when saving an annotation record?")

Numbers 212, 218 and 222 of this block are unused (never assigned, not reused). Tags: [read] = code text seen in the evidence of round 2; [inferred] = from code order or DOM semantics, not run; [round 1] = kept from the first reading, not re-checked in round 2.

## DEBT-201: Ctrl+Right and Ctrl+Shift+Right fall through to a second move

`onKeyDown` ArrowRight branch is `if (ctrl&&shift) forward4(); else if (ctrl) forward3();` followed by an independent `if (shift) forward2(); else forward();`: the second `if` is not chained with an `else` to the first [read]. Ctrl+Right = +10 s then +1 frame; Ctrl+Shift+Right = +60 s then +1 s. The Left branch is a proper if/else chain [read]. Intended: Ctrl = 10 s, Ctrl+Shift = 60 s only (to be confirmed, [OQ-207](../../QUESTIONS.md#oq-207 "Intended keyboard step distances")). Replacement: one table-driven step function shared by both directions.
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
- **Links:** [BEH-251](view_cap-200-load-play-video.md#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)"), [OQ-207](../../QUESTIONS.md#oq-207 "Intended keyboard step distances")

## DEBT-202: delayedSeekFrame is cleared before it is used

`onVideoLoaded2` does `this.delayedSeekFrame = undefined` and then, in the 500 ms `setTimeout`, calls `videoControl.seekFrame(this.delayedSeekFrame)` which reads `undefined` [read]. `seekFrame(undefined)` passes the bounds test and in `video` mode calls `seekTo({frame: NaN})` (no effective seek) [read]. Also `flagLoadingVideo` is set only in `loadVideo2` (after the video-record ajax returns), so a `frame=` hash processed by the router earlier takes the immediate branch [read]; on a cold page `videoinfo.nframes` is still the placeholder 1, so `seekFrame` rejects every frame `>= 1` [read: placeholder and bounds test]; with a video already loaded the seek applies to the previous video. Net: `#video_id=..&frame=..` links probably do not land on the requested frame (not run). Replacement: keep the value in a local, make the seek part of the load promise.
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoLoaded2`, `VideoControl.delayedSeek`, `VideoControl.seekFrame`
- **Links:** [BEH-208](view_cap-200-load-play-video.md#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-209](view_cap-200-load-play-video.md#beh-209-delayed-seek-seek-requested-before-the-video-is-ready "Delayed seek (seek requested before the video is ready)"), [BEH-234](view_cap-200-load-play-video.md#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [OQ-202](../../QUESTIONS.md#oq-202 "Deep links `#video_id=..&frame=..`")

## DEBT-203: Router and hash-listener bugs

(1) `onhashchange` is assigned as `window.onhashchange` (event-handler property) by `onhashchange = async function...`; the preceding `addEventListener("hashchange", onhashchange)` at script start evaluates the property before that assignment, so it receives its default value `null` (not `undefined`) and registers nothing [read: statement order]. `onFrameChanged` later calls `removeEventListener(.., onhashchange)` (finds nothing) then `addEventListener(.., onhashchange)` with the function, so after the first hash cleanup the router is registered twice (property and listener) and likely runs twice per hashchange [inferred, DOM semantics]. (2) `if (newhash == lasthash)` only logs "ABORT" and continues (no `return`) [read]; the test could not match anyway: `location.hash` includes `#` while `lasthash = String(parsedHash)` (set in `onFrameChanged`) does not [read]. (3) `parsedHash.get("frame","0")` was meant to be `set` (default frame 0 is never applied) [read]. (4) `need_push`, the `history` calls and the listener remove/add pair in the router are commented out dead code [read]. (5) The remove/add pair in `onFrameChanged` runs synchronously before the asynchronous `hashchange` event fires, so the re-added listener does receive the event; the intended "avoid feedback loop" is not achieved [inferred]. The same-id skip (`id == currentVideoID`) is what stops the loop in practice [inferred].
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onhashchange`, `lasthash`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onFrameChanged`
- **Links:** [BEH-208](view_cap-200-load-play-video.md#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-217](view_cap-200-load-play-video.md#beh-217-frame-hash-removal-on-navigation "Frame hash removal on navigation")

## DEBT-204: Async video selection does not await what it starts

`selectVideoBy_video_id` calls `this.videoSelected(id)` / `this.loadVideoManual(uri)` without `await`/`return`, so the router's `await` resolves before the video is loaded and then runs `video_data` loading and the delayed seek early [read]. `clickLoadTracksTaggedCSVFromServer` also starts `loadVideoManual` without awaiting it before requesting the tracks ([BEH-232](view_cap-200-load-play-video.md#beh-232-load-a-video-and-its-tracks-from-the-gurabo4-dataset "Load a video and its tracks from the gurabo4 dataset")) [read]. `loadVideoManual` calls `this.setVideoInfo(info)` without `await`/`return`, so it resolves before the media loads [read]; it mixes a callback ajax with a Promise whose `reject` is commented out [read].
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.selectVideoBy_video_id`, `VideoManager.loadVideoManual`, `VideoManager.videoSelected`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `clickLoadTracksTaggedCSVFromServer`
- **Links:** [BEH-204](view_cap-200-load-play-video.md#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-207](view_cap-200-load-play-video.md#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), [BEH-208](view_cap-200-load-play-video.md#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-232](view_cap-200-load-play-video.md#beh-232-load-a-video-and-its-tracks-from-the-gurabo4-dataset "Load a video and its tracks from the gurabo4 dataset")

## DEBT-205: Load errors throw inside callbacks; promises never settle

`videoSelected` throws `Error` inside the `$.ajax` error callback and rethrows inside the `.catch` of `setVideoInfo`; its `reject` calls are commented out, so the promise it returns never settles after a failure and `await` hangs [read]. The rethrow in `.catch` is an unhandled rejection. User feedback is a red dialog message for the DB record failure only [read]; a media load failure shows the `onVideoError` message ([BEH-206](view_cap-200-load-play-video.md#beh-206-video-load-error "Video load error")). `videoSelected` sets `currentVideoID` before the request succeeds, so after a failure the manager and the links name an unloaded video ([BEH-233](view_cap-200-load-play-video.md#beh-233-state-after-a-failed-video-load "State after a failed video load")) [read]. `loadVideoManual` throws in its `.stream.json` error callback with the same effect (the dialog message there is commented out, nothing is shown to the user) [read]. [round 1, not re-read]: `loadVideo2` times out after 10 s with a `TimeoutError` (the `timeout` helper body was not read).
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.videoSelected`, `VideoManager.loadVideoManual`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.loadVideo2`
- **Links:** [BEH-204](view_cap-200-load-play-video.md#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-205](view_cap-200-load-play-video.md#beh-205-load-the-media-element "Load the media element"), [BEH-207](view_cap-200-load-play-video.md#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), [BEH-233](view_cap-200-load-play-video.md#beh-233-state-after-a-failed-video-load "State after a failed video load")

## DEBT-206: Shortcut `p` does nothing

`$("#P").prop("checked", !$().prop("checked"))`: `$()` is an empty set (prop returns undefined, so the toggle value is always `true`) and the key is consumed (`return false`) [read]. No element with a double-quoted `id="P"` was found in `labelbee_page.html` (single-quoted ids not searched) [read]. [round 1]: Quick Help still advertises "P: mark/unmark pollen". [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place") says `p` is kept for now. Intended replacement: a label shortcut for `pollen` through the label list `accesskey` mechanism.
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#quickhelp`
- **Links:** [BEH-254](view_cap-200-load-play-video.md#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules"), [DEBT-217](#debt-217-quick-help-contradicts-the-code "Quick Help contradicts the code"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-209](../../QUESTIONS.md#oq-209 "Intended `p` (pollen) shortcut")

## DEBT-207: Dead and misplaced key handling around the ID field

In `onKeyDown` the `e.target == #I` Escape branch comes after a first test that already returns for any `type === "text"` target, and `#I` is `<input type="text">` [read], so that branch is unreachable; the Escape/Enter branches that toggle focus back from `#I` are dead for the same reason. ID commit is bound by an inline attribute in the HTML instead (`onkeypress="onKeyDown_IDEdit(event)"` on `#I` [read]; `onKeyDown_NewIDEdit` tests `keyCode == 13` (`which || keyCode`) while `onKeyDown_IDEdit` tests `event.key == 'Enter'` [read]). Replacement: one key map, one listener.
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`, `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#I`, `#newid`
- **Links:** [BEH-250](view_cap-200-load-play-video.md#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [BEH-253](view_cap-200-load-play-video.md#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field"), [BEH-255](view_cap-200-load-play-video.md#beh-255-bee-id-entry-with-enter-i-and-newid "Bee ID entry with Enter (`#I` and `#newid`)"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place")

## DEBT-208: Obsolete video/preview code still shipped

[round 1, not re-checked in round 2] Unreachable or never-called: `currentMode == "preview"` (never assigned; branches in `seekFrame`, `getCurrentVideoFrame`, `onPreviewFrameChanged`, `updateVideoControlForm`, `OverlayControl.js` redraw); `VideoControl.onVideoLoaded` (marked OBSOLETE, not bound), hence `loadVideoInfo(<url>.info.json)` and `loadPreviewVideo()` are never run after a load; `VideoControl.loadVideo` (deprecated, only the hidden list uses it); `VideoCache.onVideoLoaded`, `VideoCache.loadVideo`, `VideoCache.seekToFrame`; `VideoControl.getCurrentVideoFrame` preview branch; `VideoList.js` list/CSV/JSON machinery, `addDefaultVideo`, `videoListFromServer`, `defaultVideoList`. `#previewVideoStatus` always shows `?` after a load. The `preview` branches of `seekFrame`, `getCurrentVideoFrame` and `updateVideoControlForm`, and the commented-out `loadPreviewVideo` call in `onVideoLoaded2`, are visible in the code read in round 2 [read]. Replacement: delete once [OQ-203](../../QUESTIONS.md#oq-203 "Legacy 'Video List' subpanel")/[OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features") are answered.
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoLoaded`, `VideoControl.loadVideo`, `VideoControl.loadPreviewVideo`, `VideoControl.loadVideoInfo`, `VideoControl.onPreviewFrameChanged`, `VideoCache.seekToFrame`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.setVideoList`, `VideoManager.videoListFromServer`
- **Links:** [BEH-214](view_cap-200-load-play-video.md#beh-214-legacy-video-list-hidden-subpanel "Legacy video list (hidden subpanel)"), [BEH-227](view_cap-200-load-play-video.md#beh-227-preview-video-scale4mp4-legacy-mode "Preview video (scale4.mp4) legacy mode"), [OQ-203](../../QUESTIONS.md#oq-203 "Legacy 'Video List' subpanel"), [OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features")

## DEBT-209: Cache seeks have no staleness check

`seekFrame` in `cache` mode stores `cacheRequestedFrame` but nobody compares it; the `.then` of `getFrameImageAsync` always applies its own image and frame (`onFrameChangedCache` does not compare either), so out-of-order completions show an older frame [read]. A rejection is logged by `.catch` and then `.then` runs with `img === undefined`, which shows "not in cache" for that frame [read for the control flow]. The frame-sync design (README 9.1) wants a token, latest wins.
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.seekFrame`, `VideoControl.onFrameChangedCache`
- **Links:** [BEH-235](view_cap-200-load-play-video.md#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## DEBT-210: VideoCache queue defects

(a) `sleep(20)` in `processQueue` is not awaited (the `await` is commented out), so there is no pause between frames [read]. (b) `cancelQueue` loops with an undeclared variable (`for (query of ...)`, implicit global) and never settles the removed deferreds (`query.deferred.reject()` is commented out), so awaiting seeks hang ([BEH-231](view_cap-200-load-play-video.md#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved")) [read]. (c) `processQueue` has `try/finally` without `catch`: a rejection from `getImageForce` (for example from `seekWithCallback` on an unusable duration) ends the loop, resets the guard, leaves the failing item at the head of the queue and leaves its deferred unsettled; the next `processQueue` call retries the same item [read for the control flow; the rejection path through `getImageForce` is inferred]. (d) `getFrameDataURLForce` re-encodes every decoded frame to JPEG (default quality, `toDataURL('image/jpeg')`) and `getImageForce` decodes it back into an `Image`, so cached frames are lossy and the cost is paid per frame [read]. (e) `preloadFrames` has console logging per frame (very verbose) [round 1]. (f) `seekWithCallback` registers a new `requestVideoFrameCallback` per call and, when the position is already the target (`|currentTime - target| < 0.00005`), resolves without cancelling it, so the callback fires later on an unrelated frame [read]. (g) `cancelQueue` sets `processingQueue = false` while the loop of `processQueue` may be awaiting `getImageForce`; a later `processQueue()` then starts a second loop sharing the hidden video and canvas, and the first loop's `this.queryQueue.shift()` after its await removes the head of the new queue instead of its own item [inferred from code order; not run]. (h) `seekWithCallback` can be called concurrently with a different frame while a previous seek awaits `seekResolve`, because the single `this.video` is shared [inferred].
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoCache.processQueue`, `VideoCache.cancelQueue`, `VideoCache.seekWithCallback`, `VideoCache.getFrameDataURLForce`, `VideoCache.preloadFrames`
- **Links:** [BEH-229](view_cap-200-load-play-video.md#beh-229-videocache-storage-queue-and-decoding "VideoCache: storage, queue and decoding"), [BEH-230](view_cap-200-load-play-video.md#beh-230-cache-controls-preload-cancel-reset-status-size "Cache controls (Preload, Cancel, Reset, status, size)"), [BEH-231](view_cap-200-load-play-video.md#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## DEBT-211: Play button state display

`updateNavigationView` assigns `$("#play").value = ...` on a jQuery object (no effect on the button text) and derives the `playing` class from `video2.playingState()` [read]. In cache modes `video2.playingState()` stays `paused` (the rAF loop uses `VideoControl.playingState`), so the buttons never show the playing state when the cache is used [inferred]. `VideoControl.playingState` (own copy, read by `playPauseVideo`) and `video2.playingState()` can disagree [read: both are read in different functions].
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.updateNavigationView`, `VideoControl.playPauseVideo`
- **Links:** [BEH-223](view_cap-200-load-play-video.md#beh-223-playback-in-video-mode-play-play-backwards-speed-x4 "Playback in video mode (Play, Play Backwards, speed, x4)")

## DEBT-213: Mode switch does not resynchronize the displayed frame

`overlay.optsClick('useImageCache')` assigns `videoControl.currentMode` from another module and calls `hardRefresh()` without seeking [read]: switching to cache shows "not in cache" (stale or missing `currentImage`) until the next seek; switching back shows the `#video` element at the position it had when cache mode began while `currentFrame` says otherwise [inferred from code order, not run]. `currentMode`, `currentImage`, `currentFrame` are public fields written/read by `OverlayControl.js` and `ZoomView.js` [round 1].
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.optsClick`
- **Links:** [BEH-222](view_cap-200-load-play-video.md#beh-222-use-cache-toggle-and-mode-switch "Use Cache toggle and mode switch"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)"), [SEAM-202](view_seams.md#seam-202-frame-image-source-what-the-overlay-draws "Frame image source (what the overlay draws)"), [SEAM-203](view_seams.md#seam-203-videocache-interface "VideoCache interface")

## DEBT-214: Global variables and implicit globals

Globals created by assignment without declaration [read unless noted]: `videoListTable`, `videoListCurrentID` (`VideoManager` constructor), `theManager` (`receiveVideoSelection`), `html` (`makeVideoListTable`), `query` (loop variable of `cancelQueue`), `buttonid_property` (loop variable in `init`), `lasthash`, `onhashchange`; [round 1]: `videoCache` (created in the `VideoControl` constructor and then read by `onVideoCacheParamsChanged` and `OverlayControl.js`), `videoManager`, `videoControl`, `overlay`, `chrono`, `statusWidget`, `fromServerDialog`, `loginDialog`, `videojsoninfo`, `out` (in `videoListToCSV`), `defaultSelectedBee`, `change_id_force`, `http_script_name`, `getCurrentFrame`. `VideoControl` methods refer to `videoControl` (the global) instead of `this` in `onVideoLoaded2` [read] and `preloadCache` [round 1]. Init order matters (`videoManager` is created before `videoControl` but its constructor calls `updateVideoInfoForm`, [DEBT-227](#debt-227-video_id-shows-video_idundefined-before-any-video "`.video_id` shows `#video_id=undefined` before any video")).
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl`, `VideoControl.preloadCache`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager`
- **Links:** [BEH-201](view_cap-200-load-play-video.md#beh-201-page-start-up-state "Page start-up state"), [DEBT-227](#debt-227-video_id-shows-video_idundefined-before-any-video "`.video_id` shows `#video_id=undefined` before any video"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)")

## DEBT-215: eval and hard-coded sample record in loadVideoManual

`loadVideoManual` starts from a hard-coded sample record (file `bf-cn_2025-01-30_01.cfr.mp4`, `starttime 2025-01-30T12:00:00`, `duration`, `nframes`, 3840x2160, fps `211/12`) [read]; `setVideoInfo` copies only `file_name`, `path`, `videofps`, `realfps`, `starttime`, `duration`, `nframes` [read], so `location`, `colony`, `notes`, `thumb` never reach `videoinfo`; `loadVideoManual` overwrites `nframes`, `width`, `height`, `videofps`, `realfps` and `duration` from `.stream.json`, but not `starttime`, so the sample `starttime` is the only value that leaks [read]. The default URL in the "From URI" prompt is the same sample path [read]. The `.stream.json` step evaluates `r_frame_rate` (a string like `"211/12"`) with `eval` [read]. When the URL does not match `^(.*?data)(\/.*\/)([^\/]+)$` (for example no second slash after `data`), the fallback builds `path = url.substring(0, lastIndexOf('/'))`, which keeps scheme and host [read]; `info.path = path` is then given to `setVideoInfo`, so `videoPath = url_for("/data") + path + "/" + file_name` is not a valid URL for an absolute URL [read].
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.loadVideoManual`, `VideoManager.clickLoadVideoManual`, `VideoManager.setVideoInfo`
- **Links:** [BEH-207](view_cap-200-load-play-video.md#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), [OQ-201](../../QUESTIONS.md#oq-201 "Which video-loading paths are routine")

## DEBT-216: Frame offset and fps edits recompute inconsistently

`changeFrameOffset` calls `onVideoInfoChanged`, which recomputes `nframes = floor(duration * videofps)` ignoring the offset and overwriting the server's `nframes` [read]; `#frameoffset` is never refilled when `videoinfo` is replaced (new video has `frameoffset 0`, field keeps old text) [read]. `changeVideoFPS` calls `onVideoInfoChanged` too [read]; `rewind2/forward2..4` pass `videofps`, `videofps*10`, `videofps*60` frames, non-integers for fractional `videofps` (211/12) [read]. [round 1, not re-read]: the +/- step buttons use fixed 20/200 frames regardless of `videofps`. Behavior of `VideoFrame.__seek` with fractional frames is not verified.
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.changeFrameOffset`, `VideoManager.changeVideoFPS`, `VideoManager.updateVideoInfoForm`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoInfoChanged`, `VideoControl.forward2`
- **Links:** [BEH-211](view_cap-200-load-play-video.md#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs"), [BEH-220](view_cap-200-load-play-video.md#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves"), [OQ-205](../../QUESTIONS.md#oq-205 "Time units for steps (1 s, 10 s, 60 s) and fractional fps")

## DEBT-217: Quick Help contradicts the code

[round 1, the Quick Help text was not re-read in round 2] Discrepancies recorded: modifier distances (Quick Help: Shift 1 s, Ctrl 1 min, Ctrl+Shift 10 min; code 1 s, 10 s, 60 s plus the fall-through of [DEBT-201](#debt-201-ctrlright-and-ctrlshiftright-fall-through-to-a-second-move "Ctrl+Right and Ctrl+Shift+Right fall through to a second move")); arrow keys (Quick Help says Left/Right/Up/Down move the annotation box; code: Left/Right navigate frames, Up/Down are left to the browser [read]); Return (Quick Help says validate and save; code focuses `#I` [read], [OQ-212](../../QUESTIONS.md#oq-212 "Enter key in the left column versus Quick Help")); image zoom (Quick Help says Shift+wheel; in the code read earlier it is Alt+Ctrl+wheel for the image and Shift+wheel is the chronogram zoom when its option is on); `P` (mark/unmark pollen) does nothing ([DEBT-206](#debt-206-shortcut-p-does-nothing "Shortcut `p` does nothing")). Replacement: generate the help text from the single key map ([DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place")).
- **Code:**
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#quickhelp`
- **Links:** [BEH-250](view_cap-200-load-play-video.md#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [BEH-251](view_cap-200-load-play-video.md#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)"), [BEH-253](view_cap-200-load-play-video.md#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field"), [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [DEBT-206](#debt-206-shortcut-p-does-nothing "Shortcut `p` does nothing"), [OQ-207](../../QUESTIONS.md#oq-207 "Intended keyboard step distances"), [OQ-212](../../QUESTIONS.md#oq-212 "Enter key in the left column versus Quick Help")

## DEBT-219: Frame bounds test lets NaN/undefined through

`seekFrame` and `forward` test `(frame<0)|(frame>=videoinfo.nframes)` with a bitwise `|`; `NaN` and `undefined` (empty or non-numeric `#currentFrame`, unset delayed seek) evaluate to false and are not rejected [read]. `rewind` in `video` mode has no bound test at all [read].
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.seekFrame`, `VideoControl.forward`, `VideoControl.rewind`
- **Links:** [BEH-218](view_cap-200-load-play-video.md#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)"), [BEH-219](view_cap-200-load-play-video.md#beh-219-frame-textbox "Frame textbox"), [BEH-220](view_cap-200-load-play-video.md#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves")

## DEBT-220: Cache-mode playback never stops at the end

At the last/first frame `seekFrame` rejects the request but `playTick` has already incremented `playFrame`, so `currentFrame != playFrame` stays true and `playTick` re-arms `requestAnimationFrame` forever with `playingState` still `playingForwards`/`playingBackwards` [read]. [round 1, not re-read]: in `video` mode the native `ended` event stops the listener, but `playingState` is not reset to `paused` (Space then pauses; the first press looks like it does nothing).
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.playTick`, `VideoControl.playPauseVideo`
- **Links:** [BEH-223](view_cap-200-load-play-video.md#beh-223-playback-in-video-mode-play-play-backwards-speed-x4 "Playback in video mode (Play, Play Backwards, speed, x4)"), [BEH-225](view_cap-200-load-play-video.md#beh-225-playback-in-cache-mode "Playback in cache mode")

## DEBT-221: Time conversions disagree on frameoffset; local ISO formatting

`getCurrentRealDate` (shown as "Real Time") is `starttime + toMilliseconds() * videofps / realfps` on the media time, which includes `frameoffset` (`seekFrame` requests media frame `f + frameoffset`), while `frameToTime(f)` subtracts it: `(f - frameoffset) / realfps` [read]. Which one is correct when `frameoffset != 0` is not known ([OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features")). `getCurrentVideoTime` is `video2.toMilliseconds() / 1000` [read]; how `toMilliseconds` rounds (VideoFrame library) is not verified. The local ISO formatter (`toLocaleISOString` in `updateVideoControlForm`) drops the timezone and appends milliseconds without zero padding (`.5` for 5 ms) [read].
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.getCurrentRealDate`, `VideoControl.frameToTime`, `VideoControl.getCurrentVideoTime`, `VideoControl.updateVideoControlForm`
- **Links:** [BEH-210](view_cap-200-load-play-video.md#beh-210-video-info-panel-content "Video Info panel content"), [BEH-211](view_cap-200-load-play-video.md#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs"), [BEH-228](view_cap-200-load-play-video.md#beh-228-frame-time-and-real-time-conversions "Frame, time and real-time conversions"), [OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features")

## DEBT-223: Fixed 20 fps assumptions

[round 1, not re-read] Button steps `rewind(200)`, `forward(20)` etc., `trackWindow` presets (`setTrackWindow(20/200/1200)`), and several cache calls (`getFrameCropDataURL(..., 20, ...)` in `OverlayControl.js`) hard-code 20 fps while the app supports other rates (211/12 for beefeeder videos).
- **Code:**
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videocontrol`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.rewind2`
- **Links:** [BEH-220](view_cap-200-load-play-video.md#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves"), [DEBT-216](#debt-216-frame-offset-and-fps-edits-recompute-inconsistently "Frame offset and fps edits recompute inconsistently"), [OQ-205](../../QUESTIONS.md#oq-205 "Time units for steps (1 s, 10 s, 60 s) and fractional fps")

## DEBT-224: Fullscreen call is WebKit-only and has dead code

`toggleFullScreen` computes an unused `main` and calls `document.body.webkitRequestFullscreen()` only (unprefixed API missing) [read].
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `toggleFullScreen`
- **Links:** [BEH-257](view_cap-200-load-play-video.md#beh-257-mouse-gestures-owned-by-labelbeejs-layout "Mouse gestures owned by labelBee.js (layout)")

## DEBT-225: Template markup defects in the video block

[round 1, not re-checked in round 2] `onchange="videoControl.playRateInputChanged()""` and `onkeypress="onKeyDown_NewIDEdit(event)""` carry a doubled quote; a stray `</p>` in `#beeInfo`; `Show Rect/ID/Labels/Notes` buttons are duplicated in two Options sub-panels (same class, so both update together); two elements share `id="tagsFromServer"`; `checked="false"` attributes on checkboxes mean checked (attribute presence), the real defaults are set elsewhere; the `Use Cache` button exists twice (Video block and Options > Display) sharing one option. Also `<link rel="icon" href="images/...">` and the script `src` attributes are relative paths [read]. Replacement: clean the template when it moves to components.
- **Code:**
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videocontrol`, `#tagsFromServer`
- **Links:** [BEH-259](view_cap-200-load-play-video.md#beh-259-page-layout-panels-and-their-ids "Page layout (panels and their ids)")

## DEBT-226: Dead collapse-event code and debug output in init

`init` binds `collapsibleexpand` / `collapsiblecollapse` handlers on `.inline-collapsible` blocks and defines `refreshCollapsible`, but the calls that would trigger these events in the header click handler are commented out [read]; only the handlers inside `labelBee.js` were read, so a trigger from another file is not excluded [inferred: never triggered]. The click handler also logs `'DONE\n\n'` to the console at every click [read]. Replacement: delete the dead handlers and the log.
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
- **Links:** [BEH-216](view_cap-200-load-play-video.md#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior")

## DEBT-227: `.video_id` shows `#video_id=undefined` before any video

The `VideoManager` constructor calls `this.updateVideoInfoForm()` (line 60 of `VideoList.js`) before it assigns `this.currentVideoID = 0` (line 87) [read: statement order; lines 1-95 of the constructor contain no earlier assignment]. `updateVideoInfoForm` renders `.video_id` as a link `#video_id=<encodeURIComponent(currentVideoID)>` with text `#video_id=<currentVideoID>`, so before any video is chosen the page shows `#video_id=undefined` instead of the markup placeholder `ID=??` [inferred from the order]. Replacement: initialise the field before the first form refresh.
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager`, `VideoManager.updateVideoInfoForm`
- **Links:** [BEH-210](view_cap-200-load-play-video.md#beh-210-video-info-panel-content "Video Info panel content"), [DEBT-214](#debt-214-global-variables-and-implicit-globals "Global variables and implicit globals")

## DEBT-228: videoLoad status row: request logged at completion, error before any request

`onVideoLoaded2` calls `statusWidget.statusRequest("videoLoad")` and immediately `statusUpdate("videoLoad", true)`, so the I/O Status row always reports about 0 s for the load [read]. `StatusWidget.statusUpdate` writes `this.statusInfo[type].done` and reads `.request`, which exist only after `statusRequest(type)`; `onVideoError` calls `statusUpdate("videoLoad", false)` and the only `statusRequest("videoLoad")` calls in the code are in `onVideoLoaded2` and the obsolete `onVideoLoaded` [read: grep], so on the first load error of a page `statusInfo["videoLoad"]` is undefined and the call throws before `isValidVideo` is cleared, the canvas size reset and the refresh applied [read]. Replacement: record the request when the load starts (`loadVideo2`), update on both outcomes.
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoLoaded2`, `VideoControl.onVideoError`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `StatusWidget`
- **Links:** [BEH-206](view_cap-200-load-play-video.md#beh-206-video-load-error "Video load error"), [BEH-234](view_cap-200-load-play-video.md#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [BEH-258](view_cap-200-load-play-video.md#beh-258-messages-area-and-io-status-rows "Messages area and I/O status rows")

## DEBT-229: Features init uses a block id that does not match the checkbox handler

`init` syncs the Features checkboxes with the list `[["showTimeline","timelineTab"], ["showFocusInterval","focusIntervalTab"], ...]`, while the `onchange` handler of `#showTimeline` toggles `timeline` and `timelineBR` and the markup block is `id="timeline"` [read]; no `timelineTab` element appears in the markup read, so the init call for Timeline has no effect [inferred]. `init` also toggles only the block, never the `...BR` spacer that the `onchange` handlers toggle [read]. `toggleHidden` is defined in an inline script of `labelbee_page.html`, not in `labelBee.js` [read]. Replacement: one binding table used by both init and the handlers.
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#showTimeline`, `#features`
- **Links:** [BEH-215](view_cap-200-load-play-video.md#beh-215-showhide-menu-tabs-features-panel "Show/hide menu tabs (Features panel)")

## DEBT-230: Hard-coded gurabo4 video+tracks loader

`clickLoadTracksTaggedCSVFromServer` (button "gurabo4 video+tracks_tagged") loads a video from the dataset `gurabo4` (path `/datasets/gurabo4/mp4/<col_videoname>`) and its `.tracks_tagged.csv` with hard-coded dataset names, calls `videoManager.loadVideoManual` without awaiting it and requests the tracks right after, and its cancel branch logs the name of another function [read]. It is a sixth, undocumented entry point of video loading, living in the annotation IO file. Replacement: remove with the dev-only code paths or generalise ([OQ-201](../../QUESTIONS.md#oq-201 "Which video-loading paths are routine")).
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `clickLoadTracksTaggedCSVFromServer`
- **Links:** [BEH-202](view_cap-200-load-play-video.md#beh-202-ways-to-choose-a-video "Ways to choose a video"), [BEH-232](view_cap-200-load-play-video.md#beh-232-load-a-video-and-its-tracks-from-the-gurabo4-dataset "Load a video and its tracks from the gurabo4 dataset"), [DEBT-204](#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts"), [OQ-201](../../QUESTIONS.md#oq-201 "Which video-loading paths are routine")

## DEBT-301: Default renderer omits tag intervals, crosses, parts and individual events

`renderActivities` draws only intervals, entering/leaving/pollen/fanning classes, dangling marks and selection when `chrono.config.legacyActivities` is false (default, no UI). Tag rects (`renderTagIntervals`), `crossLeft` crosses for falsealarm/wrongid, `partsAvailable` squares, `obsspan`/`alertcircle` (individual events) and `circle.obs` live only in `ChronoControlActivitiesLegacy.js` and run only through `updateActivities`. The page options "Show Tags", "Show Individual Events", "Highlight events with parts", "Show on Chrono" therefore do not change what is drawn. [read] `labelbee/static/labelbee/js/ChronoControl.js:36` (console hint for the legacy flag), `labelbee/static/labelbee/js/ChronoControl.js:918` (`updateChrono` calls `renderActivities` and `updateTagIntervals`, never `renderTagIntervals`); the legacy-file claims were read in the first pass and not re-checked. Intended replacement: unknown ([OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram")); either port these layers to `ChronoIntervals` or drop the options.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderActivities`, `updateChrono`
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `updateActivities`, `renderTagIntervals`, `renderChrono_Parts`
- **Links:** [BEH-326](view_cap-300-temporal-display-navigation.md#beh-326-show-individual-events-option-no-visible-effect-in-the-default-renderer "Show Individual Events option (no visible effect in the default renderer)"), [BEH-327](view_cap-300-temporal-display-navigation.md#beh-327-legacy-activity-renderer-not-active-by-default "Legacy activity renderer (not active by default)"), [BEH-329](view_cap-300-temporal-display-navigation.md#beh-329-tag-interval-rendering-legacy-file-not-invoked "Tag interval rendering (legacy file, not invoked)"), [BEH-344](view_cap-300-temporal-display-navigation.md#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer "Highlight events with parts option (no visible effect in the default renderer)"), [BEH-345](view_cap-300-temporal-display-navigation.md#beh-345-show-on-chrono-button-in-the-parts-panel "'Show on Chrono' button in the parts panel"), [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [CAP-304](view_capabilities.md#cap-304-tag-display "Tag display"), [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram")

## DEBT-302: Chronogram is a god object over free globals

`Chronogram` assigns itself to the global `chrono` (`chrono = this`, TODO in code) and the module defines/uses undeclared globals: `axes`, `chronogramData`, `tagsChronogramData`, `restrictID`, `restrictIDArray`, `excludeID(Array)` (set only by `onExcludeIDChanged`, not by `initChrono`), `flag_*`, `eventSeekMode`, `chronoItemHeight`, `svgSpanRects`, `svgTag`, `svgInterval`, `svgTop`, `videoSpan`, `trackWindowSpan`, `tagSel`, `chronoIntervals`, `flatTracksAll/Valid/GroupById`, `rectIntervals`, `circlesIntervals`, `acts`, `obs` (leaked loop variable in `updateFlatTracks`), `rank`, `center`, `plotArea` (in `ChronoAxes`), and `options` (assigned without declaration in `initChrono`). Hard-coded selectors `#chronoTab`, `#chronoDiv`, `#svgVisualize`, `#canvasresize`, `#labelingTab`. [read] `labelbee/static/labelbee/js/ChronoControl.js:161-206`, `labelbee/static/labelbee/js/ChronoControl.js:1041` (`obs = Tracks[F][id]` without declaration). Intended: a self-contained module owning its state, receiving the DOM container and a data provider.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `Chronogram`, `initChrono`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `ChronoAxes`
- **Links:** [BEH-301](view_cap-300-temporal-display-navigation.md#beh-301-chronogram-construction-and-default-state "Chronogram construction and default state"), [BEH-342](view_cap-300-temporal-display-navigation.md#beh-342-refresh-entry-point "Refresh entry point"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners")

## DEBT-303: Wrong comment/behavior for the pan clamp

`onZoom` comment says "Make videoSpan always take at least 10% of the view" but `pleft` and `pright` are both the view center (`range0 + 0.5*width` and `range1 - 0.5*width`), so the video can only be dragged until its first frame reaches the center (or last frame leaves it). [read] `labelbee/static/labelbee/js/ChronoAxes.js:708-731`. Intended: either fix the comment or implement the 10% rule.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `onZoom`
- **Links:** [BEH-305](view_cap-300-temporal-display-navigation.md#beh-305-pan-and-zoom-with-mouse-drag-and-wheel "Pan and zoom with mouse drag and wheel")

## DEBT-304: xdomainFocus uses a zoom API that D3 no longer has (TypeError)

`xdomainFocus` calls `zoom.translate()`, `zoom.scale()` and `zoom.translate([..])`/`zoom.scale(..)` (the D3 v3 zoom API, removed in D3 v4). The page code uses the D3 v6 API (`d3.zoom().on`, `d3.pointer(event)`, `zoom.translateBy`, `zoom.scaleTo` in `labelbee/static/labelbee/js/ChronoAxes.js:687-705`), and the zoom behaviour only exposes `transform`, `scaleBy`, `scaleTo`, `translateBy`, `translateTo`, `extent`, `scaleExtent`... The first statements of `xdomainFocus` (`let oldT = zoom.translate()`, `labelbee/static/labelbee/js/ChronoAxes.js:125`) are expected to throw an uncaught `TypeError` ("zoom.translate is not a function"); no try/catch appears around it in the code seen and nothing reports the failure in the UI. Everything that goes through it is affected: Z+/Z- (`scaleTimeDomain`), shift buttons (`shiftTimeDomain`), `xdomainScale`, the Follow button and per-frame follow (`focusTrackWindow`), `onAxesDblClick`. `xdomainCenter` also reads an undeclared `center`. The loaded build (v6.2.0 per the page script tag) was not part of the re-check; not run: needs verification in a browser (Phase 1d). Proposed replacement (pending [OQ-302](../../QUESTIONS.md#oq-302 "What should the view-window controls do?")): `zoom.transform` with a computed `d3.zoomIdentity`.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `xdomainFocus`, `xdomainScale`, `xdomainCenter`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `focusTrackWindow`
- **Links:** [BEH-310](view_cap-300-temporal-display-navigation.md#beh-310-follow-window-toggle-and-video-button-view-recentring "Follow-window toggle and Video button (view recentring)"), [BEH-312](view_cap-300-temporal-display-navigation.md#beh-312-z-z--shift-buttons-and-the-time-domain-operations "Z+, Z-, shift buttons and the time-domain operations"), [BEH-334](view_cap-300-temporal-display-navigation.md#beh-334-double-click-on-the-chronogram "Double click on the chronogram"), [OQ-302](../../QUESTIONS.md#oq-302 "What should the view-window controls do?")

## DEBT-305: Redraw and layout are expensive and loop-prone

Each pan/zoom/resize event runs `updateChrono` (full render of visible intervals plus `updateTagIntervals` rebuild of all tag intervals, [DEBT-311](#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals")). `updateChrono` must avoid anything that emits `axes:changed` (comment). A wheel notch calls `zoom.translateBy` then `zoom.scaleTo` (`labelbee/static/labelbee/js/ChronoAxes.js:699-705`); each changes the transform and is expected to run `onZoom` -> `refreshAxes` -> `axes:changed` -> `updateChrono`, so two full redraws per notch [inferred, to verify by counting `updateChrono` calls]. `chronoAdjust` creates a new `debouncer` per call and `refreshChronoLayout` does `debouncer(doRefresh)()` with a fresh debouncer each time; `debouncer` keeps `timeoutID` in a per-instance closure (default 100 ms, `labelbee/static/labelbee/js/ChronoControl.js:1849-1860`), so calls are delayed but never coalesced; `debouncer(refreshChronoLayout, 300)` at the end of `initChrono` creates a function that is never called (first reading); `getChronoItemHeight` contains a stray `console.trace` (`labelbee/static/labelbee/js/ChronoControl.js:488`); `ChronoIntervals.render` is invoked twice per redraw (`updateAndRender` then `render`, first reading). [read] `labelbee/static/labelbee/js/ChronoControl.js:273-287`, `labelbee/static/labelbee/js/ChronoControl.js:492-548`, `labelbee/static/labelbee/js/ChronoControl.js:902-937`.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChrono`, `chronoAdjust`, `getChronoItemHeight`, `renderActivities`, `refreshChronoLayout`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `onZoom`
- **Links:** [BEH-305](view_cap-300-temporal-display-navigation.md#beh-305-pan-and-zoom-with-mouse-drag-and-wheel "Pan and zoom with mouse drag and wheel"), [BEH-311](view_cap-300-temporal-display-navigation.md#beh-311-axes-changes-trigger-a-lightweight-redraw "Axes changes trigger a lightweight redraw"), [BEH-313](view_cap-300-temporal-display-navigation.md#beh-313-chronogram-size-buttons "Chronogram size buttons"), [BEH-347](view_cap-300-temporal-display-navigation.md#beh-347-layout-refresh-and-collapsed-chronogram "Layout refresh and collapsed chronogram"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## DEBT-306: ID axis ordering and remap fall-through

`updateChronoYDomain` always takes the `idAxisMap` branch (the map is always defined, identity by default), so the `sortIds` order is replaced by a numeric sort `(a,b) => -Number(b)+Number(a)`; for non-numeric IDs (`F12`, tag-like strings) the comparator returns NaN. The `else` branch is dead. Modulo remap prompt has no validation; the `idAxisMap` text input path is commented out in the page and the code references an invalid selector `$('#')`. `updateChronogramData` computes an unused `id_eff = Number(id)%50`. The remap is also applied inside the data pipeline: `updateTagIntervals` sets `y = chrono.config.idAxisMap(id)` on each tag interval (and the interval builder does the same for events), so the view depends on the remap being applied upstream ([SEAM-302](view_seams.md#seam-302-chronogram-and-the-derived-data-cap-802 "Chronogram and the derived data (CAP-802)")). [read] `labelbee/static/labelbee/js/ChronoControl.js:692-707`, `labelbee/static/labelbee/js/ChronoControl.js:1093`, `labelbee/static/labelbee/js/ChronoControl.js:1448`, `labelbee/static/labelbee/js/ChronoControl.js:1462`.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoYDomain`, `click_setIdAxisMap`, `idAxisMap_inputChanged`, `update_idAxisMap_input`, `updateTagIntervals`, `updateChronogramData`
- **Links:** [BEH-315](view_cap-300-temporal-display-navigation.md#beh-315-id-axis-domain-and-row-order "ID axis domain and row order"), [BEH-318](view_cap-300-temporal-display-navigation.md#beh-318-id-remap-buttons-id-modulo "ID remap buttons (ID, Modulo)"), [SEAM-302](view_seams.md#seam-302-chronogram-and-the-derived-data-cap-802 "Chronogram and the derived data (CAP-802)")

## DEBT-307: Four label colors hard-coded in CSS and JS

Interval colors and classes `entering`, `leaving`, `pollen`, `fanning` are hard-coded in `renderEnterLeavePollen` and `.interval.*` in `labelbee/static/labelbee/css/custom.css:871-892`; wrongid/falsealarm have no color in the default renderer. Legacy colors differ (`activityColor`, `setGeomActivity`). [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic") (open label vocabulary) does not say how colors should be defined; whether a label registry should provide colors is open ([OQ-305](../../QUESTIONS.md#oq-305 "Label colors and precedence on intervals")).
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderEnterLeavePollen`
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `activityColor`, `activityHeight`
- **Links:** [BEH-321](view_cap-300-temporal-display-navigation.md#beh-321-event-interval-colors-by-label "Event interval colors by label"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-305](../../QUESTIONS.md#oq-305 "Label colors and precedence on intervals")

## DEBT-308: Hard-coded ROI and dangling-mark colors

Dangling marks use the global `ROI = {left:175, top:250, right:2305, bottom:1240}` ("Gurabo 5MP") even when `flag_useROI` is off; the commented `//if (flag_useROI)` in `updateChronogramData`. With `hide_non_dangling` true (lazy default, `labelbee/static/labelbee/js/ChronoControl.js:1711`) the green case is unreachable; with false, start and end marks are colored independently (green when the corresponding end is outside the ROI). [read] `labelbee/static/labelbee/js/ChronoControl.js:1702-1741`, `OverlayControl.js:47` (first reading).
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderChrono_danglingTracks`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `ROI`
- **Links:** [BEH-324](view_cap-300-temporal-display-navigation.md#beh-324-dangling-track-startend-marks "Dangling track start/end marks"), [OQ-308](../../QUESTIONS.md#oq-308 "Dangling marks and the ROI")

## DEBT-309: Show Events off leaves stale intervals

`updateChronoData` clears `chronogramData` but only reassigns `allIntervals` inside `createIntervalList`, which is skipped when `showObsChrono` is false. The old `allIntervals` remain drawn, with `y` values possibly missing from the new y domain (first reading, `updateChronoData` not re-checked). Intended: clear `allIntervals` (and crosses, rect/circle/parts subsets).
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoData`, `createIntervalList`
- **Links:** [BEH-325](view_cap-300-temporal-display-navigation.md#beh-325-show-events-option "'Show Events' option"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## DEBT-310: Legacy file contains live and dead code, and is always loaded

`ChronoControlActivitiesLegacy.js` (808 lines) is loaded by the page and mixes: dead code (`createIntervalList_legacy`, `initActivities`, `removeActivities` unused outside console hint, activity helper functions), legacy renderers reachable only via a console flag, and live functions (`initTagIntervals`/`renderTagIntervals` called at init with empty data). It creates/removes `.tooltip` elements (detaches `chrono.tooltip`) and uses globals set elsewhere. [read] `labelbee_page.html` script tags, `labelbee/static/labelbee/js/ChronoControl.js:36` (first reading for the legacy-file content). Proposed, pending [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram"): remove after [DEBT-301](#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events") is resolved.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `createIntervalList_legacy`, `initActivities`, `removeActivities`, `initTagIntervals`
- **Links:** [BEH-327](view_cap-300-temporal-display-navigation.md#beh-327-legacy-activity-renderer-not-active-by-default "Legacy activity renderer (not active by default)"), [BEH-329](view_cap-300-temporal-display-navigation.md#beh-329-tag-interval-rendering-legacy-file-not-invoked "Tag interval rendering (legacy file, not invoked)"), [DEBT-301](#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram")

## DEBT-311: Redraw overwrites labeled/virtual tag intervals

`updateChrono` calls `updateTagIntervals()` (a data function) on every redraw. It resets `tagIntervals` to the raw list with `labeling = {}` (object literals at `labelbee/static/labelbee/js/ChronoControl.js:1450-1458` and `labelbee/static/labelbee/js/ChronoControl.js:1464-1472`), losing: labels from `updateTagsLabels` (`labeled`, `entering`, `falsealarm`, `wrongid`), virtual `wrongid` intervals, the hide-invalid filter (applied in `updateChronoData`, `labelbee/static/labelbee/js/ChronoControl.js:1001-1005`) and the `showTagsChrono` switch. Consequently `isNotLabeled` (`!element.labeling.labeled`) is true for every interval and the `freetag` seek mode behaves as `tag` mode; "Hide FA/WrongID" does not affect `tag` navigation. Likely a half-finished edit (a render call was replaced by the data function). [read] `labelbee/static/labelbee/js/ChronoControl.js:918`, `labelbee/static/labelbee/js/ChronoControlInteraction.js:118-120`. Needs confirmation by running ([OQ-303](../../QUESTIONS.md#oq-303 "Tag-interval labels after a redraw")).
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChrono`, `updateTagIntervals`, `updateTagsLabels`, `updateChronoData`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `isNotLabeled`, `findNextFreeTagEvent`
- **Links:** [BEH-328](view_cap-300-temporal-display-navigation.md#beh-328-tag-intervals-refreshed-at-every-redraw "Tag intervals refreshed at every redraw"), [BEH-330](view_cap-300-temporal-display-navigation.md#beh-330-show-tags-option "'Show Tags' option"), [BEH-336](view_cap-300-temporal-display-navigation.md#beh-336-next--previous-event "Next / Previous event"), [BEH-348](view_cap-300-temporal-display-navigation.md#beh-348-candidate-lists-of-event-navigation "Candidate lists of event navigation"), [OQ-303](../../QUESTIONS.md#oq-303 "Tag-interval labels after a redraw")

## DEBT-312: Dead interaction code

Dead or inactive: Ctrl-hover preview (`injectTrackFrame` not installed, its call is commented out at `labelbee/static/labelbee/js/ChronoAxes.js:915`, so `previewframe:trackmove`/`onAxesMoved`/`endPreview` never fire and its `keydown.trackFrame` handler on `body` is never bound), `axes.onClick`/`onAxesChanged` callbacks (replaced by jQuery events, commented out in `initChrono`), `onZoom0`, `triggerEvent`, `domainy*` (commented), `nextSeekFocusWindow` (no caller found), `eventSeekMode`-related `gotoEvent_seekCB`; the custom `onAxesDblClick` is possibly shadowed by d3's `dblclick.zoom` (unverified, see [BEH-334](view_cap-300-temporal-display-navigation.md#beh-334-double-click-on-the-chronogram "Double click on the chronogram")). [read] `labelbee/static/labelbee/js/ChronoAxes.js:913-960`, `labelbee/static/labelbee/js/ChronoControl.js:194-195`.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `injectTrackFrame`, `onZoom0`, `triggerEvent`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onAxesMoved`, `nextSeekFocusWindow`, `onAxesDblClick`
- **Links:** [BEH-334](view_cap-300-temporal-display-navigation.md#beh-334-double-click-on-the-chronogram "Double click on the chronogram"), [BEH-340](view_cap-300-temporal-display-navigation.md#beh-340-no-keyboard-shortcut-for-chronogram-navigation "No keyboard shortcut for chronogram navigation")

## DEBT-313: Navigation sorts shared arrays in place and mixes id types

`findNext*/findPrevious*` call `.sort` on the list they search: `tagIntervals` itself (`tag` mode, AutoSeek on), `flatTracksAll`/`flatTracksValid` (`event` mode AutoSeek on, and every `eventframe` search), `flatTracksAllGroupById[id]`/`flatTracksValidGroupById[id]` (`event` mode, AutoSeek off); `freetag` and non-auto `tag` sort a filtered copy. This mutates shared derived data, each call re-sorting with different comparators. `frame` fields are strings (from `for F in Tracks`) compared via `Number()`; IDs are compared with loose `==`; `getIdCoord` returns undefined for IDs without a row, the comparators then return NaN, which sort treats as a tie (order unspecified) and the "greater than" tests are false (such events are skipped). `flag_hideFlowers` is not applied in `updateFlatTracks` (`labelbee/static/labelbee/js/ChronoControl.js:1029-1078`), so `eventframe` navigation can stop on hidden flower IDs. [read] `labelbee/static/labelbee/js/ChronoControlInteraction.js:103-125`, `labelbee/static/labelbee/js/ChronoControlInteraction.js:295-412`.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `findNextObsEvent`, `findPreviousObsEvent`, `findNextEventFrame`, `findNextTagEvent`, `getIdCoord`
- **Links:** [BEH-336](view_cap-300-temporal-display-navigation.md#beh-336-next--previous-event "Next / Previous event"), [BEH-337](view_cap-300-temporal-display-navigation.md#beh-337-ordering-of-events-across-ids "Ordering of events across IDs"), [BEH-348](view_cap-300-temporal-display-navigation.md#beh-348-candidate-lists-of-event-navigation "Candidate lists of event navigation"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## DEBT-314: Next/Prev ID blocked by RestrictID; side effects

`onClickNextID`/`onClickPrevID` take the visible rows (`validVisibleTagIdsDomain`, from `axes.ydomain()`) as cycle; when RestrictID is active that is only the restricted IDs, so the buttons stay on the same ID. They also call `setRestrictID(newID)` (overwrites the RestrictID text field/array even when the restriction is off; it refreshes the chronogram when `flag_restrictID` is on, `labelbee/static/labelbee/js/ChronoControl.js:356-371`) and end with `refreshChronogram()`, so there are two refreshes when the restriction is on. `onClickPrevID(gotoLast)` parameter is never passed by the page. [read] `labelbee/static/labelbee/js/ChronoControlInteraction.js:436-457` (`onClickNextID`).
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onClickNextID`, `onClickPrevID`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `setRestrictID`
- **Links:** [BEH-339](view_cap-300-temporal-display-navigation.md#beh-339-next-id--previous-id "Next ID / Previous ID")

## DEBT-315: "Show on Chrono" button is outside the synchronisation class

The button "Show on Chrono" has class `buttonShowPartsOnChrono` (`labelbee/blueprints/labelbee/templates/labelbee_page.html:1152`) while `updateButtons("button_showPartsOnChrono", flag)` selects `button.button_showPartsOnChrono` and `input.button_showPartsOnChrono` (`labelbee/static/labelbee/js/ChronoControl.js:312-326`); only the checkbox "Highlight events with parts" (page:1266) matches. The button's `active` class is flipped by `toggledNewState` on its own clicks only, so it can disagree with `flag_showPartsOnChrono` (checkbox toggled, or init reset). Also the checkboxes at page:1262 and :1266 have the HTML attribute `checked="false"`, which means checked; the unchecked default only holds because `initChrono` resets them (`labelbee/static/labelbee/js/ChronoControl.js:177-178`). Intended: one class per synchronised control group, no `checked` attribute for a default-off option.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `onToggleButton_showPartsOnChrono`, `updateButtons_showPartsOnChrono`, `toggledNewState`, `updateButtons`
- **Links:** [BEH-344](view_cap-300-temporal-display-navigation.md#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer "Highlight events with parts option (no visible effect in the default renderer)"), [BEH-345](view_cap-300-temporal-display-navigation.md#beh-345-show-on-chrono-button-in-the-parts-panel "'Show on Chrono' button in the parts panel"), [SEAM-303](view_seams.md#seam-303-chronogram-view-and-its-dom-page "Chronogram view and its DOM page")

## DEBT-316: Chronogram file writes annotations

Two functions of the display file modify `Tracks`: `augmentTrackWithTag` sets `Tracks[F][id].tag = Tags[F].tags[i]` for each (frame, id) present in both (`labelbee/static/labelbee/js/ChronoControl.js:1015-1026`), and `cleanObsoleteEvents` deletes `Tracks[F][id]` for flagged observations after a `confirm`, then calls `refreshChronogram()` (`labelbee/static/labelbee/js/ChronoControl.js:1983-2021`, button `#cleanObsoleteEventsButton`). The first adds a derived field to the live annotation objects (which can end up in a save, to check in group 7); the second is a destructive edit that bypasses the annotation model and conflicts with [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"). Intended: derived links computed outside `Tracks`, destructive cleaning owned by the annotation/filter area (pending [OQ-310](../../QUESTIONS.md#oq-310 "Clean obsolete events: rule and ownership")).
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`, `cleanObsoleteEvents`, `cleanObsoleteEventsCB`
- **Links:** [BEH-342](view_cap-300-temporal-display-navigation.md#beh-342-refresh-entry-point "Refresh entry point"), [BEH-343](view_cap-300-temporal-display-navigation.md#beh-343-clean-obsolete-events-deletes-flagged-observations "Clean obsolete events deletes flagged observations"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [SEAM-302](view_seams.md#seam-302-chronogram-and-the-derived-data-cap-802 "Chronogram and the derived data (CAP-802)"), [OQ-310](../../QUESTIONS.md#oq-310 "Clean obsolete events: rule and ownership")

## DEBT-317: Selected-ID outline for an ID without a row

`refreshIdSelection` appends the `rect.selection` whenever `axes.selectedID != null`, with `y = axes.yScale(axes.selectedID)`. For an ID not in the y domain (absent from the data, filtered out, or an unmapped ID in modulo remap mode) `yScale` returns undefined; by d3 `attr` semantics (`null`/`undefined` removes the attribute) the rect is then expected to have no `y` and appear at the top of the plot [inferred, to verify in a browser]. [read] `labelbee/static/labelbee/js/ChronoAxes.js:613-626`. Intended: draw no outline for an ID without a row.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `refreshIdSelection`, `selectId`
- **Links:** [BEH-317](view_cap-300-temporal-display-navigation.md#beh-317-selected-id-highlight-on-the-axes "Selected ID highlight on the axes"), [BEH-318](view_cap-300-temporal-display-navigation.md#beh-318-id-remap-buttons-id-modulo "ID remap buttons (ID, Modulo)"), [OQ-306](../../QUESTIONS.md#oq-306 "ID Remap purpose and selection in modulo mode")

## DEBT-318: Tag branch of validTagIdsDomain reads a field tag intervals do not have

`validTagIdsDomain` filters hidden tag IDs with `containsLabel(d.labels, "wrongid")` / `"falsealarm"` (`labelbee/static/labelbee/js/ChronoControl.js:597-613`), but tag intervals built by `updateTagIntervals` have `labeling` (an object) and no `labels` (`labelbee/static/labelbee/js/ChronoControl.js:1450-1458`). With `d.labels` undefined the filter excludes nothing: `containsLabel` (defined in `SelectionControl.js`, `labelbee/static/labelbee/js/SelectionControl.js:861-869`) returns false for null/undefined labels; no code seen sets `labels` on tag intervals. The effective hide-invalid filter is in `updateChronoData` on `interval.labeling` (`labelbee/static/labelbee/js/ChronoControl.js:1001-1005`) and runs before the y domain is built. The branch is only reached when `tagMode != 'Tracks'`. Intended: one hide-invalid rule on the field that exists.
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `validTagIdsDomain`, `updateChronoData`, `updateTagIntervals`
- **Links:** [BEH-315](view_cap-300-temporal-display-navigation.md#beh-315-id-axis-domain-and-row-order "ID axis domain and row order"), [DEBT-311](#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals")

## DEBT-401: plotTag leaves the canvas state unbalanced

In `plotTag`, the selected-tag branch for the current frame ends with `ctx.restore()` for which the critic review found no matching `ctx.save()` (restores a state saved by a caller, or nothing). The branch for the selected ID in another frame calls `ctx.save()` with no `restore()`, and its second path `ctx.arc(radius+2)` in yellow, width 3, is never stroked. [read] `labelbee/static/labelbee/js/OverlayControl.js` (`plotTag`: restore at the end of the first branch, save at the start of the second, no stroke after the second arc). Intended: balanced save/restore per call; decide whether the yellow ring is wanted.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTag`
- **Links:** [BEH-438](view_cap-400-overlay-display-annotations.md#beh-438-selected-tag-marker "Selected tag marker"), [BEH-437](view_cap-400-overlay-display-annotations.md#beh-437-tags-of-the-current-frame "Tags of the current frame")

## DEBT-402: Dead `Tags` branch of `getTag` and global `tagMode`

`tagMode` is a global assigned only once at the top of `OverlayControl.js`, read in `getTag` and in `ChronoControl.js`, and never assigned elsewhere, so the `Tags[frame].tags` lookup branch of `getTag` is unreachable. [read] Intended: remove, or make an explicit parameter of the data source.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `getTag`, `tagMode`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
- **Links:** [BEH-436](view_cap-400-overlay-display-annotations.md#beh-436-tag-lookup-for-a-bee "Tag lookup for a bee")

## DEBT-403: Dead code in the overlay file

Functions with no caller found: `predictId` (only a comment refers to it), `identify`, `redrawVideoFromCache`, `drawImageToCanvas`, `openVideoNewTab` (its button is commented out in the page, not re-read), and `doSwap2` in the pick-frame panel of `hardRefresh` (defined, attached to no button). The non-copy branch of `redrawVideoFrame` (`flagCopyVideoToCanvas` false) is unreachable: `VideoControl.js` sets the flag to true in its constructor and never assigns it elsewhere (so are the `if (true)` / `else` halving branch of `canvasSetVideoSize`). [read] Intended: delete after confirming no external use.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `predictId`, `identify`, `redrawVideoFromCache`, `drawImageToCanvas`, `openVideoNewTab`, `hardRefresh`
- **Links:** [BEH-423](view_cap-400-overlay-display-annotations.md#beh-423-id-prediction-rules "ID prediction rules"), [BEH-412](view_cap-400-overlay-display-annotations.md#beh-412-export-frame "Export frame"), [BEH-450](view_cap-400-overlay-display-annotations.md#beh-450-pick-frame-span-panel "Pick-frame span panel")

## DEBT-404: ID prediction conflict path and string ID arithmetic

(a) `defaultIfIDExists(predictStruct)` returns `predicted_obs: obs` on a conflict although `obs` is neither a parameter nor declared in the function [read]: it reads a leaked global `obs` (assigned as an implicit global elsewhere, so a stale object) or throws a `ReferenceError` on every conflict [which one depends on load state, inferred]; (b) on a conflict it returns no `obs` for the geometry (`predicted_obs` is not read by the caller), so `onMouseDown_predict` falls into the "no prediction" branch and the geometry of the matched observation is not reused [read]; (c) in that branch `while (exists) id = id + 1` concatenates when `id` is a string (`"1"` becomes `"11"`), latent because `computeDefaultNewID` already returns a free ID [read]; (d) `computeDefaultNewID` returns the number `0` for an empty frame and strings otherwise [read]. Intended: ID normalisation in one place (IDs are strings, [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")), conflict handling returns the predicted geometry.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `defaultIfIDExists`, `onMouseDown_predict`, `computeDefaultNewID`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteEvent`
- **Links:** [BEH-422](view_cap-400-overlay-display-annotations.md#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [BEH-423](view_cap-400-overlay-display-annotations.md#beh-423-id-prediction-rules "ID prediction rules"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## DEBT-405: submit_bee failures are silent or misreported

(a) `submit_bee` for a `db` box whose observation is missing from `Tracks` logs "Writing anyway" but prints "Internal issue", returns true before writing; the edit is silently lost. (b) `onKeyDown_IDEdit` calls `submit_bee(activeObject)` for a `new` box and ignores the result: when the ID already exists (red "Conflict of ID" message, nothing stored) it still sets `defaultSelectedBee` to the new ID and prints the green "ID changed + submitted", leaving the box with the attempted ID but unsaved. (c) `submit_bee` ignores the argument passed by `labelBee.js` (two call sites). [read] `labelbee/static/labelbee/js/SelectionControl.js` (`submit_bee`), `labelbee/static/labelbee/js/labelBee.js` (`onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`). Intended: decide to write or fail loudly ([INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")); a refused commit must not report success ([OQ-408](../../QUESTIONS.md#oq-408 "ID edit on a new box that conflicts with an existing ID")).

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
- **Links:** [BEH-433](view_cap-400-overlay-display-annotations.md#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)"), [BEH-434](view_cap-400-overlay-display-annotations.md#beh-434-editing-the-bee-id "Editing the bee ID"), [BEH-453](view_cap-400-overlay-display-annotations.md#beh-453-new-id-field-of-the-active-box "New-ID field of the active box"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-408](../../QUESTIONS.md#oq-408 "ID edit on a new box that conflicts with an existing ID")

## DEBT-406: Two parallel encodings of labels in overlay drawing and creation

Box text uses `obs.labels` ([BEH-456](view_cap-400-overlay-display-annotations.md#beh-456-labels-and-notes-text-on-a-box "Labels and notes text on a box")) while track dots use `activityString(obs)` from `bool_acts` ([BEH-442](view_cap-400-overlay-display-annotations.md#beh-442-observation-tracks-trajectory-of-boxes "Observation tracks (trajectory of boxes)")); `updateObsActivityFromForm` and `setLabels` rewrite `bool_acts[0..3]` from labels; Shift+click copies only `bool_acts[0]` and `bool_acts[1]` from the predicted observation and not the `labels` string, so the new observation has diverging `bool_acts` and `labels`. `activityString` hard-codes the letters F, P, E, L. [read] `OverlayControl.js` (`onMouseDown_predict` lines copying `bool_acts[0]`, `bool_acts[1]`; `plotTracks`, `setLabels` as first read). Intended: one label source, `bool_acts` derived by a shim ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics")).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `activityString`, `updateObsActivityFromForm`, `setLabels`, `onMouseDown_predict`, `plotTracks`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-422](view_cap-400-overlay-display-annotations.md#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [BEH-442](view_cap-400-overlay-display-annotations.md#beh-442-observation-tracks-trajectory-of-boxes "Observation tracks (trajectory of boxes)"), [BEH-448](view_cap-400-overlay-display-annotations.md#beh-448-labels-and-activity-flags-kept-in-sync-by-form-helpers "Labels and activity flags kept in sync by form helpers"), [BEH-456](view_cap-400-overlay-display-annotations.md#beh-456-labels-and-notes-text-on-a-box "Labels and notes text on a box")

## DEBT-407: Module state held in implicit globals

`canvasTransform`, `transformFactor`, `canvasTransformReference`, `extraScale`, `default_width/height`, `lockFocusTrackWindow`, `flag_useROI`, `ROI`, `flag_useExcludeRects`, `excludeRects`, `excludeRectSelection`, `showObs`, `showObsTracks`, `showObsChrono`, `showTags`, `showTagsTracks`, `showSelectedTagsTracks`, `showTagsOrientation`, `showTagsChrono`, and the filter functions `tagsSampleFilter`, `tagsHammingSampleFilter`, ... are assigned without `var/let/const` (or at module level) inside the constructor and handlers, and read by `ChronoControl.js` and others. Painting helpers also leak `color`, `radius`, `font`, `setColor`, `cx`, `cy`, `rect`; loop variables leak too (`i` in `drawTimelineCurrentObject`, `delta` in `TimelineWidget`). The global `overlay` is used inside prototype methods and free functions. [read] (constructor assignments of the display flags; first reading for the rest). Intended: owned by explicit objects (view transform, display flags, filter state), see [SEAM-401](view_seams.md#seam-401-overlay---videocontrol-frame-refresh-and-frame-source "Overlay <-> VideoControl (frame refresh and frame source)")..406.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl`, `plotTracks`, `refreshTagsParameters`, `drawTimelineCurrentObject`, `TimelineWidget`
- **Links:** [BEH-407](view_cap-400-overlay-display-annotations.md#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping"), [BEH-410](view_cap-400-overlay-display-annotations.md#beh-410-display-checkboxes-and-their-initial-state "Display checkboxes and their initial state"), [BEH-446](view_cap-400-overlay-display-annotations.md#beh-446-region-of-interest-and-exclusion-rectangles "Region of interest and exclusion rectangles"), [SEAM-403](view_seams.md#seam-403-view-transform-canvas---video-coordinates "View transform (canvas <-> video coordinates)")

## DEBT-408: Canvas sizing issues

(a) The initial `overlay.videoSize` is `{x: 600, y: 400}` while all code reads `.w`, `.h` [read: the constructor sets `overlay.videoSize = { x: 600, y: 400 }`]; any resize before the first video yields NaN. (b) `refreshCanvasSize` with `logging.canvasEvents` on dereferences `event.target` although `canvasSetVideoSize` calls it with no event (TypeError) [read]. (c) `canvasSetVideoSize` writes `#canvasresize` as `(canvas+16+2) x (canvas+2)` and `refreshCanvasSize` reads it minus 4 and writes `+2` back, so after each video load the canvas is a fixed 2 px smaller than computed; this is not cumulative per load (`canvasSetVideoSize` overwrites the style first); whether the user resize (`resizestop`) accumulates the loss was not shown by the evidence [read, arithmetic]. (d) With `flagCopyVideoToCanvas` false the `<video>` element underneath would not be transformed by the zoom; moot while the flag is always true ([DEBT-403](#debt-403-dead-code-in-the-overlay-file "Dead code in the overlay file")). (e) `selectboxSetOptions` tests a local `name` that is always undefined, and its `names` argument is never used [read]. Intended: a single sizing function with a defined contract.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `canvasSetVideoSize`, `refreshCanvasSize`, `selectboxSetOptions`, `redrawVideoFrame`
- **Links:** [BEH-404](view_cap-400-overlay-display-annotations.md#beh-404-video-frame-painting-depends-on-the-video-mode "Video frame painting depends on the video mode"), [BEH-406](view_cap-400-overlay-display-annotations.md#beh-406-canvas-size-follows-the-video-size-and-the-user-resize "Canvas size follows the video size and the user resize")

## DEBT-409: Box clone omits span, predicted and tag; drawing re-reads Tracks; transparent prediction crashes (severity H)

`cloneObs`/`copyObs` do not copy `span`, `predicted` or `tag`, so `identifyBeeRect` re-reads them with `getObsHandle(frame, ID)`. For a pending (`new`) box with no stored observation that lookup returns undefined and, with `showPredictedStatus` on, `obs.predicted` throws a TypeError inside `_render` (after `ctx.save()`, never restored) on every redraw while such a box exists. [read] `OverlayControl.js` (`identifyBeeRect`), `Model.js` (`getObsHandle` returns undefined for a missing entry; `cloneObs` calls `copyObs`, which copies no `span`, `predicted` or `tag`, and copies `parts` and `visit` by reference). Intended: the view reads from an explicit view model; guard the lookup.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `identifyBeeRect`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `cloneObs`, `copyObs`, `getObsHandle`
- **Links:** [BEH-417](view_cap-400-overlay-display-annotations.md#beh-417-predicted-annotations-drawn-transparent "Predicted annotations drawn transparent"), [BEH-418](view_cap-400-overlay-display-annotations.md#beh-418-box-and-observation-geometry-stay-in-sync "Box and observation geometry stay in sync"), [OQ-411](../../QUESTIONS.md#oq-411 "Characterizing known crashes")

## DEBT-410: Interactive creation details

(a) `fixRectSizeAfterScaling` for a negative width (or height) sets `width = -width` then `left = left - width`; the Fabric box has center origin (`left`, `top` are the center, as the comment in `onMouseDown_interactiveRect` states), so the center moves by the width: a box dragged to the left or up is displaced instead of kept [read, arithmetic]. (b) Any single mouse move validates the new box (`rect.validated = true`; "need dragging a bit" is only a comment). (c) `onMouseDown_interactiveRect` logs `startX, startY` before they are assigned. (d) `fixRectSizeAfterScaling` also mutates the global default box size as a side effect of every move and scaling. [read] Intended: validate by a minimum drag distance (to decide).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fixRectSizeAfterScaling`, `onMouseDown_interactiveRect`
- **Links:** [BEH-424](view_cap-400-overlay-display-annotations.md#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively"), [BEH-425](view_cap-400-overlay-display-annotations.md#beh-425-default-box-size "Default box size")

## DEBT-411: User-typed JavaScript executed with Function(); odd color coefficient

`refreshTagsParameters` compiles the text of `#tagsSampleFilter` and `#tagsIDFilter` with `Function(...)` on every parameter change, with no error handling: a syntax error throws in the handler, aborting the rebuild (the sample filter is compiled first) and the refresh. The text of `#tagsIntervalFilter` is compiled inside the filter closure at each call instead, so its errors surface in the chronogram. The RGB filter uses the luma coefficient 0.1114 for blue (standard 0.114). [read] Intended: a declarative filter set ([CAP-801](view_capabilities.md#cap-801-filters "Filters")).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `refreshTagsParameters`
- **Links:** [BEH-445](view_cap-400-overlay-display-annotations.md#beh-445-tag-sample-filter-composition "Tag sample filter composition"), [BEH-455](view_cap-400-overlay-display-annotations.md#beh-455-interval-and-id-filters-filter-presets "Interval and ID filters, filter presets"), [CAP-801](view_capabilities.md#cap-801-filters "Filters")

## DEBT-412: hardRefresh does too much

`hardRefresh` redraws, rebuilds all boxes, runs the selection logic, builds the pick-frame panel DOM with jQuery (buttons and closures capturing `obs`), writes `span` into `Tracks` as a side effect of redrawing, and uses the global `overlay` instead of `this`; every edit and every frame change takes this full path ([INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")). The HTML also has a duplicated id `pickflowerdiv` (first reading, page not re-read), and the same `overlayOpts-*` buttons are duplicated in two panels. [read] `OverlayControl.js` (`hardRefresh`: `overlay.canvas1.clear()`, the `span` write, the panel construction). Intended: separate render from interaction-mode UI; pure redraw.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `hardRefresh`, `setInteractionMode`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#pickflowerdiv`
- **Links:** [BEH-402](view_cap-400-overlay-display-annotations.md#beh-402-hard-refresh-rebuilds-all-boxes-for-the-current-frame "Hard refresh rebuilds all boxes for the current frame"), [BEH-440](view_cap-400-overlay-display-annotations.md#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit"), [BEH-450](view_cap-400-overlay-display-annotations.md#beh-450-pick-frame-span-panel "Pick-frame span panel"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [SEAM-404](view_seams.md#seam-404-interaction-modes-and-widgets-group-6-boundary "Interaction modes and widgets (group 6 boundary)")

## DEBT-413: TimelineWidget zoom and size buttons are broken

In `TimelineWidget.prototype.onClick`, the zoom case multiplies `this.zoom`, a property that is never set (the field is `zoomScale`), giving NaN, and `redraw` does not use it anyway; `update()` replaces the content of `#timelineblockdiv` with an empty "TIMELINE: " plus a new empty list, dropping the images and buttons built by `create()`, then resizes the detached images. `timelineMaxDelta` is "Not implemented" and its buttons are commented out. [read] `labelbee/static/labelbee/js/OverlayControl.js` (`TimelineWidget`). Whether the widget is instantiated and shown is group 6 ([CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `TimelineWidget`
- **Links:** [BEH-451](view_cap-400-overlay-display-annotations.md#beh-451-pick-frame-timeline-buttons-and-options "Pick-frame timeline buttons and options"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")

## DEBT-414: Experimental timeline preloads the wrong frames

`drawTimelineCurrentObject` passes the offsets `[-16, -8, ..., 16]` to `videoCache.preloadFrames` as if they were frame numbers (absolute frames -16..16), while the crops are then requested at `obs.frame + offset`; the preload thus warms frames near the start of the video instead of those around the event, and requests negative frames. The "select an annotation" check also runs only after the pause and preload, once per offset (11 times). [read] `OverlayControl.js` (`drawTimelineCurrentObject`, `getFrameCropCurrentObject`). Intended: preload `currentFrame + offset` clamped at 0, check the selection first.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `drawTimelineCurrentObject`, `getFrameCropCurrentObject`
- **Links:** [BEH-441](view_cap-400-overlay-display-annotations.md#beh-441-experimental-timeline-around-the-selected-event "Experimental timeline around the selected event"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")

## DEBT-415: Pick Flower reads flowers from frame 0 and edits Tracks directly

`drawImagePickFlowerMode` builds the candidate flowers with `Object.values(Tracks[0]).filter(ID starts with 'F')`: flowers annotated only in frame 0 are found, and `Tracks[0]` undefined throws. It creates `visit = {}` on the stored event observation even if nothing is picked and writes `visit.flowerid` straight into `Tracks`, bypassing the commit path and the undo stack. `drawFlowersMainCanvas` calls `identifyBeeRect(ctx, rect, radius, isSelected)` with a plain canvas rectangle (no `obs`) and a `radius` that is not defined in that scope, which is likely to fail [inferred, depends on `hasLabel` and the global `radius`]. `drawTimelinePickFrameMode` sets the image size before testing the image. [read] `labelbee/static/labelbee/js/OverlayControl.js` (`drawImagePickFlowerMode`, `drawTimelinePickFrameMode`).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `drawImagePickFlowerMode`, `drawTimelinePickFrameMode`
- **Links:** [BEH-451](view_cap-400-overlay-display-annotations.md#beh-451-pick-frame-timeline-buttons-and-options "Pick-frame timeline buttons and options"), [BEH-452](view_cap-400-overlay-display-annotations.md#beh-452-pick-flower "Pick Flower"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")

## DEBT-501: Tag-view checkbox default contradicts HTML; initial button states target wrong ids

`labelbee_page.html` has `#checkboxZoomShowTagView checked="true"` and `#checkboxShowZoom checked="false"` (the attribute presence means checked), but the constructor forces the states by JS. It also toggles `#buttonZoomShowGrid`, `#buttonZoomShowBB` and `#buttonZoomShowParts`, ids that are not in the served template blocks (the real ones are `#checkboxZoomToggleGrid`, `#checkboxZoomShowBB`, `#buttonShowParts`; a whole-template grep was not served), and `initZoomView` does `$("zoomExtractedTagCanvas")` (missing `#`, empty selection). [read]
Replacement: one source of truth for defaults (state object, UI rendered from it).

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay`, `initZoomView`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#checkboxShowZoom`, `#checkboxZoomShowTagView`
- **Links:** [BEH-501](view_cap-500-zoom-details-editing.md#beh-501-zoom-view-initialisation-and-defaults "Zoom view initialisation and defaults")

## DEBT-502: Selection change refreshes the zoom twice and re-syncs on every drag event

`selectionChanged` calls `syncFromTracks` (which ends with `refreshZoom` when an overlay rect is active) and then `refreshZoom` again; it is also bound to `object:moving`, so dragging a bee box rebuilds all part markers and redraws the zoom (including tag warp and Hamming search) per mouse move, and with Auto-label on restarts the label sequence at each move ([BEH-526](view_cap-500-zoom-details-editing.md#beh-526-auto-label-mode "Auto-label mode"), [OQ-510](../../QUESTIONS.md#oq-510 "Dragging a bee box while Auto-label is on")). `syncFromTracks` places markers with the geometry of the previous refresh (stale), fixed only by the later `redraw`. [read]
Replacement: single refresh per change, debounced; markers positioned after geometry update.

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.selectionChanged`, `ZoomOverlay.syncFromTracks`
- **Links:** [BEH-503](view_cap-500-zoom-details-editing.md#beh-503-zoom-follows-the-selection-and-the-overlay "Zoom follows the selection and the overlay")

## DEBT-503: Dead branch in overlay drawing and unbalanced canvas state

In the no-tag branch of `refreshZoom` the condition `typeof tag !== "undefined"` can only be true for `null`; `getTag` returns `undefined` or `obs.tag`, never `null`, so the yellow centre square is practically unreachable. The tag branch reads `tag.p[0][0]` with no check, so a tag without corners throws ([BEH-544](view_cap-500-zoom-details-editing.md#beh-544-current-tag-without-corners "Current tag without corners")). The Box drawing calls `zoom_ctx.restore()` without a matching `save()`. The tag outline starts a path with `moveTo` without `beginPath()`. `angle` is assigned without declaration (implicit global). [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoom`
- **Links:** [BEH-508](view_cap-500-zoom-details-editing.md#beh-508-overlay-checkbox-tag-outline-or-cross-hair-on-the-zoom "Overlay checkbox: tag outline or cross-hair on the zoom"), [BEH-509](view_cap-500-zoom-details-editing.md#beh-509-box-checkbox-selected-bee-box-on-the-zoom "Box checkbox: selected bee box on the zoom"), [BEH-544](view_cap-500-zoom-details-editing.md#beh-544-current-tag-without-corners "Current tag without corners")

## DEBT-504: exportZoomImage has no guard for no selection and mixes responsibilities

With no selected rect: `frame` becomes `""` (`obs?.frame ?? ""`), `x` and `y` are `NaN` in the file name (`Math.round(...) ?? ""` never yields `""`), `labels` is `undefined`. The output HTML does not escape the labels or JSON. It exports from the canvas `#zoom` only, not the fabric markers. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.exportZoomImage`
- **Links:** [BEH-511](view_cap-500-zoom-details-editing.md#beh-511-export-image-button "Export Image button")

## DEBT-505: Pixel-level tag processing in the UI object, with undeclared globals

`updateTagView` (~220 lines) does video crop, perspective warp (manual bilinear loop, TODO in code to use a GL library), grid drawing, bit extraction and reference drawing inline; `src_pts`, `idata` (in `extractTagBin`, `drawPixelated`) are undeclared globals; `drawPixelated` and `drawTagBin` also read `zoom` (`if (!zoom) zoom = 4`), which is never declared (the only other assignment is the function-local `var zoom` of `ChronoAxes.js:687`): in the page it probably resolves to the `#zoom` canvas through named access to element ids, so the default 4 is dead [inferred, unranked]. The warp runs even when the Tag view is hidden: `updateTagView` is gated by `this.showTagView`, a different property from `flagShowTagView`, set to true in the constructor and never changed. Bilinear sampling reads one pixel beyond the crop at borders. Unused helpers: `findBestHamming`, `rotateTagBin`, `drawTagBin`, `deleteDistractors`, `canvasExtract`, `ZoomOverlay.showTagView` (always true). [read]
Replacement: separate tag-image module (warp, decode, Hamming search) with pure functions; UI renders results.

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.updateTagView`, `drawPixelated`, `drawTagBin`, `findBestHamming`, `rotateTagBin`, `extractTagBin`
- **Links:** [BEH-512](view_cap-500-zoom-details-editing.md#beh-512-tag-view-panel-visibility "Tag view panel visibility")

## DEBT-506: Alternate list is computed from the previous refresh's tag bits

`updateTagView` calls `updateDistractors` first, then recomputes `currentTagBin`; alternates shown correspond to the previously extracted bits (lag of one refresh, e.g. after changing frame or bee). `currentTagBin` is also not cleared when the new current tag has no `p`. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.updateTagView`, `ZoomOverlay.updateDistractors`
- **Links:** [BEH-513](view_cap-500-zoom-details-editing.md#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image"), [BEH-534](view_cap-500-zoom-details-editing.md#beh-534-alternate-tags-panel "Alternate tags panel")

## DEBT-508: Keypoint vocabulary is a hard-coded global map

`labelList` default (head, thorax, abdomen, antL/R, pollenL/R, legL/R) is hard-coded in the `ZoomOverlay` constructor; mutated from four places (buttons, JSON dialog, preset loader, `OverlayControl` reads). Not persisted, not tied to a video or project. Maintainer: hacked version, templates wanted. [read, [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling")]
Replacement: keypoint templates (named sets, with skeleton edges), loaded and stored with the project.

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect._colormapping`
- **Links:** [BEH-517](view_cap-500-zoom-details-editing.md#beh-517-default-keypoint-vocabulary-and-colours "Default keypoint vocabulary and colours"), [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling")

## DEBT-509: Renaming a marker is not synced to the observation

`onPartLabelTextChanged` sets `rect.label` and redraws but does not call `syncToTracks`; `rect.label` also differs from `this.selected` afterwards. The renamed label only reaches `obs.parts` at the next add/move/delete. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onPartLabelTextChanged`
- **Links:** [BEH-519](view_cap-500-zoom-details-editing.md#beh-519-part-label-textbox "Part label textbox")

## DEBT-510: Marker offset of 3 px and mixed origin conventions

Markers are created with `top: y-3, left: x-3` (corner convention) and then `originX/originY = "center"`; all conversions subtract/add 3 consistently, so the marker appears 3 px up-left of the stored point. `strokewidth` (lowercase) is not a Fabric option. Uses deprecated Fabric 1.x API (`setLeft`, `deactivateAllWithDispatch`, `object:selected`, `hasRotatingPoint`). [inferred]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.newPointInFrame`, `ZoomOverlay.updatePointToFabric`, `ZoomOverlay.updatePointFromFabric`
- **Links:** [BEH-521](view_cap-500-zoom-details-editing.md#beh-521-placing-a-part-by-clicking-on-the-zoom "Placing a part by clicking on the zoom")

## DEBT-511: Parts display toggle spread over three modules

`flagShowParts` is owned by `ZoomOverlay` but read by `OverlayControl` (`BeeRect._render`); `onToggleButtonShowOnVideo` calls `videoControl.refresh()`; the chronogram has its own flag. The init code toggles a non-existent `#buttonZoomShowParts`. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onToggleButtonShowOnVideo`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect._drawParts`
- **Links:** [BEH-527](view_cap-500-zoom-details-editing.md#beh-527-show-parts-on-the-main-video-overlay "Show parts on the main video overlay"), [SEAM-501](view_seams.md#seam-501-zoom-view-and-selectionoverlaykey-handling "Zoom view and selection/overlay/key handling")

## DEBT-512: Label list editing leftovers

`+` resets the colour of an existing label to black and accepts an empty label; action `'c'` (colour prompt) has no button; the button title says "Toggle Label" while a second click does nothing; handlers use the global `zoomOverlay` instead of `this`; label strings are injected into HTML/attributes unescaped (`refreshButtonListParts`, preset dialog `onclick` strings); the coloured dot `<span>` of a label button has no `data-label`, so clicking it deselects instead of selecting ([BEH-542](view_cap-500-zoom-details-editing.md#beh-542-clicking-the-colour-dot-of-a-label-button-deselects "Clicking the colour dot of a label button deselects")). [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onButtonClickAddRemovePartLabel`, `ZoomOverlay.refreshButtonListParts`
- **Links:** [BEH-518](view_cap-500-zoom-details-editing.md#beh-518-label-quick-access-buttons "Label quick-access buttons"), [BEH-528](view_cap-500-zoom-details-editing.md#beh-528-add-or-remove-a-label-in-the-quick-access-list "Add or remove a label in the quick-access list"), [BEH-542](view_cap-500-zoom-details-editing.md#beh-542-clicking-the-colour-dot-of-a-label-button-deselects "Clicking the colour dot of a label button deselects")

## DEBT-513: Preset dialog reports success on a malformed file; route only in legacy

`keypointLabelsFromServer` returns `false` from its jQuery success callback when `labelList` is missing, but the caller's `.then` still shows "Labels loaded. Closing." and closes. The directory `static/data/config/keypointlabels/` served by `labelbee/legacy/views.py` was not found in `labelbee/static`; no equivalent route exists in `labelbee/blueprints`. File URIs are put in inline `onclick="..."` strings with single quotes. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `KeypointLabelsFromServerDialog`, `ZoomOverlay.keypointLabelsFromServer`
- **Links:** [BEH-530](view_cap-500-zoom-details-editing.md#beh-530-load-keypoint-label-presets-from-the-server "Load keypoint label presets from the server"), [OQ-503](../../QUESTIONS.md#oq-503 "Keypoint preset files on the server")

## DEBT-514: rotateTag marks the bee as wrongid even for a pure rotation and clears obs.newid

`rotateTag` always adds `wrongid`, and sets `obs.newid = undefined`, discarding a `newid` set earlier by an alternate-tag click (while `obs.fix.newid` is kept, so the two diverge). The commented block shows an older design that modified `tag.p` directly. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.rotateTag`
- **Links:** [BEH-531](view_cap-500-zoom-details-editing.md#beh-531-rotate-tag-buttons "Rotate tag buttons"), [BEH-532](view_cap-500-zoom-details-editing.md#beh-532-tag-fix-data-model "Tag fix data model")

## DEBT-515: Tag fix helpers have undeclared globals and heavy side effects

`spreadTagFix` and `bakeTagFix` loop with `for (k in tags)` (implicit global `k`), `spreadTagFix` logs an undefined `tag`, `rotatep` is an implicit global, `getCoveredTags` writes `obs.span` as a side effect and throws if `Tracks[obs.frame][obs.ID]` is missing, scans all of `Tags` for each call (O(frames) per click), and reaches only `Tags` entries with `id == obs.ID`. The data model hides a shared reference: `augmentTrackWithTag` aliases `Tracks[F][id].tag` to the same object as `Tags[F].tags[i]`, which is why the fix is visible through `obs.tag` ([BEH-533](view_cap-500-zoom-details-editing.md#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track")). [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.spreadTagFix`, `ZoomOverlay.bakeTagFix`, `getCoveredTags`, `rotatep`
- **Links:** [BEH-533](view_cap-500-zoom-details-editing.md#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track"), [SEAM-502](view_seams.md#seam-502-tag-fix-pipeline-and-annotation-data "Tag fix pipeline and annotation data")

## DEBT-516: Hamming-matrix alternate source is dead code; inline onclick ids

`flagShowAlternateHamming` is false and no UI toggles it, so the `hammingMatrix` source (`/data/tags/tag25h5inv/tag25h5_hamming_matrix_5-6.json`, loaded at start for nothing) is never displayed. Candidates are rendered as HTML strings with `onclick="zoomOverlay.onClickAlternateTag(<id>)"` (unquoted id; breaks for non-numeric ids). `for (let H in Object.keys(...))` iterates indices. `getIdsInFocus` assigns an undeclared global `ids` (SelectionControl.js). [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.loadTagHammingMatrix`, `ZoomOverlay.updateDistractors`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `getIdsInFocus`
- **Links:** [BEH-534](view_cap-500-zoom-details-editing.md#beh-534-alternate-tags-panel "Alternate tags panel")

## DEBT-517: bakeTagFix defects

(a) When called without argument, `let obs = activeObject.obs` shadows the parameter, so `obs` stays undefined and `hasLabel(obs, ...)` throws. (b) For a rotation-only fix (`obs.fix.newid` undefined) `tag.id` becomes `undefined`. (c) Tags changed by baking no longer match `obs.ID`, so spreading again finds nothing. (d) `falsealarm` is stored as a magic id in `tag.id`. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.bakeTagFix`
- **Links:** [BEH-535](view_cap-500-zoom-details-editing.md#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)")

## DEBT-518: onClickAlternateTag leftovers

Logs the global `event` (not the id); empty `if (obs.fix) {}`; when the clicked id equals the obs id and a fix exists only `fix.newid` and `fix.tagangle` keys are deleted (the `fix` object stays, and `spreadTagFix` treats it as no fix); loose `==` between a number and the string `obs.ID`; `tagangle` of an earlier rotation is retained when a new id is chosen. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onClickAlternateTag`
- **Links:** [BEH-536](view_cap-500-zoom-details-editing.md#beh-536-choosing-an-alternate-tag-assign-tag-id "Choosing an alternate tag (assign tag ID)")

## DEBT-519: Undo of tag fixes is partial

`undoAllTagFixes` only reverts baked tags (those with `fix.oldid`), does not clear `tag.fix` and does not touch `obs.fix` (nor does removing the `wrongid` label, [BEH-543](view_cap-500-zoom-details-editing.md#beh-543-removing-the-wrongid-label-keeps-the-tag-fix "Removing the wrongid label keeps the tag fix")); `undoTagFix` uses a `falsealarm` branch that duplicates the else branch minus the corners. Per-tag undo exists but no UI calls it. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.undoAllTagFixes`, `ZoomOverlay.undoTagFix`
- **Links:** [BEH-538](view_cap-500-zoom-details-editing.md#beh-538-undo-all-tag-fixes "Undo all tag fixes")

## DEBT-520: deleteFalsealarmTags changes the container type of Tags[F].tags

`deleteFalsealarmTags` replaces each `Tags[F].tags` array by an object (`Object.keys(...).reduce`) keyed by the original indices. `augmentTrackWithTag` loops with `Tags[F].tags.length`, which is `undefined` for an object, so after a clean-up the frames of `Tags` no longer feed the `Tracks[F][id].tag` alias; `getCoveredTags` uses `for ... in` and still works. [read]
Replacement: keep arrays (filter) or iterate both uniformly.

- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.deleteFalsealarmTags`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
- **Links:** [BEH-539](view_cap-500-zoom-details-editing.md#beh-539-clean-up-actions-defined-in-zoomviewjs "Clean-up actions defined in ZoomView.js"), [BEH-533](view_cap-500-zoom-details-editing.md#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track"), [SEAM-502](view_seams.md#seam-502-tag-fix-pipeline-and-annotation-data "Tag fix pipeline and annotation data")

## DEBT-601: Predefined labels hard-coded in several places

The 11 default labels are in `labelButtonsArray` in the JS, 8 static buttons are also written in the page (replaced at startup), and the `wrongid` button is additionally duplicated statically in the BeeID panel. [read] Hard-wired label names also appear in `updateObsActivityFromForm` (four), the `wrongid` branch of `labelToggle`, `onKeyDown_NewIDEdit` (`wrongid`), and `falsealarm`/`wrongid` in `updateFlatTracks`, `updateChronogramData` and `updateChronoData` (hide-invalid filters). The `$(".labeltoggle").change(onLabelToggled)` binding made at init in `initSelectionControl` is dead: it binds only the buttons existing at that moment and buttons do not fire `change`; the inline `onclick` does the work. Intended replacement: one label vocabulary (plugin or per-task config), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic").

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelButtonsArray`, `hardRefreshLabelTogglePanel`, `labelToggle`, `initSelectionControl`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateFlatTracks`, `updateChronogramData`, `updateChronoData`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_NewIDEdit`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labeltoggle-panel`, `#beeidpanel`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-601](view_cap-600-labels-visits-stats.md#beh-601-label-button-panel-is-generated-from-a-label-list "Label button panel is generated from a label list"), [BEH-602](view_cap-600-labels-visits-stats.md#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation "Clicking a label button toggles that label on the selected observation")

## DEBT-602: Label normalization hijacks single letters and does not deduplicate

`labelMap` rewrites `f`, `p`, `e`, `d`, `l`, `departing` (legacy shortcuts/aliases) on every read of a label string, so those cannot be custom labels; `pollen` is a duplicated key; `toLabelString` does not deduplicate, and `updateObsLabel` removes only the first occurrence. [read] Intended: normalize once at load ([CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising")), then plain string-set semantics.

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelMap`, `toLabelString`, `updateObsLabel`
- **Links:** [BEH-604](view_cap-600-labels-visits-stats.md#beh-604-label-string-normalization-and-matching "Label string normalization and matching"), [OQ-601](../../QUESTIONS.md#oq-601 "Which labels are predefined, and are the single-letter aliases intended?")

## DEBT-603: `bool_acts` shim and its dead helpers

`bool_acts` is derived from `labels` in two places (`updateObsActivityFromForm`, which also runs at rectangle creation for `new` observations, and `setLabels`) and `copyObs` copies the four flags (or sets `[false x4]`); `updateLabelsFromBool` calls an undefined function `updateLabel` and has no caller; `addLabel`, `removeLabel`, `updateLabelArray` have no callers. [read] Intended: remove `bool_acts` ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")), serve the remaining readers (chronogram colours, CSV export) from `labels`.

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateLabelsFromBool`, `addLabel`, `removeLabel`, `updateLabelArray`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateObsActivityFromForm`, `setLabels`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-610](view_cap-600-labels-visits-stats.md#beh-610-bool_acts-is-re-derived-from-labels-on-every-form-to-observation-update "`bool_acts` is re-derived from labels on every form-to-observation update")

## DEBT-604: `submit_bee` return values and ignored argument

`submit_bee` returns false on errors, true after "Internal issue" without storing (log says "Writing anyway"), undefined on success; callers pass an argument that is ignored (`submit_bee(activeObject)`, as in `onKeyDown_NewIDEdit`). `automatic_sub` has no null check. [read]

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`, `automatic_sub`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
- **Links:** [BEH-611](view_cap-600-labels-visits-stats.md#beh-611-automatic_sub-commits-only-already-stored-rectangles "`automatic_sub` commits only already-stored rectangles"), [BEH-612](view_cap-600-labels-visits-stats.md#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation")

## DEBT-605: Visits as events with ad-hoc subfields, two incompatible forms

Visits are observations with ID `V-<P>-<F>`, `visit = {pollinator, flower}` and `span`, relying on ID prefixes `P`/`F`; a legacy form `visit.flowerid` (Pick Flower, flowers read only from `Tracks[0]`) coexists. No schema, no separation of visits from boxes (they get a fake box of default size). [read] Intended: proper visit structure ([CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits") text says so). Defects of the legacy picker: [DEBT-618](#debt-618-legacy-pick-flower-has-side-effects-and-failure-paths "Legacy Pick Flower has side effects and failure paths").

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget`, `OverlayControl.prototype.drawImagePickFlowerMode`
- **Links:** [BEH-613](view_cap-600-labels-visits-stats.md#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field "A pollination visit is an observation with a `visit` field"), [BEH-625](view_cap-600-labels-visits-stats.md#beh-625-legacy-pick-flower-in-pick-frame-mode "Legacy 'Pick Flower' in pick-frame mode"), [DEBT-618](#debt-618-legacy-pick-flower-has-side-effects-and-failure-paths "Legacy Pick Flower has side effects and failure paths"), [OQ-603](../../QUESTIONS.md#oq-603 "Are pollination visits (V-P-F, ID prefixes P/F) and the legacy Pick Flower in use?")

## DEBT-606: VisitWidget code defects

`setFlower` is defined twice (identical); `selectVisit` and `newVisit` assign an undeclared global `default_id` (no effect: `computeDefaultNewID` has a local one); `update()` dereferences `this.visit.visit.pollinator` without a guard (it throws when the adopted visit has no `visit` field, for example an observation named like `V-P1-F2` by hand); `update()` has the side effect of looking up and assigning `this.visit`; rejected picks give no user message; `pickMode` background click is a silent no-op; `VisitWidget.prototype.open` is dead code with no caller and would throw if called (it reads `this.interaction` and `this.getActiveObject`, which VisitWidget does not define). [read]

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.setFlower`, `VisitWidget.prototype.selectVisit`, `VisitWidget.prototype.update`, `VisitWidget.prototype.open`
- **Links:** [BEH-614](view_cap-600-labels-visits-stats.md#beh-614-visit-panel-layout-content-and-lifetime "Visit panel layout, content and lifetime"), [BEH-615](view_cap-600-labels-visits-stats.md#beh-615-picking-pollinator-or-flower-on-the-overlay "Picking pollinator or flower on the overlay"), [BEH-620](view_cap-600-labels-visits-stats.md#beh-620-selecting-a-visit-rectangle-loads-it-into-the-visit-panel "Selecting a visit rectangle loads it into the visit panel")

## DEBT-607: `copyObs` omits `span`, so new visits and undeleted events lose it

`copyObs` copies a fixed field list without `span`; `newVisit` builds `span` that `storeObs` then drops (the `Observation` constructor defines no `span`); `cloneObs` (rectangles, undo entries) drops `span`, so Undo loses the span. [read] Intended: copy all persistent fields (or clone by structure) once the data model is defined.

- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`, `cloneObs`, `storeObs`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.newVisit`
- **Links:** [BEH-616](view_cap-600-labels-visits-stats.md#beh-616-create-visit "Create visit"), [BEH-637](view_cap-600-labels-visits-stats.md#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry"), [BEH-639](view_cap-600-labels-visits-stats.md#beh-639-undo-button-restores-the-last-deleted-observation "Undo button restores the last deleted observation")

## DEBT-608: TimelineWidget is unfinished and broken

No caller of `setCenterFrame`/`setCrop`; `onClick('timelineZoom')` uses nonexistent `this.zoom` (NaN); `update()` destroys the buttons; `create`/`update` leak the loop variable `delta`. A second, working timeline lives in the pick-frame code. [read]

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `TimelineWidget`, `TimelineWidget.prototype.update`, `TimelineWidget.prototype.onClick`
- **Links:** [BEH-621](view_cap-600-labels-visits-stats.md#beh-621-timeline-widget-unfinished "Timeline widget (unfinished)"), [OQ-605](../../QUESTIONS.md#oq-605 "Is the TimelineWidget block meant to be finished or removed?")

## DEBT-609: Pick-frame panel built inside `OverlayControl.hardRefresh`

The pick-frame UI (`#pickframediv`) is created in the middle of `hardRefresh` with closures, side effects on `Tracks` (it adds a `span` while refreshing), and a copy of the swap-ID helper `doSwap2` that is unused there. Mode state is in `overlay.interaction` while mode-switch logic lives in `SelectionControl.modifyCurrentObsSpan`. The panel is cleared only by CLOSE (leaving the mode otherwise keeps stale buttons whose closures target the old observation and whose callbacks read `overlay.interaction.opts`), and the rebuild restores the `active` class of Show Timeline but not of Pick Flower. [read]

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.hardRefresh`, `OverlayControl.prototype.setInteractionMode`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `modifyCurrentObsSpan`
- **Links:** [BEH-622](view_cap-600-labels-visits-stats.md#beh-622-pick-frame-mode-set-span-on-the-selected-observation "Pick-frame mode (Set Span) on the selected observation"), [BEH-645](view_cap-600-labels-visits-stats.md#beh-645-pick-frame-panel-set-startend-goto-close "Pick-frame panel: Set Start/End, Goto, CLOSE")

## DEBT-610: Events-info and statistics defects

`updateForm(null)` writes "Center X: -" into `#CY`; `updateForm` leaks globals `w`, `h`; `updateAnnotationStatistics` leaks `i`, `T`, `j` and logs to the console as well; statistics are computed with ad-hoc one-liners (no reuse of `flatTracks`) and are not refreshed automatically. [read]

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateForm`, `updateAnnotationStatistics`
- **Links:** [BEH-626](view_cap-600-labels-visits-stats.md#beh-626-events-info-panel-box-geometry-of-the-selected-observation "Events info panel: box geometry of the selected observation"), [BEH-627](view_cap-600-labels-visits-stats.md#beh-627-update-statistics-button "Update Statistics button")

## DEBT-611: Observation table rebuilt on every refresh, gated by an accordion CSS class

`renderObsTable` rebuilds the full DOM table from `flatTracks` at each `refreshChronogram` and decides whether to render by testing jQuery UI class `ui-accordion-header-collapsed` on `#labelingTab`; the flat-track filtering is duplicated with the chronogram (TODO in the code) and diverges (`flag_hideFlowers` applies to the chronogram only); `updateFlatTracks` assigns an undeclared global `obs`; `updateObsTable` has no caller. [read]

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderObsTable`, `updateObsTable`, `updateFlatTracks`
- **Links:** [BEH-628](view_cap-600-labels-visits-stats.md#beh-628-observation-table-labeling-tab "Observation table ('Labeling' tab)")

## DEBT-612: Selection state split across globals and the Fabric canvas

Current ID in `defaultSelectedBee` (read directly by ChronoControl, ChronoControlInteraction, OverlayControl, labelBee.js and written by several of them), active rectangle in Fabric; `tagSelection` is set and never read; `selectionControl` is an event bus object assigned without declaration; `getSelectedID` returns undefined when nothing is selected while the canvas getter `getActiveObject` returns null. [read] Intended: one selection model with explicit events (see [SEAM-601](view_seams.md#seam-601-selection-events-and-current-id-access "Selection events and current-ID access")).

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `defaultSelectedBee`, `tagSelection`, `selectionControl`, `selectBeeByID`, `getSelectedID`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
- **Links:** [BEH-630](view_cap-600-labels-visits-stats.md#beh-630-two-notions-of-selection-current-id-and-active-rectangle "Two notions of selection: current ID and active rectangle"), [SEAM-601](view_seams.md#seam-601-selection-events-and-current-id-access "Selection events and current-ID access")

## DEBT-613: Undelete loses `span`; may overwrite a new observation

`undoAction` stores the cloned observation (without `span`, [DEBT-607](#debt-607-copyobs-omits-span-so-new-visits-and-undeleted-events-lose-it "`copyObs` omits `span`, so new visits and undeleted events lose it")) and silently overwrites any observation that now has the same frame and ID; it does not select the restored observation when it is in another frame, and it assigns an undeclared global `rect`. [read]

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `undoAction`, `deleteEvent`
- **Links:** [BEH-637](view_cap-600-labels-visits-stats.md#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry"), [BEH-639](view_cap-600-labels-visits-stats.md#beh-639-undo-button-restores-the-last-deleted-observation "Undo button restores the last deleted observation"), [DEBT-607](#debt-607-copyobs-omits-span-so-new-visits-and-undeleted-events-lose-it "`copyObs` omits `span`, so new visits and undeleted events lose it")

## DEBT-614: Undo covers only deletion; dead branches

`undoPush` handles `new` and `move` with no callers; `undoPop` rejects them with "not implemented" after popping; global stack not reset when another video or annotation file is loaded. [read] Intended: general command-based undo ([OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics") asks for undo).

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `undoPush`, `undoPop`, `undoStack`
- **Links:** [BEH-638](view_cap-600-labels-visits-stats.md#beh-638-what-is-undoable "What is undoable"), [OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics")

## DEBT-615: Undo button label uses `.val()` on a `<button>`

`updateUndoButton` sets `.val("Undo")` / `.val("Undo?")` where `.html()` is needed (a `<button>` shows its content), so the caption "Undelete ..." persists after the stack empties. [read]

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateUndoButton`
- **Links:** [BEH-640](view_cap-600-labels-visits-stats.md#beh-640-undo-button-caption "Undo button caption")

## DEBT-616: Dead `p` shortcut

`onKeyDown` toggles a nonexistent `#P` checkbox (leftover of the old pollen checkbox) and swallows the key. Per [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place") `p` is kept for now; it currently does nothing. [read]

- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
- **Links:** [BEH-643](view_cap-600-labels-visits-stats.md#beh-643-the-p-key-does-nothing "The `p` key does nothing"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place")

## DEBT-617: Other dead or leaky code in SelectionControl.js

`swapID_findAll` (assigns a leaked global `frames`, no caller); `deleteSelected` reads `getActiveGroup` and does not use it; `deleteEvent` assigns an undeclared global `obs`; `hardRefreshLabelTogglePanel` leaks the loop variable `i`; `getIdsInFocus` leaks `ids` and computes unused `frange`; `LabelListDialog` assigns undeclared `json`, `obj`; `drawTimelineCurrentObject` (OverlayControl.js) leaks `i`; many commented-out blocks. [read]

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `swapID_findAll`, `deleteSelected`, `deleteEvent`, `hardRefreshLabelTogglePanel`, `getIdsInFocus`, `LabelListDialog`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.drawTimelineCurrentObject`
- **Links:** [BEH-634](view_cap-600-labels-visits-stats.md#beh-634-ids-seen-in-the-focus-window "IDs seen in the focus window"), [BEH-636](view_cap-600-labels-visits-stats.md#beh-636-deleting-the-selected-observation "Deleting the selected observation"), [BEH-609](view_cap-600-labels-visits-stats.md#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')")

## DEBT-618: Legacy Pick Flower has side effects and failure paths

`drawImagePickFlowerMode` creates `visit = {}` on the stored observation each time the panel opens (it then counts as a visit when selected, and the visit panel's Delete acts on it); it reads `Object.values(Tracks[0])`, which throws a TypeError when frame 0 has no annotation, after the panel title, "No visit" button and plain crop were appended; `drawFlowersMainCanvas` passes an out-of-scope `radius` to `identifyBeeRect` (ReferenceError at each click when at least one flower exists, unless a global `radius` exists; an undeclared assignment `radius = 3` elsewhere in OverlayControl.js is the only way one could be created); the toggle state `showPickFlower` is kept in mode-scoped `interaction.opts` and lost when the mode changes. [read; the consequence chain of the first item is inferred] Intended: drop the legacy form for the V-P-F visit ([OQ-603](../../QUESTIONS.md#oq-603 "Are pollination visits (V-P-F, ID prefixes P/F) and the legacy Pick Flower in use?")).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.drawImagePickFlowerMode`, `OverlayControl.prototype.pickFlowerButtonCallback`, `onObjectSelected`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
- **Links:** [BEH-625](view_cap-600-labels-visits-stats.md#beh-625-legacy-pick-flower-in-pick-frame-mode "Legacy 'Pick Flower' in pick-frame mode"), [BEH-644](view_cap-600-labels-visits-stats.md#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit"), [DEBT-605](#debt-605-visits-as-events-with-ad-hoc-subfields-two-incompatible-forms "Visits as events with ad-hoc subfields, two incompatible forms"), [OQ-603](../../QUESTIONS.md#oq-603 "Are pollination visits (V-P-F, ID prefixes P/F) and the legacy Pick Flower in use?"), [OQ-612](../../QUESTIONS.md#oq-612 "Is creating `visit = {}` when the Pick Flower panel opens intended?")

## DEBT-619: Unvalidated or silently dropped input in label and ID editors

SwapID takes the new ID from `#swapNewIDInput` as is (empty creates ID `""`; equal to the old ID is a no-op with a misleading frame count); the label list dialog's "Ok" reads the grid only, so unvalidated JSON typed in the JSON tab is dropped; two incompatible JSON keys exist for the label list (`labelListArray` in the Edit dialog, `labelButtonsArray` in the "Preset..." loader), whose loader aborts without a user message. [read]

- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `swapID_callback`, `LabelListDialog`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `obs_swapID`, `changeObservationID`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `LabelListFromServerDialog`
- **Links:** [BEH-609](view_cap-600-labels-visits-stats.md#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')"), [BEH-647](view_cap-600-labels-visits-stats.md#beh-647-preset-loads-a-label-list-from-the-server "'Preset...' loads a label list from the server"), [BEH-648](view_cap-600-labels-visits-stats.md#beh-648-swapid-semantics-and-absence-of-validation "SwapID semantics and absence of validation"), [OQ-610](../../QUESTIONS.md#oq-610 "Which JSON format is the label-list interchange: `labelListArray` (Edit dialog) or `labelButtonsArray` (Preset loader)?"), [OQ-611](../../QUESTIONS.md#oq-611 "Should SwapID refuse an empty or unchanged new ID?")

## DEBT-620: Dead branches and shadowed keys in `onKeyDown`

The branch testing `e.target == #I` and the following `e.target.type == "text"` return cannot be reached, because the first test already handles every input of type text (`#I` is one); inside Enter and Escape handling, the "already focused, so blur" sub-branches are unreachable for the same reason. `labelsProcessKey` is called last, so label accesskeys bound to keys handled earlier (`Delete`, `Backspace`, `d`, `p`, Ctrl+`r`, arrows, `,`, `.`, space, `Escape`, `Enter`) never fire. [read]

- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelsProcessKey`
- **Links:** [BEH-608](view_cap-600-labels-visits-stats.md#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries"), [BEH-641](view_cap-600-labels-visits-stats.md#beh-641-keyboard-handling-around-text-fields "Keyboard handling around text fields"), [DEBT-616](#debt-616-dead-p-shortcut "Dead `p` shortcut"), [OQ-614](../../QUESTIONS.md#oq-614 "Should the label list reject accesskeys that built-in shortcuts already use?")

## DEBT-701: Observation carries bool_acts next to labels

`Observation` and `copyObs` keep `bool_acts` (4 flags) redundant with `labels`; it is recomputed from labels at v2 load and dropped at v2 save, but v1 files and the CSV/BBox exports rely on it. [read] `labelbee/static/labelbee/js/Model.js` Observation, copyObs; `labelbee/static/labelbee/js/AnnotationIO.js` sanitizeEvents, convertTracksToV2; exports [inferred, not re-read]. Proposed: `labels` canonical, exports derive the flags ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic") shim); see [OQ-715](../../QUESTIONS.md#oq-715 "What does 'all Observation fields are preserved' cover") for the [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for") conflict.

- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Observation`, `copyObs`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tracksToCSV`, `sanitizeEvents`
- **Links:** [BEH-701](view_cap-700-annotation-model-io.md#beh-701-observation-record-and-its-defaults "Observation record and its defaults"), [BEH-717](view_cap-700-annotation-model-io.md#beh-717-events-json-v2-format-load-side-via-sanitizeevents "Events JSON v2 format (load side) via sanitizeEvents"), [BEH-738](view_cap-700-annotation-model-io.md#beh-738-export-events-csv "Export Events (CSV)"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-715](../../QUESTIONS.md#oq-715 "What does 'all Observation fields are preserved' cover")

## DEBT-702: copyObs copies a hand-maintained field list

[read] `labelbee/static/labelbee/js/Model.js` copyObs lists fields; `span`, `tag` and unknown fields are dropped by storeObs/cloneObs (so undo snapshots from `deleteEvent` lose `span`; the visit-creation `tmpObs` in `labelbee/static/labelbee/js/OverlayControl.js` carries a `span` that `storeObs` drops); `visit` is never cleared; `parts` is shared by reference. Proposed: copy all own fields minus runtime ones, with explicit deep copy of nested objects; whether `span` must survive is [OQ-701](../../QUESTIONS.md#oq-701 "Which observation fields must survive an edit").

- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`, `cloneObs`, `storeObs`
- **Links:** [BEH-704](view_cap-700-annotation-model-io.md#beh-704-storeobs-copies-a-fixed-field-list-into-the-stored-observation "storeObs copies a fixed field list into the stored observation"), [OQ-701](../../QUESTIONS.md#oq-701 "Which observation fields must survive an edit")

## DEBT-703: cacheTags tests the wrong variable

[read] `labelbee/static/labelbee/js/Model.js` cacheTags: `typeof ttags[key]` (ttags is the id-to-frame index) instead of `tagCache[key]`, so each (frame,id) holds only the last tag; `tagCache` is assigned without a declaration in `cacheTags`; `getTags` throws if `cacheTags` never ran. Proposed: test `tagCache[key]`, keep all tags.

- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `cacheTags`, `getTags`
- **Links:** [BEH-707](view_cap-700-annotation-model-io.md#beh-707-tags-container-and-the-frameid-tag-cache "Tags container and the (frame,id) tag cache")

## DEBT-704: Runtime fields (tag, span) are written into saved files

[read] `labelbee/static/labelbee/js/ChronoControl.js` augmentTrackWithTag assigns `obs.tag` (the tag object) on stored observations; `labelbee/static/labelbee/js/AnnotationIO.js` convertTracksToV2 copies every own field, so `tag` (the full tag record) and `span` are saved, contradicting [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"). Proposed: explicit save whitelist, or runtime fields kept outside `Tracks`; decision in [OQ-702](../../QUESTIONS.md#oq-702 "Should `tag` and `span` be in saved files").

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `convertTracksToV2`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
- **Links:** [BEH-708](view_cap-700-annotation-model-io.md#beh-708-runtime-only-fields-of-an-observation-and-what-leaks-into-saves "Runtime-only fields of an observation, and what leaks into saves"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [OQ-702](../../QUESTIONS.md#oq-702 "Should `tag` and `span` be in saved files")

## DEBT-705: No dirty flag; beforeunload always prompts

[read] `labelbee/static/labelbee/js/labelBee.js:218` `window.onbeforeunload` always returns its message (also at `setTracks([], true)` init, `labelBee.js:228`); there is no dirty tracking and no autosave. Whether the silent replacement by loads and erase is intended is [OQ-710](../../QUESTIONS.md#oq-710 "Silent replacement of unsaved work on load and erase"). Proposed: dirty tracking shared by IO and prompts.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `initAnnotationIO`, `setTracks`, `loadEventsFromFile`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `window.onbeforeunload handler and setTracks([], true) in init`
- **Links:** [BEH-709](view_cap-700-annotation-model-io.md#beh-709-initial-state-of-the-model-at-page-load "Initial state of the model at page load"), [BEH-714](view_cap-700-annotation-model-io.md#beh-714-load-events-from-a-local-file "Load Events from a local file"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-710](../../QUESTIONS.md#oq-710 "Silent replacement of unsaved work on load and erase")

## DEBT-706: v2 save mutates TracksInfo and crashes when history is a string

[read] FIXED in slice 2 step 4 (`annotation/AnnotationCodec.js` `convertTracksToV2`: `info` and `videoinfo` are deep copies, `history` is always an array, the whole `videoinfo` stays embedded per [OQ-712](../../QUESTIONS.md#oq-712 "Should the whole videoinfo be embedded in every saved events file")). Was: `info: TracksInfo` by reference, formatnote set, history pushed, a `videoinfo` reference stored; CSV/DB imports set `history` to a string, so `.push` threw and the save aborted (file and server, before the request). Still open: `history` stays a string in memory after an import (converted at save only).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `convertTracksToV2`, `tracks_csv_to_json`, `tracks_tagged_csv_to_json`
- **Links:** [BEH-711](view_cap-700-annotation-model-io.md#beh-711-saving-v2-works-on-copies-of-tracksinfo-and-videoinfo-fixed-was-mutated-tracksinfo-failed-after-a-csv-import "Saving v2 works on copies of TracksInfo and videoinfo (fixed; was: mutated TracksInfo, failed after a CSV import)"), [BEH-735](view_cap-700-annotation-model-io.md#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-712](../../QUESTIONS.md#oq-712 "Should the whole videoinfo be embedded in every saved events file")

## DEBT-707: C1, convertTracksToV1 mutates live Tracks

[read] FIXED in slice 2 step 4 (`Object.assign({}, evt)`). Was: `Object.assign(evt)` with one argument aliased the observation; it deleted marked/permanent and rewrote cx, cy, x, y, width, height in place. Latent (v1 not exposed in the page).

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `convertTracksToV1`
- **Links:** [BEH-712](view_cap-700-annotation-model-io.md#beh-712-events-json-v1-format-the-save-mutates-tracks-defect-c1-is-fixed "Events JSON v1 format (the save-mutates-Tracks defect C1 is fixed)"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")

## DEBT-708: saveEventsToFile with an unknown format downloads "null"

[read] after logging "Aborted" it does not return, and calls `saveObjToJsonFile(null, ...)`. Proposed: return.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `saveEventsToFile`
- **Links:** [BEH-713](view_cap-700-annotation-model-io.md#beh-713-save-events-to-a-local-file "Save Events to a local file")

## DEBT-709: Silent failures when loading local files

[read] FIXED in slice 3 step 5 (Q23, `AnnotationIO.js` `showLoadError` / `reportLoadError`): invalid JSON, a rejected format (the result of `setTracks` / `setTags` is now checked and turned into an `Error`) and a failing `FileReader` are told to the user, HTML-escaped, in the from-server dialog when it is visible, else in the main alert; they are also logged with `console.error` and the rejection reaches the caller. Was: invalid JSON threw uncaught in `onReaderLoad`; `sanitizeEvents` failures only reached the console (`setTracks` returned false); the `setTags` return value was ignored; the user saw nothing.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `onReaderLoad`, `onTagsReaderLoad`, `eventsFromText`, `tagsFromText`, `readFileAsText`, `showLoadError`, `reportLoadError`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [BEH-714](view_cap-700-annotation-model-io.md#beh-714-load-events-from-a-local-file "Load Events from a local file"), [BEH-719](view_cap-700-annotation-model-io.md#beh-719-load-time-duplicate-handling-and-error-containment "Load-time duplicate handling and error containment"), [BEH-722](view_cap-700-annotation-model-io.md#beh-722-load-tags-from-a-local-file "Load Tags from a local file")

## DEBT-710: Dead "array" branch, unreachable non-object branch, misleading v1 source string

[read] FIXED in slice 1 step 4 (`Array.isArray`, `labelbee/static/labelbee/js/annotation/AnnotationCodec.js` sanitizeEvents): arrays used to go to the object branch because `typeof obj == "array"` is never true, so `info.source` was always "Converted from Tracks v1 object". The rest FIXED in slice 3 step 5 (`annotation/AnnotationCodec.js`: `sanitizeEvents` and `decodeTags` test `obj === null || typeof obj != "object"` before the `in` test, so `null`, `undefined` and primitives reach the "unsupported file format" message instead of a caught `TypeError`; the branches that had become unreachable were removed). Was: `"info" in obj` threw for them first (same in `setTags`).

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `decodeTags`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [BEH-718](view_cap-700-annotation-model-io.md#beh-718-events-json-v1-format-load-side-via-sanitizeevents "Events JSON v1 format (load side) via sanitizeEvents"), [BEH-721](view_cap-700-annotation-model-io.md#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats")

## DEBT-711: v1 validation and normalization are weak

[read] the key check is `!every(regex) & !every(Number.isInteger)` (bitwise & of booleans; the second operand is always true for string keys, so only the regex decides); v1 events keep the file's `ID` / `bool_acts` and the parsed object is used directly as `Tracks`. Proposed: same normalization as v2 for both versions; decision in [OQ-703](../../QUESTIONS.md#oq-703 "Are v1 events files and ID-less events still produced anywhere").

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [BEH-718](view_cap-700-annotation-model-io.md#beh-718-events-json-v1-format-load-side-via-sanitizeevents "Events JSON v1 format (load side) via sanitizeEvents"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [OQ-703](../../QUESTIONS.md#oq-703 "Are v1 events files and ID-less events still produced anywhere")

## DEBT-712: Implicit globals and double refresh in the IO code

[read] undeclared assignments in `labelbee/static/labelbee/js/AnnotationIO.js`: `data0`, `hasDuplicateEntries` (sanitizeEvents), `evts`, `src` (tracks_csv_to_json), `dataToSend`, `alertMSG` (eventsToServer), `fileData` (openRecentLoadingDialog), `html`, `idx`, `buttonHTML` (showAdvancedLoadingDialog), `success` (loadEvents, loadEventsFromServerByID), `tags` (tagsFromServer), `obj` (saveTagsToFile), `user_data` (whoami), and `ttags` implicit (`TracksInfo`, `TagsInfo` and `tagsHaveDM` are, since slice 3, accessors of `annotation/AnnotationStoreBridge.js` over `AnnotationStore`); [inferred, not re-read] `result`, `data` (db_to_json), `tagCache` (`Model.js`). setTracks already refreshes, then callers refresh again (loadEvents, loadEventsFromServerByID, loadTracksCSVFromDB). Proposed: declared module state, one refresh.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTracks`, `eventsToServer`, `showAdvancedLoadingDialog`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`, `db_to_json`
- **Links:** [BEH-720](view_cap-700-annotation-model-io.md#beh-720-settracks-replace-the-model-and-refresh "setTracks: replace the model and refresh")

## DEBT-713: setTags v1 validation inspects the previous Tags global

[read] FIXED in slice 3 step 5 (`annotation/AnnotationCodec.js` `decodeTags` validates `Object.keys(obj)`). Was: `Object.keys(Tags)`, the previously loaded global: the check never validated the loaded file, so a file with a bad key was accepted when the old Tags were empty, and a good file was rejected when the old Tags had a bad key.

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `decodeTags`
- **Links:** [BEH-721](view_cap-700-annotation-model-io.md#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats")

## DEBT-714: saveTagsToFile v2 writes an undeclared global obj

[read] `obj = {...}` without declaration.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `saveTagsToFile`
- **Links:** [BEH-723](view_cap-700-annotation-model-io.md#beh-723-save-tags-to-a-local-file "Save Tags to a local file")

## DEBT-715: setTags DM detection and discarded file info

[read] `tagsHaveDM` is decided by the first tag of the first key only, and a first key without `.tags` throws; `TagsInfo` is always replaced by the dummy info (the v2 info is dropped). Slice 3: the DM rule moved unchanged to `AnnotationStore.updateTagsHaveDM()` and the dummy info to `decodeTags`; since [DEBT-733](#debt-733-settags-replaces-tags-before-unguarded-steps "setTags replaces Tags before unguarded steps") a throwing first key no longer leaves the Tags half-replaced (`setTags` rolls back and returns `0`).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTags`
- **Links:** [BEH-724](view_cap-700-annotation-model-io.md#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh"), [BEH-721](view_cap-700-annotation-model-io.md#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats")

## DEBT-716: Recent-file dialog assumptions

[read] only `data[0]` is used, relying on the server sort order; [inferred] two page elements share `id="tagsFromServer"`.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `openRecentLoadingDialog`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#tagsFromServer`
- **Links:** [BEH-725](view_cap-700-annotation-model-io.md#beh-725-server-annotation-list-dialog-recent-mode "Server annotation list dialog 'recent' mode"), [OQ-705](../../QUESTIONS.md#oq-705 "Order of the file list in the 'recent' dialog")

## DEBT-717: Advanced-file dialog bugs

[read] the error handler calls `setMessage(html)` while `setMessage(color, html)` takes the colour first (html lands in the colour slot and the content is `undefined`, so no error text is shown); the DataTable render counter `idx` assumes one render per cell; the type dropdown resets allusers to false; `allusers` is a boolean serialized by jQuery as the string "false"/"true" (server effect to check in group 1); no "No video loaded" guard unlike the recent mode.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `showAdvancedLoadingDialog`
- **Links:** [BEH-726](view_cap-700-annotation-model-io.md#beh-726-server-annotation-list-dialog-advanced-mode "Server annotation list dialog 'advanced' mode"), [OQ-705](../../QUESTIONS.md#oq-705 "Order of the file list in the 'recent' dialog")

## DEBT-718: Invisible error messages in FromServerDialog.loadEvents

[read] `labelbee/static/labelbee/js/AnnotationIO.js` loadEvents writes to `.modal-message h4`, but all messages go through `setMessage`, which sets the content of `.modal-message` itself, and `resetAllHTML` clears it on open, so no `h4` exists and the selector matches nothing; loadEvents reads `this.dataType` while the dialog assigns `this.data_type` (`openRecentLoadingDialog`); no assignment of `dataType` was seen in the excerpts. Slice 3: `loadEventsFromServerByID` no longer uses this selector ([DEBT-722](#debt-722-loadeventsfromserverbyid-uses-undefined-variables-and-does-not-await "loadEventsFromServerByID uses undefined variables and does not await")); `loadEvents` still does.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEvents`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#from-server-dialog`
- **Links:** [BEH-727](view_cap-700-annotation-model-io.md#beh-727-loading-an-event-tracks-file-from-the-server "Loading an event (Tracks) file from the server")

## DEBT-719: Server tag loading: unrouted URL, undefined return, empties Tags on failure

[read] tagsFromServer requests `rest/v2/annotation/<id>`, returns undefined so `loadEvents` always reports an error, and its failure path calls `setTags([], div)`, which wipes the loaded Tags; [read, grep of `rest/v2`] no route `rest/v2/annotation` exists in `labelbee/legacy/views.py` or `labelbee/blueprints/api/` (the listed `rest/v2` routes are video, dataset and video-data ones). Proposed: use `api/v1/annotation/<id>`, parse like events, do not wipe on failure; decision in [OQ-706](../../QUESTIONS.md#oq-706 "Is server loading of tags supposed to work"). Slice 3: `tagsFromServer` is a promise pipeline (`getJSONPromise`, `.then(onSuccess, onFailure)`) but still returns `undefined` on purpose, because the dialog reads the return value as success, and its failure path still empties the Tags (`setTags([], div)`).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tagsFromServer`, `loadEvents`
- **Links:** [BEH-728](view_cap-700-annotation-model-io.md#beh-728-loading-a-tag-file-from-the-server "Loading a tag file from the server"), [OQ-706](../../QUESTIONS.md#oq-706 "Is server loading of tags supposed to work")

## DEBT-720: eventsToServer: ignored argument, undefined fields, CSS-only gating

[read] `format` is used only in the message; undefined `basedOn` / `user_id` are serialized by jQuery as empty strings; [inferred] `.require-server` only toggles a CSS class (`whoami` toggles `disabled`).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`, `whoami`
- **Links:** [BEH-729](view_cap-700-annotation-model-io.md#beh-729-save-events-to-the-server-snapshot "Save Events to the server (snapshot)"), [BEH-733](view_cap-700-annotation-model-io.md#beh-733-login-state-gates-the-server-buttons "Login state gates the server buttons")

## DEBT-721: Stale lineage basedOn

[read] `fromServerDialog.basedOn` is set by `loadEvents` (and, since slice 3 step 5, by `loadEventsFromServerByID`), not reset by `setTracks`, and not updated by `eventsToServer`; [inferred] it also survives erase, local loads and video change.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEvents`, `eventsToServer`
- **Links:** [BEH-730](view_cap-700-annotation-model-io.md#beh-730-lineage-created_from_id-comes-from-the-last-server-load "Lineage: created_from_id comes from the last server load"), [OQ-707](../../QUESTIONS.md#oq-707 "Lineage semantics of created_from_id")

## DEBT-722: loadEventsFromServerByID uses undefined variables and does not await

[read] FIXED in slice 3 step 5 (`AnnotationIO.js`). It was copied from `FromServerDialog.loadEvents` and referenced `tag_event_ID`, `theDialog`, `div`, which do not exist in its scope, so every path ended in a `ReferenceError` (after `setTracks` on success, so `basedOn` was never set and no message shown); it also returned before the request completed. Now: the id is `video_data_id`, the lineage is `fromServerDialog.basedOn`, the failures throw an `Error` reported by `showLoadError` (Q23), the function returns its request promise (resolves after the events are loaded, rejects on a request error or invalid data) and `onhashchange` in `labelBee.js` catches the rejection so the delayed seek still runs. Open: `success` is still an implicit global ([DEBT-712](#debt-712-implicit-globals-and-double-refresh-in-the-io-code "Implicit globals and double refresh in the IO code")); a double refresh remains (`setTracks` then the loader).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEventsFromServerByID`
- **Links:** [BEH-731](view_cap-700-annotation-model-io.md#beh-731-loading-events-from-a-url-fragment-video_dataid "Loading events from a URL fragment (#video_data=<id>)")

## DEBT-723: Deprecated server list loaders

[inferred, not re-read] tracksListFromServer / eventsFromServer target `#loadTracksFromServerDialog` (absent from the page) and `/rest/events/`; no callers. Proposed: delete.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tracksListFromServer`, `eventsFromServer`
- **Links:** [BEH-732](view_cap-700-annotation-model-io.md#beh-732-deprecated-server-list-loaders "Deprecated server list loaders")

## DEBT-724: Auth code lives in AnnotationIO.js

[read] `labelbee/static/labelbee/js/AnnotationIO.js` whoami writes the globals `user_id` / `user_data`; `labelbee/static/labelbee/js/VideoList.js:531` and `:634` read `user_data.is_authenticated`; [inferred] ajaxlogin ignores the callback argument passed by LoginDialog. Proposed: login belongs to a session module (group 1 / app shell) that exposes the state.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `ajaxlogin`, `whoami`, `LoginDialog`
- **Links:** [BEH-733](view_cap-700-annotation-model-io.md#beh-733-login-state-gates-the-server-buttons "Login state gates the server buttons")

## DEBT-725: CSV loaders: no error handling, hard-coded paths, unsequenced video and CSV

[read for `loadTracksCSVFromServer`] `d3.csv(...).then` without catch; [inferred for the click handlers] default URLs under `datasets/bee_feeder` and `datasets/gurabo4`; the gurabo4 link starts the video load and the CSV fetch independently. Slice 3 step 5: the three CSV loaders now return their promise and report a request failure, a parse failure or a rejected `setTracks`/`setTags` with `showLoadError`; the default URLs and the unsequenced video/CSV remain.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTracksCSVFromServer`, `clickLoadTracksCSVFromServer`, `clickLoadTracksTaggedCSVFromServer`
- **Links:** [BEH-735](view_cap-700-annotation-model-io.md#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)"), [BEH-736](view_cap-700-annotation-model-io.md#beh-736-import-of-a-tracks_tagged-csv "Import of a tracks_tagged CSV")

## DEBT-726: Near-identical CSV converters; tags CSV loader unreachable

[read] tracks_csv_to_json, tags_csv_to_json, tracks_tagged_csv_to_json repeat the same geometry / parts code (300x600, angle + 90); [inferred] loadTagsCSVFromServer has no caller. Proposed: one table-driven converter (constants per [OQ-708](../../QUESTIONS.md#oq-708 "Fixed 300x600 box and +90 angle in CSV imports")).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTagsCSVFromServer`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tracks_csv_to_json`, `tags_csv_to_json`, `tracks_tagged_csv_to_json`
- **Links:** [BEH-735](view_cap-700-annotation-model-io.md#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)"), [BEH-737](view_cap-700-annotation-model-io.md#beh-737-import-of-a-tags-csv-tracks-and-tags-together "Import of a tags CSV (Tracks and Tags together)"), [OQ-708](../../QUESTIONS.md#oq-708 "Fixed 300x600 box and +90 angle in CSV imports")

## DEBT-727: Exports ignore labels and notes and crash on missing bool_acts

[read] `tracksToCSV` and `tracksToBBoxes2` export only the bool_acts flags (CSV) or geometry plus flags (BBox), no escaping; an observation that is `null` or lacks `bool_acts` throws `TypeError`.

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tracksToCSV`, `tracksToBBoxes2`
- **Links:** [BEH-738](view_cap-700-annotation-model-io.md#beh-738-export-events-csv "Export Events (CSV)"), [BEH-739](view_cap-700-annotation-model-io.md#beh-739-export-events-bbox "Export Events (BBox)"), [DEBT-701](#debt-701-observation-carries-bool_acts-next-to-labels "Observation carries bool_acts next to labels")

## DEBT-728: tracksToBBoxes unused and log message stale

[inferred, `saveEventsToBBoxes` not re-read] saveEventsToBBoxes calls tracksToBBoxes2 but logs the format of tracksToBBoxes.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `saveEventsToBBoxes`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tracksToBBoxes`
- **Links:** [BEH-739](view_cap-700-annotation-model-io.md#beh-739-export-events-bbox "Export Events (BBox)")

## DEBT-729: Experimental DB path is unreachable and half-built

[read] `loadTracksCSVFromDB` in `labelbee/static/labelbee/js/AnnotationIO.js` calls `db_to_json(db, ...)` with the hard-coded typo "Imported form DB" and a string `history`; `db_to_json` runs a fixed SQL query on table `data` with hard-coded 300x600 box and `angle + 90`, supporting only the sql.js `db.exec` API; [inferred, not re-read] the script tags for SQLiteDB.js / DuckDB.js and the SQLite console panel are commented out in `labelbee/blueprints/labelbee/templates/labelbee_page.html`, loadTracksCSVFromDB has no caller. [read] `labelbee/static/labelbee/js/DuckDB.js:11` imports `apache-arrow@latest` (unpinned) while duckdb-wasm is pinned to 1.12.0.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTracksCSVFromDB`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `db_to_json`
  - [labelbee/static/labelbee/js/DuckDB.js](../../../labelbee/static/labelbee/js/DuckDB.js): `loadCSVFromURL`
- **Links:** [BEH-740](view_cap-700-annotation-model-io.md#beh-740-experimental-db-source-load-tracks-from-sqlite "Experimental DB source: load tracks from SQLite"), [BEH-742](view_cap-700-annotation-model-io.md#beh-742-duckdbjs-duckdb-wasm-console-not-connected-to-tracks "DuckDB.js: DuckDB-WASM console (not connected to Tracks)"), [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine"), [OQ-709](../../QUESTIONS.md#oq-709 "How are the experimental DB sources activated")

## DEBT-730: SQLiteDB.js upload replaces only the module-local db

[read] `labelbee/static/labelbee/js/SQLiteDB.js:14-19` the `#upload` change handler assigns the module-local `db` without updating `window.db`, while loadTracksCSVFromDB reads the global; it has no try/catch and throws if no file is selected. By contrast `loadDatabaseFromUrl` (`:21-34`) assigns both. Proposed: one setter updating both, or a single owner.

- **Code:**
  - [labelbee/static/labelbee/js/SQLiteDB.js](../../../labelbee/static/labelbee/js/SQLiteDB.js): `loadDatabaseFromUrl`, `run_click`
- **Links:** [BEH-741](view_cap-700-annotation-model-io.md#beh-741-sqlitedbjs-sql-console-and-database-sources "SQLiteDB.js: SQL console and database sources"), [OQ-709](../../QUESTIONS.md#oq-709 "How are the experimental DB sources activated")

## DEBT-731: Dead loaders and debug helpers

[read] `labelbee/static/labelbee/js/AnnotationIO.js` `loadEventsFromFile0` (only a commented-out call at `labelbee/static/labelbee/js/labelBee.js:198`), `FromServerDialog.clickedShowMetadata` / `showMetadata` (read `theDialog.json[k]["metadata"]`; no caller in the excerpts read), `labelbee/static/labelbee/js/Model.js` `printTracks` (debug print; callers not searched). Decision for the loaders (Q20, maintainer 2026-11-12): nothing is deleted; `loadEventsFromFile0` and the other loaders stay in `AnnotationIO.js`, restructured with the rest, because loading functions are meant to be callable by hand (debugging, manual loading). `printTracks`: caller search still pending.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEventsFromFile0`, `FromServerDialog`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `printTracks`
- **Links:** [BEH-714](view_cap-700-annotation-model-io.md#beh-714-load-events-from-a-local-file "Load Events from a local file"), [BEH-732](view_cap-700-annotation-model-io.md#beh-732-deprecated-server-list-loaders "Deprecated server list loaders")

## DEBT-732: FilePickerFromServerDialog error handler never reports

[read] `labelbee/static/labelbee/js/labelBee.js` FilePickerFromServerDialog.updateDialog: `error: function (data) { typesetAjaxError(...) }` builds the error callback but never calls it, so a failed listing request is silent and the dialog stays on "Loading file list from server. Please wait...". Proposed: `error: typesetAjaxError(...)` as in the other dialogs.

- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `FilePickerFromServerDialog`
- **Links:** [BEH-748](view_cap-700-annotation-model-io.md#beh-748-server-file-picker-used-by-the-tracks-csv-import "Server file picker used by the tracks CSV import"), [BEH-744](view_cap-700-annotation-model-io.md#beh-744-ajax-error-reporting-helpers "Ajax error reporting helpers")

## DEBT-733: setTags replaces Tags before unguarded steps

[read] FIXED in slice 3 step 5. `decodeTags` rejects a v2 file whose `data` is missing, `null` or not an object (it used to set `Tags = undefined`), and `setTags` applies as a whole: it saves the previous Tags, info, `tagsHaveDM` and `ttags`, and if `tagsAddFrames`, `getTTags` or `AnnotationStore.updateTagsHaveDM()` throws (a `null` frame entry, a first frame without `.tags`) it puts them back, logs `console.error` and "ABORTED, malformed tag data. The previous Tags are kept." and returns `0`. Was: the Tags and info were replaced first and a throw left them half-replaced with no refresh. Open: `allTagsID` (reset inside `getTTags`) may stay partial until the next refresh ([DEBT-736](#debt-736-settags-builds-ttags-from-stale-chronogram-data "setTags builds ttags from stale chronogram data")); a file whose first frame has no `tags` is still rejected ([DEBT-715](#debt-715-settags-dm-detection-and-discarded-file-info "setTags DM detection and discarded file info")).

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTags`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tagsAddFrames`
- **Links:** [BEH-724](view_cap-700-annotation-model-io.md#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh"), [BEH-721](view_cap-700-annotation-model-io.md#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats")

## DEBT-734: v2 file without data replaces the model with an empty one silently

[read] `labelbee/static/labelbee/js/AnnotationIO.js` sanitizeEvents: `data0 = obj["data"]` undefined / null / `[]` iterates nothing and returns `{info, data: {}}`; setTracks then replaces `Tracks` ([INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss") data loss on a truncated file). Proposed: reject or warn; decision in [OQ-714](../../QUESTIONS.md#oq-714 "Is a v2 file without data an empty model or an invalid file").

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTracks`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [BEH-746](view_cap-700-annotation-model-io.md#beh-746-a-v2-file-without-data-loads-as-an-empty-model "A v2 file without `data` loads as an empty model"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-714](../../QUESTIONS.md#oq-714 "Is a v2 file without data an empty model or an invalid file")

## DEBT-735: labelListFromServer reports success when nothing was loaded, no error path in the dialog

[read] `labelbee/static/labelbee/js/AnnotationIO.js` labelListFromServer: `return false` inside the success callback does nothing, the promise resolves and `onClickFile` shows "Labels loaded. Closing." and closes the dialog even if `labelButtonsArray` was not assigned; on a request error the promise is rejected and `.then` has no failure handler, so the dialog stays on "Loading labels from ...". Proposed: reject on invalid payload, handle failure in `onClickFile`.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `labelListFromServer`, `LabelListFromServerDialog`
- **Links:** [BEH-734](view_cap-700-annotation-model-io.md#beh-734-label-list-preset-loader "Label list preset loader"), [BEH-747](view_cap-700-annotation-model-io.md#beh-747-label-preset-request-failure-leaves-the-dialog-on-its-loading-message "Label preset request failure leaves the dialog on its loading message")

## DEBT-736: setTags builds ttags from stale chronogram data

[read] `setTags` calls `getTTags()`, which in `tagMode == 'Tracks'` iterates the global `flatTags` assigned by `updateChronoData` (`labelbee/static/labelbee/js/ChronoControl.js:982`), so `ttags` is computed from the previous refresh; `getTTags` also resets `allTagsID` as a side effect. [read] the following `refreshChronogram()` runs `updateChronoData`, which recomputes `flatTags` and `ttags` (`ChronoControl.js:982-984`), so the staleness is transient. Proposed: a single derived-data update after the store changes. Slice 3 step 5: when a step of `setTags` throws, `ttags` is restored but `allTagsID` may stay partial until the next refresh.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTags`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getTTags`
- **Links:** [BEH-724](view_cap-700-annotation-model-io.md#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh")

## DEBT-737: tagsAddFrames silently skips non-object tag entries

[ran] `tagsAddFrames` does `tag.frame = Number(f)` for every non-null entry; in the old sloppy script a primitive entry (number, string) makes this a silent no-op, in a strict ES module it would throw. The move to `labelbee/static/labelbee/js/annotation/AnnotationCodec.js` keeps the old behavior with an explicit skip; golden `tagsAddFrames primitive tag` pins it. Whether a primitive tag should be an error or dropped is undecided.

- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tagsAddFrames`
- **Links:** [BEH-724](view_cap-700-annotation-model-io.md#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh")

## DEBT-801: Stale intervals when "Show Events" is off

`updateChronoData` only rebuilds `allIntervals`, `crosses`, `rectIntervals`, `circlesIntervals`, `partsIntervals` inside `if (showObsChrono)`; `chronogramData` is emptied unconditionally. Unchecking `#showObsChrono` therefore leaves the intervals of the previous refresh in those globals [read]; the renderer that reads `allIntervals` (`ChronoIntervals`) was not in the evidence served, so whether the stale intervals are still drawn is [inferred]. Replacement: the pure stage returns empty lists when events are hidden.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoData`, `createIntervalList`
- **Links:** [BEH-801](view_cap-800-filtering-processing.md#beh-801-refresh-pipeline-order-and-what-each-stage-reads "Refresh pipeline order and what each stage reads"), [BEH-829](view_cap-800-filtering-processing.md#beh-829-show-events-and-show-tags-switches "Show Events and Show Tags switches")

## DEBT-802: Read path mutates Tracks (obs.tag never cleared)

`augmentTrackWithTag` writes `obs.tag` into `Tracks` on every refresh and never removes a tag that vanished [read]. The tag is lost on `copyObs`/`cloneObs` (analysis/06 C9). Replacement: a pure join `tagFor(frame,id)` (or a derived map) owned by the derived-data module; consumers (`getTag`, `getFlatTags`, `cleanObsoleteEvents`) use it.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `getTag`
- **Links:** [BEH-802](view_cap-800-filtering-processing.md#beh-802-tag-integration-augmenttrackwithtag "Tag integration (augmentTrackWithTag)"), [SEAM-802](view_seams.md#seam-802-trackstags-to-derived-join-tag-integration "Tracks/Tags to derived join (tag integration)")

## DEBT-803: Implicit globals and shared mutable products

`updateFlatTracks` assigns `flatTracksAll`, `flatTracksValid`, `flatTracksAllGroupById`, `flatTracksValidGroupById` without declaration; the loop variable `obs` and `obs_for_id` (in `updateTagsLabels`), `acts`, `crosses`, `rectIntervals`, `circlesIntervals` are also implicit globals [read]. `flatTracks` aliases `flatTracksAll`/`flatTracksValid` [read]. Consumers in `ChronoControlInteraction.js` call `.sort` in place on shared arrays [read]: `findNextObsEvent` (`flatTracksAll`, `flatTracksValid` or the `...GroupById[id]` lists, by id/frame), `findNextEventFrame` (`flatTracksAll`/`flatTracksValid`, by frame), and, in auto event mode, `findNextTagEvent` and `findPreviousTagEvent`, where `tagList = tagIntervals` is the global itself (no copy); `findNextFreeTagEvent`, `findPreviousFreeTagEvent` and the non-auto tag paths sort a `.filter` copy and are harmless. The in-place sorts reorder arrays that `flatTracks` and the table also see, until the next refresh. `chronogramData` is emptied in place (`length = 0`) rather than replaced, so holders of the old reference see the new content. Replacement: return a frozen result object from the pipeline; consumers copy before sorting.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateFlatTracks`, `updateTagsLabels`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `findNextObsEvent`, `findNextEventFrame`, `findNextTagEvent`, `findPreviousTagEvent`
- **Links:** [BEH-801](view_cap-800-filtering-processing.md#beh-801-refresh-pipeline-order-and-what-each-stage-reads "Refresh pipeline order and what each stage reads"), [BEH-803](view_cap-800-filtering-processing.md#beh-803-flat-track-lists-updateflattracks "Flat track lists (updateFlatTracks)"), [BEH-817](view_cap-800-filtering-processing.md#beh-817-redundant-observation-detection "Redundant observation detection"), [SEAM-801](view_seams.md#seam-801-pipeline-entry-store--filters---derived-data "Pipeline entry (store + filters -> derived data)"), [SEAM-803](view_seams.md#seam-803-derived-data-to-consumers-views-and-navigation "Derived data to consumers (views and navigation)")

## DEBT-804: obs.cx/cy written by the read path, bool_acts used for activity

`updateChronogramData` overwrites `obs.cx`/`obs.cy` of every kept observation at each refresh [read] (Observation already stores them, [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")) and reads `obs.bool_acts` instead of `labels` [read] ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"): shim derived from `labels`). Also dead locals `id_eff` (`String(Number(id)%50)`, unused) and `labelArray` [read]. Replacement: compute the center in the pure stage without writing; derive the four activities from `labels`.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronogramData`
- **Links:** [BEH-805](view_cap-800-filtering-processing.md#beh-805-observations-to-chronogram-rows-updatechronogramdata "Observations to chronogram rows (updateChronogramData)"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")

## DEBT-805: Same-frame rows split intervals (overlap)

One observation with several activities yields several rows with the same `x`; `createIntervalList` requires `x[i]-x[i-1] == 1`, so a duplicate frame closes the interval and opens an overlapping one [read]. The intended behavior is the header comment "only one interval by sequential track". Replacement: dedupe frames per ID before merging.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `createIntervalList`, `updateChronogramData`
- **Links:** [BEH-805](view_cap-800-filtering-processing.md#beh-805-observations-to-chronogram-rows-updatechronogramdata "Observations to chronogram rows (updateChronogramData)"), [BEH-807](view_cap-800-filtering-processing.md#beh-807-rows-to-intervals-createintervallist "Rows to intervals (createIntervalList)")

## DEBT-806: Aggregated labels only on the last interval of each ID

`tempInterval.labels = Object.keys(haslabel).join(',')` is placed after the inner loop, so only the last interval of an ID gets it; earlier intervals keep their first row's raw labels, and `crosses`, `wrongid`/`newid` flags depend on that [read]. Also `|=` turns booleans into numbers. Replacement: finalize labels when each interval is pushed.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `createIntervalList`
- **Links:** [BEH-807](view_cap-800-filtering-processing.md#beh-807-rows-to-intervals-createintervallist "Rows to intervals (createIntervalList)"), [BEH-808](view_cap-800-filtering-processing.md#beh-808-interval-post-filter-by-roi-and-derived-flags "Interval post-filter by ROI and derived flags"), [BEH-809](view_cap-800-filtering-processing.md#beh-809-derived-interval-subsets "Derived interval subsets")

## DEBT-807: tagMode dead branches and stale flatTags in getTTags

`tagMode` is always `'Tracks'`, so the `'Tags'` ("Legacy") branches of `getFlatTags`, `getTTags`, `validIdsChrono`, `getTag` are dead [read]. `getTTags` called from `setTags` reads the previous `flatTags` global [read]; the stale `ttags`/`allTagsID` are replaced a few statements later by the `refreshChronogram` that ends `setTags` [read], so the hazard is the hidden dependency, not a lasting wrong state. In the dead `'Tags'` mode `validTagIdsDomain` tests `d.labels` on tag intervals, which carry `labeling`, not `labels` [read]. Free tags (no observation) are consequently never displayed. Replacement: remove the mode or make it an explicit option; pass inputs as parameters.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getFlatTags`, `getTTags`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTags`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `tagMode`
- **Links:** [BEH-810](view_cap-800-filtering-processing.md#beh-810-flat-tags-getflattags-and-tagmode "Flat tags (getFlatTags) and tagMode"), [BEH-811](view_cap-800-filtering-processing.md#beh-811-tag-series-per-id-getttags "Tag series per ID (getTTags)"), [OQ-801](../../QUESTIONS.md#oq-801 "Are free tags (tags without a matching observation) meant to be shown?")

## DEBT-808: Frame/ID filtering duplicated across stages

Frame filter, restrict ID and exclude ID are re-implemented in `updateFlatTracks`, `updateChronogramData`, `getFlatTags`, `getTTags` (see the `TODO: filter in only one place` comment) [read]. `hideFlowers` and `hideInvalid` are applied in only some of them ([BEH-820](view_cap-800-filtering-processing.md#beh-820-hide-flowers-button "Hide Flowers button")). Replacement: one `applyFilters(flat, filters)` stage feeding the others.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateFlatTracks`, `updateChronogramData`, `getFlatTags`
- **Links:** [BEH-803](view_cap-800-filtering-processing.md#beh-803-flat-track-lists-updateflattracks "Flat track lists (updateFlatTracks)"), [BEH-820](view_cap-800-filtering-processing.md#beh-820-hide-flowers-button "Hide Flowers button"), [SEAM-804](view_seams.md#seam-804-filter-state-ui-controls-to-filters-config "Filter state (UI controls to Filters config)")

## DEBT-809: Hamming/DM average diluted by sentinel frames

`hammingavg`/`dmavg` divide by the whole interval length although `hamming >= 1000` frames add nothing; the first sample is added unconditionally; missing `dm` gives NaN [read]. Intent unknown ([OQ-806](../../QUESTIONS.md#oq-806 "interpolateTags, computeMotionDirection and the hamming 1000 sentinel")). Replacement: define explicitly (average over real detections) and handle missing fields.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateTagIntervals`
- **Links:** [BEH-813](view_cap-800-filtering-processing.md#beh-813-hamming-and-dm-averaging-rule "Hamming and DM averaging rule"), [OQ-806](../../QUESTIONS.md#oq-806 "interpolateTags, computeMotionDirection and the hamming 1000 sentinel")

## DEBT-810: labeling.leaving never produced

The tag renderer tests `interval.labeling.leaving` but `updateTagsLabels` only sets `labeled, entering, falsealarm, wrongid` [read]. `labeling` is also overwritten by the last matching annotation (order dependent). Replacement: generic label set on the interval ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")).

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateTagsLabels`
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `setTagGeom`
- **Links:** [BEH-815](view_cap-800-filtering-processing.md#beh-815-labelling-tag-intervals-from-observations-updatetagslabels-part-1 "Labelling tag intervals from observations (updateTagsLabels, part 1)"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")

## DEBT-811: Quadratic tag labelling, magic margin 20

`updateTagsLabels` loops every interval over every observation and uses a hard-coded 20-frame margin (`f > begin-20 && f < end+20`) [read]. Replacement: index observations by ID, name the constant (configurable).

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateTagsLabels`
- **Links:** [BEH-815](view_cap-800-filtering-processing.md#beh-815-labelling-tag-intervals-from-observations-updatetagslabels-part-1 "Labelling tag intervals from observations (updateTagsLabels, part 1)")

## DEBT-812: Virtual interval keeps the old row

The virtual interval is `Object.assign({}, interval)` with only `id` (and `oldid`, `wrongid`, `virtual`) changed, so `y`, which the renderer uses to place it, stays `idAxisMap(oldid)`, and `labeling` is shared by reference [read]. Whether the old row is intended is [OQ-807](../../QUESTIONS.md#oq-807 "Row of a virtual (wrongid) tag interval"). Replacement: recompute `y`, deep-copy `labeling`.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateTagsLabels`
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `setTagGeom`
- **Links:** [BEH-816](view_cap-800-filtering-processing.md#beh-816-virtual-tag-intervals-for-wrongid "Virtual tag intervals for wrongid"), [OQ-807](../../QUESTIONS.md#oq-807 "Row of a virtual (wrongid) tag interval")

## DEBT-813: hideFlowers only partial

Applied only in `updateChronogramData`; flowers remain in the obs table, event navigation and tag intervals [read]. The "ID starts with F" rule is hard-coded. Replacement: part of the single filter stage, rule configurable.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `click_hideFlowers`, `updateChronogramData`
- **Links:** [BEH-820](view_cap-800-filtering-processing.md#beh-820-hide-flowers-button "Hide Flowers button"), [DEBT-808](#debt-808-frameid-filtering-duplicated-across-stages "Frame/ID filtering duplicated across stages"), [OQ-802](../../QUESTIONS.md#oq-802 "Hide Flowers: scope and rule")

## DEBT-814: Inconsistent ID list parsing, uninitialised excludeIDArray

`onRestrictIDChanged` and `onExcludeIDChanged` split without trim/empty filter while `setRestrictID` trims; `excludeID`/`excludeIDArray` are never initialised and are implicit globals; toggling Restrict never re-reads the text [read]. Replacement: one `parseIdList` used by every entry point.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `onRestrictIDChanged`, `onExcludeIDChanged`, `setRestrictID`, `click_restrictID`
- **Links:** [BEH-821](view_cap-800-filtering-processing.md#beh-821-restrict-id "Restrict ID"), [BEH-822](view_cap-800-filtering-processing.md#beh-822-exclude-id "Exclude ID")

## DEBT-815: Frame filter default max -1 excludes everything

`config.frameFilter.frameMax = -1` is only normalised when the user edits the max box; activating the filter with defaults hides all frames [read]. `auto` is not clamped to [0, nframes). Box values are stored with `Number()` and no check: empty text gives 0, non-numeric text gives `NaN`, which makes that bound exclude nothing [read] ([BEH-843](view_cap-800-filtering-processing.md#beh-843-frame-filter-with-an-empty-or-non-numeric-box-value "Frame filter with an empty or non-numeric box value"), [DEBT-824](#debt-824-unvalidated-filter-inputs "Unvalidated filter inputs")). Replacement: normalise and validate at use.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `setFrameFilter`
- **Links:** [BEH-823](view_cap-800-filtering-processing.md#beh-823-frame-filter "Frame filter"), [BEH-843](view_cap-800-filtering-processing.md#beh-843-frame-filter-with-an-empty-or-non-numeric-box-value "Frame filter with an empty or non-numeric box value"), [OQ-813](../../QUESTIONS.md#oq-813 "Default of the frame filter maximum")

## DEBT-816: Dead ID remap text input

`idAxisMap_inputChanged` and `update_idAxisMap_input` use the selector `'#'` and `.val` as a property (no call), and the input is commented out in the page [read]. Replacement: delete.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `idAxisMap_inputChanged`, `update_idAxisMap_input`
- **Links:** [BEH-824](view_cap-800-filtering-processing.md#beh-824-id-axis-remap "ID axis remap")

## DEBT-817: Dead RGB contrast button, RGB coefficient

`#tagsUseRgbFilterContrast` calls `chronoFilter('RGB_contrast')`, which has no branch; the RGB luma uses 0.1114 for blue [read]. Hamming buttons are not toggles and show no state. Replacement: implement or remove; show the active Hamming mode.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `chronoFilter`, `refreshTagsParameters`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#tagsUseRgbFilterContrast`
- **Links:** [BEH-825](view_cap-800-filtering-processing.md#beh-825-tag-sample-filter-composition "Tag sample filter composition"), [BEH-826](view_cap-800-filtering-processing.md#beh-826-dm-and-rgb-tag-filters "DM and RGB tag filters")

## DEBT-818: ROI filter state split between page and globals

`ROI`, `flag_useROI`, `excludeRects`, `flag_useExcludeRects` and the predicates `tagsSampleFilterROI`/`tagsSampleFilterExcludeRects` live in `OverlayControl.js`, are read by `ChronoControl.js` (`updateChronogramData`, `createIntervalList`, `cleanObsoleteEvents`), and each change callback calls `refreshChronogram` and `videoControl.refresh` directly [read]; `ROIChanged` and `excludeRectsChanged` first call `onTagsParametersChanged` (which already does both) and then call both again, so each ROI or exclude-region edit refreshes the chronogram and the video twice [read]. Replacement: a `Filters` config object passed to the pure stages.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `ROIChanged`, `excludeRectsChanged`, `onTagsParametersChanged`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronogramData`
- **Links:** [BEH-827](view_cap-800-filtering-processing.md#beh-827-roi-filter "ROI filter"), [BEH-839](view_cap-800-filtering-processing.md#beh-839-exclude-regions-tag-filter "Exclude regions (tag filter)"), [SEAM-805](view_seams.md#seam-805-tag-filter-panel-overlaycontrol-to-pipeline "Tag filter panel (OverlayControl) to pipeline")

## DEBT-819: User JavaScript filters via Function(), dead tagsIDFilter

`tagsSampleFilterCustom` (compiled in `refreshTagsParameters`), `tagsIntervalFilter` (recompiled inside the predicate at every call, so its syntax errors surface late, in `updateTagIntervals`) and `tagsIDFilter` (compiled in `refreshTagsParameters`, never called in the code read) compile arbitrary text from the page [read]. Replacement: remove the dead ID filter and its `#tagsIDFilter` box; typed filter config for the rest, keeping scripting as an explicit advanced option or dropping it ([OQ-804](../../QUESTIONS.md#oq-804 "Custom JavaScript filter boxes")).

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `refreshTagsParameters`, `tagsIDFilter`, `tagsIntervalFilter`
- **Links:** [BEH-828](view_cap-800-filtering-processing.md#beh-828-custom-javascript-tag-sample-filter "Custom JavaScript tag sample filter"), [BEH-844](view_cap-800-filtering-processing.md#beh-844-tag-interval-filter-minimum-length-and-custom-script "Tag interval filter: minimum length and custom script"), [OQ-804](../../QUESTIONS.md#oq-804 "Custom JavaScript filter boxes")

## DEBT-820: Domain order discards sortIds; sortIds mutates input; Set passed

`updateChronoYDomain` always applies the numeric comparator `-Number(b)+Number(a)` (non-numeric IDs give NaN, order undefined), overriding `sortIds` [read]. `sortIds` sorts the caller's array in place [read]. `validAllTagIdsDomain` passes `allTagsID`, which is a Set between `getTTags` and the conversion in `updateChronoData` (a Set has no `sort`), but the function has no active caller (its only reference is commented out in `onClickNextID`), so this hazard is latent dead code [read]. Replacement: one pure ordering function returning a new array.

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoYDomain`, `sortIds`, `validAllTagIdsDomain`
- **Links:** [BEH-830](view_cap-800-filtering-processing.md#beh-830-id-ordering-sortids "ID ordering (sortIds)"), [BEH-831](view_cap-800-filtering-processing.md#beh-831-id-domain-of-the-chronogram-rows "ID domain of the chronogram rows")

## DEBT-821: cleanObsoleteEvents hard-coded rules, destructive, no undo

Threshold `dm < 20` is a literal, not the `#tagsMinDM` value; deletes in place, leaves empty frames, no dirty flag or history; two independent `if`s instead of `else if` [read]. Replacement: pure `findObsolete(...)` returning a list, applied through a store command with undo ([OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics")).

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `cleanObsoleteEvents`
- **Links:** [BEH-833](view_cap-800-filtering-processing.md#beh-833-clean-obsolete-events "Clean obsolete events"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-805](../../QUESTIONS.md#oq-805 "Scope of obsolete-event clean-up")

## DEBT-822: interpolateTags is console-only, mutates Tags

Never called from the page, clears `tagIntervals`, writes new tags with sentinel `hamming: 1000`, may create duplicates, dead `end++` [read]. Replacement: pure function returning added tags, or remove ([OQ-806](../../QUESTIONS.md#oq-806 "interpolateTags, computeMotionDirection and the hamming 1000 sentinel")).

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `interpolateTags`
- **Links:** [BEH-834](view_cap-800-filtering-processing.md#beh-834-tag-interpolation-interpolatetags "Tag interpolation (interpolateTags)"), [OQ-806](../../QUESTIONS.md#oq-806 "interpolateTags, computeMotionDirection and the hamming 1000 sentinel")

## DEBT-823: computeMotionDirection discards its result; cacheTags wrong key

`dir` is set on `tagIntervals` and then `updateTagIntervals()` rebuilds the array; `cacheTags` tests `ttags[key]` (id-keyed) instead of `tagCache[key]`, so tags with the same frame and ID overwrite each other [read].

- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `computeMotionDirection`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `cacheTags`
- **Links:** [BEH-835](view_cap-800-filtering-processing.md#beh-835-motion-direction-computemotiondirection "Motion direction (computeMotionDirection)")

## DEBT-824: Unvalidated filter inputs

The ROI text checks only the number of comma-separated parts and stores `Number()` of each (`NaN` for text, 0 for empty), so one bad value makes every tag fail the ROI test while it is on [read]. The exclude-region JSON dialog assigns `JSON.parse(text)` with no try/catch and no shape check, so invalid JSON throws and a wrong shape gives `NaN` tests [read]. The frame-filter boxes store `Number(text)` without a check ([DEBT-815](#debt-815-frame-filter-default-max--1-excludes-everything "Frame filter default max -1 excludes everything")). "Reinit" writes the full video size into the `#ROI` text but not into `ROI`, leaving text and active ROI inconsistent [read]. Replacement: parse and validate each input in one place (`parseRoi`, `parseRects`, `parseFrameRange`), show an error, keep the previous value.

- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onROITextChanged`, `updateROIFromVideo`, `initExcludeRectsDialog`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `setFrameFilter`
- **Links:** [BEH-827](view_cap-800-filtering-processing.md#beh-827-roi-filter "ROI filter"), [BEH-841](view_cap-800-filtering-processing.md#beh-841-exclude-region-json-dialog-is-accepted-without-validation "Exclude-region JSON dialog is accepted without validation"), [BEH-843](view_cap-800-filtering-processing.md#beh-843-frame-filter-with-an-empty-or-non-numeric-box-value "Frame filter with an empty or non-numeric box value"), [DEBT-815](#debt-815-frame-filter-default-max--1-excludes-everything "Frame filter default max -1 excludes everything"), [OQ-808](../../QUESTIONS.md#oq-808 "Should 'Reinit' reset the ROI?")
