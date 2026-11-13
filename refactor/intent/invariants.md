# Invariants (INV)

Conventions: [README.md](README.md). Edit this file; read the generated view [docs/view_invariants.md](docs/view_invariants.md).
These are goals the refactor must not break;
all are `[inferred]` and need the linked `OQ` answered. The frame-sync invariants from
README section 9.2 are not listed here yet: they must be re-derived (README 9.2, 11.3).

## Contents

<!-- toc -->

## INV-001: No annotation loss

A long session of manual work is never corrupted or silently dropped, by editing, saving
or loading. The v1 save used to violate it (C1 in [analysis/06](../analysis/06-smells-and-risks.md): it mutated live `Tracks`); fixed in slice 2 step 4 (DEBT-707), as was the mutation of `TracksInfo` by the v2 save (DEBT-706). Defines what the first characterization tests protect.

- **Code:**
  - `annotation/AnnotationCodec.js`: `convertTracksToV1`
- **Links:** CAP-701, CAP-702, CAP-703, OQ-003

## INV-002: Interactive responsiveness

Stepping through frames and editing stay responsive on the 5MP videos used today. Any
change to the refresh and redraw paths is judged against current behavior (no numeric target; the baseline is current behavior on the Gurabo 5MP videos, OQ-011). Annotators also depend on keyboard and
mouse shortcuts and click modes: the behavior-preserving rule applies to each of them.

- **Links:** CAP-202, CAP-401, OQ-005, OQ-011

## INV-003: Old annotation files stay loadable

Readers for JSON v1, CSV and `tracks_tagged` files survive the refactor.

- **Code:**
  - `AnnotationIO.js`: `setTags`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`, `decodeTags`, `tracks_tagged_csv_to_json`
- **Links:** ENT-004, CAP-702, CAP-704, CAP-707, OQ-003
