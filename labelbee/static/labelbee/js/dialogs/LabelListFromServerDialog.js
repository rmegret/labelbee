/*jshint esversion: 6, asi: true */
import { url_for } from "../core/Utils.js"
import { hardRefreshLabelTogglePanel } from "../form/Form.js"

// The dialog that lists the label lists of the server and loads one (`/rest/config/labellist/`) (ES module, refactor slice 8 step 13c, ADR 0015), moved unchanged from AnnotationIO.js.
// The instance is `window.labelListFromServerDialog` (the button of the page and the dialogs it builds call its methods from inline handlers),
// built by `initLabelListFromServerDialog`. Sets `window.labelButtonsArray` (declared by form/Form.js).

// Formerly implicit globals (temporaries of the callbacks), module scope as before
let html, success

// Server I/O

function LabelListFromServerDialog() {
  var theDialog = this;
  this.div = $("#dialog-labellist-from-server");
  var div = this.div;

  if (!div.length) {
    console.log(
      "LabelListFromServerDialog: ERROR, could not find #dialog-labellist-from-server"
    );
  }

  this.updateDialog = function (uri) {
    var route = "/rest/config/labellist/"; // Hardcoded

    console.log(
      "LabelListFromServerDialog: importing labellist from URL '" +
        route +
        "'..."
    );

    if (!!uri) {
      route = uri;
    }

    var data = { format: "json" };
    $.ajax({
      url: url_for(route),
      type: "GET",
      contentType: "application/json",
      data: data,
      success: function (json) {
        // Get the file list in JSON format

        console.log(
          "LabelListFromServerDialog: ajax SUCCESS\nlabellist=",
          json
        );
        theDialog.json = json;

        let html = "";
        for (let item of json.files) {
          html +=
            '<button onclick="labelListFromServerDialog.onClickFile(' +
            "'" +
            item["uri"] +
            "'" +
            ')">' +
            item["filename"] +
            "</button> <br>";
        }

        for (let item of json.dirs) {
          html +=
            '<button onclick="labelListFromServerDialog.onClickDir(' +
            "'" +
            item["uri"] +
            "'" +
            ')">' +
            item["filename"] +
            "</button> <br>";
        }

        div.find(".modal-body").html(html);
        div.find(".modal-message").html("");

        // Nothing else to do here:
        // The modal #loadTracksFromServerDialog is supposed to be open
        // and filled with links to each Track file
        // Clicking on one of the link will trigger eventsFromServer()
      },
      error: typesetAjaxError(
        "ERROR in LabelListFromServerDialog dialog",
        function (html) {
          div.find(".modal-message").html(html);
        }
      ),
    });
  };
  this.openDialog = function () {
    console.log("LabelListFromServerDialog.openDialog");

    div.find(".modal-body").html("[...]");
    div
      .find(".modal-message")
      .html(
        "<div>Loading labelList file list from server. Please wait...</div>"
      );

    div.modal("show");
    //        div.dialog("open");

    this.updateDialog();
  };
  this.initDialog = function () {
    //           div.dialog({
    //             autoOpen: false,
    //             modal: false,
    //             buttons: {
    //                 "Cancel": function() {
    //                     $(this).dialog("close");
    //                 }
    //             },
    //             open: function(){
    //                 $("body").css("overflow", "hidden");
    //             },
    //             close: function(){
    //                 $("body").css("overflow", "auto");
    //             }
    //         });

    theDialog.diruri = "";

    div.modal({
      show: false,
      autoOpen: false,
      modal: true,
      open: function () {
        $("body").css("overflow", "auto");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });
    div.find(".modal-dialog").draggable({
      handle: ".modal-header",
    });
    div.find(".modal-content").resizable({
      alsoResize: ".modal-content",
      minHeight: 300,
      minWidth: 300,
    });
  };
  this.closeDialog = function () {
    div.modal("hide");
    //div.dialog("close");
  };

  this.onClickFile = function (url) {
    console.log(
      "labelListFromServerDialog: importing labelList from URL '" + url + "'..."
    );

    div.find(".modal-message").html("Loading labels from " + url + "...");

    labelListFromServer(url).then(function () {
      div.find(".modal-message").html("Labels loaded. Closing.");
      theDialog.closeDialog();
    });
  };
  this.onClickDir = function (uri) {
    console.log("labelListFromServerDialog::onClickDir: going to " + uri);

    this.updateDialog(uri);
  };

  this.initDialog();
}

function labelListFromServer(url) {
  console.log(
    "labelListFromServer: importing labelList from URL '" + url + "'..."
  );

  return $.ajax({
    url: url, //server url
    type: "GET", //passing data as post method
    contentType: "application/json", // returning data as json
    data: "",
    success: function (obj) {
      console.log("labelListFromServer: SUCCESS\nobj=", obj);
      //let obj = JSON.parse(json);

      if (!obj || !obj.labelButtonsArray) {
        console.log("labelListFromServer: could not parse JSON. Abort.");
        return false;
      }

      console.log("labelListFromServer: updating labelButtonsArray...");
      window.labelButtonsArray = obj.labelButtonsArray;

      console.log("labelListFromServer: hardRefreshLabelTogglePanel...");
      hardRefreshLabelTogglePanel();

      //$('#loadTracksFromServerDialog').modal('hide');
    },
    error: showAjaxError("labelListFromServer: ERROR"),
  });
}

export function initLabelListFromServerDialog() {
  window.labelListFromServerDialog = new LabelListFromServerDialog();
}
