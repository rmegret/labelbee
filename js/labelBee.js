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
  "idPrediction": true,
  "axesEvents": false
};
var canvasTform = [0, 0, 1]; // cx,cy,scale
var plotTrack_range_backward = 5;
var plotTrack_range_forward = 5;
var flagCopyVideoToCanvas = true;

// ######################################################################
// INITITALIZATION

function initVideoSelectbox(optionList) {
    var selectbox = $("#selectboxVideo")
    selectbox.find('option').remove()

    $.each(optionList, function (i, el) {
        selectbox.append("<option value='data/"+el+"'>"+el+"</option>");
    });
}

function init() {
    videoinfo = {
        'name': 'No video loaded',
        'fps': 22, 
        'realfps': 20,  //realfps = 20.0078;
        'starttime': '2016-07-15T09:59:59.360',
        'duration': 1/fps, // Duration in seconds
        'nframes': 1
    };
    $('#fps').val(videoinfo.fps)
    initVideoSelectbox(['testvideo.mp4','vlc1.mp4','vlc2.mp4','1_02_R_170419141405.mp4'])
    
    $('#selectboxVideo')[0].selectedIndex=1; // select long video

    video2 = VideoFrame({
        id: 'video',
        frameRate: videoinfo.fps,
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
    showTags = true;
    showTagsTracks = false;
    showTagsOrientation = true
    $('#showTags')[0].checked=showTags
    $('#showTagsTracks')[0].checked=showTagsTracks
    $('#showTagsOrientation')[0].checked=showTagsOrientation

    // ### Chronogram
    initChrono();

    // ## Video + canvas

    canvas1 = new fabric.Canvas('canvas1');

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

    this.bool_acts = [false, false, false, false]; //Should be kept numerical because Ram
}

function cloneObs(obs) {
    return {
        ID: obs.ID,
        time: obs.time,
        frame: obs.frame,
        x: obs.x,
        y: obs.y,
        cx: obs.cx,
        cy: obs.cy,
        width: obs.width,
        height: obs.height,
        marked: obs.marked,
        permanent: obs.permanent,
        bool_acts: [obs.bool_acts[0], obs.bool_acts[1], obs.bool_acts[2], obs.bool_acts[3]]
    };
}

function getValidIDsForFrame(frame) {
    // Return an Iterator to Tracks[frame]

    if (typeof Tracks[frame] === 'undefined') {
        return [];
    }
    //NO: var ids = Array.from(Tracks[frame].keys()) // Problem: includes ids to undefined values also

    let trackf = Tracks[frame];
    let ids = [];
    for (let id in trackf) {
        if (typeof trackf[id] !== 'undefined') {
            ids.push(id);
        }
    }
    //console.log("getValidIDsForFrame: frame=",frame,",  Tracks[frame]=",trackf)
    //console.log("getValidIDsForFrame: ids=",ids)
    return ids;
}

function obsDoesExist(frame, id) {
    if (Tracks[frame] === undefined) {
        return false
    }
    if (Tracks[frame][id] === undefined) {
        return false
    }
    return true
}

function getObsHandle(frame, id, createIfEmpty) {
    if (createIfEmpty === undefined)
        createIfEmpty = false;

    var obs
    if (Tracks[frame] === undefined) {
        if (createIfEmpty) {
            Tracks[frame] = {}
        } else {
            return undefined
        }
    }

    if (Tracks[frame][id] === undefined) {
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
    obs.ID = tmpObs.ID;
    obs.time = tmpObs.time;
    obs.frame = tmpObs.frame;
    obs.x = tmpObs.x; // REMI: tmpObs should have same units than obs (no transformFactor here)
    obs.y = tmpObs.y;
    obs.cx = tmpObs.cx;
    obs.cy = tmpObs.cy;
    obs.width = tmpObs.width
    obs.height = tmpObs.height
    obs.marked = tmpObs.marked;
    obs.permanent = tmpObs.permanent;
    obs.bool_acts[0] = tmpObs.bool_acts[0];
    obs.bool_acts[1] = tmpObs.bool_acts[1];
    obs.bool_acts[2] = tmpObs.bool_acts[2];
    obs.bool_acts[3] = tmpObs.bool_acts[3];

    if (logging.submitEvents)
        console.log("Submitting obs = ", obs)
}

function changeObservationID(frame, old_id, new_id) {
    // REMI: modified to be be independent of View
    if (Tracks[frame] !== undefined) {
        if (Tracks[frame][old_id] !== undefined) {
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

function saveToFile() {
    console.log("savetoFile: exporting to JSON...")

    var json = JSON.stringify(Tracks);
    var filename = "Tracks.json";

    var blob = new Blob([json], {
        type: "text/json"
    });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.hidden = true;
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    console.log("savetoFile: waiting for user to save to file")
        //window.URL.revokeObjectURL(url);
    console.log("savetoFile: done")
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
            csv += "nodate," + F + "," + obs.ID + "," + action + "," + cargo + ",\n"
        }
    return csv
}

function saveToCSV() {
    console.log("savetoFile: exporting to CSV...")

    var txt = tracksToCSV(Tracks);
    var filename = "Tracks.csv";

    var blob = new Blob([txt], {
        type: "text/csv"
    });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.hidden = true;
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    console.log("savetoFile: waiting for user to save to file")
        //window.URL.revokeObjectURL(url);
    console.log("savetoFile: done")
}

function tracksToBBoxes(Tracks) {
    var csv = "#frame,left,top,right,bottom,pollen,arrive,leave,fanning\n"
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
                     "\n")
        }
    return csv
}

function saveToBBoxes() {
    console.log("saveToBBoxes: exporting bounding boxes to CSV...")
    console.log("with simple format: frame, left, top, right, bottom, pollen")

    var txt = tracksToBBoxes(Tracks);
    var filename = "BBoxes.csv";

    var blob = new Blob([txt], {
        type: "text/csv"
    });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.hidden = true;
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    console.log("saveToBBoxes: waiting for user to save to file")
        //window.URL.revokeObjectURL(url);
    console.log("saveToBBoxes: done")
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

function onTagsReaderLoad(event) {
    console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    console.log(obj)
    Tags = obj;
    refreshChronogram()
    onFrameChanged();
    
    console.log(event)
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
    if (e.key == "Delete" || e.key == 'd') {
        removeDecision();
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
function onFPSChanged(event) {
    console.log('onFPSChanged', event)

    videoinfo.fps = Number(event.target.value)
    video2.frameRate = videoinfo.fps
    updateChronoXDomainFromVideo()
    drawChrono()
}

// # Video loading
function onVideoLoaded(event) {
    // Called when video metadata available (size, duration...)
    if (logging.videoEvents)
        console.log('videoLoaded', event)
    var w,h
    
    w = video.videoWidth
    h = video.videoHeight
    videoinfo.duration = video.duration
    videoinfo.nframes = Math.floor(videoinfo.duration*videoinfo.fps)
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
    return video2.get();
}
function getCurrentVideoTime(format) {
  return video2.toMilliseconds()/1000.0
}
function getCurrentRealDate(format) {
  var D = new Date(videoinfo.starttime)
  D = new Date(D.getTime()+video2.toMilliseconds()*videoinfo.fps/videoinfo.realfps)
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

// This callback is the only one that should handle frame changes. It is called automatically by video2
function onFrameChanged(event) {
    let Cframe = getCurrentFrame();
    
    if (logging.frameEvents)
        console.log('frameChanged', Cframe)

    $('#currentFrame').html("Frame: " + Cframe)
    $('#vidTime').html("Video Time: " + video2.toHMSm(getCurrentVideoTime()))
    $('#realTime').html("Real Time: " + toLocaleISOString(getCurrentRealDate()))

    printMessage("")

    canvas1.clear();
    createRectsFromTracks()

    refresh();
      
    selectBeeByID(defaultSelectedBee);
    //updateForm(null);
}


function refresh() {
    if (flagCopyVideoToCanvas) {
      // Copy video to canvas for fully synchronous display
      ctx.drawImage(video, 0, 0, video.videoWidth / transformFactor, video.videoHeight / transformFactor);
    } else {
      // Rely on video under canvas. More efficient (one copy less), but
      // may have some time discrepency between video and overlay
      ctx.clearRect(0,0,video.videoWidth / transformFactor, video.videoHeight / transformFactor)
    }
    
    updateDeleteButton()
    updateUndoButton()
    
    updateTimeMark()
  
    // for each new frame, we need to reset everything:
    // remove all rectangles and recreate them
    if (canvas1) {
        canvas1.renderAll(); // Render all rectangles
        
        if (flagShowTrack) {
            plotTracks(ctx);
        }
        
        plotBees(ctx); // Identify the rectangles
        
        if (showTagsTracks)
            plotTagsTracks(ctx)
        else if (showTags)
            plotTags(ctx)
    }

    //refreshChronogram();
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
    video2.seekBackward();
}
function forward() {
    video2.seekForward();
}

function rewind2() {
    video2.seekBackward(videoinfo.fps);
}
function forward2() {
    video2.seekForward(videoinfo.fps);
}

function rewind3() {
    video2.seekBackward(videoinfo.fps*60);
}
function forward3() {
    video2.seekForward(videoinfo.fps*60);
}
function rewind4() {
    video2.seekBackward(videoinfo.fps*60*10);
}
function forward4() {
    video2.seekForward(videoinfo.fps*60*10);
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
    
    let s = canvasTform[2];
    let tx = (canvasTform[0]-vid_cx) / transformFactor + wd/2;
    let ty = (canvasTform[1]-vid_cy) / transformFactor + hd/2;
    
    var ctx
    ctx=canvas.getContext("2d");
    ctx.transform(s,0,0,s,tx,ty);
    
    ctx=canvas1.getContext("2d");
    ctx.transform(s,0,0,s,tx,ty);
        
    onFrameChanged()
}

function canvasToVideoCoords(rect) {
    return {
        x: rect.left * transformFactor,
        y: rect.top * transformFactor,
        width: rect.width * transformFactor,
        height: rect.height * transformFactor,
    }
}

function videoToCanvasCoords(obs) {
    let transformFactor2 = transformFactor;
    return {
        left: obs.x / transformFactor2,
        top: obs.y / transformFactor2,
        width: obs.width / transformFactor2,
        height: obs.height / transformFactor2,
    }
}
function videoToCanvasPoint(pt) {
    let transformFactor2 = transformFactor;
    return {
        x: pt.x / transformFactor2,
        y: pt.y / transformFactor2,
    }
}
function canvasToVideoPoint(pt) {
    let transformFactor2 = transformFactor;
    return {
        x: pt.x * transformFactor2,
        y: pt.y * transformFactor2,
    }
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
function updateRectObsGeometry(activeObject) {
    let videoRect = canvasToVideoCoords(activeObject)
    
    // Update Observation attached to rectangle from current Rect size
    let obs = activeObject.obs
    obs.x = videoRect.x
    obs.y = videoRect.y
    obs.width = videoRect.width
    obs.height = videoRect.height
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

function plotBees(ctx) {
    // Creation of rectangle was done in identify-->moved it to an explicit createRectsFromTracks()
    // Now, just plot identity
    let rects = canvas1.getObjects()
    for (let i in rects) { // For each rectangle, plot its identity
        identify(ctx, rects[i], 5);
    }
}
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
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
            z = 1;
        }

        for (let f=fmin+1; f<=fmax; f++) {
            let obs = getObsHandle(f, id, false)
            if (!obs) { z=0; continue;}
            let rect = videoToCanvasCoords(obs)            
            let x2 = rect.left + rect.width / 2;
            let y2 = rect.top + rect.height / 2;
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
            
            let x = rect.left + rect.width / 2;
            let y = rect.top + rect.height / 2;
    
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

    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;

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
       console.log('plotTags: msg=',msg)
    }
}
function plotTag(ctx, tag, color, flags) {
    if (color === undefined) {
        color = 'red'
    }
    if (typeof flags === 'undefined') {
      flags = {
        "id":true,
        "radius":5
      }
    }
    let radius = flags.radius
    if (typeof radius === 'undefined') { radius = 5; }

    let pt = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
    
    
    if (showTagsOrientation && typeof tag.p !== 'undefined') {
      let p = tag.p;
      let ppt=[]
      for (let i of [0,1,2,3]) {
          ppt[i] = videoToCanvasPoint({"x":p[i][0], "y":p[i][1]})
      if (false)
          ctx.beginPath();
          ctx.arc(ppt.x, ppt.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'magenta'
          ctx.fill();
        }
      let dir = [ppt[1].x-ppt[2].x,ppt[1].y-ppt[2].y]
      let m = Math.sqrt(dir[0]*dir[0]+dir[1]*dir[1])
      dir = [dir[0]/m, dir[1]/m]
      let L=40, L1=35, W1=4
      ctx.beginPath();
      ctx.moveTo(pt.x-dir[0]*L, pt.y-dir[1]*L)
      ctx.lineTo(pt.x+dir[0]*L, pt.y+dir[1]*L)
      ctx.lineTo(pt.x+dir[0]*L1+dir[1]*W1, pt.y+dir[1]*L1-dir[0]*W1)
      ctx.strokeStyle = 'magenta'
      ctx.stroke();
    }
    

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.closePath();
    ctx.stroke();

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
function plotTagsTracks(ctx) {
    let F = getCurrentFrame()
    let frange = Math.max(plotTrack_range_backward,plotTrack_range_forward)*1;
    let fmin = F-plotTrack_range_backward;
    let fmax = F+plotTrack_range_forward;
    if (fmin<0) fmin=0;
    //if (fmax>maxframe) fmax=maxframe;

    setColor = function(f) {
        if (f<=F) {
            color = "rgba(255,0,0,"+(1-Math.abs((f-F)/frange))+")"
            //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
        } else {
            color = "rgba(0,0,255,"+(1-Math.abs((f-F)/frange))+")"
        }
        return color;
    }

    // Plot past and future tag positions
    for (let f=fmin; f<=fmax; f++) {
        let tagsFrame = Tags[f]
        if (typeof(tagsFrame) === "undefined") continue;
        let tags = tagsFrame.tags
        let color = setColor(f)
        for (let i in tags) {
            let tag = tags[i]
            //console.log(tag)
            
            plotTag(ctx, tag, color, {"id":false, "radius": 2})            
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
    showTags = $('#showTags')[0].checked
    onFrameChanged()
}
function onShowTagsTracksChanged() {
    showTagsTracks = $('#showTagsTracks')[0].checked
    onFrameChanged()
}

function onTrackWindowChanged() {
    let range = Number($('#trackWindow')[0].value)
    console.log("onTrackWindowChanged range=",range)
    plotTrack_range_forward = range
    plotTrack_range_backward = range
}

var flagShowTrack = false
function clickShowTrack() {
    flagShowTrack = $("#checkboxShowTrack")[0].checked
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

// Create a fabric rectangle at specific place
// all units in canvas coordinates
function addRect(id, startX, startY, width, height, status, obs) {
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

    var rect = new fabric.Rect({
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
        cornerSize: 6
    });
    updateRectObsGeometry(rect)
    if (logging.addRect)
        console.log("addRect: rect =", rect)

    rect.setControlVisible('mtr', false)
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
    if (tmp === undefined) return {id: undefined, tag: undefined, reason:'notFound'};
    var frame_tags = tmp.tags;
    if (frame_tags !== undefined) {
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
                    rect = addRect(predictionTag.id, 
                               pt.x - default_width / 2, 
                               pt.y - default_height / 2,
                               default_width, default_height, "new");
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
        } else {
            // If no SHIFT key, draw the box directly. Try to predict ID using TopLeft corner
            let prediction = predictId(getCurrentFrame(), {
                x: videoX,
                y: videoY
            }, "distance_topleft");
            $("#I").val(prediction.id)

            // Create rectangle interactively
            rect = addRectInteractive(prediction.id, startX, startY);
            if (logging.mouseEvents)
                console.log("onMouseDown: creating new rect interactive", rect)
        }

        if (logging.mouseEvents)
            console.log("Click time: " + video.currentTime)

        updateForm(rect)
    }

    // REMI: Select ID field to facilitate changing ID
    document.getElementById("I").focus();
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

    canvas1.renderAll(); // Refresh rectangles drawing
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

    canvas1.renderAll(); // Refresh rectangles drawing
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

function selectBeeByID(id) {
   let rect = findRect(id);
   if (rect) {
      if (logging.selectionEvents)
         console.log('selectBeeByID: trying to select id=',id);
      //canvas1.setActiveObject(canvas1.item(id));
      canvas1.setActiveObject(rect);
      // TESTME: selectBee was commented
      selectBee(rect);
      return true
   } else {
      canvas1.deactivateAll().renderAll(); // Deselect rect if any
      updateForm(null)
      // defaultSelectedBee = undefined // Do not cancel default if not found
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
                video2.seekTo({'frame':obs.frame})
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
      domain = [0, videoinfo.duration*videoinfo.fps]
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
    
    if (domain.length === 0) return ['empty']
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
 
    if (frame==getCurrentFrame()) {
        // Try to select the bee in current frame
         selectBeeByID(id)
    } else {
        if (obsDoesExist(frame,id)) {
            // Set the id as default selection before seeking the frame
            defaultSelectedBee = id
        }
        video2.seekTo({'frame':frame})
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
    tagIntervals = []
    for (let id in ttags) {
      let obsarray = ttags[id]
      let activeInterval = []
      let isActive = false
      for (let f in obsarray) {
        let tags = obsarray[f]
        if (isActive) {
          if (activeInterval.end == f-1) {
            activeInterval.end = f
          } else {
            // Close previous 
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
        tagIntervals.push(activeInterval)
    }
    
    if (logging.chrono)
        console.log("refreshChronogram: drawChrono()...")

    //d3.selectAll("svg > *").remove();
    drawChrono();
}
