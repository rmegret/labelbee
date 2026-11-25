/*jshint esversion: 6, asi: true */
// The selection and its actions (ES module, refactor slice 8 step 9c, ADR 0015): select, activate and deselect a bee, swap ID,
// delete, the undo stack and the edit of the span of the current observation. Part of the former SelectionControl.js; the
// form and the panels are in Form.js. The functions are installed on window by labelbeeBridge.js.
import { instrument } from "./core/RefreshInstrumentBridge.js";
import { updateSelectionPanels } from "./form/Form.js";
import { addRectFromObs } from "./overlay/BeeRect.js";
import { getFramesWithID, getFramesWithSwapID, obs_swapID } from "./annotation/Model.js";
import { deleteEvent } from "./commands/EditActions.js";

function swapID_findAll(ID) {
    let frames = getFramesWithID([videoControl.getCurrentFrame(),-1],ID)

}
export function swapID_callback() {
    var activeObject = overlay.getActiveRect();
    if (activeObject === null) {
        printMessage("No bee selected", "red")
        return false;
    }

    let swapNewID = 
        $('<input type="text" size="5" value="" id="swapNewIDInput" class="small"></input>')
            

    function doSwap2(interval, old_id, new_id) {
        obs_swapID(interval, old_id, new_id)
        refresh.rebuild()
    }
    function doSwap() {
        let interval = [videoControl.getCurrentFrame(),-1]
        let old_id = activeObject.id
        let new_id = swapNewID.val()
        console.log('Swapping ID '+old_id+' with '+new_id)
        let frames = getFramesWithID(interval, old_id)
        let swapFrames = getFramesWithSwapID(interval, old_id, new_id)
        $('#alerttext').html('Swap ID '+old_id+' with '+new_id+' nframes='+frames.length+' (including '+swapFrames.length+' swaps)')
            .append($('<button>CONFIRM</button>').click((evt) => doSwap2(interval, old_id, new_id)))
            .append($('<button>CANCEL</button>').click(cancelSwap))
    }
    function cancelSwap() {
        $('#alerttext').html('SwapID canceled')
    }

    swapNewID.val(activeObject.id)

    //printMessage(
    $('#alerttext').html("Swap current ID="+activeObject.id+" with new ID for frame "+videoControl.getCurrentFrame()+" until end. NewID=")
    .append(swapNewID)
    .append($('<button>SWAP</button>').click(doSwap))
    .append($(document.createTextNode(' ')))
    .append($('<button>CANCEL</button>').click(cancelSwap))
}

/* Selection */

export function selectBeeByIDandFrame(id, frame) {
  if (frame != videoControl.getCurrentFrame()) {
    deselectBee();
    selection.select(frame, id);
    videoControl.seekFrame(frame);
  } else {
    deselectBee();
    selection.select(frame, id);
    videoControl.refresh();
  }
}

/**
 * VIEW: shows the selection (`selection`, ADR 0009 section 0b) on the rectangles, then in the panels. It reads the model and
 * changes it nowhere. The step of `refresh.selection()`: the caller decides what is selected first (`selection.select`,
 * `selection.changeFrame`), then calls `refresh.selection()`.
 */
export function activateSelection() {
  overlay.setActiveRectID(selection.getId());
  updateSelectionPanels();
}

// deselectBee: called when clicking out of a rectangle. The caller then calls refresh.selection() (or a rebuild)
export function deselectBee() {
  //canvas1.deactivateAll().renderAll(); // Deselect rect
  overlay.canvas1.deactivateAllWithDispatch();
  selection.clear(); // Do not keep default when explicit deselect
}
/** Tag of the id `id` on frame `f`, from the mode `tagMode` (read by `getCurrentTag`) */
export function getTag(f, id) {
  if (tagMode == 'Tracks') {
    const obj = events.get(f, id)
    if (obj == undefined) return undefined
    return obj.tag
  }
  // Else tagMode == 'Tags'
  if (typeof AnnotationStore.getTags() === "undefined") return undefined;
  let tagsFrame = AnnotationStore.getTags()[f];
  if (typeof tagsFrame === "undefined") return undefined;
  let tags = tagsFrame.tags;
  for (let i in tags) {
    if (tags[i].id == id) {
      return tags[i];
    }
  }
  return undefined;
}
export function getCurrentTag() {
  return getTag(videoControl.getCurrentFrame(), selection.getId());
}

/* Deleting bees  */

export function deleteSelected() {
  //Deletes selected rectangle(s)/observation when remove bee is pressed
  var activeObject = overlay.getActiveRect();
  var activeGroup = overlay.canvas1.getActiveGroup();

  if (activeObject) {
    overlay.canvas1.remove(activeObject);
    console.log("deleteObjects ", activeObject.id);
    deleteEvent(videoControl.getCurrentFrame(), activeObject.id)
    //videoControl.refresh()
    //refreshChronogram();
  }
}

export function undoAction() {
  var undoInfo = undoPop();
  if (typeof undoInfo !== "undefined") {
    if (undoInfo.action === "delete") {
      let obs = undoInfo.obs;

      if (obs.frame != videoControl.getCurrentFrame()) {
        // Put it back in the DB and jump to frame
        events.commit(obs);
        videoControl.seekFrame(obs.frame);
        return;
      }

      events.commit(obs);
      let rect = addRectFromObs(obs);
      console.log("rect=", rect);
      overlay.setActiveRect(rect);
      //submit_bee()
    }

    videoControl.refresh();
    refreshChronogram();
  }
}

/* Undo stack */

export var undoStack = [];
var UNDO_OFF_TITLE = "Undo is off until its own slice";
function undoPush(action, info) {
  if (action === "new") {
    let obs = info;
    undoStack.push({ action: action, obs: obs });
  }
  if (action === "delete") {
    let obs = info;
    undoStack.push({ action: action, obs: obs });
  }
  if (action === "move") {
    let rect = info;
    undoStack.push({ action: action, oldObs: rect.obs });
  }
  updateUndoButton();
}
function undoPop() {
  if (undoStack.length === 0) {
    console.log("ERROR: undoPop called with empty stack");
    return undefined;
  }
  var undoInfo = undoStack.pop();
  console.log("undoPop: undoInfo=", undoInfo);
  var action = undoInfo.action;
  if (action === "delete") {
    // Ok, we got it
  } else {
    console.log("Undo " + action + ": not implemented");
    return undefined;
  }
  updateUndoButton();
  return undoInfo;
}
export function updateUndoButton() {
  if (undoStack.length == 0) {
    // Nothing pushes on the stack any more (undo is deactivated, ADR 0008 step 1): the button stays off.
    $("#undoButton").addClass("disabled").prop("disabled", true).attr("title", UNDO_OFF_TITLE);
    $("#undoButton").val("Undo");
    return;
  } else {
    $("#undoButton").removeClass("disabled");
  }

  var undoInfo = undoStack[undoStack.length - 1];
  var action = undoInfo.action;
  if (action === "delete") {
    let obs = undoInfo.obs;
    if (obs.frame == videoControl.getCurrentFrame()) {
      $("#undoButton").html("Undelete " + obs.ID);
    } else {
      $("#undoButton").html(
        "<p class='multiline'>Undelete " +
          obs.ID +
          "<br> in frame " +
          obs.frame +
          "</p>"
      );
    }
  } else {
    $("#undoButton").val("Undo?");
  }
}



export function modifyCurrentObsSpan(mode) {
  let r = overlay.getActiveRect()
  if (!r) {
      console.log('modifyCurrentObsSpan: CANCELED, no event selected')
      return;
  }

  let frame = r.obs.frame;
  let id = r.obs.ID;

  let obs = events.get(frame, id);

  let tracks = chronoState.flatTracksAll.filter(
    function (element) {
      return element.obs == obs;
    }
    //{return (element.obs.frame==obs.frame && element.obs.ID==obs.ID)}
  );
  if (tracks.length == 0) return;

  let track = tracks[0];

  if (!("span" in obs)) {
    events.update(frame, id, { span: { f1: track.span.f1, f2: track.span.f2 } });
  }
  if (mode == "copy") {
    return;
  }
  let f1 = obs.span.f1;
  let f2 = obs.span.f2;
  if (mode == "extendleft") {
    f1 = f1 - 10;
    if (f1 < 0) f1 = 0;
  }
  if (mode == "extendright") {
    f2 = f2 + 10;
  }
  if (mode == "restrictleft") {
    f1 = f1 + 10;
    if (f1 > obs.frame) f1 = obs.frame;
  }
  if (mode == "restrictright") {
    f2 = f2 - 10;
    if (f2 < obs.frame) f2 = obs.frame;
  }
  if (f1 != obs.span.f1 || f2 != obs.span.f2) {
    events.update(frame, id, { span: { f1: f1, f2: f2 } });
  }

  if (mode=='setspan') {
      overlay.setInteractionMode('pick-frame',{type:'setspan'})
      return
  }

  refresh.chrono()
}
// Entry point of the refresh (ADR 0009): the log sees every call, from this module and from the classic scripts
updateUndoButton = instrument("form", "updateUndoButton", updateUndoButton);
