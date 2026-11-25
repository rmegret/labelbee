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
 * Labels, WrongId (folded), CsvSchemas, EventTree (folded). The four imported bridges hold wiring
 * logic, are imported by the golden tests (`AnnotationStoreBridge.js`), or are named by the stack filter of
 * `core/Notifier.js` (`RefreshInstrumentBridge.js`); each is folded here when its last classic reader moves.
 */
import { logging, refreshLog } from './core/Notifier.js';
import './core/RefreshInstrumentBridge.js'; // wraps the classic refresh functions (`refreshInstrumented`, exported)
import './annotation/AnnotationStoreBridge.js'; // window.AnnotationStore, window.events, window.installDebugGlobals
import { registerDebugGlobal } from './annotation/DebugGlobals.js';
import './annotation/RefreshBridge.js'; // window.refresh (needs window.events)
import './annotation/SelectionModelBridge.js'; // window.selection (needs window.events)
import * as Labels from './annotation/Labels.js';
import * as WrongId from './annotation/WrongId.js';
import * as CsvSchemas from './codecs/CsvSchemas.js';
import * as EventTree from './form/EventTree.js';
import {
  Observation,
  deepcopy,
  getValidIDsForFrame,
  obsDoesExist,
  getObsHandle,
  changeObservationID,
  getFramesWithID,
  obs_swapID,
  getTags,
} from './annotation/Model.js';
import { url_for } from './core/Utils.js';
import {
  deleteEvent,
} from './commands/EditActions.js';
import * as SaveToFile from './commands/SaveToFile.js';
import * as Load from './commands/Load.js';
import * as LoadFromServer from './commands/LoadFromServer.js';
import * as SaveToServer from './commands/SaveToServer.js';
import { VideoControl } from './video/VideoControl.js';
import { VisitWidget } from './form/VisitControl.js';
import { TimelinePicker } from './overlay/TimelinePicker.js';
import { OverlayOptions } from './overlay/OverlayOptions.js';
import {
  OverlayControl,
} from './overlay/Overlay.js';
import { initTouchResize } from './layout/TouchResize.js';
import { initNavMenu } from './layout/NavMenu.js';
import { initSplitLayout } from './layout/SplitLayout.js';
import { initChronoLayout } from './layout/ChronoLayout.js';
import { initFitControls } from './layout/FitControls.js';
import { initVideoSettings } from './layout/VideoSettings.js';
import { initPanelRows } from './layout/PanelRows.js';
import {
  init, printMessage, toggleFullScreen, onKeyDown_IDEdit, onKeyDown_NewIDEdit,
} from './labelBee.js';
import { newRectForCurrentTag } from './overlay/Mouse.js';
import { identifyBeeRect, tagAngle } from './overlay/Drawing.js';
import {
  onSelectIDChanged,
  updateEventTree,
  updateForm,
  onLabelToggled,
  updateAnnotationStatistics, onClickResetAngle, onClickAngleFromTag,
} from './form/Form.js';
import {
  swapID_callback,
  deselectBee,
  getCurrentTag,
  deleteSelected,
  undoAction,
  modifyCurrentObsSpan,
} from './SelectionControl.js';
import {
  eventSeekModeClicked,
  gotoFirstEvent,
  gotoLastEvent,
  gotoNextEvent,
  gotoPreviousEvent,
  onClickNextID,
  onClickPrevID,
  onAutoEventButtonClick,
  onTrackWindowChanged,
  setTrackWindow,
  scaleTrackWindow,
  shiftTrackWindow,
  onClickFocusVideo,
  onClickFocusTrackWindow,
  onClickROI,
  updateROIFromVideo,
  onROITextChanged,
  onClickExcludeRects,
  onClickExcludeRectAdd,
  onClickExcludeRectDelete,
  onClickExcludeRectNext,
  onClickExcludeRectParams,
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
  adjustChronogramHeight,
  updateTimeMark,
  updateTrackWindowSpan,
  refreshChronogram,
  updateChrono,
  getWindow,
} from './chrono/ChronoRender.js';
import {
  updateChronoData,
  updateTagIntervals,
  cleanObsoleteEventsCB,
  refreshTagsParameters,
  onTagsParametersChanged,
  chronoFilter,
} from './chrono/ChronoData.js';

// Installs the given functions on window under their own names, for the classic scripts and the inline handlers of the page.
// Nothing is implicit: each call site lists the names it installs (`installGlobals({ f, g })`).
function installGlobals(fns) {
  for (const name of Object.keys(fns)) window[name] = fns[name];
}

// ---- legacy globals still read by classic scripts ------------------------------------------------------------------
window.logging = logging; // debug-level flags (`logging.io = true` from the console), same object the modules use
window.refreshLog = refreshLog; // read from the console and the tests; filled by core/RefreshInstrumentBridge.js

window.getLabels = (obs) => Labels.toArray(obs.labels);

window.WrongId = WrongId;
window.CsvSchemas = CsvSchemas; // used by the "from /data" loader dialog (dialogs/EventsCSVManualFilePicker.js, labelBee.js)
window.EventTree = EventTree; // used by updateEventTree (SelectionControl.js)

// Observation class and legacy accessors of the stored events (annotation/Model.js, moved from the classic Model.js);
// read by the classic scripts at call time, never while the page parses.
installGlobals({
  Observation, deepcopy, getValidIDsForFrame, obsDoesExist, getObsHandle,
  changeObservationID, getFramesWithID, obs_swapID, getTags,
});
// The modules of the annotation IO export what they define; only the names a classic script, a template handler or a browser
// test still calls are installed as globals (a misspelled name throws). The list shrinks as the callers move.
function install(module, names) {
  for (const name of names) {
    if (!(name in module)) throw new Error("labelbeeBridge: '" + name + "' is not exported");
    window[name] = module[name];
  }
}
install(SaveToFile, [
  "saveEventsToFile", "saveEventsToCSV", "saveEventsToBBoxes", "saveTagsToFile", // template buttons
]);
install(Load, [
  "eraseEvents", "eraseTags", // template buttons
]);
install(LoadFromServer, [
  "tagsFromServer", // dialogs/, VideoControl.js
  "clickLoadTracksCSVFromServer", "clickLoadTracksTaggedCSVFromServer", // template buttons
  "loadEventsFromServerByID", // labelBee.js
]);
install(SaveToServer, ["eventsToServer"]); // template button
// commands/EditActions.js
installGlobals({
  deleteEvent,
});
window.url_for = url_for;

// Video (video/*.js). `VideoControl` imports and builds the cache (`videoControl.videoCache`) and the hover control; the classic
// scripts get no global for the video metadata: `getVideoInfo()` of video/VideoInfo.js is imported.
window.VideoControl = VideoControl; // built by `init()` of labelBee.js (`videoControl = new VideoControl("video")`)
window.VisitWidget = VisitWidget; // built by `OverlayControl` (`overlay.visitWidget = new VisitWidget(overlay)`)
window.TimelinePicker = TimelinePicker; // built by `OverlayControl` (`overlay.modes['pick-frame'] = new TimelinePicker(overlay)`)
window.OverlayOptions = OverlayOptions; // built by `OverlayControl` (`overlay.opts = new OverlayOptions(overlay)`)

// The overlay (overlay/Overlay.js): `OverlayControl` is built by `init()` of labelBee.js; the functions are called by ZoomView.js,
// Form.js, SelectionControl.js, TimelinePicker.js, ChronoControlInteraction.js and the page.
window.OverlayControl = OverlayControl;
installGlobals({
  identifyBeeRect, newRectForCurrentTag,
});

// The page layout (layout/): patches and widgets that only touch the DOM, started once (they were classic scripts whose own
// `$(function)` did the same). `initTouchResize` patches jQuery UI before any `.resizable()` (made by `init()` on window.onload).
initTouchResize();
initPanelRows();
$(function () {
  initNavMenu();
  initSplitLayout();
  initChronoLayout();
  initFitControls();
  initVideoSettings();
});

// The entry (labelBee.js): `init` is called by `window.onload` of the page, `printMessage` by many modules
// and by dialogs/, the others by inline handlers.
installGlobals({
  init, printMessage, toggleFullScreen, onKeyDown_IDEdit, onKeyDown_NewIDEdit,
});

// The form and the selection (Form.js, SelectionControl.js, from the former SelectionControl.js): called by the classic scripts, the
// inline handlers of the page and the tests. The entry points of the refresh are already wrapped by `instrument` in their module.
installGlobals({
  onSelectIDChanged, updateForm,
  onLabelToggled, updateAnnotationStatistics,
  onClickResetAngle, onClickAngleFromTag,
});
installGlobals({
  swapID_callback, deleteSelected, undoAction,
  modifyCurrentObsSpan,
});

// Inline handlers of labelbee_page.html (navigation and seek buttons)
installGlobals({
  eventSeekModeClicked, gotoFirstEvent, gotoLastEvent, gotoNextEvent, gotoPreviousEvent, onClickNextID,
  onClickPrevID, onAutoEventButtonClick,
  onTrackWindowChanged, setTrackWindow, scaleTrackWindow, shiftTrackWindow, onClickFocusVideo, onClickFocusTrackWindow,
  onClickROI, updateROIFromVideo, onROITextChanged, onClickExcludeRects, onClickExcludeRectAdd,
  onClickExcludeRectDelete, onClickExcludeRectNext, onClickExcludeRectParams,
});

// The chronogram view (chrono/Chrono.js and the modules split from it, ADR 0015 step 8d), the 38 names other files use. The singletons `chrono`, `chronoDragControl`,
// `videoKeyframes` and `videoCacheStatus` are created on window by the module itself (labelBee.js also assigns `chrono`).
// Class and layout, used by labelBee.js, ChronoLayout.js, FitControls.js, OverlayControl.js
installGlobals({
  Chronogram, adjustChronogramHeight,
});
// Refresh entry points, wrapped by core/RefreshInstrumentBridge.js (`instrument`)
installGlobals({
  refreshChronogram, updateChronoData, updateChrono, updateTimeMark,
  updateTrackWindowSpan,
  updateTagIntervals,
});
// Read by other files
installGlobals({
  getWindow,
});
// Inline handlers of labelbee_page.html (chronogram toggles, filters, axes)
installGlobals({
  onToggleButton_showPartsOnChrono, onToggleButton_showIndividualEvents, onToggleButton_showSpans,
  onChronoParametersChanged, onMousewheelModeToggled, restrictIDFromSelection, restrictIDFromWindow,
  click_restrictID, onRestrictIDChanged, click_excludeID, onExcludeIDChanged, click_hideInvalid, click_hideFlowers,
  chronoAdjust, scaleTimeDomain, shiftTimeDomain, cleanObsoleteEventsCB,
  refreshTagsParameters, onTagsParametersChanged, chronoFilter,
});

// Console only (`installDebugGlobals()` or `?debug_globals`): the cache of the video, `videoControl.videoCache`
registerDebugGlobal("videoCache", () => window.videoControl.videoCache, "videoControl.videoCache");
