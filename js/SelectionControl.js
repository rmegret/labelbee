/*jshint esversion: 6, asi: true */ 


// import * from "Model.js";

var defaultSelectedBee;
var undo = new Observation(0);

// # Form and current bee control
function initSelectionControl() {
    $('#F').change(onActivityChanged);
    $('#P').change(onActivityChanged);
    $('#E').change(onActivityChanged);
    $('#L').change(onActivityChanged);
}

/* Update form rectangle data from activeObject */
/* CAUTION: use updateForm(null) for empty form */
function updateForm(activeObject) {

    if (activeObject === null) {
        $('#I').val('-')
        
        $('#X').html("X: -")
        $('#Y').html("Y: -")
        $('#W').html("Width: -")
        $('#H').html("Height: -")
        $('#CX').html("Center X: -")
        $('#CY').html("Center X: -")
        
        $('#F').prop('checked', false);
        $('#P').prop('checked', false);
        $('#E').prop('checked', false);
        $('#L').prop('checked', false);
    } else {
        $('#I').val(activeObject.id)
        
        w = activeObject.width;
        h = activeObject.height;
        let vr = canvasToVideoCoords(activeObject)
        
        $('#X').html("X: " + vr.x.toFixed(0))
        $('#Y').html("Y: " + vr.y.toFixed(0))
        $('#W').html("Width: " + vr.width.toFixed(0))
        $('#H').html("Height: " + vr.height.toFixed(0))
        $('#CX').html("Center X: " + (vr.x + vr.width / 2).toFixed(0))
        $('#CY').html("Center Y: " + (vr.y + vr.height / 2).toFixed(0))

        let obs = activeObject.obs;
        if (typeof obs == "undefined") {
            console.log("ERROR: updateForm called for activeObject with non existing observation. activeObject=", activeObject)
            return
        }
        
        $('#F').prop('checked', obs.bool_acts[0]);
        $('#P').prop('checked', obs.bool_acts[1]);
        $('#E').prop('checked', obs.bool_acts[2]);
        $('#L').prop('checked', obs.bool_acts[3]);
    }

}

function submit_bee() {
    var activeObject = canvas1.getActiveObject();
    if (activeObject === null) {
        printMessage("No bee selected", "red")
        return false;
    }

    // Use current id
    let final_id = activeObject.id;
    if (activeObject.status === "new" && getObsHandle(getCurrentFrame(), final_id, false) !== undefined) {
        console.log('submit_bee: trying to replace existing bee with new observation. ABORT')
        printMessage("Conflict of ID: bee " + final_id + " already exists in this frame.", "red")
        return false;
    }
    if (activeObject.status === "db" && getObsHandle(getCurrentFrame(), final_id, false) === undefined) {
        console.log('submit_bee: rectangle supposed to be existing in DB, but not found. Writing anyway.')
        printMessage("Internal issue. See console.log", "red")
        return true;
    }

    let tmpObs = activeObject.obs
    tmpObs.ID = final_id;
    //updateForm(activeObject);

    storeObs(tmpObs);
    activeObject.status = "db"
  
    videoControl.refresh();
    refreshChronogram();
}

function automatic_sub() {
    var activeObject = canvas1.getActiveObject();
    if (activeObject.status == "db") {
        submit_bee()
    } else {
        console.log("automatic_sub: not submitted, as tmp rect")
        videoControl.refresh() // Just refresh
        refreshChronogram();
    }
}

tagSelection=undefined
function selectBeeByID(id) {
   tagSelection = id 
   let rect = findRect(id);
   if (rect) {
      if (logging.selectionEvents)
         console.log('selectBeeByID: trying to select id=',id);
      //canvas1.setActiveObject(canvas1.item(id));
      canvas1.setActiveObject(rect);
      // TESTME: selectBee was commented
      selectBee(rect);
      axes.selectId(id)
      return true
   } else {
      canvas1.deactivateAll().renderAll(); // Deselect rect if any
      updateForm(null)
      // defaultSelectedBee = undefined // Do not cancel default if not found
      defaultSelectedBee = id // Set default
      axes.selectId(id)
      if (logging.selectionEvents)
         console.log('selectBeeByID: No rect found for id=',id);
      return false
   }
}

// selectBee: called when clicking on a rectangle
function selectBee(rect) {
    if (logging.selectionEvents)
        console.log("selectBee: rect=", rect);
        
    updateDeleteButton()
        
    let beeId = rect.id;    
    defaultSelectedBee = beeId;

    // Update form from rect
    updateForm(rect)
    
    if (flagShowZoom) {
        showZoom(rect)
    }
}
// deselectBee: called when clicking out of a rectangle
function deselectBee() {
    canvas1.deactivateAll().renderAll(); // Deselect rect
    updateForm(null)
    defaultSelectedBee = undefined // Do not keep default when explicit deselect
    updateDeleteButton()
}
// getSelectedID: return undefined or an id
function getSelectedID() {
    // Truth on selected bee ID comes from Fabric.js canvas
    var activeObject = canvas1.getActiveObject();
    if (activeObject === null) {
        return undefined
    } else {
        return activeObject.id
    }
}
// getSelectedRect: return null or a Fabric.js rect
function getSelectedRect() {
    // Truth on selected bee ID comes from Fabric.js canvas
    return canvas1.getActiveObject();
}
function getCurrentTag() {
    return getTag(getCurrentFrame(), defaultSelectedBee)
}


/* Deleting bees and undo stack */

// CONTROL

function deleteSelected() { 
    //Deletes selected rectangle(s)/observation when remove bee is pressed
    var activeObject = canvas1.getActiveObject()
    var activeGroup = canvas1.getActiveGroup()

    if (activeObject) {
        canvas1.remove(activeObject);
        console.log("deleteObjects ",activeObject.id);
        if (obsDoesExist(getCurrentFrame(), activeObject.id)) {
            obs = cloneObs(Tracks[getCurrentFrame()][activeObject.id])
            delete Tracks[getCurrentFrame()][activeObject.id];
            undoPush('delete', obs)
        }

        videoControl.refresh()
        refreshChronogram();
    }
}

function undoAction() {
    var undoInfo = undoPop()
    if (typeof undoInfo !== 'undefined') {
        if (undoInfo.action==='delete') {
            let obs = undoInfo.obs
            
            if (obs.frame != getCurrentFrame()) {
                // Put it back in the DB and jump to frame
                storeObs(obs);
                videoControl.seekFrame(obs.frame)
                return
            }
            
            storeObs(obs);
            rect = addRectFromObs(obs)
            console.log("rect=",rect)
            canvas1.setActiveObject(rect)
            //submit_bee()
            selectBee(rect)
        }
    
        videoControl.refresh();
        refreshChronogram();
    }
}
function updateDeleteButton() {
    if (canvas1.getActiveObject() === null) {
        $('#deleteButton').addClass('disabled')
    } else {
        $('#deleteButton').removeClass('disabled')
    }
}

// MODEL

var undoStack = []
function undoPush(action, info) {
  if (action==="new") {
      let obs = info
      undoStack.push({action: action, obs: obs})
  }
  if (action==="delete") {
      let obs = info
      undoStack.push({action: action, obs: obs})
  }
  if (action==="move") {
      let rect = info
      undoStack.push({action: action, oldObs: rect.obs})
  }
  updateUndoButton()
}
function undoPop() {
  if (undoStack.length===0) {
      console.log('ERROR: undoPop called with empty stack')
      return undefined;
  }
  var undoInfo = undoStack.pop()
  console.log('undoPop: undoInfo=',undoInfo)
  var action = undoInfo.action
  if (action==="delete") {
      // Ok, we got it
  } else {
      console.log('Undo '+action+': not implemented')
      return undefined
  }
  updateUndoButton()
  return undoInfo
}
function updateUndoButton() {
  if (undoStack.length == 0) {
      $('#undoButton').addClass('disabled')
      $('#undoButton').val("Undo")
      return
  } else {
      $('#undoButton').removeClass('disabled')
  }
      
  var undoInfo = undoStack[undoStack.length-1]
  var action=undoInfo.action
  if (action==="delete") {
      let obs = undoInfo.obs
      if (obs.frame == getCurrentFrame()) {
          $('#undoButton').html("Undelete "+obs.ID)
      } else {
          $('#undoButton').html("<p class='multiline'>Undelete "+obs.ID+'<br> in frame '+obs.frame+'</p>')
      }
  } else {
      $('#undoButton').val("Undo?")
  }
}