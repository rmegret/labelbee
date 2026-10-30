# Behaviors: Data filtering and processing (CAP-800)

Conventions: [../README.md](../README.md).

All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated. Gaps in the BEH numbering (for example between 803 and 805) are ids never used; new items continue from 839.

Scope: the data-preparation half of `ChronoControl.js` plus the tag-filter code it depends on in `OverlayControl.js`. Drawing, axes and navigation are group 3 (CAP-300). Shorthand used below: "refresh" is `refreshChronogram` = `updateChronoData` then `drawChrono` then `renderObsTable`. "Mutation" means a write to `Tracks`, `Tags` or an object inside them.

## Contents

<!-- toc -->

## BEH-801: Refresh pipeline order and what each stage reads

`updateChronoData` is the single entry that rebuilds every derived structure. It always runs, in this order:

1. `augmentTrackWithTag` (Tracks + Tags -> `obs.tag`, MUTATES Tracks).
2. `chronogramData` is emptied (always, whatever `showObsChrono`).
3. Only if `showObsChrono`: `updateChronogramData` (Tracks -> `chronogramData`, MUTATES Tracks, see BEH-805) then `createIntervalList` (`chronogramData` -> `allIntervals`, `crosses`, `rectIntervals`, `circlesIntervals`, `partsIntervals`).
4. `updateFlatTracks` (Tracks -> `flatTracksAll`, `flatTracksValid`, `flatTracksAllGroupById`, `flatTracksValidGroupById`, `flatTracks`).
5. `flatTags = getFlatTags(false)`, then `ttags = getTTags()`, then `allTagsID = [...allTagsID]` (Set to array).
6. `tagIntervals = []`; only if `showTagsChrono`: `updateTagIntervals`.
7. `updateTagsLabels` (runs even when `showTagsChrono` is false; then it only computes spans and redundancy, BEH-815, BEH-817).
8. If `flag_hideInvalid`: `tagIntervals` filtered to drop intervals whose `labeling.falsealarm` or `labeling.wrongid` is true (BEH-818).

The elapsed time is stored in `chrono.perf.chronoUpdate` (ms) and later shown in `#chronoStatusBar`. The status bar shows "Preparing chrono data..." while this runs. The refresh is synchronous and is rerun from scratch on every call: nothing is incremental or cached.

When `showObsChrono` is false, stage 3 is skipped entirely. `allIntervals`, `crosses`, `rectIntervals`, `circlesIntervals` and `partsIntervals` are then NOT cleared and keep the values of the last refresh with `showObsChrono` true (DEBT-801).

- **Group:** CAP-802
- **Origin:** accident
- **Code:**
  - `ChronoControl.js`: `updateChronoData`, `refreshChronogram`, `drawChrono`
- **Links:** BEH-802, BEH-803, BEH-805, BEH-807, BEH-811, BEH-812, BEH-815, BEH-818, DEBT-801, SEAM-801

## BEH-802: Tag integration (augmentTrackWithTag)

For every frame key `F` present in `Tracks` for which `Tags[F]` exists, each tag `t` in `Tags[F].tags` is matched to the observation `Tracks[F][String(t.id)]`. When that observation exists, `Tracks[F][String(t.id)].tag = t` (same object reference, not a copy). The bee ID and the tag ID are thereby the same key space: tag 12 is attached to bee "12". If a frame holds two tags with the same `id`, the later one in `Tags[F].tags` wins.

Never cleared: an `obs.tag` set in a previous refresh stays on the observation if the tag disappears from `Tags` (for example a new tag file is loaded with fewer tags) or the `Tags` frame has no entry any more. No filter (ROI, Hamming, DM, restrict/exclude ID) applies at this stage.

`obs.tag` is runtime-only (not saved, not copied by `copyObs`/`cloneObs`, see analysis/06 C9) and is the only link between an observation and its tag. It is read by `getTag` (tag display in the overlay), by `getFlatTags` (BEH-810) and by `cleanObsoleteEvents` (BEH-833). Frames present in `Tags` but absent from `Tracks` are not visited by this loop.

- **Group:** CAP-802
- **Origin:** debt
- **Code:**
  - `ChronoControl.js`: `augmentTrackWithTag`
  - `OverlayControl.js`: `getTag`
- **Links:** ENT-001, ENT-002, DEBT-802, SEAM-802

## BEH-803: Flat track lists (updateFlatTracks)

Builds the flat list of observations that every list-like consumer reads (event navigation, observation table, tag labelling, chronogram intervals through a separate path).

Output items ("wrapper" objects, one per observation, newly created at each refresh): `{ frame: F, id: id, y: chrono.config.idAxisMap(id), labels: obs.labels, obs: obs }`. `frame` is the string key `F` of `Tracks` (not a number); `id` is the string key; `labels` is a copy of the string at build time. Wrappers later receive `span` and `isredundant` (BEH-815, BEH-817).

Iteration order: `for F in Tracks` then `for id in Tracks[F]`. Frames come in ascending numeric order. Inside a frame, IDs follow JS object key order: integer-like IDs ("3", "12") ascending numerically first, then the other IDs ("F1", "T4") in insertion order.

Skipped observations (in this order):
1. frame filter active (BEH-823) and `F < frameMin` or `F > frameMax`;
2. `flag_restrictID` and `String(id)` not in `restrictIDArray`;
3. `flag_excludeID` and `String(id)` in `excludeIDArray`.

NOT applied here: `hideFlowers` and the ROI. `hideInvalid` does not remove items from `flatTracksAll`.

Outputs: `flatTracksAll` (all kept wrappers, order above); `flatTracksValid` = `flatTracksAll` minus wrappers whose `labels` contain `falsealarm` or `wrongid` (exact normalized-label match, BEH-837); `flatTracksAllGroupById` and `flatTracksValidGroupById` = object `id -> [wrappers]` in the same order (so frame ascending per ID); `flatTracks` = `flatTracksValid` if `flag_hideInvalid` else `flatTracksAll` (same array reference, not a copy).

`updateFlatTracks` is also called alone by `updateObsTable`, with the same rules. The frame filter is thus applied in two places (here and `updateChronogramData`), as the code comment `TODO: filter in only one place` says. Event navigation (CAP-305) sorts these shared arrays in place when it looks for the next or previous event, so their order can differ from the order above until the next refresh (DEBT-803).

- **Group:** CAP-802
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `updateFlatTracks`, `updateObsTable`
- **Links:** BEH-819, BEH-821, BEH-822, BEH-823, BEH-824, BEH-837, DEBT-803, DEBT-808, SEAM-803

## BEH-805: Observations to chronogram rows (updateChronogramData)

Input: `Tracks`, filters, `ROI`. Output: `chronogramData`, an array of rows
`{ x: F (string), y: idAxisMap(id), id, Activity, labels: obs.labels, pollen: b1, tag: obs.tag, obs, inROI }`
filled in place after `chronogramData.length = 0`.

Observations are skipped, in this order: outside the active frame filter (BEH-823); not in `restrictIDArray` when `flag_restrictID`; in `excludeIDArray` when `flag_excludeID`; when `flag_hideInvalid`, `hasLabel(obs,"falsealarm")` or `hasLabel(obs,"wrongid")`; when `flag_hideFlowers`, `String(id).startsWith('F')`. Case matters: "f3" is not a flower.

For each kept observation (MUTATION of Tracks): `obs.cx = obs.x + obs.width/2` and `obs.cy = obs.y + obs.height/2` are recomputed and written. `inROI` is true when `ROI.left <= cx <= ROI.right` and `ROI.top <= cy <= ROI.bottom` (inclusive), computed regardless of `flag_useROI`.

The activity flags are read from `obs.bool_acts` (not from `labels`): index 0 fanning, 1 pollen, 2 entering, 3 leaving (DEBT: the redundant encoding, DEC-003). Rows pushed per observation, in this order:
- one row with `Activity: ""` if `!b0 && !b2 && !b3` (pollen alone, or no flag at all, gives the "" row);
- one row `Activity: "entering"` if b2;
- one row `Activity: "leaving"` if b3;
- one row `Activity: "fanning"` if b0.
So one observation yields 1 to 3 rows with the same `x` and `id`. `pollen` is `b1` on every row. If `obs.bool_acts` is undefined the function throws.

Rows are ordered like BEH-803 (frame ascending, then id key order). `labels` is the raw string (may be undefined for an observation without `labels`, which then breaks `createIntervalList`, BEH-807).

- **Group:** CAP-802
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `updateChronogramData`
  - `SelectionControl.js`: `hasLabel`
- **Links:** BEH-807, BEH-819, BEH-820, BEH-821, BEH-822, BEH-823, BEH-827, ENT-001, DEC-003, DEBT-804, DEBT-805, SEAM-802

## BEH-807: Rows to intervals (createIntervalList)

Input `chronogramData`; output `allIntervals`: one rectangle per run of consecutive frames of the same ID.

Algorithm: group row indexes by `id` (key order as in BEH-803, so output is grouped by ID: integer-like IDs ascending first, others in insertion order). For one ID, rows are taken in `chronogramData` order (frame ascending) with `xValues[j] = Number(x)`. A new interval opens at the first row. Row `i` extends the current interval (`x2 = xValues[i]`) only if `xValues[i] - xValues[i-1] == 1` exactly; otherwise the current interval is pushed and a new one opens at `xValues[i]`. A gap of one missing frame therefore splits the interval. Two rows with the same `x` (an observation with several activity rows, BEH-805) give a difference of 0, which also splits: the result is a one-frame interval followed by an interval starting on the same frame, so intervals of one ID can overlap (DEBT-805).

Interval fields: `x1`, `x2`, `y` (of the first row), `id` (string), `Activity` (`""` for the first interval of an ID, the row's `Activity` for later ones; unused downstream), `labels`, `haslabel` (object `label -> true`), `pollen`, `tag` and `obs` (those of the FIRST row of the interval), `passThroughROI`, `startInsideROI`, `endInsideROI`.

Aggregation across rows of an interval: `haslabel[l] = true` for each `l` of `row.labels.split(",")` (no trim or normalization; empty string adds nothing); `pollen |= row.pollen` and `passThroughROI |= row.inROI` (bitwise, so the value becomes the number 0 or 1 after the first extension, while it is a boolean for a one-row interval); `endInsideROI = row.inROI` of the last row; `startInsideROI` is the first row's `inROI`. `tag`/`obs` are never refreshed after the first row.

Only the LAST interval of each ID gets `labels = Object.keys(haslabel).join(',')` (the aggregated list); earlier intervals of that ID keep the raw `labels` string of their first row (DEBT-806), although `haslabel` is aggregated for all.

- **Group:** CAP-802
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `createIntervalList`
- **Links:** BEH-805, BEH-808, BEH-809, DEBT-805, DEBT-806, SEAM-802

## BEH-808: Interval post-filter by ROI and derived flags

After building (BEH-807): if `flag_useROI` is true, `allIntervals` keeps only intervals with truthy `passThroughROI` (some row of the interval has its box center inside `ROI`). If `flag_useROI` is false (default) nothing is dropped. Then, for each interval whose `labels` split on "," includes `wrongid`: `interval.wrongid = true` and `interval.newid = interval.obs.newid` (first observation's `newid`, may be undefined).

- **Group:** CAP-802
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `createIntervalList`
  - `OverlayControl.js`: `onClickROI`
- **Links:** BEH-807, BEH-827, DEBT-806, OQ-812

## BEH-809: Derived interval subsets

From `allIntervals` (after BEH-808), `createIntervalList` also publishes: `crosses` = intervals whose `labels` (split on ",") include `falsealarm` or `wrongid`; `rectIntervals` = `x1 != x2`; `circlesIntervals` = `x1 == x2`; `partsIntervals` = intervals for which `hasParts(d.obs)` (checks only the first observation of the interval: `obs.parts` non-empty). Because of DEBT-806, `crosses` can miss a `falsealarm`/`wrongid` present only in a later row of a non-last interval. No consumer of `rectIntervals` or `circlesIntervals` was found in the code base.

- **Group:** CAP-802
- **Origin:** accident
- **Code:**
  - `ChronoControl.js`: `createIntervalList`
  - `Model.js`: `hasParts`
- **Links:** BEH-807, DEBT-806, CAP-303

## BEH-810: Flat tags (getFlatTags) and tagMode

`tagMode` is a global initialised to `'Tracks'` in `OverlayControl.js` and, in the code read, never reassigned: the `'Tags'` branches (marked "Legacy" in the code) are unreachable.

In `'Tracks'` mode, `getFlatTags(useFilter)` ignores `useFilter` and returns the `obs.tag` of every wrapper of `flatTracksAll` that has one, in `flatTracksAll` order. Consequences: (1) tags without a matching observation (same frame and same ID) are not in `flatTags`, hence never in `ttags` or `tagIntervals` (free tags are not displayed); (2) restrict ID, exclude ID and frame filter apply to tags through the observations; (3) `hideInvalid` does not remove tags here. `updateChronoData` always calls it with `false`.

In the unreachable `'Tags'` mode it flattens `Tags[F].tags`, applying restrict/exclude ID only when `useFilter`.

- **Group:** CAP-802
- **Origin:** debt
- **Code:**
  - `ChronoControl.js`: `getFlatTags`
  - `OverlayControl.js`: `tagMode`
- **Links:** BEH-802, BEH-803, DEBT-807, OQ-801

## BEH-811: Tag series per ID (getTTags)

`getTTags()` returns `ttags`, an object `String(tag.id) -> { String(tag.frame) -> tag }`, built from `flatTags` in `'Tracks'` mode (a later tag with the same id and frame replaces the earlier). It also resets the global `allTagsID` to a new `Set` of the String IDs (all IDs seen, with no filter). Because the inner keys are integer-like, iterating `ttags[id]` yields frames in ascending numeric order whatever the insertion order; `BEH-812` relies on this. `updateChronoData` then converts `allTagsID` to an array.

`getTTags` is also called from `setTags` (tag file load, `AnnotationIO.js`) right after `Tags` is replaced; at that time it reads the `flatTags` of the previous refresh (empty on first load), so `ttags` and `allTagsID` hold stale values only until `setTags` runs `refreshChronogram` a few statements later, which recomputes them (DEBT-807). `ttags` is read by the overlay to draw tag tracks (`OverlayControl.js`).

- **Group:** CAP-802
- **Origin:** accident
- **Code:**
  - `ChronoControl.js`: `getTTags`
  - `AnnotationIO.js`: `setTags`
- **Links:** BEH-810, BEH-812, DEBT-807, SEAM-802, SEAM-803

## BEH-812: Tag detections to tag intervals (updateTagIntervals)

Input `ttags` and the live predicates `tagsSampleFilter` and `tagsIntervalFilter` (BEH-825, BEH-826, BEH-828, BEH-844). Output: `tagIntervals = []` rebuilt, array of
`{ id (string), y: idAxisMap(id), begin, end, hammingavg, dmavg, labeling: {} }`.

For each ID (key order of `ttags`) and for its frames in ascending order:
1. a sample is dropped (`continue`) if `!tagsSampleFilter(tag)`. Dropped samples are invisible to the run logic, so a filtered-out frame creates a gap;
2. no active interval: open one `{begin: f, end: f, hammingavg: tag.hamming, dmavg: tag.dm}`;
3. active and `end == f - 1`: extend (`end = f`), and add to the sums as in BEH-813;
4. active and `end != f - 1`: close the active interval, open a new one at `f` (first-sample rule as in step 2).
Closing (steps 4 and end of each ID) pushes the interval only if `tagsIntervalFilter(interval)` is true; otherwise it is silently dropped. On push, `len = end - begin + 1` and `hammingavg = hammingavg/len`, `dmavg = dmavg/len`.

Intervals are therefore ordered by ID (key order) then by `begin`. `begin`/`end` are numbers. `labeling` is an empty object until BEH-815 fills it. `tagIntervals` is an implicit global rebuilt at each refresh and is also replaced by `computeMotionDirection` and `interpolateTags` (BEH-835, BEH-834).

- **Group:** CAP-802
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `updateTagIntervals`
- **Links:** BEH-811, BEH-813, BEH-825, BEH-826, BEH-828, BEH-844, ENT-002, SEAM-802

## BEH-813: Hamming and DM averaging rule

Within one tag interval the averages are sums divided by the frame count `len = end - begin + 1`:
- the first sample of an interval adds its `hamming` and `dm` unconditionally (even if `hamming >= 1000`);
- each extending sample adds `hamming` and `dm` only if `tag.hamming < 1000`; if `hamming >= 1000` (the sentinel for interpolated tags, BEH-834) it adds 0 to `hammingavg` and nothing to `dmavg`.
So frames with the sentinel count in the denominator and dilute both averages. If `dm` is absent on the tags, `dmavg` is `NaN`. If `hamming` is undefined on the first sample `hammingavg` is `NaN`. `hammingavg` is what the tag bar height encodes (CAP-304): lower is better, with the threshold `hammingavg > 2` giving the minimal height in `setTagGeom`.

- **Group:** CAP-802
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `updateTagIntervals`
- **Links:** BEH-812, BEH-834, CAP-304, DEBT-809

## BEH-815: Labelling tag intervals from observations (updateTagsLabels, part 1)

For every wrapper `ann` of `flatTracksAll` (this includes invalid observations) a span is set: if `"span" in ann.obs` then `ann.span = {f1: Number(obs.span.f1), f2: Number(obs.span.f2), b1: "manual", b2: "manual"}`, else `{f1: f, f2: f, b1: "obs", b2: "obs"}` with `f = Number(ann.frame)`.

Each interval of `tagIntervals` gets `labeling = {labeled: false, entering: false, falsealarm: false, wrongid: false}` and is compared with every wrapper of the same ID (`ann.id != interval.id`, loose compare, skipped on mismatch), in `flatTracksAll` order (so the LAST matching annotation wins the flags):
- non-manual span (`b1 != "manual"`): matches when `f > begin - 20 && f < end + 20` (strict, 19 frames of margin). On match the span is widened: if `begin < ann.span.f1` then `ann.span.f1 = begin`, `b1 = "tag"`; if `end > ann.span.f2` then `ann.span.f2 = end`, `b2 = "tag"`;
- manual span: matches when `ann.span.f2 >= begin && ann.span.f1 <= end` (inclusive overlap); the span is not changed.
On match: `labeled = true`; `entering`, `falsealarm`, `wrongid` are overwritten with `hasLabel(ann, ...)` of that annotation; and if the annotation has `wrongid` and `obs.newid != null` then `interval.newid = obs.newid` (it is never cleared by a later annotation).

No `leaving` field is ever set in `labeling`, although the tag renderer tests `interval.labeling.leaving` (DEBT-810). The widening depends on the interval order, since spans are shared between intervals (an annotation widened by an earlier interval can match a later one).

The derived objects written are the wrappers and the intervals (not `Tracks`).

- **Group:** CAP-802
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `updateTagsLabels`
  - `SelectionControl.js`: `hasLabel`
- **Links:** BEH-816, BEH-817, BEH-837, DEBT-810, DEBT-811, CAP-304

## BEH-816: Virtual tag intervals for wrongid

After labelling (BEH-815), for every interval with `labeling.wrongid` true and `newid != null`, a shallow copy is added to `tagIntervals` (appended after all real intervals): `id = newid`, `oldid = original id`, `wrongid = false`, `virtual = true`. The copy shares the same `labeling` object by reference. It keeps `y`, `begin`, `end`, `hammingavg` and `dmavg` of the original. `y` is NOT recomputed, so the virtual interval keeps the row of the old ID (DEBT-812). The renderer draws virtual intervals white (CAP-304). `getFlatTags`, `ttags`, `allTagsID` are not changed by this.

- **Group:** CAP-802
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `updateTagsLabels`
- **Links:** BEH-815, BEH-818, DEBT-812, OQ-807, CAP-304

## BEH-817: Redundant observation detection

After BEH-815, for each ID of `flatTracksValidGroupById` the wrappers are scanned in order; for each wrapper `j > 0` whose predecessor `i = j - 1` in the same list satisfies `obs1.span.f2 >= obs2.span.f1`, `obs2.isredundant = true` (wrapper flag only). Spans are those of BEH-815 (possibly widened to the tag interval). Only consecutive pairs are compared, and only valid (non-falsealarm, non-wrongid) observations take part. The flag is never reset in place; a new refresh creates fresh wrappers. It is consumed by the legacy renderer (`flatTracks.filter(d => !!d.isredundant)`) to draw redundancy marks. `obs_for_id` is an implicit global.

- **Group:** CAP-802
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `updateTagsLabels`
- **Links:** BEH-815, BEH-803, DEBT-803, OQ-814

## BEH-818: hideInvalid applied to tag intervals

At the end of `updateChronoData`, when `flag_hideInvalid` is true, `tagIntervals` is filtered to keep intervals with neither `labeling.falsealarm` nor `labeling.wrongid`. This removes the real interval and (through the shared `labeling`) its virtual copy. It happens after labelling and virtual creation, so labelling and redundancy (BEH-815, BEH-817) are computed with the invalid observations included. An interval with no matching annotation (all `labeling` flags false) is kept.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `updateChronoData`
- **Links:** BEH-816, BEH-819

## BEH-819: Hide FA/WrongID button

Button `#hideInvalidButton` ("Hide FA/WrongID", title "Hide markings as falsealarm or wrongid and their tag detection") runs `click_hideInvalid`: toggles the `active` class and `flag_hideInvalid` (default false), then `refreshChronogram`. Effect when true:
- `updateChronogramData` skips observations labelled `falsealarm` or `wrongid` (BEH-805), so they leave `chronogramData`, `allIntervals`, `crosses` and the ID rows of the axis;
- `flatTracks` becomes `flatTracksValid` (BEH-803), so the observation table and the legacy span display use only valid observations; `flatTracksAll` is unchanged;
- tag intervals whose labeling says falsealarm/wrongid are dropped (BEH-818);
- event navigation chooses `flatTracksValid` / `...ValidGroupById` instead of the All variants (CAP-305 reads `flag_hideInvalid` directly).
The button state is not saved or restored on reload; the flag is a global reset by `initChrono`.

- **Group:** CAP-801
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `click_hideInvalid`, `validIdsDomain`
  - `labelbee_page.html`: `#hideInvalidButton`
- **Links:** BEH-803, BEH-805, BEH-818, CAP-305, SEAM-804

## BEH-820: Hide Flowers button

Button `#hideFlowersButton` ("Hide Flowers", title "Hide annotations whose ID starts with F") runs `click_hideFlowers`: sets `flag_hideFlowers` to the negation of the `active` class, toggles the class, then `refreshChronogram`. In `updateChronogramData` only, observations whose `String(id)` starts with the uppercase letter `F` are skipped. It does NOT affect `updateFlatTracks`, `flatTracks`, the observation table, event navigation or tags (BEH-803, BEH-810): a flower ID still appears in those and in tag intervals if it has a tag (DEBT-813). The convention "ID starts with F means flower" is hard-coded (flowerpatch videos, OQ-001 projects).

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `click_hideFlowers`, `updateChronogramData`
  - `labelbee_page.html`: `#hideFlowersButton`
- **Links:** BEH-805, DEBT-813, OQ-802

## BEH-821: Restrict ID

Controls (`labelbee_page.html`): text `#restrictID` (default shown "0"), toggle `#restrictIDButton` ("RestrictID", "Show only tags with this ID"), `#restrictIDfromSelectionButton` ("R:Selection"), `#restrictIDFromWindowButton` ("R:Focus", BEH-845). State: `flag_restrictID` (false), `restrictID` (null), `restrictIDArray` ([]).

- Toggle `click_restrictID`: flips `flag_restrictID`, updates the `active` class and writes `restrictID` into the text field, then refreshes. The array is NOT re-read from the text field on toggle: if the user never edited the field, `restrictIDArray` is `[]` and activating shows nothing.
- Text change `onRestrictIDChanged` (on `change`): `restrictID = text`, `restrictIDArray = text.split(",")` with NO trim and no empty filtering ("1, 2" yields "1" and " 2"; "" yields `[""]`). Refreshes only if `flag_restrictID`.
- `setRestrictID(ids)` (also called by the next/previous ID navigation buttons of CAP-305): `restrictID = String(ids)`, array = split on ",", trimmed, empties removed; updates the GUI (field value and button class); refreshes only if `flag_restrictID` (it does not turn the flag on).
- `R:Selection` (`restrictIDFromSelection`): sets `flag_restrictID = true` then `setRestrictID(defaultSelectedBee)`. With no selected bee the ID is the string "undefined" or "null".
- `R:Focus` (`restrictIDFromWindow`): see BEH-845.
Effect on data: `updateFlatTracks` and `updateChronogramData` keep only observations whose `String(id)` is in the array (BEH-803, BEH-805), tags follow through observations (BEH-810), and the axis ID domain becomes `restrictIDArray` as typed, including IDs with no data (BEH-831).

- **Group:** CAP-801
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `click_restrictID`, `onRestrictIDChanged`, `setRestrictID`, `restrictIDFromSelection`, `update_restrictID_GUI`
  - `labelbee_page.html`: `#restrictID`, `#restrictIDButton`, `#restrictIDfromSelectionButton`
- **Links:** BEH-803, BEH-805, BEH-831, BEH-845, CAP-305, DEBT-814

## BEH-845: Restrict ID from the focus window (R:Focus)

Button `#restrictIDFromWindowButton` ("R:Focus") runs `restrictIDFromWindow`. The window is `getWindow()` = `[max(0, f - backward), min(maxframe, f + forward)]` around the current frame `f` with `overlay.trackWindow`. The IDs are taken from the `chronogramData` rows with `window[0] <= x <= window[1]`: they are therefore already filtered by the current restrict, exclude, hideInvalid and hideFlowers filters, and the list is empty when `showObsChrono` is false. The IDs are deduplicated, sorted with `sortIds` (BEH-830) and joined with ",". Then `flag_restrictID` is set to true, the GUI is updated (`update_restrictID_GUI`) and the chronogram is refreshed. Unlike BEH-821's toggle, the array is set directly, not read back from the text field.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `restrictIDFromWindow`, `getWindow`, `update_restrictID_GUI`
  - `labelbee_page.html`: `#restrictIDFromWindowButton`
- **Links:** BEH-821, BEH-830, BEH-805, DEBT-814

## BEH-822: Exclude ID

Controls: text `#excludeID` (default empty), toggle `#excludeIDButton` ("ExcludeID", "Exclude these IDs (comma separated list, no spaces)"). `click_excludeID` toggles `active` and `flag_excludeID` (default false) and refreshes. `onExcludeIDChanged` (on `change`) sets `excludeID` and `excludeIDArray = text.split(",")` (no trim) and refreshes unconditionally. Before the first text change `excludeIDArray` does not exist; `$.inArray` on undefined returns -1 so nothing is excluded. Effect: observations whose `String(id)` is in the array are skipped in `updateFlatTracks` and `updateChronogramData`. It does not alter the axis domain beyond the missing data (the excluded IDs have no rows). Restrict and exclude can be active together (restrict first, then exclude).

- **Group:** CAP-801
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `click_excludeID`, `onExcludeIDChanged`
  - `labelbee_page.html`: `#excludeID`, `#excludeIDButton`
- **Links:** BEH-803, BEH-805, DEBT-814

## BEH-823: Frame filter

Controls in the chronogram `Frames:` block: `#filterFrameButton` ("Filter"), inputs `#chronoFrameFilterFrameMin` (default 0) and `#chronoFrameFilterFrameMax` (default -1), `#chronoFrameFilterRefresh` ("Refresh"), "Auto", "All". Handled by `Chronogram.setFrameFilter`; state `chrono.config.frameFilter = {active: false, frameMin: 0, frameMax: -1}`.
- `toggle_active`: flips `active`, refreshes the GUI, refreshes the chronogram.
- `all`: `frameMin = 0`, `frameMax = videoinfo.nframes - 1`, refresh.
- `auto`: `frameMin = currentFrame - 500`, `frameMax = currentFrame + 500` (not clamped), refresh.
- `refresh`: refresh only.
- `frameMin` / `frameMax` (input `change`): store the number; a negative `frameMax` becomes `nframes + frameMax` (so the typed value -1 becomes `nframes - 1`). No refresh: the Filter button (if inactive) or the Refresh button (if active) flashes to prompt the user.
When active, `updateFlatTracks` and `updateChronogramData` skip frames with `F < frameMin || F > frameMax` (string key compared to number, coerced). The stored default `frameMax = -1` is NOT normalized: activating the filter before editing the max or pressing "All"/"Auto" excludes every frame (empty chronogram) (DEBT-815). Tags are filtered through observations (BEH-810). The filter does not apply to the axis X domain (CAP-301). Bad box values: BEH-843.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `setFrameFilter`, `refreshFrameFilterGUI`, `updateFlatTracks`, `updateChronogramData`
  - `labelbee_page.html`: `#filterFrameButton`, `#chronoFrameFilterFrameMin`, `#chronoFrameFilterFrameMax`, `#chronoFrameFilterRefresh`
- **Links:** BEH-803, BEH-805, BEH-843, DEBT-815, CAP-301

## BEH-843: Frame filter with an empty or non-numeric box value

`frameMin` and `frameMax` store `Number(<box text>)` with no validation (`setFrameFilter`). An empty box gives 0 (so `frameMax` 0 keeps only frame 0 when the filter is active); non-numeric text gives `NaN`. With `NaN`, the tests `F < frameMin` and `F > frameMax` are both false, so that bound excludes nothing and no error is shown. The negative-max rule (`nframes + frameMax`) does not apply to `NaN`. Whether the box accepts non-numeric text depends on its `type` in the page (not verified here).

- **Group:** CAP-801
- **Origin:** accident
- **Code:**
  - `ChronoControl.js`: `setFrameFilter`, `updateFlatTracks`
  - `labelbee_page.html`: `#chronoFrameFilterFrameMin`, `#chronoFrameFilterFrameMax`
- **Links:** BEH-823, DEBT-815, DEBT-824, OQ-813

## BEH-824: ID axis remap

Buttons "ID" and "Modulo" in the `ID Remap:` block call `chrono.click_setIdAxisMap('id' | 'modulo')`. `'id'`: `idAxisMap = id => id`, `idAxisMapMode = 'id'`. `'modulo'`: `prompt("Set ID axis remap with modulo:", 20)`; cancel aborts; otherwise `idAxisMap = id => String(Number(id) % Number(mod))`, mode `'modulo'` (a non-numeric `mod` or ID yields "NaN"). Then `refreshChronogram`. Default at construction is identity (`'id'`).
`idAxisMap` produces the `y` field of wrappers (BEH-803), chronogram rows (BEH-805), intervals (BEH-807), tag intervals (BEH-812) and interpolated tags (BEH-834), and the axis domain (BEH-831). It never changes `id`. In non-`'id'` mode a click on the axes only seeks the frame (`videoControl.seekFrame(Number(frame))`) instead of calling `gotoEvent(frame, id)` (`onAxesClick`, seen in `ChronoControlInteraction.js`; the click behavior itself belongs to CAP-305). The text-input variant (`idAxisMap_inputChanged`, `update_idAxisMap_input`) is dead (reads the invalid selector `'#'`, input commented out in the page, DEBT-816).

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `click_setIdAxisMap`, `update_idAxisMap`, `idAxisMap_inputChanged`
  - `ChronoControlInteraction.js`: `onAxesClick`
- **Links:** BEH-803, BEH-831, DEBT-816, CAP-302, CAP-305

## BEH-825: Tag sample filter composition

`tagsSampleFilter(tag)` is a global predicate rebuilt by `refreshTagsParameters` and is the conjunction, in this order, of: `tagsHammingSampleFilter`, `tagsSampleFilterROI`, `tagsSampleFilterExcludeRects`, `tagsDMSampleFilter`, `tagsRGBSampleFilter`, `tagsSampleFilterCustom` (the user JS of BEH-828). Initially every sub-filter is `true`; `refreshTagsParameters` is called once at overlay construction, so the DM and custom parts exist from startup. It is used by `updateTagIntervals` and by the overlay tag-track drawing.
`refreshTagsParameters` re-reads the GUI each time. `onTagsParametersChanged` = `refreshTagsParameters`, then `refreshChronogram`, then `videoControl.refresh`; it is the `change` handler of every tag filter input.
Hamming buttons (`chronoFilter`): "H0" `hamming == 0`; "H1" `hamming <= 1`; "H2" `hamming <= 2`; "all" (`Hall`, shown `H∞`) always true. Each replaces `tagsHammingSampleFilter` and calls `onTagsParametersChanged`. They are not toggles and nothing shows which is selected. Default is "all". Interpolated tags (`hamming = 1000`, BEH-834) pass only "all".
Observation-less tags are never reached by this filter (BEH-810).

- **Group:** CAP-801
- **Origin:** essential
- **Code:**
  - `OverlayControl.js`: `refreshTagsParameters`, `onTagsParametersChanged`, `chronoFilter`, `tagsSampleFilter`, `tagsHammingSampleFilter`
  - `labelbee_page.html`: `~Tag filtering panel`
- **Links:** BEH-812, BEH-826, BEH-827, BEH-828, BEH-834, BEH-839, BEH-844, CAP-304, SEAM-805

## BEH-826: DM and RGB tag filters

DM: input `#tagsMinDM` (default 20, class `requireDM`). `minDM = Number(value)`; if `minDM > 0` the DM filter is `!tagsHaveDM || tag.dm >= minDM`, else always true. `tagsHaveDM` is set at tag load (`setTags`): it looks only at the first key of `Tags`; if that frame's `tags` list is non-empty it is `"dm" in tags[0]`, and if that list is empty (or `Tags` is empty) it stays false even when later frames have `dm`. The `requireDM` controls are disabled (property and class) when it is false. A tag lacking `dm` while `tagsHaveDM` is true fails (`undefined >= 20` is false). So with the default value 20 and a tag file that has DM, tags with dm below 20 are hidden by default.
RGB: button `#tagsUseRgbFilter` ("No blue"), toggled by `chronoFilter('RGB')` which toggles its `active` class. When active, a tag passes if it has no `rgb_mean` or `CB - CR < 0.35`, with `y = 0.299 R + 0.587 G + 0.1114 B`, `CB = (B - y)/y`, `CR = (R - y)/y` (0.1114, not 0.114). The button `#tagsUseRgbFilterContrast` calls `chronoFilter('RGB_contrast')`, which has no branch: it does nothing.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `refreshTagsParameters`, `chronoFilter`
  - `AnnotationIO.js`: `setTags`
  - `labelbee_page.html`: `#tagsMinDM`, `#tagsUseRgbFilter`, `#tagsUseRgbFilterContrast`
- **Links:** BEH-825, ENT-002, DEBT-817, OQ-803

## BEH-827: ROI filter

Global `ROI = {left, top, right, bottom}` in video pixels, initialised in the overlay constructor to `{175, 250, 2305, 1240}` (comment: Gurabo 5MP videos); the constructor also writes it into the text box `#ROI` ("175,250,2305,1240") and sets `flag_useROI = false` (button `#useROI` not active). The static markup of the page has the placeholder `0,0,w,h` and an `active` class on `#useROI`, both overwritten at construction.
- Text change `onROITextChanged` (`#ROI`, on `change`): splits on ",". Only the count is checked: if it is not 4, an error is logged and the old `ROI` is kept. Otherwise each part goes through `Number()` with no further validation: a non-numeric part becomes `NaN` without error, an empty part becomes 0. Then `ROIChanged`. With a `NaN` bound every tag fails the ROI test while the flag is on (DEBT-824).
- Toggle `#useROI` ("Apply", `onClickROI`): toggles `active` and `flag_useROI`, then `ROIChanged`.
- `ROIChanged`: rebuilds `tagsSampleFilterROI` (always true if the flag is off, else `left <= tag.c[0] <= right` and `top <= tag.c[1] <= bottom`, inclusive), then `onTagsParametersChanged` (which already refreshes the tag parameters, the chronogram and the video), then `refreshChronogram` and `videoControl.refresh` again: every ROI change refreshes both views twice (SEAM-805).
- "Reinit" (`updateROIFromVideo`) writes the full video size (`videoControl.videoSize()`: left, top, right, bottom) into the `#ROI` text and calls `ROIChanged`. It does NOT change the `ROI` global: that is assigned only at construction and in `onROITextChanged`, and programmatic writes to the text do not fire `change`. After Reinit the text box and the active ROI differ until the user edits the text (OQ-808).
- ROI also filters observation intervals when `flag_useROI` (BEH-808) using observation box centers; the tag filter above uses tag centers.
- When `flag_useROI` is on, the video overlay draws the ROI (BEH-842).

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `ROIChanged`, `onROITextChanged`, `onClickROI`, `updateROIFromVideo`, `tagsSampleFilterROI`, `onTagsParametersChanged`
  - `labelbee_page.html`: `#ROI`, `#useROI`
- **Links:** BEH-808, BEH-825, BEH-842, DEBT-818, DEBT-824, SEAM-805, OQ-808

## BEH-839: Exclude regions (tag filter)

List `excludeRects = [{cx, cy, w, h}]` in video pixels; the defaults set in the overlay constructor are four 50x50 rects centered at (335, 75), (2165, 80), (320, 1034) and (2130, 1080), and `excludeRectSelection` starts at -1. Flag `flag_useExcludeRects` (default false), toggled by button `#useExcludeRects` ("ExcludeRects", `onClickExcludeRects`: toggles `active`, then `excludeRectsChanged`). `excludeRectsChanged` is the common callback of every edit: it rebuilds `tagsSampleFilterExcludeRects` (always true if the flag is off; else a tag fails if for any rect `|c0 - cx| < w/2 && |c1 - cy| < h/2`, strict), toggles the `disabled` class of `#excludeRectDeleteButton` according to `excludeRectSelection >= 0`, then `onTagsParametersChanged`, `refreshChronogram` and `videoControl.refresh` (a double refresh, SEAM-805). `onClickExcludeRectDelete` removes the selected rect (`excludeRectSelection`) and resets the selection. The list is also editable by the "..." button (`onClickExcludeRectParams`, which calls `openExcludeRectsDialog`: the JSON dialog, BEH-841), by "+" (BEH-840) and by a next button (not verified here). Exclude regions apply to tags only, never to observations, but `cleanObsoleteEvents` uses the same predicate (BEH-833).

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `excludeRectsChanged`, `onClickExcludeRects`, `onClickExcludeRectDelete`, `tagsSampleFilterExcludeRects`
  - `labelbee_page.html`: `#useExcludeRects`, `#excludeRectDeleteButton`
- **Links:** BEH-825, BEH-833, BEH-840, BEH-841, DEBT-818, SEAM-805

## BEH-840: Exclude region from the selected observation (+) deletes the observation

Button "+" (`onClickExcludeRectAdd`, title "Add current Obs to exclude rects"): with no selected rectangle (`getSelectedRect()` falsy) nothing happens. Otherwise it appends `{cx: obs.x + obs.width/2, cy: obs.y + obs.height/2, w: obs.width, h: obs.height}` built from the selected observation, then calls `deleteSelected()`, which removes the active object and deletes that observation from `Tracks` through `deleteEvent(frame, id)`, then calls `excludeRectsChanged`. The delete is recorded with `undoPush('delete', obs)` (and refreshes video and chronogram), so it can be undone, unlike the clean-up of BEH-833.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `onClickExcludeRectAdd`, `excludeRectsChanged`
  - `SelectionControl.js`: `deleteSelected`, `deleteEvent`
- **Links:** BEH-839, BEH-833, OQ-809

## BEH-841: Exclude-region JSON dialog is accepted without validation

The "..." button (`onClickExcludeRectParams`) opens the dialog `#dialog-form-excludeRects` with the list as JSON text in `#excludeRects-json`. On Ok the text is parsed with `JSON.parse` and assigned to `excludeRects` with no try/catch and no shape check; then the dialog closes and `excludeRectsChanged` runs. Invalid JSON throws inside the button handler before the dialog closes (the dialog stays open and `excludeRects` keeps its old value); valid JSON of the wrong shape (missing `cx`, `cy`, `w`, `h`) is accepted and gives `NaN` comparisons, so such a rect excludes nothing. Cancel only closes the dialog.

- **Group:** CAP-801
- **Origin:** accident
- **Code:**
  - `OverlayControl.js`: `initExcludeRectsDialog`, `onClickExcludeRectParams`, `excludeRectsChanged`
  - `labelbee_page.html`: `#dialog-form-excludeRects`, `#excludeRects-json`
- **Links:** BEH-839, DEBT-824, OQ-815

## BEH-842: ROI outline and shading on the video overlay

`plotROI(ctx)` does nothing when `flag_useROI` is false. Otherwise it converts the ROI to canvas coordinates (`overlay.videoToCanvasRect`), strokes its outline in white (width 1) and fills the area outside it with semi-transparent white (`rgba(255,255,255,0.5)`), as four rectangles around the ROI. It is part of the observable state of the ROI filter. It is called as `plotROI(overlay.ctx)` from `OverlayControl.js` (the overlay's own drawing code, enclosing function not shown); the ownership of this item between group 8 and the overlay display group is an open question (OQ-810).

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `plotROI`
- **Links:** BEH-827, CAP-400, OQ-810

## BEH-828: Custom JavaScript tag sample filter

Text input `#tagsSampleFilter` holds a JavaScript function body (argument `tag`, default "return true"). `refreshTagsParameters` compiles it with `Function("tag", text)` into `tagsSampleFilterCustom`, the last term of the sample filter composition (BEH-825). A syntax error throws inside `refreshTagsParameters`, so the other sub-filters of that call are not rebuilt and the chronogram is not refreshed by the handler that called it. A runtime error thrown by the user code surfaces later, inside `updateTagIntervals` during a refresh. The text is arbitrary user code run with page privileges (no sandbox). A third box, `#tagsIDFilter` (argument `idinfo`), is compiled by the same function into `tagsIDFilter`, which nothing in the code read calls (DEBT-819); a syntax error in it throws in `refreshTagsParameters` too.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `refreshTagsParameters`, `tagsSampleFilterCustom`, `tagsIDFilter`
  - `labelbee_page.html`: `#tagsSampleFilter`, `#tagsIDFilter`
- **Links:** BEH-812, BEH-825, BEH-844, DEBT-819, OQ-804

## BEH-844: Tag interval filter: minimum length and custom script

`tagsIntervalFilter(interval)` = `interval.end - interval.begin >= minLength && customFn(interval)`, where `minLength = Number(#tagsIntervalFilterMinLength)` (the Delta box, default 0) is read when `refreshTagsParameters` runs. Since `end - begin` is length minus one, Delta = 0 keeps one-frame intervals and Delta = 1 requires at least 2 frames. The custom function (argument `interval`, text of `#tagsIntervalFilter`, default "return true"; the select `#tagsIntervalFilterSelect` copies a preset into the box and then calls `onTagsParametersChanged`) is NOT compiled in `refreshTagsParameters`: the text is re-read and recompiled with `Function("interval", text)` on every call of the predicate (once per closed interval, and only when the length test passes). A syntax error therefore surfaces during `updateTagIntervals` in the next `refreshChronogram` (and only if an interval passes the length test), not when the box is edited. The filter sees `hammingavg`, `dmavg`, `id`, `begin`, `end` but not `labeling` (computed later, BEH-815). Arbitrary user code, no sandbox.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `refreshTagsParameters`, `onTagsParametersSelectChanged`, `tagsIntervalFilter`
  - `labelbee_page.html`: `#tagsIntervalFilter`, `#tagsIntervalFilterMinLength`
- **Links:** BEH-812, BEH-828, DEBT-819, OQ-804

## BEH-829: Show Events and Show Tags switches

Checkboxes `#showObsChrono` ("Show Events") and `#showTagsChrono` ("Show Tags"), both default true, call `onChronoParametersChanged`: read both `checked` values into `showObsChrono` and `showTagsChrono`, then `refreshChronogram`. `showObsChrono` false skips `updateChronogramData` and `createIntervalList` (so `chronogramData` is empty, the axis ID domain has no rows from events, and stale intervals remain, BEH-801 and DEBT-801). `showTagsChrono` false skips `updateTagIntervals` so `tagIntervals` stays empty. `flatTracks*` and `flatTags`/`ttags` are always computed.
With Show Events off, the row IDs of the axes come from `validIdsDomain` only (`validIdsChrono` in `'Tracks'` mode, BEH-831), which reads only `chronogramData` (returns `[]` when it is empty); the domain is therefore empty and the axes use `["-"]`. Tag intervals are still computed and keep their `y`, but have no ID row in the domain; whether `renderTagIntervals` (`ChronoControlActivitiesLegacy.js`) then draws them is not verified (inferred: not drawn, OQ-811).

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `OverlayControl.js`: `onChronoParametersChanged`
  - `labelbee_page.html`: `#showObsChrono`, `#showTagsChrono`
- **Links:** BEH-801, BEH-831, DEBT-801, OQ-811

## BEH-830: ID ordering (sortIds)

`sortIds(array)` sorts IN PLACE (and returns the same array) with a mixed comparator: each item is split with `/(^[a-zA-Z]*)(\d*)$/` into a letter prefix and a digit suffix; compare prefixes with `localeCompare`, then the suffixes numerically. Result: purely numeric IDs ("0", "2", "10") first in numeric order, then prefixed IDs grouped by prefix ("F1", "F2", "F10", then "T3"...). Items not matching the pattern (for example "a-1", "1b") parse as prefix "" and number 0, hence sort among numeric IDs by 0. The empty string also sorts as ("", 0). Items are coerced by the regex, so numbers and strings can be mixed. Used by `restrictIDFromWindow` (BEH-845), `validVisibleTagIdsDomain` (`sortIds(axes.ydomain())`, the domain used by next/previous ID navigation, CAP-305) and `validIdsChrono`. `validAllTagIdsDomain` (`sortIds(allTagsID)`) would also use it, but its only reference found is commented out in `onClickNextID` (`ChronoControlInteraction.js`): dead code. Note that `updateChronoYDomain` re-sorts the final domain differently (BEH-831).

- **Group:** CAP-801
- **Origin:** essential
- **Code:**
  - `ChronoControl.js`: `sortIds`, `validIdsChrono`, `validVisibleTagIdsDomain`
- **Links:** BEH-845, BEH-831, CAP-305, DEBT-820

## BEH-831: ID domain of the chronogram rows

The list of row IDs given to the axes (consumed by CAP-302) is derived here from the filtered data (see also BEH-829):
- if `flag_restrictID`: the domain is `restrictIDArray` as typed (user order, empty or absent IDs included);
- else `validIdsChrono()`: the IDs of `chronogramData` (with an extra, redundant `hideInvalid` check on `labels` containing `wrongid`/`falsealarm`, already removed upstream), plus, only when `tagMode != 'Tracks'` (never), the IDs of `tagIntervals`; sorted with `sortIds`.
Then, because `chrono.config.idAxisMap` always exists, the domain is replaced by the unique mapped values `idAxisMap(id)` sorted with `(a,b) => Number(a) - Number(b)` — a plain numeric sort that discards the `sortIds` order; non-numeric IDs ("F3") yield NaN comparisons, giving an engine-dependent order (DEBT-820). An empty domain is replaced by `["-"]` by the axes. Consequences of the `'Tracks'`-only rule: IDs that have tags but no (visible) event rows get no row, so their tag intervals are not drawn (the drawing step itself is not verified here; see BEH-829).

- **Group:** CAP-801
- **Origin:** accident
- **Code:**
  - `ChronoControl.js`: `updateChronoYDomain`, `validIdsChrono`, `validIdsDomain`, `validTagIdsDomain`
- **Links:** BEH-830, BEH-824, DEBT-820, CAP-302

## BEH-833: Clean obsolete events

Button `#cleanObsoleteEventsButton` ("Clean obsolete Events", in the Tag filtering panel, title "Delete obsolete events: no associated tag or low DM or inside excludeRects") calls `cleanObsoleteEventsCB`: `confirm("CAUTION !!!! Operation cannot be undone. ...")`; on cancel nothing happens (logged); on OK `cleanObsoleteEvents`.
`cleanObsoleteEvents` loops over ALL of `Tracks` (frame filter, restrict/exclude ID, hideInvalid do NOT limit it). Only observations labelled `falsealarm` or `wrongid` are candidates. A candidate is `delete`d (`delete Tracks[F][id]`, MUTATION of Tracks) when: it has no `obs.tag`; or `obs.tag.dm < 20` (hard-coded 20, independent of `#tagsMinDM`; a tag with no `dm` is not deleted by this rule); or the tag fails `tagsSampleFilterExcludeRects` (only effective when `flag_useExcludeRects` is on). The three tests are independent `if`s (the last two are not exclusive), and each logs to the console. Valid observations are never deleted. Empty `Tracks[F]` objects are left behind. It then calls `refreshChronogram`. It does not set any saved flag, selection update, history or overlay refresh, and there is no undo (OQ-009). Whether `obs.tag` is up to date depends on a previous refresh (BEH-802).

- **Group:** CAP-803
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `cleanObsoleteEventsCB`, `cleanObsoleteEvents`
  - `OverlayControl.js`: `tagsSampleFilterExcludeRects`
  - `labelbee_page.html`: `#cleanObsoleteEventsButton`
- **Links:** BEH-802, BEH-839, BEH-840, INV-001, DEBT-821, OQ-805, OQ-009

## BEH-834: Tag interpolation (interpolateTags)

`interpolateTags(maxgap)` has no button or call in the page (console only; use unverified, OQ-806). Behavior: first sets `tagIntervals = []` (clearing the displayed tag intervals; they return at the next refresh). Builds its own local `ttags` from ALL of `Tags` (`String(id) -> String(frame) -> tag`, no filters). For each ID, frames ascending: samples failing `tagsSampleFilter` are ignored; for consecutive kept frames `end` and `f`: if `f == end + 1` extend; else if `f - end < maxgap`, `pushInterpolate(id, end, f)` fills the frames strictly between; otherwise start a new run. `pushInterpolate` linearly interpolates the center `c` between the two tags and translates the corner points `p` of the earlier tag by the same displacement (no rotation or scale change), and MUTATES `Tags`: creates `Tags[j] = {tags: []}` if absent and pushes `{id (string), y: idAxisMap(id), c, hamming: 1000, p, frame: j}` (no `dm`, no `goodness`). `hamming: 1000` is the sentinel treated specially by BEH-813. It logs each added frame. No check that a tag of the same ID already exists at frame `j` (possible if it was dropped by the sample filter): duplicates. The final `activeInterval.end++` has no effect. It does not refresh anything and does not add `obs`, so the interpolated tags are not reachable by `augmentTrackWithTag` unless an observation exists at that frame and ID.

- **Group:** CAP-804
- **Origin:** debt
- **Code:**
  - `ChronoControl.js`: `interpolateTags`
- **Links:** BEH-813, BEH-802, ENT-002, DEBT-822, OQ-806

## BEH-835: Motion direction (computeMotionDirection)

`computeMotionDirection()` (no caller in the page, OQ-806) calls `cacheTags`, then for each interval of the current `tagIntervals` reads the tags at `begin` and `end` through `getTags(frame, id)`; if both lists have length 1 and `tag2.c[1] < tag1.c[1]` sets `interval.dir = "entering"`, if `>` sets `"leaving"` (image y decreasing means entering), else leaves `dir` undefined (also when a list is missing). It then calls `updateTagIntervals()`, which rebuilds `tagIntervals = []` from `ttags`, discarding the intervals that received `dir`: the net effect is only the `tagCache` rebuild and the loss of `labeling`/virtual intervals until the next refresh. `cacheTags` (Model.js) tests `ttags[key]` instead of `tagCache[key]` so `tagCache` always holds one tag per `frame,id` (last wins), making the length-1 test always true (DEBT-823).

- **Group:** CAP-804
- **Origin:** debt
- **Code:**
  - `ChronoControl.js`: `computeMotionDirection`
  - `Model.js`: `cacheTags`, `getTags`
- **Links:** BEH-812, DEBT-823, OQ-806

## BEH-837: Label predicate used by all filters

All filters on labels go through `hasLabel(obs, label)` / `containsLabel(labels, label)`: the label string is split on ",", each part lower-cased, trimmed, empty parts dropped, then mapped through `labelMap` (aliases: `f` fanning, `p` pollen, `e` entering, `d`/`l`/`departing` leaving, `expulsion` itself); the queried label is also normalized, and equality is tested on the array. `falsealarm` and `wrongid` (lower case) are therefore exact label names. `hasLabel` first sets `obs.labels = ""` if it was null/undefined (a write to the passed object; on a `Tracks` observation it is a MUTATION, on a wrapper only the wrapper). `containsLabel(null, x)` is false and does not write. Labels are the canonical store; `bool_acts` is derived (DEC-003) but `updateChronogramData` reads `bool_acts` for the activity rows.

- **Group:** CAP-801
- **Origin:** essential
- **Code:**
  - `SelectionControl.js`: `hasLabel`, `containsLabel`, `toLabelArray`, `normalizeLabel`
- **Links:** DEC-003, BEH-805, BEH-803, CAP-601

## BEH-838: Obs table is a consumer of flatTracks

`renderObsTable` (labeling tab, `#obsTable`) renders `flatTracks` (so it follows hideInvalid, restrict/exclude ID and frame filter, not hideFlowers) when the labeling accordion is expanded, with columns ID, Frame, Labels, and a row click calls `gotoEvent(Number(frame), id)`. This item is link-only: the table itself is a display (CAP-601/CAP-300) specified there; it is listed here for the filters' observable effect. It is called at the end of every refresh.

- **Group:** CAP-801
- **Origin:** intentional
- **Code:**
  - `ChronoControl.js`: `renderObsTable`, `refreshChronogram`
- **Links:** BEH-803, BEH-819, CAP-601
