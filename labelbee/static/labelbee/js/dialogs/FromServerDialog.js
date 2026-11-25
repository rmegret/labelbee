/*jshint esversion: 6, asi: true */
import { loadEventsFromServerByID } from '../commands/LoadFromServer.js';
// The dialog that lists the annotation files of the database (recent events or tags, advanced search, metadata) and loads one (ES module, refactor slice 8 step 13c, ADR 0015), moved unchanged from AnnotationIO.js.
// The instance is `window.fromServerDialog` (read by commands/LoadFromServer.js, core/Alerts.js, video/VideoControl.js, video/VideoList.js, the
// page and the dialogs it builds from inline handlers), built by `initFromServerDialog`.

// Formerly implicit globals (temporaries of the callbacks), module scope as before
let html, idx, buttonHTML, success, fileData

/* REST API Tracks files */

function FromServerDialog() {
  var theDialog = this;
  this.div = $("#from-server-dialog");
  var div = this.div;
  this.dataType = null;

  this.setTitle = function(html){
    div.find(".modal-title").html(html);
    return
  }

  this.setCheckboxes = function(html){
    div.find(".checkboxes").html(html);
    return
  }

  this.setBody = function(html){
    div.find(".modal-body").html(html);
    return
  }

  this.setMessage = function(color, html){
    div.find(".modal-message").css("color",color);
    div.find(".modal-message").html(html);
    return
  }

  this.resetAllHTML = function(){
    this.setTitle("");
    this.setCheckboxes("");
    this.setMessage("black","");
    this.setBody("");
  }

  this.openDialog = function(){
    div.modal("show");
  }

  this.closeDialog = function () {
    div.modal("hide");
  };

  this.openRecentLoadingDialog = function(data_type){
    // videoManager.currentVideoID = 9371; // ONLY FOR DEV PURPOSES! COMMENT WHEN DEPLOYING TO LIVE SERVICE
    this.data_type = data_type;
    this.resetAllHTML();
    this.setTitle("Most recent " + data_type + " file for " + getVideoInfo().videoPath);
    let checkboxHTML = 
    '<label>'+ 
    '<input type="checkbox" id="showAdvancedMenu" onclick="fromServerDialog.showAdvancedLoadingDialog(false)">'+ 
    'Show advanced loading menu </label> <br>' + 
    "Select type of event: <select id='DropdownElement' onchange='fromServerDialog.openRecentLoadingDialog(this.value);'>" +
    "<option value='tag'>tag</option>" +
    "<option value='event'>event</option>" +
    "</select>";
    this.setCheckboxes(checkboxHTML);
    div.find("#showAdvancedMenu").prop('checked', false);
    div.find('#DropdownElement').val(data_type);
    this.setBody("[...]")
    this.setMessage("black", "Loading most recent " + data_type + " file information. Please wait...");
    
    if (!videoManager.currentVideoID){
      this.resetAllHTML();
      this.setTitle("No video loaded!");
      this.setMessage("red", "No video has been selected. Please select a video before attempting to load tag/event files.");
      this.openDialog();
      return
    }

    // Display Modal
    this.openDialog();

    // Load first tag/event file information through GET request
    $.ajax({
      url: url_for("api/v1/annotations"),
      method: 'get',
      data: {video_id : videoManager.currentVideoID, data_type: data_type}, 
      dataType: 'json',
      error: typesetAjaxError(
        "ERROR in FromServerDialog.openRecentLoadingDialog",
        function (html) {
          theDialog.setMessage("red", html)
        }
      ),
      success: function(json){
          console.log("FromServerDialog.openRecentLoadingDialog: (ajax) Load most recent "+ data_type +"file from server: Success", json);
          theDialog.json = json["data"];
          let html = "";
          html +=
          "<table id='RecentFromServerTable' style='width:100%'><thead>" +
          "<th>File Name</th>" +
          "<th>Created on</th>" +
          "<th>Owner</th>";
          html += "</thead><tbody>";
          fileData = json["data"][0];
          if (fileData == null){
            fromServerDialog.setMessage("red","Current user has not recently opened any " + data_type + " files for the current video.\
            \nUse the advanced loading menu to load a file.");
             return
          }
          html +=
            '<tr data-row="' +
            0 +
            '">' +
            "<td>" +
            fileData["file_name"] +
            "</td>" +
            "<td>" +
            fileData["timestamp"].split("T").join(' ') +
            "</td>" +
            "<td>" +
            '['+fileData["created_by_id"]+'] ' + fileData["created_by"] +
            "</td>";
          html += "</tr>";
          html += "</tbody></table><br>";
          html += "<h4>Do you wish to load this " + data_type + " file?</h4>";
          html += '<button onclick="fromServerDialog.loadEvents(\'0\')" class="btn btn-success btn-lg">Yes</button> '
          html += '<button type="button" class="btn btn-danger btn-lg" data-dismiss="modal">No</button>';
          html += "<br><br><h4>WARNING: If another " + data_type + " file is currently loaded, unsaved changes may be lost.<h4>";
          
          // Display table with file information
          theDialog.setBody(html);

          // Reset message
          theDialog.setMessage("black", "");
      }
    });
  }

  this.showAdvancedLoadingDialog = function(allusers) {
    this.resetAllHTML();
    this.setTitle("Advanced " + this.data_type + " loading menu for " + getVideoInfo().videoPath);
    let checkboxHTML = 
    '<label> '+ 
    '<input type="checkbox" id="showAdvancedMenu" onclick="fromServerDialog.openRecentLoadingDialog(\''+ this.data_type +'\');"> '+ 
    'Show advanced loading menu</label> &nbsp; &nbsp;' +
    '<label>'+ 
    '<input type="checkbox" id="showAllUsers" onclick="fromServerDialog.showAdvancedLoadingDialog'
    if (allusers){
      checkboxHTML += '(false);"> ' 
    }
    else{
      checkboxHTML += '(true);"> ' 
    }
    checkboxHTML += 'Show files from all users</label> <br>' +
    "<label>Select type of event: </label> &nbsp; <select id='DropdownElement' "+
    "onchange='fromServerDialog.data_type = this.value; fromServerDialog.showAdvancedLoadingDialog(false);'>" +
        "<option value='tag'>tag</option>" +
        "<option value='event'>event</option>" +
      "</select>";  
    this.setCheckboxes(checkboxHTML);
    div.find("#showAdvancedMenu").prop('checked', true);
    if (allusers){
      div.find("#showAllUsers").prop('checked', true);
    }
    div.find('#DropdownElement').val(this.data_type);

    // Loading video tag/event data
    // GET request that sends a video ID and data_type to receive a json
    // json includes information about all event files related to the current video 
    // videoID obtained from URL as GET parameter, dataType entered as argument when called in labelbee_page.html
    $.ajax({
      url: url_for("api/v1/annotations"),
      method: 'get',
      data: {video_id : videoManager.currentVideoID, data_type: theDialog.data_type, allusers: allusers}, 
      dataType: 'json',
      error: typesetAjaxError(
        "ERROR in EventsFromServer dialog",
        function (html) {
          theDialog.setMessage(html);
        }
      ),
      success: function(json){
      theDialog.json = json["data"];
      console.log("fromServerDialog: (ajax) Load "+ theDialog.data_type + "files data from server: Success", json);
        html =
        "<table id='TagOrEventFileListFromServer' style='width:100%'>" +
        "<thead>" +
        "<th></th>" +
        "<th>File Name</th>" +
        "<th>Created on</th>" +
        "<th>Owner</th></thead>" +
        "</table>";
        html += "<br><br><h4>WARNING: If another " + theDialog.data_type + " file is currently loaded, unsaved changes may be lost.<h4>";
        // console.log("HTML produced from database response:\n", html);
        
        // Creating table with only headers
        theDialog.setBody(html);
        theDialog.setMessage("");
        // Filling empty table using data from json
        idx = 0
        div.find("#TagOrEventFileListFromServer").DataTable({
          data: json["data"],
          columns:[
            {data:"id", render: function(id){
              var tag_event_ID = theDialog.json[idx]?.["id"];
              buttonHTML = '<button onclick="fromServerDialog.loadEvents(\''+idx+'\')" class="small">Load #'+tag_event_ID+'</button>';
              idx += 1;
              return buttonHTML;
            }},
            {data:"file_name"},
            {data:"timestamp", render: function(timestamp){
              return timestamp.split('T').join(' ');
            }},
            {data:"created_by", render:function(created_by, type, full){
              return '[' + full.created_by_id + '] ' + created_by;
            }}
          ]
        });
      }
    });
  };
  this.initDialog = function () {
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

  this.loadEvents = function (k) {
    console.log(theDialog.json);
    var tag_event_ID = theDialog.json[k]["id"];
    //MODIFY CONSOLE MESSAGE DEPENDING ON FILE
    console.log("RecentTagOrEventFromServerDialog: importing " + this.dataType + "s from database for file ID '" + tag_event_ID + "'...");
    
    div.find(".modal-message h4").css("color","black");
    div.find(".modal-message h4").html("Loading " + this.dataType + "s from database for file ID " + tag_event_ID + "...");
    // Load tag or event file
    if(this.data_type== "tag"){      // Case: tag file
      success = tagsFromServer(tag_event_ID);
      if(success){
        div.find(".modal-message h4").css("color","black");
        div.find('.modal-message h4').html("Tags loaded successfully.")        
      }
      else{
        div.find(".modal-message h4").css("color","red");
        div.find('.modal-message h4').html("ERROR <br> loadTags: Invalid tag information obtained from server.")
      }
    }
    else{                           // Case: event file
      // The request, the loading and the error message (shown here, the dialog is open) are the command's
      loadEventsFromServerByID(tag_event_ID).then(
        function () {
          theDialog.setMessage("black", "Events loaded.");
        },
        function () {}  // already told by the command (core/Alerts.js)
      );
    }
  };
  this.clickedShowMetadata = function () {
    this.updateDialog();
  };
  this.showMetadata = function (k) {
    var data = theDialog.json[k]["metadata"];
    var html = JSON.stringify(data, undefined, 2);
    html = '<pre class="json">' + html + "</pre>";
    div.find(".modal-message").html(html);
  };
  this.initDialog();
}

export function initFromServerDialog() {
  window.fromServerDialog = new FromServerDialog();
}
