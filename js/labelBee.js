/*jshint esversion: 6, asi: true */

////////////////////////////////////////////////////////////////////////////////
// Global variables
var canvas, canvas1, canvas2, ctx, ctx2, vid, play, radius = 5,
    dragging = false,
    time, final_id = 0;
bee = [0, 0]; //Global array that stores the value of x, y
g_activities = ["fanning", "pollenating", "entering", "exiting"]; //global string array of activities
var x, y, cx, cy, width, height;
var video, video2;
var Tracks = [];
var Tags = [];
var buttonManip;
var undo = new Observation(0);
var transformFactor = 1.0;
var vis;
var videoinfo;
var defaultSelectedBee;
var logging = {
  "rects": false,
  "frameEvents": false,
  "guiEvents": false,
  "submitEvents": false,
  "mouseEvents": false,
  "mouseMoveEvents": false,
  "keyEvents": false,
  "selectionEvents": false,
  "chrono": false,
  "videoEvents": false,
  "canvasEvents": false,
  "idPrediction": false,
  "axesEvents": false
};
var canvasTform = [0, 0, 1]; // cx,cy,scale
var plotTrack_range_backward = 5;
var plotTrack_range_forward = 5;
var flagCopyVideoToCanvas = true;

// ######################################################################
// INITITALIZATION

videoList = []
function initVideoSelectbox() {
    var selectbox = $("#selectboxVideo")
    selectbox.find('option').remove()

    $.each(videoList, function (i, el) {
        selectbox.append("<option value='data/"+el+"'>"+el+"</option>");
    });
}
function addVideoToList(videoname) {
    videoList.push(videoname)
    initVideoSelectbox()
    $('#selectboxVideo')[0].selectedIndex=videoList.length-1;
    selectVideo()
}
function addVideoClick() {
    var videoname = prompt("Add video to the list and select it:\n\nEnter video filename\ndata/ will be prefixed to its name", "vlc1.mp4");

    if (videoname == null || videoname == "") {
        console.log('addVideoClick: no video name entered')
    } else {
        addVideoToList(videoname)
    }
}

function init() {
    videoinfo = {
        'name': 'No video loaded',
        'videofps': 20, // Should be equal to realfps (unless broken encoder)
        'realfps': 20,  //realfps = 20.0078;
        'starttime': '2016-07-15T09:59:59.360',
        'duration': 1/20, // Duration in seconds
        'nframes': 1,
        'frameoffset':0
    };
    updateVideoInfoForm()
    
    videoList = ['testvideo.mp4','vlc1.mp4','vlc2.mp4','1_02_R_170419141405.mp4','1_02_R_170426151700_cleaned.mp4','36_01_H_160715100000_copy.mp4','GuraboTest/4_02_R_170511130000.mp4']
    initVideoSelectbox()
    
    $('#selectboxVideo')[0].selectedIndex=6; // select long video

    video2 = VideoFrame({
        id: 'video',
        /* We use the fps declared in the video here, even if not real */
        frameRate: videoinfo.videofps,
        callback: onFrameChanged // VERY IMPORTANT: all frame changes (play,next,prev...) trigger this callback. No refresh should be done outside of this callback
    });
    video2.onListen = function() {console.log('video2.onListen');};
    video2.onStopListen = function() {console.log('video2.onStopListen');};

    video = document.getElementById("video");
    play = document.getElementById("play"); //play button
    playBackward = document.getElementById("playbackward"); //play button
    canvas = document.getElementById("canvas");
    time = document.getElementById("vidTime");
    ctx = canvas.getContext('2d');
    
    // Global
    showObs = true
    showObsTracks = true
    showObsChrono = false
    showTags = true;
    showTagsTracks = false
    showSelectedTagsTracks = true
    showTagsOrientation = false
    showTagsChrono = true
    $('#showObs')[0].checked=showObs
    $('#showObsTracks')[0].checked=showObsTracks
    $('#showTags')[0].checked=showTags
    $('#showTagsTracks')[0].checked=showTagsTracks
    $('#showSelectedTagsTracks')[0].checked=showTagsTracks
    $('#showTagsOrientation')[0].checked=showTagsOrientation
    $('#showTagsChrono')[0].checked=showTagsChrono
    $('#showObsChrono')[0].checked=showObsChrono

    // ### Chronogram
    initChrono();

    // ## Video + canvas

    canvas1 = new fabric.Canvas('canvas1');
    //ctx1 = $('.upper-canvas')[0].getContext('2d');
    ctx1 = $('#canvas1')[0].getContext('2d');

    canvas1.selectionColor = "red";
    canvas1.selectionBorderColor = "red";
    canvas1.selection = false; // REMI: disable the blue selection (allow to select several rectangles at once, which poses problem)
    canvas1.uniScaleTransform = true; // REMI: allow free rescaling of observations without constrained aspect ratio
    //canvas1.centeredScaling = true; // REMI: rescale around center
    
    canvas1.on('mouse:down', onMouseDown);
    canvas1.on('mouse:up', onMouseUp);
    canvas1.on('object:moving', onObjectMoving); // During translation
    canvas1.on('object:scaling', onObjectMoving); // During scaling
    canvas1.on('object:modified', onObjectModified); // After modification
    canvas1.on('object:selected', onObjectSelected); // After mousedown
    canvas1.on('selection:cleared', onObjectDeselected); // After mousedown out of existing rectangles
    $('.upper-canvas').bind('contextmenu', onMouseDown2);

    //$('.upper-canvas').bind('wheel', onMouseWheel); // FIXME: Still buggy
    
    $('#video').on('mouseDown', onMouseDown);

    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#canvasresize").on( "resizestop", refreshCanvasSize );


    $("#zoom").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });

    // ## Control panel

    $('#F').change(onActivityChanged);
    $('#P').change(onActivityChanged);
    $('#E').change(onActivityChanged);
    $('#L').change(onActivityChanged);

    document.getElementById('load').addEventListener('change', loadFromFile);
    document.getElementById('loadtags')
            .addEventListener('change', loadTagsFromFile);
    
    //$('#video')[0].onload = onFrameChanged
    $('#video')[0].onloadeddata = onVideoLoaded;
    //$('#video')[0].src = 'data/testvideo.mp4';
    //$('#video')[0].src='36_01_H_160715100000.mp4';
    //$('#video')[0].src='NVR_ch1_main_20160429104800_20160429105800.mp4';
    //$('#video')[0].src='test.mp4';
    selectVideo(); // Get src from selectboxVideo


    zoomShowOverlay = false;
    $('#checkboxZoomShowOverlay').prop('checked', zoomShowOverlay);
    flagShowZoom = true;
    $('#checkboxShowZoom').prop('checked', flagShowZoom);
    
    $( ".collapsible" ).accordion({
        collapsible: true,
        active: false,
        heightStyle: "content",
        animate:false
    });

    // ## Keyboard control

    // REMI: use keyboard
    $(window).on("keydown", onKeyDown);
    //$('.upper-canvas').on("keydown", onKeyDown);
    //$('.upper-canvas').focus();
    
    // ## Misc init

    // Do not trigger first refresh: onloadeddata will call it
    // refresh();
    updateForm(null);
    defaultSelectedBee = undefined;
    lastSelected = null; // Last selected rect (workaround for event selection:cleared not providing the last selection to onObjectDeselected)
    
    //loadFromFile0('data/Tracks-demo.json')
}

function printMessage(html, color) {
    if (typeof color === 'undefined') color='black'
    var alert1 = document.getElementById("alert");
    alert1.style.color = color;
    alert1.innerHTML = html
    
    if (html !== "")
        console.log("MESSAGE: %c"+html, "color:"+color)
}

function toggleFullScreen() {
  var main = $('.container.main')[0]
  if (!document.fullscreenElement) {
      main.webkitRequestFullscreen();
  } else {
    if (main.exitFullscreen) {
      main.exitFullscreen(); 
    }
  }
}

// ######################################################################
// MODEL: Tracks data structure

function Observation(ID) {
    this.ID = ID;
    this.time = 0;
    this.frame = 0;
    this.x = 0;
    this.y = 0;
    this.cx = 0;
    this.cy = 0;
    this.width = 0;
    this.height = 0;
    this.marked = false;
    this.permanent = false;
    this.angle = 0;

    this.bool_acts = [false, false, false, false]; //Should be kept numerical because Ram
}

function cloneObs(obs) {
    let cloned = {}
    copyObs(cloned, obs)
    return cloned
}

function copyObs(obs, tmpObs) {
    obs.ID = tmpObs.ID;
    obs.time = tmpObs.time;
    obs.frame = tmpObs.frame;
    obs.x = tmpObs.x;
    
    obs.y = tmpObs.y;
    obs.cx = tmpObs.cx;
    obs.cy = tmpObs.cy;
    obs.width = tmpObs.width
    obs.height = tmpObs.height
    obs.marked = tmpObs.marked;
    obs.permanent = tmpObs.permanent;
    obs.bool_acts = []
    obs.bool_acts[0] = tmpObs.bool_acts[0];
    obs.bool_acts[1] = tmpObs.bool_acts[1];
    obs.bool_acts[2] = tmpObs.bool_acts[2];
    obs.bool_acts[3] = tmpObs.bool_acts[3];
    obs.angle = tmpObs.angle;
}

function getValidIDsForFrame(frame) {
    // Return an Iterator to Tracks[frame]

    if (Tracks[frame] == null) {
        return [];
    }
    //NO: var ids = Array.from(Tracks[frame].keys()) // Problem: includes ids to undefined values also

    let trackf = Tracks[frame];
    let ids = [];
    for (let id in trackf) {
        if (trackf[id] != null) {
            ids.push(id);
        }
    }
    //console.log("getValidIDsForFrame: frame=",frame,",  Tracks[frame]=",trackf)
    //console.log("getValidIDsForFrame: ids=",ids)
    return ids;
}

function obsDoesExist(frame, id) {
    if (Tracks[frame] == null) {
        return false
    }
    if (Tracks[frame][id] == null) {
        return false
    }
    return true
}

function getObsHandle(frame, id, createIfEmpty) {
    if (createIfEmpty == null)
        createIfEmpty = false;

    var obs
    if (Tracks[frame] == null) {
        if (createIfEmpty) {
            Tracks[frame] = {}
        } else {
            return undefined
        }
    }

    if (Tracks[frame][id] == null) {
        if (createIfEmpty) {
            Tracks[frame][id] = new Observation(id);
        } else {
            return undefined
        }
    }
    return Tracks[frame][id]
}

function storeObs(tmpObs) {
    var obs = getObsHandle(tmpObs.frame, tmpObs.ID, true);
    
    copyObs(obs, tmpObs)

    if (logging.submitEvents)
        console.log("Submitting obs = ", obs)
}

function changeObservationID(frame, old_id, new_id) {
    // REMI: modified to be be independent of View
    if (Tracks[frame] !== undefined) {
        if (typeof Tracks[frame][old_id] !== 'undefined') {
            if (logging.submitEvents)
                console.log("changeObservationID: frame=", frame, "old_id=", old_id, " new_id=", new_id);
            Tracks[frame][new_id] = Tracks[frame][old_id];
            delete Tracks[frame][old_id];
            Tracks[frame][new_id].ID = new_id;
            return true
        } else {
            console.log("changeObservationID: There's no bee id=", old_id, " on frame=", frame);
            return false
        }
    } else {
        console.log("changeObservationID: Empty frame, frame=", frame);
        return false
    }
}


function printTracks() {
    //Just for debugging
    console.log("This is Tracks:")
    for (let F in Tracks) {
        for (let iid in Tracks[F]) {
            console.log("F =", F, ", iid =", iid, ", Tracks[F][idd] =", Tracks[F][iid])
        }
    }
}


// ######################################################################
// INPUT/OUTPUT

// ## Annotations control

function saveBlobToFile(blob, filename) {
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.hidden = true;
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    console.log("saveBlobToFile: waiting for user to save to file")
        //window.URL.revokeObjectURL(url);
    console.log("saveBlobToFile: done")
    
    // New simplified API?
    //saveAs(blob, filename)
}
function saveObjToJsonFile(obj, filename) {
    var json = JSON.stringify(obj);

    var blob = new Blob([json], {
        type: "text/json"
    });
    
    saveBlobToFile(blob, filename)
}
function saveCSVToFile(txt, filename) {
    var blob = new Blob([txt], {
        type: "text/csv"
    });
    saveBlobToFile(blob, filename)
}

function saveToFile() {
    console.log("savetoFile: exporting to JSON...")

    saveObjToJsonFile(Tracks, 'Tracks.json')
}

function tracksToCSV(Tracks) {
    var csv = "Date,Time (frame),ID,Action,Cargo,Shift\n"
    if (Tracks === undefined) return csv
    for (let F in Tracks)
        for (let id in Tracks[F]) {
            var obs = Tracks[F][id]
            var action = "",
                cargo = ""
            var conc = function(s1, s2) {
                if (s2 === "") s1 += s2;
                else s1 += ";" + s2
            }
            if (obs.bool_acts[0]) action += (action === "" ? "" : ";") + "fanning"
            if (obs.bool_acts[2]) action += (action === "" ? "" : ";") + "came in"
            if (obs.bool_acts[3]) action += (action === "" ? "" : ";") + "went out"

            if (obs.bool_acts[1]) cargo += "pollen"
            csv += "nodate," + F + "," + obs.ID + "," + action + "," + cargo
            
            csv += ','  // Shift ?
            
            csv += "\n"
        }
    return csv
}

function saveToCSV() {
    console.log("savetoFile: exporting to CSV...")

    var txt = tracksToCSV(Tracks);

    saveCSVToFile(txt, 'Tacks.csv')
}


function tracksToBBoxes(Tracks) {
    var csv = "#frame,left,top,right,bottom,pollen,arrive,leave,fanning,angleAroundCenter\n"
    if (Tracks === undefined) return csv
    for (let F in Tracks)
        for (let id in Tracks[F]) {
            var obs = Tracks[F][id]
            
            csv += (F + "," + obs.x + "," + obs.y +
                     "," + (obs.x+obs.width) + "," + (obs.y+obs.height) +
                     "," + Number(obs.bool_acts[1]) + // pollen
                     "," + Number(obs.bool_acts[2]) + // arrive
                     "," + Number(obs.bool_acts[3]) + // leave
                     "," + Number(obs.bool_acts[0]) + // fanning
                     "," + Number(obs.angle) + // angle
                     "\n")
        }
    return csv
}

function saveToBBoxes() {
    console.log("saveToBBoxes: exporting bounding boxes to CSV...")
    console.log("with simple format: frame, left, top, right, bottom, pollen")

    var txt = tracksToBBoxes(Tracks);

    saveCSVToFile(blob, "BBoxes.csv")
}

function onReaderLoad(event) {
    console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    console.log(obj)
    Tracks = obj;
    onFrameChanged();
    
    refreshChronogram()
    
    console.log(event)
    //$("#load")[0].value='Loaded '+fileToRead
}
function loadFromFile0(fileToRead) {
    console.log("loadFromFile0: importing from JSON...")

    $.get(fileToRead, function(data) {
        console.log("JSON loaded: ",data)
        var obj = JSON.parse(data)
        Tracks = obj;
        onFrameChanged();
        
        refreshChronogram()
    });

}
function loadFromFile(event) {
    console.log("loadFromFile: importing from JSON...")

    fileToRead = event.target.files[0]

    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(fileToRead);
}

function tagsAddFrames(Tags) {
      for (let f in Tags) {
        let tagsFrame = Tags[f].tags
        if (tagsFrame == null) continue;

        for (let i in tagsFrame) {
            let tag = tagsFrame[i]
            if (tag == null) continue;
            
            tag.frame=Number(f)          
        }    
    }
}

function chronoAdjust(mode) {
    let factor = 1.2
    let mh = axes.margin.top+axes.margin.bottom
    let mw = axes.margin.left+axes.margin.right
    if (mode == 'H-') {
        let h = ($('#chronoDiv').height()-mh)/factor+mh
        if (h<100) h=100;
        $('#chronoDiv').height(h)
    }
    if (mode == 'H=') {
        adjustChronogramHeight(10)
    }
    if (mode == 'H+') {
        let h = ($('#chronoDiv').height()-mh)*factor+mh
        $('#chronoDiv').height(h)
    }

    if (mode == 'W-') {
        let w = ($('#chronoDiv').width()-mw)/factor+mw
        if (w<200) w=200;
        $('#chronoDiv').width(w)
    }
    if (mode == 'W=') {
        let w = $('#canvasresize').width()
        if (w<200) w=200;
        $('#chronoDiv').width(w)
    }
    if (mode == 'W+') {
        let w = ($('#chronoDiv').width()-mw)*factor+mw
        $('#chronoDiv').width(w)
    }
}

function adjustChronogramHeight(itemHeight) {
    if (itemHeight == null) {
        itemHeight = 10
    }

    let mh = axes.margin.top+axes.margin.bottom
    let domain = axes.ydomain()
    let minheight = domain.length*itemHeight + mh
    if (minheight < 100) minheight = 100;
    //if ($('#chronoDiv').height() < minheight) {
        $('#chronoDiv').height(minheight)
    //}
}

function onTagsReaderLoad(event) {
    //console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    //console.log(obj) // Caution: heavy
    Tags = obj;
    
    tagsAddFrames(Tags)
    
    refreshChronogram()
    
    adjustChronogramHeight()
    
    onFrameChanged();
    
    //console.log(event)
    //$("#load")[0].value='Loaded '+fileToRead
    
    //console.log(Tags)
}

function loadTagsFromFile(event) {
    console.log("loadTagsFromFile: importing from JSON...")

    fileToRead = event.target.files[0]

    var reader = new FileReader();
    reader.onload = onTagsReaderLoad;
    reader.readAsText(fileToRead);
}

function saveTagsToFile(event) {
    console.log("saveTagsToFile: exporting to JSON...")

    saveObjToJsonFile(Tags, 'Tags.json')
}


// ######################################################################
// CONTROLLERS

// ## Keyboard

function onKeyDown_IDEdit(event) {
    if (logging.keyEvents)
        console.log("onKeyDown_IDEdit: event=",event)
    var key = event.which || event.keyCode;
    if (key == 13) { // Enter
        let frame = getCurrentFrame()
        let fieldID = document.getElementById("I");
        let new_id = fieldID.value

        let activeObject = canvas1.getActiveObject()
        if (activeObject.status === "new") {
            activeObject.id = new_id
            printMessage("ID changed + submitted", "green")
            submit_bee(activeObject)
        } else /* status=="db"*/ {
            let old_id = activeObject.id
            if (changeObservationID(frame, old_id, new_id)) {
                // Successfull
                activeObject.id = new_id
                printMessage("ID changed succesfully!", "green")
            } else {
                console.log("onKeyDown_IDEdit: unsuccessfull ID change", {
                    object: activeObject,
                    old_id: old_id,
                    new_id: new_id
                })
                printMessage("ID not changed", "orange")
            }
            refresh();
            refreshChronogram()
        }
    }
}

function onKeyDown(e) {
    if (logging.keyEvents)
        console.log("onKeyDown: e=",e)
    if (e.target == document.getElementById("I")) {
        if (e.keyCode==32 || e.keyCode==188 || e.keyCode==190) {
          console.log("onKeyDown: detected keydown happened in textfield #I with keyCode for navigation shortcuts. Canceling it and showing a message.")
          printMessage("Editing ID. Press ESC to exit...", "green")
          return false
        }
    }
    if (e.target.type == "text") {
        if (logging.keyEvents)
            console.log("keyDown goes to text field")
        return true
    }
    if (e.key == "Delete" || e.key == 'd' || e.key == 'Backspace') {
        deleteSelected();
        return false
    }
    if (e.key == "p") {
        $('#P').prop('checked', !$('#P').prop('checked'));
        $( "#P" ).trigger( "change" );
        //automatic_sub();
        return false
    }
    if (e.key == "r" && e.ctrlKey) {
        refresh()
        return false
    }
    switch (e.keyCode) {
/*        case 32: // Space
            var id_field = document.getElementById("I");
            id_field.focus(); // Facilitate changing the id
            id_field.select();
            return false; // Prevent the event to be used as input to the field
            break;
            */
        case 32: // Space
            if (e.ctrlKey) {
                if (e.shiftKey)
                    playPauseVideoBackward(2);
                else
                    playPauseVideo(2);
            } else {
                if (e.shiftKey)
                    playPauseVideoBackward();
                else
                    playPauseVideo();
            }
            return false;
        case 27: // Escape
            //return true;
            var id_field = document.getElementById("I");
            if ($(id_field).is(':focus')) {
                id_field.selectionStart = id_field.selectionEnd
                id_field.blur();
                return false;
            } else {
                id_field.focus(); // Facilitate changing the id
                id_field.select();
                return false;
            }
            break;
        case 90: // Z (showZoom)
            flagShowZoom = !flagShowZoom
            $('#checkboxShowZoom').prop('checked',flagShowZoom)
            updateShowZoom()
            return false;
        //case 83: // key S
        //    submit_bee();
        //    if (logging.keyEvents)
        //        console.log("onKeyDown: 'S' bound to submit_bee. Prevented key 'S' to propagate to textfield.")
        //    return false; // Prevent using S in textfield
        case 13: // Enter
            if ($(document.activeElement)[0]==document.body) {
                // No specific focus, process the key
                submit_bee();
            }
            //onKeyDown_IDEdit(e) // Forward to IDedit keydown handler
            //return false;
            return true
        case 16: // Shift
        case 17: // Ctrl
        case 18: // Alt
        case 19: // Pause/Break
        case 20: // Caps Lock
        case 35: // End
        case 36: // Home
            break;
        case 188: // <
            if (e.ctrlKey && e.shiftKey)
                rewind4();
            else if (e.ctrlKey)
                rewind3();
            else if (e.shiftKey)
                rewind2();
            else
                rewind();
            return false;
        case 190: // >
            if (e.ctrlKey && e.shiftKey)
                forward4();
            else if (e.ctrlKey)
                forward3();
            if (e.shiftKey)
                forward2();
            else
                forward();
            return false;
            // Mac CMD Key
        case 91: // Safari, Chrome
        case 93: // Safari, Chrome
        case 224: // Firefox
            break;
    }
    /*
    let obj = canvas1.getActiveObject();
    if (obj) {
        switch (e.keyCode) {
            case 37: // Left
                if (e.shiftKey && obj.width > 10) {
                    obj.width -= 10;
                    obj.left += 5;
                } else
                    obj.left -= 10;
                obj.setCoords();
                refresh();
                return false;
            case 39: // Right
                if (e.ctrlKey) {
                    obj.set("width", parseFloat(obj.get("width")) + 10)
                    obj.set("left", parseFloat(obj.get("left")) - 5)
                } else
                    obj.set("left", parseFloat(obj.get("left")) + 10)
                obj.setCoords();
                refresh();
                return false;
            case 38: // Up
                if (e.ctrlKey) {
                    obj.set("height", parseFloat(obj.get("width")) + 10)
                    obj.set("top", parseFloat(obj.get("top")) - 5)
                } else
                    obj.set("top", parseFloat(obj.get("top")) - 10)
                obj.setCoords();
                refresh();
                return false;
            case 40: // Down
                obj.set("top", parseFloat(obj.get("top")) + 10)
                obj.setCoords();
                refresh();
                return false;
        }
    }
    */
    /*
    if (e.keyCode >= 48 && e.keyCode <= 57) { // Numbers from 0 to 9
        if (!$("#I").is(':focus')) { // If ID not focused, focus it
            $("#I")[0].focus()
            $("#I")[0].select()
                //$("#I").val(e.keyCode-48); // Type in the numerical character
            return true; // Let keycode be transfered to field
        }
    }
    */
}



// ## Video selection

function selectVideo() {
    let file = $('#selectboxVideo')[0].value
    $('#video')[0].src = file;
    
    // Change handled in callback onVideoLoaded
}


// ## Video custom metadata

function onStartTimeChanged(event) {
    console.log('onStartTimeChanged', event)

    var d = new Date(event.target.value)
    videoinfo.starttime = d.toISOString()

    updateChronoXDomainFromVideo()
    drawChrono()
}
function onVideoFPSChanged(event) {
    console.log('onVideoFPSChanged', event)

    videoinfo.videofps = Number(event.target.value)
    video2.frameRate = videoinfo.videofps
    onVideoLoaded() // Force recomputation of various parameters: nframes...
}
function onFPSChanged(event) {
    console.log('onFPSChanged (real)', event)

    videoinfo.realfps = Number(event.target.value)
    updateChronoXDomainFromVideo() // Change the real timeline
    drawChrono()
}
function onFrameOffsetChanged(event) {
    console.log('onFrameOffsetChanged (real)', event)

    videoinfo.frameoffset = Number(event.target.value)
    onVideoLoaded() // Force recomputation of various parameters: nframes...
}

function updateVideoInfoForm() {
    $('#videofps').val(videoinfo.videofps)
    $('#realfps').val(videoinfo.realfps)
    $('#startTime').val(videoinfo.starttime)
    $('#videoTagsFamily').val(videoinfo.tagsfamily)
    $('#videoPlace').val(videoinfo.place)
    $('#videoComments').text(videoinfo.comments)
}

function onVideoLoaded(event) {
    if (logging.videoEvents)
        console.log('videoLoaded', event)
    
    let videourl = video.src;
    let infourl = videourl+'.info'
        
    var jqxhr = $.getJSON( infourl, function(data) {
        if (logging.videoEvents)
            console.log( "videoLoaded.getInfo loaded" );
        console.log('videojsoninfo = ',data)    
        videojsoninfo = data
        
        if ($.isNumeric(videojsoninfo.videofps)) {
          videoinfo.videofps = Number(videojsoninfo.videofps)
          video2.frameRate = videoinfo.videofps
        }
        if ($.isNumeric(videojsoninfo.realfps)) {
          videoinfo.realfps = Number(videojsoninfo.realfps)
        }
        if (videojsoninfo.starttime instanceof Date && 
            !isNaN(videojsoninfo.starttime.valueOf())) {
          videoinfo.starttime = videojsoninfo.starttime
        }
        if (typeof videojsoninfo.tagsfamily !== 'undefined') {
          videoinfo.tagsfamily = videojsoninfo.tagsfamily
        }
        if (typeof videojsoninfo.place !== 'undefined') {
          videoinfo.place = videojsoninfo.place
        }
        if (typeof videojsoninfo.comments !== 'undefined') {
          videoinfo.comments = videojsoninfo.comments
        }

        //'starttime': '2016-07-15T09:59:59.360',
        //'duration': 1/20, // Duration in seconds
        //'nframes': 1
        
        updateVideoInfoForm()
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        console.log( "videoLoaded.getInfo error=", textStatus, "details=", errorThrown);
      })
      .complete(function() { 
        onVideoLoadedWithInfo(event)
      })
}

// # Video loading
function onVideoLoadedWithInfo(event) {
    // Called when video metadata available (size, duration...)
    if (logging.videoEvents)
        console.log('videoLoaded', event)
    var w,h
    
    w = video.videoWidth
    h = video.videoHeight
    videoinfo.duration = video.duration
    videoinfo.nframes = Math.floor(videoinfo.duration*videoinfo.videofps)
    videoinfo.name = video.src
    
    if (logging.videoEvents) {
        console.log("w=",w)
        console.log("h=",h)
    }
    
    vid_cx = w/2;
    vid_cy = h/2;
    
    // Video pixel size
    //resizeCanvas(w,h)
    
    // Display size
    let wd = w, hd=h;
    
    while (wd>800) {
        wd/=2.0
        hd/=2.0
    }
    
    $("#canvasresize")[0].style.width = (wd+16).toString() + 'px'
    $("#canvasresize")[0].style.height = hd.toString() + 'px'
    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: w / h
    });
    //resizeCanvasDisplay(wd,hd)
    //resizeCanvas(wd,hd)
    refreshCanvasSize()
    
    //onFrameChanged(event)
    video.oncanplay = onVideoReady
    
    
    updateChronoXDomainFromVideo()   // Should trigger refresh automatically
    //refreshChronogram()
}
function onVideoReady(event) {
    video.oncanplay = undefined
    if (logging.videoEvents)
        console.log('videoReady', event)
    rewind()
}


// # Video frame change

// Auxiliary
function getCurrentFrame() {
    return video2.get()-videoinfo.frameoffset;
}
function getCurrentVideoTime(format) {
  return video2.toMilliseconds()/1000.0
}
function getCurrentRealDate(format) {
  var D = new Date(videoinfo.starttime)
  D = new Date(D.getTime()+video2.toMilliseconds()*videoinfo.videofps/videoinfo.realfps)
  return D
}
function toLocaleISOString(date) {
    // Polyfill to get local ISO instead of UTC http://stackoverflow.com/questions/14941615/how-to-convert-isostring-to-local-isostring-in-javascript
    function pad(n) { return ("0"+n).substr(-2); }

    var day = [date.getFullYear(), pad(date.getMonth()+1), pad(date.getDate())].join("-"),
        time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join(":");
    if (date.getMilliseconds())
        time += "."+date.getMilliseconds();
    var o = date.getTimezoneOffset();
    var h = Math.floor(Math.abs(o)/60);
    var m = Math.abs(o) % 60;
    o = o===0 ? "Z" : (o<0 ? "+" : "-") + pad(h) + ":" + pad(m);
    return day+"T"+time//+o;
}

var seekWallTime = 0;
var seekTiming = false
function startSeekTimer() {
    seekWallTime = new Date().getTime()
    seekTiming = true
}
function seekFrame(frame) {
    startSeekTimer()
    video2.seekTo({'frame':frame+videoinfo.frameoffset})
}

function onFrameTextChanged() {
    let frame = Number($('#currentFrame').val())
    seekFrame(frame)
}

// This callback is the only one that should handle frame changes. It is called automatically by video2
function onFrameChanged(event) {
    let Cframe = getCurrentFrame();
    
    if (seekTiming) {
        seekTiming=false;
        let elapsed = (new Date().getTime() - seekWallTime)/1000.0
        console.log('Seek frame '+Cframe+': elapsed='+elapsed+' s')
    }
    
    if (logging.frameEvents)
        console.log('frameChanged', Cframe)

    //$('#currentFrame').html("Frame: " + Cframe)
    $('#currentFrame').val(Cframe)
    $('#vidTime').html("Video Time: " + video2.toHMSm(getCurrentVideoTime()))
    $('#realTime').html("Real Time: " + toLocaleISOString(getCurrentRealDate()))

    printMessage("")

    canvas1.clear();
    createRectsFromTracks()

    refresh();
      
    selectBeeByID(defaultSelectedBee);
    //updateForm(null);
    
    if (flagShowZoom) {
        showZoomTag()
    }
}


function refresh() {
    if (flagCopyVideoToCanvas) {
      // Copy video to canvas for fully synchronous display
      //ctx.drawImage(video, 0, 0, video.videoWidth * extraScale / transformFactor, video.videoHeight * extraScale / transformFactor);
      ctx.drawImage(video, 
                    canvasTransform[4], canvasTransform[5],
                      canvasTransform[0]*canvas.width, canvasTransform[3]*canvas.height,
                    0, 0, canvas.width, canvas.height);
    } else {
      // Rely on video under canvas. More efficient (one copy less), but
      // may have some time discrepency between video and overlay
      ctx.clearRect(0,0,video.videoWidth * extraScale / transformFactor, video.videoHeight * extraScale / transformFactor)
    }
    
    updateDeleteButton()
    updateUndoButton()
    
    updateTimeMark()
  
    refreshOverlay()

    //refreshChronogram();
}
function refreshRectFromObs() {
    for (let rect of canvas1.getObjects()) {
        if (typeof rect.obs !== 'undefined')
            updateRectFromObsGeometry(rect)
    }
}
function refreshOverlay() {
    // for each refresh, we need to reset everything:
    // remove all rectangles and recreate them
    if (canvas1) {
        //refreshRectFromObs() // Avoid update loops to avoid drifting objects
        canvas1.renderAll(); // Render all rectangles
        
        if (showObsTracks) {
            plotTracks(ctx);
        }
        
        //plotBees(ctx1); // Not needed, identification done directly in BeeRect
        
        if (showTagsTracks || showSelectedTagsTracks)
            plotTagsTracks(ctx)
        else if (showTags)
            plotTags(ctx)
    }
}

// ## Video navigation

function updateNavigationView() {
   let playingState = video2.playingState()
   if (playingState == "paused") {
        $("#play").value = "Play";
        $("#play").removeClass("playing");
        $("#playbackward").value = "Play Backwards";
        $("#playbackward").removeClass("playing");
   } else if (playingState == "playingForwards") {
        // Forwards
        $("#play").value = "Pause";
        $("#play").addClass("playing");
        $("#playbackward").value = "Play Backwards";
        $("#playbackward").removeClass("playing");
    } else if (playingState == "playingBackwards") {
        // Backwards
        $("#play").value = "Play";
        $("#play").removeClass("playing");
        $("#playbackward").value = "Pause";
        $("#playbackward").addClass("playing");
    } else {
        console.log('ERROR: unknown video2.playingState():',playingState)
    }
}

function playPauseVideo(option) {
    if (logging.guiEvents) console.log('playPauseVideo()');
    let playingState = video2.playingState()
    if (playingState == "paused" || playingState == "playingBackwards") {
        playForwards(option)
    } else {
        pause()
    }
}
function playPauseVideoBackward(option) {
    if (logging.guiEvents) console.log('playPauseVideoBackward()');
    let playingState = video2.playingState()
    if (playingState == "paused" || playingState == "playingForwards") {
        playBackwards(option)
    } else {
        pause()
    }
}

function playForwards(option) {      
      if (logging.frameEvents)
            console.log('playForwards');
                 
      if (Number(option)==2)
          video2.playForwards(1000.0/20/4);
      else {
          video2.playForwards()
      }
      
      updateNavigationView()
      // Any call to refresh is handled by the video2 callback to onFrameChanged
}
function playBackwards(option) {
      if (logging.frameEvents)
            console.log('playBackwards');
      
      video2.stopListen(); // Cut any other play occuring
      if (Number(option)==2)
          video2.playBackwards(1000.0/20/4);
      else
          video2.playBackwards();
      updateNavigationView()

      // Any call to refresh is now handled by the video2 callback to onFrameChanged
}
function pause() {
    // Was playing, pause
    if (logging.frameEvents)
        console.log('pause');

    video2.video.pause();
    video2.stopListen();
    updateNavigationView()
}

function rewind() {
    startSeekTimer()
    video2.seekBackward();
}
function forward() {
    startSeekTimer()
    video2.seekForward();
}

function rewind2() {
    startSeekTimer()
    video2.seekBackward(videoinfo.videofps);
}
function forward2() {
    startSeekTimer()
    video2.seekForward(videoinfo.videofps);
}

function rewind3() {
    startSeekTimer()
    video2.seekBackward(videoinfo.videofps*60);
}
function forward3() {
    startSeekTimer()
    video2.seekForward(videoinfo.videofps*60);
}
function rewind4() {
    startSeekTimer()
    video2.seekBackward(videoinfo.videofps*60*10);
}
function forward4() {
    startSeekTimer()
    video2.seekForward(videoinfo.videofps*60*10);
}


// # Canvas resizing utilities
function resizeCanvas(w,h) {
    canvas.width = w
    canvas.height = h
    canvas1.setWidth(w)
    canvas1.setHeight(h)
    
    $("#video").width(w)
    $("#video").height(h)
    
    var wrap = $('.canvaswrapper')[0]
    wrap.style.width = w.toString() + 'px'
    wrap.style.height = h.toString() + 'px'
}
function refreshCanvasSize(event, ui) {
    if (logging.canvasEvents)
        console.log('refreshCanvasSize')
    
    let wd = parseInt($("#canvasresize")[0].style.width)-16 // Assume width is in px
    let hd = video.videoHeight/video.videoWidth*wd
        
    resizeCanvas(wd,hd)
    
    transformFactor = video.videoWidth / canvas.width;
    
    $("#videoSize")[0].innerHTML = 'videoSize: '+video.videoWidth.toString() + 'x' + video.videoHeight.toString();
    $("#canvasSize")[0].innerHTML = 'canvasSize: '+wd.toString() + 'x' + hd.toString();
    
    //let s = canvasTform[2];
    //let tx = (canvasTform[0]-vid_cx) / transformFactor + wd/2;
    //let ty = (canvasTform[1]-vid_cy) / transformFactor + hd/2;
    
    canvasTransformSet([transformFactor,0, 0,transformFactor, 0,0])
    
    
    // Don't use ctx.transform, as it also reduces the drawings overlays
    // Instead, we scale everything manually
    //var ctx=canvas.getContext("2d");
    //ctx.transform(...canvasTransform);
    //var ctx1=canvas1.getContext("2d");
    //ctx1.transform(...canvasTransform);
        
    onFrameChanged()
}

var canvasTransform = [1,0, 0,1, 0,0]  // Global
function canvasTransformSet(array) {
    for (let i=0; i<6; i++) {
        canvasTransform[i]=array[i]
    }
    refreshRectFromObs()
}
function canvasTransformScale(scaling, center) {
    if (canvasTransform[0]*scaling > transformFactor) 
        scaling = transformFactor/canvasTransform[0] 
        // Can not zoom out more than initial

    canvasTransform[0]=canvasTransform[0]*scaling
    canvasTransform[3]=canvasTransform[3]*scaling
    canvasTransform[4]=canvasTransform[4]-canvasTransform[0]*center[0]*(scaling-1)
    canvasTransform[5]=canvasTransform[5]-canvasTransform[3]*center[1]*(scaling-1)
    if (canvasTransform[4]<0) canvasTransform[4]=0
    if (canvasTransform[5]<0) canvasTransform[5]=0
    if (canvasTransform[4]>video.videoWidth-10) canvasTransform[4]=video.videoWidth-10
    if (canvasTransform[5]>video.videoHeight-10) canvasTransform[5]=video.videoHeight-10
    
    refreshRectFromObs()
}
function canvasTransformApplyPoint(pt, inverse) {
    if (inverse) {
        return {
          x: (pt.x-canvasTransform[4])/canvasTransform[0],
          y: (pt.y-canvasTransform[5])/canvasTransform[3]
          }
    } else {
        return {
          x: canvasTransform[0]*pt.x+canvasTransform[4],
          y: canvasTransform[3]*pt.y+canvasTransform[5]
          }
    }
}
function canvasTransformApplyVector(vec, inverse) {
    if (inverse) {
        return {
          x: vec.x/canvasTransform[0],
          y: vec.y/canvasTransform[3]
          }
    } else {
        return {
          x: canvasTransform[0]*vec.x,
          y: canvasTransform[3]*vec.y
          }
    }
}
function canvasTransformApplyRect(rect, inverse) {
    // Only upright rect
    if (inverse) {
        return {
          left: (rect.left-canvasTransform[4])/canvasTransform[0],
          top: (rect.top-canvasTransform[5])/canvasTransform[3],
          width: rect.width/canvasTransform[0],
          height: rect.height/canvasTransform[3]   
          }
    } else {
        return {
          left: canvasTransform[0]*rect.left+canvasTransform[4],
          top: canvasTransform[3]*rect.top+canvasTransform[5],
          width: canvasTransform[0]*rect.width,
          height: canvasTransform[3]*rect.height,      
          }
    }
}

function canvasToVideoCoords(rect) {
    let R2 = canvasTransformApplyRect(rect)
    return { x: R2.left, y: R2.top,
            width: R2.width, height: R2.height
            }
//     return {
//         x: rect.left * transformFactor,
//         y: rect.top * transformFactor,
//         width: rect.width * transformFactor,
//         height: rect.height * transformFactor,
//     }
}
function videoToCanvasCoords(obs) {
    let R = {left:obs.x, top:obs.y, width:obs.width, height: obs.height}
    let R2 = canvasTransformApplyRect(R, true)
    return R2
//     let transformFactor2 = transformFactor;
//     return {
//         left: obs.x / transformFactor2,
//         top: obs.y / transformFactor2,
//         width: obs.width / transformFactor2,
//         height: obs.height / transformFactor2,
//     }
}
function canvasToVideoPoint(pt) {
    return canvasTransformApplyPoint(pt)
//     let transformFactor2 = transformFactor;
//     return {
//         x: pt.x * transformFactor2,
//         y: pt.y * transformFactor2,
//     }
}
function videoToCanvasPoint(pt) {
    return canvasTransformApplyPoint(pt, true)
//     return {
//         x: pt.x / transformFactor2,
//         y: pt.y / transformFactor2,
//     }
}

// ## Fabric.js rects vs observations

function createRectsFromTracks() {
    let F = getCurrentFrame()
    let ids = getValidIDsForFrame(F)
    //console.log("createRectsFromTracks: ",{frame:F,ids:ids})
    for (let id of ids) { // For each valid bee ID, create a rect for it
        let obs = getObsHandle(F, id, false)
        addRectFromObs(obs)
    }
}
function addRectFromObs(obs) {
    let r = videoToCanvasCoords(obs)
    var rect = addRect(obs.ID, r.left, r.top, r.width, r.height, "db", obs)
    return rect
}
function updateRectFromObsGeometry(rect) {
    let obs = rect.obs
    if (typeof obs === 'undefined') {
        console.log('updateRectFromObsGeometry: activeObject.obs undefined')
        return
    }

    let canvasRect = videoToCanvasCoords(obs)
    
    //let cx = (canvasRect.left + canvasRect.width / 2);
    //let cy = (canvasRect.top + canvasRect.height / 2);
    let cx = canvasRect.left;
    let cy = canvasRect.top;
    
    // CAUTION: rect.left/top are misnamed. When originX/originY='center', they
    // Correspond to rectangle center
    rect.setLeft(cx)     // unrotated left (rotation around center)
    rect.setTop(cy)      // unrotated top
    rect.setWidth(canvasRect.width)
    rect.setHeight(canvasRect.height)
    rect.setAngle(obs.angle)
    rect.setCoords()
}
function updateRectObsGeometry(activeObject) {
    let geom = rotatedRectGeometry(activeObject);
    let canvasRect = {left:geom.unrotated.left, top:geom.unrotated.top, 
                      width: geom.unrotated.width, height: geom.unrotated.height}
    let videoRect = canvasToVideoCoords(canvasRect)
    
    // Update Observation attached to rectangle from current Rect size
    let obs = activeObject.obs
    obs.x = videoRect.x    // unrotated left (rotation around center)
    obs.y = videoRect.y    // unrotated top
    obs.width = videoRect.width
    obs.height = videoRect.height
    obs.angle = activeObject.angle    
    obs.cx = (videoRect.x + videoRect.width / 2);
    obs.cy = (videoRect.y + videoRect.height / 2);
}
function updateRectObsActivity(activeObject) {
    // Update Observation attached to rectangle from Form information
    let obs = activeObject.obs
    obs.bool_acts[0] = $('#F').prop('checked');
    obs.bool_acts[1] = $('#P').prop('checked');
    obs.bool_acts[2] = $('#E').prop('checked');
    obs.bool_acts[3] = $('#L').prop('checked');
}

// ## Direct canvas drawing

// # Bee ID and their tracks

// Obsolete: identification done directly in BeeRect
// function plotBees(ctx) {
//     // Creation of rectangle was done in identify-->moved it to an explicit createRectsFromTracks()
//     // Now, just plot identity
//     let rects = canvas1.getObjects()
//     for (let i in rects) { // For each rectangle, plot its identity
//         identify(ctx, rects[i], 5);
//     }
// }
function plotTracks(ctx) {
    let F = getCurrentFrame()
    let ids = getValidIDsForFrame(F)

    let frange = Math.max(plotTrack_range_backward,plotTrack_range_forward)*1.2;
    let fmin = F-plotTrack_range_backward;
    let fmax = F+plotTrack_range_forward;
    if (fmin<0) fmin=0;
    //if (fmax>maxframe) fmax=maxframe;

    setColor = function(f) {
        if (f<=F) {
            color = "rgba(255,0,0,"+(1-Math.abs((f-F)/frange))+")"
            //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
        } else {
            color = "rgba(0,128,0,"+(1-Math.abs((f-F)/frange))+")"
        }
        return color;
    }

    for (let id of ids) { // For each valid bee ID, create a track for it
        let obs = getObsHandle(fmin, id, false)
        let x=undefined, y=undefined, z=0;
        if (!!obs) {
            let rect = videoToCanvasCoords(obs)
            //let geom = rotatedRectGeometry(rect)
            //x = geom.center.x
            //y = geom.center.y
            x = rect.left+rect.width/2
            y = rect.top+rect.height/2
            z = 1;
        }

        for (let f=fmin+1; f<=fmax; f++) {
            let obs = getObsHandle(f, id, false)
            if (!obs) { z=0; continue;}
            let rect = videoToCanvasCoords(obs)            
            let x2 = rect.left+rect.width/2
            let y2 = rect.top+rect.height/2
//             let x2 = geom.center.x
//             let y2 = geom.center.y
            let z2 = 1;
            
            ctx.beginPath();
            ctx.moveTo(x,y);
            ctx.lineTo(x2,y2);
            
            ctx.lineWidth = 1
            if (z)
                ctx.setLineDash([])
            else
                ctx.setLineDash([10,10])
            ctx.strokeStyle = setColor(f);
            ctx.stroke();
            ctx.strokeStyle = "none"
            ctx.setLineDash([])
            
            x=x2; y=y2; z=z2;
        }
        for (let f=fmin; f<=fmax; f++) {
            if (f==F) continue;
        
            let obs = getObsHandle(f, id, false)
            if (!obs) continue;
            let rect = videoToCanvasCoords(obs)
            
            //let geom = rotatedRectGeometry(rect)
            x = rect.left+rect.width/2
            y = rect.top+rect.height/2
    
//             if (f-F<0)
//                 color = "red"
//             else
//                 color = "green"
            color = setColor(f);
                
            radius = 3;
            paintDot(ctx, {'x':x, 'y':y}, radius, color, id)    
                
            let acti = activityString(obs)

            ctx.font = "8px Arial";
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(acti, x, y + radius + 3);
            ctx.textBaseline = 'alphabetic';    
        }
    }
}
function paintDot(ctx, pt, radius, color, id) {
    let x=pt.x, y=pt.y;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(String(id), x, y - radius - 3);
}

function activityString(obs) {
    let acti = ''
    if (obs.bool_acts[0]) acti += 'F'
    if (obs.bool_acts[1]) acti += 'P'
    if (obs.bool_acts[2]) acti += 'E'
    if (obs.bool_acts[3]) acti += 'L'
    return acti;
}

function identify(ctx, rect, radius) { // old prototype: obs, x,y, color){

    var color
    if (rect.status === "new")
        color = "green"
    else if (rect.status === "db")
        color = "yellow"
    else
        color = "red" //problem

    //let x = rect.left + rect.width / 2;
    //let y = rect.top + rect.height / 2;
    let geom = rotatedRectGeometry(rect)
    let x = geom.center.x
    let y = geom.center.y
    
    console.log('identify ctx=',ctx, x,y)

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    ctx.font = "20px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(String(rect.id), x, y - radius - 3);

    let acti = activityString(rect.obs)

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(acti, x, y + radius + 3);
    ctx.textBaseline = 'alphabetic';
}
function identifyBeeRect(ctx, rect, radius) {

    var color
    if (rect.status === "new")
        color = "green"
    else if (rect.status === "db")
        color = "yellow"
    else
        color = "red" //problem

    // Local coordinates ?
    let x = 0
    let y = 0
    
    //console.log('identifyBeeRect ctx=',ctx, x,y)

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    ctx.font = "20px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(String(rect.id), x, y - radius - 3);

    let acti = activityString(rect.obs)

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(acti, x, y + radius + 3);
    ctx.textBaseline = 'alphabetic';
}

// # Tags and their tracks

function plotTags(ctx) {
    let F = getCurrentFrame()
    let tagsFrame = Tags[F]
    if (tagsFrame !== undefined) {
        let tags = tagsFrame.tags
        //console.log('Found tags',tags)
        for (let i in tags) {
            let tag = tags[i]
            //console.log(tag)
            plotTag(ctx, tag)            
        }
        
       let msg = ''
       for (let i in tags) {
           let tag = tags[i]
            msg = msg + tag.id + ' H'+tag.hamming+ ' ('+tag.c[0]+','+tag.c[1]+')<br>'
       }
       $("#tagDetails")[0].innerHTML = msg
       //console.log('plotTags: msg=',msg)
    }
}
function tagCorners(tag) {
    if (typeof tag.p === 'undefined') return undefined
    let ppt=[]
    for (let i of [0,1,2,3]) {
          ppt[i] = videoToCanvasPoint({"x":tag.p[i][0], "y":tag.p[i][1]})
    }
    return ppt
}
function tagUp(tag) {
    if (typeof tag.p === 'undefined') return undefined
    let p = tag.p;
    let ppt = tagCorners(tag);
    let dir = [ppt[1].x-ppt[2].x,ppt[1].y-ppt[2].y]
    let m = Math.sqrt(dir[0]*dir[0]+dir[1]*dir[1])
    dir = [dir[0]/m, dir[1]/m]
    return dir
}
function tagAngle(tag) {
    let up = tagUp(tag)
    if (typeof up === 'undefined') return undefined
    let angle = Math.atan2(up[0], -up[1])/Math.PI*180
    return angle
}
function plotTagOrientation(ctx, tag, color) {
      let pt = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
      let dir = tagUp(tag)
      if (typeof dir !== 'undefined') {
        ctx.save()
        let L=40, L1=35, W1=4
        ctx.beginPath();
        ctx.moveTo(pt.x-dir[0]*L, pt.y-dir[1]*L)
        ctx.lineTo(pt.x+dir[0]*L, pt.y+dir[1]*L)
        ctx.lineTo(pt.x+dir[0]*L1+dir[1]*W1, pt.y+dir[1]*L1-dir[0]*W1)
        ctx.strokeStyle = color
        if (tag.hamming>2)
            ctx.setLineDash([4,4])
        ctx.stroke();
        ctx.restore()
      }
}
function isCurrentSelection(id) {
  return typeof defaultSelectedBee !== 'undefined' && id == defaultSelectedBee
}
function plotTag(ctx, tag, color, flags) {
    if (!tagsSampleFilter(tag)) {
        return
    }
    if (color === undefined) {
        if (tag.hamming==0)
          color = '#ff0000'
        else if (tag.hamming==2)
          color = '#ff6000'
        else
          color = '#ffb000'
    }
    if (typeof flags === 'undefined') {
      flags = {
        "id":true,
        "radius":5,
        "simple":false
      }
    }
    let radius = flags.radius
    if (typeof radius === 'undefined') { radius = 5; }

    let pt = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
    
    if (isCurrentSelection(tag.id)) {
        ctx.save()
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius+2, 0, Math.PI * 2);
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.closePath();
      
        if (tag.frame == getCurrentFrame()) {
            if (showTagsOrientation) {
                plotTagOrientation(ctx, tag, '#00ff00')
            } else {
                ctx.beginPath();
                ctx.moveTo(pt.x-20,pt.y)
                ctx.lineTo(pt.x+20,pt.y)
                ctx.moveTo(pt.x,pt.y-20)
                ctx.lineTo(pt.x,pt.y+20)
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 3;
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore()
        }
    } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.closePath();
        ctx.stroke();
        if (tag.frame == getCurrentFrame() && showTagsOrientation) {
            plotTagOrientation(ctx, tag, 'magenta')
        }
    }

    if (flags.id===true) {
      ctx.font = "10px Arial";
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(String(tag.id), pt.x, pt.y + radius + 8);

      ctx.font = "10px Arial";
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText("H"+tag.hamming, pt.x, pt.y + radius + 16);
    }
}

function getTag(f, id) {
    if (typeof Tags === 'undefined') return undefined
    let tagsFrame = Tags[f]
    if (typeof(tagsFrame) === "undefined") return undefined;
    let tags = tagsFrame.tags
    for (let i in tags) {
        if (tags[i].id == id) { return tags[i];}
    }
    return undefined
}

function plotTagsTracks(ctx) {
    let F = getCurrentFrame()
    let frange = Math.max(plotTrack_range_backward,plotTrack_range_forward)*1;
    let fmin = F-plotTrack_range_backward;
    let fmax = F+plotTrack_range_forward;
    if (fmin<0) fmin=0;
    //if (fmax>maxframe) fmax=maxframe;

    let tProx = function(f) {
        return (1-Math.abs((f-F)/frange))
    }
    let tProxSigned = function(f) {
        return ((f-F)/frange)
    }
    let setColor = function(f) {
        if (false) {
            let T = tProx(f)
            if (f<=F) {
                color = "rgba(255,0,0,"+T+")"
                //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
            } else {
                color = "rgba(0,0,255,"+T+")"
            }
        } else {
            let T = tProx(f)
            let S = tProxSigned(f)/2+0.5
            let r = Math.round(255*(1-S))
            let g = 0
            let b = Math.round(255*S)
            color = "rgba("+r+","+g+","+b+","+T+")"
        }
        return color;
    }

    if (showTagsTracks) {
    // Plot past and future tag positions
    let p0 = []
    for (let f=fmin; f<=fmax; f++) {
        let tagsFrame = Tags[f]
        if (typeof(tagsFrame) === "undefined") continue;
        let tags = tagsFrame.tags
        let color = setColor(f)
        for (let i in tags) {
            let tag = tags[i]
            
            if (!tagsSampleFilter(tag)) {
                    continue
                }
            
            //console.log(tag)
            let p1 = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
            
            if (typeof p0[tag.id] !== 'undefined') {
                ctx.save()
                ctx.beginPath();
                ctx.moveTo(p0[tag.id].x,p0[tag.id].y)
                ctx.lineTo(p1.x,p1.y)
                ctx.strokeStyle = color;
                if (tag.hamming<1000)
                    ctx.setLineDash([])
                else
                    ctx.setLineDash([2,2])
                ctx.stroke();
                ctx.restore()
            }
            p0[tag.id] = {x:p1.x, y:p1.y}
            
            if (tag.hamming<1000)
              plotTag(ctx, tag, color, {"id":false, "radius": 3*tProx(f)+1})            
            else
              plotTag(ctx, tag, color, {"id":false, "radius": 3*tProx(f)+1})            
        }    
    }
    }
    
    if (showSelectedTagsTracks) {
    // Plot track of selected bee
    if (typeof defaultSelectedBee !== 'undefined') {
        console.log('defaultSelectedBee=',defaultSelectedBee)
        let p0 = []
        for (let f=fmin; f<=fmax; f++) {
            let tagsFrame = Tags[f]
            if (typeof(tagsFrame) === "undefined") continue;
            let tags = tagsFrame.tags
            let color = setColor(f)
            
            let ii = -1
            for (let i in tags) {
                if (tags[i].id == defaultSelectedBee) { ii=i; break;}
            }
            if (ii<0) continue;
            let tag = tags[ii]
            {
                //console.log('tag=',tag)
                if (!tag) continue;
            
                if (!tagsSampleFilter(tag)) {
                        continue
                    }
            
                //console.log(tag)
                let p1 = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
            
                if (typeof p0[tag.id] !== 'undefined') {
                    ctx.save()
                    ctx.beginPath();
                    ctx.moveTo(p0[tag.id].x,p0[tag.id].y)
                    ctx.lineTo(p1.x,p1.y)
                    let T = tProx(f)
                    let S = tProxSigned(f)
                    if (S>0)
                        ctx.strokeStyle = "rgba(255,255,0,"+T+")";
                    else
                        ctx.strokeStyle = "rgba(128,255,128,"+T+")";
                    ctx.lineWidth = T*2
                    if (tag.hamming<1000)
                        ctx.setLineDash([])
                    else
                        ctx.setLineDash([2,2])
                    ctx.stroke();
                    ctx.restore()
                }
                p0[tag.id] = {x:p1.x, y:p1.y}
            
                //plotTag(ctx, tag, color, {"id":false, "radius": 3*tProx(f)+1})            
            }    
        }
    }
    }
    
    {
        // Plot current tag position
        let f=F;
        let tagsFrame = Tags[f]
        if (typeof(tagsFrame) !== "undefined") {
        let tags = tagsFrame.tags
        let color = setColor(f)
        for (let i in tags) {
            let tag = tags[i]
            //console.log(tag)
            
            plotTag(ctx, tag, color, {"id":true})            
        }    
        }
    } 
}
function onShowTagsChanged() {
    // Callback when display parameters have changed
    showTags = $('#showTags')[0].checked
    showTagsOrientation = $('#showTagsOrientation')[0].checked
    onFrameChanged()
}
function onShowTagsTracksChanged() {
    showTagsTracks = $('#showTagsTracks')[0].checked
    showSelectedTagsTracks = $('#showSelectedTagsTracks')[0].checked
    onFrameChanged()
}

function onTrackWindowChanged() {
    let range = Number($('#trackWindow')[0].value)
    console.log("onTrackWindowChanged range=",range)
    plotTrack_range_forward = range
    plotTrack_range_backward = range
}

tagsSampleFilter = function(tag) {return true}
tagsIntervalFilter = function(interval) {return true}
tagsIDFilter = function(idinfo) {return true}
function onTagsParametersChanged() {
    console.log('onTagsParametersChanged')
    // Callback when tags chronogram computation parameters have changed
    tagsSampleFilter = Function("tag",$('#tagsSampleFilter')[0].value)
    
    let minLength = Number($('#tagsIntervalFilterMinLength').val())
    
    tagsIntervalFilter = function(interval) {
      let fun = Function("interval",$('#tagsIntervalFilter')[0].value)
      return (interval.end-interval.begin>=minLength) && fun(interval)
    }
    tagsIDFilter = Function("idinfo",$('#tagsIDFilter')[0].value)
    console.log('onTagsParametersChanged:\ntagsSampleFilter=',tagsSampleFilter,
                'tagsIntervalFilter=',tagsIntervalFilter,
                '\ntagsIDFilter=',tagsIDFilter)
    refreshChronogram()
}
function onTagsParametersSelectChanged(event) {
  $('#tagsIntervalFilter').val($('#tagsIntervalFilterSelect').val())
  onTagsParametersChanged()
}

function chronoFilter(mode) {
  if (mode=='H0') {
      $('#tagsSampleFilter').val('return tag.hamming==0')
      onTagsParametersChanged()
  }
  if (mode=='H1') {
      $('#tagsSampleFilter').val('return tag.hamming<=1')
      onTagsParametersChanged()
  }
  if (mode=='H2') {
      $('#tagsSampleFilter').val('return tag.hamming<=2')
      onTagsParametersChanged()
  }
  if (mode=='Hall') {
      $('#tagsSampleFilter').val('return true')
      onTagsParametersChanged()
  }
}

function onChronoParametersChanged() {
    // Callback when chronogram computation parameters have changed
    showTagsChrono = $('#showTagsChrono')[0].checked
    showObsChrono = $('#showObsChrono')[0].checked
    console.log('onChronoParametersChanged:showTagsChrono\n=',showTagsChrono)
    refreshChronogram()
}

var showObsTracks = false
function onShowObsChanged() {
    showObs = $('#showObs')[0].checked
    showObsTracks = $("#showObsTrack")[0].checked
    refresh()
}



// ######## Mouse control #######

var default_width = 40;
var default_height = 40;

// Auxiliary functions to manage fabric rectangles
// Create a fabric rectangle with (top,left) corner
// the user is supposed to drag the other corner
// startX and startY in canvas coordinates
function addRectInteractive(id, startX, startY) {
    if (logging.mouseEvents)
        console.log('addRectInteractive(',id,startX,startY,')')

    var rect = addRect(id, startX, startY, 1, 1, "new");
    var topleft = {
        x: startX,
        y: startY
    }
    var center = rect.getCenterPoint()
    rect.hasControls = false; // Do not show controls when creating
    canvas1.setActiveObject(rect);
    //canvas1.renderAll();

    var onMouseMove_Dragging = function(option) {
        if (logging.mouseMoveEvents)
            console.log("onMouseMove_Dragging: option=", option);
        var e = option.e;

        rect.validated = true; // Need dragging a bit to validate the rectangle

        if (e.ctrlKey) {
            //rect.set('width', e.offsetX - topleft.x);
            //rect.set('height', e.offsetY - topleft.y);
            let w = (e.offsetX - center.x) * 2,
                h = (e.offsetY - center.y) * 2;
            rect.set({
                width: w,
                height: h,
                left: center.x - w / 2,
                top: center.y - h / 2
            });
        } else {
            let w = (e.offsetX - topleft.x),
                h = (e.offsetY - topleft.y);
            rect.set({
                width: w,
                height: h,
                left: topleft.x,
                top: topleft.y
            });
        }
        rect.setCoords();
        //canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
        canvas1.renderAll(); // Refresh rectangles drawing

        updateForm(rect);
    }
    var onMouseUp_Dragging = function(e) {
        if (logging.mouseEvents)
            console.log("onMouseUp_Dragging: e=", e);
        canvas1.off('mouse:move', onMouseMove_Dragging);
        canvas1.off('mouse:up', onMouseUp_Dragging);

        var activeObject = rect;
        if (logging.mouseEvents)
            console.log('onMouseUp_Dragging: rect=', rect, 'active=', canvas1.getActiveObject())
        if (activeObject.validated) {
            fixRectSizeAfterScaling(activeObject) // Fix negative width or height
            updateRectObsGeometry(activeObject) // Copy geometry to obs
                //canvas1.deactivateAll()
            rect.hasControls = true; // Reactivate controls when created
            canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
            canvas1.renderAll();

            // Update default size to latest rectangle created
            default_width = activeObject.width;
            default_height = activeObject.height;

            updateForm(activeObject)
            $('#I')[0].focus() // Set focus to allow easy ID typing
            $('#I')[0].select()
            
            printMessage("Press enter to validate ID", "green")
        } else {
            // Not enough drag to define a new rectangle
            canvas1.deactivateAll()
            canvas1.remove(activeObject);
            //canvas1.renderAll();
            //$("#I").val("no selection")
            if (logging.mouseEvents)
                console.log('onMouseUp: removing non validated activeObject=', activeObject)
            deselectBee()
        }
        refresh();
    }

    canvas1.on('mouse:up', onMouseUp_Dragging);
    canvas1.on('mouse:move', onMouseMove_Dragging);
    return rect;
}

function rotatedRectGeometry(rect) {
    // Compute various properties of Fabric.js rotated rect
    var geom = {}
    
    rect.setCoords() // Compute coordinates
    var coords = rect.oCoords
    console.log(rect)
    geom.center={x: (coords.tl.x+coords.br.x)/2, y: (coords.tl.y+coords.br.y)/2}
    geom.tl={x: coords.tl.x, y: coords.tl.y}
    geom.br={x: coords.br.x, y: coords.br.y}
    let center = {x: (coords.tl.x+coords.br.x)/2, 
                  y: (coords.tl.y+coords.br.y)/2}
    geom.unrotated = {left: center.x-rect.width/2, top: center.y-rect.height/2,
                      width: rect.width, height: rect.height
                      }
    
    if (typeof rect.angle !== 'undefined')
        geom.angle = rect.angle
    else
        geom.angle = 0
    
    return geom
}

fabric.BeeRect = fabric.util.createClass(fabric.Rect, {
    type: 'beerect',
    
    initialize: function (element, options) {
        options = options || {};

        this.callSuper('initialize', element, options);
    },
    
    _render: function (ctx) {
        this.callSuper('_render', ctx);
        
        identifyBeeRect(ctx, this, 5);
    }
});

// Create a fabric rectangle at specific place
// all units in canvas coordinates
function addRect(id, startX, startY, width, height, status, obs, angle) {
    console.log('addRect: id=',id)

    var tmpObs
    if (status === "new") {
        tmpObs = new Observation(id)
        tmpObs.ID = id
        tmpObs.frame = getCurrentFrame()
        tmpObs.time = getCurrentVideoTime()
        tmpObs.bool_acts[0] = $('#F').prop('checked');
        tmpObs.bool_acts[1] = $('#P').prop('checked');
        tmpObs.bool_acts[2] = $('#E').prop('checked');
        tmpObs.bool_acts[3] = $('#L').prop('checked');
    } else if (status === "db") {
        tmpObs = cloneObs(obs)
    } else {
        console.log("addRect: error, status unknown. status=", status)
    }

    if (typeof angle !== 'undefined') {
        console.log('addRect: apply angle=',angle)
    } else {
        console.log('addRect: angle=',angle)
        angle = 0
    }
    if (typeof obs !== 'undefined') {
        angle = obs.angle
    }

    var rect = new fabric.BeeRect({
        id: id,
        //new_id: id, // never_used
        status: status,
        obs: tmpObs,
        top: startY,
        left: startX,
        width: width,
        height: height,
        fill: 'transparent',
        stroke: 'blue',
        strokewidth: 6,
        cornerColor: 'red',
        cornerSize: 6,
        rotatingPointOffset: 20,
        centeredRotation: true,
        
        //hasRotatingPoint: true,
        //lockRotation: false
    });
    rect.setAngle(angle);
    
    updateRectObsGeometry(rect)
    if (logging.addRect)
        console.log("addRect: rect =", rect)

    //rect.setControlVisible('mtr', false)  // Remove rotation handle
    canvas1.add(rect);

    if (logging.addRect)
        console.log("added");
    return rect;
}

// Try to find a fabric rectangle with a given id
function findRect(id) {

    var rects = canvas1.getObjects();
    if (rects) {
        var r;
        for (var i = 0; i < rects.length; i++) {
            if (rects[i].id == id) {
                r = rects[i];
                return r;
            }
        }
    }
    return undefined
}

function dist(x, y, x2, y2) {
    return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
}

// predictId:
// rect=={x:xx,y:yy} or rect={x:xx,y:yy,width:ww,height:hh}
// all units in video/obs coordinates
function predictId(frame, rect, mode) {
    //console.log('predictId(info), info=',info)
    // Auxiliary function: checks if two rectangles match using various modes
    var checkMatch = function(obs, rect, mode) {
        //console.log('obs=',obs,'rect=',rect)
        if (mode == "distance_topleft") {
            // Compare the distance from (x,y) to topleft corner of obs
            let d = dist(rect.x, rect.y, obs.x, obs.y);
            if (d < 40) {
                return true;
            }
        } else if (mode == "distance_center") {
            // Compare the distance from rect center to obs center
            let d = dist(rect.x + 0.5 * rect.width, rect.y + 0.5 * rect.height,
                         obs.x + 0.5 * obs.width, obs.y + 0.5 * obs.height);
            if (d < 40) {
                return true;
            }
        } else if (mode == "pointinside") {
            // Check if center of rect is inside obs
            if ((rect.x >= obs.x) && (rect.x <= obs.x + obs.width) &&
                (rect.y >= obs.y) && (rect.y <= obs.y + obs.height)) {
                return true
            }
        } else if (mode == "pointinside") {
            // Check if center of rect is inside obs
            var cx = rect.x + 0.5 * w,
                cy = rect.y + 0.5 * h;
            if ((cx >= obs.x) && (cx <= obs.x + obs.width) && 
                (cy >= obs.y) && (cy <= obs.y + obs.height)) {
                return true
            }
        } else {
            console.log("predictId.checkMatch: mode unsupported:", mode)
        }
        return false;
    }
    if (frame > 0) {
        let ids = getValidIDsForFrame(frame - 1);
        //console.log("ids=",ids)
        for (let id of ids) {
            var obs = getObsHandle(frame - 1, id, false);
            //console.log("id=",id,"obs=",obs)
            if (checkMatch(obs, rect, mode)) {
                if (findRect(id))
                    return {
                        id: computeDefaultNewID(),
                        predicted_id: id,
                        predicted_obs: obs,
                        reason: 'conflict'
                    };
                else
                    return {
                        id: id,
                        obs: obs
                    };
            }
        }
    }
    let ids = getValidIDsForFrame(frame + 1);
    //console.log("ids=",ids)
    for (let id of ids) {
        let obs = getObsHandle(frame + 1, id, false);
        //console.log("id=",id,"obs=",obs)
        if (checkMatch(obs, rect, mode)) {
            if (findRect(id))
                return {
                    id: computeDefaultNewID(),
                    predicted_id: id,
                    predicted_obs: obs,
                    reason: 'conflict'
                };
            else
                return {
                    id: id,
                    obs: obs
                };
        }
    }
    return {
        id: computeDefaultNewID(),
        reason: 'default'
    };
}
function predictIdFromTags(frame, pt, mode) {
    var tmp = Tags[frame];
    if (tmp == null) return {id: undefined, tag: undefined, reason:'notFound'};
    var frame_tags = tmp.tags;
    if (frame_tags != null) {
        for (let k in frame_tags) {
            let tag = frame_tags[k];
            let d = dist(pt.x, pt.y, tag.c[0], tag.c[1]);
            if (d < 40) {
                return {id: tag.id, tag: tag, reason:'distance'};
            }
        }
    }
    return {id: undefined, tag: undefined, reason:'notFound'};
}
function computeDefaultNewID() {
    var default_id = 0
    let frame = getCurrentFrame()
    let ids = getValidIDsForFrame(frame)
    if (ids.length == 0) {
        return 0
    }
    function contains(A,id) {
        for (let i in A) {
            if (A[i] == id) return true // NOTE: 4=='4' is considered true
        }
        return false
    }
    while (contains(ids,default_id)) default_id++
    if (logging.idPrediction) {
        console.log("computeDefaultNewID: frame=",frame," default_id=",default_id)
        console.log("   ids=",ids)
    }
    return default_id
}

function onMouseDown2(ev) {
   if (ev.ctrlKey) {
      console.log("onMouseDown2",ev);
      
//      canvasTform[1] = 
      
      ev.preventDefault();
      return false;
   }
   console.log("onMouseDown2");
   return true;
}

function onBackgroundClick(option) {
    console.log('onBackgroundClick option=',option)
    let ptCanvas = {x: option.e.offsetX,
            y: option.e.offsetY}
    let pt = canvasToVideoPoint(ptCanvas)
    console.log('pt=',pt)
    pt = {x:pt.x, y:pt.y}
    console.log('pt=',pt)

    tmp = predictIdFromTags(getCurrentFrame(), pt)
    
    console.log('id=',tmp.id)
    
    if (tmp.id != null) {
        selectBeeByID(tmp.id)
        refresh()
    }
}

function onMouseDown(option) {
    if (logging.mouseEvents)
        console.log('onMouseDown: option=', option)
    
    printMessage("")

    if (typeof option.target != "undefined") {
        // Clicked on an existing object
        if (logging.mouseEvents)
            console.log("onMouseDown: Clicked on object ", option.target)
            // This is now handled by event onObjectSelected()
        return false;
    } else {
        // Clicked on the background
        if (logging.addRect)
            console.log('onMouseDown: no object selected', option)

        canvas1.deactivateAllWithDispatch()

        var startY = option.e.offsetY,
            startX = option.e.offsetX;
        let videoXY = canvasToVideoCoords({
            left: startX,
            top: startY
        })
        var videoX = videoXY.x;
        var videoY = videoXY.y;
        var rect;

        if (option.e.shiftKey) {
            // If SHIFT down, try to copy prediction, else create box centered on click
            // predictId takes video/obs coordinates units
            let prediction = predictId(getCurrentFrame(), {
                x: videoX,
                y: videoY
            }, "pointinside");
            let predictionTag = predictIdFromTags(getCurrentFrame(), {
                x: videoX,
                y: videoY
            }, "distance");
            $("#I").val(prediction.id)
            
            if (logging.idPrediction) {
                console.log('onMouseDown: predictId         --> prediction=',prediction)
                console.log('onMouseDown: predictIdFromTags --> predictionTag=',predictionTag)
            }

            if (predictionTag.id !== undefined) {
                // If found a tag on this frame
                if (logging.mouseEvents)
                    console.log("onMouseDown: predictionTag=", predictionTag)
                let tag = predictionTag.tag;
                let pt = videoToCanvasPoint({x:tag.c[0], y:tag.c[1]});
                
                if (prediction.obs && prediction.id==tag.id) {
                    // If found a rect with same id as tag on adjacent frame
                    let obs = prediction.obs;
                    // Copy rectangle from source of prediction
                    // addRect takes canvas coordinates units
                    let r = videoToCanvasCoords(obs)
                    rect = addRect(prediction.id, r.left, r.top, r.width, r.height, "new");
                    rect.obs.bool_acts[0] = obs.bool_acts[0]; // Copy fanning flag
                    rect.obs.bool_acts[1] = obs.bool_acts[1]; // Copy pollen flag
                } else {
                    // Only found tag
                    
                    let angle = tagAngle(tag)
                    if (typeof angle !== 'undefined') {
                        console.log("MouseDown: found angle=",angle)
                        rect = addRect(predictionTag.id, 
                               pt.x - default_width / 2, 
                               pt.y - default_height / 2,
                               default_width, default_height, "new", undefined, angle);
                    } else {
                        console.log("MouseDown: angle not found")
                        rect = addRect(predictionTag.id, 
                               pt.x - default_width / 2, 
                               pt.y - default_height / 2,
                               default_width, default_height, "new");
                    }
                }
                if (logging.mouseEvents)
                    console.log("onMouseDown: copied rect from tag ", tag)
            } else if (prediction.obs) {
                // Only found rect
                let obs = prediction.obs;
                // Copy rectangle from source of prediction
                // addRect takes canvas coordinates units
                let r = videoToCanvasCoords(obs)
                let width = r.width,
                    height = r.height
                rect = addRect(prediction.id, startX - width / 2, startY - height / 2, width, height, "new");
                rect.obs.bool_acts[0] = obs.bool_acts[0]; // Copy fanning flag
                rect.obs.bool_acts[1] = obs.bool_acts[1]; // Copy pollen flag
                if (logging.mouseEvents)
                    console.log("onMouseDown: copied rect from ", obs)
            } else {
                // Did not find any tag nor rect
                rect = addRect(prediction.id, startX - default_width / 2, startY - default_height / 2,
                    default_width, default_height, "new");
                if (logging.mouseEvents)
                    console.log("onMouseDown: created new rect with default size ", rect)
            }
            rect.setCoords();
            canvas1.setActiveObject(rect);
            canvas1.renderAll();

            //automatic_sub();
            submit_bee();
            // Fire mouse:down again, this time with the created target
            canvas1.fire("mouse:down", {
                target: rect,
                e: option.e
            })
        } else if (option.e.ctrlKey) {
            // If no SHIFT key, but CTRL key, draw the box directly. Try to predict ID using TopLeft corner
            let prediction = predictId(getCurrentFrame(), {
                x: videoX,
                y: videoY
            }, "distance_topleft");
            $("#I").val(prediction.id)

            // Create rectangle interactively
            rect = addRectInteractive(prediction.id, startX, startY);
            if (logging.mouseEvents)
                console.log("onMouseDown: creating new rect interactive", rect)
        } else {
            // If no SHIFT, nor CTRL, try to pan the image
            //startPanning(option) // FIXME: need to debug rect update when panning
        }

        if (logging.mouseEvents)
            console.log("Click time: " + video.currentTime)

//        updateForm(rect)
    }

    // REMI: Select ID field to facilitate changing ID
    document.getElementById("I").focus();
}

function startPanning(option) {
    panning={}
    panning.p0 = {
        x:  option.e.offsetX,
        y:  option.e.offsetY
    }
    panning.canvasTransform0 = [...canvasTransform]

    var onMouseMove_Panning = function(option) {
        if (logging.mouseMoveEvents)
            console.log("onMouseMove_Panning: option=", option);
        var e = option.e;
        
        canvasTransformSet(panning.canvasTransform0)
        canvasTransform[4] = panning.canvasTransform0[4]-(e.offsetX-panning.p0.x)*panning.canvasTransform0[0]
        canvasTransform[5] = panning.canvasTransform0[5]-(e.offsetY-panning.p0.y)*panning.canvasTransform0[3]

        refresh()
    }
    var onMouseUp_Panning = function(e) {
        if (logging.mouseEvents)
            console.log("onMouseUp_Panning: e=", e);
        canvas1.off('mouse:move', onMouseMove_Panning);
        canvas1.off('mouse:up', onMouseUp_Panning);

        refresh();
    }

    canvas1.on('mouse:up', onMouseUp_Panning);
    canvas1.on('mouse:move', onMouseMove_Panning);
}

// REMI: Scaling arectangle in Fabric.js does not change width,height: it changes only scaleX and scaleY
// fix this by converting scaleX,scaleY into width,height change
function fixRectSizeAfterScaling(rect) {
    rect.set('width', rect.get('width') * rect.get('scaleX'));
    rect.set('scaleX', 1);
    rect.set('height', rect.get('height') * rect.get('scaleY'));
    rect.set('scaleY', 1);

    // Fix also negative width and height
    if (rect.get('width') < 0) {
        rect.set('width', -rect.get('width'));
        rect.set('left', rect.get('left') - rect.get('width'));
    }
    if (rect.get('height') < 0) {
        rect.set('height', -rect.get('height'));
        rect.set('top', rect.get('top') - rect.get('height'));
    }
    rect.setCoords();

    // Update default size when rectangle is created by just clicking
    default_width = rect.get('width');
    default_height = rect.get('height');
}

function onMouseUp(option) {
    if (logging.mouseEvents)
        console.log('onMouseUp: option=', option)
        //canvas1.off('mouse:move'); // See onMouseUp_Dragging
        // All moving stuff handled now by event onObjectModified() and onMouseUp_Dragging()
    onBackgroundClick(option)
}

extraScale = 1
function onMouseWheel(option) {
    if (!option.shiftKey) return;
    if (logging.mouseEvents)
        console.log('onMouseWheel: option=', option)
    let delta = option.originalEvent.wheelDelta;
    
    let scaling = Math.pow(2,delta/512)
    
    //var rect = canvas.getBoundingClientRect();
    //let cx = option.originalEvent.clientX - rect.left
    //let cy = option.originalEvent.clientY - rect.top
    cx = option.originalEvent.offsetX
    cy = option.originalEvent.offsetY

    let center = [cx, cy]
    
    canvasTransformScale(scaling, center)
    
//     extraScale *= scaling
//     if (extraScale<1) extraScale = 1
    if (logging.mouseEvents) {
        console.log('onMouseWheel: scaling=', scaling, ' center=', center)
        console.log('onMouseWheel: canvasTransform=', canvasTransform)
    }
    
    refresh()
    option.preventDefault();
}

function onObjectSelected(option) {
    if (logging.selectionEvents)
        console.log("onObjectSelected:", option)
    //var activeObject = canvas1.getActiveObject();
    if (typeof option.target.id != "undefined") {
        if (option.target.id != canvas1.getActiveObject().id) {
            console.log('ERROR in onObjectSelected: option.target.id != canvas1.getActiveObject().id', option.target.id, canvas1.getActiveObject().id)
        }
        selectBee(option.target)
        lastSelected = option.target
        updateDeleteButton()
    }
}

function onObjectDeselected(option) {
    if (logging.selectionEvents)
        console.log("onObjectDeselected: ", option);
       
    if (lastSelected !== null) {
        if (lastSelected.status=="new") {
            if (logging.mouseEvents)
                console.log('onObjectDeselected: removing non submitted lastSelected=', lastSelected)

            // Remove tmp rect as soon as it becomes inactive
            canvas1.remove(lastSelected);
            lastSelected = null
            refresh()
        }
        updateDeleteButton()
    }
}

function onObjectMoving(option) {
    //return; // No real need for Moving, we can update everything once at the end in onObjectModified

    // Called during translation only
    var activeObject = option.target; //canvas1.getActiveObject();
    if (logging.mouseMoveEvents)
      console.log("onObjectMoving: activeObject=", activeObject);
    
    fixRectSizeAfterScaling(activeObject)
    updateRectObsGeometry(activeObject)

    //canvas1.renderAll(); // Refresh rectangles drawing
    refreshOverlay()
    
    updateForm(activeObject);
    //automatic_sub();
    
    if (flagShowZoom) {
        showZoom(activeObject)
    }
}

function onObjectModified(option) {
    // Called after translation or scaling
    var activeObject = option.target; //canvas1.getActiveObject();
    fixRectSizeAfterScaling(activeObject)
    if (logging.mouseEvents)
      console.log("onObjectModified: activeObject=", activeObject);
    
    updateRectObsGeometry(activeObject)

    //canvas1.renderAll(); // Refresh rectangles drawing
    refreshOverlay()
    updateForm(activeObject);
    //showZoom(activeObject)
    automatic_sub();
    
    if (flagShowZoom) {
        showZoom(activeObject)
    }
}

function onActivityChanged(event) {
    if (logging.guiEvents)
        console.log("onActivityChanged: event=", event)
    var activeObject = canvas1.getActiveObject()
    if (activeObject !== null) {
        updateRectObsActivity(activeObject)
        automatic_sub()
    }
}


// # Form and current bee control

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
  
    refresh();
    refreshChronogram();
}

function automatic_sub() {
    var activeObject = canvas1.getActiveObject();
    if (activeObject.status == "db") {
        submit_bee()
    } else {
        console.log("automatic_sub: not submitted, as tmp rect")
        refresh() // Just refresh
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
            obs = cloneObs(Tracks[video2.get()][activeObject.id])
            delete Tracks[video2.get()][activeObject.id];
            undoPush('delete', obs)
        }

        refresh()
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
                seekFrame(obs.frame)
                return
            }
            
            storeObs(obs);
            rect = addRectFromObs(obs)
            console.log("rect=",rect)
            canvas1.setActiveObject(rect)
            //submit_bee()
            selectBee(rect)
        }
    
        refresh();
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


// ## Auxiliary display

function clickZoomShowOverlay() {
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if ($('#zoom').is(':visible')) {
        showZoom(lastSelected)
    }
}
function clickShowZoom() {
    flagShowZoom = $('#checkboxShowZoom').is(':checked')
    updateShowZoom()
}
function updateShowZoom() {
    if (flagShowZoom) {
        $('#zoomDiv').show()
        showZoom(lastSelected)
    } else {
        $('#zoomDiv').hide()
    }
}
function showZoom(rect) {
    showZoomTag(defaultSelectedBee)
    return

    let zw=400
    let zh=400

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    zoom_canvas.width=zw
    zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    zoom_ctx.drawImage(video, 
       (rect.obs.cx - mw), (rect.obs.cy - mh), w, h,
        0,0,zh,zw);
    
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if (zoomShowOverlay) {
      let activeObject = canvas1.getActiveObject()
      let obs = activeObject.obs
    
      zoom_ctx.beginPath();
      zoom_ctx.moveTo(mw,0)
      zoom_ctx.lineTo(mw,zh)
      zoom_ctx.moveTo(0,mh)
      zoom_ctx.lineTo(zw,mh)
      zoom_ctx.rect(mw+obs.x-obs.cx,mh+obs.y-obs.cy, obs.width,obs.height)
      zoom_ctx.strokeStyle = 'blue'
      zoom_ctx.stroke()        
    }
}

function getCurrentTag() {
    return getTag(getCurrentFrame(), defaultSelectedBee)
}

var oldCX, oldCY, oldAngle;
function showZoomTag() {
    let zw=400
    let zh=400

    console.log('showZoomTag')
  
    let cx=0
    let cy=0
    let tag=getCurrentTag()
    if (typeof tag === 'undefined') {
        cx = oldCX
        cy = oldCY
        angle = oldAngle
    } else {
        cx = tag.c[0]
        cy = tag.c[1]
        angle = tagAngle(tag)/180*Math.PI
    }
    
    oldCX = cx
    oldCY = cy
    oldAngle = angle

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    zoom_canvas.width=zw
    zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    
    zoom_ctx.save()
    zoom_ctx.translate(mw,mh)
    zoom_ctx.rotate(-angle)
    zoom_ctx.translate(-mw,-mh)
    zoom_ctx.drawImage(video, 
       (cx - mw), (cy - mh), w, h,
        0,0,zh,zw);
    zoom_ctx.restore()
    
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if (zoomShowOverlay) {
      zoom_ctx.save()
      zoom_ctx.beginPath();
      zoom_ctx.moveTo(mw,0)
      zoom_ctx.lineTo(mw,zh)
      zoom_ctx.moveTo(0,mh)
      zoom_ctx.lineTo(zw,mh)
      zoom_ctx.strokeStyle = 'blue'
      zoom_ctx.stroke()   
      
      if (typeof tag !== 'undefined') {
          zoom_ctx.beginPath();
          zoom_ctx.rect(mw-3,mh-3,6,6)
          zoom_ctx.fillStyle = 'yellow'
          zoom_ctx.fill()   
      }     
      zoom_ctx.restore()
    }
}






// ###########################################################
// CHRONOGRAM

function initChrono() {
    // global variables
    axes = undefined
    chronogramData = []
    tagsChronogramData = []

    // SVG adjust to its parent #chronoDiv
    var svg = d3.select("#svgVisualize")    
    svg.attr("width", "100%").attr("height", "100%")

    /* ## Build the axes (resizable) ## */

    options = {useOrdinalScale: true}
    axes = new ChronoAxes(svg, videoinfo, options)
    axes.onClick = onAxesClick         // Callback when the user clicks in axes
    axes.onAxesChanged = onAxesChanged // Callback when zooming or resizing axes
    
    // For some reason, svg does not have the correct size at the beginning,
    // trigger an asynchronous refresh
    setTimeout(axes.refreshLayout, 50)
    
    // Make it resizable using jQuery-UI
    $("#chronoDiv").resizable({
      helper: "ui-resizable-helper",
    });
    // Detect #chronoDiv resize using ResizeSensor.js
    // Note: cannot detect resize of SVG directly
    new ResizeSensor($("#chronoDiv")[0], function() {
       console.log('#chronoDiv resized');
       axes.refreshLayout()
    });
    // Equivalent pure jQuery seems to have trouble 
    // the size of chronoDiv seems to be defined after the callback is called
    //     $("#chronoDiv").on("resize", function(event) {
    //         console.log('#chronoDiv.onresize',event)
    //         axes.refreshLayout()
    //         return false
    //       })


    /* ## Init chronogram content ## */
    
    initActivities()     
    initTagIntervals()
    
    initVideoSpan()
}

/* Synchronization between chronogram, video and chronogramData */
function domainxFromVideo() {
    var domain
    if (isNaN(videoinfo.duration))
      domain = [0,1]
    else
      domain = [0, videoinfo.nframes]
    if (logging.chrono)
      console.log("domainxFromVideo: domain=",domain)
    return domain
}
function domainxFromChronogramData() {
    if (chronogramData.length === 0) return [0,1]
    var range = d3.extent(chronogramData, function(d) {return Number(d.x); })
    return [range[0]-0.5, range[1]+0.5] // add some margin
}
function domainyFromChronogramData() {
    if (chronogramData.length === 0) return [0,1]
    var range = d3.extent(chronogramData, function(d) {return Number(d.y); })
    return [range[0], range[1]+1.0] // Add 1.0 for the height of the interval
}
function domainyFromTagData() {
    if (tagIntervals.length === 0) return [0,1]
    var range = d3.extent(tagIntervals, function(d) {return Number(d.id); })
    return [range[0], range[1]+1.0] // Add 1.0 for the height of the interval
}
function validIdsDomain() {
    if (chronogramData.length === 0) return []
    let ids = new Set()
    chronogramData.forEach(function(d) {ids.add(d.y)})
    return [...ids] // Convert to array
}
function validTagIdsDomain() {
    if (tagIntervals.length === 0) return []
    let ids = new Set()
    tagIntervals.forEach(function(d) {ids.add(d.id)})
    return [...ids] // Convert to array
}


/* Update chronogram axes properties */
function updateChronoXDomainFromVideo() {
    axes.xdomain(domainxFromVideo())
}
function updateChronoYDomain() {
    //var a = domainyFromChronogramData()
    //var b = domainyFromTagData()
    //axes.ydomain([Math.min(a[0],b[0]),Math.max(a[1],b[1])]) // Linear scale
    
    // Utility function to sort mixed numbers/alpha+number
    // Source: http://stackoverflow.com/a/4340448
    function parseItem (item) {
      const [, stringPart = '', numberPart = 0] = /(^[a-zA-Z]*)(\d*)$/.exec(item) || [];
      return [stringPart, numberPart];
    }
    function mixedCompare(a,b) {
        const [stringA, numberA] = parseItem(a);
        const [stringB, numberB] = parseItem(b);
        const comparison = stringA.localeCompare(stringB);
        return comparison === 0 ? Number(numberA) - Number(numberB) : comparison;
    }
    
    let domain = validIdsDomain()
    let domainTags = validTagIdsDomain()
    domainset = new Set([...domain, ...domainTags]) // Merge the sets
    domain = [...domainset].sort(mixedCompare) // convert back to sorted array
    
    console.log('updateChronoYDomain: domain=',domain)
    
    axes.ydomain(domain)
    
    //axes.ydomain(['0','1','2','3','10','12']) // Testing
    
}
function updateTimeMark() {
    var frame = getCurrentFrame();
    if (typeof frame == "undefined") {
      frame = 0;
    }
    axes.setTimeMark(frame);
}

/* Callbacks to react to changes in chronogram axes */
function onAxesClick(event) {
    // User clicked in chronogram axes
    var frame = event.frame
    var id = event.id
    if (logging.axesEvents)
        console.log("onAxesClick: seeking to frame=",frame,"...");
 
    defaultSelectedBee = id
    if (frame==getCurrentFrame()) {
        // Try to select the bee in current frame
         selectBeeByID(id)
    } else {
        if (obsDoesExist(frame,id)) {
            // Set the id as default selection before seeking the frame
            defaultSelectedBee = id
        }
        seekFrame(frame)
        // external controller logic is supposed to call back updateTimeMark
        // to update the view
    }
}
function onAxesChanged(event) {
    // User zoomed, scrolled or changed chronogram range or size */
    if (logging.axesEvents)
        console.log('onAxesChanged: event=',event)
    
    updateChrono()
}

/* Callback to react to change in chronogramData */
function drawChrono() {
    // Strong update:
    // Redraw chronogram after change in chronogramData content
    // Need to adjust range
    
    updateChronoYDomain()
    //axes.ydomain([0,20]) // Uncomment for testing
    
    updateChrono()
}

/* Update chronogram content */
function updateChrono() {
    // Weak update:
    // Update chronogram without adjusting range
    
    // IMPORTANT: do not call axes.refreshAxes() or any
    // function that triggers is such as axes.here, 
    // as it would generate an infinite loop
    // Put that is the stronger update function drawChrono
    
    // Redraw activities
    updateActivities()
    
    // Redraw timeline
    updateTimeMark() // Normally already updated by frameChanged

    updateTagIntervals()
    
    updateVideoSpan()
}


/* see code for chronogram axes in ChronoAxes.js */



function initVideoSpan() {
    var chronoGroup = axes.chronoGroup
    videoSpan = chronoGroup
        .append("g").attr('id','videoSpan')
        .attr("clip-path", "url(#videoSpanClipPath)")
    videoSpan.append("clipPath")
        .attr("id", "videoSpanClipPath") // give the clipPath an ID
        .append("rect")
        .attr("x", 0).attr("y", -15)
        .attr("width", axes.width()).attr("height", 15)
    videoSpan.append("rect").attr('class','background')
        .attr("x", 0).attr("y", -15)
        .attr("width", axes.width()).attr("height", 15)
        .style("stroke-width", "1px")
        .style("fill", "#f0fff0")
    videoSpan.append("rect").attr('class','interval')
        .attr("x", 0).attr("y", -15)
        .attr("width", 1).attr("height", 15) // Just init
        .style("stroke", "blue")
        .style("fill", "skyblue")
    videoSpan.append("text").attr('class','label')
        .style("text-anchor", "start")
        .text("video name ?");
}
function updateVideoSpan() {
    var videoSpan = axes.chronoGroup.select('#videoSpan')
    //videoSpan.attr("transform",
    //               "translate("+(axes.margin.left)+","+(axes.margin.top)+")")
    videoSpan.selectAll('#videoSpanClipPath > rect')
             .attr("width", axes.width()).attr("y", -15)
    videoSpan.selectAll('.background')
             .attr("x", 0).attr("y", -15)
             .attr("width", axes.width()).attr("height", 15)
    videoSpan.selectAll('.interval')
             .attr("x", axes.xScale(0)).attr("y", -13)
             .attr("width", axes.xScale(videoinfo.nframes+1)-axes.xScale(0))
             .attr("height", 11);
    videoSpan.selectAll('.label')
             .attr("x", axes.xScale(0)+2).attr("y", -4)
             .text(videoinfo.name.split('/').pop())
}




function insertActivities(selection) {
    selection.insert("rect")
        .style("stroke-width", "1px")
        .attr("class", "activity")
        .call(setGeomActivity)
}
function setGeomActivity(selection) {
    selection
        .attr("x", function(d) {
            return axes.xScale(Number(d.x));
        })
        .attr("y", function(d) {
//             return axes.yScale(Number(d.y) + 0.1);  // for linear scale
            return axes.yScale(Number(d.y)) + 0.1*axes.yScale.rangeBand(); // ordinal
        })
        .attr("width", function(d) {
            return (Math.max( axes.xScale(Number(d.x) + 1) - axes.xScale(Number(d.x)), 10 )); // Min 10 pixels
            //return 8
        })
        .attr("height", function(d) {
            //return (yScale(Number(d.y) + 0.9) - yScale(Number(d.y) + 0.1));
            return activityHeight(d)
        })
        .style("fill", activityColor)
        .style("stroke", activityColor)
}
function activityColor(d) {
        var color = "black";
        if (d.Activity == "entering")
            color = "#FF0000";
        else if (d.Activity == "exiting")
            color = "#0000FF";
        else if (d.Activity == "pollenating")
            color = "#CFCF00";
        else if (d.Activity == "fanning")
            color = "#20FF20";
        return color;
    }
function activityHeight(d) {
        var h = 2
        if (d.Activity == "entering")
            h=8
        else if (d.Activity == "exiting")
            h=8
        else if (d.Activity == "pollenating")
            h=6
        else if (d.Activity == "fanning")
            h=6;
        return h;
    }
function updateActivities(onlyScaling) {
    // Redraw activities
    if (onlyScaling) {
      // Lightweight update (reuse previous activityRects)
      activityRects = axes.plotArea.selectAll(".activity").data(chronogramData);
      activityRects.call(setGeomActivity)
    } else {
      // Full update
      //console.log('updateActivities')
      activityRects = axes.plotArea.selectAll(".activity").data(chronogramData)
          .call(setGeomActivity)
      activityRects.enter().call(insertActivities)
      activityRects.exit().remove()
    }
}
function initActivities() {
    //chronogramData = []
    chronogramData.length = 0
    updateActivities()
}



function insertTag(selection) {
    selection
        .insert("rect")
        .style("fill", "blue")
        .style("fill-opacity", "0.2")
        .style("stroke", "blue")
        .style("stroke-width", "1px")
        //.attr("r",5)
        .attr("class","tag")
        .call(setTagGeom)
}
function setTagGeom(selection) {
    selection
        .attr("x", function(d) {
            //return xScale(Number(d.frame) - 0.5);
            return axes.xScale(Number(d.begin));
        })
        .attr("y", function(d) {
            return axes.yScale(Number(d.id));
        })
        .attr("width", function(d) {
            return axes.xScale(Number(d.end))-axes.xScale(Number(d.begin));
        })
        .attr("height", function(d) {
            return axes.yScale.rangeBand(); // Ordinal scale
        })
}
function updateTagIntervals(onlyScaling) {
    // Redraw tag intervals
    if (onlyScaling) {
      setTagGeom(tagSel)
    } else {
      tagSel = axes.plotArea.selectAll(".tag").data(tagIntervals);
      tagSel.enter().call(insertTag)
      tagSel.exit().remove();
      setTagGeom(tagSel)
    }
}
function initTagIntervals() {
    //tagsData = []
    tagIntervals = []
    updateTagIntervals()
}






function refreshChronogram() {

    //Deleting everything on the svg so we can recreate the updated chart
    //d3.selectAll("svg > *").remove();
    //Emptying the array so we won't have duplicates
    //for (var i = 0; i < chronogramData.length; i++)
    //    chronogramData.pop();
    chronogramData.length = 0
    if (showObsChrono) {
        for (let F in Tracks) {
            for (let id in Tracks[F]) {
                let chronoObs = {'x':F, 'y':id, 'Activity':""};

                if (Tracks[F][id].bool_acts[2]) {
                    chronoObs.Activity = "entering";
                } else if (Tracks[F][id].bool_acts[3]) {
                    chronoObs.Activity = "exiting";
                } else if (Tracks[F][id].bool_acts[1]) {
                    chronoObs.Activity = "pollenating";
                } else if (Tracks[F][id].bool_acts[0]) {
                    chronoObs.Activity = "fanning";
                }

                chronogramData.push(chronoObs);
            }
        }
    }
  
    
//  tagsData.length=0
//     for (let F in Tags) {
//         let tags = Tags[F].tags
//         for (let i in tags) {
//             let id = Number(tags[i].id)
//             let hamming = Number(tags[i].hamming)
//             if (hamming==0) {
//               let tag = {
//                 "frame":F,
//                 "id":id
//               }
//               tagsData.push(tag)
//             }
//         }
//     }

    if (logging.chrono)
        console.log("refreshChronogram: convert tags to intervals...")


    tagIntervals = []
    if (showTagsChrono) {
        /* Transpose Tags data structure */
        ttags = []
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id]=[];
            }
        }
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id][F]=tags[i];
            }
        }
    
        /* Convert to intervals */
        for (let id in ttags) {
          let obsarray = ttags[id]
          let activeInterval = []
          let isActive = false
          for (let f in obsarray) {
            let tags = obsarray[f]
        
            if (!tagsSampleFilter(tags)) {
                continue
            }
        
            if (isActive) {
              let doPush = false
              if (activeInterval.end == f-1) {
                activeInterval.end = f
              } else {
                doPush = true
              }
              if (doPush) {
                // Close previous 
                activeInterval['end']++
                if (tagsIntervalFilter(activeInterval))
                    tagIntervals.push(activeInterval)
                // Open new one
                activeInterval={'id':id,'begin':f,'end':f}
              }
            } else {
              // Open new one
              activeInterval={'id':id,'begin':f,'end':f}
              isActive=true;
            }
          }
          // Close if active
          if (isActive)
            activeInterval['end']++
            if (tagsIntervalFilter(activeInterval))
                tagIntervals.push(activeInterval)
        }
    }
    
    if (logging.chrono)
        console.log("refreshChronogram: drawChrono()...")

    //d3.selectAll("svg > *").remove();
    drawChrono();
}


function interpolateTags(maxgap) {
    tagIntervals = []

        /* Transpose Tags data structure */
        let ttags = []
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id]=[];
            }
        }
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id][F]=tags[i];
            }
        }
        
        function pushInterpolate(id,f1,f2) {
            let T1 = ttags[id][f1]
            let T2 = ttags[id][f2]
            let P1 = T1.p
            
            for (let j=f1+1; j<f2; j++) {
                let a = (j-f1)/(f2-f1)
                let cx = (1-a)*T1.c[0] + a*T2.c[0]
                let cy = (1-a)*T1.c[1] + a*T2.c[1]
                let dx = cx - T1.c[0]
                let dy = cy - T1.c[1]
                //cx = T1.c[0]
                //cy = T1.c[1]
                //dx = 0
                //dy = 0
                let pts = [ 
                            [P1[0][0]+dx,P1[0][1]+dy],
                            [P1[1][0]+dx,P1[1][1]+dy],
                            [P1[2][0]+dx,P1[2][1]+dy],
                            [P1[3][0]+dx,P1[3][1]+dy]
                          ];
                if (Tags[j] == null) {
                    Tags[j] = {tags:[]}
                }
                Tags[j].tags.push({id: id, c: [cx,cy], hamming: 1000, p: pts, frame: j})
                console.log('interpolate id='+id+' f='+j)
            }
        }
    
        /* Convert to intervals */
        for (let id in ttags) {
          let obsarray = ttags[id]
          let activeInterval = []
          let isActive = false
          for (let f0 in obsarray) {
            let f = Number(f0)
            let tags = obsarray[f]
        
            if (!tagsSampleFilter(tags)) {
                continue
            }
        
            if (isActive) {
              let doPush = false
              if (activeInterval.end == f-1) {
                activeInterval.end = f
              } else if (f - activeInterval.end < maxgap) {
                  // Try to interpolate
                  
                  pushInterpolate(id,activeInterval.end,f)
                  
                  activeInterval.end = f
              } else {
                  doPush = true
              }
              if (doPush) {
                // Close previous 
                //activeInterval['end']++
                //tagIntervals.push(activeInterval)
                // Open new one
                activeInterval={'id':id,'begin':f,'end':f}
              }
            } else {
              // Open new one
              activeInterval={'id':id,'begin':f,'end':f}
              isActive=true;
            }
          }
          // Close if active
          if (isActive)
            activeInterval['end']++
            //tagIntervals.push(activeInterval)
        }
}
