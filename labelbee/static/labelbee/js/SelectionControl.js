/*jshint esversion: 6, asi: true */

// import * from "Model.js";

var defaultSelectedBee;
var undo = new Observation(0);

/* Form and current bee control */

function initSelectionControl() {
  selectionControl = {};

  $(selectionControl).on("tagselection:created", updateChronoSelection);
  $(selectionControl).on("tagselection:cleared", updateChronoSelection);

  $(selectionControl).on("tagselection:created", updateSelectID);

  $(selectionControl).on("tagselection:created", updateFormButtons);
  $(selectionControl).on("tagselection:cleared", updateFormButtons);
  $(selectionControl).on("selection:created", updateFormButtons);
  $(selectionControl).on("selection:cleared", updateFormButtons);

  function aux(label, description, iconHtml) {
    return {
      label: label,
      description: description,
      iconHtml: iconHtml,
    };
  }

  labelButtonsArray = [
    aux("fanning", "Bee is moving the wings to ventilate"),
    aux("non-fanning", "Bee is not moving the wings"),
    aux("stretched-wings", "Bee has stretched wings, but is not moving them"),
    aux(
      "pollen",
      "Bee is bringing pollen",
      '<span class="glyphicon glyphicon-pollen small"></span>'
    ),
    aux(
      "entering",
      "Bee is entering the colony from outside",
      '<span class="glyphicon glyphicon-arrow-up small" style="color:magenta"></span>'
    ),
    aux(
      "leaving",
      "Bee is leaving the colony to outside",
      '<span class="glyphicon glyphicon-arrow-down small" style="color:green"></span>'
    ),
    aux(
      "walking",
      "Bee is walking in the ramp",
      '<span class="glyphicon glyphicon-repeat small"></span>'
    ),
    aux(
      "expulsed",
      "Bee is being expulsed from the colony or prevented to enter the colony"
    ),
    aux("expulsing", "Bee is rejecting/expulsing another bee or intruder"),
    aux(
      "falsealarm",
      "A tag was detected where there is no tag",
      '<span class="glyphicon glyphicon-remove small red"></span>'
    ),
    aux(
      "wrongid",
      "A tag was detected in the correct place but it has a wrong ID",
      '<span class="glyphicon glyphicon-remove small blue"></span>'
    ),
  ];
  hardRefreshLabelTogglePanel();

  $(".labeltoggle").change(onLabelToggled);

  $("#labels").change(onLabelsChanged);

  $("#notes").keydown(function (event) {
    if (event.which == 13) {
      onActivityChanged(event);
    }
  });

  labelListDialog = new LabelListDialog();

  // dummy object to define events (inspired by Fabric.js)
  // - selection:created
  // - selection:cleared
  // - before:selection:cleared
  //$( selectionControl ).trigger('selection:created')

  //     $( selectionControl ).on('selection:created', updateChronoSelection)
  //     $( selectionControl ).on('selection:cleared', updateChronoSelection)
  //     $( selectionControl ).on('tagselection:created', updateChronoSelection)
  //     $( selectionControl ).on('tagselection:cleared', updateChronoSelection)
}

function hardRefreshLabelTogglePanel() {
  let panel = $("#labeltoggle-panel");

  panel.html("");
  for (i in labelButtonsArray) {
    let item = labelButtonsArray[i];
    let content = item.label;
    if (typeof item.iconHtml == "string") {
      content += " " + item.iconHtml;
    }

    let button = $(
      '<button onclick="onLabelToggled(event)" type="button" class="btn btn-green-toggle btn-xs labeltoggle"/>'
    )
      .html(content)
      .attr("thelabel", item.label)
      .attr("title", item.description);

    // This button can be accessed as: $('.labeltoggle[thelabel="xxxx"]')

    panel.append(button);
  }

  //panel.append( $(document.createTextNode(' - ')) )
  //panel.append( $('<button onclick="labelListDialog.openDialog()" type="button" class="btn btn-info btn-xs" title="Edit list of labels">...</button>') )
  //panel.append( $('<button onclick="labelListFromServerDialog.openDialog()" type="button" class="btn btn-info btn-xs" title="Load list of labels">Load...</button>') )
}

// Advanced Dialog

function LabelListDialog() {
  const theDialog = this;
  this.div = $("#dialog-form-mainLabelList");

  function toJSGrid(data) {
    let griddata = JSON.parse(JSON.stringify(data));

    return griddata;
  }
  function fromJSGrid(griddata) {
    let data = JSON.parse(JSON.stringify(griddata));

    return data;
  }
  this.getItems = function () {
    // Static version of Rows Reordering Scenario
    // http://js-grid.com/demos/

    var grid = this.div.find("#mainLabelList-jsGrid");
    var $gridData = grid.find(".jsgrid-grid-body tbody");

    var itemIndexRegExp = /\s*item-(\d+)\s*/;
    var indexes = $.map(
      $gridData.sortable("toArray", { attribute: "class" }),
      function (classes) {
        return itemIndexRegExp.exec(classes)[1];
      }
    );
    //alert("Reordered indexes: " + indexes.join(", "));

    // arrays of items
    var items = $.map($gridData.find("tr"), function (row) {
      return $(row).data("JSGridItem");
    });

    return fromJSGrid(items);
  };

  this.openDialog = function () {
    let div = this.div;

    console.log("LabelListDialog.openDialog");

    //var jsontext = JSON.stringify(labelButtonsArray ,null, 4)

    //div.find(".jsonTextArea").val(jsontext);

    div.dialog("open");
    this.autoResize();

    theDialog.grid = div.find("#mainLabelList-jsGrid");
    let grid = theDialog.grid;

    theDialog.jsondiv = div.find("#mainLabelList-JSON");
    theDialog.jsondiv.on("input", function () {
      theDialog.updateJSONstate("changed");
    });

    grid.jsGrid({
      width: "100%",
      height: "auto",

      inserting: true,
      editing: true,
      sorting: true,
      paging: false,

      data: toJSGrid(labelButtonsArray),

      fields: [
        { name: "label", type: "text", width: "auto", validate: "required" },
        { name: "description", type: "text", width: "auto" },
        { name: "iconHtml", type: "text", width: "auto" },
        { type: "control", width: "auto" },
      ],

      rowClass: function (item, itemIndex) {
        return "item-" + itemIndex;
      },
      onRefreshed: function () {
        var $gridData = grid.find(".jsgrid-grid-body tbody");

        $gridData.sortable({
          update: function (e, ui) {
            // Dummy function to enable sorting
            // Items are retrieved only when pressing Ok
            theDialog.updateJSON();
          },
        });

        theDialog.updateJSON();
      },
      onDataLoaded: function () {
        theDialog.updateJSON();
      },
      onItemInserted: function () {
        theDialog.updateJSON();
      },
      onItemDeleted: function () {
        theDialog.updateJSON();
      },
      onItemUpdated: function () {
        theDialog.updateJSON();
      },
    });
  };
  this.updateJSON = function () {
    if (theDialog.jsondiv) {
      theDialog.jsondiv.val(
        JSON.stringify({ labelListArray: theDialog.getItems() }, null, 2)
      );
      theDialog.updateJSONstate("valid");
    }
  };
  this.updateFromJSON = function () {
    if (theDialog.jsondiv) {
      json = theDialog.jsondiv.val();
      try {
        obj = JSON.parse(json);
      } catch (e) {
        console.log("ERROR parsing JSON:", e);
        theDialog.updateJSONstate("invalid");
        return;
      }
      //console.log(obj)
      if (!obj || !obj.labelListArray) {
        console.log('ERROR in JSON:missing field "labelListArray"');
        theDialog.updateJSONstate("invalid");
        return;
      }
      theDialog.grid.jsGrid("option", "data", toJSGrid(obj.labelListArray));
      //          theDialog.grid.reset()
    }
  };
  this.updateJSONstate = function (state) {
    if (theDialog.jsonState == state) {
      return;
    }
    if (state == "changed") {
      let button = $("<button>Validate</button>");
      button.on("click", function () {
        theDialog.updateFromJSON();
      });
      $("#tabs-labellist .tab-msg").html(" ").append(button);
    }
    if (state == "valid") {
      $("#tabs-labellist .tab-msg").html(" (Valid)");
    }
    if (state == "invalid") {
      let button = $("<button>Validate</button>");
      button.on("click", function () {
        theDialog.updateFromJSON();
      });
      $("#tabs-labellist .tab-msg").html(" (Invalid)").append(button);
    }
  };
  this.autoResize = function () {
    this.div.dialog("option", {
      position: { my: "center center", at: "center center", of: $(window) },
      width: $(window).width() * 0.95,
      height: $(window).height() * 0.95,
    });
  };
  this.initDialog = function () {
    let that = this;
    let div = this.div;

    $("#tabs-labellist").tabs();

    div.dialog({
      autoOpen: false,
      modal: true,
      buttons: {
        Ok: function () {
          //var jsontext = div.find(".jsonTextArea").val();

          //console.log('labelList dialog. jsontext = ',jsontext)

          // Clone by converting to/from JSON
          labelButtonsArray = that.getItems();

          console.log("labelButtonsArray = ", labelButtonsArray);

          $(this).dialog("close");

          hardRefreshLabelTogglePanel();
        },
        Cancel: function () {
          $(this).dialog("close");
        },
      },
      open: function () {
        $("body").css("overflow", "hidden");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });

    $(window).resize(function () {
      that.autoResize();
    });
    this.autoResize();
  };

  this.initDialog();
}

function updateSelectID() {
  $("#selectID").val(defaultSelectedBee);
}
function onSelectIDChanged() {
  let id = $("#selectID").val().trim();
  selectBeeByID(id);
}

function updateFormButtons() {
  if (getCurrentID() == null) {
    $("#newRectForCurrentTag").addClass("disabled");
    $("#newRectForCurrentTag").removeClass("active");
  } else if (getSelectedID() == null) {
    $("#newRectForCurrentTag").removeClass("disabled");
    $("#newRectForCurrentTag").removeClass("active");
  } else {
    $("#newRectForCurrentTag").addClass("disabled");
    $("#newRectForCurrentTag").addClass("active");
  }
}

function updateButtonsForLabel(obs, label) {
  $('.labeltoggle[thelabel="' + label + '"]').toggleClass(
    "active",
    hasLabel(obs, label)
  );
}

/* Update form rectangle data from activeObject */
/* CAUTION: use updateForm(null) for empty form */
function updateForm(activeObject) {
  if (logging.form) {
    console.log("updateForm: activeObject=", activeObject);
  }

  $("#newid").val("");
  if (activeObject === null) {
    $("#I").val("-");
    $("#newid").val("");

    $("#X").html("X: -");
    $("#Y").html("Y: -");
    $("#W").html("Width: -");
    $("#H").html("Height: -");
    $("#CX").html("Center X: -");
    $("#CY").html("Center X: -");

    //$('.labelcheckbox').prop('checked', false);

    $("#notes").prop("value", "");
    $("#labels").prop("value", "");

    $(".labeltoggle").toggleClass("active", false);
  } else {
    $("#I").val(activeObject.id);

    w = activeObject.width;
    h = activeObject.height;
    let vr = overlay.canvasToVideoRect(activeObject);

    $("#X").html("X: " + vr.left.toFixed(0));
    $("#Y").html("Y: " + vr.top.toFixed(0));
    $("#W").html("Width: " + vr.width.toFixed(0));
    $("#H").html("Height: " + vr.height.toFixed(0));
    $("#CX").html("Center X: " + (vr.left + vr.width / 2).toFixed(0));
    $("#CY").html("Center Y: " + (vr.top + vr.height / 2).toFixed(0));

    let obs = activeObject.obs;
    if (typeof obs == "undefined") {
      console.log(
        "ERROR: updateForm called for activeObject with non existing observation. activeObject=",
        activeObject
      );
      return;
    }

    if (typeof obs.notes === "undefined") $("#notes").prop("value", "");
    else $("#notes").prop("value", obs.notes);

    $("#labels").val(getLabels(obs).join(","));

    for (var labelItem of labelButtonsArray) {
      updateButtonsForLabel(obs, labelItem.label);
    }

    if (obs.newid != null) $("#newid").val(obs.newid);
  }
}

function submit_bee() {
  var activeObject = overlay.getActiveObject();
  if (activeObject === null) {
    printMessage("No bee selected", "red");
    return false;
  }

  // Use current id
  let final_id = activeObject.id;
  if (
    activeObject.status === "new" &&
    getObsHandle(getCurrentFrame(), final_id, false) !== undefined
  ) {
    console.log(
      "submit_bee: trying to replace existing bee with new observation. ABORT"
    );
    printMessage(
      "Conflict of ID: bee " + final_id + " already exists in this frame.",
      "red"
    );
    return false;
  }
  if (
    activeObject.status === "db" &&
    getObsHandle(getCurrentFrame(), final_id, false) === undefined
  ) {
    console.log(
      "submit_bee: rectangle supposed to be existing in DB, but not found. Writing anyway."
    );
    printMessage("Internal issue. See console.log", "red");
    return true;
  }

  let tmpObs = activeObject.obs;
  tmpObs.ID = final_id;
  //updateForm(activeObject);

  storeObs(tmpObs);
  activeObject.status = "db";

  videoControl.refresh();
  refreshChronogram();
}

function automatic_sub() {
  var activeObject = overlay.getActiveObject();
  if (activeObject.status == "db") {
    submit_bee();
  } else {
    console.log("automatic_sub: not submitted, as tmp rect");
    videoControl.refresh(); // Just refresh
    refreshChronogram();
  }
}

function swapID_findAll(ID) {
    frames = getFramesWithID([getCurrentFrame(),-1],ID)

}
function swapID_callback() {
    var activeObject = overlay.getActiveObject();
    if (activeObject === null) {
        printMessage("No bee selected", "red")
        return false;
    }

    let swapNewID = 
        $('<input type="text" size="5" value="" id="swapNewIDInput" class="small"></input>')
            

    function doSwap2(interval, old_id, new_id) {
        obs_swapID(interval, old_id, new_id)
        videoControl.refresh() // Just refresh
        refreshChronogram();
    }
    function doSwap() {
        let interval = [getCurrentFrame(),-1]
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
    $('#alerttext').html("Swap current ID="+activeObject.id+" with new ID for frame "+getCurrentFrame()+" until end. NewID=")
    .append(swapNewID)
    .append($('<button>SWAP</button>').click(doSwap))
    .append($(document.createTextNode(' ')))
    .append($('<button>CANCEL</button>').click(cancelSwap))
}

/* Selection */

tagSelection = undefined;
function selectBeeByID(id) {
  tagSelection = id;
  let rect = findRect(id);
  if (rect) {
    if (logging.selectionEvents)
      console.log("selectBeeByID: trying to select id=", id);
    //canvas1.setActiveObject(canvas1.item(id));
    overlay.setActiveObject(rect);
    // TESTME: selectBee was commented
    selectBee(rect);
    // Events triggered in selectBee
    return true;
  } else {
    overlay.canvas1.deactivateAll().renderAll(); // Deselect rect if any
    updateForm(null);
    // defaultSelectedBee = undefined // Do not cancel default if not found
    defaultSelectedBee = id; // Set default
    if (id == null) $(selectionControl).trigger("tagselection:cleared");
    else $(selectionControl).trigger("tagselection:created");
    axes.selectId(id);
    if (logging.selectionEvents)
      console.log("selectBeeByID: No rect found for id=", id);
    return false;
  }
}
function selectBeeByIDandFrame(id, frame) {
  if (frame != getCurrentFrame()) {
    deselectBee();
    defaultSelectedBee = id;
    videoControl.seekFrame(frame);
  } else {
    deselectBee();
    selectBeeByID(id);
    videoControl.refresh();
  }
}

// selectBee: called when clicking on a rectangle
function selectBee(rect) {
  if (logging.selectionEvents) console.log("selectBee: rect=", rect);

  updateDeleteButton();

  let beeId = rect.id;
  defaultSelectedBee = beeId;

  // Update form from rect
  updateForm(rect);

  $(selectionControl).trigger("tagselection:created");
  $(selectionControl).trigger("selection:created");
}

// deselectBee: called when clicking out of a rectangle
function deselectBee() {
  $(selectionControl).trigger("before:selection:cleared");

  //canvas1.deactivateAll().renderAll(); // Deselect rect
  overlay.canvas1.deactivateAllWithDispatch();
  updateForm(null);
  defaultSelectedBee = undefined; // Do not keep default when explicit deselect
  updateDeleteButton();

  $(selectionControl).trigger("tagselection:cleared");
  $(selectionControl).trigger("selection:cleared");
}
// getSelectedID: return undefined or an id
function getSelectedID() {
  // Truth on selected bee ID comes from Fabric.js canvas
  var activeObject = overlay.getActiveObject();
  if (activeObject === null) {
    return undefined;
  } else {
    return activeObject.id;
  }
}
// getSelectedRect: return null or a Fabric.js rect
function getSelectedRect() {
  // Truth on selected bee ID comes from Fabric.js canvas
  return overlay.getActiveObject();
}
function getCurrentTag() {
  return getTag(getCurrentFrame(), defaultSelectedBee);
}
function getCurrentID() {
  return defaultSelectedBee;
}

function getIdsInFocus() {
  let F = getCurrentFrame();

  let win = getWindow();
  let fmin = win[0],
    fmax = win[1];
  let frange = F - fmin > fmax - F ? F - fmin : fmax - F;

  ids = new Set();
  for (let f = fmin; f <= fmax; f++) {
    let tagsFrame = Tags[f];
    if (typeof tagsFrame === "undefined") continue;
    let tags = tagsFrame.tags;

    for (let i in tags) {
      ids.add(String(tags[i].id));
    }
  }
  return [...ids];
}

/* Deleting bees  */

function deleteSelected() {
  //Deletes selected rectangle(s)/observation when remove bee is pressed
  var activeObject = overlay.getActiveObject();
  var activeGroup = overlay.canvas1.getActiveGroup();

  if (activeObject) {
    overlay.canvas1.remove(activeObject);
    console.log("deleteObjects ", activeObject.id);
    deleteEvent(getCurrentFrame(), activeObject.id)
    //videoControl.refresh()
    //refreshChronogram();
  }
}

function deleteEvent(frame, id) {
  if (!obsDoesExist(frame, id)) {
    console.log('deleteEvent: Event not found (frame,id)=', frame, id)
    return false
  }
  obs = cloneObs(Tracks[frame][id])
  delete Tracks[frame][id];
  undoPush('delete', obs)

  videoControl.refresh();
  refreshChronogram();
  return true
}

function undoAction() {
  var undoInfo = undoPop();
  if (typeof undoInfo !== "undefined") {
    if (undoInfo.action === "delete") {
      let obs = undoInfo.obs;

      if (obs.frame != getCurrentFrame()) {
        // Put it back in the DB and jump to frame
        storeObs(obs);
        videoControl.seekFrame(obs.frame);
        return;
      }

      storeObs(obs);
      rect = addRectFromObs(obs);
      console.log("rect=", rect);
      overlay.setActiveObject(rect);
      //submit_bee()
      selectBee(rect);
    }

    videoControl.refresh();
    refreshChronogram();
  }
}
function updateDeleteButton() {
  if (overlay.getActiveObject() === null) {
    $("#deleteButton").addClass("disabled");
  } else {
    $("#deleteButton").removeClass("disabled");
  }
}

/* Undo stack */

var undoStack = [];
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
function updateUndoButton() {
  if (undoStack.length == 0) {
    $("#undoButton").addClass("disabled");
    $("#undoButton").val("Undo");
    return;
  } else {
    $("#undoButton").removeClass("disabled");
  }

  var undoInfo = undoStack[undoStack.length - 1];
  var action = undoInfo.action;
  if (action === "delete") {
    let obs = undoInfo.obs;
    if (obs.frame == getCurrentFrame()) {
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

/* Labels Control */

var labelMap = {
  f: "fanning",
  p: "pollen",
  e: "entering",
  d: "leaving",
  l: "leaving",
  pollen: "pollen",
  entering: "entering",
  leaving: "leaving",
  departing: "leaving",
  pollen: "pollen",
  expulsion: "expulsion",
};

function normalizeLabel(label) {
  return labelMap[label] == null ? label : labelMap[label];
}
function toLabelString(labelArray) {
  return labelArray
    .map(function (d) {
      return d.toLowerCase();
    })
    .map(function (d) {
      return d.trim();
    })
    .filter(function (d) {
      return d != "";
    })
    .map(normalizeLabel)
    .join(",");
}
function toLabelArray(labels) {
  return labels
    .split(",")
    .map(function (d) {
      return d.toLowerCase();
    })
    .map(function (d) {
      return d.trim();
    })
    .filter(function (d) {
      return d != "";
    })
    .map(normalizeLabel);
}
function cleanLabels(labels) {
  return toLabelString(toLabelArray(labels));
}

function addLabel(labelArray, label) {
  let k = $.inArray(label, labelArray);
  if (k < 0) {
    labelArray.push(label);
  }
}
function removeLabel(labelArray, label) {
  let k = $.inArray(label, labelArray);
  if (k >= 0) {
    labelArray.splice(k, 1);
  }
}
function updateLabelArray(labelArray, label, active) {
  let k = $.inArray(label, labelArray);
  if (!active && k >= 0) {
    labelArray.splice(k, 1);
  }
  if (active && k < 0) {
    labelArray.push(label);
  }
}

function updateObsLabel(obs, label, active) {
  if (obs.labels == null) {
    obs.labels = "";
  }
  let labelArray = toLabelArray(obs.labels);
  let k = $.inArray(label, labelArray);
  if (!active && k >= 0) {
    labelArray.splice(k, 1);
  }
  if (active && k < 0) {
    labelArray.push(label);
  }
  obs.labels = toLabelString(labelArray);
}
function hasLabel(obs, label) {
  if (obs.labels == null) {
    obs.labels = "";
  }
  return containsLabel(obs.labels, label);
}
function containsLabel(labels, label) {
  if (labels == null) {
    return false;
  }
  let labelArray = toLabelArray(labels);
  let k = $.inArray(normalizeLabel(label), labelArray);
  if (k >= 0) return true;
  else return false;
}

function updateLabelsFromBool(labels, bool_acts) {
  let labelArray = toLabelArray(labels);
  let add = [];
  updateLabel(labelArray, "fanning", bool_acts[0]);
  updateLabel(labelArray, "pollen", bool_acts[1]);
  updateLabel(labelArray, "entering", bool_acts[2]);
  updateLabel(labelArray, "leaving", bool_acts[3]);
  return toLabelString(labelArray);
}

function getLabels(obs) {
  return toLabelArray(obs.labels);
}

/* Labels GUI */

// If labels changed from buttons
function onLabelToggled(event) {
  if (logging.guiEvents) console.log("onLabelToggled: event=", event);
  var activeObject = overlay.getActiveObject();
  var target = event.currentTarget;
  if (activeObject == null) {
    newRectForCurrentTag();
    activeObject = overlay.getActiveObject();
  }
  if (activeObject == null) {
    console.log("onLabelToggled: aborted, could not get an activeObject");
    return;
  }

  let obs = activeObject.obs;

  let thelabel = $(target).attr("thelabel");
  let oldState = $(target).hasClass("active");

  let isOn = !oldState;
  $(target).toggleClass("active", isOn);
  updateObsLabel(obs, thelabel, isOn);

  console.log(
    "onLabelToggled: thelabel=",
    thelabel,
    "newstate=",
    isOn,
    "obs.labels=",
    obs.labels
  );

  if (thelabel == "wrongid" && isOn) {
    if (!obs.fix) {
      obs.fix = {
        newid: undefined,
      };
    }
  }

  // Update the rest
  updateRectObsActivity(activeObject);
  automatic_sub();

  updateForm(activeObject);
  refreshChronogram();
}

// If labels changed from pressing return ?
function onActivityChanged(event) {
  if (logging.guiEvents) console.log("onActivityChanged: event=", event);
  var activeObject = overlay.getActiveObject();
  if (activeObject !== null) {
    updateRectObsActivity(activeObject);
    automatic_sub();
  }
}
// If labels textarea changed
function onLabelsChanged() {
  let labels = $("#labels").val();
  if (logging.guiEvents) console.log("onLabelsChanged: labels=", labels);
  var activeObject = overlay.getActiveObject();
  if (activeObject !== null) {
    setLabels(activeObject, labels);
    automatic_sub();
  }
}
