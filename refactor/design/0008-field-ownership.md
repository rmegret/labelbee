# ADR 0008: Store-first editing and field ownership (slice 5)

Status: **proposed**, nothing implemented. Direction and decisions from the maintainer, 2026-11-14: [Q30](../QUESTIONS.md#q30)-[Q33](../QUESTIONS.md#q33)
answered. No question is open. This ADR is slice 5 of the plan ("observation operations" of [ADR 0007](0007-slice-events-api.md)); it replaces
steps 7b and 7c of ADR 0007, which are dropped. Numbers are those of `refactor` at `763afbb3`.

## 1. Principles (maintainer)

- **P1 Separation of concerns.** A module that edits parts does not need to know what a visit is, and the reverse. It extracts the
  field(s) it owns, edits, and commits them back with `Object.assign` semantics: a field that is not specified stays as it is. Each writer
  is responsible for writing properly; `events.update` is already a large auditing gain over writing directly ([Q32](../QUESTIONS.md#q32)).
- **P2 The store is the source of truth** for every discrete change, so that a change made in a view is seen by the others (labels
  changed, the overlay follows, and the reverse). There is no working copy of the data between a UI event and the store.
- **P3 Fabric keeps its own representation** (canvas units, scale, angle, origin). It is an adapter, not a data layer. Its
  `moving`, `scaling`, `rotating` events are intermediate; `modified` is the release of the button, and the one that commits.
- **P4 No draft.** A new observation is created at once, with a free id that can be changed later. Delayed initialization is a debt.
- **P5 Codecs own the conventions** of their format and convert with their own rules. The long-term vision (maintainer, 2026-11-14): only
  `cx`, `cy`, `width`, `height`, `angle` are used inside LabelBee, and `x`, `y` become a field computed for saving, since the top-left corner is
  a poor reference for a rotated rectangle (the angle is around the center). Until then both are stored and `x`, `y` are the truth of the JSON
  formats, `cx`, `cy` the truth of the CSV formats ([DEBT-739](../intent/debt.md)).
- **P6 A derived value is computed**, cached only if a measurement shows it is needed (`bool_acts`).

## 2. Where the code is (evidence, `763afbb3`)

**Already in line:** every write outside the editor is a field-scoped operation of `Events` (about 20 call sites, ADR 0007 steps 2-4).

**The working copy.** The editor clones an observation into `rect.obs` (`cloneObs`, `OverlayControl.js:2086,2267`) and six modules write on it. 18
call sites then commit all core fields from the snapshot: `submit_bee` 7 (`OverlayControl.js:870,892,3908,4034,4156`, `labelBee.js:740,802`),
`automatic_sub` 7 (`SelectionControl.js:947,959,969`, `ZoomView.js:416,1754,1810`, `OverlayControl.js:4560`), `storeObs` 4 (`labelBee.js:804`,
`SelectionControl.js:679,684`, `OverlayControl.js:434`). The overlay is rebuilt from the store at every refresh (`hardRefresh`: `canvas1.clear()`
then `createRectsFromTracks`, `OverlayControl.js:1514-1515`), so each working copy lives only until the next refresh.

**Creation is already immediate.** Shift-click and the "New annotation" click mode run `onMouseDown_predict` (`OverlayControl.js:4343,4365`): copy
the id and the geometry of a tag or of an observation of the previous frames, or a default-size box on the click; ctrl-drag runs
`onMouseDown_interactiveRect` (`:4368`): a drag, the id predicted from the top-left corner; `newRectForCurrentTag` does the same for the current
tag. All of them call `submit_bee()` right after creating the rectangle (`:3908,4034,4156`). The `status === "new"` state therefore only lives
during the drag; its other branches are effectively dead (`labelBee.js:738,801`, `SelectionControl.js:439`, `OverlayControl.js:2246,2382,4510`),
and `undoPush('new')`, `undoPush('move')` have no caller. The prediction path copies `bool_acts[0]`, `[1]` but not `labels`
(`OverlayControl.js:3969-3970,3998-3999`): the flags are lost at the first save, which rebuilds them from `labels`.

**Who writes what** (the units of section 3):

| Fields | Writers today |
|---|---|
| `x y width height angle cx cy` | `OverlayControl.js:2038-2056` (release of a gesture; the "virtual rectangle", `showRect` off, writes only the position), `:2260-2269` (creation); `cx`/`cy` also by `ChronoControl.js:1104` at every refresh |
| `labels`, `bool_acts` | `OverlayControl.js:2302-2323`, `SelectionControl.js:843-857`; copy of two flags `OverlayControl.js:3969-3999` |
| `notes` | `OverlayControl.js:2307` (from the form, also at creation) |
| `parts` | `ZoomView.js:406-414` |
| `newid`, `fix` | `ZoomView.js:1740-1747,1789-1791`, `labelBee.js:787-794`, `SelectionControl.js:939`: one concern in three files |
| `visit`, `span` of a visit | `OverlayControl.js:1349,1473-1483` (Pick Flower), `:555-571` (`VisitWidget`), in place on stored handles |
| `tag` | `ChronoControl.js:1021` through `update`; tag fix in place on the tag object shared with the Tags structure (`ZoomView.js:1933-2007`) |

`bool_acts` is a pure function of `labels`: the loader (`AnnotationCodec.js:94`) and the editor use the same `hasLabel` and the same alias map
(`labelMap`, `SelectionControl.js:770`). Its readers are few: `ChronoControl.js:1114`, `OverlayControl.js:2372-2375`, the CSV and BBox exports
(`AnnotationCodec.js:633-713`, which crash on an observation without it, [DEBT-727](../intent/debt.md)).

## 3. Design

- **R1 Units.** Every field belongs to one unit, every unit to one concern:

| Unit | Fields | Owner |
|---|---|---|
| `geometry` | `x y width height angle cx cy`, written together | the overlay editor |
| `labels` | `labels` (`bool_acts` is derived, R7) | the label buttons and the labels text, one function |
| `notes` | `notes` | the notes box |
| `parts` | `parts` | the zoom view |
| `wrongid` | `newid fix` | one function (today three writers) |
| `visit`, `span` | `visit`, `span` | a visit module (Pick Flower, `VisitWidget`, moved out of `OverlayControl.js`) |
| `tag` | `tag` | the tag merge (`augmentTrackWithTag`); the tag-fix writers wait for the tag merge into the events (DEC-006) |

- **R2 Read** from the store (`events.get`), never from a clone. **R3 Write** a unit with `events.update(frame, id, fields)`, only the fields that changed.
- **R4 Target.** An editor gets its target from `selectedKey()`, which returns `(frame, id)`. Today it reads the fabric active object; the
  selection slice will read the selection store, and no editor changes.
- **R5 Gestures.** During a drag, the X/Y/W/H form and the zoom view follow the fabric rectangle. On `modified` one function writes the
  geometry: an adapter `rectToGeometry(rect)` gives `{x, y, width, height, angle, cx, cy}` from the fabric rectangle and the handler updates only
  the fields that differ from the stored observation, nothing if none differs. The rectangle has its origin at the center and rotates around it
  (`originX = originY = "center"`, `centeredRotation: true`, `OverlayControl.js:2106-2111`), so its `left`/`top` are the center (`:2004`): a move
  changes the center, a rotation changes only `angle`, a resize changes `width`, `height` and, unless `resizeAroundCenter` (`centeredScaling`,
  `:1966-1970`), the center. This is the maintainer's "move changes x, y; resize changes width, height, maybe x, y; rotate changes the angle",
  without a case per gesture. In dot mode (`showRect` off) the adapter returns the position only: the observation keeps its size.
- **R6 Creation** is one function: a fresh observation from defaults, plus from the source observation (if any) its geometry and its whole
  `labels`, nothing else (no `notes`, `span`, `fix`, `newid`, `visit`, `parts`; the `tag` is not copied, the tag merge gives the right one for
  the frame); one `events.commit`; a free id (predicted, else the first free integer). No `status`, no draft.
- **R7 Derived.** `bool_acts` is computed by `activities(obs)` from `labels` (shared pure module); not stored; a cache only if the
  200 000-observation pass is measured to need it. **Geometry at load:** `sanitizeEvents(obj, {geometry})` takes a policy, `"xy"` or `"cxcy"`
  (which of the two sets is the truth), with a default per source format chosen by the loader: `"cxcy"` for the CSV formats, `"xy"` for v1 and v2. When
  `cx`, `cy` and `x`, `y` disagree (beyond the 3-decimal rounding of the files) it logs a warning (once per load, with the number of observations) and
  fixes the other set according to the policy. The code carries a comment saying which set is the truth: with `"xy"`, `x`, `y` are the truth and `cx`,
  `cy` are recomputed; the long-term rule is the reverse, `cx`, `cy` internal and `x`, `y` computed at save (P5). The CSV decoders, whose source
  is the center, convert with their own conventions. The warning is a log line through the notifier (console and log panel), once per load, with the
  number of inconsistent observations, not an alert; the tolerance is a little above the 3-decimal rounding of the files (0.0015). The loader that
  calls `sanitizeEvents` passes the policy, because it is the one that knows the data source; the redundancy between loaders and decoders is reduced later
  (maintainer, 2026-11-14).
- **R8 Refresh and undo.** The manual refresh calls stay. Change events with a `source` and fine-grained reactivity are a later slice; undo and the selection
  store are two more. **Undo is deactivated** until its own slice (maintainer, 2026-11-14): the Undo button is disabled, `undoPush` and
  `undoAction` are not reachable, `deleteEvent` no longer clones; `test_a7` checks that undo is off.
- **Goes away:** `cloneObs`, `copyObs`, `storeObs`, `COMMIT_FIELDS`, `submit_bee`, `automatic_sub`, `updateObsActivityFromForm`,
  `updateRectObsActivity`, `status`, the green rectangle, the "remove the temporary rectangle" code. `Events.commit` stays for creation. The undo
  stack (`undoStack`, `undoPush`, `undoPop`, `undoAction`, `updateUndoButton`) is deactivated now and removed in the undo slice.

## 4. Steps (separate commits, tests first; behavior changes each get their own commit with the changed test or golden shown)

0. **Tests, no production change**, under the strict detector: creation by shift-click (prediction) and by ctrl-drag; the label buttons and the labels
   text; notes; parts sync; the three wrong-id edits; drag, resize and rotate of a rectangle; dot mode.
1. **Deactivate undo** (R8): the button disabled, the stack unreachable, `deleteEvent` without the clone; `test_a7` checks that undo is off.
2. **`annotation/Labels.js`** (pure): normalize, `has`, `activities`, moved from `SelectionControl.js:770-880` and the copy in the codec; Node tests.
3. **`sanitizeEvents` geometry policy** (R7): the `geometry` parameter, the per-format default, the warning and the fix; the CSV loaders pass `"cxcy"`, the JSON loaders
   `"xy"`. Behavior change if a file disagrees; golden diff shown.
4. **`bool_acts` derived**: the three readers and the exports use `activities(obs)`, the writers go, the field is not stored (DEBT-701, DEBT-727).
5. **Editors, one concern per commit**, each writing its unit with `update`: `parts`, `wrongid`, `labels`, `notes`, `geometry` (adapter and release) last.
6. **Creation** (R6) and the removal of the working copy and everything listed under "Goes away".
7. **The visit module** out of `OverlayControl.js`; four dirty-write allow-list entries go.
8. **Record:** PLAN, `modules.md`, DEBT-701, DEBT-702, DEBT-727, DEBT-739.

## 5. Risks and limits
- **Staleness inside a unit.** A module reads at T and writes at T'; another writer of the same unit between the two is overwritten. Narrower than
  today (whole observation), not removed; one owner per unit makes it rare.
- **Fabric adapter.** The tolerance of the diff, `resizeAroundCenter` on and off, flipped scaling (`fixRectSizeAfterScaling`) and the default
  size (`updateDefaultSizeFromRect`) need the tests of step 0 before geometry moves.
- **Double refresh.** Manual refreshes and, later, change events will coexist for a while (DEBT-712).
- **Undo is off** from step 1 until its own slice: a mistaken creation or delete is not recoverable by the button.
- **No field removal** with `Object.assign` semantics (`undefined` means "none"); arrays like `parts` are replaced whole.
- **Out of scope, later slices:** change events and fine-grained reactivity; the selection store; undo; the reorganization around `cx`, `cy`; the tag merge.
