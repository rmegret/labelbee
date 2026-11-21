/*
 * FileImport: the loads from a local file, mirror of FileExport.js (refactor slice 8 step 6c, ADR 0015). Moved from
 * annotation/Load.js: it reads the file (`FileReader`) and hands the text to Load.js, which knows the formats; a failure is shown by
 * core/Alerts.js. `loadEventsFromFile` and `loadTagsFromFile` are installed as globals by labelbeeBridge.js
 * (AnnotationIO.js: the file inputs).
 *
 * Chain the apply stage with `.then(apply)` before the final `.catch(report)`: a rejection of the apply stage is reported
 * as the load error of the file too (slice 3 step 4, ADR 0005).
 */
import { loadTracksFromText, loadTagsFromText } from './Load.js';
import { reportLoadError } from '../core/Alerts.js';

function readFileAsText(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (event) {
      resolve(event.target.result);
    };
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
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

  return readFileAsText(fileToRead).then(loadTracksFromText)
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
