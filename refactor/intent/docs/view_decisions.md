<!-- GENERATED from ../decisions.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Decisions (DEC)

Conventions: [README.md](../README.md). Edit this file; read the generated view [docs/view_decisions.md](view_decisions.md).
These record scope boundaries inferred from the
code. They are `status: draft` until the maintainer confirms; `Decided by` stays empty
until then.

## Contents

| ID | Name |
|---|---|
| DEC-001 | [Tag detection and bee tracking happen outside LabelBee](#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee) |
| DEC-002 | [Single-writer snapshot model, no concurrent editing](#dec-002-single-writer-snapshot-model-no-concurrent-editing) |
| DEC-003 | [Labels are generic](#dec-003-labels-are-generic) |
| DEC-004 | [The code is the reference for behavior](#dec-004-the-code-is-the-reference-for-behavior) |
| DEC-005 | [Keyboard shortcuts belong in one place](#dec-005-keyboard-shortcuts-belong-in-one-place) |
| DEC-006 | [The separate tag file is obsolescent; tag information travels in the Tracks](#dec-006-the-separate-tag-file-is-obsolescent-tag-information-travels-in-the-tracks) |

## DEC-001: Tag detection and bee tracking happen outside LabelBee

The app only consumes the output of detection tools (tags, `tracks_tagged`) and lets the
human verify and correct it. Evidence: no detector code in `labelbee/`; the in-browser
code only decodes (Hamming search against the `tag25h5` table) and fixes tags.

The producer is the `cb` command-line tool of the cyindibee project: it converts video to constant frame rate, detects individual bees with pose, tracks them, and runs secondary engines (pollen classification; number tag, QR code tag, paint or unmarked classification; tag decoding). It writes several CSV and JSON outputs that LabelBee loads in different places. LabelBee currently hard-codes QR-code tags. Other markings are expected: round number tags (the `tagid` field should suffice, the QR-specific logic being irrelevant there and to be enabled only when relevant), square QR tags, and paint markings (handled with labels).

- **Links:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [OQ-002](../../QUESTIONS.md#oq-002 "Tag pipeline boundary")
- **Alternatives:** detection inside the app

## DEC-002: Single-writer snapshot model, no concurrent editing

The client keeps everything in memory and posts a whole snapshot with `created_from_id`
lineage. Concurrent editing is not a goal. Overlaps
[Q10](../../analysis/07-questions-and-proposals.md#q10).

- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
- **Links:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save"), [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record")
- **Alternatives:** real-time multi-user editing

## DEC-003: Labels are generic

Labels are a generic mechanism (an open vocabulary on events): new tasks may define new
labels. The predefined labels (fanning, pollen, entering, leaving, wrongID, falsealarm) are
useful for some tasks and are the target for plugins. Their current hard-coding is `DEBT`:
six labels wired into the page and code, with `labels` and `bool_acts` encoding the same facts
twice ([analysis/04](../../analysis/04-data-model.md) 4.1). `bool_acts` was a past intent at higher performance (booleans instead of strings); it is clunky and inflexible, and `DEBT`. Each use is flagged and served by a temporary shim derived from `labels` until removal. A label belongs to one observation; track-level labels would be a new feature. The chronogram (`CAP-303`) reads
labels through the processing module (`CAP-802`); `CAP-601` edits them one by one.

- **Links:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics")
- **Decided by:** maintainer
- **Alternatives:** hard-wired behavior vocabulary

## DEC-004: The code is the reference for behavior

Where the on-page Quick Help (`labelbee/blueprints/labelbee/templates/labelbee_page.html`) and
the code disagree, the code defines the behavior to preserve; Quick Help may be inaccurate
and is corrected later. Known cases: arrow keys navigate frames (Quick Help says they move
the box), and zoom uses Alt+Ctrl+wheel (Quick Help says Shift+wheel). Defects found in the
code are recorded as `DEBT`, not fixed in a behavior-preserving step.

- **Links:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts")
- **Decided by:** maintainer

## DEC-005: Keyboard shortcuts belong in one place

Essential today: frame stepping with modifiers, box creation (Shift+click, Ctrl+drag),
ID editing, labels and delete. Some may become `DEBT` during the refactor. Shortcuts such
as `p` (pollen) are kept for now; the refactor gathers the key bindings now spread over
`labelbee/static/labelbee/js/labelBee.js`, `labelbee/static/labelbee/js/ZoomView.js`
and the label buttons (`accesskey`) in one place, so that a shortcut manager can be added
later.

- **Links:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts")
- **Decided by:** maintainer

## DEC-006: The separate tag file is obsolescent; tag information travels in the Tracks

The tag detections no longer reach LabelBee as a separate Tags file. The current pipeline adds the tag information to each
Tracks observation (`obs.tag`, as the `tracks_tagged` CSV does, [BEH-736](view_cap-700-annotation-model-io.md#beh-736-import-of-a-tracks_tagged-csv "Import of a tracks_tagged CSV")) before LabelBee reads it, and `tagMode` is `'Tracks'`
(`labelbee/static/labelbee/js/OverlayControl.js:5`; nothing changes it). The Tags structure, the tag file loaders (local file,
server tag file, tags CSV) and the Tags display mode are legacy: kept working for now, candidates for removal. The refactor does
not invest in them: no new features, and a slice moves them only as far as it already touches them (`AnnotationStore` keeps `Tags`
for compatibility). Checked in the browser tests: a tags file is stored but not shown, the tracks_tagged pipeline is
(`refactor/tests/browser/README.md`, finding F4).

- **Links:** [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import"), [BEH-722](view_cap-700-annotation-model-io.md#beh-722-load-tags-from-a-local-file "Load Tags from a local file"), [BEH-724](view_cap-700-annotation-model-io.md#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh"), [BEH-728](view_cap-700-annotation-model-io.md#beh-728-loading-a-tag-file-from-the-server "Loading a tag file from the server"), [BEH-736](view_cap-700-annotation-model-io.md#beh-736-import-of-a-tracks_tagged-csv "Import of a tracks_tagged CSV"), [BEH-737](view_cap-700-annotation-model-io.md#beh-737-import-of-a-tags-csv-tracks-and-tags-together "Import of a tags CSV (Tracks and Tags together)"), [DEBT-118](view_debt.md#debt-118-tag-file-load-uses-a-nonexistent-route "Tag-file load uses a nonexistent route"), [DEBT-719](view_debt.md#debt-719-server-tag-loading-unrouted-url-undefined-return-empties-tags-on-failure "Server tag loading: unrouted URL, undefined return, empties Tags on failure"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")
- **Decided by:** maintainer (2026-11-13)
