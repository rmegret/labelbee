/*
 * LoadFromFile (FileImport.js until slice 8 step 14i): the commands that load from a local file, mirror of SaveToFile.js (refactor slice 8 steps 6c and 14i, ADRs 0015, 0016). Moved from
 * Load.js: it reads the file (`readFileAsText`, io/LocalFile.js) and hands the text to Load.js, which knows the formats; a failure is shown by
 * core/Alerts.js. `initFileImport` wires them to the file inputs `#load` and `#loadtags` (called by `init()` of labelBee.js);
 * nothing is on `window`.
 *
 * Chain the apply stage with `.then(apply)` before the final `.catch(report)`: a rejection of the apply stage is reported
 * as the load error of the file too (slice 3 step 4, ADR 0005).
 */
import { loadTracksFromText, loadTagsFromText } from './Load.js';
import { reportLoadError } from '../core/Alerts.js';
import { readFileAsText } from '../io/LocalFile.js';

export function initFileImport() {
  document.getElementById("load").addEventListener("change", loadEventsFromFile);
  document.getElementById("loadtags").addEventListener("change", loadTagsFromFile);
}

export function loadEventsFromFile(event) {
  console.log("loadEventsFromFile: importing from JSON...");

  const fileToRead = event.target.files[0];
  event.target.value = ""; // Reinit value to allow loading same file again

  if (!fileToRead) {
    console.log("loadEventsFromFile: Canceled by user.");
    return;
  }
  console.log("loadEventsFromFile: importing from JSON file:", fileToRead);

  return readFileAsText(fileToRead).then((text) => loadTracksFromText(text, fileToRead.name))
    .catch(reportLoadError("loading events from file " + fileToRead.name));
}

export function loadTagsFromFile(event) {
  //console.log("loadTagsFromFile: importing from JSON...")

  const fileToRead = event.target.files[0];
  event.target.value = ""; // Reinit value to allow loading same file again

  if (!fileToRead) {
    console.log("loadTagsFromFile: Canceled by user.");
    return;
  }
  console.log("loadTagsFromFile: importing from JSON file:", fileToRead);

  return readFileAsText(fileToRead).then(loadTagsFromText)
    .catch(reportLoadError("loading tags from file " + fileToRead.name));
}
