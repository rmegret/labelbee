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

**<a id='oq-002'>OQ-002</a>: Tag pipeline boundary**
Are tag detection and decoding (tag25h5) done by a separate tool, with LabelBee only displaying, verifying and fixing results ([DEC-001](intent/docs/view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee), [CAP-502](intent/docs/view_capabilities.md#cap-502-tag-id-assignment-and-fix), [DEC-001](intent/docs/view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee))? Which tool produces `tracks_tagged` CSV and tag files?
_Significance_: Decides whether the in-browser Hamming search and tag-fix code is core or auxiliary, and which input formats are contracts with an external tool.
_Proposed_: Separate offline tools; LabelBee consumes their output.

**<a id='oq-003'>OQ-003</a>: What the saved annotations are used for**
What downstream analysis consumes the saved annotations, and which fields must be preserved exactly ([ENT-004](intent/docs/view_entities.md#ent-004-annotation-file--record), [CAP-700](intent/docs/view_capabilities.md#cap-700-annotation-model-and-io), [INV-001](intent/docs/view_invariants.md#inv-001-no-annotation-loss), [INV-003](intent/docs/view_invariants.md#inv-003-old-annotation-files-stay-loadable))?
_Significance_: Defines the data contract and the first characterization tests.
_Proposed_: All fields in `Observation` ([04-data-model.md](analysis/04-data-model.md) 4.1) are preserved on load and save.

**<a id='oq-004'>OQ-004</a>: Which workflows are routine**
Which of these are routine: video navigation modes (preview, cache), pollination visits ([CAP-201](intent/docs/view_capabilities.md#cap-201-load-video-metadata-and-video), [CAP-602](intent/docs/view_capabilities.md#cap-602-pollination-visits))? Which are experimental or abandoned?
_Significance_: Separates features to specify and test from candidates for removal (see also [Q4](analysis/07-questions-and-proposals.md#q4)).
_Proposed_: All reachable from page buttons are live.
_Answer_: all are active, including export, external-tool import and the experimental DB sources (maintainer).

**<a id='oq-005'>OQ-005</a>: Core tracking workflow and shortcuts**
What is the typical sequence of operations when annotating one video (create box, set ID, propagate over frames, correct, save) and which keyboard shortcuts and click modes are essential ([CAP-401](intent/docs/view_capabilities.md#cap-401-bee-track-boxes), [INV-002](intent/docs/view_invariants.md#inv-002-interactive-responsiveness))?
_Significance_: These sequences become the end-to-end scenarios of Phase 2.
_Proposed_: Derive the sequence from the code and ask for confirmation.

**<a id='oq-006'>OQ-006</a>: Label semantics**
What does each current label (fanning, pollen, entering, leaving, wrongID, falsealarm) mean precisely: applies to one frame or to a span, and which are mutually exclusive ([CAP-601](intent/docs/view_capabilities.md#cap-601-behavior-labels-and-notes), [DEC-003](intent/docs/view_decisions.md#dec-003-labels-are-generic))?
_Significance_: These six become the predefined labels that a later plugin mechanism must reproduce; `labels` and `bool_acts` encode the same facts twice ([04-data-model.md](analysis/04-data-model.md) 4.1).
_Answer_: The set is not closed. The predefined labels are useful for some tasks, and new tasks may define new labels. Predefined labels are the target for plugins; the current hard-coding is `DEBT` (maintainer).
_Proposed_: The generic `labels` string is canonical and `bool_acts` is derived, to be confirmed.

**<a id='oq-007'>OQ-007</a>: Skeleton labeling**
Is skeleton (body-part keypoint) labeling in active use, with which part vocabulary, and for what analysis ([CAP-403](intent/docs/view_capabilities.md#cap-403-skeleton-overlay), [CAP-501](intent/docs/view_capabilities.md#cap-501-skeleton-labelling))?
_Significance_: Zoom and skeleton code is ~2.3k lines in `labelbee/static/labelbee/js/ZoomView.js`.
_Proposed_: Treat as live, keypoint label list configurable.

**<a id='oq-008'>OQ-008</a>: Chronogram role**
Is the chronogram a navigation aid only, or also an editing surface for events ([CAP-300](intent/docs/view_capabilities.md#cap-300-temporal-display-and-navigation), [CAP-305](intent/docs/view_capabilities.md#cap-305-event-navigation))?
_Significance_: Decides whether it may depend on the store read-only.
_Proposed_: Navigation and review, with some editing through selection.

**<a id='oq-009'>OQ-009</a>: Clean-up semantics**
Which clean-up operations are routinely used, and is "no undo" intentional ([CAP-803](intent/docs/view_capabilities.md#cap-803-annotation-clean-up))?
_Significance_: Destructive actions need a stated expectation before a behavior-preserving refactor.
_Proposed_: Keep as is, flag for later review.

**<a id='oq-010'>OQ-010</a>: Server versus local storage**
Is the server record the normal way to store annotations, with local files for exchange, or the reverse ([CAP-700](intent/docs/view_capabilities.md#cap-700-annotation-model-and-io))?
_Significance_: Decides which path the tests and the "no annotation loss" goal protect first.
_Proposed_: Server is primary, local file is backup/exchange.

**<a id='oq-011'>OQ-011</a>: Performance expectations**
What video sizes, frame counts and number of bees per frame must stay responsive, and what is acceptable latency per step or edit ([INV-002](intent/docs/view_invariants.md#inv-002-interactive-responsiveness))?
_Significance_: Without a target, a refactor cannot be judged for performance regressions.
_Proposed_: Current behavior on the Gurabo 5MP videos is the baseline.
