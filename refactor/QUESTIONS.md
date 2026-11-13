# Questions for the maintainer

Open questions raised by refactor documents. Format per `CLAUDE.md` (Analysis rules).
Answered questions stay here with `_Answer_:` added by the maintainer.

Pre-existing questions Q1-Q14 are still in
[analysis/07-questions-and-proposals.md](analysis/07-questions-and-proposals.md)
(move pending, see PLAN Phase 1b). This file holds the intent questions `OQ-nnn`, from
[intent/](intent/README.md).

## Intent

**<a id='oq-001'>OQ-001</a>: Users and purpose**
Who are the annotators and admins, in which projects/datasets is LabelBee used today, and is "behavior tracking of bees at the hive entrance" the right one-line purpose ([CAP-100](intent/docs/view_capabilities.md#cap-100-manage-data-and-users), [CAP-100](intent/docs/view_capabilities.md#cap-100-manage-data-and-users), [CAP-100](intent/docs/view_capabilities.md#cap-100-manage-data-and-users))?
_Significance_: Every spec and test priority depends on who the users are and what they value.
_Proposed_: As written in the Intent document.
_Answer_: Confirmed, shortened to "behavior tracking of bees"; expected to be more general than the hive entrance (maintainer).
_Answer_ (projects): Gurabo hive ramp videos, beefeeder entrance videos, flowerpatch videos, mango videos (maintainer). User roles not detailed.

**<a id='oq-002'>OQ-002</a>: Tag pipeline boundary**
Are tag detection and decoding (tag25h5) done by a separate tool, with LabelBee only displaying, verifying and fixing results ([DEC-001](intent/docs/view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee), [CAP-502](intent/docs/view_capabilities.md#cap-502-tag-id-assignment-and-fix), [DEC-001](intent/docs/view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee))? Which tool produces `tracks_tagged` CSV and tag files?
_Significance_: Decides whether the in-browser Hamming search and tag-fix code is core or auxiliary, and which input formats are contracts with an external tool.
_Proposed_: Separate offline tools; LabelBee consumes their output.
_Answer_: Yes, tag detection/decoding and bee tracking are separate offline tools; LabelBee consumes their output (maintainer). Name of the tool(s) not given.
_Answer_ (tool): the cyindibee `cb` CLI produces the CSV and JSON files; see [DEC-001](intent/docs/view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee) (maintainer).

**<a id='oq-003'>OQ-003</a>: What the saved annotations are used for**
What downstream analysis consumes the saved annotations, and which fields must be preserved exactly ([ENT-004](intent/docs/view_entities.md#ent-004-annotation-file--record), [CAP-700](intent/docs/view_capabilities.md#cap-700-annotation-model-and-io), [INV-001](intent/docs/view_invariants.md#inv-001-no-annotation-loss), [INV-003](intent/docs/view_invariants.md#inv-003-old-annotation-files-stay-loadable))?
_Significance_: Defines the data contract and the first characterization tests.
_Proposed_: All fields in `Observation` ([04-data-model.md](analysis/04-data-model.md) 4.1) are preserved on load and save.
_Answer_: All `Observation` fields are preserved on load and save (maintainer).

**<a id='oq-004'>OQ-004</a>: Which workflows are routine**
Which of these are routine: video navigation modes (preview, cache), pollination visits ([CAP-201](intent/docs/view_capabilities.md#cap-201-load-video-metadata-and-video), [CAP-602](intent/docs/view_capabilities.md#cap-602-pollination-visits))? Which are experimental or abandoned?
_Significance_: Separates features to specify and test from candidates for removal (see also [Q4](analysis/07-questions-and-proposals.md#q4)).
_Proposed_: All reachable from page buttons are live.
_Answer_: all are active, including export, external-tool import and the experimental DB sources (maintainer).

**<a id='oq-005'>OQ-005</a>: Core tracking workflow and shortcuts**
What is the typical sequence of operations when annotating one video (create box, set ID, propagate over frames, correct, save) and which keyboard shortcuts and click modes are essential ([CAP-401](intent/docs/view_capabilities.md#cap-401-bee-track-boxes), [INV-002](intent/docs/view_invariants.md#inv-002-interactive-responsiveness))?
_Significance_: These sequences become the end-to-end scenarios of Phase 2.
_Proposed_: Derive the sequence from the code and ask for confirmation.
_Answer_: Derived sequence confirmed, mostly (maintainer): navigate, Shift+click or Ctrl+drag to create a box with predicted ID, confirm ID with Enter, step with `>` so the ID is re-predicted, correct/label, save. Arrow keys navigate, they do not nudge boxes. The Ctrl+Right double step is `DEBT`. Quick Help may be inaccurate; the code is the reference ([DEC-004](intent/docs/view_decisions.md#dec-004-the-code-is-the-reference-for-behavior)). Essential: frame stepping with modifiers, box creation, ID editing, labels and delete. Some may become `DEBT`; `p` is kept for now, and shortcuts are to be gathered in one place for a future shortcut manager ([DEC-005](intent/docs/view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place)).

**<a id='oq-006'>OQ-006</a>: Label semantics**
What does each current label (fanning, pollen, entering, leaving, wrongID, falsealarm) mean precisely: applies to one frame or to a span, and which are mutually exclusive ([CAP-601](intent/docs/view_capabilities.md#cap-601-behavior-labels-and-notes), [DEC-003](intent/docs/view_decisions.md#dec-003-labels-are-generic))?
_Significance_: These six become the predefined labels that a later plugin mechanism must reproduce; `labels` and `bool_acts` encode the same facts twice ([04-data-model.md](analysis/04-data-model.md) 4.1).
_Answer_: The set is not closed. The predefined labels are useful for some tasks, and new tasks may define new labels. Predefined labels are the target for plugins; the current hard-coding is `DEBT` (maintainer).
_Proposed_: The generic `labels` string is canonical and `bool_acts` is derived, to be confirmed.
_Answer_ (semantics): A label applies to one observation and is not propagated over a span; track-level labels (pollen) would be a new feature. `bool_acts` is `DEBT`: flag each use, temporary shim derived from `labels`, removal expected in the refactor ([DEC-003](intent/docs/view_decisions.md#dec-003-labels-are-generic)) (maintainer).

**<a id='oq-007'>OQ-007</a>: Skeleton labeling**
Is skeleton (body-part keypoint) labeling in active use, with which part vocabulary, and for what analysis ([CAP-403](intent/docs/view_capabilities.md#cap-403-skeleton-overlay), [CAP-501](intent/docs/view_capabilities.md#cap-501-skeleton-labelling))?
_Significance_: Zoom and skeleton code is ~2.3k lines in `labelbee/static/labelbee/js/ZoomView.js`.
_Proposed_: Treat as live, keypoint label list configurable.
_Answer_: Live, keypoint list configurable; templates wanted; the current handling is a hacked version, `DEBT` (maintainer).

**<a id='oq-008'>OQ-008</a>: Chronogram role**
Is the chronogram a navigation aid only, or also an editing surface for events ([CAP-300](intent/docs/view_capabilities.md#cap-300-temporal-display-and-navigation), [CAP-305](intent/docs/view_capabilities.md#cap-305-event-navigation))?
_Significance_: Decides whether it may depend on the store read-only.
_Proposed_: Navigation and review, with some editing through selection.
_Answer_: Navigation and review, with editing through selection (maintainer).

**<a id='oq-009'>OQ-009</a>: Clean-up semantics**
Which clean-up operations are routinely used, and is "no undo" intentional ([CAP-803](intent/docs/view_capabilities.md#cap-803-annotation-clean-up))?
_Significance_: Destructive actions need a stated expectation before a behavior-preserving refactor.
_Proposed_: Keep as is, flag for later review.
_Answer_: Kept as is for now, but undo is wanted; which clean-up operations are routine was not stated (maintainer).

**<a id='oq-010'>OQ-010</a>: Server versus local storage**
Is the server record the normal way to store annotations, with local files for exchange, or the reverse ([CAP-700](intent/docs/view_capabilities.md#cap-700-annotation-model-and-io))?
_Significance_: Decides which path the tests and the "no annotation loss" goal protect first.
_Proposed_: Server is primary, local file is backup/exchange.
_Answer_: Server is primary, local file is backup/exchange (maintainer).

**<a id='oq-011'>OQ-011</a>: Performance expectations**
What video sizes, frame counts and number of bees per frame must stay responsive, and what is acceptable latency per step or edit ([INV-002](intent/docs/view_invariants.md#inv-002-interactive-responsiveness))?
_Significance_: Without a target, a refactor cannot be judged for performance regressions.
_Proposed_: Current behavior on the Gurabo 5MP videos is the baseline.
_Answer_: Current behavior on the Gurabo 5MP videos is the baseline; no numeric target (maintainer).

## Specs (draft, raw per drafter; to be curated)

**<a id='oq-101'>OQ-101</a>: Is `created_from_id` supposed to be stored, and does the first save work?**
The server ignores the client's `created_from_id` (DEBT-101) and a save with nothing loaded probably fails on an empty `created_from_id` (DEBT-102, BEH-144). What must a characterization test assert: the intended lineage (stored parent id, save of a new snapshot allowed without a parent) or the current behavior? Has anyone saved a fresh annotation in production?
_Significance_: DEC-002 and INV-001 rely on lineage; tests for CAP-703 differ completely.
_Proposed_: Intended behavior: lineage stored, empty parent allowed (stored as NULL); fixing is a separate step after a run confirms the current failure.

**<a id='oq-102'>OQ-102</a>: Who may create, edit and delete datasets, videos and annotation records?**
Pages restrict edit/delete to `admin` while the API lets any logged-in user do most of it (DEBT-105, BEH-110, BEH-136, BEH-141, BEH-142, BEH-147), and the `user` role is never checked (BEH-128). ENT-005 says datasets are managed by admins. Should ordinary annotators create datasets? delete other users' annotation records?
_Significance_: Decides the access matrix tests and what the refactor must not silently tighten.
_Proposed_: Admin: manage datasets, videos, users; any user: create datasets, create and read annotation records; owner or admin: delete annotations.

**<a id='oq-103'>OQ-103</a>: Intended meaning of "Show files from all users"**
`allusers` is parsed as a user id (DEBT-104, BEH-143). Should every user see all users' annotation files in the load dialog, only admins, or is it an experiment? The gallery table currently shows only the caller's records.
_Significance_: Collaboration workflows (review of others' tracks) depend on it.
_Proposed_: Boolean flag; any authenticated user may list all users' records (read only), default own records.

**<a id='oq-104'>OQ-104</a>: Is open self-registration intended, and which role should new users get?**
Registration is enabled by library default (BEH-102, BEH-121); the page likely fails because the custom form is not installed, new users get no role, and the settings key meant to control it (`USER_ENABLE_REGISTRATION`) is probably not the library key.
_Significance_: Determines whether registration is a feature to keep (test) or debt to remove, and the onboarding flow of annotators.
_Proposed_: Registration disabled; admins create users (seed or admin page).

**<a id='oq-105'>OQ-105</a>: Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?**
`/data/<path>` serves `os.path.join(bp.root_path, "../static/data")`, which resolves to `labelbee/blueprints/static/data` and not to `labelbee/static/data` (BEH-149), without login; `/api/v1/rawdata` serves `$DATA_DIR` with login (BEH-148); uploads go to `$ROOT_PATH` (BEH-134). The home and gallery pages link `data/`, `data/videos/` and build raw video and thumbnail URLs from `data` + `path/file_name`; the route requires a non-empty path. In this checkout `labelbee/blueprints/static/` does not exist (static check). Which directory do deployments populate or create (and does a server alias such as Apache override `/data`, as a comment in `rawdata.py` suggests)? Are the three the same mounted folder?
_Significance_: A seam contract for file serving (SEAM-104) and the authentication tests need the deployment layout.
_Proposed_: All three are the same mounted folder, made reachable at `/data` (by a server alias or by fixing the path); `/data` stays public for video playback.

**<a id='oq-106'>OQ-106</a>: How are videos registered in practice, and are upload/delete endpoints used?**
No page or script calls `POST /videos` or `DELETE /video/<id>` (BEH-134, BEH-137; `add_video.html` has no route in `gallery.py`); `seed.py` inserts rows directly.
_Significance_: Decides whether the upload/metadata-extraction path (OpenCV dependency) is specified and tested or dropped from the target.
_Proposed_: Videos are registered out-of-band by scripts; the upload API is dead and not preserved.

**<a id='oq-107'>OQ-107</a>: Size limits and tag-record storage of annotation records**
`video_data.data` is declared `db.Text()` (MySQL TEXT, 64 KB if the schema was created from the model); real annotation JSON of long videos may be larger (BEH-144, BEH-151). Also the client loads `tag` records through a nonexistent route (DEBT-118): are tag records stored in `video_data` at all, and by which tool?
_Significance_: Maximum snapshot size is a testable requirement and a risk for INV-001.
_Proposed_: Production column is a larger text type (to be checked on the real database); tag records are created by external tools and loaded through `/api/v1/annotation/<id>`.

**<a id='oq-108'>OQ-108</a>: Do gallery form POSTs have to copy the profile names onto the current user?**
Seven gallery handlers (`/add_dataset`, `/delete_dataset`, `/videos`, `/videodata`, `/video_data_details`, `/edit_video`, `/edit_dataset`) build a `UserProfileForm` and, on a valid POST, copy first and last name onto the current user and commit before their own action; an invalid form re-renders silently (BEH-154, DEBT-123). Is this wanted (for example to force users to have names) or an accident of copying the profile page pattern?
_Significance_: Decides whether BEH-154 is a characterization fact or debt, and what a test of dataset creation or video edit may assert (a user without names currently cannot create a dataset).
_Proposed_: Accident (DEBT-123): these POSTs perform only their own action and redirect.

**<a id='oq-109'>OQ-109</a>: Is the public `/admin/version` page intended?**
`GET /admin/version` has no login or role check and runs `git` commands in the server's working directory, exposing branch, recent log and working-tree status to anyone (BEH-127, DEBT-108). The code does not show whether this is a deliberate diagnostic for deployments.
_Significance_: Decides whether the access matrix for CAP-102 pages treats it as public by design, and whether a refactor may restrict it.
_Proposed_: Admin only.

**<a id='oq-110'>OQ-110</a>: What should a client-supplied `timestamp` do when saving an annotation record?**
`VideoDataSchema` accepts an optional `timestamp` (loaded as a `datetime`) and `AnnotationsAPI.post` forwards it to `add_video_data`, which declares it as a string; the annotator never sends it (BEH-144, DEBT-124). A posted value currently fails with `TypeError` (HTTP 500) because `add_video_data` runs `strptime` on a `datetime`; only the omitted case works (server UTC now). Should a client-supplied record time be honored, or must the server always stamp the record?
_Significance_: A characterization test for POST /annotations cannot state the timestamp behavior until this is known; it also bears on INV-001 (ordering of snapshots by time).
_Proposed_: The server always sets the timestamp; a posted value is ignored.

**<a id='oq-201'>OQ-201</a>: Which video-loading paths are routine**
Of the video entry points ("Load Video from DB", "From URI", "From /data", URL hash, the "gurabo4 video+tracks_tagged" link of the annotation Load buttons, hidden legacy video list; BEH-202), which are used in practice, and may the legacy list (BEH-214, DEBT-208) and the hard-coded `gurabo4` loader (BEH-232, DEBT-230) be dropped? Is "From URI" with its hard-coded sample start time (DEBT-215) used for real work, and where should a manually loaded video get its start time and real fps from?
_Significance_: Decides what is specified and tested versus deleted; the sample `starttime` affects chronogram time labels for manually loaded videos (BEH-207).
_Proposed_: DB load and /data load are routine; the legacy list and the `gurabo4` loader are dev leftovers to remove; start time should come from the `.stream.json` or be asked.

**<a id='oq-202'>OQ-202</a>: Deep links `#video_id=..&frame=..`**
Are the "Frame: n" links (BEH-210) meant to open a video at a given frame in a new tab, and is it expected to work on a cold page (BEH-208, BEH-209)? Code reading says the seek is lost: it is issued before the video record is loaded (frame rejected against the placeholder `nframes = 1`) and the delayed seek is cleared before use (DEBT-202).
_Significance_: A characterization test must either assert the current (broken) result or the intended one.
_Proposed_: Intended: video loads, then shows the frame; the current failure is a defect (`DEBT`) to fix in a later step, and the first test asserts the intended behavior as expected-fail.

**<a id='oq-203'>OQ-203</a>: Legacy "Video List" subpanel**
Is the hidden "Video List" subpanel (BEH-214) a feature to keep for batch workflows (CSV/JSON of video, preview, tags)? It never gets `nframes` (BEH-214) so its load path is functionally incomplete.
_Significance_: About 300 lines of `VideoList.js` and the deprecated `loadVideo` depend on it.
_Proposed_: Treat as dead; remove with its DEBT-208 siblings.

**<a id='oq-204'>OQ-204</a>: Cache mode semantics**
Is "Use Cache" meant to be a permanent display mode (frames as JPEG images, Image Diff, exact frame access) or a power-user option? What is expected when switching modes (BEH-222, DEBT-213) and when Cancel leaves seeks waiting (BEH-231)?
_Significance_: Defines the contract of the future frame backend (exact versus approximate frames) and which of the cache defects (DEBT-209, DEBT-210) are bugs.
_Proposed_: Cache mode = exact frames; mode switch should re-display `currentFrame`; Cancel should reject pending seeks.

**<a id='oq-205'>OQ-205</a>: Time units for steps (1 s, 10 s, 60 s) and fractional fps**
For videos with fractional `videofps` (211/12 = 17.58), should `forward2/3/4` and the buttons round to whole frames, and should the buttons use `videofps` instead of 20 (BEH-220, DEBT-216, DEBT-223)? How are `videofps` and `realfps` meant to differ ("should be equal unless broken encoder", `VideoList.js` comment), and which one defines the chronogram time axis (not established by the code read for this group; group 3 reads `starttime` and `realfps`)?
_Significance_: Step sizes and time labels depend on it; hidden behavior of `VideoFrame.__seek` with fractional frames is unverified.
_Proposed_: Round to integer frames, derive button steps from `videofps`.

**<a id='oq-206'>OQ-206</a>: Preview video and frame offset features**
Is the low-resolution preview video (`<video>.scale4.mp4`, BEH-227) still used now that Ctrl+mousemove in the chronogram uses cache-preview (BEH-226)? Is the `frameoffset` calibration a live feature? The code has two opposite sign conventions: seeks request media frame `f + frameoffset` (BEH-211, BEH-218) while `frameToTime` uses `(f - frameoffset)/realfps` (BEH-228, DEBT-221). Which one is intended?
_Significance_: Preview panel, `previewVideo`, `previewTimescale` and I/O status rows are unreachable; frame offset touches every seek and the time labels.
_Proposed_: Preview video is abandoned; frame offset is live and means "media frame = annotation frame + offset", so `frameToTime` should add it.

**<a id='oq-207'>OQ-207</a>: Intended keyboard step distances**
Confirm that Shift = 1 s, Ctrl = 10 s, Ctrl+Shift = 60 s (code, BEH-251) is intended, against the Quick Help values 1 s, 1 min, 10 min (DEBT-217). The extra step of Ctrl+Right is a defect (DEBT-201), not part of this question.
_Significance_: Decides the expected values in the key-binding characterization tests (BEH-251) and the new key map (DEC-005).
_Proposed_: 1 s / 10 s / 60 s; correct Quick Help.

**<a id='oq-208'>OQ-208</a>: Keyboard focus scope**
Shortcuts only work when focus is in the left column (`#left-side`), not after clicking a button or typing in the right column (BEH-250). Is that intended? How does a user normally regain focus (clicking the canvas)? Should arrow/space shortcuts also work from the right-side panels?
_Significance_: Defines the scope of the future shortcut manager and whether tests need a focus-setting step.
_Proposed_: Shortcuts global to the page except in text fields; Escape returns focus to the video.

**<a id='oq-209'>OQ-209</a>: Intended `p` (pollen) shortcut**
`p` is documented as "mark/unmark pollen" but does nothing (BEH-254, DEBT-206). DEC-005 keeps `p` for now. Should it toggle the `pollen` label on the active observation (like a label accesskey), which is the likely intent of the old `#P` checkbox?
_Significance_: Whether to preserve a no-op or implement the documented shortcut.
_Proposed_: Implement as label toggle `pollen` through the label shortcut mechanism.

**<a id='oq-210'>OQ-210</a>: Leave-page prompt only with unsaved changes?**
The page always asks for confirmation when the user reloads, closes the tab or navigates away, with the message "If you leave this page, all unsaved annotations will be lost. Are you sure?", even when nothing has changed (BEH-221). Should the prompt appear only when there are unsaved changes?
_Significance_: A characterization test would otherwise lock in an unconditional prompt (including the one triggered by an unhandled `Ctrl+Shift+R`); a conditional prompt needs a "dirty" notion tied to INV-001.
_Proposed_: Show it only when unsaved changes exist.

**<a id='oq-211'>OQ-211</a>: Switching video with unsaved edits**
Loading another video (BEH-203, BEH-204, BEH-234) keeps `Tracks`/`Tags` in memory and only displays the message "unsaved event/tag changes may be lost". Should loading warn, save, clear, or keep the annotations?
_Significance_: Decides whether loading a video is a destructive action that needs a guard and a test (INV-001), and whether annotations of video A may be shown on video B.
_Proposed_: Ask before replacing unsaved edits; clear the annotation model when the new video is loaded.

**<a id='oq-212'>OQ-212</a>: Enter key in the left column versus Quick Help**
The code makes `Enter` (and `Escape`) focus the ID field `#I` (BEH-253), while the Quick Help text read in the first pass describes Return as "validate and save current bee annotation". Is the Quick Help stale, or was a validate-and-save behavior lost?
_Significance_: DEC-004 keeps the code as reference, but a lost intent should be recorded before the key map is redesigned (DEC-005, DEBT-217).
_Proposed_: Keep the code behavior; correct Quick Help.

**<a id='oq-213'>OQ-213</a>: Owner of the server file picker**
`FilePickerFromServerDialog` (listing of files and directories from `/api/v1/rawdata/`, directory navigation, error message, Load/Preview buttons; defined in `labelBee.js`) backs the "From /data" video load (BEH-207) and other loaders. Which capability specifies its behavior (CAP-101 or CAP-702) and in which group does its test live?
_Significance_: Its behaviors are referenced by BEH-207 but not specified anywhere; a reimplementation of "From /data" depends on them.
_Proposed_: Specify it once in CAP-702 (local and server file load) and reference it from BEH-207 and BEH-214.

**<a id='oq-214'>OQ-214</a>: Frame shown right after a video has loaded**
Loading a video does not seek (BEH-234): `currentFrame` keeps the previous video's value until the next frame-changed callback, while the media element shows its first frame. Which frame must the UI show after a load: frame 0, the frame in the hash, or the previous frame number?
_Significance_: Defines the contract of `FrameSync` at load time (SEAM-201) and what a load test asserts; related to the lost delayed seek (DEBT-202, OQ-202).
_Proposed_: Frame 0 unless the hash gives a frame; `currentFrame` updated at once.

**<a id='oq-301'>OQ-301</a>: Tags, parts and individual events on the chronogram**
With the default renderer the chronogram draws no tag intervals, no falsealarm/wrongid crosses, no parts markers and no individual events (BEH-326, BEH-327, BEH-329, BEH-344, BEH-345, DEBT-301). Is this a regression the maintainer wants fixed (tags shown on the chronogram), or are those features retired together with their options (Show Tags, Show Individual Events, Highlight events with parts, Show on Chrono)?
_Significance_: Decides whether CAP-304 (Tag display) and the corresponding part of CAP-303 are required behavior or debt, and what a reimplementation must draw.
_Proposed_: Treat tag display as required (CAP-304 intent), parts/individual events as optional, and remove the legacy renderer afterwards.

**<a id='oq-302'>OQ-302</a>: What should the view-window controls do?**
Z+, Z-, the shift buttons, Follow and the custom double click all go through `xdomainFocus`, which cannot run with the D3 v6 zoom API (BEH-312, BEH-310, BEH-334, DEBT-304). What is the intended behavior to restore: shift by half the visible span, zoom by a factor of 2 around the current frame, Follow recentres on the track window after every frame change, and a double click zooms to the track window around the clicked frame (the current code intent), or should the double click keep d3's default zoom-in (x2 around the pointer)?
_Significance_: Determines the target behavior of the view-window API (BEH-312) and what characterization tests can assert.
_Proposed_: The intended behavior is as the code describes it (shift by half span, zoom by factor around current frame, Follow recentres on the track window); a double click zooms to the track window.

**<a id='oq-303'>OQ-303</a>: Tag-interval labels after a redraw**
`updateChrono` recomputes `tagIntervals` without labels or virtual intervals (BEH-328, DEBT-311), so `UnlabeledTag` mode lists every tag interval and "Hide FA/WrongID" is ignored for tag navigation. Is the intended behavior that the chronogram tag list always carries the labeling from the data pass (so unlabeled-tag navigation works), and is this regression known?
_Significance_: `UnlabeledTag` is a review workflow (finding tags without an event); a test must encode intent, not the current accident.
_Proposed_: The labeled, hide-invalid-filtered list (as built by the data pass) is the intended one.

**<a id='oq-304'>OQ-304</a>: Wheel with or without Shift**
Quick Help says Shift+Mousewheel zooms; the code defaults to no Shift needed (checkbox `#mousewheelMode` off) and the checkbox label says the opposite of its default (BEH-306). Is "wheel always zooms/pans over the chronogram" the intended default, and should the option remain?
_Significance_: Affects page scrolling while the pointer is over the chronogram; INV-002 expectation for annotators with trackpads.
_Proposed_: Keep the code default, fix the Quick Help later (DEC-004), keep the option.

**<a id='oq-305'>OQ-305</a>: Label colors and precedence on intervals**
The chronogram colors a merged interval with the last matching rule of `custom.css` (rules of equal specificity: fanning > pollen > leaving > entering) even though an interval may contain several labels (BEH-321). Is the precedence intentional, and how should wrongid/falsealarm (hidden when "Hide FA/WrongID") and user-defined labels (DEC-003) be shown?
_Significance_: Defines the display contract for generic labels.
_Proposed_: Keep the precedence for the four known labels; unknown labels use the gray default until the maintainer decides how label colors are defined.

**<a id='oq-306'>OQ-306</a>: ID Remap purpose and selection in modulo mode**
The "Modulo" remap folds several bee IDs onto shared rows. In that mode a click on the plot background only seeks, while a click on an interval still selects the original ID (BEH-318, BEH-331, BEH-332); the selected-ID row highlight is looked up by the original ID, which has no row after remapping (BEH-317, DEBT-317). Is the remap used (for example to see many tracks in few rows), and what should selection and highlight do in that mode?
_Significance_: If unused it can be dropped from the spec; otherwise tests need the semantics of rows shared by several IDs (selection highlight, navigation order).
_Proposed_: Keep as an optional view mode; keep the current click behavior (background seeks only, intervals select); highlight the remapped row of the selected ID.

**<a id='oq-307'>OQ-307</a>: ID order for mixed IDs**
`sortIds` (letters then number) is defined but the final row order is a numeric sort that mishandles non-numeric IDs such as flower IDs starting with `F` (BEH-315, DEBT-306). What order do users expect for mixed IDs?
_Significance_: Determines row order and thus Next/Prev ID and auto-seek order.
_Proposed_: `sortIds` order (alphabetic prefix, then number).

**<a id='oq-308'>OQ-308</a>: Dangling marks and the ROI**
Dangling marks depend on a hard-coded ROI and are always red by default (BEH-324, DEBT-308). Are they used to find tracks beginning/ending inside the arena, and should the ROI come from the user's ROI settings (`#useROI`)?
_Significance_: Behavior depends on the camera setup (5MP Gurabo videos only).
_Proposed_: Keep the marks, take the ROI from the configurable ROI.

**<a id='oq-309'>OQ-309</a>: Chronogram keyboard shortcuts and Ctrl-hover preview**
No key binding drives chronogram navigation and the Ctrl+mouse-move frame preview is implemented but not installed (BEH-340, DEBT-312). Should event navigation (next/previous event, next/previous ID) get shortcuts (DEC-005), and is the Ctrl-hover preview wanted back?
_Significance_: Decides whether the shortcut manager must include chronogram actions and whether the preview mode (`previewframe:*` events) stays in the seam with the video.
_Proposed_: Add shortcuts for next/previous event when the shortcut manager exists; leave the preview out until requested.

**<a id='oq-310'>OQ-310</a>: Clean obsolete events: rule and ownership**
The button "Clean obsolete Events" (BEH-343, DEBT-316) deletes from the live `Tracks`, after a confirm and without undo, every observation labeled `falsealarm` or `wrongid` that has no tag, or whose tag has `dm < 20`, or whose tag fails `tagsSampleFilterExcludeRects`. The confirm and tooltip texts describe the rule as "no associated tag or low DM or inside excludeRects" without the falsealarm/wrongid precondition. Is the rule (flagged observations only, DM threshold 20) the one the maintainer wants, should the confirm text state the precondition, and does this destructive action belong to the chronogram, to the filter area (CAP-801) or to the label area (CAP-601)? It conflicts with INV-001 as written.
_Significance_: The only destructive action of the chronogram file; decides whether INV-001 allows it (with confirmation), and which module owns it.
_Proposed_: Keep the rule as is behind the confirmation, move it out of the chronogram module, and add an undo or a save-before-delete requirement.

**<a id='oq-311'>OQ-311</a>: Tag navigation and the frame filter**
Event navigation (`event`, `eventframe`) is built from `flatTracks*`, which skip frames outside the active frame filter. For tags, `updateTagIntervals` and the legacy `getTTags` branch apply no frame filter; in the default `Tracks` branch the tags come from `flatTags = getFlatTags(false)` (commented "noFilter"), whose body (it pushes `chronoObs.obs.tag`) was not seen, so whether the frame filter applies there is open (BEH-348). Should `tag` and `freetag` navigation respect the frame filter like event navigation does?
_Significance_: Determines whether `tag`/`freetag` navigation may leave the filtered frame range, and what a test of the frame filter must assert for tag modes.
_Proposed_: Tag navigation respects the frame filter, as event navigation does (to be confirmed after the `flatTags` build is checked).

**<a id='oq-312'>OQ-312</a>: First/Last in AutoSeek with `eventframe` mode**
`gotoFirstEvent`/`gotoLastEvent` in AutoSeek mode pass the first/last row ID as the ID to select. In `eventframe` mode the search itself ignores IDs, but the move still selects that ID (`gotoFrameId(newframe, id)`), so pressing First changes the selected bee to the first row (BEH-338, BEH-336). Is changing the selection in `eventframe` mode intended, or should `eventframe` keep the current selection as Next/Prev do without `from`?
_Significance_: Decides whether First/Last in `eventframe` mode may change the selected bee; affects annotators who browse frames with events while an ID is selected.
_Proposed_: Keep the current selection in `eventframe` mode (the ID plays no role there).

**<a id='oq-401'>OQ-401</a>: Intended rules of Shift+click box prediction**
The code looks, within the track window (default 10 frames backward), for the closest annotated box center within 120 video pixels (a hard-coded `predictIdClickRadius`, no UI), then for any tag within 120 px (first found, not closest) and prefers the tag for ID and position when both agree (BEH-422, BEH-423). On an ID conflict the geometry of the match is dropped (DEBT-404). Which of these rules are intended, and should the radius and the choice "first tag in order" be kept? (Whether the predicted angle should be copied is [OQ-409](#oq-409).)
_Significance_: This is the most used creation path (OQ-005); a characterization test must freeze either the observed or the intended rule.
_Proposed_: Keep observed behavior, closest tag instead of first only if the maintainer confirms.

**<a id='oq-402'>OQ-402</a>: Which video display modes are in routine use**
Besides the cached-image mode (`useImageCache`), the code has `video`, `preview`, `cache-preview`, `showImageDiff` and a non-copy mode (`flagCopyVideoToCanvas` false) in which the `<video>` element is displayed beneath a cleared canvas (BEH-404, BEH-405, DEBT-408). The non-copy mode is unreachable today (the flag is only ever true). Are `preview`, non-copy and `Image Diff` still used?
_Significance_: Decides how many rendering paths the refactored frame source must reproduce.
_Proposed_: Keep video, cache and preview; remove non-copy (dead), treat Image Diff as experimental.

**<a id='oq-403'>OQ-403</a>: Missing leaf capability for the canvas view**
CAP-401..403 cover boxes, tags and skeleton, but the canvas size, zoom/pan, video painting, option toggles, interaction modes and the track window (BEH-404 to BEH-411, BEH-440, BEH-443, BEH-450 to BEH-452, BEH-457) belong to none; they are filed under the group CAP-400. Should a leaf be added (for example "CAP-404 Overlay canvas, zoom and options")?
_Significance_: Without it these behaviors have no leaf owner; the track window is also shared with the chronogram (CAP-301).
_Proposed_: Add CAP-404 for the canvas view, keep the track window there.

**<a id='oq-404'>OQ-404</a>: Owner of the pick-frame (Set Span) mode**
`setInteractionMode('pick-frame')`, the span panel in `hardRefresh` , the pick-frame timeline and Pick Flower buttons and the "Draw timeline" button live in `OverlayControl.js` but edit the event `span`, and visits (`edit-visit`) are CAP-602 (BEH-440, BEH-441, BEH-450 to BEH-452). Is the event span part of pollination visits, a general event feature, or experimental?
_Significance_: Decides which group specs the panel buttons and the `span` field written into `Tracks`.
_Proposed_: Group 6 specifies the span panel and timeline; this file only specifies the mode switch.

**<a id='oq-405'>OQ-405</a>: Clicking the background: deselect or keep the selected ID**
A background click clears the visible selection but keeps `defaultSelectedBee`, so the next refresh (frame step) re-selects that ID when present; only "Select diff. time" calls the explicit `deselectBee` (BEH-421, BEH-427). The step that keeps `defaultSelectedBee` (`onObjectDeselected`) was not re-read. Is the persistence of the selected ID across a background click intended?
_Significance_: Changes what a test of "click empty canvas then step frame" expects. Inferred from reading, not run (depends on Fabric events).
_Proposed_: Treat as accident; keep until verified in the running app.

**<a id='oq-406'>OQ-406</a>: Hard-coded ROI and exclusion rectangles**
The defaults `175,250,2305,1240` and four 50x50 exclusion rectangles are those of the Gurabo 5 MP videos (BEH-446); other datasets (beefeeder, flowerpatch, mango) start from them too. Should defaults depend on the video, and are the ROI and the exclusion rectangles stored with the annotations anywhere?
_Significance_: They filter tags, and the ROI also filters chronogram intervals (CAP-801); a characterization test depends on the default state.
_Proposed_: Keep as is, flag as dataset-specific defaults.

**<a id='oq-407'>OQ-407</a>: Notes inheritance when creating a box**
`addRect` for a new box sets `obs.notes` from the `#notes` text area at creation time (BEH-433, `addRect` calls `updateObsActivityFromForm`, whose body was not re-read; `Observation` defaults `notes` to the empty string). If a box with notes is selected when another is created, the new one may inherit those notes; labels are not inherited, flags fanning/pollen are copied from the predicted box. Is the inheritance of notes intended?
_Significance_: Affects data written for each created annotation (INV-001). Not run, depends on form state at mouse-down.
_Proposed_: Treat as accident: new boxes start with empty notes.

**<a id='oq-408'>OQ-408</a>: ID edit on a new box that conflicts with an existing ID**
Pressing Enter in `#I` for a pending box whose typed ID already exists in the frame makes `submit_bee` refuse (red "Conflict of ID"), but the handler then prints the green "ID changed + submitted" and sets `defaultSelectedBee`; the box keeps the attempted ID, unsaved (BEH-434, DEBT-405). What should happen: refuse and keep the red message, revert the ID, or swap like the committed-box case?
_Significance_: A characterization test must freeze either the current misleading success message or the intended refusal; it also decides the return-value contract of `submit_bee`.
_Proposed_: Treat as a defect: show the conflict message only and keep the box pending with its previous ID, once the maintainer confirms.

**<a id='oq-409'>OQ-409</a>: What Shift+click prediction should copy**
When a box is created from a predicted observation (BEH-422, cases a and c) it copies position, size and the flags `bool_acts[0..1]` (fanning, pollen) but not the angle (it defaults to 0), the `labels` string or the notes (DEBT-406). Is the angle meant to be copied, and should labels be copied consistently with the two flags?
_Significance_: Defines the content of each annotation created by the most used path (OQ-401); the label part is tied to the label semantics of DEC-003.
_Proposed_: Keep the observed behavior; copy the angle only if the maintainer confirms.

**<a id='oq-410'>OQ-410</a>: Status of the timeline and Pick Flower features**
The "Draw timeline (Experimental)" button preloads the wrong frames (DEBT-414), the pick-frame timeline buttons and `TimelineWidget` have broken zoom and size handling (DEBT-413), and Pick Flower (BEH-452, DEBT-415) searches flowers in frame 0 only and writes `visit.flowerid` straight into `Tracks`. Are the experimental timeline, the pick-frame timeline and Pick Flower in use, abandoned, or to be kept as they are?
_Significance_: Decides whether these items get characterization tests or are dropped from the refactor scope (BEH-441, BEH-451, BEH-452).
_Proposed_: Treat all three as experimental and out of the first test set.

**<a id='oq-411'>OQ-411</a>: Characterizing known crashes**
Some paths throw: the "Transparent prediction" option on any pending box (BEH-417, DEBT-409), `wrapText` on `null` notes or undefined labels (BEH-456), `refreshCanvasSize` with canvas logging on (DEBT-408), a syntax error in a filter text (DEBT-411). Should the characterization tests freeze the current exception, or only the intended behavior (a guarded lookup, a visible message)?
_Significance_: A test that freezes a crash blocks fixing it during the refactor; a test of the intended behavior fails on the current code.
_Proposed_: Record the crash as a known failure and test the intended behavior, once the maintainer confirms the intended outcome per case.

**<a id='oq-412'>OQ-412</a>: Leaving the visit edit mode by clicking**
In `edit-visit` mode with no pick mode active, any click, on a box or on the background, returns to `main` (BEH-457, BEH-440); the code comment says "Cancel if clicked in the background". Is cancelling on a click on a box intended?
_Significance_: Decides whether a click on a box in that mode should also select it, which a visit-editing test depends on.
_Proposed_: Keep the observed behavior (any click cancels) and flag it as probably unintended for box clicks.

**<a id='oq-413'>OQ-413</a>: Exclusion rectangle created from an annotation**
"Add" turns the selected annotation into an exclusion rectangle from its unrotated `x, y, width, height` (angle ignored) and deletes the annotation, which can be undone once; the refresh is called twice (BEH-446). Is deleting the annotation intended, and should a rotated box give its bounding rectangle?
_Significance_: The rectangles filter tags (CAP-801) and the deletion removes data; the test must know whether the deletion and the angle handling are part of the contract.
_Proposed_: Keep the observed behavior; no change for the angle until a rotated exclusion case is reported.

**<a id='oq-501'>OQ-501</a>: Keys inside the zoom view and the global key map**
`#videozoom` is inside `#right-side`, the global key handler is bound only on `#left-side`, so while the focus is in `#videozoom` only `ZoomOverlay.onKeyDown` runs (Delete, `d`, Backspace, `Ctrl+r`, `+`, `-`); frame keys (arrows, `<`, `>`, `p`, Space) and label keys (1-0) are inactive there (BEH-515). Is that intended, or should the zoom forward unhandled keys to the global handler?
_Significance_: A characterization test of keyboard navigation must state which keys work with the focus in the zoom panel.
_Proposed_: Forward unhandled keys to the global handler (DEC-005 key map by focus scope); only once the maintainer confirms.

**<a id='oq-502'>OQ-502</a>: Keypoint vocabulary and skeleton shape**
Which part names are the real vocabulary (code defaults: head, thorax, abdomen, antL/R, pollenL/R, legL/R; CAP-501 text says head, neck, thorax, waist, tail)? Should the list be tied to a video, a project or the annotation file (BEH-516, BEH-517, BEH-528)? (The main overlay draws `obs.parts`, BEH-527; other consumers were not in the evidence.)
_Significance_: Decides the template format and what the characterization tests assert for parts.
_Proposed_: Code defaults are the reference now; templates as a later feature stored with the annotation set.

**<a id='oq-503'>OQ-503</a>: Keypoint preset files on the server**
Where do the presets served at `/rest/config/keypointlabels/` live in the current app (the route is only in `labelbee/legacy/views.py` and the directory `static/data/config/keypointlabels/` was not found in the repo)? Is the "Preset..." button working in the deployed app (BEH-530, DEBT-513)?
_Significance_: Cannot be specified or tested without the endpoint and a sample file.
_Proposed_: Treat as live; the maintainer supplies a sample preset file and the endpoint.

**<a id='oq-504'>OQ-504</a>: Meaning and lifecycle of tag fixes**
What is the intended workflow for `wrongid`/`fix`: (a) is the `newid` fix meant to stay on the observation (chronogram virtual tag) with "Apply All Tag Fixes" an export-time step, or is baking part of normal work; (b) should a rotation-only fix leave `tag.id` unchanged (the code sets it to `undefined`); (c) should "Undo All" also clear `obs.fix`; (d) what state is expected after the `wrongid` label is removed ([OQ-509](#oq-509)) (BEH-532, BEH-535, BEH-538, BEH-543, DEBT-517)?
_Significance_: Defines expected values in tests of the fix pipeline and what is saved in `Tags`.
_Proposed_: (a) fix stays on obs, bake is an explicit step; (b) tag id unchanged; (c) no, undo reverts tags only.

**<a id='oq-505'>OQ-505</a>: Tags-only tag mode**
`tagMode` is initialised to `'Tracks'` (`OverlayControl.js:5`) and is never assigned elsewhere in `labelbee/static/labelbee/js` (grep), so the `Tags` branch of `getTag` (`OverlayControl.js:2695-2705`) and the `else` branches reading `Tags` in `ChronoControl.js` (lines ~666, 1332, 1368) are unreachable in the app. In mode `Tracks` the tag fix is visible because `augmentTrackWithTag` aliases `obs.tag` to the `Tags` entries (BEH-533, DEBT-515). Is a `Tags`-only mode planned, or can that branch be dropped?
_Significance_: Decides whether the reimplementation must keep two tag sources.
_Proposed_: Drop the `Tags` branch, keep the alias semantics (only once confirmed).

**<a id='oq-506'>OQ-506</a>: Alternate tag sources**
Is the Hamming-matrix source (disabled, no toggle) to be dropped, and are "From image" (re-reading the code from pixels) and "From focus" both routine (BEH-534, DEBT-516)? Is the one-refresh lag of the image-based list (DEBT-506) noticeable by users?
_Significance_: Decides which behaviors a reimplementation must keep.
_Proposed_: Keep both active sources; drop the matrix source.

**<a id='oq-508'>OQ-508</a>: Where are the tag code tables and tag images served from?**
`ZoomView.js` fetches `/data/tags/tag25h5inv/tag25h5_bin.json`, `.../tag25h5_hamming_matrix_5-6.json` and `/data/tags/tag25h5inv/png/keyed<NNNN>.png` through `url_for`. The review found no such files in the worktree (`find` for `tag25h5_bin.json` and `keyed*.png`: none). Which route or directory serves them in the deployed app, and are they versioned anywhere (BEH-514, BEH-534, SEAM-503)?
_Significance_: The alternate-tag panel, the tag reference image and the "From image" source cannot be specified or tested without them.
_Proposed_: The maintainer supplies the data location and a sample (or a fixture to use in tests).

**<a id='oq-509'>OQ-509</a>: State after removing the wrongid label**
Toggling the `wrongid` label off runs `updateObsLabel` and `updateButtonsForLabel`; nothing clears `obs.fix`, `obs.newid` or the spread tag corners and `spreadTagFix` is not called, so the zoom and the chronogram keep showing the fix (BEH-543). Is that intended, or should removing the label reset the fix?
_Significance_: Defines the expected state after a label toggle in tests, and what "Undo" means (OQ-504).
_Proposed_: Removing the label resets the fix (obs and tags); not used until the maintainer confirms.

**<a id='oq-510'>OQ-510</a>: Dragging a bee box while Auto-label is on**
`object:moving` is bound to `ZoomOverlay.selectionChanged`, which calls `syncFromTracks`, which restarts the auto-label sequence at the first label on every move event (`labelBee.js:168`, `ZoomView.js:348,381`). Is it intended that moving the bee box resets an auto-labelling in progress (BEH-526, DEBT-502)?
_Significance_: Characterization test for drag combined with Auto-label; decides whether `object:moving` should be bound at all.
_Proposed_: Rebuild the zoom only on selection change and on `object:modified`, not on each move.

**<a id='oq-511'>OQ-511</a>: Clicking the colour dot of a label button**
The dot `<span>` inside a label button has no `data-label`, so clicking it calls `selectLabel(undefined)` and deselects the current label, while clicking the text selects it (BEH-542). Is the dot meant to be a click target (for example to change the colour), or is the behaviour an accident?
_Significance_: Decides whether a reimplementation reproduces the deselection.
_Proposed_: Treat as an accident: a click anywhere on the button selects the label.

**<a id='oq-601'>OQ-601</a>: Which labels are predefined, and are the single-letter aliases intended?**
The panel shows 11 labels (fanning, non-fanning, stretched-wings, pollen, entering, leaving, walking, expulsed, expulsing, falsealarm, wrongid), not the six of DEC-003, and `labelMap` rewrites `f`, `p`, `e`, `d`, `l`, `departing` (BEH-601, BEH-604, BEH-610). Which of the 11 are the reference set for plugins, and may the aliases be dropped (normalized once at load) while old files stay loadable?
_Significance_: Defines the vocabulary tests assert and whether alias rewriting must be preserved.
_Proposed_: The 11 are the current default set; aliases kept only as a load-time migration.

**<a id='oq-602'>OQ-602</a>: Should notes be saved on blur, not only on Enter?**
Notes are committed only by Enter in `#notes`; text left by Tab or click is lost (BEH-606).
_Significance_: Decides whether a characterization test keeps this loss or specifies it as a defect.
_Proposed_: Treat as defect (DEBT), keep current behavior until a step fixes it.

**<a id='oq-603'>OQ-603</a>: Are pollination visits (V-P-F, ID prefixes P/F) and the legacy Pick Flower in use?**
Visits rely on ID prefixes `P`/`F` and a `span` that creation drops (BEH-613, BEH-616, BEH-625, BEH-644). Which projects (flowerpatch, mango?) use them, which form is current, and is the missing initial `span` expected?
_Significance_: Decides whether to specify, fix or drop CAP-602 and its data format.
_Proposed_: Keep the V-P-F form as current, treat `visit.flowerid` as legacy to drop.

**<a id='oq-604'>OQ-604</a>: Is the observation-table tooltip and flash on selection wanted?**
CAP-603 describes a tooltip and a flash on selection; the code has a hover style and click-to-goto only (BEH-628, BEH-629).
_Significance_: Decides whether the missing feature is a gap or the CAP text is stale.
_Proposed_: Correct the CAP text to the code if the maintainer confirms.

**<a id='oq-605'>OQ-605</a>: Is the TimelineWidget block meant to be finished or removed?**
`TimelineWidget` (block "Timeline", hidden by default) is never fed and breaks after the first Size click, while pick-frame has a working timeline (BEH-621, BEH-646).
_Significance_: Avoids writing tests for a dead feature.
_Proposed_: Treat as dead; drop with the refactor of OverlayControl.

**<a id='oq-606'>OQ-606</a>: Should undo cover more than deletion, and should the stack reset per video?**
OQ-009 already answers that undo is wanted. Only the scope and the per-video reset are open (BEH-638, BEH-639).
_Significance_: Defines the scope of any undo test and of a command-based redesign.
_Proposed_: Specify current behavior now; plan general undo as a feature with a per-annotation-set stack.

**<a id='oq-607'>OQ-607</a>: Is the unconditional `Delete`/`Backspace`/`d` deletion without confirmation intended?**
Single-key deletion of the selected observation (BEH-636) is protected only by the undo entry.
_Significance_: Affects the "no annotation loss" invariant (INV-001) and the future shortcut manager (DEC-005).
_Proposed_: Keep; note `d` as a candidate to remap.

**<a id='oq-608'>OQ-608</a>: Which frame should a visit be stored in when its pollinator or flower was picked in another frame?**
`VisitWidget.newVisit` stores the visit at the current frame and takes the box positions of the two picked observations, which may come from other frames (BEH-616, BEH-614).
_Significance_: Decides whether the visit's frame is the pick frame, the current frame, or the pollinator's frame, and so which `??` cases in the panel are bugs.
_Proposed_: Keep the current frame; the panel shows `??` for objects missing in that frame.

**<a id='oq-609'>OQ-609</a>: Should pick-frame Set Start and Set End reject an order inversion, as the visit panel's Set does?**
The visit Set refuses a span that would not contain the visit's frame (BEH-619); pick-frame Set Start/End writes the current frame with no check (BEH-645).
_Significance_: Decides whether the two span editors share one rule in a refactor, and whether a test pins the unchecked write.
_Proposed_: Apply the visit rule to both once the maintainer confirms.

**<a id='oq-610'>OQ-610</a>: Which JSON format is the label-list interchange: `labelListArray` (Edit dialog) or `labelButtonsArray` (Preset loader)?**
The Edit dialog writes and reads `labelListArray`; the server preset loader reads `labelButtonsArray` (BEH-609, BEH-647).
_Significance_: A list saved by one tool cannot be loaded by the other.
_Proposed_: Accept both keys on load and write `labelListArray`.

**<a id='oq-611'>OQ-611</a>: Should SwapID refuse an empty or unchanged new ID?**
The new ID is used as typed: an empty value creates observations with ID `""`, an unchanged value is a no-op with a misleading frame count (BEH-648).
_Significance_: Decides whether the swap is a validated command or a raw rename.
_Proposed_: Refuse both with a message; keep the rename itself.

**<a id='oq-612'>OQ-612</a>: Is creating `visit = {}` when the Pick Flower panel opens intended?**
Opening the panel sets `visit = {}` on the observation before any pick; an observation with any `visit` value is treated as a visit on selection, so the visit panel (and its Delete) then acts on an ordinary bee (BEH-644, BEH-620, BEH-625).
_Significance_: Decides whether the field should only be created on an actual pick, and whether a selection test must pin the current side effect.
_Proposed_: Create `visit` only when a flower is picked; treat the current behavior as a defect (DEBT-618).

**<a id='oq-613'>OQ-613</a>: When picking a pollinator or flower on the overlay, is the clicked box also selected?**
`onMouseDown` consumes the click in edit-visit mode, but the Fabric `object:selected` binding may fire on the same press and change the current ID and form (BEH-615). The code read does not settle the order or the effect; it needs a run.
_Significance_: Decides whether the pick leaves the previous selection intact, which changes what a pick test asserts.
_Proposed_: Verify by running before recording it as an intent; until then leave it out of tests.

**<a id='oq-614'>OQ-614</a>: Should the label list reject accesskeys that built-in shortcuts already use?**
Because `labelsProcessKey` runs last, an accesskey equal to `d`, `p`, `r`, a navigation key, space, Enter or Escape never fires, with no warning in the list dialog (BEH-608, DEBT-620).
_Significance_: Defines the reserved-key set of the future shortcut manager (DEC-005) and what the dialog validates.
_Proposed_: Reject (or warn about) reserved keys when editing the list; keep `p` reserved while the pollen shortcut is undecided.

OQ-704 was never issued (numbering gap kept: ids are never renumbered).

**<a id='oq-701'>OQ-701</a>: Which observation fields must survive an edit**
`copyObs` drops `span`, `tag` and unknown fields, and never clears `visit` (BEH-704, DEBT-702): copying over an observation that has a `visit` from a source without one leaves the old `visit`. OQ-003 says all `Observation` fields are preserved on load and save: does that include fields added by newer producers that LabelBee does not know, is `span` meant to be lost when an observation is edited or undone, and should an edit be able to clear `visit`?
_Significance_: Fixes the field whitelist of the data contract and what a characterization test of edit-then-save must expect.
_Proposed_: Pass-through of unknown fields at load/save (already true at load and save, not at edit), `span` preserved by edits, `tag` treated as runtime-only, `visit` cleared when the source has none.

**<a id='oq-702'>OQ-702</a>: Should `tag` and `span` be in saved files**
The v2 save writes `obs.tag` (whole tag record) and `span` into each event whenever they are present in memory (BEH-708, DEBT-704). ENT-001 says `tag` is not saved, while OQ-003 says all `Observation` fields are preserved on load and save; note that `tag` is a runtime attachment (assigned by `augmentTrackWithTag`) or an import-time field (`tracks_tagged`, BEH-736), not one of the fields created by `new Observation` (ENT-001). Is the embedded tag wanted in the files (e.g. for the `tracks_tagged` workflow, where it is the only tag source)?
_Significance_: Decides the save whitelist and whether files are reproducible regardless of UI state.
_Proposed_: `tag` is not saved when it came from `Tags`; it is kept when it came from a `tracks_tagged` import; `span` is saved. Both consistent with OQ-003 only if "Observation fields" is read as the ENT-001 field list.

**<a id='oq-703'>OQ-703</a>: Are v1 events files and ID-less events still produced anywhere**
Load of v1 (no `info`) files keeps the file's `ID` and `bool_acts` and does no normalization (BEH-718, DEBT-711), while v2 files regenerate `bool_acts` from `labels` and require `id` (BEH-717). Do archives still contain v1 files, and may they lack `bool_acts` or `labels`?
_Significance_: Decides how much of the v1 reader a test suite and the future importer must reproduce versus normalizing.
_Proposed_: Normalize v1 like v2 on load (derive `ID` from the key, `bool_acts` from `labels`, `labels = ""` default) since behavior is otherwise a crash on export.

**<a id='oq-705'>OQ-705</a>: Order of the file list in the "recent" dialog**
The "recent" dialog loads `response.data[0]` assuming the server returns newest first (BEH-725); the advanced dialog lists all returned files and sends `allusers` as the string "true"/"false" (BEH-726, DEBT-717). What do group 1's endpoint order and `allusers` handling really guarantee?
_Significance_: The "most recent file" semantic and the all-users filter cannot be tested from the client alone.
_Proposed_: Server sorts by timestamp descending; client sends `allusers=1` only when ticked and omits it otherwise.

**<a id='oq-706'>OQ-706</a>: Is server loading of tags supposed to work**
The tag branch requests `rest/v2/annotation/<id>` and always shows an error afterwards because `tagsFromServer` returns before the request completes (BEH-728, DEBT-719). A search of `rest/v2` in `labelbee/` finds no `annotation/<id>` route there (only video, dataset and video-data routes). Is there a deployment where this route exists, or are tags only meant to come from local files and the CSV imports?
_Significance_: Decides whether "Load Tags" from the server is a behavior to preserve, to repair, or to drop, and whether tags are ever stored server-side.
_Proposed_: Treat as broken; tags stay local/CSV until a tag record API is specified.

**<a id='oq-707'>OQ-707</a>: Lineage semantics of created_from_id**
`created_from_id` is the id of the last event file loaded from the server through the dialog, never reset, and not updated after a save (BEH-730, DEBT-721); loading by URL fragment does not set it (BEH-731). Is it meant to be "the record this work was derived from", reset when work starts from a local file or a CSV import, and should it advance to the saved record after a save?
_Significance_: Defines the version-lineage tree stored by group 1 (DEC-002) and what a save test asserts.
_Proposed_: Reset on local/CSV load and erase; set to the new record id after a successful save and after a URL-fragment load.

**<a id='oq-708'>OQ-708</a>: Fixed 300x600 box and +90 angle in CSV imports**
All external-tool imports hard-code a 300x600 px box centered on `(cx,cy)` and `angle + 90` (BEH-735, BEH-736, DEC-001). Are these conventions of the current producer (cyindibee `cb`) valid for all videos, or should size and angle offset come from the file or the video info?
_Significance_: These constants are part of the data contract with the producer; changing resolution or marking would silently break imported boxes.
_Proposed_: Keep as the documented contract for the `cb` CSV, and record them in the file `info`.

**<a id='oq-709'>OQ-709</a>: How are the experimental DB sources activated**
OQ-004 was answered "all active, including experimental DB sources", but SQLiteDB.js, DuckDB.js and the SQLite console panel are reported commented out in the page (earlier read, not re-verified) and `loadTracksCSVFromDB` has no caller (BEH-740, BEH-741, BEH-742, DEBT-729). Is a developer expected to uncomment them, and which of SQLite or DuckDB is the intended future path?
_Significance_: Without an entry point there is nothing to characterize; the module boundary (SEAM) for tracks sources depends on which engine stays.
_Proposed_: Specify only the conversion contract (SQL `data` table to tracks) and treat the UI as developer-only.

# Grill questions, group 7 (annotation model and IO), new after the critic review

**<a id='oq-710'>OQ-710</a>: Silent replacement of unsaved work on load and erase**
Loading events from a local file, from the server dialog, from a CSV or from the URL fragment, and "Erase Events" (after its confirm) replace `Tracks` without checking for unsaved changes (BEH-714, BEH-715, BEH-720, BEH-727); the only guards are the dialog warning "unsaved changes may be lost" and a `beforeunload` prompt that fires on every page leave, dirty or not (BEH-709, DEBT-705). Is replacing unsaved work without confirmation intended?
_Significance_: Decides whether a dirty flag and a pre-load confirmation belong to the specified behavior (INV-001) or to a later improvement; characterization tests currently assert no prompt.
_Proposed_: Treat the current behavior as the reference and add a dirty-flag confirmation as a separate decision.

**<a id='oq-711'>OQ-711</a>: Duplicate v2 entries: which one is kept and how it is reported**
When two events of one frame share an `id`, the first in file order is kept, the others are dropped with a console warning, and a single `alert` says "Current version of software deleted redundant events" (BEH-719). Is "first wins" intended (versus last wins or merge), and is the blocking alert the wanted way to report it?
_Significance_: The array format of v2 exists to allow duplicate ids (comment in `sanitizeEvents`); the choice decides which data is lost on load of such a file.
_Proposed_: Keep first-wins; report through a non-blocking warning list returned by the decoder.

**<a id='oq-712'>OQ-712</a>: Should the whole videoinfo be embedded in every saved events file**
The v2 save writes `info.videoinfo` as the full live `videoinfo` object (name, `videoPath`, `preview` sub-object, `tags`, ...) into every local and server save (BEH-710, BEH-711, DEBT-706). Is that content wanted (reproducibility, provenance), or only a subset (privacy of paths, file size)?
_Significance_: Defines the `info` part of the data contract (ENT-004) and what a round-trip test must expect.
_Proposed_: Embed a documented subset (name, `videoPath`, `nframes`, `videofps`).
_Answer_: Keep the whole `videoinfo`, deep-cloned rather than aliased; `preview` is only a URL, so size is not a concern (maintainer, 2026-11-12, for slice 2 step 4, [Q16](#q16)).

**<a id='oq-713'>OQ-713</a>: Frame key versus ID divergence in v2 load**
In a v2 file the in-memory key is `String(evt0.id)` but a field `ID` present in the event overrides `evt.ID` (BEH-717), so `Tracks[f][key].ID` may differ from `key`; the v2 save never writes `ID` (BEH-710), so only third-party or hand-edited files can do this. Should a file-level `ID` be allowed to disagree with `id`?
_Significance_: Model functions index by key while views and exports (BEH-738, BEH-739) print `obs.ID`; a mismatch yields inconsistent selection and exports.
_Proposed_: `id` is authoritative; ignore or overwrite a file-level `ID`.

**<a id='oq-714'>OQ-714</a>: Is a v2 file without data an empty model or an invalid file**
An `info`-valid file with no `data` (or `null` / `[]`) loads as an empty model and replaces the current Tracks with no message (BEH-746, DEBT-734). Is loading a data-less file as "empty events" intended (for instance to start from the notes of a template), or should it be rejected like an unsupported type?
_Significance_: INV-001: a truncated or mis-exported file wipes the work in memory without warning.
_Proposed_: Reject (or ask for confirmation) when `data` is absent; accept an explicit `{}`.

**<a id='oq-715'>OQ-715</a>: What does "all Observation fields are preserved" cover**
The answer to OQ-003 says all `Observation` fields are preserved on load and save. The v2 save removes `ID`, `bool_acts`, `marked` and `permanent` (BEH-710); `ID` and `bool_acts` are rebuilt on load (`ID` from `id`, `bool_acts` from `labels`), `marked` and `permanent` are lost, and numbers `x, y, width, height, cx, cy` are rounded to 3 decimals. Do those rebuilds and the rounding satisfy the answer, or must the file carry the four fields and full precision?
_Significance_: Fixes the exact save whitelist and precision of the data contract that downstream analysis relies on (INV-001, INV-003).
_Proposed_: Rebuild is acceptable (derived fields), `marked` and `permanent` are obsolete (commented out in `Observation`), rounding to 3 decimals stays.

**<a id='oq-801'>OQ-801</a>: Are free tags (tags without a matching observation) meant to be shown?**
In `tagMode == 'Tracks'` (the only reachable mode), tag intervals are built only from tags attached to an observation (BEH-810, DEBT-807). The legacy mode showed all tags. Should the spec preserve "free tags invisible", or is that a regression from the move to tracks_tagged data? CAP-304 mentions "free tags".
_Significance_: Decides whether the pure tag pipeline takes `Tags` or only attached tags, and whether the Tag filtering panel can affect unattached detections.
_Proposed_: Preserve current behavior (only attached tags), record free tags as a feature gap.

**<a id='oq-802'>OQ-802</a>: Hide Flowers: scope and rule**
`hideFlowers` hides IDs starting with "F" only in the chronogram rows (BEH-820, DEBT-813), not in the observation table, event navigation or tag intervals. Is that intended? Is "F prefix = flower" a stable convention for the flowerpatch videos?
_Significance_: Defines the single filter stage and the test expectations for navigation with the button on.
_Proposed_: Treat as accident; apply the filter to all list products only after confirmation.

**<a id='oq-803'>OQ-803</a>: Default DM minimum 20**
`#tagsMinDM` defaults to 20, hiding tags with dm < 20 whenever the loaded tag file has DM (BEH-826). Is that the intended default, and should `cleanObsoleteEvents`, which uses a literal 20 (BEH-833), follow the field?
_Significance_: Both change what a first-time user sees and what clean-up deletes.
_Proposed_: Keep both as is; make clean-up use the setting only after confirmation.

**<a id='oq-804'>OQ-804</a>: Custom JavaScript filter boxes**
The sample and interval "return true" boxes run user-written code (BEH-828, BEH-844). Are they used in practice, and should they stay as an advanced option? (The third box, the ID filter, has no caller and is proposed for removal in DEBT-819, not asked here.)
_Significance_: Decides whether the filter configuration can be pure data, and bears on a security review.
_Proposed_: Keep sample and interval filters as an advanced option.

**<a id='oq-805'>OQ-805</a>: Scope of obsolete-event clean-up**
`cleanObsoleteEvents` deletes only falsealarm/wrongid observations lacking a tag, with dm < 20, or in exclude regions (BEH-833), over the whole video and ignoring the active filters. Is "whole video, ignoring filters" intended, and do these three rules match the maintainer's workflow (DEBT-821)?
_Significance_: Destructive; defines the safety tests for the command once undo exists (OQ-009).
_Proposed_: Keep the rules; require a preview list before deletion once undo exists.

**<a id='oq-806'>OQ-806</a>: interpolateTags, computeMotionDirection and the hamming 1000 sentinel**
No call to `interpolateTags` or `computeMotionDirection` was found in the page (BEH-834, BEH-835, DEBT-822, DEBT-823). Is console use expected, and should the sentinel `hamming == 1000` be kept (is it also produced by external tools, BEH-813, DEBT-809)?
_Significance_: Remove versus rewrite as a pure stage; the sentinel is part of the file contract if external.
_Proposed_: Treat the two functions as dead; keep the sentinel semantics in the tag-interval stage until confirmed.

**<a id='oq-807'>OQ-807</a>: Row of a virtual (wrongid) tag interval**
The virtual interval created for a wrongid annotation carries `id = newid` but keeps `y` of the old ID, so it is drawn on the old row (BEH-816, DEBT-812). Is the ghost on the old row the intended display, or should it appear on the new ID's row?
_Significance_: Decides the expected output of the labelling stage and the chronogram test.
_Proposed_: Preserve current behavior until confirmed.

**<a id='oq-808'>OQ-808</a>: Should "Reinit" reset the ROI?**
"Reinit" (`updateROIFromVideo`) writes the full video size into the `#ROI` text but leaves the `ROI` global unchanged, so the text and the active ROI differ until the text is edited (BEH-827, DEBT-824). Is a real reset to the full frame intended?
_Significance_: Decides whether the ROI test expects the old region or the full frame after Reinit, and whether the text box is the source of truth.
_Proposed_: Set `ROI` from the video size in Reinit; confirm before changing.

**<a id='oq-809'>OQ-809</a>: Exclude-region "+" deletes the selected observation**
The "+" button adds an exclude rect from the selected observation and then deletes that observation (undoable through `undoPush('delete')`) (BEH-840). Is the deletion intended, and should undoing the delete also remove the rect?
_Significance_: A destructive side effect of an apparently additive button; fixes the expected result of the characterization test.
_Proposed_: Keep as is until confirmed; otherwise split into "add rect" and "delete".

**<a id='oq-810'>OQ-810</a>: Owner of the ROI overlay drawing**
`plotROI` draws the ROI outline and the white shading outside it when the ROI flag is on (BEH-842). It lives in the tag filter code but is a display on the video overlay. Should it be specified with the ROI filter (group 8) or with the overlay display (CAP-400)?
_Significance_: Avoids a behavior with no owner or a duplicated one in the overlay specs.
_Proposed_: Keep BEH-842 in group 8 with a link to CAP-400; move it if group 4 already covers ROI display.

**<a id='oq-811'>OQ-811</a>: Tag rows when "Show Events" is off**
With Show Events off, `chronogramData` is empty and the axis ID domain (from `validIdsDomain`, which reads only `chronogramData`) is empty, so tag intervals have no row; the renderer `renderTagIntervals` was not read, so whether they are still drawn is unverified (BEH-829, BEH-831). Is hiding tags together with events intended?
_Significance_: Decides the expected display of the two switches in combination and whether the domain must also come from `tagIntervals`.
_Proposed_: Check `renderTagIntervals` first; if tags vanish and that is unintended, keep tag rows by taking IDs from `tagIntervals` when events are hidden.

**<a id='oq-812'>OQ-812</a>: ROI applied to intervals but not to rows**
`flag_useROI` drops observation intervals whose box centers never enter the ROI (BEH-808), but chronogram rows only carry an `inROI` value (BEH-805), and the tag filter uses tag centers (BEH-827). Is the interval-level ROI intended, and should observation tables and navigation follow it?
_Significance_: Defines which products the ROI affects in the single filter stage.
_Proposed_: Preserve the current scope until confirmed.

**<a id='oq-813'>OQ-813</a>: Default of the frame filter maximum**
The default `frameMax = -1` is normalised only when the box is edited, so activating the filter with defaults hides every frame (BEH-823, DEBT-815). Should -1 mean "up to the last frame" at use time?
_Significance_: Changes what a first-time user sees when pressing "Filter".
_Proposed_: Normalise -1 to `nframes - 1` where the filter is applied.

**<a id='oq-814'>OQ-814</a>: Redundancy marking in the new view**
The `isredundant` flag (BEH-817) is consumed only by the legacy renderer (`alertCircle` in `ChronoControlActivitiesLegacy.js`). Is redundancy marking still wanted when that renderer is replaced?
_Significance_: Decides whether the redundancy stage stays in the pure pipeline.
_Proposed_: Keep the stage until the legacy renderer is removed, then decide.

**<a id='oq-815'>OQ-815</a>: Validation of the exclude-region JSON and ROI text**
Bad ROI text and malformed exclude-region JSON are accepted or throw without a message (BEH-827, BEH-841, DEBT-824). Should the app reject them with a visible error and keep the previous value?
_Significance_: Sets the error-path behavior the reimplementation must have.
_Proposed_: Reject and keep the previous value, with a message; confirm first.

## Slices

**<a id='q15'>Q15</a>: Node for the golden tests of slice 1**
Slice 1 ([ADR 0002](design/0002-slice-annotation-load-codec.md)) needs Node (>=18, `node --test`, no npm dependency) to generate and run golden tests under `refactor/tests/`. `node` is not installed in the job sandbox. May the maintainer run the tests locally (job reports the command), or should Node be made available to the sandbox?
_Significance_: Without a runner the goldens cannot be generated from the old code, so step 1 of the slice cannot be verified by the job.
_Proposed_: Maintainer installs Node >=18 and runs `node --test refactor/tests/` locally; the job writes the runner and fixtures. Used only once the maintainer confirms it.
_Answer_: Make Node available to the sandbox (maintainer, 2026-10-30). Pending: the sandbox does not have it yet.

**<a id='q16'>Q16</a>: Fix DEBT-706 (v2 save crashes after a CSV import) in slice 2?**
`convertTracksToV2` does `info.history.push(...)`, but every tracks CSV, `tracks_tagged` CSV and DB import sets `history` to a string, so the JSON save (file and server) throws and nothing is saved (BEH-711, [DEBT-706](intent/debt.md)). Step 4 of slice 2 ([ADR 0004](design/0004-slice-annotation-save-codec.md)) may fix it. The full fix (copy `info`, always an array, decide whether `videoinfo` is embedded, OQ-712) changes the saved format; a minimal one only makes the save work.
_Significance_: After a CSV import the user cannot save to JSON at all. The minimal fix is small but alters the saved `history` of those files.
_Proposed_: Minimal fix as its own step-4 commit: when `history` is a string, wrap it as `[history]` before the push; `info` is still the live `TracksInfo`, `videoinfo` still embedded. The full redesign stays `DEBT-706`. Used only once the maintainer confirms.
_Answer_: Full fix now (maintainer, 2026-11-12): copy `info`, `history` always an array, decide the `videoinfo` embedding. Depends on [OQ-712](#oq-712), answered the same day. Done in slice 2 step 4 (commit `445850e9`): `structuredClone`, no accumulation of saves in the history.

**<a id='q17'>Q17</a>: Unused `tracksToBBoxes`: move it or delete it?**
`tracksToBBoxes` (`labelbee/static/labelbee/js/AnnotationIO.js:407`) has no caller anywhere (grep, excluding `extern/`); `saveEventsToBBoxes` uses `tracksToBBoxes2` and only logs the format of the other one ([DEBT-728](intent/debt.md)). Slice 2 ([ADR 0004](design/0004-slice-annotation-save-codec.md)) can carry it into the module, or drop it.
_Significance_: Moving dead code costs a golden and a bridge entry for nothing; deleting it is a change outside a pure move.
_Proposed_: Do not move it. Delete it in step 3 as a separate commit, after the grep is rechecked. The stale log message of `saveEventsToBBoxes` stays in `DEBT-728`. Used only once the maintainer confirms.
_Answer_: Keep it next to `tracksToBBoxes2` (maintainer, 2026-11-12, free-text answer): move both into the module. It stays unused by `saveEventsToBBoxes`, which calls `tracksToBBoxes2`; confirmed by the maintainer the same day ("yes, move both").

**<a id='q18'>Q18</a>: Cut of slice 3: split get+decode from apply, no store yet?**
The loaders of `labelbee/static/labelbee/js/AnnotationIO.js` fetch, decode and apply (`setTracks`/`setTags` write the globals, the DOM and the views) in one function. Should slice 3 leave the globals alone and only move fetch+decode out?
_Significance_: Decides the size of the slice and whether the globals get an owner now.
_Answer_: No (maintainer, 2026-11-12): this slice creates `AnnotationStore`, which owns only the in-memory data structures; a bridge keeps the legacy globals working and is replaced little by little by getters/setters; `AnnotationIO` owns the loaders and the promise logic. Written up in [ADR 0005](design/0005-slice-annotation-loaders.md).

**<a id='q19'>Q19</a>: Which bugs to fix in slice 3 (step 5)?**
Clear-cut candidates in code the slice touches: [DEBT-713](intent/debt.md) (`setTags` v1 key check reads the old `Tags`, not the loaded `obj`), [DEBT-733](intent/debt.md) (`setTags` assigns `Tags` before validating, a bad file leaves it half-replaced), [DEBT-710](intent/debt.md) rest (`null`/primitives throw before the format check, in `sanitizeEvents` and `setTags`), [DEBT-722](intent/debt.md) (`loadEventsFromServerByID` uses out-of-scope `div`, `tag_event_ID`, `theDialog`, so every path ends in a `ReferenceError`, and it does not return its promise although `labelBee.js:267` awaits it). Ambiguous, kept as `DEBT`: DEBT-719 (tag server failure wipes Tags, depends on OQ-706), DEBT-734 (empty v2 file, OQ-714), DEBT-709 (silent file errors: needs a message design).
_Significance_: Each changes observable behavior; DEBT-733 and DEBT-722 change what the user sees on failure.
_Proposed_: Fix DEBT-713, 733, 710-rest and 722 as four commits, each with its golden diff for approval; for DEBT-722 show the failure messages in the dialog as the code evidently intends and return the ajax promise.
_Answer_: Fix in separate commits (maintainer, 2026-11-12), after the moves; each golden diff is still shown before its commit.

**<a id='q20'>Q20</a>: Dead loaders: delete or move?**
`loadEventsFromFile0`, `loadTagsCSVFromServer`, `loadTracksCSVFromDB`, `eventsFromServer` have no live caller or are deprecated ([DEBT-731](intent/debt.md), [DEBT-726](intent/debt.md), [DEBT-729](intent/debt.md), [DEBT-723](intent/debt.md)).
_Significance_: Deleting changes what can be done by hand.
_Answer_: Delete nothing (maintainer, 2026-11-12): some are designed to be called manually for debugging or manual loading, and anything that loads belongs in `AnnotationIO`. They stay in `AnnotationIO.js`, restructured with the others.

**<a id='q21'>Q21</a>: What exactly does `AnnotationStore` own, and does it emit events?**
[SEAM-701](intent/seams.md) proposes `replace(...)` emitting `annotations:changed` and a full `get/put/delete/rename(frame,id)` API. Today the refresh is explicit (`videoControl.onFrameChanged`, `refreshChronogram`), and derived data (`ttags`, `tagsHaveDM`, `flatTags`, `tagCache`) is computed by the views.
_Significance_: Events would change who triggers refreshes (and the double refresh of DEBT-712); a larger API means more code in a slice that must stay behavior-preserving.
_Proposed_: Own only `tracks`, `tracksInfo`, `tags`, `tagsInfo`; API `get*` and `replace*` returning the stored object itself; no events and no per-observation API in this slice (refresh stays explicit, derived data stays where it is). Events and `get/put/delete/rename` come with the writers that need them.
_Answer_: Confirmed, with one addition (maintainer, 2026-11-12): `tagsHaveDM` goes into the store, as a property of the currently loaded tags. `ttags` and `flatTags` go to a `Derived` module when it is ready for them.

**<a id='q22'>Q22</a>: Bridge technique: accessors on `window`, installed by a deferred module**
The legacy code reads and writes `Tracks`, `Tags`, `TracksInfo`, `TagsInfo` as globals. [ADR 0005](design/0005-slice-annotation-loaders.md) section 2 proposes `Object.defineProperty(window, ...)` accessors set by `annotation/AnnotationStoreBridge.js` (an ES module, deferred like the codec bridge), and removal of `var Tracks`/`var Tags` from `labelbee/static/labelbee/js/Model.js:3-4`. Alternative: a classic script placed before `Model.js` that owns the accessors and a plain holder, with the ES module store adopting it later.
_Significance_: With the module bridge, any read of `Tracks` while the page is still parsing would see `undefined` (none found by grep; the browser check confirms). The classic alternative removes that risk but keeps the data outside the ES module until a second step.
_Proposed_: Module bridge, as for the codec; the `window.AnnotationStore` instance is exposed so migrated files call it directly.
_Answer_: Confirmed (maintainer, 2026-11-12).
