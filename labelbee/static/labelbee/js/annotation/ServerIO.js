/*
 * ServerIO: the page buttons that load a CSV from the server (refactor slice 8 steps 6b, 6c, 14d and 14h1 to 14h3, ADR 0015, 0016).
 * The loads are commands/LoadFromServer.js, the save commands/SaveToServer.js; step 14h4 moves the buttons.
 * The entry points still called by a classic script, a template button or a test are installed as
 * globals by labelbeeBridge.js (the template buttons `clickLoadTracks*`).
 *
 * Strict mode: the implicit globals `dataToSend`, `alertMSG`, `success` and `tags` of the old code are declared; nobody read them.
 *
 * DEBT: globals read at call time: `$`, `d3` and `videoManager`.
 */
import { loadCSVFromServer } from '../commands/LoadFromServer.js';
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
