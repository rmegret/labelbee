/*jshint esversion: 6, asi: true */
// Data of the chronogram (ES module, refactor slice 8 step 8d): from the stored events to `chronoState` (flat tracks, tag
// intervals, ...), the motion direction and the removal of obsolete events. Part of the former ChronoControl.js (now Chrono.js).
// It reads `chronoState`, `chrono.config` and the page globals at call time.

import { instrument } from "../core/RefreshInstrumentBridge.js"

// Where the tags come from: 'Tracks' (the tag stored in each observation, the only mode the page uses) or 'Tags' (the raw tags of
// the video, legacy, reachable from the console). A page global read at call time by this module, `ChronoRender.js` and `getTag`
// (`SelectionControl.js`), and set from the console.
window.tagMode = 'Tracks';

// ### CHRONO DATA PREPARATION TRACKS
var __section__chronogram_data_preparation_tracks

// Top-level
// updateChronoData   : top-level, do all updates
// Calling:
// augmentTrackWithTag: Tracks, Tags    => mutated Tracks
// updateFlatTracks   : Tracks          => flatTracks and its variants
// createIntervalList : chronogramData  => allIntervals
// getFlatTags        : Tags            => flatTags    (used in refreshChronogram)
// getTTags           : flatTags        => ttags       (used in refreshChronogram)
// updateTagIntervals : ttags           => tagIntervals, allTagsID

/* Top-level update all chrono data. Do not render */
export function updateChronoData() {

  console.log('updateChronoData')

  const start = performance.now();
  //console.time('refreshChronogram');
  $('#chronoStatusBar').html('Preparing chrono data...')

  // PREPARE TRACKS DATA
  // (no augmentTrackWithTag() here: a refresh must not write the store, ADR 0009 Q34)

  chronoState.chronogramData.length = 0;
  if (chrono.config.chronoDisplay.showObsChrono) {
    // Tracks => chronogramData
    // chronogramData[flatk].x, .y, .Activity, .labels, .pollen, .tag, .obs
    updateChronogramData()

    // chronogramData => allIntervals, ...
    createIntervalList()
  }

  // Tracks => flatTracks...
  updateFlatTracks();

  // PREPARE TAGS DATA

  chronoState.flatTags = getFlatTags(false); // noFilter

  chronoState.ttags = getTTags(); // reverse index ttags[id][frame]

  chronoState.allTagsID = [...chronoState.allTagsID];

  if (logging.chrono)
    console.log("updateChronoData: convert tags to intervals...");
  
  chronoState.tagIntervals = [];
  if (chrono.config.chronoDisplay.showTagsChrono) {
    updateTagIntervals()
  }

  // Augment tags with tracks labels
  // Also generate virtual tag intervals for wrongid annotations
  updateTagsLabels();

  // Filter tagIntervals
  if (chrono.config.filter.flag_hideInvalid) {
    chronoState.tagIntervals = chronoState.tagIntervals.filter(
      (interval) => !(interval.labeling.falsealarm || interval.labeling.wrongid)
    );
  }

  //console.timeEnd('refreshChronogram');
  const end = performance.now();
  chrono.perf.chronoUpdate = end-start

  //$('chronoStatusBar').html(`Chrono updateChronoData took ${chrono.perf.chronoUpdate} ms`)
}

/* Augment Tracks with tag id if same (frame,id) exist for both.
   LEGACY (DEBT-826), one-shot, console only: no longer called by the refresh (ADR 0009 Q34); the tags are expected in the events at load time. */
export function augmentTrackWithTag() {
  for (let F of events.frames()) {
    if (AnnotationStore.getTags()[F] != undefined) {
      for (var i = 0; i < AnnotationStore.getTags()[F].tags.length; i++) {
        let id = String(AnnotationStore.getTags()[F].tags[i].id);
        if (events.has(F, id)) {
          events.update(F, id, { tag: AnnotationStore.getTags()[F].tags[i] });
        }
      }
    }
  }
}

/* Tracks => flatTracks, flatTracksAll, flatTracksValid, flatTracksAllGroupById, flatTracksValidGroupById */
export function updateFlatTracks() {
  // All obs sorted by frame,id
  chronoState.flatTracksAll = [];
  for (const [obs, F, id] of events.observations()) {

    // TODO: filter in only one place instead of both updateObsTable and refreshChronogram
    if (chrono.config.filter.frameFilter.active) {
      if ((F < chrono.config.filter.frameFilter.frameMin) || (F > chrono.config.filter.frameFilter.frameMax)) continue // Just skip out of active zone
    }

    if (chrono.config.filter.flag_restrictID) {
      if ($.inArray(String(id), chrono.config.filter.restrictIDArray) < 0) continue;
    }
    if (chrono.config.filter.flag_excludeID) {
      if ($.inArray(String(id), chrono.config.filter.excludeIDArray) >= 0) continue;
    }

    // XX Define y
    let y = chrono.config.idMap.idAxisMap(id)
    let chronoObs = { frame: F, id: id, y: y, labels: obs.labels, obs: obs };

    chronoState.flatTracksAll.push(chronoObs);
  }
  chronoState.flatTracksValid = chronoState.flatTracksAll.filter(function (d) {
    return (
      !containsLabel(d.labels, "falsealarm") &&
      !containsLabel(d.labels, "wrongid")
    );
  });
  var groupBy = function (array, key) {
    return array.reduce(function (groups, x) {
      // Appends x to groups[x[key]]
      (groups[x[key]] = groups[x[key]] || []).push(x);
      return groups;
    }, {});
  }; // Keep order of frames
  chronoState.flatTracksAllGroupById = groupBy(chronoState.flatTracksAll, "id");
  chronoState.flatTracksValidGroupById = groupBy(chronoState.flatTracksValid, "id");

  if (chrono.config.filter.flag_hideInvalid) {
    chronoState.flatTracks = chronoState.flatTracksValid;
  } else {
    chronoState.flatTracks = chronoState.flatTracksAll;
  }
}


/* Tracks => chronogramData */
function updateChronogramData() {
  chronoState.chronogramData.length = 0;

  for (const [obs, F, id] of events.observations()) {   // a generator: the loop body uses continue

      if (chrono.config.filter.frameFilter.active) {
        if ((F < chrono.config.filter.frameFilter.frameMin) || (F > chrono.config.filter.frameFilter.frameMax)) continue // Just skip out of active zone
      }

        const id_eff = String(Number(id)%50)

        let labelArray = (obs.labels || '').split(",")

        if (chrono.config.filter.flag_restrictID) {
          if ($.inArray(String(id), chrono.config.filter.restrictIDArray) < 0) continue;
        }
        if (chrono.config.filter.flag_excludeID) {
          if ($.inArray(String(id), chrono.config.filter.excludeIDArray) >= 0) continue;
        }
        if (chrono.config.filter.flag_hideInvalid) {
          if (hasLabel(obs, "falsealarm") || hasLabel(obs, "wrongid")) continue;
        }
        if (chrono.config.filter.flag_hideFlowers) {
            if (String(id).startsWith('F')) continue;
        }
        let inROI = true

        // Assume cx, cy already correct
        //events.update(F, id, { cx: obs.x + obs.width/2, cy: obs.y + obs.height/2 })
        events.checkValid(F, id)

        //if (chrono.config.region.useROI) {  // TODO; Check x vs cx
            inROI = (obs.cx >= chrono.config.region.ROI.left &&
              obs.cx <= chrono.config.region.ROI.right &&
              obs.cy >= chrono.config.region.ROI.top &&
              obs.cy <= chrono.config.region.ROI.bottom
            );
        //};

        let b = Labels.bool_acts(obs);
        let b0 = b[0];
        let b1 = b[1];
        let b2 = b[2];
        let b3 = b[3];
        //                 let b0 = hasLabel(obs,'fanning')
        //                 let b1 = hasLabel(obs,'pollen')
        //                 let b2 = hasLabel(obs,'entering')
        //                 let b3 = hasLabel(obs,'leaving')

        // XXX Define y
        let y = chrono.config.idMap.idAxisMap(id)
        if (!b0 && !b2 && !b3) {
          chronoState.chronogramData.push({
            x: F,
            y: y, 
            id: id,
            Activity: "",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
        if (b2) {
          chronoState.chronogramData.push({
            x: F,
            y: y,
            id: id,
            Activity: "entering",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
        if (b3) {
          chronoState.chronogramData.push({
            x: F,
            y: y,
            id: id,
            Activity: "leaving",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
        if (b0) {
          chronoState.chronogramData.push({
            x: F,
            y: y,
            id: id,
            Activity: "fanning",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
      }
}

// chronogramData => allIntervals  
// // New version is simplified: has only one interval by sequential track. not separated by activity type
function createIntervalList() {
  //initiliaze allIntervals to update data
  let tempCoordinates = {};

  for (var i = 0; i < chronoState.chronogramData.length; i++) {
    if (chronoState.chronogramData[i].id in tempCoordinates) {
      //Make sure y coordinate is not in tempCoordiantes
      tempCoordinates[chronoState.chronogramData[i].id].push(i);
    } else {
      //Create new beeId key with it's x coordiantes as value
      tempCoordinates[chronoState.chronogramData[i].id] = [];
      tempCoordinates[chronoState.chronogramData[i].id].push(i);
    }
  }
  //initiliaze allIntervals to update data
  chronoState.allIntervals = [];
  for (var id in tempCoordinates) {
    let xValues = [];

    let iArray = tempCoordinates[id];

    // iArray = iArray.filter(function (i) {
    //   return chronogramData[i].Activity == a;
    // });

    if (iArray.length == 0) {
      continue;
    }

    let passThroughROI=false
    for (let j = 0; j < iArray.length; j++) {
      xValues[j] = Number(chronoState.chronogramData[iArray[j]].x);
    }

    let iData = chronoState.chronogramData[iArray[0]];
    let tempInterval = {
      x1: xValues[0],
      x2: xValues[0],
      y: iData.y,  // XXX Reuse y
      id: id,
      Activity: "",
      labels: iData.labels,
      haslabel: {},
      pollen: iData.pollen,
      tag: iData.tag,
      obs: iData.obs,
      passThroughROI: iData.inROI,
      startInsideROI: iData.inROI,
      endInsideROI: iData.inROI
    };
    if (iData.labels != "")
      for (let label of iData.labels.split(",")) {
        tempInterval.haslabel[label] = true
      }

    // let tempInterval = { x1: xValues[0], x2: xValues[0], y: y,
    //     Activity: iData.Activity, pollen: iData.pollen, issue: "" };

    for (var i = 1; i < xValues.length; i++) {
      let iData = chronoState.chronogramData[iArray[i]];
      // console.log("Act temp interval IN: ", tempInterval[i].Activity);
      if (xValues[i] - xValues[i - 1] == 1) {
        tempInterval.x2 = xValues[i]; //Extend the existing interval
        tempInterval.pollen |= iData.pollen;
        tempInterval.passThroughROI |= iData.inROI
        tempInterval.endInsideROI = iData.inROI
        
        if (iData.labels != "")
          for (let label of iData.labels.split(",")) {
            tempInterval.haslabel[label] = true
        }
      } else {
        chronoState.allIntervals.push(tempInterval);
        tempInterval = {
          x1: xValues[i],
          x2: xValues[i],
          y: iData.y,  // XXX Reuse y
          id: id,
          Activity: iData.Activity,
          labels: iData.labels,
          haslabel: {},
          pollen: iData.pollen,
          tag: iData.tag,
          obs: iData.obs,
          passThroughROI: iData.inROI,
          startInsideROI: iData.inROI,
          endInsideROI: iData.inROI
        }; // New interval
        
        if (iData.labels != "")
          for (let label of iData.labels.split(",")) {
            tempInterval.haslabel[label] = true
        }
      }
    }
    tempInterval.labels = Object.keys(tempInterval.haslabel).join(',')
    chronoState.allIntervals.push(tempInterval);
  }

  // Filter out
  if (chrono.config.region.useROI)
    chronoState.allIntervals = chronoState.allIntervals.filter( interval => interval.passThroughROI )

  // Pass extra data from chronogramData to allInterval
  for (let interval of chronoState.allIntervals) {
    var tempArray = interval.labels.split(",");
    if (tempArray.includes("wrongid")) {
      interval.wrongid = true;
      interval.newid = interval.obs.newid;
    }
  }

}




/* Tags => flatTags */
/* flatTags[k] is tag, with fields id, ... */
function getFlatTags(useFilter) {
  let flatTags = [];

  if (tagMode == 'Tracks') {
    // Asume we already have flatTracks
    for (let chronoObs of chronoState.flatTracksAll) {
      if (chronoObs.obs.tag) {
        flatTags.push(chronoObs.obs.tag);
      }
    }
  } else { // Legacy
    for (let F in AnnotationStore.getTags()) {
      let tags = AnnotationStore.getTags()[F].tags;
      for (let i in tags) {
        let id = tags[i].id;

        if (useFilter) {
          if (chrono.config.filter.flag_restrictID) {
            if ($.inArray(String(id), chrono.config.filter.restrictIDArray) < 0) continue;
          }
          if (chrono.config.filter.flag_excludeID) {
            if ($.inArray(String(id), chrono.config.filter.excludeIDArray) >= 0) continue;
          }
        }

        flatTags.push(tags[i]);
      }
    }
  }
  return flatTags;
}

/* Tags => allTagsID, ttags */
/* ttags[id][frame] is tag */
function getTTags() {
  chronoState.allTagsID = new Set();

  /* Transpose Tags data structure */
  let ttags = {};
  if (tagMode == 'Tracks') {
    // Asume we already have flatTags
    for (let tag of chronoState.flatTags) {
      let id = String(tag.id);
      let F = tag.frame;
      chronoState.allTagsID.add(id);
      // Assume restrictID and excludeId already applied before flatTags
      if (typeof ttags[id] === "undefined") ttags[id] = {};
      ttags[id][String(F)] = tag;
    }
  } else { // Legacy
    for (let F in AnnotationStore.getTags()) {
      let tags = AnnotationStore.getTags()[F].tags;
      for (let i in tags) {
        let id = String(tags[i].id);

        chronoState.allTagsID.add(id);

        if (chrono.config.filter.flag_restrictID) {
          if ($.inArray(String(id), chrono.config.filter.restrictIDArray) < 0) continue;
        }
        if (chrono.config.filter.flag_excludeID) {
          if ($.inArray(String(id), chrono.config.filter.excludeIDArray) >= 0) continue;
        }

        if (typeof ttags[id] === "undefined") ttags[id] = {};
        ttags[id][String(F)] = tags[i];
      }
    }
  }

  return ttags;
}


/* ttags => tagIntervals */
export function updateTagIntervals() {
  // ttags => tagIntervals
  chronoState.tagIntervals = [];

  /* Convert to intervals */
  for (let id in chronoState.ttags) {
    let obsarray = chronoState.ttags[id];
    let activeInterval = [];
    let isActive = false;
    for (let frame in obsarray) {
      let tags = obsarray[frame];
      let f = Number(frame);

      if (!filters.sample(tags)) {
        continue;
      }

      if (isActive) {
        let doPush = false;
        if (activeInterval.end == f - 1) {
          // Extend active interval
          activeInterval["end"] = f;

          if (tags.hamming < 1000) {
            activeInterval.hammingavg =
              activeInterval.hammingavg + tags.hamming;
            activeInterval.dmavg = activeInterval.dmavg + tags.dm;
          } else {
            activeInterval.hammingavg = activeInterval.hammingavg + 0;
          }
        } else {
          // Do not extend active interval
          doPush = true;
        }
        if (doPush) {
          // Close previous
          //activeInterval['end']++
          if (filters.interval(activeInterval)) {
            let len = activeInterval["end"] - activeInterval["begin"] + 1;
            activeInterval.hammingavg = activeInterval.hammingavg / len;
            activeInterval.dmavg = activeInterval.dmavg / len;
            chronoState.tagIntervals.push(activeInterval);
          }
          // XXX Define y
          let y = chrono.config.idMap.idAxisMap(id)
          // Open new one
          activeInterval = {
            id: id,
            y: y,
            begin: f,
            end: f,
            hammingavg: tags.hamming,
            dmavg: tags.dm,
            labeling: {},
          };
        }
      } else {
        // XXX Define y
        let y = chrono.config.idMap.idAxisMap(id)
        // Open new one
        activeInterval = {
          id: id,
          y: y,
          begin: f,
          end: f,
          hammingavg: tags.hamming,
          dmavg: tags.dm,
          labeling: {},
        };
        isActive = true;
      }
    }
    // Close if active
    if (isActive)
      if (filters.interval(activeInterval)) {
        //activeInterval['end']++
        let len = activeInterval["end"] - activeInterval["begin"] + 1;
        activeInterval.hammingavg = activeInterval.hammingavg / len;
        activeInterval.dmavg = activeInterval.dmavg / len;
        chronoState.tagIntervals.push(activeInterval);
      }
  }
}

/* augment tagIntervals with labels from Tracks with same (frame,id) */
/* flatTracksAll, tagIntervals => tagIntervals
   also mark track obs on overlapping span as redundant */
function updateTagsLabels() {
  for (let ann of chronoState.flatTracksAll) {
    if ("span" in ann.obs) {
      ann.span = { f1: Number(ann.obs.span.f1), f2: Number(ann.obs.span.f2) };
      ann.span.b1 = "manual";
      ann.span.b2 = "manual";
    } else {
      let f = Number(ann.frame);
      ann.span = { f1: f, f2: f };
      ann.span.b1 = "obs";
      ann.span.b2 = "obs";
    }
  }
  let tagIntervalsVirtual = [];
  for (let interval of chronoState.tagIntervals) {
    interval.labeling = {
      labeled: false,
      entering: false,
      falsealarm: false,
      wrongid: false,
    };

    for (let ann of chronoState.flatTracksAll) {
      if (ann.id != interval.id) continue;

      let f = Number(ann.frame);
      let f1 = Number(interval["begin"]);
      let f2 = Number(interval["end"]);

      if (ann.span.b1 != "manual") {
        if (f > f1 - 20 && f < f2 + 20) {
          interval.labeling.labeled = true;
          interval.labeling.entering = hasLabel(ann, "entering");
          interval.labeling.falsealarm = hasLabel(ann, "falsealarm");
          interval.labeling.wrongid = hasLabel(ann, "wrongid");

          if (hasLabel(ann, "wrongid") && ann.obs.newid != null) {
            interval.newid = ann.obs.newid;
            //console.log('ann=',ann,'=>',interval)
          }

          if (f1 < ann.span.f1) {
            ann.span.f1 = f1;
            ann.span.b1 = "tag";
          }
          if (f2 > ann.span.f2) {
            ann.span.f2 = f2;
            ann.span.b2 = "tag";
          }
        }
      } else {
        if (ann.span.f2 >= f1 && ann.span.f1 <= f2) {
          interval.labeling.labeled = true;
          interval.labeling.entering = hasLabel(ann, "entering");
          interval.labeling.falsealarm = hasLabel(ann, "falsealarm");
          interval.labeling.wrongid = hasLabel(ann, "wrongid");

          if (hasLabel(ann, "wrongid") && ann.obs.newid != null) {
            interval.newid = ann.obs.newid;
            //console.log('ann=',ann,'=>',interval)
          }
        }
      }
    }
    if (interval.labeling.wrongid && interval.newid != null) {
      let intervalV = Object.assign({}, interval);
      intervalV.oldid = intervalV.id;
      intervalV.id = intervalV.newid;
      intervalV.wrongid = false;
      intervalV.virtual = true;
      //console.log(interval,'=>',intervalV)
      tagIntervalsVirtual.push(intervalV);
    }
  }
  chronoState.tagIntervals = chronoState.tagIntervals.concat(tagIntervalsVirtual);

  // Find redundant Tracks
  for (let id in chronoState.flatTracksValidGroupById) {
    let obs_for_id = chronoState.flatTracksValidGroupById[id];
    for (let j in obs_for_id) {
      if (j == 0) continue;
      let i = j - 1;

      let obs1 = obs_for_id[i];
      let obs2 = obs_for_id[j];

      if (obs1.span.f2 >= obs2.span.f1) {
        obs2.isredundant = true;
      }
    }
  }
}


function interpolateTags(maxgap) {
  chronoState.tagIntervals = [];

  function getAllTTags() {
    /* Transpose Tags data structure */
    let ttags = {};
    for (let F in AnnotationStore.getTags()) {
      let tags = AnnotationStore.getTags()[F].tags;
      for (let i in tags) {
        let id = String(tags[i].id);

        if (typeof ttags[id] === "undefined") ttags[id] = {};
        ttags[id][String(F)] = tags[i];
      }
    }
    return ttags;
  }

  let ttags = getAllTTags();

  function pushInterpolate(id, f1, f2) {
    let T1 = ttags[id][f1];
    let T2 = ttags[id][f2];
    let P1 = T1.p;

    for (let j = f1 + 1; j < f2; j++) {
      let a = (j - f1) / (f2 - f1);
      let cx = (1 - a) * T1.c[0] + a * T2.c[0];
      let cy = (1 - a) * T1.c[1] + a * T2.c[1];
      let dx = cx - T1.c[0];
      let dy = cy - T1.c[1];
      //cx = T1.c[0]
      //cy = T1.c[1]
      //dx = 0
      //dy = 0
      let pts = [
        [P1[0][0] + dx, P1[0][1] + dy],
        [P1[1][0] + dx, P1[1][1] + dy],
        [P1[2][0] + dx, P1[2][1] + dy],
        [P1[3][0] + dx, P1[3][1] + dy],
      ];
      if (AnnotationStore.getTags()[j] == null) {
        AnnotationStore.getTags()[j] = { tags: [] };
      }
      // XXX Define y
      let y = chrono.config.idMap.idAxisMap(id)
      AnnotationStore.getTags()[j].tags.push({
        id: id,
        y: y,
        c: [cx, cy],
        hamming: 1000,
        p: pts,
        frame: j,
      });
      console.log("interpolate id=" + id + " f=" + j);
    }
  }

  /* Convert to intervals */
  for (let id in ttags) {
    let obsarray = ttags[id];
    let activeInterval = [];
    let isActive = false;
    for (let f0 in obsarray) {
      let f = Number(f0);
      let tags = obsarray[f];

      if (!filters.sample(tags)) {
        continue;
      }

      if (isActive) {
        let doPush = false;
        if (activeInterval.end == f - 1) {
          activeInterval.end = f;
        } else if (f - activeInterval.end < maxgap) {
          // Try to interpolate

          pushInterpolate(id, activeInterval.end, f);

          activeInterval.end = f;
        } else {
          doPush = true;
        }
        if (doPush) {
          // Close previous
          //activeInterval['end']++
          //tagIntervals.push(activeInterval)
          // Open new one
          activeInterval = { id: id, begin: f, end: f };
        }
      } else {
        // Open new one
        activeInterval = { id: id, begin: f, end: f };
        isActive = true;
      }
    }
    // Close if active
    if (isActive) activeInterval["end"]++;
    //tagIntervals.push(activeInterval)
  }
}

export function computeMotionDirection() {
  cacheTags();
  for (var activeInterval of chronoState.tagIntervals) {
    let tags1 = getTags(activeInterval.begin, activeInterval.id);
    let tags2 = getTags(activeInterval.end, activeInterval.id);
    activeInterval.dir = undefined;
    if (tags1 == null || tags2 == null) continue;
    if (tags1.length == 1 && tags2.length == 1) {
      let tag1 = tags1[0];
      let tag2 = tags2[0];
      if (tag2.c[1] < tag1.c[1]) activeInterval.dir = "entering";
      else if (tag2.c[1] > tag1.c[1]) activeInterval.dir = "leaving";
    }
  }
  updateTagIntervals();
}

export function cleanObsoleteEventsCB() {
  var r = confirm(
    "CAUTION !!!! Operation cannot be undone. Please confirm: Delete all obsolete events, i.e. no associated tag or low DM or inside excludeRects. "
  );
  if (r == true) {
    console.log("cleanObsoleteEvents");
    cleanObsoleteEvents();
  } else {
    console.log("cleanObsoleteEvents canceled");
  }
}

export function cleanObsoleteEvents() {
  events.forEach(function (obs, F, id) {
    if (hasLabel(obs, "falsealarm") || hasLabel(obs, "wrongid")) {
      if (!obs.tag) {
        console.log("No tag: Delete Tracks[" + F + "][" + id + "] = ", obs);
        events.delete(F, id);
      } else {
        if (obs.tag.dm < 20) {
          console.log("low DM: Delete Tracks[" + F + "][" + id + "] = ", obs);
          events.delete(F, id);
        }
        if (!filters.excludeRects(obs.tag)) {
          console.log(
            "excludeRect: Delete Tracks[" + F + "][" + id + "] = ",
            obs
          );
          events.delete(F, id);
        }
      }
    }
  });
  refresh.rebuild();
}

/* Tag filters. Rebuilt by `refreshTagsParameters` from the inputs of the Tags panel and the buttons of `chronoFilter`; the chronogram
   data (`updateTagIntervals`) and the overlay (tag display) call `chrono.filters.sample` and `chrono.filters.interval`.
   `filters.roi` and `filters.excludeRects` are replaced by `ROIChanged` and `excludeRectsChanged` (OverlayControl.js).
   `filters` is created at module load, because the overlay constructor calls `refreshTagsParameters` before the chronogram exists;
   the Chronogram constructor publishes it as `chrono.filters`. */
let tagsRGBSampleFilter = function (tag) {
  return true;
};
let tagsDMSampleFilter = function (tag) {
  return true;
};
let tagsHammingSampleFilter = function (tag) {
  return true;
};
let tagsSampleFilterCustom = function (tag) {
  return true;
};
let tagsIDFilter = function (idinfo) {   // DEBT: built from #tagsIDFilter, read by nobody
  return true;
};
export const filters = {
  sample: function (tag) { return true; },          // all the tag filters below combined
  interval: function (interval) { return true; },   // length and custom code of an interval
  roi: function (tag) { return true; },
  excludeRects: function (tag) { return true; },
};
export function refreshTagsParameters() {
  if (logging.overlay) {
    console.log("refreshTagsParameters");
  }
  // Reread tag parameters from GUI

  tagsSampleFilterCustom = Function("tag", $("#tagsSampleFilter")[0].value);

  let minDM = Number($("#tagsMinDM").val());
  if (minDM > 0) {
    tagsDMSampleFilter = function (tag) {
      return !AnnotationStore.getTagsHaveDM() || tag.dm >= minDM;
    };
  } else {
    tagsDMSampleFilter = function (tag) {
      return true;
    };
  }

  let useRGBfilter = $("#tagsUseRgbFilter").hasClass("active");
  if (useRGBfilter) {
    tagsRGBSampleFilter = function (tag) {
      let rgb_mean = tag.rgb_mean;
      if (!rgb_mean) return true;
      let y = 0.299 * rgb_mean[0] + 0.587 * rgb_mean[1] + 0.1114 * rgb_mean[2];
      let CB = (rgb_mean[2] - y) / y;
      let CR = (rgb_mean[0] - y) / y;
      return CB - CR < 0.35;
    };
    $("#tagsUseRgbFilter").addClass("active");
  } else {
    tagsRGBSampleFilter = function (tag) {
      return true;
    };
    $("#tagsUseRgbFilter").removeClass("active");
  }

  filters.sample = function (tag) {
    return (
      tagsHammingSampleFilter(tag) &&
      filters.roi(tag) &&
      filters.excludeRects(tag) &&
      tagsDMSampleFilter(tag) &&
      tagsRGBSampleFilter(tag) &&
      tagsSampleFilterCustom(tag)
    );
  };

  let minLength = Number($("#tagsIntervalFilterMinLength").val());

  filters.interval = function (interval) {
    let fun = Function("interval", $("#tagsIntervalFilter")[0].value);
    return interval.end - interval.begin >= minLength && fun(interval);
  };
  tagsIDFilter = Function("idinfo", $("#tagsIDFilter")[0].value);

  if (logging.overlay) {
    console.log(
      "refreshTagsParameters:",
      "\nfilters.sample=",
      filters.sample,
      "\nfilters.interval=",
      filters.interval,
      "\ntagsIDFilter=",
      tagsIDFilter
    );
  }
}
export function onTagsParametersChanged() {
  console.log("onTagsParametersChanged");
  // Callback when tags chronogram computation parameters have changed
  refreshTagsParameters();
  refreshChronogram();
  videoControl.refresh();
}
export function onTagsParametersSelectChanged(event) {
  $("#tagsIntervalFilter").val($("#tagsIntervalFilterSelect").val());
  onTagsParametersChanged();
}
export function chronoFilter(mode) {
  if (mode == "H0") {
    tagsHammingSampleFilter = function (tag) {
      return tag.hamming == 0;
    };
    onTagsParametersChanged();
  }
  if (mode == "H1") {
    tagsHammingSampleFilter = function (tag) {
      return tag.hamming <= 1;
    };
    onTagsParametersChanged();
  }
  if (mode == "H2") {
    tagsHammingSampleFilter = function (tag) {
      return tag.hamming <= 2;
    };
    onTagsParametersChanged();
  }
  if (mode == "Hall") {
    tagsHammingSampleFilter = function (tag) {
      return true;
    };
    onTagsParametersChanged();
  }
  if (mode == "RGB") {
    $("#tagsUseRgbFilter").toggleClass("active");
    onTagsParametersChanged();
  }
}

/* ROI and exclude rects: the filters `filters.roi` and `filters.excludeRects` follow `chrono.config.region`;
   their buttons and dialog are in ChronoControlInteraction.js (step 11b3c, ADR 0015) */
// ROI changed
export function ROIChanged() {
  if (chrono.config.region.useROI) {
    filters.roi = function (tag) {
      return (
        tag.c[0] >= chrono.config.region.ROI.left &&
        tag.c[0] <= chrono.config.region.ROI.right &&
        tag.c[1] >= chrono.config.region.ROI.top &&
        tag.c[1] <= chrono.config.region.ROI.bottom
      );
    };
  } else {
    filters.roi = function (tag) {
      return true;
    };
  }
  onTagsParametersChanged();
  refreshChronogram();
  videoControl.refresh();
}
// Exclude rects changed
export function excludeRectsChanged() {
  if (chrono.config.region.useExcludeRects) {
    filters.excludeRects = function (tag) {
      for (let r of chrono.config.region.excludeRects) {
        //console.log(tag,r)
        let dx = Math.abs(tag.c[0] - r.cx);
        let dy = Math.abs(tag.c[1] - r.cy);
        if (dx < r.w / 2 && dy < r.h / 2) return false;
      }
      return true;
    };
  } else {
    filters.excludeRects = function (tag) {
      return true;
    };
  }
  $("#excludeRectDeleteButton").toggleClass(
    "disabled",
    !(chrono.config.region.excludeRectSelection >= 0)
  );
  onTagsParametersChanged();
  refreshChronogram();
  videoControl.refresh();
}

updateChronoData = instrument("derived", "updateChronoData", updateChronoData)
updateTagIntervals = instrument("chrono", "updateTagIntervals", updateTagIntervals)
