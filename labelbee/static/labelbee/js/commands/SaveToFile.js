/*
 * SaveToFile (FileExport.js until slice 8 step 14i): the commands that save to a file of the annotations, with the download link as only DOM (refactor slice 8 step 6a,
 * ADR 0015). Moved from AnnotationIO.js (the block `saveBlobToFile` to `saveEventsToBBoxes`, and `saveTagsToFile`). What is
 * saved is picked by Export.js; these functions name the file and package the result.
 * The names are installed as globals by labelbeeBridge.js: the template buttons (`onclick="saveEventsToFile('v2')"`) and
 * VideoList.js (`getTimestampNow`) call them. The download itself (`saveBlobToFile`, `saveObjToJsonFile`, `saveCSVToFile`) moved to io/LocalFile.js (step 14d).
 *
 * Behavior changes, each approved by the maintainer: an unknown format of `saveEventsToFile` or version of `saveTagsToFile`
 * throws (it saved a file containing `null`, or logged only); `saveTagsToFile` v2 no longer writes an implicit global.
 */
import { exportTracks, exportTracksCSV, exportBBoxes, exportTags } from '../codecs/Export.js';
import { saveObjToJsonFile, saveCSVToFile } from '../io/LocalFile.js';
import { getVideoInfo } from '../video/VideoInfo.js';

export function getTimestampNow() {
  function addZero(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return String(i);
  }

  let D = new Date();
  let timestamp =
    D.getFullYear() +
    addZero(D.getMonth() + 1) +
    addZero(D.getDate()) +
    "_" +
    addZero(D.getHours()) +
    addZero(D.getMinutes()) +
    addZero(D.getSeconds());
  return timestamp;
}
export function getTimestampedVideoname() {
  return getVideoInfo().name + "-" + getTimestampNow();
}

export function saveEventsToFile(format) {
  console.log("saveEventsToFile: exporting to JSON...");

  if (!format) {
    format = "v2";
  }

  let filename = getTimestampedVideoname() + "_Tracks.json";

  saveObjToJsonFile(exportTracks(format), filename);
}

export function saveEventsToCSV() {
  console.log("saveEventsToCSV: exporting to CSV...");

  saveCSVToFile(exportTracksCSV(), "Tracks.csv");
}

export function saveEventsToBBoxes() {
  console.log("saveEventsToBBoxes: exporting bounding boxes to CSV...");
  console.log("with simple format: frame, left, top, right, bottom, pollen");

  saveCSVToFile(exportBBoxes(), "BBoxes.csv");
}

export function saveTagsToFile(version) {
  console.log("saveTagsToFile: exporting to JSON... v=", version);

  let filename = getTimestampedVideoname() + "_Tags.json";

  saveObjToJsonFile(exportTags(version), filename);
}
