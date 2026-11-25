/*jshint esversion: 6, asi: true */
// The notes of the events (`#events-notes`, `events.info.notes`): a data field edited directly through the page, which is what
// `form/` is for (ES module, refactor slice 8 step 13a, ADR 0015). `updateEventsNotes` is called by commands/Load.js after a load.
// `events` is the page global, read at call time.

import { instrument } from "../core/RefreshInstrumentBridge.js"
import { events } from "../annotation/AnnotationStore.js"

export function initEventsNotes() {
  $("#events-notes").on("input", onChanged_events_notes);
}

function onChanged_events_notes(event) {
  if (events.info) {
    events.setInfo("notes", $("#events-notes").val());
  }
}

function updateEventsNotes() {
  if (events.info) {
    $("#events-notes").val(events.info["notes"]);
  }
}

// The refresh instrumentation (core/RefreshInstrumentBridge.js, ADR 0009) wraps this entry point of the form
const instrumented = instrument("form", "updateEventsNotes", updateEventsNotes)
export { instrumented as updateEventsNotes }
