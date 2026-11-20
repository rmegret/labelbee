/*jshint esversion: 6, asi: true */

// import * from "Model.js";

var undo = new Observation(0);

/* Form and current bee control */

function initSelectionControl() {
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
    if ( (typeof item.accesskey == "string") && (item.accesskey != "") ) {
      content += ` [${item.accesskey}]`;
    }

    let button = $(
      '<button onclick="onLabelToggled(event)" type="button" class="btn btn-green-toggle btn-xs labeltoggle"/>'
    )
      .html(content)
      .attr("thelabel", item.label)
      .attr("title", item.description)
      .attr("accesskey", item.accesskey);

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
        { name: "accesskey", type: "text", width: "auto" },
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
  $("#selectID").val(selection.getId());
}
function onSelectIDChanged() {
  let id = $("#selectID").val().trim();
  selection.select(getCurrentFrame(), id);
  refresh.selection();
}

function updateFormButtons() {
  if (selection.getId() == null) {
    $("#newRectForCurrentTag").addClass("disabled");
    $("#newRectForCurrentTag").removeClass("active");
  } else if (overlay.getActiveRectID() == null) {
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

/* Render the selected event (the stored observation) as a collapsible tree in the Events info tab.
 * Nothing is rendered while the tab is closed (not visible): the latest observation is kept and rendered once,
 * when the tab becomes visible. */
let eventTreePending = null; // {obs} to render when visible, null when up to date
let eventTreeObserver = null;

function renderEventTreeNow(container, obs) {
  let title = "event";
  if (obs != null) title = "event (frame " + obs.frame + ", id " + (obs.id != null ? obs.id : obs.ID) + ")";
  EventTree.renderEventTree(container, obs, title);
}

function updateEventTree(obs) {
  const container = document.getElementById("event-tree");
  if (container == null || typeof EventTree === "undefined") return;
  if (container.getClientRects().length > 0) {
    eventTreePending = null;
    renderEventTreeNow(container, obs);
    return;
  }
  eventTreePending = { obs: obs };
  if (eventTreeObserver == null && typeof IntersectionObserver !== "undefined") {
    eventTreeObserver = new IntersectionObserver(function (entries) {
      if (eventTreePending != null && entries.some((e) => e.isIntersecting)) {
        const pending = eventTreePending;
        eventTreePending = null;
        renderEventTreeNow(container, pending.obs);
      }
    });
    eventTreeObserver.observe(container);
  }
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
    $("#CY").html("Center Y: -");

    //$('.labelcheckbox').prop('checked', false);

    $("#notes").prop("value", "");
    $("#labels").prop("value", "");

    $(".labeltoggle").toggleClass("active", false);

    updateEventTree(null);
  } else {
    $("#I").val(activeObject.id);

    w = activeObject.width;
    h = activeObject.height;
    // activeObject.left/top are the center of the rectangle (originX/Y = "center"): use the unrotated box
    let vr = overlay.canvasToVideoRect(rotatedRectGeometry(activeObject).unrotated);

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

    updateEventTree(obs);

    if (typeof obs.notes === "undefined") $("#notes").prop("value", "");
    else $("#notes").prop("value", obs.notes);

    $("#labels").val(getLabels(obs).join(","));

    for (var labelItem of labelButtonsArray) {
      updateButtonsForLabel(obs, labelItem.label);
    }

    if (obs.newid != null) $("#newid").val(obs.newid);
  }
}

/**
 * A draft rectangle (the one drawn while ctrl-dragging, the only rectangle that is not in the store) becomes an
 * observation: stored with `events.commit`, and from then on the rectangle holds the stored object. Refuses an id
 * that already exists on the frame.
 */
function submitDraft(rect) {
  let frame = rect.obs.frame;
  let id = rect.id;
  if (getObsHandle(frame, id, false) !== undefined) {
    console.log("submitDraft: trying to replace existing bee with new observation. ABORT");
    printMessage("Conflict of ID: bee " + id + " already exists in this frame.", "red");
    return false;
  }
  rect.obs.ID = id;
  rect.obs = events.commit(rect.obs);
  rect.draft = false;
  selection.select(frame, id); // no longer a draft: it has a key

  refresh.rebuild();
  return true;
}

/**
 * Stores the fields of one unit edited on the selected rectangle (ADR 0008 R3): the store gets only these fields,
 * with `events.update` (the rectangle holds the stored object). It does not refresh: the caller calls the `refresh.*`
 * that fits its field (ADR 0009 section 0). A draft rectangle (the ctrl-drag in progress) is not in the store: the fields
 * go to its own observation, and `submitNew` submits it (the newid box did; `submitDraft` refreshes). Returns whether
 * the store was written.
 */
function storeUnit(rect, fields, submitNew) {
  let key = selection.getKey();
  if (!key) Object.assign(rect.obs, fields); // not in the store yet: the working copy is the only holder
  if (key) {
    let stored = Object.assign({}, fields);
    if (stored.fix) stored.fix = deepcopy(stored.fix); // the store never shares `fix` with the working copy
    events.update(key.frame, key.id, stored);
    return true;
  }
  if (submitNew && rect.draft) submitDraft(rect);
  return false;
}

function swapID_findAll(ID) {
    frames = getFramesWithID([getCurrentFrame(),-1],ID)

}
function swapID_callback() {
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

function selectBeeByIDandFrame(id, frame) {
  if (frame != getCurrentFrame()) {
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
function activateSelection() {
  overlay.setActiveRectID(selection.getId());
  updateSelectionPanels();
}

/**
 * VIEW: the panels that show the selection (delete button, form, chronogram, ID field, new-rect button, zoom). It reads
 * `selection` and fabric's active rectangle and changes neither. `activateSelection` and `hardRefresh` run it.
 */
function updateSelectionPanels() {
  updateDeleteButton();
  updateForm(overlay.getActiveRect());
  updateChronoSelection();
  if (selection.getId() != null) updateSelectID(); // the field keeps its text after an explicit deselect
  updateFormButtons();
  if (typeof zoomOverlay !== "undefined") zoomOverlay.refreshFromSelection(); // not created before initZoomView
}

// deselectBee: called when clicking out of a rectangle. The caller then calls refresh.selection() (or a rebuild)
function deselectBee() {
  //canvas1.deactivateAll().renderAll(); // Deselect rect
  overlay.canvas1.deactivateAllWithDispatch();
  selection.clear(); // Do not keep default when explicit deselect
}
function getCurrentTag() {
  return getTag(getCurrentFrame(), selection.getId());
}

function getIdsInFocus() {
  let F = getCurrentFrame();

  let win = getWindow();
  let fmin = win[0],
    fmax = win[1];
  let frange = F - fmin > fmax - F ? F - fmin : fmax - F;

  ids = new Set();
  for (let f = fmin; f <= fmax; f++) {
    let tagsFrame = AnnotationStore.getTags()[f];
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
  var activeObject = overlay.getActiveRect();
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
  // Undo is deactivated until its own slice (ADR 0008 step 1): a delete is final, nothing is cloned or pushed.
  events.delete(frame, id); // also removes the frame when it ends up empty

  refresh.rebuild();
  return true
}

function undoAction() {
  var undoInfo = undoPop();
  if (typeof undoInfo !== "undefined") {
    if (undoInfo.action === "delete") {
      let obs = undoInfo.obs;

      if (obs.frame != getCurrentFrame()) {
        // Put it back in the DB and jump to frame
        events.commit(obs);
        videoControl.seekFrame(obs.frame);
        return;
      }

      events.commit(obs);
      rect = addRectFromObs(obs);
      console.log("rect=", rect);
      overlay.setActiveRect(rect);
      //submit_bee()
    }

    videoControl.refresh();
    refreshChronogram();
  }
}
function updateDeleteButton() {
  if (overlay.getActiveRect() === null) {
    $("#deleteButton").addClass("disabled");
  } else {
    $("#deleteButton").removeClass("disabled");
  }
}

/* Undo stack */

var undoStack = [];
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
function updateUndoButton() {
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

// The label helpers (labelMap, toLabelArray, hasLabel, ...) are in annotation/Labels.js,
// exposed by labelbeeBridge.js (ADR 0008 step 2).

/* Labels GUI */

function labelsProcessKey(key) {
  let item = labelButtonsArray.find( item => item.accesskey==key )
  if (!item) return false;
  labelToggle(item.label)
  return true
}

// If labels changed from buttons
function onLabelToggled(event) {
  var target = event.currentTarget;
  let thelabel = $(target).attr("thelabel");
  let oldState = $(target).hasClass("active");
  let isOn = !oldState;

  labelToggle(thelabel, isOn)
}

function labelToggle(thelabel, isOn) {
  // Set to isOn if isOn defined
  // Toggle if isOn undefined

  if (logging.guiEvents) console.log("onLabelToggled: event=", event);
  var activeObject = overlay.getActiveRect();
  if (activeObject == null) {
    newRectForCurrentTag();
    activeObject = overlay.getActiveRect();
  }
  if (activeObject == null) {
    console.log("onLabelToggled: aborted, could not get an activeObject");
    return;
  }

  let obs = activeObject.obs;

  if (isOn===undefined) {
    isOn = !hasLabel(obs,thelabel)
  }

  if (thelabel == "wrongid") {
    // the wrong-id unit has its own editor (ADR 0008 step 5)
    storeUnit(activeObject, WrongId.wrongidToggled(obs, isOn));
  } else {
    storeUnit(activeObject, { labels: Labels.update(obs.labels, thelabel, isOn) });
  }
  updateButtonsForLabel(obs, thelabel)

  console.log(
    "onLabelToggled: thelabel=",
    thelabel,
    "newstate=",
    isOn,
    "obs.labels=",
    obs.labels
  );

  refresh.update();
}

// If labels changed from pressing return ?
function onActivityChanged(event) {
  if (logging.guiEvents) console.log("onActivityChanged: event=", event);
  var activeObject = overlay.getActiveRect();
  if (activeObject !== null) {
    // the notes unit has its own editor (ADR 0008 step 5)
    storeUnit(activeObject, { notes: $("#notes").val() });
    refresh.form(); // the chronogram and the overlay do not show the notes
  }
}
// If labels textarea changed
function onLabelsChanged() {
  let labels = $("#labels").val();
  if (logging.guiEvents) console.log("onLabelsChanged: labels=", labels);
  var activeObject = overlay.getActiveRect();
  if (activeObject !== null) {
    storeUnit(activeObject, { labels: Labels.clean(labels) });
    refresh.update();
  }
}



function modifyCurrentObsSpan(mode) {
  let r = overlay.getActiveRect()
  if (!r) {
      console.log('modifyCurrentObsSpan: CANCELED, no event selected')
      return;
  }

  let frame = r.obs.frame;
  let id = r.obs.ID;

  let obs = events.get(frame, id);

  let tracks = flatTracksAll.filter(
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



function updateAnnotationStatistics() {
  let L=[]; events.forEach((obs) => {L.push(obs)})
  let S=new Set(L.map(x => x.ID))
  let F=new Set(L.map(x => x.frame))
  console.log("num_events=",L.length)
  console.log("unique_ids=",S.size)
  console.log("unique_frames=", F.size)
  console.log("ids=", [...S])
  console.log("frames=", [...F])
  $('#annotation-statistics').html( `num_events=${L.length}<br>unique_ids=${S.size}<br>unique_frames=${F.size}<br>ids=${[...S]}<br>frames=${[...F]}` )
}
