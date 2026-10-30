<!-- GENERATED from ../behaviors/cap-600-labels-visits-stats.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Labels, dashboards and specialized annotations ([CAP-600](view_capabilities.md#cap-600-labels-dashboards-and-specialized-annotations "Labels, dashboards and specialized annotations"))

Conventions: [../README.md](../README.md).
All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.
This file also holds the cross-cutting selection and undo behaviors ([BEH-630](#beh-630-two-notions-of-selection-current-id-and-active-rectangle "Two notions of selection: current ID and active rectangle") to [BEH-642](#beh-642-swapid-dialog-and-confirmation "SwapID dialog and confirmation"), [BEH-648](#beh-648-swapid-semantics-and-absence-of-validation "SwapID semantics and absence of validation"), [BEH-649](#beh-649-the-current-id-survives-deleting-its-observation "The current ID survives deleting its observation")), which are
the selection and undo aspects of [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo"). Per [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior") the code is the reference, Quick Help is not.

## Contents

| ID | Name |
|---|---|
| BEH-601 | [Label button panel is generated from a label list](#beh-601-label-button-panel-is-generated-from-a-label-list) |
| BEH-602 | [Clicking a label button toggles that label on the selected observation](#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation) |
| BEH-603 | [Toggling a label with no active rectangle first annotates the current tag](#beh-603-toggling-a-label-with-no-active-rectangle-first-annotates-the-current-tag) |
| BEH-604 | [Label string normalization and matching](#beh-604-label-string-normalization-and-matching) |
| BEH-605 | [Free-text labels box](#beh-605-free-text-labels-box) |
| BEH-606 | [Notes box](#beh-606-notes-box) |
| BEH-607 | [WrongID label together with the newID field](#beh-607-wrongid-label-together-with-the-newid-field) |
| BEH-608 | [Label keyboard shortcuts come only from `accesskey` entries](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries) |
| BEH-609 | [Label list dialog ("Edit...")](#beh-609-label-list-dialog-edit) |
| BEH-610 | [`bool_acts` is re-derived from labels on every form-to-observation update](#beh-610-bool_acts-is-re-derived-from-labels-on-every-form-to-observation-update) |
| BEH-611 | [`automatic_sub` commits only already-stored rectangles](#beh-611-automatic_sub-commits-only-already-stored-rectangles) |
| BEH-612 | [`submit_bee` stores the active rectangle's observation](#beh-612-submit_bee-stores-the-active-rectangles-observation) |
| BEH-613 | [A pollination visit is an observation with a `visit` field](#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field) |
| BEH-614 | [Visit panel layout, content and lifetime](#beh-614-visit-panel-layout-content-and-lifetime) |
| BEH-615 | [Picking pollinator or flower on the overlay](#beh-615-picking-pollinator-or-flower-on-the-overlay) |
| BEH-616 | [Create visit](#beh-616-create-visit) |
| BEH-617 | [Delete visit](#beh-617-delete-visit) |
| BEH-618 | [Goto buttons of the visit panel](#beh-618-goto-buttons-of-the-visit-panel) |
| BEH-619 | [Set start and end frame of a visit](#beh-619-set-start-and-end-frame-of-a-visit) |
| BEH-620 | [Selecting a visit rectangle loads it into the visit panel](#beh-620-selecting-a-visit-rectangle-loads-it-into-the-visit-panel) |
| BEH-621 | [Timeline widget (unfinished)](#beh-621-timeline-widget-unfinished) |
| BEH-622 | [Pick-frame mode (Set Span) on the selected observation](#beh-622-pick-frame-mode-set-span-on-the-selected-observation) |
| BEH-623 | [Span buttons of the "Selected" tab](#beh-623-span-buttons-of-the-selected-tab) |
| BEH-624 | ["Draw timeline (Experimental)" button](#beh-624-draw-timeline-experimental-button) |
| BEH-625 | [Legacy "Pick Flower" in pick-frame mode](#beh-625-legacy-pick-flower-in-pick-frame-mode) |
| BEH-626 | [Events info panel: box geometry of the selected observation](#beh-626-events-info-panel-box-geometry-of-the-selected-observation) |
| BEH-627 | [Update Statistics button](#beh-627-update-statistics-button) |
| BEH-628 | [Observation table ("Labeling" tab)](#beh-628-observation-table-labeling-tab) |
| BEH-629 | [Clicking a row of the observation table selects the observation](#beh-629-clicking-a-row-of-the-observation-table-selects-the-observation) |
| BEH-630 | [Two notions of selection: current ID and active rectangle](#beh-630-two-notions-of-selection-current-id-and-active-rectangle) |
| BEH-631 | [Selecting and deselecting a rectangle](#beh-631-selecting-and-deselecting-a-rectangle) |
| BEH-632 | [Select by typing an ID](#beh-632-select-by-typing-an-id) |
| BEH-633 | [Select by ID and frame](#beh-633-select-by-id-and-frame) |
| BEH-634 | [IDs seen in the focus window](#beh-634-ids-seen-in-the-focus-window) |
| BEH-635 | [Annotate button and Delete button states follow the selection](#beh-635-annotate-button-and-delete-button-states-follow-the-selection) |
| BEH-636 | [Deleting the selected observation](#beh-636-deleting-the-selected-observation) |
| BEH-637 | [`deleteEvent` removes from `Tracks` and records an undo entry](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry) |
| BEH-638 | [What is undoable](#beh-638-what-is-undoable) |
| BEH-639 | [Undo button restores the last deleted observation](#beh-639-undo-button-restores-the-last-deleted-observation) |
| BEH-640 | [Undo button caption](#beh-640-undo-button-caption) |
| BEH-641 | [Keyboard handling around text fields](#beh-641-keyboard-handling-around-text-fields) |
| BEH-642 | [SwapID dialog and confirmation](#beh-642-swapid-dialog-and-confirmation) |
| BEH-643 | [The `p` key does nothing](#beh-643-the-p-key-does-nothing) |
| BEH-644 | [Opening Pick Flower makes the observation count as a visit](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit) |
| BEH-645 | [Pick-frame panel: Set Start/End, Goto, CLOSE](#beh-645-pick-frame-panel-set-startend-goto-close) |
| BEH-646 | [Pick-frame timeline](#beh-646-pick-frame-timeline) |
| BEH-647 | ["Preset..." loads a label list from the server](#beh-647-preset-loads-a-label-list-from-the-server) |
| BEH-648 | [SwapID semantics and absence of validation](#beh-648-swapid-semantics-and-absence-of-validation) |
| BEH-649 | [The current ID survives deleting its observation](#beh-649-the-current-id-survives-deleting-its-observation) |
| BEH-650 | [Visit panel enabling rules and pick highlight](#beh-650-visit-panel-enabling-rules-and-pick-highlight) |

## BEH-601: Label button panel is generated from a label list

At startup `initSelectionControl` fills `labelButtonsArray` with 11 predefined entries
(`label`, `description`, optional `iconHtml`, no `accesskey`), in this order: fanning,
non-fanning, stretched-wings, pollen, entering, leaving, walking, expulsed, expulsing,
falsealarm, wrongid. `hardRefreshLabelTogglePanel` empties `#labeltoggle-panel` and appends one
`<button class="btn btn-green-toggle btn-xs labeltoggle" thelabel="<label>" title="<description>">`
per entry, with an inline `onclick="onLabelToggled(event)"`. Button text is `<label>`, then a space
and `iconHtml` when it is a string, then ` [<accesskey>]` when the accesskey is a non-empty
string. The static buttons written in the HTML page (8 labels) are therefore replaced at startup,
so the page shows 11 labels, not the six of [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"). The label list is a session-level global; it
is not saved with annotations. The panel is rebuilt whenever the list is replaced ([BEH-609](#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')"), or the
"Preset..." dialog of the I/O code, [BEH-647](#beh-647-preset-loads-a-label-list-from-the-server "'Preset...' loads a label list from the server")).

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `initSelectionControl`, `hardRefreshLabelTogglePanel`, `labelButtonsArray`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labeltoggle-panel`, `#labeltoggle`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-601](view_debt.md#debt-601-predefined-labels-hard-coded-in-several-places "Predefined labels hard-coded in several places"), [BEH-609](#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')"), [BEH-647](#beh-647-preset-loads-a-label-list-from-the-server "'Preset...' loads a label list from the server"), [OQ-601](../../QUESTIONS.md#oq-601 "Which labels are predefined, and are the single-letter aliases intended?")

## BEH-602: Clicking a label button toggles that label on the selected observation

A click on a `.labeltoggle` button calls `onLabelToggled`, which reads the button's `thelabel`
attribute and its current `active` CSS class; the new state is the opposite of the class
(`isOn = !hasClass("active")`), then `labelToggle(label, isOn)` runs. `labelToggle` acts on the
observation `obs` attached to the active Fabric rectangle: `updateObsLabel` adds the label to,
or removes it from, `obs.labels` (comma string, see [BEH-604](#beh-604-label-string-normalization-and-matching "Label string normalization and matching")), `updateButtonsForLabel` sets the
`active` class on every button with that `thelabel` (so the static "wrongID" button of the BeeID
panel, which also carries `thelabel="wrongid"`, stays in sync with the panel button),
`updateRectObsActivity` refreshes `bool_acts` and `notes` ([BEH-610](#beh-610-bool_acts-is-re-derived-from-labels-on-every-form-to-observation-update "`bool_acts` is re-derived from labels on every form-to-observation update")), then `automatic_sub`
commits ([BEH-611](#beh-611-automatic_sub-commits-only-already-stored-rectangles "`automatic_sub` commits only already-stored rectangles")), `updateForm` refreshes the form and `refreshChronogram` redraws the
chronogram. Toggling the label `wrongid` on also creates `obs.fix = {newid: undefined}` when
`obs.fix` is missing; toggling it off leaves `fix` and `newid` untouched. The
toggle is driven by the inline `onclick` of the buttons (the `change` binding made at init is dead,
[DEBT-601](view_debt.md#debt-601-predefined-labels-hard-coded-in-several-places "Predefined labels hard-coded in several places")).

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `onLabelToggled`, `labelToggle`, `updateButtonsForLabel`, `updateObsLabel`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateRectObsActivity`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labeltoggle-panel`, `#beeidpanel`
- **Links:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-604](#beh-604-label-string-normalization-and-matching "Label string normalization and matching"), [BEH-610](#beh-610-bool_acts-is-re-derived-from-labels-on-every-form-to-observation-update "`bool_acts` is re-derived from labels on every form-to-observation update"), [BEH-611](#beh-611-automatic_sub-commits-only-already-stored-rectangles "`automatic_sub` commits only already-stored rectangles"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-603: Toggling a label with no active rectangle first annotates the current tag

When `labelToggle` finds no active object it calls `newRectForCurrentTag` and retries. That
function silently returns when `#newRectForCurrentTag` has the `disabled` class ([BEH-635](#beh-635-annotate-button-and-delete-button-states-follow-the-selection "Annotate button and Delete button states follow the selection")).
Otherwise it requires a current ID (`getCurrentID()` = `defaultSelectedBee`), else prints "No
current tag selected" in red; requires a tag with that ID in the current frame (`getCurrentTag`),
else prints "Current tag not visible in this frame. Try Next or Prev event" (red); and requires
that no rectangle is already selected, else "Current tag already annotated" (red). On success it
builds a `new` rectangle centered on the tag (default size, angle from the tag when angle control
is enabled, else 0), activates it and calls `submit_bee` ([BEH-612](#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation")), so the annotation is stored
before the label is applied. If there is still no active object, `labelToggle` logs "aborted" and
returns without a user message. The keyboard path ([BEH-608](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries")) passes `isOn` undefined and toggles
from `hasLabel`; the button path passes the state computed from the button class ([BEH-602](#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation "Clicking a label button toggles that label on the selected observation")), which
for the first click after creation is "on".

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelToggle`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `newRectForCurrentTag`, `newRectForTag`, `getCurrentTag`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#newRectForCurrentTag`
- **Links:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [BEH-612](#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation"), [BEH-635](#beh-635-annotate-button-and-delete-button-states-follow-the-selection "Annotate button and Delete button states follow the selection"), [BEH-608](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries")

## BEH-604: Label string normalization and matching

`obs.labels` is a comma-separated string. `toLabelArray` splits on `,`, lowercases, trims, drops
empty items, then maps each through `normalizeLabel` (`labelMap`): `f` to fanning, `p` to
pollen, `e` to entering, `d` and `l` to leaving, `departing` to leaving; other values are kept
(`expulsion` maps to itself). `toLabelString` applies the same steps and joins with `,` (no
space). Duplicates are not removed: `"p,pollen"` becomes `"pollen,pollen"`. `hasLabel` /
`containsLabel` compare after `normalizeLabel`; `hasLabel` turns a null `obs.labels` into `""`
as a side effect. `updateObsLabel(obs, label, active)` removes only the first occurrence when
deactivating and appends at the end when activating and absent; the result goes through
`toLabelString`, so the order of existing labels is preserved and the label added is lowercased.
Consequence: a custom label equal to `f`, `p`, `e`, `d` or `l` cannot exist, it is rewritten.
The order of labels carries no meaning. `cleanLabels` is the string-to-string version.

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `normalizeLabel`, `labelMap`, `toLabelArray`, `toLabelString`, `updateObsLabel`, `hasLabel`, `containsLabel`, `cleanLabels`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-602](view_debt.md#debt-602-label-normalization-hijacks-single-letters-and-does-not-deduplicate "Label normalization hijacks single letters and does not deduplicate"), [OQ-601](../../QUESTIONS.md#oq-601 "Which labels are predefined, and are the single-letter aliases intended?")

## BEH-605: Free-text labels box

`#labels` (text input) shows `getLabels(obs).join(",")`, that is the normalized array, when a
rectangle is selected (`updateForm`) and is emptied on `updateForm(null)`. On `change` (value
committed by Enter or blur) `onLabelsChanged` takes the typed string; if a rectangle is active it
calls `setLabels` (normalizes with [BEH-604](#beh-604-label-string-normalization-and-matching "Label string normalization and matching"), writes `obs.labels`, recomputes the four `bool_acts`,
then `updateForm`) and `automatic_sub`. With no active rectangle nothing happens (the typed text
stays in the box until the next `updateForm`). `setLabels` does not read `#notes`. Typing a label
that has a button updates the button state through the `updateForm` that follows
(`updateButtonsForLabel` over `labelButtonsArray`); labels without a button are visible only in
this box.

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `onLabelsChanged`, `updateForm`, `getLabels`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `setLabels`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labels`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-604](#beh-604-label-string-normalization-and-matching "Label string normalization and matching"), [BEH-610](#beh-610-bool_acts-is-re-derived-from-labels-on-every-form-to-observation-update "`bool_acts` is re-derived from labels on every form-to-observation update"), [BEH-611](#beh-611-automatic_sub-commits-only-already-stored-rectangles "`automatic_sub` commits only already-stored rectangles")

## BEH-606: Notes box

`#notes` shows `obs.notes` of the selected observation (empty string if undefined) and is emptied
when nothing is selected. The only commit trigger is the Enter key in the box (`keydown`,
`which == 13`): `onActivityChanged` copies the box value into `obs.notes`
(`updateRectObsActivity`) and calls `automatic_sub`. There is no `change`/blur handler: text typed
and left with Tab or a click, or abandoned with Escape ([BEH-641](#beh-641-keyboard-handling-around-text-fields "Keyboard handling around text fields"), which resets the form from the
rectangle), is not stored, unless a later action calls `updateRectObsActivity` first (a label
toggle, [BEH-602](#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation "Clicking a label button toggles that label on the selected observation"), or ZoomView skeleton edits), in which case the box content is stored at that
moment. New rectangles (`addRect` with status `new`) also take their initial `notes` from the box
through `updateObsActivityFromForm`.

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `onActivityChanged`, `updateForm`, `initSelectionControl`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateObsActivityFromForm`, `addRect`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#notes`
- **Links:** [BEH-610](#beh-610-bool_acts-is-re-derived-from-labels-on-every-form-to-observation-update "`bool_acts` is re-derived from labels on every form-to-observation update"), [BEH-611](#beh-611-automatic_sub-commits-only-already-stored-rectangles "`automatic_sub` commits only already-stored rectangles"), [OQ-602](../../QUESTIONS.md#oq-602 "Should notes be saved on blur, not only on Enter?")

## BEH-607: WrongID label together with the newID field

`#newid` (next to the "wrongID" button in the BeeID panel) commits on Enter through
`onKeyDown_NewIDEdit` (handler in `labelBee.js`, bound by `onkeypress`). With no active
rectangle nothing happens. An empty value becomes `undefined`. The value is stored in `obs.newid` and, when not empty, in `obs.fix.newid` (creating
`obs.fix` if missing), and the label `wrongid` is added if absent. A `new` rectangle is submitted
with `submit_bee`; a `db` one is stored with `storeObs`. Then `overlay.hardRefresh`,
`refreshChronogram` and `updateForm`. `updateForm` fills `#newid` from `obs.newid` (and empties it
first). Clearing the box and pressing Enter sets `obs.newid` undefined but does not remove
`obs.fix.newid` nor the `wrongid` label. The meaning of the label (a tag detected but decoded with
a wrong ID) is in its button title; consumers of `fix.newid` are in [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix").

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_NewIDEdit`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateForm`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#newid`, `#beeidpanel`
- **Links:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [BEH-602](#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation "Clicking a label button toggles that label on the selected observation"), [BEH-612](#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-608: Label keyboard shortcuts come only from `accesskey` entries

The global keydown handler (`onKeyDown`) ends with `labelsProcessKey(e.key)`, reached only when no
earlier key branch took the event: the first `labelButtonsArray` entry whose `accesskey` equals
`e.key` is toggled with `labelToggle(label)` (no `isOn`, so it toggles from `hasLabel`), and the key
press is consumed (`return false`). The 11 predefined entries have no `accesskey`, so by default no
letter toggles a label. Keys are compared case-sensitively against single `e.key` values. Because
this branch is last, an accesskey equal to a key handled earlier never fires: `Delete`, `Backspace`
and `d` (delete, [BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation")), `p` ([BEH-643](#beh-643-the-p-key-does-nothing "The `p` key does nothing")), `r` with Ctrl, `ArrowLeft`, `ArrowRight`, `,` and `.`
(frame stepping), space, `Escape` and `Enter`. The same `accesskey` is also put on the button, so
the browser's own accesskey activation (modifier combination depends on the browser) clicks the
button ([BEH-602](#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation "Clicking a label button toggles that label on the selected observation")). Shortcuts are not active while a text field has focus ([BEH-641](#beh-641-keyboard-handling-around-text-fields "Keyboard handling around text fields")).

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelsProcessKey`, `labelToggle`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
- **Links:** [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts"), [BEH-609](#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')"), [BEH-641](#beh-641-keyboard-handling-around-text-fields "Keyboard handling around text fields"), [DEBT-620](view_debt.md#debt-620-dead-branches-and-shadowed-keys-in-onkeydown "Dead branches and shadowed keys in `onKeyDown`"), [OQ-614](../../QUESTIONS.md#oq-614 "Should the label list reject accesskeys that built-in shortcuts already use?")

## BEH-609: Label list dialog ("Edit...")

The "Edit..." button of the Labels panel calls `labelListDialog.openDialog()`: a modal jQuery UI
dialog (`#dialog-form-mainLabelList`, 95% of the window) with two tabs: a jsGrid table (columns
`label` required, `description`, `iconHtml`, `accesskey`; inserting, editing, sorting and drag
reordering of rows) and a JSON text area `{"labelListArray": [...]}` kept in sync with the grid.
Typing in the JSON area shows a "Validate" button; validation parses the text and loads
`labelListArray` into the grid, reporting "(Invalid)" if the JSON or the field is missing. "Ok"
replaces `labelButtonsArray` with the grid items and calls `hardRefreshLabelTogglePanel`
([BEH-601](#beh-601-label-button-panel-is-generated-from-a-label-list "Label button panel is generated from a label list")); the JSON text is never read by "Ok", so JSON typed but not validated is silently
dropped; "Cancel" closes without change. The key written and read here is `labelListArray`, not the
`labelButtonsArray` of the "Preset..." loader ([BEH-647](#beh-647-preset-loads-a-label-list-from-the-server "'Preset...' loads a label list from the server")). Existing observations are not modified when labels are
renamed or removed.

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `LabelListDialog`, `labelListDialog`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#dialog-form-mainLabelList`, `#mainLabelList-jsGrid`, `#mainLabelList-JSON`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-601](#beh-601-label-button-panel-is-generated-from-a-label-list "Label button panel is generated from a label list"), [BEH-608](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries"), [BEH-647](#beh-647-preset-loads-a-label-list-from-the-server "'Preset...' loads a label list from the server"), [DEBT-619](view_debt.md#debt-619-unvalidated-or-silently-dropped-input-in-label-and-id-editors "Unvalidated or silently dropped input in label and ID editors"), [OQ-610](../../QUESTIONS.md#oq-610 "Which JSON format is the label-list interchange: `labelListArray` (Edit dialog) or `labelButtonsArray` (Preset loader)?")

## BEH-610: `bool_acts` is re-derived from labels on every form-to-observation update

`updateObsActivityFromForm(obs)` (via `updateRectObsActivity`, and `addRect` for `new`
rectangles) and `setLabels` set `obs.bool_acts[0..3]` to `hasLabel` of fanning, pollen, entering,
leaving respectively; the first also sets `obs.notes` from `#notes`. `bool_acts` is never the
source: it is overwritten from `labels`, so editing `bool_acts` alone has no lasting effect.
Readers of `bool_acts` remain elsewhere (chronogram colouring, rectangle label letters F P E L,
CSV export). `copyObs` copies the four flags (or `[false x4]` when absent). This is the shim of
[DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic") and [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics"): every use is `DEBT`.

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateObsActivityFromForm`, `setLabels`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`, `Observation`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-603](view_debt.md#debt-603-bool_acts-shim-and-its-dead-helpers "`bool_acts` shim and its dead helpers"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [OQ-601](../../QUESTIONS.md#oq-601 "Which labels are predefined, and are the single-letter aliases intended?")

## BEH-611: `automatic_sub` commits only already-stored rectangles

After a label, notes, labels-box, geometry or skeleton edit, `automatic_sub` runs: if the active
rectangle has `status == "db"` it calls `submit_bee` ([BEH-612](#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation")). If the status is `new` (not yet
in `Tracks`) it only calls `videoControl.refresh()` and `refreshChronogram()` and logs "not
submitted, as tmp rect"; the edit then lives only on the temporary rectangle and is lost if the
rectangle is deselected (`onObjectDeselected` removes `new` rectangles). It throws if there is no
active object (no null check).

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `automatic_sub`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onObjectDeselected`
- **Links:** [BEH-612](#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")

## BEH-612: `submit_bee` stores the active rectangle's observation

`submit_bee` takes the active Fabric rectangle (its argument, passed by some callers, is
ignored). With none: message "No bee selected" (red), returns false. With status `new` and an
observation already stored at (current frame, id): message "Conflict of ID: bee X already exists
in this frame." (red), nothing stored, returns false. With status `db` but no stored observation
at (current frame, id): logs, shows "Internal issue. See console.log" (red) and returns true
without storing (although the log says "Writing anyway"). Otherwise `obs.ID = rect.id`,
`storeObs(obs)` (`copyObs` into `Tracks[frame][ID]`, creating it if needed), `status = "db"`,
`videoControl.refresh()` (rebuilds all rectangles of the frame from `Tracks` and re-selects
`defaultSelectedBee`) and `refreshChronogram()`; the success path returns undefined. The fields
copied by `storeObs` do not include `span`, which therefore survives on an existing stored
observation but is absent from the rectangle's clone (see [BEH-637](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry")).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `storeObs`, `getObsHandle`, `copyObs`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [BEH-611](#beh-611-automatic_sub-commits-only-already-stored-rectangles "`automatic_sub` commits only already-stored rectangles"), [DEBT-604](view_debt.md#debt-604-submit_bee-return-values-and-ignored-argument "`submit_bee` return values and ignored argument")

## BEH-613: A pollination visit is an observation with a `visit` field

A visit is stored in `Tracks` like any observation (same frame/ID indexing). Its ID is
`"V-" + pollinatorID + "-" + flowerID`. Extra fields: `visit = {pollinator, flower}` (the two
IDs) and `span = {f1, f2}` (frame interval). By convention pollinator IDs begin with `P` and
flower IDs with `F` (checked by the picking code, [BEH-615](#beh-615-picking-pollinator-or-flower-on-the-overlay "Picking pollinator or flower on the overlay")). The visit box is centered between the
centers of the two boxes, with the current default box size. Because it is in `Tracks`, a visit
is saved, loaded, drawn, listed in the chronogram and the observation table, and deleted
([BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation")) like any event; the chronogram can hide IDs starting with `F` through
`flag_hideFlowers`. `copyObs` copies `visit` by reference. A legacy variant, `visit.flowerid`
written by Pick Flower, exists ([BEH-625](#beh-625-legacy-pick-flower-in-pick-frame-mode "Legacy 'Pick Flower' in pick-frame mode")).

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-605](view_debt.md#debt-605-visits-as-events-with-ad-hoc-subfields-two-incompatible-forms "Visits as events with ad-hoc subfields, two incompatible forms"), [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [OQ-603](../../QUESTIONS.md#oq-603 "Are pollination visits (V-P-F, ID prefixes P/F) and the legacy Pick Flower in use?")

## BEH-614: Visit panel layout, content and lifetime

`new VisitWidget(overlay)` is created with the overlay (`overlay.visitWidget`) and calls
`create()`, which writes the panel into `#visitblockdiv` (Visits subpanel `#visitblock`, a
collapsed accordion by default): "EDIT VISIT:" with a DISMISS button; "visit event, frame
`#frame`, id `#visit_id`"; buttons Goto / Create / Delete (classes `goto-visit`, `new-visit`,
`delete-visit`); Pollinator id (`#pollinator_id`) with Goto and Pick buttons; Flower id
(`#flower_id`) with Goto and Pick buttons; Start frame (`#start-frame`) with Goto and Set; End
frame (`#end-frame`) with Goto and Set. `update()` refreshes these texts and shows `??` for unknown
values. The frame shown is the visit's, else the pollinator's, else the flower's. When a visit is
set, the pollinator and flower are re-read from `Tracks` in the visit's frame (and become undefined
if not annotated in that frame). When no visit is set, `update()` looks up
`"V-"+pollinator+"-"+flower` in that frame and, if found, adopts it as the widget's visit (a side
effect of refreshing). DISMISS (`close`) clears visit, pollinator, flower, id and frame. The widget
keeps its state in the instance (`pollinator`, `flower`, `visit`, `frame`). Which buttons are
enabled: [BEH-650](#beh-650-visit-panel-enabling-rules-and-pick-highlight "Visit panel enabling rules and pick highlight").

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget`, `VisitWidget.prototype.create`, `VisitWidget.prototype.update`, `VisitWidget.prototype.close`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#visitblock`, `#visitblockdiv`
- **Links:** [BEH-613](#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field "A pollination visit is an observation with a `visit` field"), [BEH-615](#beh-615-picking-pollinator-or-flower-on-the-overlay "Picking pollinator or flower on the overlay"), [BEH-616](#beh-616-create-visit "Create visit"), [BEH-650](#beh-650-visit-panel-enabling-rules-and-pick-highlight "Visit panel enabling rules and pick highlight"), [DEBT-606](view_debt.md#debt-606-visitwidget-code-defects "VisitWidget code defects")

## BEH-615: Picking pollinator or flower on the overlay

Pick (pollinator or flower) calls `overlay.setInteractionMode('edit-visit', {pickMode})`, which
sets `overlay.interaction` and hard-refreshes the overlay. In this mode `onMouseDown` handles
clicks first (after pausing the video, clearing the message, and after the Alt+click panning
shortcut which has priority). With `pickMode` pollinator or flower: a click on a rectangle calls
`visitWidget.setPollinator(target.obs)` / `setFlower`; the observation is accepted only if
`String(ID)` starts with `P` (pollinator) or `F` (flower); accepted or not, the interaction mode
returns to `main` and the widget updates (a rejected pick is only logged to the console, with no
user message). A click on the empty background keeps the mode and does nothing (returns false).
With any other `pickMode`, a click cancels back to `main`. The picked `obs` is the rectangle's
cloned observation, replaced by the stored one at the next `update` when a visit is set. Whether the
same mouse press also selects the clicked box (Fabric `object:selected`, which would change the
current ID) is not established by the code read ([OQ-613](../../QUESTIONS.md#oq-613 "When picking a pollinator or flower on the overlay, is the clicked box also selected?")).

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.pickMode`, `VisitWidget.prototype.setPollinator`, `VisitWidget.prototype.setFlower`, `OverlayControl.prototype.setInteractionMode`, `onMouseDown`
- **Links:** [BEH-614](#beh-614-visit-panel-layout-content-and-lifetime "Visit panel layout, content and lifetime"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [DEBT-606](view_debt.md#debt-606-visitwidget-code-defects "VisitWidget code defects")

## BEH-616: Create visit

Create (enabled when pollinator and flower are set and no visit is set) stores a new observation
in the current frame: `ID = "V-"+P+"-"+F`, `frame` = current frame, `time` = current video time,
center at the midpoint of the two box centers, size `default_width` x `default_height` (globals,
100 x 100 until a box is drawn, then the latest box size), `angle 0`, `notes ''`, `labels ''`,
`visit = {pollinator, flower}`, `span = {f1: frame, f2: frame}`. It goes through `storeObs`, which
does not copy `span` ([BEH-612](#beh-612-submit_bee-stores-the-active-rectangles-observation "`submit_bee` stores the active rectangle's observation")), so the stored visit has no `span` (the `Observation` constructor defines none) and the panel shows `??` for
start and end until Set is used ([BEH-619](#beh-619-set-start-and-end-frame-of-a-visit "Set start and end frame of a visit")). The widget then holds the stored visit, the overlay
is hard-refreshed and the chronogram refreshed. If an observation with the same ID already exists
in the current frame, `storeObs` overwrites its fields (a `span` it already has is kept); the Create-disabled guard only looks the
visit up in the pollinator's frame ([BEH-614](#beh-614-visit-panel-layout-content-and-lifetime "Visit panel layout, content and lifetime")). The pollinator and flower may have been picked in
other frames than the current one. `newVisit` only logs and returns when pollinator or flower is missing. Creation is not undoable
([BEH-638](#beh-638-what-is-undoable "What is undoable")).

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.newVisit`, `default_width`, `default_height`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `storeObs`, `copyObs`
- **Links:** [BEH-613](#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field "A pollination visit is an observation with a `visit` field"), [BEH-638](#beh-638-what-is-undoable "What is undoable"), [DEBT-607](view_debt.md#debt-607-copyobs-omits-span-so-new-visits-and-undeleted-events-lose-it "`copyObs` omits `span`, so new visits and undeleted events lose it")

## BEH-617: Delete visit

Delete (enabled when a visit is set) clears the widget's visit and calls
`deleteEvent(visit.frame, visit.ID)` ([BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation")): the visit leaves `Tracks`, an undo entry is
pushed (so it can be restored with the Undo button, [BEH-639](#beh-639-undo-button-restores-the-last-deleted-observation "Undo button restores the last deleted observation")), the video view and chronogram
refresh. Pollinator and flower stay in the widget. On a plain observation loaded through [BEH-644](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit") this
deletes that observation.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.deleteVisit`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteEvent`
- **Links:** [BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation"), [BEH-639](#beh-639-undo-button-restores-the-last-deleted-observation "Undo button restores the last deleted observation"), [BEH-644](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit")

## BEH-618: Goto buttons of the visit panel

Goto (visit), Goto (pollinator) and Goto (flower) call `selectBeeByIDandFrame(ID, frame)`
([BEH-633](#beh-633-select-by-id-and-frame "Select by ID and frame")) with the visit's, pollinator's or flower's own `ID` and `frame`; they do nothing when
the object is not set. The Start and End Goto buttons use the visit ID with `span.f1` / `span.f2`
and do nothing without a visit or without a span.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.gotoObs`, `VisitWidget.prototype.gotoSpanFrame`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByIDandFrame`
- **Links:** [BEH-633](#beh-633-select-by-id-and-frame "Select by ID and frame"), [BEH-614](#beh-614-visit-panel-layout-content-and-lifetime "Visit panel layout, content and lifetime")

## BEH-619: Set start and end frame of a visit

Set (start) writes the current frame into `visit.span.f1`, Set (end) into `visit.span.f2`. If the
stored visit has no `span`, `{f1: visit.frame, f2: visit.frame}` is created first. Start is
refused (console log only, panel refreshed) when the current frame is greater than `visit.frame`;
end is refused when it is smaller. So the span always contains the visit's own frame. The panel
and chronogram are refreshed. Not undoable. No-op without a visit.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.setSpanFrame`
- **Links:** [BEH-613](#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field "A pollination visit is an observation with a `visit` field"), [BEH-638](#beh-638-what-is-undoable "What is undoable"), [CAP-303](view_capabilities.md#cap-303-event-display "Event display")

## BEH-620: Selecting a visit rectangle loads it into the visit panel

In `onObjectSelected`, after `selectBee`, the stored observation of the selected rectangle is
read and, if its `visit` field is truthy (even `{}`, [BEH-644](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit")), `visitWidget.selectVisit(obs)` sets it as the widget's visit
(it also assigns an undeclared global `default_id`, which has no effect, [DEBT-606](view_debt.md#debt-606-visitwidget-code-defects "VisitWidget code defects")) and updates the
panel (pollinator and flower re-read from the visit's frame). Selecting a non-visit observation
leaves the panel unchanged (the last visit stays shown); only DISMISS or Delete clears it. The
Visits subpanel is not opened automatically.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onObjectSelected`, `VisitWidget.prototype.selectVisit`
- **Links:** [BEH-614](#beh-614-visit-panel-layout-content-and-lifetime "Visit panel layout, content and lifetime"), [BEH-631](#beh-631-selecting-and-deselecting-a-rectangle "Selecting and deselecting a rectangle"), [BEH-644](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit"), [DEBT-606](view_debt.md#debt-606-visitwidget-code-defects "VisitWidget code defects")

## BEH-621: Timeline widget (unfinished)

`new TimelineWidget(overlay)` builds, in `#timelineblockdiv` (block `#timeline`, hidden until the
Features checkbox `#showTimeline` is ticked), "TIMELINE:", a row of 7 frame cells (deltas -3..+3,
label "Frame ???", an `<img>`) and buttons Zoom+, Zoom-, Size+, Size-. It is unfinished ([DEBT-608](view_debt.md#debt-608-timelinewidget-is-unfinished-and-broken "TimelineWidget is unfinished and broken")):
nothing feeds it frames, so the images stay empty; Size+/Size- (multiply `displaySize` by 1.5 or
1/1.5, rounded, clamped to 50..1000) call `update()`, which resets `#timelineblockdiv` to
"TIMELINE:" with an empty list, so the buttons and cells disappear; Zoom+/Zoom- do not work. The
working timeline is the pick-frame one ([BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline")).

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `TimelineWidget`, `TimelineWidget.prototype.create`, `TimelineWidget.prototype.update`, `TimelineWidget.prototype.redraw`, `TimelineWidget.prototype.onClick`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#timeline`, `#timelineblockdiv`, `#showTimeline`
- **Links:** [DEBT-608](view_debt.md#debt-608-timelinewidget-is-unfinished-and-broken "TimelineWidget is unfinished and broken"), [BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline")

## BEH-622: Pick-frame mode (Set Span) on the selected observation

The button "Set Span" (`modifyCurrentObsSpan('setspan')`, class `setspan`) enters the pick-frame
interaction mode on the selected observation: `modifyCurrentObsSpan` first applies the checks and
span creation of [BEH-623](#beh-623-span-buttons-of-the-selected-tab "Span buttons of the 'Selected' tab"), then calls `overlay.setInteractionMode('pick-frame', {type:'setspan'})`.
The mode needs an active rectangle with an `obs` (otherwise console log and no mode change). On
entry `interaction.opts` becomes {type, obs (the rectangle's observation), id (`obs.ID`), frame
(current video frame), showTimeline false}; `refreshInteraction` gives the `setspan` buttons class
`active` (every refresh first removes the `setspan` and `edit-visit` highlights) and the overlay is
hard-refreshed, which builds the panel ([BEH-645](#beh-645-pick-frame-panel-set-startend-goto-close "Pick-frame panel: Set Start/End, Goto, CLOSE")). While the mode is active, each `hardRefresh`
re-selects the rectangle of `opts.id` (not the current ID) and ensures the stored observation at
(`opts.frame`, `opts.id`) has a `span` (`{f1: frame, f2: frame}` if missing, a write into `Tracks`
during a refresh). If that observation no longer exists when the overlay refreshes, the mode is
reset to `main` (its `opts` becomes undefined), the current ID is re-selected and the panel is left
as it was ([BEH-645](#beh-645-pick-frame-panel-set-startend-goto-close "Pick-frame panel: Set Start/End, Goto, CLOSE")).

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `modifyCurrentObsSpan`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.setInteractionMode`, `OverlayControl.prototype.refreshInteraction`, `OverlayControl.prototype.hardRefresh`
- **Links:** [BEH-623](#beh-623-span-buttons-of-the-selected-tab "Span buttons of the 'Selected' tab"), [BEH-645](#beh-645-pick-frame-panel-set-startend-goto-close "Pick-frame panel: Set Start/End, Goto, CLOSE"), [BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline"), [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [DEBT-609](view_debt.md#debt-609-pick-frame-panel-built-inside-overlaycontrolhardrefresh "Pick-frame panel built inside `OverlayControl.hardRefresh`"), [SEAM-604](view_seams.md#seam-604-interaction-modes-of-the-overlay-main-pick-frame-edit-visit "Interaction modes of the overlay (main, pick-frame, edit-visit)")

## BEH-623: Span buttons of the "Selected" tab

`modifyCurrentObsSpan(mode)` acts on the stored observation of the active rectangle (console log
only without a selection). The stored observation is read as `Tracks[frame][id]` (a TypeError if the
frame has no observations at all, as for a temporary `new` rectangle in an empty frame). It finds the observation in `flatTracksAll` (identity match; silently
does nothing if it is filtered out, for example by ID restrict/exclude or the frame filter) and
creates `obs.span` from the computed track span (`track.span`; `updateFlatTracks` does not set it and where it is
assigned was not in the evidence) if absent. Buttons (tab `#selectedTab`, hidden
until `#showSelected` is ticked): extend-left `extendleft`: `f1 -= 10` (floor 0); extend-right
`extendright`: `f2 += 10` (no upper bound); restrict-left `restrictleft`: `f1 += 10` (capped at
`obs.frame`); restrict-right `restrictright`: `f2 -= 10` (floored at `obs.frame`); `copy` only
creates the span; `setspan` is [BEH-622](#beh-622-pick-frame-mode-set-span-on-the-selected-observation "Pick-frame mode (Set Span) on the selected observation") (it returns before the chronogram recomputation). After a change `updateTagsLabels()` and `drawChrono()`
recompute the chronogram; there is no `videoControl.refresh` and no undo. The step 10 is
hard-coded.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `modifyCurrentObsSpan`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateTagsLabels`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#selectedTab`
- **Links:** [BEH-622](#beh-622-pick-frame-mode-set-span-on-the-selected-observation "Pick-frame mode (Set Span) on the selected observation"), [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-624: "Draw timeline (Experimental)" button

`overlay.drawTimelineCurrentObject()` pauses the video, preloads frames at deltas
-16,-8,-4,-2,-1,0,1,2,4,8,16 (`videoCache.preloadFrames`), hard-refreshes the overlay, writes
"Timeline:" in `#alerttext` and calls `getFrameCropCurrentObject` once per delta. Each call checks the
active rectangle: with none it prints "Timeline: please select an annotation", so without a selection
the pause, preload and hard refresh still happen and the message is printed 11 times, replacing
"Timeline:"; with a rectangle lacking `obs` it prints "Timeline: annotation missing obs internal
data. Try changing frame". Otherwise it appends to `#alerttext` a cell "Frame N" (N = observation
frame + delta, not the current frame) with a cropped image (200 px display, crop side = 4 x the
larger box side, centered on the box). Frames below 0 give an empty image. Any later `printMessage`
replaces the timeline.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.drawTimelineCurrentObject`, `OverlayControl.prototype.getFrameCropCurrentObject`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#selectedTab`, `#alerttext`
- **Links:** [BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline")

## BEH-625: Legacy "Pick Flower" in pick-frame mode

The Pick Flower button of the pick-frame panel (`pickFlowerButtonCallback`) toggles
`interaction.opts.showPickFlower` (kept only in the pick-frame mode's opts, so lost when the mode
changes) and the class of `.button-showPickFlower`; showing calls `drawImagePickFlowerMode`, hiding
empties `#pickflowerdiv`. The drawing pauses the video and, if the mode is `pick-frame` and the
stored observation exists, appends to `#pickflowerdiv` a cropped frame of the observation (same crop
rule as [BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline")) with a dot and ID label for every flower (IDs starting with `F`) taken from
`Tracks[0]` only (frame 0); the flower of `obs.visit.flowerid` is green. Moving the mouse highlights
the closest flower within 200 video pixels; a click writes its ID to `obs.visit.flowerid` of the
stored observation (nothing changes when none is within 200 px); the "No visit" button sets
`flowerid` to undefined. Opening the panel also creates `visit = {}` ([BEH-644](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit")). It uses a different
representation (`visit.flowerid`) than the V-P-F visit ([BEH-613](#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field "A pollination visit is an observation with a `visit` field")). Failures ([DEBT-618](view_debt.md#debt-618-legacy-pick-flower-has-side-effects-and-failure-paths "Legacy Pick Flower has side effects and failure paths")): if `Tracks[0]`
is undefined the draw throws after the title, "No visit" button and plain crop were added and before
the mouse handlers are bound; `drawFlowersMainCanvas`, called at each click after the write, uses a
`radius` that is not in its scope, so each click with at least one flower raises a ReferenceError unless a global `radius` exists; the only
candidate is an undeclared assignment `radius = 3` elsewhere in `OverlayControl.js`, which creates
one only if that code has run.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.pickFlowerButtonCallback`, `OverlayControl.prototype.drawImagePickFlowerMode`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#pickflowerdiv`, `#showPickFlower`
- **Links:** [DEBT-605](view_debt.md#debt-605-visits-as-events-with-ad-hoc-subfields-two-incompatible-forms "Visits as events with ad-hoc subfields, two incompatible forms"), [DEBT-618](view_debt.md#debt-618-legacy-pick-flower-has-side-effects-and-failure-paths "Legacy Pick Flower has side effects and failure paths"), [BEH-613](#beh-613-a-pollination-visit-is-an-observation-with-a-visit-field "A pollination visit is an observation with a `visit` field"), [BEH-644](#beh-644-opening-pick-flower-makes-the-observation-count-as-a-visit "Opening Pick Flower makes the observation count as a visit"), [BEH-645](#beh-645-pick-frame-panel-set-startend-goto-close "Pick-frame panel: Set Start/End, Goto, CLOSE"), [OQ-603](../../QUESTIONS.md#oq-603 "Are pollination visits (V-P-F, ID prefixes P/F) and the legacy Pick Flower in use?")

## BEH-626: Events info panel: box geometry of the selected observation

In the "Events info" subpanel (`#beeinfo`), `updateForm(rect)` writes `#I` (the ID) and, in `#X`,
`#Y`, `#W`, `#H`, `#CX`, `#CY`, the video-pixel geometry rounded to integers (`toFixed(0)`):
top-left (X, Y), Width, Height, and center = left + width/2, top + height/2, converted from canvas
to video coordinates with `canvasToVideoRect`. With no selection (`updateForm(null)`) it writes
`I = "-"` and "X: -", "Y: -", "Width: -", "Height: -", "Center X: -" for both center cells (the
`#CY` cell wrongly says "Center X"). `updateForm` also empties `#newid`, `#notes`, `#labels` and
deactivates all label buttons when null, and sets notes, labels, newid and the button states from
the observation otherwise. It is called on selection, deselection, while moving or scaling
(`onObjectMoving`) and after modification and label edits. If the rectangle has no `obs`, it logs
an error and returns after the geometry part.

- **Group:** [CAP-603](view_capabilities.md#cap-603-summaries-and-statistics "Summaries and statistics")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateForm`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#beeinfo`, `#X`, `#Y`, `#W`, `#H`, `#CX`, `#CY`, `#I`
- **Links:** [BEH-605](#beh-605-free-text-labels-box "Free-text labels box"), [BEH-606](#beh-606-notes-box "Notes box"), [DEBT-610](view_debt.md#debt-610-events-info-and-statistics-defects "Events-info and statistics defects")

## BEH-627: Update Statistics button

The "Update Statistics" button (`updateAnnotationStatistics`) scans all of `Tracks` (every frame,
every stored observation, no filter) and writes into `#annotation-statistics`, separated by
`<br>`: `num_events` (number of observations), `unique_ids` (distinct `ID` values),
`unique_frames` (distinct `frame` values), then the lists `ids` and `frames` (comma-joined, in
encounter order: frames ascending, IDs as enumerated by the browser). The same values are logged
to the console. It is computed only on click; it is not refreshed automatically and shows "-"
before the first click. No selection is involved.

- **Group:** [CAP-603](view_capabilities.md#cap-603-summaries-and-statistics "Summaries and statistics")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateAnnotationStatistics`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#annotation-statistics`, `#beeinfo`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-610](view_debt.md#debt-610-events-info-and-statistics-defects "Events-info and statistics defects")

## BEH-628: Observation table ("Labeling" tab)

`renderObsTable` fills `#obsTable` (tab `#labelingTab`, an accordion collapsed by default) with a
table with columns ID, Frame, Labels and one row (`tr.obsTableRow`, hover background, gray
border) per element of `flatTracks`, that is the observations of `Tracks` (in frame then ID
enumeration order) restricted (in `updateFlatTracks`) by the frame filter when active, the restrict and exclude ID
lists, and hide-invalid (falsealarm/wrongid) when `flag_hideInvalid`. The chronogram data also
honors `flag_hideFlowers` (IDs starting with `F`); the table does not, so flowers stay listed. The
table is rebuilt from scratch (`html("")`) on every call, and only if the Labeling accordion
header does not have class `ui-accordion-header-collapsed`; while collapsed nothing is built and
the previous table stays. It is called at the end of `refreshChronogram`, and by `updateObsTable`
(which first rebuilds `flatTracks`; no caller found). The Labels column shows the raw `labels`
string (cells are inserted with `.html()`, not escaped). There is no pagination: one row per observation in the video.

- **Group:** [CAP-603](view_capabilities.md#cap-603-summaries-and-statistics "Summaries and statistics")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderObsTable`, `updateObsTable`, `updateFlatTracks`, `refreshChronogram`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labelingTab`, `#obsTable`
- **Links:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-611](view_debt.md#debt-611-observation-table-rebuilt-on-every-refresh-gated-by-an-accordion-css-class "Observation table rebuilt on every refresh, gated by an accordion CSS class"), [OQ-604](../../QUESTIONS.md#oq-604 "Is the observation-table tooltip and flash on selection wanted?")

## BEH-629: Clicking a row of the observation table selects the observation

A click on a row calls `gotoEvent(Number(frame), id)` (also used by the pick-frame Goto buttons and
timeline cells): it pauses the video and sets `defaultSelectedBee = id`. If the frame is the current
one the rectangle is selected (`selectBeeByID`); otherwise the video seeks to the frame and the
selection is applied by the overlay refresh after the seek. When the click mode "AutoCentering" is
on, it highlights that button and calls `autoCentering(obs)` with the stored observation at (frame,
id), looked up before the seek completes (undefined when none exists). The row itself is not
highlighted after the click (no selected class or flash in the code).

- **Group:** [CAP-603](view_capabilities.md#cap-603-summaries-and-statistics "Summaries and statistics")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderObsTable`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
- **Links:** [BEH-630](#beh-630-two-notions-of-selection-current-id-and-active-rectangle "Two notions of selection: current ID and active rectangle"), [BEH-633](#beh-633-select-by-id-and-frame "Select by ID and frame"), [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation"), [OQ-604](../../QUESTIONS.md#oq-604 "Is the observation-table tooltip and flash on selection wanted?")

## BEH-630: Two notions of selection: current ID and active rectangle

Selection has two pieces of state. (1) The current ID (`defaultSelectedBee`), which survives frame
changes: after an `overlay.hardRefresh` in main or edit-visit mode, the rectangle with that ID is
re-selected if it exists in the new frame; in pick-frame mode the re-selected ID is the mode's
`opts.id` instead. It is undefined when nothing was chosen or after an explicit deselect. (2) The
active Fabric rectangle of `canvas1` (truth for "is there a selected observation in this frame",
used by `getSelectedID` and `getSelectedRect`); `getSelectedID()` returns undefined when there is
none. The current ID can exist without a rectangle (bee not annotated in this frame, only a tag):
this enables the Annotate button ([BEH-635](#beh-635-annotate-button-and-delete-button-states-follow-the-selection "Annotate button and Delete button states follow the selection")) and the label creation path ([BEH-603](#beh-603-toggling-a-label-with-no-active-rectangle-first-annotates-the-current-tag "Toggling a label with no active rectangle first annotates the current tag")). `getCurrentID`
returns the current ID, `getCurrentTag` the tag of that ID in the current frame. The chronogram
follows the selection (`updateChronoSelection` calls `axes.selectId`). Selection state is not saved
and is not part of the undo stack. `tagSelection` is written and never read ([DEBT-612](view_debt.md#debt-612-selection-state-split-across-globals-and-the-fabric-canvas "Selection state split across globals and the Fabric canvas")).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `defaultSelectedBee`, `getSelectedID`, `getSelectedRect`, `getCurrentID`, `getCurrentTag`, `tagSelection`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoSelection`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.hardRefresh`, `OverlayControl.prototype.getActiveObject`
- **Links:** [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [DEBT-612](view_debt.md#debt-612-selection-state-split-across-globals-and-the-fabric-canvas "Selection state split across globals and the Fabric canvas"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-631: Selecting and deselecting a rectangle

`selectBee(rect)` (called from the Fabric `object:selected` handler `onObjectSelected`, from
`selectBeeByID`, and from undo) updates the Delete button, sets `defaultSelectedBee = rect.id`,
fills the form (`updateForm(rect)`) and triggers on the `selectionControl` object the events
`tagselection:created` and `selection:created`. `deselectBee()` (click outside a rectangle in
select mode, a multi-frame click that finds nothing, `selectBeeByIDandFrame`) triggers
`before:selection:cleared`, deactivates all canvas objects, empties the form, sets
`defaultSelectedBee = undefined`, updates the Delete button and triggers `tagselection:cleared`
and `selection:cleared`. Listeners (registered in `initSelectionControl`): `tagselection:*` →
`updateChronoSelection`; `tagselection:created` → `updateSelectID` (copies the current ID to
`#selectID`); `tagselection:*` and `selection:*` → `updateFormButtons`. Clearing does not reset
the `#selectID` text. `selectionControl` is a plain object used only as a jQuery event bus.
`onObjectSelected` also records the previous and last selected rectangle on the overlay and updates the
Delete button. `onObjectDeselected` removes the temporary (`new`, not stored) rectangle when it loses selection.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBee`, `deselectBee`, `initSelectionControl`, `updateSelectID`, `selectionControl`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onObjectSelected`, `onObjectDeselected`
- **Links:** [BEH-630](#beh-630-two-notions-of-selection-current-id-and-active-rectangle "Two notions of selection: current ID and active rectangle"), [BEH-632](#beh-632-select-by-typing-an-id "Select by typing an ID"), [BEH-635](#beh-635-annotate-button-and-delete-button-states-follow-the-selection "Annotate button and Delete button states follow the selection"), [SEAM-601](view_seams.md#seam-601-selection-events-and-current-id-access "Selection events and current-ID access")

## BEH-632: Select by typing an ID

Typing an ID in the `#selectID` text input (Selected tab, `onchange` = `onSelectIDChanged`) selects
it: the value is trimmed and `selectBeeByID(id)` runs. If a canvas rectangle has that ID
(`rect.id == id`, loose equality, first match via `findRect`) it becomes active and `selectBee` runs
(events of [BEH-631](#beh-631-selecting-and-deselecting-a-rectangle "Selecting and deselecting a rectangle")); the function returns true. Otherwise the canvas is deselected, the form emptied,
the ID becomes the current ID (so a tag-only ID can be current), `tagselection:created` is triggered
(`:cleared` if `id == null`), `axes.selectId(id)` highlights the row in the chronogram, and it
returns false. An empty string is not null, so it yields "created" with ID `""`. The PrevID/NextID
buttons and `gotoEvent` use the same function.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByID`, `onSelectIDChanged`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `findRect`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#selectID`
- **Links:** [BEH-631](#beh-631-selecting-and-deselecting-a-rectangle "Selecting and deselecting a rectangle"), [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")

## BEH-633: Select by ID and frame

`selectBeeByIDandFrame(id, frame)` is the way views jump to an observation (visit panel, multi-frame
track clicks in the overlay). For another frame: deselect, the current ID becomes `id` and the video
seeks (the overlay refresh after the seek selects the rectangle if it exists); the video is not
paused. For the current frame: deselect, `selectBeeByID(id)` and `videoControl.refresh()`.
`gotoEvent` in `ChronoControlInteraction.js` is the variant used by the chronogram and the
observation table (it also pauses the video and may auto-center).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByIDandFrame`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
- **Links:** [BEH-618](#beh-618-goto-buttons-of-the-visit-panel "Goto buttons of the visit panel"), [BEH-629](#beh-629-clicking-a-row-of-the-observation-table-selects-the-observation "Clicking a row of the observation table selects the observation"), [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")

## BEH-634: IDs seen in the focus window

`getIdsInFocus` returns the distinct tag IDs (strings) present in `Tags` for the frames of the
current track window (`getWindow()`, clamped to 0..last frame). It does not look at `Tracks`. Its
only caller is the alternate-tags display of ZoomView ([CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), active when
`flagShowAlternateFocus`). A local `frange` is computed and not used.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `getIdsInFocus`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getWindow`
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `flagShowAlternateFocus`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

## BEH-635: Annotate button and Delete button states follow the selection

`updateFormButtons` (on every selection event) sets `#newRectForCurrentTag` ("Annotate"):
disabled when there is no current ID; enabled when there is a current ID but no active
rectangle; disabled and `active` when a rectangle is active. `updateDeleteButton` adds class
`disabled` to `#deleteButton` when there is no active object. These are CSS classes only: the
buttons stay clickable, but `newRectForCurrentTag` itself checks the `disabled` class and
`deleteSelected` checks for an active object. `updateDeleteButton` and `updateUndoButton` are
also called at the end of every `overlay.hardRefresh`.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateFormButtons`, `updateDeleteButton`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#newRectForCurrentTag`, `#deleteButton`
- **Links:** [BEH-631](#beh-631-selecting-and-deselecting-a-rectangle "Selecting and deselecting a rectangle"), [BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation"), [BEH-603](#beh-603-toggling-a-label-with-no-active-rectangle-first-annotates-the-current-tag "Toggling a label with no active rectangle first annotates the current tag")

## BEH-636: Deleting the selected observation

The Delete button (`#deleteButton`) and the keys Delete, Backspace and `d` (`onKeyDown`, ignored
when a text field or select has focus; the key press is consumed) call `deleteSelected`. With an
active rectangle it is removed from the canvas and `deleteEvent(currentFrame, rect.id)` runs
([BEH-637](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry")); with none it does nothing. Only the single active object is handled (the group
selection variable is unused). If the rectangle was a temporary `new` one (not in `Tracks`),
`deleteEvent` finds nothing, logs, returns false and no refresh or undo entry is produced. No
confirmation is asked ([OQ-607](../../QUESTIONS.md#oq-607 "Is the unconditional `Delete`/`Backspace`/`d` deletion without confirmation intended?")). `deleteSelected` is also used by "exclude rect"
(`onClickExcludeRectAdd`). The current ID after a deletion: [BEH-649](#beh-649-the-current-id-survives-deleting-its-observation "The current ID survives deleting its observation").

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteSelected`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onClickExcludeRectAdd`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#deleteButton`
- **Links:** [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [BEH-637](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry"), [BEH-638](#beh-638-what-is-undoable "What is undoable"), [BEH-649](#beh-649-the-current-id-survives-deleting-its-observation "The current ID survives deleting its observation"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")

## BEH-637: `deleteEvent` removes from `Tracks` and records an undo entry

`deleteEvent(frame, id)` returns false (console log) when `Tracks[frame][id]` does not exist.
Otherwise it clones the observation (`cloneObs`), deletes `Tracks[frame][id]` (an empty
`Tracks[frame]` object remains), pushes `{action: 'delete', obs}` on the undo stack, refreshes
the video view (`videoControl.refresh`) and the chronogram, and returns true. It is the single
path for undoable deletion: used by `deleteSelected`, the visit panel ([BEH-617](#beh-617-delete-visit "Delete visit")) and exclude rect.
`cloneObs` goes through `copyObs`, whose field list omits `span`: an undeleted observation loses
its `span` (including a visit's span); rectangles built from `Tracks` (`addRectFromObs`) are
such clones too.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteEvent`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `cloneObs`, `copyObs`, `obsDoesExist`
- **Links:** [BEH-638](#beh-638-what-is-undoable "What is undoable"), [BEH-639](#beh-639-undo-button-restores-the-last-deleted-observation "Undo button restores the last deleted observation"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEBT-613](view_debt.md#debt-613-undelete-loses-span-may-overwrite-a-new-observation "Undelete loses `span`; may overwrite a new observation")

## BEH-638: What is undoable

The undo stack (`undoStack`, a global array, never cleared, not tied to the loaded video)
receives entries only from `deleteEvent` (action `delete`). `undoPush` also has branches for
`new` and `move`, but nothing calls them. So only deletion is undoable. Not undoable: creating,
moving, resizing or rotating a box, ID change, swap ID, label, notes and newID edits, skeleton
edits, span changes (Selected tab, pick-frame, visit Set), visit creation, clean-up commands
("Delete FA Tags/Events..." are titled "NO UNDO"), loading or replacing annotations. The depth is
unlimited. `undoPop` discards an entry whose action is not `delete` after logging "not
implemented" and returns undefined (the button is not refreshed in that branch). [OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics") records
that undo is wanted more widely.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `undoPush`, `undoPop`, `undoStack`
- **Links:** [OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEBT-614](view_debt.md#debt-614-undo-covers-only-deletion-dead-branches "Undo covers only deletion; dead branches"), [BEH-637](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry")

## BEH-639: Undo button restores the last deleted observation

`undoAction` (button `#undoButton`, no keyboard shortcut) pops the last entry. For a `delete`:
the saved observation is written back with `storeObs` (silently overwriting anything now present
at the same frame and ID). If its frame differs from the current frame, the view seeks to that
frame and stops there (no selection is made, `defaultSelectedBee` unchanged, no explicit refresh
beyond the seek). If it is the current frame, a rectangle is created for it (`addRectFromObs`),
made active and `selectBee` is called, then `videoControl.refresh` and `refreshChronogram`. With
an empty stack: console error, nothing else. The restored observation has no `span` ([BEH-637](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry"));
`visit` is restored. There is no redo.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `undoAction`, `undoPop`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `addRectFromObs`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#undoButton`
- **Links:** [BEH-637](#beh-637-deleteevent-removes-from-tracks-and-records-an-undo-entry "`deleteEvent` removes from `Tracks` and records an undo entry"), [BEH-638](#beh-638-what-is-undoable "What is undoable"), [DEBT-613](view_debt.md#debt-613-undelete-loses-span-may-overwrite-a-new-observation "Undelete loses `span`; may overwrite a new observation")

## BEH-640: Undo button caption

`updateUndoButton` (after each push or pop, and at each overlay hard refresh): empty stack →
class `disabled` added and `.val("Undo")` called. Non-empty → `disabled` removed; for a `delete`
entry the button html becomes "Undelete <ID>" when the entry's frame is the current frame, else a
two-line caption "Undelete <ID><br> in frame <frame>" (`<p class='multiline'>`). Because the
empty case uses `.val` (which does not change a `<button>`'s label), after the last entry is
undone the caption still reads the previous "Undelete ..." text ([DEBT-615](view_debt.md#debt-615-undo-button-label-uses-val-on-a-button "Undo button label uses `.val()` on a `<button>`")). The `.val("Undo?")`
branch for other actions is unreachable.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `updateUndoButton`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#undoButton`
- **Links:** [DEBT-615](view_debt.md#debt-615-undo-button-label-uses-val-on-a-button "Undo button label uses `.val()` on a `<button>`"), [BEH-638](#beh-638-what-is-undoable "What is undoable")

## BEH-641: Keyboard handling around text fields

`onKeyDown` (global keydown handler) first tests the event target: for a textarea, select or an
input whose `type` is "text" (this includes `#labels`, `#notes`, `#selectID`, `#newid` and `#I`;
the `type="textbox"` of `#labels` and `#notes` is not a valid type and resolves to `text`) the key
is not interpreted as a shortcut and its propagation stops, so Delete, `d`, label accesskeys and
arrows do not act while typing. Escape there moves focus to `#left-side` and resets the form from
the active rectangle (`updateForm`), which also cancels an edit in progress in `#I`. Outside text
fields, Escape and Enter focus `#I` and select its content. The later branches of `onKeyDown` that
test for `#I` or text inputs cannot be reached ([DEBT-620](view_debt.md#debt-620-dead-branches-and-shadowed-keys-in-onkeydown "Dead branches and shadowed keys in `onKeyDown`")). The bindings of this file are described
in [BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation") and [BEH-608](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries"); navigation keys belong to [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek").

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#I`, `#notes`, `#labels`
- **Links:** [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek"), [BEH-606](#beh-606-notes-box "Notes box"), [BEH-608](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries"), [BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation"), [DEBT-620](view_debt.md#debt-620-dead-branches-and-shadowed-keys-in-onkeydown "Dead branches and shadowed keys in `onKeyDown`")

## BEH-642: SwapID dialog and confirmation

The "SwapID" button (`swapID_callback`) needs a selected rectangle ("No bee selected" in red
otherwise). It writes into `#alerttext` an inline form: "Swap current ID=X with new ID for frame F
until end. NewID=", a text input `#swapNewIDInput` (size 5, initialised with the current ID) and
SWAP / CANCEL buttons. SWAP counts the frames from the current one to the end of the video where
the old ID exists and those where both IDs exist, and shows "Swap ID X with Y nframes=N (including M
swaps)" with CONFIRM / CANCEL. CONFIRM runs the swap ([BEH-648](#beh-648-swapid-semantics-and-absence-of-validation "SwapID semantics and absence of validation")), then `videoControl.refresh` and
`refreshChronogram`. CANCEL, at either step, shows "SwapID canceled". The old ID is that of the
rectangle active when the form was opened. The change is not undoable.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `swapID_callback`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `getFramesWithID`, `getFramesWithSwapID`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#swapID`, `#alerttext`
- **Links:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [BEH-638](#beh-638-what-is-undoable "What is undoable"), [BEH-648](#beh-648-swapid-semantics-and-absence-of-validation "SwapID semantics and absence of validation"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")

## BEH-643: The `p` key does nothing

The `p` key (`e.key == "p"`) is consumed (`return false`) by `onKeyDown` after toggling the
checkbox `#P` with `$("#P").prop("checked", ...)` and triggering `change`. No element with id `P`
exists in the page, so `p` does not toggle the `pollen` label ([DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place") says `p` is a shortcut to
keep). Pollen can be toggled with its button ([BEH-602](#beh-602-clicking-a-label-button-toggles-that-label-on-the-selected-observation "Clicking a label button toggles that label on the selected observation")); an accesskey `p` cannot work either
([BEH-608](#beh-608-label-keyboard-shortcuts-come-only-from-accesskey-entries "Label keyboard shortcuts come only from `accesskey` entries")). See [DEBT-616](view_debt.md#debt-616-dead-p-shortcut "Dead `p` shortcut").

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
- **Links:** [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts"), [DEBT-616](view_debt.md#debt-616-dead-p-shortcut "Dead `p` shortcut")

## BEH-644: Opening Pick Flower makes the observation count as a visit

`drawImagePickFlowerMode` runs `if (!currentObs.visit) currentObs.visit = {}` on the stored
observation of the pick-frame mode every time the Pick Flower panel is opened, before any click.
`{}` is truthy, so `copyObs` keeps it (by reference) and the observation holds a `visit` field from
then on. Consequence read from the code (not run): when that observation is selected,
`onObjectSelected` sees a truthy `visit` and calls `visitWidget.selectVisit(obs)` ([BEH-620](#beh-620-selecting-a-visit-rectangle-loads-it-into-the-visit-panel "Selecting a visit rectangle loads it into the visit panel")); the
visit panel then shows it with `??` pollinator and flower, Delete is enabled, and `deleteVisit` calls
`deleteEvent(obs.frame, obs.ID)` on that ordinary observation. Opening the picker can therefore arm
the visit panel's Delete for a plain bee. Whether this is intended: [OQ-612](../../QUESTIONS.md#oq-612 "Is creating `visit = {}` when the Pick Flower panel opens intended?").

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.drawImagePickFlowerMode`, `onObjectSelected`, `VisitWidget.prototype.selectVisit`, `VisitWidget.prototype.deleteVisit`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
- **Links:** [BEH-625](#beh-625-legacy-pick-flower-in-pick-frame-mode "Legacy 'Pick Flower' in pick-frame mode"), [BEH-620](#beh-620-selecting-a-visit-rectangle-loads-it-into-the-visit-panel "Selecting a visit rectangle loads it into the visit panel"), [BEH-617](#beh-617-delete-visit "Delete visit"), [DEBT-618](view_debt.md#debt-618-legacy-pick-flower-has-side-effects-and-failure-paths "Legacy Pick Flower has side effects and failure paths"), [OQ-612](../../QUESTIONS.md#oq-612 "Is creating `visit = {}` when the Pick Flower panel opens intended?")

## BEH-645: Pick-frame panel: Set Start/End, Goto, CLOSE

In pick-frame mode `hardRefresh` rebuilds `#pickframediv` (block `#pickframeblock`, hidden until
`#showPickFrame` is ticked) from scratch at every refresh: "PICK FRAME: setting timespan for
ID=... at frame=...: " followed by the buttons. Set Start / Set End write the current video frame
into `span.f1` / `span.f2` of the stored observation with no ordering check (f1 may exceed f2 or
the event frame, unlike the visit panel's Set, [BEH-619](#beh-619-set-start-and-end-frame-of-a-visit "Set start and end frame of a visit"); [OQ-609](../../QUESTIONS.md#oq-609 "Should pick-frame Set Start and Set End reject an order inversion, as the visit panel's Set does?")), then hard-refresh the overlay and
refresh the chronogram; not undoable. CLOSE writes "Pick frame CLOSED" in `#pickframediv` and
returns to `main`. Goto Start / Goto Event / Goto End call `gotoEvent` for (`span.f1`, id),
(observation frame, id) and (`span.f2`, id). Show Timeline, Zoom+/-, Size+/-, Frames+/- are in
[BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline"); Pick Flower is [BEH-625](#beh-625-legacy-pick-flower-in-pick-frame-mode "Legacy 'Pick Flower' in pick-frame mode"). Only Show Timeline gets its `active` class restored from
`opts.showTimeline` at each rebuild; Pick Flower does not, although `opts.showPickFlower` is kept.
Only CLOSE clears the panel: when the mode ends otherwise (observation gone, or another mode
entered) the old buttons remain in the page with closures on the old observation, and some read
`overlay.interaction.opts`, which is then undefined or another mode's (for example Show Timeline
throws a TypeError when `opts` is undefined). `#pickflowerdiv` is emptied only by toggling Pick
Flower off.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.hardRefresh`, `OverlayControl.prototype.setInteractionMode`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#pickframediv`, `#pickframeblock`, `#showPickFrame`, `#pickflowerdiv`
- **Links:** [BEH-622](#beh-622-pick-frame-mode-set-span-on-the-selected-observation "Pick-frame mode (Set Span) on the selected observation"), [BEH-646](#beh-646-pick-frame-timeline "Pick-frame timeline"), [BEH-625](#beh-625-legacy-pick-flower-in-pick-frame-mode "Legacy 'Pick Flower' in pick-frame mode"), [BEH-619](#beh-619-set-start-and-end-frame-of-a-visit "Set start and end frame of a visit"), [DEBT-609](view_debt.md#debt-609-pick-frame-panel-built-inside-overlaycontrolhardrefresh "Pick-frame panel built inside `OverlayControl.hardRefresh`"), [OQ-609](../../QUESTIONS.md#oq-609 "Should pick-frame Set Start and Set End reject an order inversion, as the visit panel's Set does?")

## BEH-646: Pick-frame timeline

Show Timeline toggles `interaction.opts.showTimeline` (false at each mode entry), highlights its
button and either calls `drawTimelinePickFrameMode` or empties `#pick-frame-timeline`. The drawing
pauses the video (it writes "Paused, need to preload video frames" in `#alerttext` but does not
preload) and fills `#pick-frame-timeline` ("Timeline:") with one cell per delta from
-`timelineMaxDelta` to +`timelineMaxDelta` around the current video frame (not the event frame).
Each cell is a crop of that frame centered on the box of the stored observation (`opts.frame`,
`opts.id`), crop side = larger box side x `overlay.opts.timelineZoom` (rounded), displayed at
`overlay.opts.timelineDisplaySize` px. Cell label: "Frame N", prefixed "Current " for the current
frame, with suffix " Event" (frame equals `opts.frame`, class `selected`), " Start" (equals
`span.f1`, class `selected-f1`), " End" (equals `span.f2`, class `selected-f2`). A click on a cell
calls `gotoEvent(frame, id)`. Zoom+ multiplies `timelineZoom` by 1/1.5, Zoom- by 1.5 (no bounds);
Size+ / Size- multiply `timelineDisplaySize` by 1.5 / 1/1.5, rounded, clamped to 50..1000; Frames+ /
Frames- add / subtract 1 to `timelineMaxDelta`, clamped to 1..10; each redraws the timeline when it
is shown. The three options live in `overlay.opts`, so they persist across observations and modes.
Defaults in the overlay options: zoom 4.0, display size 300 px, max delta 3.

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.prototype.drawTimelinePickFrameMode`, `OverlayControl.prototype.getFrameCropImg`, `OverlayControl.prototype.hardRefresh`
- **Links:** [BEH-645](#beh-645-pick-frame-panel-set-startend-goto-close "Pick-frame panel: Set Start/End, Goto, CLOSE"), [BEH-622](#beh-622-pick-frame-mode-set-span-on-the-selected-observation "Pick-frame mode (Set Span) on the selected observation"), [BEH-621](#beh-621-timeline-widget-unfinished "Timeline widget (unfinished)"), [BEH-624](#beh-624-draw-timeline-experimental-button "'Draw timeline (Experimental)' button")

## BEH-647: "Preset..." loads a label list from the server

The Labels panel button "Preset..." calls `labelListFromServerDialog.openDialog()`
(`LabelListFromServerDialog` in `AnnotationIO.js`, hard-coded REST route `/rest/config/labellist/`).
The success handler of the load request needs a JSON object with a `labelButtonsArray` field; it
then replaces `labelButtonsArray` and calls `hardRefreshLabelTogglePanel` ([BEH-601](#beh-601-label-button-panel-is-generated-from-a-label-list "Label button panel is generated from a label list")). Without that
field it only logs and aborts, with no user message. This key differs from the `labelListArray` of
the Edit dialog's JSON tab ([BEH-609](#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')")), so a list saved from one is not loadable by the other
([OQ-610](../../QUESTIONS.md#oq-610 "Which JSON format is the label-list interchange: `labelListArray` (Edit dialog) or `labelButtonsArray` (Preset loader)?")). Existing observations are not modified. The loader code lives in the I/O code base
([CAP-700](view_capabilities.md#cap-700-annotation-model-and-io "Annotation model and IO") group).

- **Group:** [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `LabelListFromServerDialog`, `labelListFromServerDialog`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#dialog-labellist-from-server`
- **Links:** [BEH-601](#beh-601-label-button-panel-is-generated-from-a-label-list "Label button panel is generated from a label list"), [BEH-609](#beh-609-label-list-dialog-edit "Label list dialog ('Edit...')"), [DEBT-619](view_debt.md#debt-619-unvalidated-or-silently-dropped-input-in-label-and-id-editors "Unvalidated or silently dropped input in label and ID editors"), [OQ-610](../../QUESTIONS.md#oq-610 "Which JSON format is the label-list interchange: `labelListArray` (Edit dialog) or `labelButtonsArray` (Preset loader)?")

## BEH-648: SwapID semantics and absence of validation

`obs_swapID([currentFrame, -1], old, new)` visits each frame from the current one to
`videoinfo.nframes - 1`. Where the old ID exists it is renamed to the new ID, and if the new ID also
exists in that frame that observation is renamed to the old ID (a true swap, through a temporary ID
`SWAP_save_<new>`); the `ID` field of each renamed observation is updated. Earlier frames are
untouched; `Tags` and the current ID (`defaultSelectedBee`) are not changed, so the current ID then
designates the other bee. The new ID typed in `#swapNewIDInput` is used as is, without trimming or
validation: an empty value renames the observations to the ID `""`; a value equal to the old ID is
a no-op (the rename aborts when both IDs are equal) although the confirmation message still counts
frames ([OQ-611](../../QUESTIONS.md#oq-611 "Should SwapID refuse an empty or unchanged new ID?"), [DEBT-619](view_debt.md#debt-619-unvalidated-or-silently-dropped-input-in-label-and-id-editors "Unvalidated or silently dropped input in label and ID editors")).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `obs_swapID`, `changeObservationID`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `swapID_callback`
- **Links:** [BEH-642](#beh-642-swapid-dialog-and-confirmation "SwapID dialog and confirmation"), [DEBT-619](view_debt.md#debt-619-unvalidated-or-silently-dropped-input-in-label-and-id-editors "Unvalidated or silently dropped input in label and ID editors"), [OQ-611](../../QUESTIONS.md#oq-611 "Should SwapID refuse an empty or unchanged new ID?"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")

## BEH-649: The current ID survives deleting its observation

`deleteSelected` does not change `defaultSelectedBee`. After a deletion the ID therefore stays the
current ID: the refresh finds no rectangle for it in the frame, the form is empty and, if the bee's
tag is visible in this frame, the Annotate button becomes available ([BEH-635](#beh-635-annotate-button-and-delete-button-states-follow-the-selection "Annotate button and Delete button states follow the selection")) to annotate it again.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteSelected`, `defaultSelectedBee`, `updateFormButtons`
- **Links:** [BEH-636](#beh-636-deleting-the-selected-observation "Deleting the selected observation"), [BEH-630](#beh-630-two-notions-of-selection-current-id-and-active-rectangle "Two notions of selection: current ID and active rectangle"), [BEH-635](#beh-635-annotate-button-and-delete-button-states-follow-the-selection "Annotate button and Delete button states follow the selection"), [BEH-603](#beh-603-toggling-a-label-with-no-active-rectangle-first-annotates-the-current-tag "Toggling a label with no active rectangle first annotates the current tag")

## BEH-650: Visit panel enabling rules and pick highlight

`VisitWidget.update` sets the `disabled` property of the panel buttons: Create (`new-visit`) is
disabled if a visit is set or the pollinator or the flower is missing; Delete (`delete-visit`) is
disabled without a visit; the pollinator and flower Goto buttons (`select-pollinator`,
`select-flower`) are disabled without that object; both Pick buttons (`pick-pollinator`,
`pick-flower`) are disabled while a visit is set, so a new pair can only be chosen after DISMISS or
Delete. The Pick button of the active pick mode gets class `active` when the overlay is in
`edit-visit` mode; both lose it otherwise. The visit's own Goto and the Start/End Goto and Set
buttons are not touched by `update()`; they guard themselves ([BEH-618](#beh-618-goto-buttons-of-the-visit-panel "Goto buttons of the visit panel"), [BEH-619](#beh-619-set-start-and-end-frame-of-a-visit "Set start and end frame of a visit")).

- **Group:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `VisitWidget.prototype.update`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#visitblockdiv`
- **Links:** [BEH-614](#beh-614-visit-panel-layout-content-and-lifetime "Visit panel layout, content and lifetime"), [BEH-615](#beh-615-picking-pollinator-or-flower-on-the-overlay "Picking pollinator or flower on the overlay"), [BEH-618](#beh-618-goto-buttons-of-the-visit-panel "Goto buttons of the visit panel"), [BEH-619](#beh-619-set-start-and-end-frame-of-a-visit "Set start and end frame of a visit")
