/*
 * ServerIO: the load of the tags from the server and the page buttons that load a CSV (refactor slice 8 steps 6b, 6c, 14d, 14h1 and 14h2,
 * ADR 0015, 0016). The events loads are commands/LoadFromServer.js, the save commands/SaveToServer.js; step 14h moves the rest.
 * The entry points still called by a classic script, a template button or a test are installed as
 * globals by labelbeeBridge.js (the template buttons `clickLoadTracks*`).
 *
 * Strict mode: the implicit globals `dataToSend`, `alertMSG`, `success` and `tags` of the old code are declared; nobody read them.
 *
 * DEBT: globals read at call time: `$`, `d3`, `videoManager`, `fromServerDialog` (its message) and `statusWidget`.
 */
import { loadTags } from '../commands/Load.js';
import { loadCSVFromServer } from '../commands/LoadFromServer.js';
import { getJSONPromise } from '../io/ServerIO.js';
import { logging } from '../core/Notifier.js';
import { url_for } from '../core/Utils.js';

// Buttons of the page: ask the user for a URL, then load it (DEBT: the defaults hardcode the datasets `bee_feeder` and `gurabo4`)
export async function clickLoadTracksCSVFromServer() {
  console.log("clickLoadTracksCSVFromServer: loading .tracks.csv from URL");
  const url = prompt("Enter tracks URL", url_for("/data")+"/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv");
  if (url == null || url == "") {
    console.log("clickLoadTracksCSVFromServer: no URL entered");
    return;
  }
  return loadCSVFromServer(url, "tracks");
}
export async function clickLoadTracksTaggedCSVFromServer() {
  console.log("clickLoadTracksTaggedCSVFromServer: loading video and .tracks_tagged.csv from URL");
  const col_videoname = prompt("Enter gurabo4 col_videoname", "col10/9_02_R_190809120000.cfr.mp4");
  if (col_videoname == null || col_videoname == "") {
    console.log("clickLoadTracksCSVFromServer: no video entered");
    return;
  }
  const videoURL = url_for("/data")+`/datasets/gurabo4/mp4/${col_videoname}`
  console.log(`Trying to load video from ${videoURL}`)
  videoManager.loadVideoManual(videoURL);
  
  const tracksURL = url_for("/data")+`/datasets/gurabo4/tracks/${col_videoname}.tracks_tagged.csv`
  console.log(`Trying to load tracks_tagged from ${tracksURL}`)
  return loadCSVFromServer(tracksURL, "tracks_tagged")
}

export function tagsFromServer(tagFileID) {
  if (logging.io) {
    console.log('tagsFromServer: loading tag file with ID "' + tagFileID + '"...');
  }
  statusWidget.statusRequest("tagsLoad", "");

  // The Promise is deliberately not returned: FromServerDialog.loadEvents reads the return value as
  // "success", and it has always been undefined (DEBT-719)
  getJSONPromise(url_for("rest/v2/annotation/" + tagFileID)).then(
    function (data) {
      console.log('tagsFromServer: loaded tag file with ID "' + tagFileID + '"');
      statusWidget.statusUpdate("tagsLoad", true, "");
      const tags = data["data"]["data"];
      console.log("Loaded tag data:", tags)
      if (tags == null){
        fromServerDialog.setMessage("red", "ERROR: Tag data stored in server is null.");
        return
      }
      return loadTags(tags);
    },
    function () {
      console.log('tagsFromServer: ERROR loading tag file with ID "' + tagFileID + '"');
      statusWidget.statusUpdate("tagsLoad", false, "");
      return loadTags([]);
    }
  );
}
