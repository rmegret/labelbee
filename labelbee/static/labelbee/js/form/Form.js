/*jshint esversion: 6, asi: true */
// The form and the panels of the selection (ES module, refactor slice 8 step 9c, ADR 0015): initialization of the label panel,
// `LabelListDialog`, the ID field and the form (`updateForm`), the event tree, the delete button, the label toggles and the
// annotation statistics. Part of the former SelectionControl.js; the selection itself, the undo stack and the span edits
// stay in js/SelectionControl.js, which draws on this module (`updateSelectionPanels`), never the other way.
// `labelButtonsArray` (written by dialogs/LabelListFromServerDialog.js, read here) and `labelListDialog` (the inline handler of the page) stay page
// globals. The functions are installed on window by labelbeeBridge.js; the entry points of the refresh are wrapped at the end.
import { instrument } from "../core/RefreshInstrumentBridge.js";
import { has as hasLabel } from "../annotation/Labels.js";
import * as Labels from "../annotation/Labels.js";
import { getCurrentTag } from "../SelectionControl.js";
import { rotatedRectGeometry, tagAngle } from "../overlay/Drawing.js";
import { storeUnit } from "../commands/EditActions.js";
import { updateChronoSelection } from "../chrono/ChronoRender.js";

window.labelButtonsArray = undefined; // [{label, description, ...}], set by initSelectionControl or by the labels loaded from the server
window.labelListDialog = undefined; // LabelListDialog, built by initSelectionControl

export function initSelectionControl() {
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

export function hardRefreshLabelTogglePanel() {
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
    let json, obj;
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

export function updateSelectID() {
  $("#selectID").val(selection.getId());
}
export function onSelectIDChanged() {
  let id = $("#selectID").val().trim();
  selection.select(videoControl.getCurrentFrame(), id);
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

export function updateEventTree(obs) {
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
export function updateForm(activeObject) {
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

    let w = activeObject.width;
    let h = activeObject.height;
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
 * VIEW: the panels that show the selection (delete button, form, chronogram, ID field, new-rect button, zoom). It reads
 * `selection` and fabric's active rectangle and changes neither. `activateSelection` and `hardRefresh` run it.
 */
export function updateSelectionPanels() {
  updateDeleteButton();
  updateForm(overlay.getActiveRect());
  updateChronoSelection();
  if (selection.getId() != null) updateSelectID(); // the field keeps its text after an explicit deselect
  updateFormButtons();
  if (typeof zoomOverlay !== "undefined") zoomOverlay.refreshFromSelection(); // not created before initZoomView
}
export function updateDeleteButton() {
  if (overlay.getActiveRect() === null) {
    $("#deleteButton").addClass("disabled");
  } else {
    $("#deleteButton").removeClass("disabled");
  }
}

/* Labels Control */

// The label helpers (labelMap, toLabelArray, hasLabel, ...) are in annotation/Labels.js,
// exposed by labelbeeBridge.js (ADR 0008 step 2).

/* Labels GUI */

export function labelsProcessKey(key) {
  let item = labelButtonsArray.find( item => item.accesskey==key )
  if (!item) return false;
  labelToggle(item.label)
  return true
}

// If labels changed from buttons
export function onLabelToggled(event) {
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



// Angle of the selected observation (buttons of the Bounding Box Angle panel; the toggle "Disable Angle Control" is an overlay
// option, `overlay.opts.angleEnabled`)
export function onClickResetAngle() {
  console.log("onClickResetAngle");

  var activeObject = overlay.getActiveRect();
  if (activeObject == null) {
    console.log("onClickResetAngle: aborted, could not get an activeObject");
    return;
  }
  storeUnit(activeObject, { angle: 0 });
  refresh.overlayUpdate(); // the chronogram does not read the angle
  refresh.form();
}
export function onClickAngleFromTag() {
  console.log("onClickAngleFromTag");

  var activeObject = overlay.getActiveRect();
  if (activeObject == null) {
    console.log("onClickAngleFromTag: could not get an activeObject. abort.");
    return;
  }

  const tag = getCurrentTag();
  if (tag == null) {
    console.log("onClickAngleFromTag: tag not defined for current event. abort.");
    return;
  }

  storeUnit(activeObject, { angle: tagAngle(tag) });
  refresh.overlayUpdate();
  refresh.form();
}

export function updateAnnotationStatistics() {
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
// Entry points of the refresh (ADR 0009): the log sees every call, from this module and from the classic scripts
updateForm = instrument("form", "updateForm", updateForm);
updateEventTree = instrument("form", "updateEventTree", updateEventTree);
updateSelectID = instrument("form", "updateSelectID", updateSelectID);
updateFormButtons = instrument("form", "updateFormButtons", updateFormButtons);
updateDeleteButton = instrument("form", "updateDeleteButton", updateDeleteButton);
