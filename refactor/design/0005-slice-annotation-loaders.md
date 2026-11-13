# ADR 0005: Slice 3, `AnnotationStore` and the annotation loaders

Status: proposed. Direction and answers of the maintainer on 2026-11-12: [Q18](../QUESTIONS.md#q18),
[Q19](../QUESTIONS.md#q19), [Q20](../QUESTIONS.md#q20), [Q21](../QUESTIONS.md#q21), [Q22](../QUESTIONS.md#q22).

Third slice of [ADR 0001](0001-strangler-migration.md), second half of the pilot of [PLAN](../PLAN.md)
(slices 1 and 2: [ADR 0002](0002-slice-annotation-load-codec.md), [ADR 0004](0004-slice-annotation-save-codec.md)).
Modules: `AnnotationStore` (new, [SEAM-701](../intent/seams.md)), loaders stay in `AnnotationIO`
([modules.md](../intent/modules.md)), `decodeTags` in `AnnotationCodec` ([SEAM-702](../intent/seams.md)).
Behaviors: BEH-714, 720, 722, 724, 727, 728, 731, 735..737. Defects met: DEBT-709, 710, 712, 713, 715, 722, 733, 736.
Line numbers: `refactor` at `9566a53b`, `labelbee/static/labelbee/js/AnnotationIO.js` unless stated.

## 1. Division of roles (maintainer decision)

| Module | Owns | Does not own |
|---|---|---|
| `AnnotationStore` (new ES module) | the in-memory data structures: `tracks`, `tracksInfo`, `tags`, `tagsInfo`, and `tagsHaveDM` (a property of the loaded tags) | decoding, I/O, DOM, refresh, derived data (`ttags`, `flatTags`: later to a `Derived` module) |
| `AnnotationIO.js` (stays a classic script) | the loaders, the promise logic, `setTracks`/`setTags` (apply), the dialogs | the data |
| `AnnotationCodec` | pure format code (slices 1, 2) + `decodeTags` | state |

No function is deleted in this slice: dead or deprecated loaders (`loadEventsFromFile0`, `loadTagsCSVFromServer`,
`loadTracksCSVFromDB`, `eventsFromServer`) may be called by hand from the console and are kept in `AnnotationIO.js`
([Q20](../QUESTIONS.md#q20)). The only code removed is the data declarations that move to the store (section 2).

## 2. The store and the bridge

**Store** (`annotation/AnnotationStore.js`, pure, no `window`, no events, testable in Node):
`getTracks()`, `getTracksInfo()`, `getTags()`, `getTagsInfo()`, `getTagsHaveDM()`, `replaceTracks(data, info)`,
`replaceTags(data, info)` (names from the SEAM-701 contract), `setTagsHaveDM(v)`. Step 2: `tagsHaveDM` is a plain
flag the store holds; `replaceTags` does not touch it, because computing it inside the legacy `Tags = obj`
assignment would run the rule (which throws on a malformed file, DEBT-715/733) before `tagsAddFrames` and
`getTTags`, a visible order change pinned by the golden. Step 3 moves today's rule (`"dm" in` the first tag of
the first frame, `setTags` lines 443-449, DEBT-715 kept as is) into the store as a method that `setTags` calls
at the same point of its sequence; the `.requireDM` DOM toggle stays in `setTags` and reads the store. Initial values: `tracks = []`, `tags = []`, infos `undefined`,
`tagsHaveDM = false` (the global was undefined before the first `setTags`; both falsy). It returns the stored object itself, never a copy: the ~170 call sites mutate
`Tracks[f][id]` in place and must keep seeing the same object.

**Bridge** (`annotation/AnnotationStoreBridge.js`, same pattern as `AnnotationCodecBridge.js`):
- creates the one instance and exposes it as `window.AnnotationStore`;
- defines on `window` the accessors `Tracks`, `TracksInfo`, `Tags`, `TagsInfo`, `tagsHaveDM` (`get` reads the store, `set` calls
  `replaceTracks` / `replaceTags` and keeps the sibling info; `tagsHaveDM` is read-only for new code, its setter kept for legacy writes), so every legacy read or `Tracks = x` keeps working.
- `var Tracks = []` and `var Tags = []` (`Model.js:3-4`) are removed: a top-level `var` is a non-configurable
  window property and cannot become an accessor. `TracksInfo`, `TagsInfo`, `tagsHaveDM` are implicit globals today, so nothing to remove.

**Progressive replacement.** The accessors are the only coupling to remove. Each later step rewrites the
references of one file to `AnnotationStore.getTracks()` etc.; when a name has no reference left, its accessor is
deleted from the bridge. Worklist (references in `js/`, excluding the codec): `Tracks` ~100 in 7 files
(`AnnotationIO`, `ZoomView`, `labelBee`, `ChronoControl`, `Model`, `SelectionControl`, `OverlayControl`),
`Tags` ~65 in 7 files (adds `VideoList`), `TracksInfo` 9, `TagsInfo` 1, `tagsHaveDM` 5 (`AnnotationIO`, `OverlayControl`). The PLAN carries this table and updates it.
In this slice only `AnnotationIO.js` (`setTracks`, `setTags`, `setEventsProp`, the `tagsHaveDM` computation) and the codec bridge wrappers
switch to the store directly; they prove the path.

## 3. Loaders: promise logic in `AnnotationIO.js` (same file, same names)

Each loader is restructured in place as a pipeline `get -> decode -> apply`:
- `get` returns a Promise (new small helpers: `readFileAsText(file)`, `getJSON(url)`, `getCSV(url)`
  wrapping `FileReader`, `$.ajax`/`$.getJSON`, `d3.csv`);
- `decode` is the codec (`sanitizeEvents`, `decodeTags`, `*_csv_to_json`);
- `apply` is `setTracks` / `setTags` (store write, derived data, DOM, refresh) followed by the caller's own
  tail (hide dialog, messages), in today's order.

The legacy names and signatures stay (inline `onclick` strings, `labelBee.js:267`, `VideoControl.js:1007`, manual
calls). They now return their Promise (they returned `undefined`, except `tagsFromServer` which returned the
jQuery promise of `.done`). Awaiting `loadEventsFromServerByID` in `labelBee.js:267` starts to mean something:
that is the DEBT-722 fix, kept for step 5, so in the move the returned Promise resolves as before
(immediately) until then.

`setTags` splits: the pure validation and info part (lines 379-424) becomes `decodeTags(obj)` in the
codec, the rest stays as apply. Not touched: `FromServerDialog`, `eventsToServer`, auth, `saveTagsToFile`.

## 4. Impurities and how the move keeps behavior

| Impurity | Handling |
|---|---|
| `TracksInfo`/`TagsInfo`/`tagsHaveDM` are `ReferenceError` before the first `setTracks`/`setTags` today | the accessors return `undefined` instead; the only reader before init is `setEventsProp` (`if (!TracksInfo)`), which handles it. `labelBee.js:208` calls `setTracks([], true)` at startup anyway |
| Module scripts are deferred, classic scripts run first | nothing reads `Tracks`/`Tags` at load time (grep: only the two declarations at `Model.js:3-4`); to confirm in the browser |
| `ttags` (`ChronoControl.js:15`, written at `AnnotationIO.js:14,440`) and `flatTags` stay classic globals | derived: they go to `Derived` when it is ready (DEBT-736); `tagsHaveDM` is the exception, it describes the loaded tags |
| `new Date()` in CSV `info.history`, `console.log`, implicit globals `success`, `tags`, `div`, `tag_event_ID` | unchanged in the move (Date stubbed in tests, Notifier as in ADR 0003) |
| `setTags` v1 key check reads the old global `Tags` (DEBT-713) | `decodeTags` takes it as a parameter during the move, pinned by a golden; fixed in step 5 |

## 5. Steps (separate commits, page working after each)

1. **Goldens, no production change**, `refactor/tests/golden/slice3/` (Q11). Old `setTracks`, `setTags` and every
   loader of `AnnotationIO.js` run in a `vm` with `$.ajax`, `$.getJSON`, `d3.csv`, `FileReader`, `videoControl`,
   `refreshChronogram`, `Date` stubbed; stubs record requested URLs, the order of calls, and the final `Tracks`,
   `TracksInfo`, `Tags`, `TagsInfo` (full JSON). Cases per loader: success, request failure, invalid JSON,
   `setTracks` false; `setTags` v1 ok / bad key / v2 / wrong type / without `data` / `null`.
2. **Store + bridge**: `AnnotationStore.js`, `AnnotationStoreBridge.js`, script tag in `labelbee_page.html`,
   removal of `var Tracks`/`var Tags` from `Model.js`. Node tests: store contract, accessor identity (same object
   in, same object out; `Tracks = x` reaches the store), bare-name access from sloppy code in a `vm`. The step 1
   goldens pass unchanged, the harness now running the legacy code through the bridge. [done]
3. **`setTracks`, `setTags`, `setEventsProp` write through `AnnotationStore`**, `decodeTags` moved to the codec
   (with a `previousTags` parameter for the DEBT-713 check), the DM rule into `updateTagsHaveDM()` of the store.
   Goldens pass unchanged. [done]
4. **Loaders as promise pipelines** in `AnnotationIO.js`, legacy names kept. Goldens pass (same call order).
5. **Bug fixes, each in its own commit, after the moves, golden diff shown for approval** ([Q19](../QUESTIONS.md#q19): DEBT-713, 733, 710-rest, 722).
6. **Record**: PLAN (bridge worklist), SEAM-701/702, BEH and DEBT entries, regenerate `intent/docs/`.

## 6. Checks

- Automated: goldens of step 1 on old (generation) and new code; store and bridge tests of step 2.
- Manual, in the browser by the maintainer: the page loads and plays (bridge installed before first use); load
  v1 and v2 events files, a tags file; draw, edit and erase an observation (in-place mutations still hit the
  store object); events from the server dialog and by `#video_data=<id>`; tags through a video of the list; CSV
  by URL; save v2 after each. Same items as ADRs 0002/0004, to join `tests/CHECKLIST.md`.

## 7. Risks

- A legacy reader hidden at load time (inline script, template, `eval`ed string) would see `undefined`: grep
  covered `js/` and `labelbee_page.html`; the browser check is the proof.
- Aliasing: if anyone ever keeps `var t = Tracks` across a `setTracks`, it holds the old object. Same as today
  (`Tracks = evts.data` already replaces the object); not a regression.
- Goldens stub `$`, `d3`, `FileReader`: real library behavior is covered only by the manual checks.
- Browser checks of slices 1 and 2 are still pending; this slice exercises the same codec.
