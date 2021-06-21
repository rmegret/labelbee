/*jshint esversion: 6, asi: true */

// ## VideoList
// Video List: selection, metainformation, loading

// export ...

var videoinfo;

class VideoManager {
  constructor() {
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
    for (let videoname of defaultVideoList) {
      videoListTable.push(this.videonameToTable(videoname));
    }
    videoListCurrentID = 0;

    this.updateVideoListForm();

    videoinfo = {
      name: "No video loaded",
      videofps: 20,
      realfps: 20,
      starttime: "2016-07-15T09:59:59.360",
      duration: 1 / 20,
      nframes: 1,
      frameoffset: 0,
      preview: {
        previewURL: undefined,
        previewInfoURL: undefined,
        previewTimescale: 1.0,
      },
    };
    this.updateVideoInfoForm();

    this.videoListFromServer("/data/videolist.csv", 1);

    this.filePicker = new FilePickerFromServerDialog();
    this.filePicker.initDialog({
      base_uri: url_for("/rest/config/videolist/"),
      fileLoadedCallback: function (file, content) {
        videoManager.setVideoListFromCSV(content, 0);
      },
      dialogName: "Load Video List from Server",
    });
  }

  /* I/O */
  loadVideoListFromFile(event, format) {
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
            "VideoManager::loadVideoListFromFile: ERROR, unknown format " +
              format
          );
          return;
      }
    };

    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(fileToRead);
  }

  videoListToCSV(videoListTable) {
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
  }

  saveVideoListToFile(format) {
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
  }

  setVideoList(_videoListTable, defaultvideoid) {
    let videoManager = this;

    videoListTable = _videoListTable;

    videoManager.updateVideoListForm();
    if (defaultvideoid == null) defaultvideoid = 0;
    videoManager.selectVideoByID(defaultvideoid);
  }

  setVideoListFromJSON(json, defaultvideoid) {
    var obs = JSON.parse(json);

    this.setVideoList(obs.data, defaultvideoid);
  }

  setVideoListFromCSV(csv_data, defaultvideoid) {
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
  }

  videoListFromServer(path, defaultvideoid) {
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
  }

  checkVideoList() {
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
  }

  updateVideoListForm() {
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
  }

  updateVideoSelectbox() {
    var selectbox = $("#selectboxVideo");
    selectbox.find("option").remove();

    $.each(videoListTable, function (i, el) {
      selectbox.append(
        "<option value='data/" + el.video + "'>" + el.video + "</option>"
      );
    });
  }

  updateVideoListSelection() {
    var id = videoListCurrentID;
    $("#videoList tr.selected").removeClass("selected");
    $("#videoList tr:nth-child(" + (id + 2) + ")").addClass("selected"); // jQuery index starts at 1 + 1 row for table headers

    $("#selectboxVideo").prop("selectedIndex", id);
  }

  onSelectboxVideoChanged() {
    let id = $("#selectboxVideo").prop("selectedIndex");
    this.selectVideoByID(id);
  }

  prefillVideoFields() {
    if (videoListTable == null) return;
    if (videoListTable[videoListCurrentID] == null) return;

    let tagfile = videoListTable[videoListCurrentID].tags;
    if (tagfile != null) {
      tagfile = "/data/" + tagfile;
    } else {
      tagfile = undefined;
    }
    videoinfo.tags = { videoTagURL: tagfile };
  }

  videonameToURL(videoname) {
    return url_for("/data/" + videoname);
  }

  selectVideoByID(id) {
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
  }

  selectVideoFromList(target) {
    var id = Number($(target).attr("data-arrayindex"));
    console.log("selectVideoFromList: data-arrayindex=", id);
    this.selectVideoByID(id);
  }

  videonameToTable(videoname) {
    let path = videoname.split("/");
    let name = path[path.length - 1].replace(/\.[^/.]+$/, "");
    path[path.length - 1] = "Tags-" + name;
    let tagname = path.join("/");
    return {
      video: videoname,
      preview: videoname + "preview.mp4",
      tags: tagname,
    };
  }

  /* Update Video List */
  addVideoToList(videoname) {
    videoListTable.push(this.videonameToTable(videoname));
    this.updateVideoListForm();
    this.selectVideoByID(videoListTable.length - 1);
  }

  addVideoClick() {
    var videoname = prompt(
      "Add video to the list and select it:\n\nEnter video filename\n/data/ will be prefixed to its name",
      "vlc1.mp4"
    );

    if (videoname == null || videoname == "") {
      console.log("addVideoClick: no video name entered");
    } else {
      this.addVideoToList(videoname);
    }
  }

  // ## Video custom metadata
  changeStartTime(event) {
    console.log("changeStartTime", event);

    var d = new Date(event.target.value);
    videoinfo.starttime = d.toISOString();

    updateChronoXDomainFromVideo();
    drawChrono();
  }

  changeVideoFPS(event) {
    console.log("changeVideoFPS", event);

    videoinfo.videofps = Number(event.target.value);
    //video2.frameRate = videoinfo.videofps // Now handled by videoControl
    videoControl.onVideoInfoChanged(); // Force recomputation of various parameters: nframes...
  }

  changeFPS(event) {
    console.log("changeFPS (real)", event);

    videoinfo.realfps = Number(event.target.value);
    updateChronoXDomainFromVideo(); // Change the real timeline
    drawChrono();
  }

  changeFrameOffset(event) {
    console.log("changeFrameOffset (real)", event);

    videoinfo.frameoffset = Number(event.target.value);
    videoControl.onVideoInfoChanged(); // Force recomputation of various parameters: nframes...
  }

  updateVideoInfoForm() {
    $("#videofps").val(videoinfo.videofps);
    $("#realfps").val(videoinfo.realfps);
    $("#startTime").val(videoinfo.starttime);
    $("#videoTagsFamily").val(videoinfo.tagsfamily);
    $("#videoPlace").val(videoinfo.place);
    $("#videoComments").text(videoinfo.comments);
  }
}
