# ADR 0008: Field ownership: an editor updates only the fields it owns

Status: **proposed**, nothing implemented. Direction from the maintainer, 2026-11-14 (the principle, section 1). The numbers are
those of branch `slice-events-api` at commit `5148860f` (slice 4 step 7a). Questions [Q30](../QUESTIONS.md#q30)-[Q33](../QUESTIONS.md#q33)
are open: no step below proceeds before they are answered. This ADR is the planned slice 5 of [ADR 0007](0007-slice-events-api.md)
("observation operations"), and replaces its steps 7b and 7c, which are on hold.

## 1. Principle (maintainer)

Separation of concerns. A module that edits parts does not need to know what a visit is, and the reverse. A module extracts the field
(or the few fields) it owns, edits it, and commits it back to the central store with `Object.assign` semantics: **a field that is
not specified stays as it is.** The independent views then update what they care about and leave the rest untouched. The core
fields of an observation are the exception: every editor that touches them must extract and put them back properly, even if it
edits only part of them.

## 2. Where the code is today (evidence, 2026-11-14)

**Already in line.** Every write that is not the main editor goes through a named, field-scoped operation of `Events`
([ADR 0007](0007-slice-events-api.md) steps 2-4): `update` for `span` (`SelectionControl.js:998,1021`, `OverlayControl.js:1537-1564`,
`ZoomView.js:1846,1851`), `tag` (`ChronoControl.js:1021`), `cx`/`cy` (`ChronoControl.js:1104`), `fix` (`ZoomView.js:1921`); `delete`,
`rename`, `swap`. About 20 call sites.

**Not in line: the working copy.** The editor clones the observation into a working copy (`rect.obs`: `cloneObs`,
`OverlayControl.js:2086,2267`) and several modules write fields on it. They then call `submit_bee()` or `automatic_sub()`, which commit **all
core fields** from the snapshot taken at clone time (`storeObs`, `SelectionControl.js:466`; `copyObs`/`COMMIT_FIELDS`,
`Model.js:40-70`, `annotation/Events.js`). 18 call sites reach that one commit: `submit_bee` 7 (`OverlayControl.js:870,892,3908,4034,4156`,
`labelBee.js:740,802`), `automatic_sub` 7 (`SelectionControl.js:947,959,969`, `ZoomView.js:416,1754,1810`, `OverlayControl.js:4560`),
`storeObs` direct 4 (`labelBee.js:804`, `SelectionControl.js:679,684`, `OverlayControl.js:434`).

| Fields | Writers today |
|---|---|
| geometry `x y width height angle` and the derived `cx cy` | `OverlayControl.js:2038-2056` (edit), `:2260-2269` (create), `:868-890` (tag angle). `cx`/`cy` also rewritten by `ChronoControl.js:1104` at every refresh |
| `labels`, `bool_acts` (a derived pair) | `OverlayControl.js:2302-2323`, `SelectionControl.js:843-857`: two modules |
| `notes` | `OverlayControl.js:2307` |
| `parts` | `ZoomView.js:406-414` |
| `newid`, `fix` | `ZoomView.js:1740-1747,1789-1791`, `labelBee.js:787-794`, `SelectionControl.js:939`: the same concern in three files |
| `visit` | `OverlayControl.js:1349,1473-1483` (Pick Flower), in place on the stored observation, which shares `visit` with the working copy |
| `span` of a visit | `OverlayControl.js:555-571` (`VisitWidget.setSpanFrame`), in place |
| `tag` | `ChronoControl.js:1021` through `update`; tag fix in place on the tag object shared with the Tags structure (`ZoomView.js:1933-2007`) |
| `ID`, `frame`, `time` | creation `OverlayControl.js:2248-2250`; final id `SelectionControl.js:463` |

Consequences, each seen by the tests of slice 4:
1. **Lost updates.** A module that edits only `parts` commits `x`, `width`, `labels`... too, from a stale snapshot. `cx`/`cy`
   ([DEBT-739](../intent/debt.md)) show it: refreshed by `update`, overwritten by the next commit.
2. **The field list is hard-coded** in `copyObs`/`COMMIT_FIELDS`. A new concern must be added there to survive a clone; the clone still drops
   every other field (undo of a delete loses `span` and `tag`).
3. **Shared nested values** (`parts`, `visit`, the tag object): a write on one side changes the other. The detector flags them; they are
   6 of the 7 allow-listed writers (`dirty_writes_allowed.json`).
4. **Mixed concerns in one file.** `OverlayControl.js` holds the geometry and label editor, the `VisitWidget`, Pick Flower, the span and tag
   drawing: 58 geometry, 13 `visit` and 13 `span` references.

## 3. Design (proposed)

**Rules.**
- **R1 Ownership.** Every field belongs to one **unit**, and every unit to one concern (the table below).
- **R2 Read.** A module reads with `events.get` / `getFrame` and copies what it owns (deep copy for nested values).
- **R3 Write.** A module writes its unit with `events.update(frame, id, {unit fields})`: the other fields are untouched; `undefined`
  means "none" (there is no removal, as in [ADR 0007](0007-slice-events-api.md) section 2).
- **R4 Atomic units.** Coupled fields are written together: a unit is never written in part.
- **R5 Creation, deletion, identity.** Creating an observation is the one full commit (`events.commit`, all core fields). `delete`
  and `rename` stay commands. Undo of a delete uses `events.snapshot(frame, id)`, a deep copy of one observation, all fields
  (this refines [Q29](../QUESTIONS.md#q29), which excluded a snapshot of the whole video).
- **R6 Narrow working copy.** The working copy of the editor holds only the units the editor owns (geometry, labeling, notes). It no
  longer carries `parts`, `fix`, `newid`, `visit`, `span`, `tag`; a clone of the observation stops being the editor's job for them.

**Units** (names provisional, [Q31](../QUESTIONS.md#q31)):

| Unit | Fields | Owner (target) |
|---|---|---|
| `geometry` | `x y width height angle cx cy` | the overlay editor |
| `labeling` | `labels bool_acts` | the overlay editor and the label buttons (one function) |
| `notes` | `notes` | the overlay editor |
| `parts` | `parts` | the zoom view |
| `wrongid` | `newid fix` | one function, used by the zoom view, the ID edit box and the selection control |
| `visit` | `visit` | a visit module (Pick Flower and `VisitWidget`, moved out of `OverlayControl.js`) |
| `span` | `span` | the span and visit modules |
| `tag` | `tag` | the chronogram merge, until the tags are merged into the events (DEC-006) |

**Enforcement.** The ownership becomes a test, not a convention. The observer already carries the fields of an `update`
(`Events.js`). The detector would record them per call site and a second allow-list (`api_writes_allowed.json`: file, function, fields)
would fail a test whose module updates a field it does not own ([Q32](../QUESTIONS.md#q32)). The dirty-write allow-list keeps
shrinking: its 6 entries go with steps 3 and 4.

## 4. Steps (slice 5; separate commits, tests first, all suites green after each)

0. **Tests for the edit paths that have none**, under the detector: parts sync (`ZoomView.js:395-416`), wrong-id edit (`labelBee.js:787-794`,
   `ZoomView.js:1740-1791`), notes (`OverlayControl.js:2307`), the label buttons (`SelectionControl.js:843-857`). The detector records the
   fields per `update` call site, and `api_writes_allowed.json` starts permissive (the current sites).
1. **`annotation/Units.js`** (pure): the units, `pick(obs, unit)` (deep copy of the unit's fields), `commitUnit(frame, id, unit, source)`
   = `events.update(frame, id, pick(source, unit))`. Node tests.
2. **Concern by concern**, one commit each, the caller commits its unit instead of the whole observation: `parts`, then `wrongid` (the three
   writers become one), `labeling`, `notes`, `geometry` last (the most coupled). `submit_bee` keeps the full commit for a new observation only.
3. **The visit concern** (Pick Flower, `VisitWidget`) moves out of `OverlayControl.js` and uses `events.get` / `events.update`. Four dirty-write
   allow-list entries go. `newVisit` creates with a full commit.
4. **Narrow the working copy and the clone** (R6); `events.snapshot` for undo (R5); `COMMIT_FIELDS` and the 17-field list go. A full
   commit is then only for creation.
5. **Record:** PLAN, `modules.md`, DEBT-739, DEBT-702.

Order and cost: steps 0-2 are the bulk of the risk (the editor path); 3 and 4 are mostly deletion once 2 is done. The tag fix writers
(2 allow-list entries) wait for the tag merge, which this ADR does not do.

## 5. Risks and limits
- **Staleness inside a unit.** A module reads at time T and writes at T'; another writer of the same unit between the two is overwritten.
  Narrower than today (whole observation), not removed. One owner per unit makes it rare.
- **Coupled units written in part** by a future edit: R4 and the test of step 0.
- **Cost.** One `update` per user action. The chronogram refresh already makes one `update` per observation (`ChronoControl.js:1104`, about 1100 calls in the
  browser suite) with no visible cost.
- **No field removal** with `Object.assign` semantics; arrays are replaced whole (`parts` is a unit).
- **Behavior changes** are expected where today's whole commit hides a conflict (`cx`/`cy`): each is its own commit, with the changed
  test shown, as the project rules require.
