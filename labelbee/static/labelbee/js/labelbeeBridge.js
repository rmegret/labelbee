/*
 * The one entry module of the page (refactor slice 8, ADR 0015): the only place that imports the ES modules the classic
 * scripts need, and the only `<script type="module">` of the page besides the layout scripts. Deferred, so it runs after
 * the classic scripts and before window.onload (nothing reads these names while the page parses).
 *
 * The singletons (`overlay`, `videoControl`, `events`, ...) stay plain globals. Inside a module the name is an import, never
 * the global, so the globals can be dropped later without touching module code. A `labelbee.X` namespace is not built
 * during the slice (maintainer, 2026-11-20): it is decided at the final cleanup of the globals (ADR 0015 decision 3).
 *
 * Evaluation order = import order below = the order of the ten module tags this file replaced:
 * Notifier (folded into this file), RefreshInstrumentBridge, AnnotationStoreBridge, RefreshBridge, SelectionModelBridge,
 * Labels, WrongId (folded), AnnotationCodecBridge, CsvSchemas, EventTree (folded). The five imported bridges hold wiring
 * logic, are imported by the golden tests (`AnnotationStoreBridge.js`), or are named by the stack filter of
 * `core/Notifier.js` (`RefreshInstrumentBridge.js`); each is folded here when its last classic reader moves.
 */
import { logging, refreshLog } from './core/Notifier.js';
import './core/RefreshInstrumentBridge.js'; // wraps the classic refresh functions (window.refreshInstrumented)
import './annotation/AnnotationStoreBridge.js'; // window.AnnotationStore, window.events, window.installDebugGlobals
import './annotation/RefreshBridge.js'; // window.refresh (needs window.events)
import './annotation/SelectionModelBridge.js'; // window.selection (needs window.events)
import './annotation/AnnotationCodecBridge.js'; // the legacy converter names (loaders, savers)
import * as Labels from './annotation/Labels.js';
import * as WrongId from './annotation/WrongId.js';
import * as CsvSchemas from './annotation/CsvSchemas.js';
import * as EventTree from './annotation/EventTree.js';
import {
  Observation,
  deepcopy,
  hasParts,
  getValidIDsForFrame,
  getValidIDsForFrames,
  obsDoesExist,
  getObsHandle,
  changeObservationID,
  getFramesWithID,
  getFramesWithSwapID,
  obs_swapID,
  printTracks,
  cacheTags,
  getTags,
  getIdsInFocus,
} from './annotation/Model.js';
import { htmlCheckmark, url_for } from './core/Utils.js';
import {
  deleteEvent,
  submitDraft,
  storeUnit,
} from './annotation/EditActions.js';
import * as FileExport from './annotation/FileExport.js';
import * as FileImport from './annotation/FileImport.js';
import * as Load from './annotation/Load.js';
import * as ServerIO from './annotation/ServerIO.js';
import * as Alerts from './core/Alerts.js';
import { VideoCache } from './video/VideoCache.js';
import { HoverControl } from './video/HoverControl.js';
import {
  getVideoInfo,
  setVideoInfoObject,
} from './video/VideoInfo.js';
import { ChronoAxes } from './chrono/ChronoAxes.js';
import * as ChronoDragControl from './chrono/ChronoDragControl.js';
import { chronoState } from './chrono/ChronoState.js';
import {
  gotoEvent,
  onAxesClick,
  onAxesDblClick,
  onAxesChanged,
  onAxesMoved,
  updateEventSeekMode,
  eventSeekModeClicked,
  gotoFirstEvent,
  gotoLastEvent,
  gotoNextEvent,
  gotoPreviousEvent,
  onClickNextID,
  onClickPrevID,
  onAutoEventButtonClick,
} from './chrono/ChronoControlInteraction.js';
import {
  Chronogram,
} from './chrono/Chrono.js';
import {
  onToggleButton_showPartsOnChrono,
  onToggleButton_showIndividualEvents,
  onToggleButton_showSpans,
  onChronoParametersChanged,
  onMousewheelModeToggled,
  setRestrictID,
  restrictIDFromSelection,
  restrictIDFromWindow,
  click_restrictID,
  onRestrictIDChanged,
  click_excludeID,
  onExcludeIDChanged,
  click_hideInvalid,
  click_hideFlowers,
  chronoAdjust,
  scaleTimeDomain,
  shiftTimeDomain,
} from './chrono/ChronoControls.js';
import {
  refreshChronoLayout,
  adjustChronogramHeight,
  validAllTagIdsDomain,
  validVisibleTagIdsDomain,
  updateChronoXDomainFromVideo,
  updateTimeMark,
  updatePreviewTimeMark,
  updateChronoSelection,
  updateTrackWindowSpan,
  getWindow,
  refreshChronogram,
  drawChrono,
  updateChrono,
  renderObsTable,
} from './chrono/ChronoRender.js';
import {
  updateChronoData,
  updateTagIntervals,
  augmentTrackWithTag,
  computeMotionDirection,
  cleanObsoleteEvents,
  cleanObsoleteEventsCB,
} from './chrono/ChronoData.js';

// Installs the given functions on window under their own names, for the classic scripts and the inline handlers of the page.
// Nothing is implicit: each call site lists the names it installs (`installGlobals({ f, g })`).
function installGlobals(fns) {
  for (const name of Object.keys(fns)) window[name] = fns[name];
}

// ---- legacy globals still read by classic scripts ------------------------------------------------------------------
window.logging = logging; // debug-level flags (`logging.io = true` from the console), same object the modules use
window.refreshLog = refreshLog; // read from the console and the tests; filled by core/RefreshInstrumentBridge.js

window.Labels = Labels; // the namespace, for the classic scripts: Labels.bool_acts(obs), ...
window.toLabelArray = Labels.toArray;
window.toLabelString = Labels.toString;
window.cleanLabels = Labels.clean;
window.containsLabel = Labels.contains;
window.getLabels = (obs) => Labels.toArray(obs.labels);
// The legacy hasLabel wrote `labels = ""` on an observation that had none; it writes nothing now that the
// label editors write through `events.update` (ADR 0008 step 5). updateObsLabel is gone.
window.hasLabel = Labels.has;

window.WrongId = WrongId;
window.CsvSchemas = CsvSchemas; // used by the "from /data" loader dialog (AnnotationIO.js, labelBee.js)
window.EventTree = EventTree; // used by updateEventTree (SelectionControl.js)

// Observation class and legacy accessors of the stored events (annotation/Model.js, moved from the classic Model.js);
// read by the classic scripts at call time, never while the page parses.
installGlobals({
  Observation, deepcopy, hasParts, getValidIDsForFrame, getValidIDsForFrames, obsDoesExist, getObsHandle,
  changeObservationID, getFramesWithID, getFramesWithSwapID, obs_swapID, printTracks, cacheTags, getTags,
  getIdsInFocus,
});
// The modules of the annotation IO export what they define; only the names a classic script, a template handler or a browser
// test still calls are installed as globals (a misspelled name throws). The list shrinks as the callers move.
function install(module, names) {
  for (const name of names) {
    if (!(name in module)) throw new Error("labelbeeBridge: '" + name + "' is not exported");
    window[name] = module[name];
  }
}
install(FileExport, [
  "saveEventsToFile", "saveEventsToCSV", "saveEventsToBBoxes", "saveTagsToFile", // template buttons
  "saveObjToJsonFile", "saveCSVToFile", "getTimestampNow", // VideoList.js
]);
install(Load, [
  "loadTracks", "loadTags", // labelBee.js, AnnotationIO.js (eraseEvents, eraseTags), tests
]);
install(FileImport, [
  "loadEventsFromFile", "loadTagsFromFile", // AnnotationIO.js: the file inputs
]);
install(ServerIO, [
  "loadCSVFromServer", "eventsFromServer", "tagsFromServer", // AnnotationIO.js, VideoControl.js, tests
  "loadEventsFromServerByID", // labelBee.js
  "typesetAjaxError", "showAjaxError", // labelBee.js, ZoomView.js, AnnotationIO.js
  "eventsToServer", // template button
]);
install(Alerts, ["mainAlert"]); // test_alerts.py
// annotation/EditActions.js
installGlobals({
  deleteEvent, submitDraft, storeUnit,
});
window.htmlCheckmark = htmlCheckmark; // core/Utils.js
window.url_for = url_for;

// Video data (video/*.js, moved from VideoControl.js, HoverControl.js and VideoList.js). `VideoControl` builds the cache and
// the hover control in its constructor (`init()` time); the classic scripts get and set the video metadata through
// `getVideoInfo()` and `setVideoInfoObject()`.
window.VideoCache = VideoCache;
window.HoverControl = HoverControl;
installGlobals({
  getVideoInfo, setVideoInfoObject,
});

// The chronogram axes (chrono/ChronoAxes.js); `initChrono` (Chrono.js) creates them with `new ChronoAxes(...)`.
window.ChronoAxes = ChronoAxes;

// The drag modes of the chronogram (chrono/ChronoDragControl.js): `ChronoDragControl.DragControl`, `.PanMode`, ... read by the tests.
window.ChronoDragControl = ChronoDragControl;

// The state shared by the chronogram files (chrono/ChronoState.js), read by the classic scripts as `chronoState.X`.
window.chronoState = chronoState;

// Navigation and seek of the chronogram (chrono/ChronoControlInteraction.js), the 14 names other files use.
// Read by other files (VisitControl.js, OverlayControl.js, Chrono.js: initChrono and the preview of a frame)
installGlobals({
  gotoEvent, onAxesClick, onAxesDblClick, onAxesChanged, onAxesMoved, updateEventSeekMode,
});
// Inline handlers of labelbee_page.html (navigation and seek buttons)
installGlobals({
  eventSeekModeClicked, gotoFirstEvent, gotoLastEvent, gotoNextEvent, gotoPreviousEvent, onClickNextID,
  onClickPrevID, onAutoEventButtonClick,
});

// The chronogram view (chrono/Chrono.js and the modules split from it, ADR 0015 step 8d), the 38 names other files use. The singletons `chrono`, `chronoDragControl`,
// `videoKeyframes` and `videoCacheStatus` are created on window by the module itself (labelBee.js also assigns `chrono`).
// Class and layout, used by labelBee.js, ChronoLayout.js, FitControls.js, OverlayControl.js
installGlobals({
  Chronogram, refreshChronoLayout, adjustChronogramHeight,
});
// Refresh entry points, wrapped by core/RefreshInstrumentBridge.js (`instrument`)
installGlobals({
  refreshChronogram, updateChronoData, drawChrono, updateChrono, renderObsTable, updateTimeMark,
  updatePreviewTimeMark, updateTrackWindowSpan, updateChronoSelection, updateChronoXDomainFromVideo,
  updateTagIntervals,
});
// Read by other files
installGlobals({
  setRestrictID, validAllTagIdsDomain, validVisibleTagIdsDomain, getWindow, augmentTrackWithTag,
  computeMotionDirection, cleanObsoleteEvents,
});
// Inline handlers of labelbee_page.html (chronogram toggles, filters, axes)
installGlobals({
  onToggleButton_showPartsOnChrono, onToggleButton_showIndividualEvents, onToggleButton_showSpans,
  onChronoParametersChanged, onMousewheelModeToggled, restrictIDFromSelection, restrictIDFromWindow,
  click_restrictID, onRestrictIDChanged, click_excludeID, onExcludeIDChanged, click_hideInvalid, click_hideFlowers,
  chronoAdjust, scaleTimeDomain, shiftTimeDomain, cleanObsoleteEventsCB,
});
