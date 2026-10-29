<!-- GENERATED from ../invariants.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Invariants (INV)

Conventions: [README.md](../README.md). Edit this file; read the generated view [docs/view_invariants.md](view_invariants.md).
These are goals the refactor must not break;
all are `[inferred]` and need the linked `OQ` answered. The frame-sync invariants from
README section 9.2 are not listed here yet: they must be re-derived (README 9.2, 11.3).

## Contents

| ID | Name |
|---|---|
| INV-001 | [No annotation loss](#inv-001-no-annotation-loss) |
| INV-002 | [Interactive responsiveness](#inv-002-interactive-responsiveness) |
| INV-003 | [Old annotation files stay loadable](#inv-003-old-annotation-files-stay-loadable) |

## INV-001: No annotation loss

A long session of manual work is never corrupted or silently dropped, by editing, saving
or loading. Today saving violates it: see C1 in [analysis/06](../../analysis/06-smells-and-risks.md)
(save mutates live `Tracks`). Defines what the first characterization tests protect.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV1`
- **Links:** P-701, [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save"), [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for")

## INV-002: Interactive responsiveness

Stepping through frames and editing stay responsive on the 5MP videos used today. Any
change to the refresh and redraw paths is judged against current behavior (no target
figure yet, see [OQ-011](../../QUESTIONS.md#oq-011 "Performance expectations")). Annotators also depend on keyboard and
mouse shortcuts and click modes: the behavior-preserving rule applies to each of them.

- **Links:** P-202, [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts"), [OQ-011](../../QUESTIONS.md#oq-011 "Performance expectations")

## INV-003: Old annotation files stay loadable

Readers for JSON v1, CSV and `tracks_tagged` files survive the refactor.

- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `sanitizeEvents`, `tracks_tagged_csv_to_json`, `setTags`
- **Links:** T-004, [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save"), [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import"), [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for")
