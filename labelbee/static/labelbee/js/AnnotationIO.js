/*jshint esversion: 6, asi: true */
// Annotation IO dialogs: the load and save buttons, the dialogs that list the files of the server (labels, events, tags), the login
// dialog and the user info (moved to session/Login.js in step 13b). ES module (refactor slice 8 step 12c, ADR 0015); no statement cut. Page globals
// (`events`, `videoManager`, `loadTracks`, `printMessage`, `chronoState`...) are read at call time; what the page reads is on `window`
// (the bridge installs the exported functions, this file assigns the instances `fromServerDialog`...).


// Formerly implicit globals, used as temporaries by the dialogs below (module scope, same sharing as before)
let html, idx, buttonHTML, success, fileData

// ######################################################################
// INPUT/OUTPUT

export function initAnnotationIO() {
  document
    .getElementById("load")
    .addEventListener("change", loadEventsFromFile);
  document
    .getElementById("loadtags")
    .addEventListener("change", loadTagsFromFile);

  chronoState.ttags = [];
}

// The loaders, loadTracks/loadTags, mainAlert, the AJAX errors and eventsToServer are in annotation/Load.js and
// annotation/ServerIO.js (slice 8 step 6b)
