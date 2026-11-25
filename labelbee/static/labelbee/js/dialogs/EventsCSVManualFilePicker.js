/*jshint esversion: 6, asi: true */
// The "from /data" loader of the events: a file picker on `/api/v1/rawdata/` that loads the file by its name (ES module, refactor slice 8 step 13c, ADR 0015), moved unchanged from AnnotationIO.js.
// The instance is `window.pickEventsCSVDialog` (the button of the page calls `pickEventsCSVDialog.open()`), built by `initEventsCSVManualFilePicker`.

import { FilePickerFromServerDialog } from "./FilePickerFromServerDialog.js"
import { url_for } from "../core/Utils.js"
import { loadCSVFromServer } from "../commands/LoadFromServer.js"
import * as CsvSchemas from "../codecs/CsvSchemas.js"

// ## Manual load of events

class EventsCSVManualFilePicker {
  constructor() {
    const picker = this;
    this.filePicker = new FilePickerFromServerDialog();
    this.filePicker.initDialog({
      base_uri: url_for("/api/v1/rawdata/"),
      loadFileFunction: function (uri) {
        return picker.loadCSV(uri);
      },
      schemaProvider: {
        categories: () => CsvSchemas.categories(),
        classify: (uri) => {
          const schema = CsvSchemas.classifyFilename(uri);
          return schema ? { key: schema.key, label: schema.label, loadable: schema.loader != null } : null;
        },
        inspect: (uri) => CsvSchemas.inspectUri(uri),
      },
      dialogName: "Load tracks CSV Manually",
    });
  }
  // Detect the schema from the suffix and the header, validate, then run the loader of that schema
  async loadCSV(uri) {
    const dialog = this.filePicker;
    let res;
    try {
      res = await dialog.validateFile(uri);
    } catch (e) {
      return; // validateFile showed the error
    }
    if (!res.canLoad) {
      printMessage($("<div>").text("Cannot load " + res.filename + ": " + res.message).html(), "red");
      return;
    }
    if (res.status !== "ok" &&
        !confirm(res.message + "\n\nLoad it as \"" + res.chosen.label + "\"?")) {
      return;
    }
    console.log("EventsCSVManualFilePicker: loading", uri, "as", res.chosen.key);
    try {
      await loadCSVFromServer(uri, res.chosen.loader);
    } catch (e) {
      return; // reportLoadError already showed it
    }
    dialog.div.find(".modal-message").append($("<div>").text("Loaded as " + res.chosen.label + "."));
  }
  open() {
    this.filePicker.openDialog();
  }
  close() {
    this.filePicker.closeDialog();
  }
}

export function initEventsCSVManualFilePicker() {
  window.pickEventsCSVDialog = new EventsCSVManualFilePicker();
}
