# Manual checklist (browser)

**Automated:** every item below (A1 to E1) is now a test in [browser/](browser/README.md): `pytest refactor/tests/browser`
(about a minute, headless Chromium against the dev webapp, [ADR 0006](../design/0006-browser-tests.md)). Run that first.
This list stays for what a script cannot judge: how the drawing looks, H.264 playback in your usual browser, the real
backend (database, login) and the Tags display (finding F4). Originally written to be run by hand
([ADR 0001](../design/0001-strangler-migration.md) step 3): The golden tests
(`node --test refactor/tests/golden/`) cover the pure logic and the loaders against stubs; this list covers
what they cannot: the real page, jQuery, d3, `FileReader`, the video and the server.
**★** = minimum pass (about 10 minutes); the rest is the full pass, for a slice that touched that area.
Record each run in the log at the end.

## Setup
- Server: `flask run`, open `http://localhost:5000/`, log in (needed for the server items).
- Open the browser console (F12) and keep it visible: any red error is a finding, except the expected
  "Uncaught (in promise)" after a deliberate failure (items marked **[fail]**: the user also sees an alert).
- Files to have at hand (synthetic ones are fine): events v2, events v1 as an object, events v1 as an array, events with a
  duplicate id inside a frame, an invalid JSON file, a JSON of the wrong format (`{"a": 1}`), a tags v1 file, a tags v2 file
  with and without the `dm` field, a tags v2 file without `data`, a tracks CSV (URL), a video that has tags on the server.
  If you still have an events v2 file saved before the refactor, use it in D1.
- Known, not a finding: opening a video asks the server for its tags through a route that does not exist
  (DEBT-719), so a 404 for `rest/v2/annotation/...` in the network tab is expected, and it empties the Tags.
  Load tags only after the video is open.

## A. Smoke: the page as it always worked
| ID | Do | Expect |
|---|---|---|
| A1 ★ | Open the page, pick a video from the list | Video shows frame 0; no red error in the console |
| A2 ★ | Play, pause | Frame counter advances and stops |
| A3 ★ | Seek: click the chronogram, drag the frame slider | The frame follows |
| A4 ★ | Click an observation box | It is selected, its id is shown |
| A5 ★ | Create an observation (shift-click, as usual) | Box appears and the chronogram shows a new interval |
| A6 ★ | Move/resize it; change its label (e.g. pollen) | The edit is kept after changing frame and coming back |
| A7 | Undo after a delete (Undo only knows deletions) | The deleted observation comes back |
| A8 | Change an id / swap two ids | Ids change in the overlay and in the chronogram |
| A9 | Delete an observation | It disappears from the frame and the chronogram |
| A10 | Open the zoom view on a tag (needs tags) | Tags are drawn, DM filter responds |
| A11 | Load tracks with parts (tracks CSV) and show parts | Parts are drawn |
| A12 | Type in "Notes for current events", then save (D1) | The notes are in the saved file |

## B. Annotation store and bridge (slice 3, [ADR 0005](../design/0005-slice-annotation-loaders.md))
| ID | Do | Expect |
|---|---|---|
| B1 ★ | Console: `AnnotationStore.getTracks() === Tracks` | `true`; same for `getTags()` / `Tags` |
| B2 ★ | After A5, console: `Object.keys(AnnotationStore.getTracks())` | Includes the frame you edited (in-place edits reach the store) |
| B3 ★ | "Erase Events..." (confirm) | Chronogram empties; `Tracks` is `{}`; the page still works. Same for "Erase Tags..." |
| B4 | Load tags with the `dm` field, then without it | `.requireDM` controls enabled, then disabled; `AnnotationStore.getTagsHaveDM()` follows |

## C. Loading (slices 1 and 3)
| ID | Do | Expect |
|---|---|---|
| C1 ★ | Load Events: v2 file | Observations appear; the notes box shows the file's notes |
| C2 ★ | Load Events: v1 object, then v1 as an array | Both load (`TracksInfo.source` says "...v1 object" / "...v1 array") |
| C3 | Load Events: duplicate-id file | Alert "WARNING: Events file was loaded, but it has duplicate entries..."; the events load |
| C4 ★ **[fail]** | Load Events: invalid JSON, then `{"a": 1}` | Red alert "ERROR loading events from file <name>"; the previous Tracks are unchanged |
| C5 | Load the same file twice in a row | It loads again (input is reset) |
| C6 ★ | Load Tags: v1, then v2 | Tags drawn on the video and the chronogram |
| C7 **[fail]** | Load Tags: a v2 file without `data`, then an events v2 file | Alert each time; the previously loaded Tags stay |
| C8 | Server storage, "Load Events from DB": pick a file | The events appear; the dialog shows "Events loaded." |
| C9 ★ | With the video open, change the hash to `#video_id=<video id>&video_data=<data id>&frame=<n>` (address bar, no reload) | The events load, the video seeks to frame `<n>`; moving to another frame removes `frame=` from the hash. Opening such a URL cold seeks too (finding F1, fixed) |
| C10 **[fail]** | Same with a `video_data` id that does not exist | Alert "ERROR loading events with ID <id>"; the seek to `<n>` still happens |
| C11 | Tracks CSV: "from URI" with a valid URL, then "from /data" | Tracks load; boxes are 300x600 with the +90 angle convention |
| C12 **[fail]** | "from URI" with a bad URL | Alert "ERROR loading tracks CSV from <url>" |
| C13 | "gurabo4 video+tracks_tagged" (needs the dataset) | Video and tracks load |

## D. Saving (slices 2 and 3)
| ID | Do | Expect |
|---|---|---|
| D1 ★ | Save Events (JSON v2), then Erase, then Load that file | Identical tracks. Against a file saved before the refactor: identical except the `history` date and `videoinfo` |
| D2 | Import a tracks CSV, then Save Events (JSON v2) | The save works; the file's `history` is an array (it used to fail after a CSV import) |
| D3 | Save twice in the same session, open both files | Each lists the history as loaded plus its own save, not the earlier save of the session |
| D4 | Export Events (CSV), Export Events (BBox) | Files download and open; one row per observation |
| D5 | Save Tags (v2), then Erase Tags and Load it | Tags are restored |
| D6 | Save Events (JSON v2) to the server, then reload it from "Load Events from DB" | Saved, loads back identical. After a hash load (C9), the saved record's `created_from_id` is that id |

## E. Console
| ID | Do | Expect |
|---|---|---|
| E1 ★ | Look at the console after A-D | No red error except the expected "Uncaught (in promise)" lines after the **[fail]** items |

## Run log
| Date | Commit (`git rev-parse --short HEAD`) | Items run | Result / findings |
|---|---|---|---|
| | | | |
