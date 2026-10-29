# Decisions (DEC)

Conventions: [README.md](README.md). Edit this file; read the generated view [docs/view_decisions.md](docs/view_decisions.md).
These record scope boundaries inferred from the
code. They are `status: draft` until the maintainer confirms; `Decided by` stays empty
until then.

## Contents

<!-- toc -->

## DEC-001: Tag detection and bee tracking happen outside LabelBee

The app only consumes the output of detection tools (tags, `tracks_tagged`) and lets the
human verify and correct it. Evidence: no detector code in `labelbee/`; the in-browser
code only decodes (Hamming search against the `tag25h5` table) and fixes tags.

- **Links:** P-502, ENT-002, OQ-002
- **Alternatives:** tection inside the app

## DEC-002: Single-writer snapshot model, no concurrent editing

The client keeps everything in memory and posts a whole snapshot with `created_from_id`
lineage. Concurrent editing is not a goal. Overlaps
[Q10](../analysis/07-questions-and-proposals.md#q10).

- **Code:**
  - `resources/annotations.py`: `AnnotationsAPI`
- **Links:** P-703, ENT-004
- **Alternatives:** al-time multi-user editing

## DEC-003: Labels are generic

Labels are a generic mechanism (an open vocabulary on events): new tasks may define new
labels. The predefined labels (fanning, pollen, entering, leaving, wrongID, falsealarm) are
useful for some tasks and are the target for plugins. Their current hard-coding is `DEBT`:
six labels wired into the page and code, with `labels` and `bool_acts` encoding the same facts
twice ([analysis/04](../analysis/04-data-model.md) 4.1). The chronogram (`CAP-303`) reads
labels through the processing module (`CAP-802`); `CAP-601` edits them one by one.

- **Links:** P-303, CAP-601, OQ-006
- **Decided by:** maintainer
- **Alternatives:** rd-wired behavior vocabulary
