/*
 * chronoState: the data derived for the chronogram (refactor slice 8 step 7c, ADR 0015). Before, these were globals of
 * ChronoControl.js (declared with `var` or assigned without declaration) read by ChronoControlInteraction.js and a few
 * other scripts. Rebuilt by `refreshChronogram` / `updateFlatTracks`; `flatTracksAll` was `flatTracksAll` before.
 * Options live in `chrono.config`, the d3 elements in `chrono.axes` and `chrono.layers`, not here.
 * Installed as `window.chronoState` by labelbeeBridge.js while the chrono files are classic scripts.
 */
export const chronoState = {
  chronogramData: [],
  tagsChronogramData: [],
  allIntervals: [],
  flatTracks: [],
  flatTracksAll: [],
  flatTracksValid: [],
  flatTracksAllGroupById: {},
  flatTracksValidGroupById: {},
  tagIntervals: [],
  allTagsID: [],
  flatTags: [],
  ttags: {},
};
