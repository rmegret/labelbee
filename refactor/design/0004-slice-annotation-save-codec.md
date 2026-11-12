# ADR 0004: Slice 2, annotation save/export codec (encode side)

Status: proposed (slice chosen by the maintainer on 2026-11-12; [Q16](../QUESTIONS.md#q16) and [Q17](../QUESTIONS.md#q17) answered the same day; [OQ-712](../QUESTIONS.md#oq-712) answered 2026-11-12)

Second slice of [ADR 0001](0001-strangler-migration.md), mirror of [ADR 0002](0002-slice-annotation-load-codec.md)
(same module, same method). Module: `AnnotationCodec`, save/export side ([modules.md](../intent/modules.md),
[SEAM-702](../intent/seams.md)). Behaviors: BEH-710, BEH-711, BEH-712, BEH-738, BEH-739.
Known defects met on the way: DEBT-706, DEBT-707, DEBT-727, DEBT-728.

## 1. Pick

Move the functions of `labelbee/static/labelbee/js/AnnotationIO.js` that turn the model into JSON or CSV
objects/text. Line numbers are those of `refactor` at `52b3fdf7`.

| Function | Line | Callers (all inside `AnnotationIO.js`) |
|---|---|---|
| `convertTracksToV1` | 230 | `saveEventsToFile` (364); v1 button is commented out in the page |
| `convertTracksToV2` | 275 | `saveEventsToFile` (365), `eventsToServer` (1599) |
| `tracksToCSV` | 373 | `saveEventsToCSV` (402) |
| `tracksToBBoxes2` | 439 | `saveEventsToBBoxes` (482) |
| `tracksToBBoxes` | 407 | none anywhere (grep, excluding `extern/`); moved next to `tracksToBBoxes2` ([Q17](../QUESTIONS.md#q17)) |

No caller in other JS files or in `labelbee_page.html`.

Not in the slice: `saveEventsToFile`, `saveEventsToCSV`, `saveEventsToBBoxes` (filenames, Blob download),
`saveBlobToFile`, `saveObjToJsonFile`, `saveCSVToFile`, `getTimestamp*` (local file I/O, a later `LocalFileIO`
slice), `eventsToServer` (ajax, with the server client), `saveTagsToFile` (tag encoding is inline with its
download and uses an implicit global `obj`: goes with a tags slice), all loaders and `setTracks`/`setTags`.

## 2. Impurities found, and how the move keeps behavior

| Impurity | Where | Handling in the move (behavior-preserving) |
|---|---|---|
| Reads globals `Tracks` (`Model.js:3`), `TracksInfo` (implicit global, created by `setTracks`), `videoinfo` (`VideoList.js:8`) | `convertTracksToV1/V2` | Become parameters: `convertTracksToV1(Tracks)`, `convertTracksToV2(Tracks, TracksInfo, videoinfo)`. The same object references are passed, so every in-place effect below stays identical |
| Returns `info` that IS `TracksInfo`; sets `formatnote`, pushes to `history`, stores a `videoinfo` reference; throws on a string `history` | `convertTracksToV2` ([DEBT-706](../intent/debt.md), BEH-711) | Kept as is in the move and pinned by the goldens (inputs after the call) |
| `Object.assign(evt)` aliases the observation: deletes `marked`/`permanent`, rewrites `cx, cy, x, y, width, height` in the live `Tracks` | `convertTracksToV1` ([DEBT-707](../intent/debt.md), BEH-712) | Kept in the move, pinned |
| `Date()` in the history entry | `convertTracksToV2` | Called unchanged. Tests replace `globalThis.Date` by a function returning a fixed string. Injecting a clock is a fix-step decision, not part of the move |
| Unconditional `console.log` per frame and per event | both converters | `log` from `core/Notifier.js` ([ADR 0003](0003-notifier.md)), same text. Routine logs are not pinned (rule of ADR 0002) |
| Parameter named `Tracks` shadows the global; dead helper `conc` | `tracksToCSV`, `tracksToBBoxes2` | Kept (no drive-by); `conc` stays recorded in BEH-738 |
| Observation without `bool_acts` or a `null` entry throws `TypeError` | `tracksToCSV`, `tracksToBBoxes2` ([DEBT-727](../intent/debt.md)) | Kept; goldens pin the error name |

Replacing the globals-by-reference by the non-mutating `encodeEvents(snapshot, videoinfo, info)` contract of
SEAM-702 is a semantic change: a later step, not this slice.

## 3. Steps (separate commits, page working after each)

1. **Goldens, no production change.** Under `refactor/tests/golden/slice2/` only (Q11). Same technique as slice 1:
   the OLD functions are extracted from `AnnotationIO.js` and evaluated in a `vm` with `Tracks`, `TracksInfo`,
   `videoinfo` and a fixed `Date` stubbed. Synthetic fixtures (Q8). Cases: v2 basic (two frames, two ids), empty
   `Tracks`, `null` frame, `null` event, `history` absent / array / string (error name), `videoinfo` with a
   nested object, rounding at 3 decimals; v1 basic, holes in the returned array, and `Tracks` after the call
   (pins DEBT-707); CSV with each flag combination and `undefined` / missing `bool_acts` / `null` entry; BBox2
   same; `tracksToBBoxes` (moved with its sibling, Q17). One round-trip test: `sanitizeEvents(convertTracksToV2(...))`
   returns the saved model (uses the module of slice 1).
2. **Add** the functions to the existing `annotation/AnnotationCodec.js` (named exports, legacy names kept;
   ~170 lines added to its 431). `AnnotationCodecBridge.js` gets wrappers: `convertTracksToV1()` and
   `convertTracksToV2()` keep their zero-argument legacy signature and read the globals at call time, as the
   bridge already does for `hasLabel`; the CSV/BBox functions are assigned directly. The module never touches
   `window`. Goldens must pass on old and new.
3. **Redirect + delete**: remove the old definitions from `AnnotationIO.js`; the in-file calls resolve to the
   bridge. Check that no call happens at load time (saves are user actions, the bridge is a deferred module).
   The test drops its `old` side, the golden stays as the reference (as in slice 1).
4. **Fix bugs (semantic, one commit each, goldens updated explicitly)**, only clear-cut candidates that the
   maintainer signs off one by one: DEBT-707 (`Object.assign({}, evt)`, approved in principle on 2026-11-12) and
   DEBT-706 in its full form ([Q16](../QUESTIONS.md#q16), [OQ-712](../QUESTIONS.md#oq-712)): `info` and the
   embedded `videoinfo` are deep-cloned instead of aliased (the whole `videoinfo` stays embedded, `preview` is
   only a URL), `history` is always an array, so the live `TracksInfo` is no longer mutated. Each commit shows
   its golden diff before approval. DEBT-727 (crash on missing
   `bool_acts`) is ambiguous and stays `DEBT`.
5. **Record**: PLAN, the code lists of SEAM-702, BEH-710/711/712/738/739, DEBT-706/707/727/728 and the entries that
   cite these functions, regenerate `intent/docs/`.

Bridge entries stay until the callers move to modules (`saveEventsTo*`, `eventsToServer`); they are listed in
the PLAN.

## 4. Checks

- Automated: the goldens of step 1, run on old code (generation) and new code (verification). They compare
  the full JSON and CSV text, since a silent change of a saved file is the main risk (data loss).
- Manual, in the browser, by the maintainer (needs a server for the last item): load a tracks file, save v2 to a
  file, reload it, compare with a file saved before the slice (identical except the history date and
  `videoinfo`); export CSV; export BBoxes; save to the server. These become `tests/CHECKLIST.md` items.
  v1 is not reachable from the page: goldens only.

## 5. Decisions proposed here (the maintainer confirms)

- Same file `annotation/AnnotationCodec.js` for both sides (one module, per `modules.md`); split it only if it
  passes ~800 lines.
- Globals become parameters in the module; the bridge reads them. No `configure` binding: they are data, not
  collaborators (unlike `hasLabel`).
- Mutations and `Date()` are kept during the move, the fix steps change them, each with its golden diff.
- Decisions of ADR 0002 section 5 apply unchanged (goldens from the OLD code in `vm`, what is pinned,
  PascalCase files, bridge sets `window.*`, clear-cut bug rule of `CLAUDE.md`).

## 6. Out of scope / risks

- A saved file differing from the old one without anyone noticing. Mitigation: full-text goldens and the
  manual before/after comparison of section 4.
- Goldens use a small `videoinfo` stub; the real object (name, `videoPath`, `preview` URL, `tags`, ...) is not
  exercised, only cloned or aliased as is.
- Whether `Tracks`/`videoinfo` are still plain `var` globals at call time depends on the bridge reading them
  by bare name (true today: `Model.js:3`, `VideoList.js:8`); `TracksInfo` is an implicit global and must exist
  (BEH-709), otherwise `ReferenceError` as before.
- The loaders slice (`setTracks`, `setTags`, file and server loaders) comes after this one and needs an
  `AnnotationStore` decision first.
