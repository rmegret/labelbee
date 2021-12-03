/*jshint esversion: 6, asi: true */

// ## VideoList
// Video List: selection, metainformation, loading

// export ...

var videoinfo;

function VideoManager() {
  const videoManager = this;
  
  document
    .getElementById("loadvideolistjson")
    .addEventListener("change", (evt) =>
      this.loadVideoListFromFile(evt, "json")
    );
  document
    .getElementById("loadvideolistcsv")
    .addEventListener("change", (evt) =>
      this.loadVideoListFromFile(evt, "csv")
    );

  let defaultVideoList = [
    "DefaultList",
    "testvideo.mp4",
    "vlc1.mp4",
    "vlc2.mp4",
    "1_02_R_170419141405.mp4",
    "1_02_R_170426151700_cleaned.mp4",
    "36_01_H_160715100000_copy.mp4",
    "GuraboTest/4_02_R_170511130000.mp4",
    "2017-06-Gurabo/2_02_R_170609100000.mp4",
    "2_02_R_170609100000.mp4",
  ];

  videoListTable = [];
  // for (let videoname of defaultVideoList) {
  //   videoListTable.push(this.videonameToTable(videoname));
  // }
  videoListCurrentID = 0;

  this.updateVideoListForm();

  videoinfo = {
    name: "No video loaded",
    videofps: 20, // Should be equal to realfps (unless broken encoder)
    realfps: 20, //realfps = 20.0078;
    starttime: "2016-07-15T09:59:59.360",
    duration: 1 / 20, // Duration in seconds
    nframes: 1,
    frameoffset: 0,
    preview: {
      previewURL: undefined,
      previewInfoURL: undefined,
      previewTimescale: 1.0,
    },
  };
  this.updateVideoInfoForm();

  // this.videoListFromServer("/data/videolist.csv", 1);

  this.filePicker = new FilePickerFromServerDialog();
  this.filePicker.initDialog({
    base_uri: url_for("/rest/config/videolist/"),
    fileLoadedCallback: function (file, content) {
      videoManager.setVideoListFromCSV(content, 0);
    },
    dialogName: "Load Video List from Server",
  });
}

VideoManager.prototype = {};

/* I/O */

VideoManager.prototype.addDefaultVideo = function (videoname, tagname) {
  console.log("setting default video");
  videoListTable.push({
    video: videoname,
    preview: videoname + "preview.mp4",
    tags: tagname,
  });
  this.updateVideoListForm();
  this.updateVideoInfoForm();
};

VideoManager.prototype.loadVideoListFromFile = function (event, format) {
  console.log("loadVideoListFromFile: importing from...");

  const fileToRead = event.target.files[0];
  event.target.value = ""; // Reinit value to allow loading same file again

  if (!fileToRead) {
    console.log("loadVideoListFromFile: Canceled by user."); 
    return;
  }
  console.log("loadVideoListFromFile: importing from file:", fileToRead);

  if (!format) {
    format = "csv";
  }

  var onReaderLoad = function (event) {
    if (logging.io) {
      console.log(event.target.result);
    }

    switch (format) {
      case "json":
        var json = event.target.result;
        videoManager.setVideoListFromJSON(json);
        break;
      case "csv":
        var txt = event.target.result;
        videoManager.setVideoListFromCSV(txt);
        break;
      default:
        console.log(
          "VideoManager::loadVideoListFromFile: ERROR, unknown format " + format
        );
        return;
    }
  };

  var reader = new FileReader();
  reader.onload = onReaderLoad;
  reader.readAsText(fileToRead);
};

VideoManager.prototype.videoListToCSV = function (videoListTable) {
  var fields = ["video", "preview", "tags"];

  var csv = fields.join(",");
  if (videoListTable == null) return csv;
  for (let item of videoListTable) {
    out = [];
    for (let i in fields) {
      out.push(item[fields[i]]);
    }
    csv += "\n" + out.join(",");
  }
  return csv;
};

VideoManager.prototype.saveVideoListToFile = function (format) {
  if (format == null) format = "json";

  switch (format) {
    case "json":
      var obj = {
        schema:
          "https://bigdbee.hpcf.upr.edu/schemas/videolist-0-0-1.schema.json",
        info: { type: "videolist" },
        data: videoListTable,
      };
      saveObjToJsonFile(obj, "videolist-" + getTimestampNow() + ".json");
      break;
    case "csv":
      var txt = this.videoListToCSV(videoListTable);
      saveCSVToFile(txt, "videolist-" + getTimestampNow() + ".csv");
      break;
    default:
      console.log(
        "VideoManager::saveVideoListToFile: ERROR, unknown format" + format
      );
      return;
  }
};

VideoManager.prototype.setVideoList = function (
  _videoListTable,
  defaultvideoid
) {
  let videoManager = this;

  videoListTable = _videoListTable;

  videoManager.updateVideoListForm();
  if (defaultvideoid == null) defaultvideoid = 0;
  videoManager.selectVideoByID(defaultvideoid);
};

VideoManager.prototype.setVideoListFromJSON = function (json, defaultvideoid) {
  var obs = JSON.parse(json);

  this.setVideoList(obs.data, defaultvideoid);
};

VideoManager.prototype.setVideoListFromCSV = function (
  csv_data,
  defaultvideoid
) {
  let array = $.csv.toArrays(csv_data);
  console.log("videolist converted to array: ", array);

  var obj = []; // videoListTable
  for (let item of array) {
    if (item.length == 0) continue;
    if (item[0] == "video") {
      // This is the header, skip it...
      continue;
    }
    if (item[1]) {
      $("#previewVideoName").val(item[1]);
      $("#previewVideoTimeScale").val("1");
    }
    let tmp = { video: item[0], preview: item[1], tags: item[2] };
    obj.push(tmp);
  }

  this.setVideoList(obj, defaultvideoid);
};

VideoManager.prototype.videoListFromServer = function (path, defaultvideoid) {
  let videoManager = this;

  if (!path) {
    var userpath = window.prompt(
      "Please enter path for Video List (server)",
      "/data/videolist.csv"
    );
    if (userpath == null || userpath == "") {
      console.log("videoListFromServer: canceled");
      return;
    }

    path = userpath;
  }

  console.log('videoListFromServer: loading path "' + path + '"...');
  statusWidget.statusRequest("videolistLoad", true, "");

  $.ajax(url_for(path), function (data) {
    console.log('videoListFromServer: loaded "' + path + '"');
  })
    .done(function (data) {
      if (logging.videoList) {
        console.log("videolist CSV content = ", { data: data });
      }

      videoManager.setVideoListFromCSV(data, defaultvideoid);

      statusWidget.statusUpdate("videolistLoad", true, "");
    })
    .fail(function (data) {
      console.log('videoListFromServer: ERROR loading "' + path + '"');
      statusWidget.statusUpdate("videolistLoad", false, "");
    });
};

VideoManager.prototype.checkVideoList = function () {
  console.log("checkVideoList");

  let videoManager = this;

  // Check if an URL is valid
  // Returns a Promise the resolves or rejects the URL
  function checkURL(url) {
    if (logging.videoList) console.log("Checking ", url);
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "head",
        credentials: "same-origin",
        mode: "no-cors",
      })
        .then(function (response) {
          if (logging.videoList) console.log("fetch(", url, ") =>", response);
          if (response.status == 200) {
            resolve();
          } else {
            reject();
          }
        })
        .catch(function (error) {
          if (logging.videoList) console.log("fetch(", url, ") =>", error);
          reject();
        });
    });
  }

  let count = videoListTable.length;
  for (var i = 0; i < videoListTable.length; i++) {
    let itemToUpdate = videoListTable[i];

    let videoname = videoListTable[i].video;
    itemToUpdate.checked = "requested";
    let url = videoManager.videonameToURL(videoname);
    checkURL(url)
      .then(function () {
        itemToUpdate.checked = true;
      })
      .catch(function () {
        itemToUpdate.checked = false;
      })
      .finally(function () {
        videoManager.updateVideoListForm();
      });

    let tagname = videoListTable[i].tags;
    itemToUpdate.tagsChecked = "requested";
    let urlTag = videoManager.videonameToURL(tagname);
    checkURL(urlTag)
      .then(function () {
        itemToUpdate.tagsChecked = true;
      })
      .catch(function () {
        itemToUpdate.tagsChecked = false;
      })
      .finally(function () {
        videoManager.updateVideoListForm();
      });
  }
};

VideoManager.prototype.updateVideoListForm = function () {
  let videoManager = this;

  var html = "";
  html +=
    "<tr>" +
    "<td>#</td>" +
    "<td>video</td>" +
    "<td>mp4</td>" +
    "<td>tags</td>" +
    "</tr>\n";

  for (var i = 0; i < videoListTable.length; i++) {
    let checkStr = htmlCheckmark(videoListTable[i].checked);
    let tagCheckStr = htmlCheckmark(videoListTable[i].tagsChecked);
    let videoname = videoListTable[i].video;
    let url = videoManager.videonameToURL(videoname);
    let color = "black";
    if (videoListTable[i].checked === true) color = "green";
    if (videoListTable[i].checked === false) color = "red";

    html +=
      "<tr>" +
      "<td><input type='button' data-arrayIndex='" +
      i +
      "' onclick='videoManager.selectVideoFromList(this)' class='btn btn-default btn-xs glyph-xs' value='" +
      (i + 1) +
      "'></button>" +
      "</td>" +
      "<td>" +
      videoListTable[i].video +
      "</td>" +
      "<td><a target='_blank' href='" +
      url +
      "'><span class='glyphicon glyphicon-link' style='color:" +
      color +
      "'></span></a>" +
      checkStr +
      "</td>" +
      "<td>" +
      tagCheckStr +
      "</td>" +
      "</tr>";
  }
  html +=
    '<tr><td><button value="Add video to list" onclick="videoManager.addVideoClick()" type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-plus-sign"></span></button></td><td></td></tr>';

  $("#videoList").html(html);

  this.updateVideoSelectbox();
  this.updateVideoListSelection();
};
VideoManager.prototype.updateVideoSelectbox = function () {
  var selectbox = $("#selectboxVideo");
  selectbox.find("option").remove();

  $.each(videoListTable, function (i, el) {
    selectbox.append(
      "<option value='data/" + el.video + "'>" + el.video + "</option>"
    );
  });
};
VideoManager.prototype.updateVideoListSelection = function () {
  var id = videoListCurrentID;
  $("#videoList tr.selected").removeClass("selected");
  $("#videoList tr:nth-child(" + (id + 2) + ")").addClass("selected"); // jQuery index starts at 1 + 1 row for table headers

  $("#selectboxVideo").prop("selectedIndex", id);
};

VideoManager.prototype.onSelectboxVideoChanged = function () {
  let id = $("#selectboxVideo").prop("selectedIndex");
  this.selectVideoByID(id);
};
VideoManager.prototype.prefillVideoFields = function () {
  if (videoListTable == null) return;
  if (videoListTable[videoListCurrentID] == null) return;

  let tagfile = videoListTable[videoListCurrentID].tags;
  if (tagfile != null) {
    tagfile = "/data/" + tagfile;
  } else {
    tagfile = undefined;
  }
  videoinfo.tags = { videoTagURL: tagfile };
};
VideoManager.prototype.videonameToURL = function (videoname) {
  return url_for("/data/" + videoname);
};
VideoManager.prototype.selectVideoByID = function (id) {
  id = Number(id);
  if (id >= videoListTable.length || id < 0) {
    throw "selectVideobyID: invalid id, id=" + id;
  }
  videoListCurrentID = id;

  this.prefillVideoFields();
  this.updateVideoListSelection();

  let url = this.videonameToURL(videoListTable[videoListCurrentID].video);

  videoControl.loadVideo(url);

  // Change handled in callback onVideoLoaded
};
VideoManager.prototype.selectVideoFromList = function (target) {
  var id = Number($(target).attr("data-arrayindex"));
  console.log("selectVideoFromList: data-arrayindex=", id);
  this.selectVideoByID(id);
};

VideoManager.prototype.videonameToTable = function (videoname) {
  let path = videoname.split("/");
  let name = path[path.length - 1].replace(/\.[^/.]+$/, "");
  path[path.length - 1] = "Tags-" + name;
  let tagname = path.join("/");
  return {
    video: videoname,
    preview: videoname + "preview.mp4",
    tags: tagname,
  };
};

/* Update Video List */
VideoManager.prototype.addVideoToList = function (videoname) {
  videoListTable.push(this.videonameToTable(videoname));
  this.updateVideoListForm();
  this.selectVideoByID(videoListTable.length - 1);
};
VideoManager.prototype.addVideoClick = function () {
  var videoname = prompt(
    "Add video to the list and select it:\n\nEnter video filename\n/data/ will be prefixed to its name",
    "vlc1.mp4"
  );

  if (videoname == null || videoname == "") {
    console.log("addVideoClick: no video name entered");
  } else {
    this.addVideoToList(videoname);
  }
};

// ## Video custom metadata

VideoManager.prototype.changeStartTime = function (event) {
  console.log("changeStartTime", event);

  var d = new Date(event.target.value);
  videoinfo.starttime = d.toISOString();

  updateChronoXDomainFromVideo();
  drawChrono();
};
VideoManager.prototype.changeVideoFPS = function (event) {
  console.log("changeVideoFPS", event);

  videoinfo.videofps = Number(event.target.value);
  //video2.frameRate = videoinfo.videofps // Now handled by videoControl
  videoControl.onVideoInfoChanged(); // Force recomputation of various parameters: nframes...
};
VideoManager.prototype.changeFPS = function (event) {
  console.log("changeFPS (real)", event);

  videoinfo.realfps = Number(event.target.value);
  updateChronoXDomainFromVideo(); // Change the real timeline
  drawChrono();
};
VideoManager.prototype.changeFrameOffset = function (event) {
  console.log("changeFrameOffset (real)", event);

  videoinfo.frameoffset = Number(event.target.value);
  videoControl.onVideoInfoChanged(); // Force recomputation of various parameters: nframes...
};

VideoManager.prototype.updateVideoInfoForm = function () {
  $("#videofps").val(videoinfo.videofps);
  $("#realfps").val(videoinfo.realfps);
  $("#startTime").val(videoinfo.starttime);
  $("#videoTagsFamily").val(videoinfo.tagsfamily);
  $("#videoPlace").val(videoinfo.place);
  $("#videoComments").text(videoinfo.comments);
};

VideoManager.prototype.videoListFromDB = function () {
  this.div = $("#from-server-dialog");
  var div = this.div;
  console.log("VideoManager.videoListFromDB: Loading video list from server.")

  // Initializing modal
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
    div.find(".modal-title").html("Load Video");
    div.find(".modal-body").html("[...]");

    div.find(".modal-message h4").css("color","black");
    div.find(".modal-message h4")
      .html("<div>Loading video list from server. Please wait...</div>");
  };
  this.initDialog();
  // Producing video list table
  this.receivedVideoSelection();
  div.modal("show");

}

VideoManager.prototype.receivedVideoSelection = async function(){
  var div = this.div
  $.ajax({
    url: url_for("/rest/v2/videolist"),
    method: 'get',
    data: "", 
    dataType: 'json',
    error: function (){
        $(".modal-message h4").css("color","red");
        $(".modal-message h4").html("VideoManager.receivedVideoSelection ERROR: Unable to retrieve video list from server.");
      },
    success: function(json){
      console.log("VideoManager.receivedVideoSelection: Successfully loaded video list from server.")
      html =
      "<table id='VideoListFromServerTable' style='width:100%'>" +
      "<thead>" +
      "<th></th>" +
      "<th>File Name</th>" +
      "<th>Created on</th>" +
      "<th>Location</th></thead>" +
      "</table>";

      html += "<br><br><h4>WARNING: If another video is currently loaded, unsaved event/tag changes may be lost.<h4>";
      div.find(".modal-body").html(html);
      div.find(".modal-message h4").html("");

      div.find("#VideoListFromServerTable").DataTable({
        data: json["data"],
        columns:[
          {data:"id", render: function(id){
            return "<button onclick='videoManager.videoSelected("+id+")'>Load</button>";
          }},
          {data:"file_name"},
          {data:"timestamp", render: function(timestamp){
            return timestamp.split('T').join(' ');
          }},
          {data:"location"}
        ]
      });
    }
  });
}

VideoManager.prototype.videoSelected = async function(id) {
  this.currentVideoID = id;

  $.ajax({
    url: url_for("/rest/v2/get_video_info/" + id),
    method: 'get',
    data: "", 
    dataType: 'json',
    error: function (){
        console.log("VideoManager.videoSelected ERROR: Unable to retrieve " +
        "selected video's information from server.")
        this.div.find(".modal-message h4").css("color","red");
        this.div.find(".modal-message h4").html("VideoManager.videoSelected ERROR: Unable to retrieve " +
        "selected video's information from server.");
      },
    success: function(videoInfoJSON){
      console.log()
      videoManager.setVideoInfo(videoInfoJSON);
      console.log("VideoManager.videoSelected: Loaded video information: ", videoInfoJSON)
    }
  });
}

VideoManager.prototype.setVideoInfo = function(videoInfoJSON){
  videoinfo = {
    name: videoInfoJSON["name"],//"/webapp/data/datasets/gurabo10avi/mp4/col10/1_02_R_190718050000.mp4".split('/').pop(),
    videoPath: "/webapp/data/datasets/gurabo10avi/mp4/col10/1_02_R_190718050000.mp4",//videoInfoJSON["videoURL"],
    videofps: videoInfoJSON["videofps"],
    realfps: videoInfoJSON["realfps"],
    starttime: videoInfoJSON["starttime"],
    duration: videoInfoJSON["duration"],
    nframes: videoInfoJSON["nframes"],
    frameoffset: 0,
    preview: {
      previewURL: "",
      previewInfoURL: "",
      previewTimescale: 1.0
    },
    tagsfamily: "tag25h5",
    place: "",
    comments: ""
  }
  this.updateVideoInfoForm();
  updateChronoXDomainFromVideo();
  videoControl.loadVideo2(videoinfo.videoPath);
}


//"/mnt/storage/Gurabo/datasets/gurabo10avi/mp4/col10/1_02_R_190718050000.mp4"
//"/datasets/gurabo10avi/mp4/col10/1_02_R_190718050000.mp4"
//"https://bigdbee.hpcf.upr.edu/webapp-test/data/datasets/gurabo10avi/mp4/col10/1_02_R_190718050000.mp4"
//Received from flask(Used in url_for()):
//  "https://bigdbee.hpcf.upr.edu/"

//What I should receive from the endpoint:
//
//"1_02_R_190718050000.mp4"



//To implement recent video list:
  //Need to modify existing endpoint or create a new one that accepts multiple video IDs at the same time
  // and returns the meta information
  // 

// Simple information menu
// Id, file name, path, timestamp, colony, notes, dataset

// Advanced information
// Previous, plus frames, height, width, fps, realfps

// Information menu:
// Add button that shows raw or formatted information obtained from the endpoint

// For currently loaded video,
// Button/interface to be able to see all the meta information for currently selected video

// Combine recent and advanced tag/event loading menus, use checkbox to switch between them

// Remove V1 save tags/events buttons

// Erase events should reset basedon 
