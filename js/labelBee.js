////////////////////////////////////////////////////////////////////////////////
// Global variables
var canvas, canvas1, canvas2, ctx, ctx2, vid, play, radius = 5,
    dragging = false,
    time, final_id = 0;
bee = [0, 0]; //Global array that stores the value of x, y
g_activities = ["fanning", "pollenating", "entering", "exiting"]; //global string array of activities
var x, y, cx, cy, width, height, id, default_id = 0,
    marked, permanent, activities = [],
    bool_acts = [],
    is_marked = false,
    is_permanent = false;
var form_acts = [],
    fanning, pollenating, entering, leaving, old, newB, is_old = false,
    currentFrame, video, video2, Cframe = 0;
var Tracks = new Array(),
    temporaryObs = new Observation(0)
var Tags = new Array()
var buttonManip, undo = new Observation(0),
    alert1, transformFactor = 1.0;
var vis, xAxis, yAxis
var g_Moving = false,
    g_Dragging = false;
var fps;
var videoinfo;
var defaultSelectedBee = undefined
var logging = {
  "rects": false,
  "frameEvents": false,
  "guiEvents": false,
  "submitEvents": false,
  "mouseEvents": false,
  "keyEvents": true,
  "selectionEvents": false,
}
var canvasTform = [0, 0, 1]; // cx,cy,scale
var plotTrack_range_backward = 5
var plotTrack_range_forward = 5
var flagCopyVideoToCanvas = true

// ######################################################################
// INITITALIZATION

function init() {
    videoinfo = {
        'fps': 22, 
        'realfps': 20,  //realfps = 20.0078;
        'starttime': '2016-07-15T09:59:59.360'
    }
    fps = videoinfo.fps; 
    $('#selectboxVideo')[0].selectedIndex=7 // select long video

    video2 = VideoFrame({
        id: 'video',
        frameRate: fps, //30,
        callback: onFrameChanged // VERY IMPORTANT: all frame changes (play,next,prev...) trigger this callback. No refresh should be done outside of this callback
    });
    video2.onListen = function() {console.log('video2.onListen')}
    video2.onStopListen = function() {console.log('video2.onStopListen')}

    video = document.getElementById("video");
    play = document.getElementById("play"); //play button
    playBackward = document.getElementById("playbackward"); //play button
    canvas = document.getElementById("canvas");
    time = document.getElementById("vidTime");
    ctx = canvas.getContext('2d');
    
    var showTags = true
    var showTagsTracks = false

    // ### Chronogram
    //initChrono();
    chrono = new Chronogram()
    $('#excludedTags')[0].value = String(excludedTags)
    
    //chrono.drawChrono();

    // ## Video + canvas

    canvas1 = new fabric.Canvas('canvas1');

    canvas1.selectionColor = "red"
    canvas1.selectionBorderColor = "red"
    canvas1.selection = false; // REMI: disable the blue selection (allow to select several rectangles at once, which poses problem)
    canvas1.uniScaleTransform = true; // REMI: allow free rescaling of observations without constrained aspect ratio
    canvas1.centeredScaling = true; // REMI: rescale around center
    canvas1.on('mouse:down', onMouseDown);
    canvas1.on('mouse:up', onMouseUp);
    canvas1.on('object:moving', onObjectMoving); // When a rectangle is being modified
    canvas1.on('object:modified', onObjectModified); // When a rectangle has been modified
    canvas1.on('object:selected', onObjectSelected); // When clicking on a rectangle
    canvas1.on('selection:cleared', onObjectDeselected); // When deselecting an object   Not Working???
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

    $('#F').change(onActivityChanged)
    $('#P').change(onActivityChanged)
    $('#E').change(onActivityChanged)
    $('#L').change(onActivityChanged)

    document.getElementById('load').addEventListener('change', loadFromFile);
    document.getElementById('loadtags').addEventListener('change', loadTagsFromFile);
    
    //$('#video')[0].onload = onFrameChanged
    $('#video')[0].onloadeddata = onVideoLoaded
    //$('#video')[0].src = 'data/testvideo.mp4';
    //$('#video')[0].src='36_01_H_160715100000.mp4';
    //$('#video')[0].src='NVR_ch1_main_20160429104800_20160429105800.mp4';
    //$('#video')[0].src='test.mp4';
    selectVideo() // Get src from selectboxVideo


    zoomShowOverlay = false
    $('#checkboxZoomShowOverlay').prop('checked', zoomShowOverlay);
    flagShowZoom = true
    $('#checkboxShowZoom').prop('checked', flagShowZoom);

    // ## Keyboard control

    // REMI: use keyboard
    $(window).on("keydown", onKeyDown);
    //$('.upper-canvas').on("keydown", onKeyDown);
    //$('.upper-canvas').focus();
    
    // ## Misc init

    // Do not trigger first refresh: onloadeddata will call it
    // refresh();
    updateForm(null)
    defaultSelectedBee = undefined
    lastSelected = null // Last selected rect (workaround for event selection:cleared not providing the last selection to onObjectDeselected)
    
    //loadFromFile0('data/Tracks-demo.json')
}


// ######################################################################
// MODEL: Tracks data structure

function Observation(ID) {
    this.ID = ID
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
    }
}

function getValidIDsForFrame(frame) {
    // Return an Iterator to Tracks[frame]

    if (Tracks[frame] == undefined) {
        return []
    }
    //NO: var ids = Array.from(Tracks[frame].keys()) // Problem: includes ids to undefined values also

    let trackf = Tracks[frame];
    let ids = [];
    for (id in trackf) {
        if (trackf[id] !== undefined) {
            ids.push(id);
        }
    }
    //console.log("getValidIDsForFrame: frame=",frame,",  Tracks[frame]=",trackf)
    //console.log("getValidIDsForFrame: ids=",ids)
    return ids;
}

function obsDoesExist(frame, id) {
    if (Tracks[frame] == undefined) {
        return false
    }
    if (Tracks[frame][id] == undefined) {
        return false
    }
    return true
}

function getObsHandle(frame, id, createIfEmpty) {
    if (createIfEmpty == undefined)
        createIfEmpty = false;

    var obs = undefined
    if (Tracks[frame] == undefined) {
        if (createIfEmpty) {
            //Tracks[frame] = new Array;
            Tracks[frame] = {}
        } else {
            return undefined
        }
    }

    if (Tracks[frame][id] == undefined) {
        if (createIfEmpty) {
            Tracks[frame][id] = new Observation(id);
            //default_id++;
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

// function doesExistButton(ID) {
//     for (frame in Tracks) {
//         for (id in Tracks[frame]) {
//             if (id == ID) {
//                 buttonManip2 = document.getElementById("special2");
//                 buttonManip2.className = "btn btn-danger btn-sm";
//                 buttonManip2.value = "Taken";
//                 return true;
//             }
//         }
//     }
// 
//     buttonManip2 = document.getElementById("special2");
//     buttonManip2.className = "btn btn-success btn-sm";
//     buttonManip2.value = "Free to use";
//     return false;
// }

function changeObservationID(frame, old_id, new_id) {
    // REMI: modified to be be independent of View
    if (Tracks[frame] != undefined) {
        if (Tracks[frame][old_id] != undefined) {
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
    for (F in Tracks) {
        for (iid in Tracks[F]) {
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
    if (Tracks == undefined) return csv
    for (F in Tracks)
        for (id in Tracks[F]) {
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
    if (Tracks == undefined) return csv
    for (F in Tracks)
        for (id in Tracks[F]) {
            var obs = Tracks[F][id]
            
            csv += (F + "," + obs.x + "," + obs.y 
                     + "," + (obs.x+obs.width) + "," + (obs.y+obs.height) 
                     + "," + Number(obs.bool_acts[1])  // pollen
                     + "," + Number(obs.bool_acts[2])  // arrive
                     + "," + Number(obs.bool_acts[3])  // leave
                     + "," + Number(obs.bool_acts[0])  // fanning
                     + "\n")
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
    //updateChronoTagBars()
    onFrameChanged();
    
    console.log(event)
    //$("#load")[0].value='Loaded '+fileToRead
    
    console.log(Tags)
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

function onKeyDown(e) {
    if (logging.keyEvents)
        console.log("onKeyDown: e=",e)
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
            return true;
            var id_field = document.getElementById("I");
            if ($(id_field).is(':focus')) {
                id_field.selectionStart = id_field.selectionEnd
                id_field.blur(); // Facilitate changing the id
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
        //case 13: // Enter
            //onKeyDown_IDEdit(e) // Forward to IDedit keydown handler
            //return false;
        //    return true
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

    chrono.updateChronoXDomainFromVideo()
    chrono.drawChrono()
}
function onFPSChanged(event) {
    console.log('onFPSChanged', event)

    videoinfo.fps = Number(event.target.value)
    fps = videoinfo.fps
    chrono.updateChronoXDomainFromVideo()
    chrono.drawChrono()
}

// # Video loading
var videoDuration=22
function onVideoLoaded(event) {
    // Called when video metadata available (size, duration...)
    console.log('videoLoaded', event)
    var w,h
    
    w = video.videoWidth
    h = video.videoHeight
    videoDuration = video.duration
    
    chrono.updateChronoXDomainFromVideo()
    refreshChronogram()
    
    console.log("w=",w)
    console.log("h=",h)
    
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
}
function onVideoReady(event) {
    video.oncanplay = undefined
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
  D = new Date(D.getTime()+video2.toMilliseconds()*fps/videoinfo.realfps)
  return D
}
function toLocaleISOString(date) {
    // Polyfill to get local ISO instead of UTC http://stackoverflow.com/questions/14941615/how-to-convert-isostring-to-local-isostring-in-javascript
    function pad(n) { return ("0"+n).substr(-2); }

    var day = [date.getFullYear(), pad(date.getMonth()+1), pad(date.getDate())].join("-"),
        time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join(":");
    if (date.getMilliseconds())
        time += "."+date.getMilliseconds();
    var o = date.getTimezoneOffset(),
        h = Math.floor(Math.abs(o)/60),
        m = Math.abs(o) % 60,
        o = o==0 ? "Z" : (o<0 ? "+" : "-") + pad(h) + ":" + pad(m);
    return day+"T"+time//+o;
}

// This callback is the only one that should handle frame changes. It is called automatically by video2
function onFrameChanged(event) {
    Cframe = getCurrentFrame();
    
    if (logging.frameEvents)
        console.log('frameChanged', Cframe)

    $('#currentFrame').html("Frame: " + Cframe)
    $('#vidTime').html("Video Time: " + video2.toHMSm(getCurrentVideoTime()))
    $('#realTime').html("Real Time: " + toLocaleISOString(getCurrentRealDate()))

    alert1 = document.getElementById("alert");
    alert1.style.color = "black";
    alert1.innerHTML = "";

    canvas1.clear();
    createRectsFromTracks()

    refresh();

    default_id = 0; // Default to 0, then incremented inside if already used    
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
    chrono.updateTimeMark()
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
    video2.seekBackward(fps);
}
function forward2() {
    video2.seekForward(fps);
}

function rewind3() {
    video2.seekBackward(fps*60);
}
function forward3() {
    video2.seekForward(fps*60);
}
function rewind4() {
    video2.seekBackward(fps*60*10);
}
function forward4() {
    video2.seekForward(fps*60*10);
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

// ## Fabric.js rects

function createRectsFromTracks() {
    let F = getCurrentFrame()
    let ids = getValidIDsForFrame(F)
    //console.log("createRectsFromTracks: ",{frame:F,ids:ids})
    for (let id of ids) { // For each valid bee ID, create a rect for it
        let obs = getObsHandle(F, id, false)
        let r = videoToCanvasCoords(obs)
        addRect(obs.ID, r.left, r.top, r.width, r.height, "db", obs)
    }
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

    for (let id of ids) { // For each valid bee ID, create a track for it
        let obs = getObsHandle(fmin, id, false)
        let x = undefined, y=undefined, z=0;
        if (!!obs) {
            let rect = videoToCanvasCoords(obs)
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
            z = 1;
        }

        setColor = function(f) {
            if (f<=F) {
                color = "rgba(255,0,0,"+(1-Math.abs((f-F)/frange))+")"
                //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
            } else {
                color = "rgba(0,128,0,"+(1-Math.abs((f-F)/frange))+")"
            }
            return color;
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
        let tags = tagsFrame['tags']
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
    }
}
function plotTag(ctx, tag, color, flags) {
    if (color == undefined) {
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

    let pt = videoToCanvasPoint({"x":tag["c"][0], "y":tag["c"][1]})

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.closePath();
    ctx.stroke();

    if (flags.id==true) {
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
        let tags = tagsFrame['tags']
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
        let tags = tagsFrame['tags']
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
            
            alert1 = document.getElementById("alert");
            alert1.style.color = "green";
            alert1.innerHTML = "Press enter to validate ID";
        } else {
            // Not enough drag to define a new rectangle
            canvas1.deactivateAll()
            canvas1.remove(activeObject);
            //canvas1.renderAll();
            id = document.getElementById("I");
            id.value = "no selection"
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

    if (parseInt(default_id) <= id)
        default_id = parseInt(id) + 1;

    if (logging.addRect)
        console.log("added");
    return rect;
}

// Try to find a fabric rectangle with a given id
function findRect(id) {

    var rects = canvas1.getObjects();
    if (rects) {
        var r = undefined;
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
            var d = dist(rect.x, rect.y, obs.x, obs.y);
            if (d < 40) {
                return true;
            }
        } else if (mode == "distance_center") {
            // Compare the distance from rect center to obs center
            var d = dist(rect.x + 0.5 * rect.width, rect.y + 0.5 * rect.height, obs.x + 0.5 * obs.width,
                obs.y + 0.5 * obs.height);
            if (d < 40) {
                return true;
            }
        } else if (mode == "pointinside") {
            // Check if center of rect is inside obs
            if ((rect.x >= obs.x) && (rect.x <= obs.x + obs.width) && (rect.y >= obs.y) && (rect.y <= obs
                    .y + obs.height)) {
                return true
            }
        } else if (mode == "pointinside") {
            // Check if center of rect is inside obs
            var cx = rect.x + 0.5 * w,
                cy = rect.y + 0.5 * h;
            if ((cx >= obs.x) && (cx <= obs.x + obs.width) && (cy >= obs.y) && (cy <= obs.y + obs.height)) {
                return true
            }
        } else {
            console.log("predictId.checkMatch: mode unsupported:", mode)
        }
        return false;
    }
    if (frame > 0) {
        var ids = getValidIDsForFrame(frame - 1);
        //console.log("ids=",ids)
        for (let id of ids) {
            var obs = getObsHandle(frame - 1, id, false);
            //console.log("id=",id,"obs=",obs)
            if (checkMatch(obs, rect, mode)) {
                if (findRect(id))
                    return {
                        id: default_id,
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
    var ids = getValidIDsForFrame(frame + 1);
    //console.log("ids=",ids)
    for (let id of ids) {
        var obs = getObsHandle(frame + 1, id, false);
        //console.log("id=",id,"obs=",obs)
        if (checkMatch(obs, rect, mode)) {
            if (findRect(id))
                return {
                    id: default_id,
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
        id: default_id,
        reason: 'default'
    };
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
    if (g_Moving || g_Dragging) {
        console.log("WARNING in onMouseDown: moving or dragging already active. Aborting them.");
        g_Moving = false;
        g_Dragging = false;
        canvas1.off('mouse:move');
    }
    
    alert1 = document.getElementById("alert");
    alert1.style.color = "black";
    alert1.innerHTML = "";

    //console.log('onMouseDown',option)
    resetCheck(); //Check button goes back to blue
    alert1 = document.getElementById("alert");
    alert1.innerHTML = "";
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
            id = document.getElementById("I");
            id.value = prediction.id;

            if (prediction.obs) {
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
            id = document.getElementById("I");
            id.value = prediction.id;

            // Create rectangle interactively
            rect = addRectInteractive(prediction.id, startX, startY);
            if (logging.mouseEvents)
                console.log("onMouseDown: creating new rect interactive", rect)
        }

        if (logging.mouseEvents)
            console.log("Click time: " + video.currentTime)

        g_Dragging = true;
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
        console.log("Current object id=", option.target.id)
        console.log("ActiveObject id=", canvas1.getActiveObject().id)
        selectBee(option.target)
        lastSelected = option.target
    }
}

function onObjectDeselected(option) {
    if (logging.selectionEvents)
        console.log("onObjectDeselected: ", option);
       
    if (lastSelected != null) {
        if (lastSelected.status=="new") {
            if (logging.mouseEvents)
                console.log('onObjectDeselected: removing non submitted lastSelected=', lastSelected)

            // Remove tmp rect as soon as it becomes inactive
            canvas1.remove(lastSelected);
            lastSelected = null
            refresh()
        }
    }
}

function onObjectMoving(option) {
    //return; // No real need for Moving, we can update everything once at the end in onObjectModified

    // Called during translation only
    var activeObject = option.target; //canvas1.getActiveObject();
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
    if (activeObject != null) {
        updateRectObsActivity(activeObject)
        automatic_sub()
    }
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


// # Form and current bee control

/* Update form rectangle data from activeObject */
/* CAUTION: use updateForm(null) for empty form */
function updateForm(activeObject) {

    if (activeObject == null) {
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
    if (activeObject == null) {
        alert1 = document.getElementById("alert");
        alert1.style.color = "red";
        alert1.innerHTML = "No bee selected";
        return false;
    }

    // Use current id
    let final_id = activeObject.id;
    if (activeObject.status === "new" && getObsHandle(getCurrentFrame(), final_id, false) !== undefined) {
        console.log('submit_bee: trying to replace existing bee with new observation. ABORT')
        alert1 = document.getElementById("alert");
        alert1.style.color = "red";
        alert1.innerHTML = "Conflict of ID: bee " + final_id + " already exists in this frame.";
        return false;
    }
    if (activeObject.status === "db" && getObsHandle(getCurrentFrame(), final_id, false) === undefined) {
        console.log('submit_bee: rectangle supposed to be existing in DB, but not found. Writing anyway.')
        alert1 = document.getElementById("alert");
        alert1.style.color = "red";
        alert1.innerHTML = "Internal issue. See console.log";
        return true;
    }

    console.log(obsDoesExist(getCurrentFrame(), activeObject.id));

    let tmpObs = activeObject.obs
    tmpObs.ID = final_id;
    //updateForm(activeObject);

    /*
    // All that has already been updated continuously
    tmpObs.time = video.currentTime;
    tmpObs.frame = getCurrentFrame();
    
    let videoRect = canvasToVideoCoords(activeObject)
    tmpObs.x = videoRect.x
    tmpObs.y = videoRect.y
    tmpObs.width = videoRect.width
    tmpObs.height = videoRect.height
    tmpObs.cx = (videoRect.x + videoRect.width / 2);
    tmpObs.cy = (videoRect.y + videoRect.height / 2);
    
    tmpObs.marked = $('#marked').prop('checked');
    tmpObs.permanent = $('#permanent').prop('checked');
    tmpObs.bool_acts[0] = $('#F').prop('checked');
    tmpObs.bool_acts[1] = $('#P').prop('checked');
    tmpObs.bool_acts[2] = $('#E').prop('checked');
    tmpObs.bool_acts[3] = $('#L').prop('checked');
    */

    storeObs(tmpObs);
    activeObject.status = "db"

    refresh();

    refreshChronogram();
    resetRemove(); //you lose your chance of undoing remove
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
   } else {
      canvas1.deactivateAll().renderAll(); // Deselect rect if any
      updateForm(null)
      // defaultSelectedBee = undefined // Do not cancel default if not found
      if (logging.selectionEvents)
         console.log('selectBeeByID: No rect found for id=',id);
   }
}

// selectBee: called when clicking on a rectangle
function selectBee(rect) {
    if (logging.selectionEvents)
        console.log("selectBee: rect=", rect);
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
}
function getSelectedID() {
    // Truth on selected bee ID comes from Fabric.js canvas
    var activeObject = canvas1.getActiveObject();
    if (activeObject == null) {
        return undefined
    } else {
        return activeObject.id
    }
}

function deleteObjects() { //Deletes selected rectangle(s) when remove bee is pressed
    //Deletes an observation
    var activeObject = canvas1.getActiveObject()
    var activeGroup = canvas1.getActiveGroup()

    if (activeObject) {
        canvas1.remove(activeObject);
        temporaryObs = new Observation(0);
        console.log("deleteObjects",activeObject.id);
        if (obsDoesExist(getCurrentFrame(), activeObject.id)) {
            undo = Tracks[video2.get()][activeObject.id];
            console.log("This is undo");
            console.log(undo);
            delete Tracks[video2.get()][activeObject.id];
        }

        refreshChronogram();
    }

    refresh()
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



// ## Removing

function removeDecision() {
    buttonManip = document.getElementById("special");
    if (buttonManip.className == "btn btn-info") {
        deleteObjects();
        buttonManip = document.getElementById("special");
        buttonManip.className = "btn btn-danger";
        buttonManip.value = "Undo";
    } else {
        undoRemoveObs();
    }
}


function undoRemoveObs() {
    buttonManip = document.getElementById("special");
    buttonManip.className = "btn btn-success";
    buttonManip.value = "Undo Successful";

    storeObs(undo);

    refresh();

    refreshChronogram();
}

function resetRemove() {
// Disabled for now
//     buttonManip = document.getElementById("special");
//     buttonManip.className = "btn btn-info";
//     buttonManip.value = "Remove obs";
}

function resetCheck() {
    console.log('WARNING: call to obsolete function resetCheck()');
//     buttonManip = document.getElementById("special2");
//     buttonManip.className = "btn btn-info btn-sm";
//     buttonManip.value = "Check";
}


// ## ID GUI
//// Controller
// function grabandCheckID() {
//     var ID = document.getElementById("I");
//     doesExistButton(ID.value);
// }

//function grabIDEditInfoCallChange(event) {
function onKeyDown_IDEdit(event) {
    var key = event.which || event.keyCode;
    if (key == 13) { // Enter
        let alert1 = document.getElementById("alert");
        let frame = getCurrentFrame()
        let fieldID = document.getElementById("I");
        let new_id = fieldID.value

        let activeObject = canvas1.getActiveObject()
        if (activeObject.status === "new") {
            activeObject.id = new_id
            alert1.innerHTML = "ID changed + submitted"
            alert1.style.color = "green";
            submit_bee(activeObject)
        } else /* status=="db"*/ {
            let old_id = activeObject.id
            if (changeObservationID(frame, old_id, new_id)) {
                // Successfull
                activeObject.id = new_id
                alert1.innerHTML = "ID changed succesfully!"
                alert1.style.color = "green";
            } else {
                console.log("onKeyDown_IDEdit: unsuccessfull ID change", {
                    object: activeObject,
                    old_id: old_id,
                    new_id: new_id
                })
                alert1.innerHTML = "ID not changed"
                alert1.style.color = "red";
            }
            refresh();
            refreshChronogram()
        }
    }
}



// ###########################################################
// CHRONOGRAM

function Chronogram() {
// Create Chronogram

//var g_xRange = undefined
//var g_xZoom = undefined;
var plotArea = undefined
var timeMark = undefined
var vis, tagArea
var activityRects

var chronogramData = [] // make it local scope
var tagsChronogramData = []

function drawChrono() {
    // Rescale axes
    updateChronoYDomain()
    //vis.reinitScale()
    vis.rescale()
    vis.updateTScale()
        
    // Redraw activities
    updateActivities()
    // Redraw timeline and tagBars
    updateTimeMark()
    updateChronoTagBars()
    updateTagIntervals()
}
var updateChronoDomain = function(){
    console.log('updateChronoDomain not yet defined')
}
function domainxFromVideo() {
    var domain = [0, videoDuration*fps]
    console.log("domainxFromVideo: domain=",domain)
    return domain
}
function domainxFromChronogramData() {
    return [d3.min(chronogramData,
                function(d) {
                    return Number(d.x) - 0.5;
                }),
            d3.max(chronogramData,
                function(d) {
                    return Number(d.x) + 0.5;
                })
        ]
}
function domainyFromChronogramData() {

    // FIXME: hardcoded for testing
    return [0,20]

    if (chronogramData.length>0)
    return [d3.min(chronogramData,
                function(d) {
                    return Number(d.y);
                }),
            d3.max(chronogramData,
                function(d) {
                    return Number(d.y) + 1.0;
                })
        ]
    else
        return [0,1]
}
function updateChronoXDomainFromVideo() {
    vis.xScale.domain(domainxFromVideo())
}
function updateChronoYDomain() {
    vis.yScale.domain(domainyFromChronogramData())
}
function initChrono() {

    var margin = {
            top: 70,
            right: 20,
            bottom: 50,
            left: 60
        }
    var width = 960 - margin.left - margin.right;
    var height = 300 - margin.top - margin.bottom;

    // ## Scale objects
    var xScale = d3.scale.linear()
        .range([0, width])
    var tScale = d3.time.scale.utc()
        .range([0, width])
    var yScale = d3.scale.linear()
        .range([0, height])
        
    var updateTScale=function() {
        //console.log('updateTScale()')
        var d = xScale.domain()
        var a = new Date(videoinfo.starttime)
        tScale.domain([ new Date(a.getTime()+d[0]/fps*1000) , new Date(a.getTime()+d[1]/fps*1000) ])
        
        if (vis) {
            vis.select(".x.axis").call(vis.customXAxis);
            vis.select(".t.axis").call(tAxis);
            vis.select(".y.axis").call(yAxis);
            
            vis.selectAll(".t.axis > .tick > text")
                .style("font-size", function(d) {
                    if (d.getMilliseconds()!=0) return "8px"
                    if (d.getSeconds()!=0) return "9px"
                    if (d.getMinutes()!=0) return "12px"
                    return "14px"
                })
        }
        
        // FIXME: use an observer pattern instead
        if (typeof timeMark !== 'undefined')
            updateTimeMark()
        if (typeof activityRects !== 'undefined')
            updateActivities(true)  // true->lightweight update
        if (typeof tagArea !== 'undefined') {
            updateChronoTagBars(true) // true->lightweight update
        }
        if (typeof tagSel !== 'undefined') {
            updateTagIntervals(true) // true->lightweight update
        }
    }
    updateChronoDomain = function(domainx, domainy) {
        xScale.domain(domainx)
        yScale.domain(domainy)

        updateTScale()
        //tScale.domain([new Date
    }
    var reinitScale=function() {
        xScale.domain(domainxFromVideo())
        yScale.domain(domainyFromChronogramData())

        updateTScale()
        //tScale.domain([new Date(2012, 0, 1), new Date(2013, 0, 1)])
    }
    reinitScale()
    
        // ## Interactive zooming (applies to the scale objects)
    var zoom = d3.behavior.zoom()
        .x(xScale)
        /*.y(yScale)*/
        .scaleExtent([1/24, 1000])
        .on("zoom", zoomed);
    function zoomed() { //Function inside function
        //g_xRange = xScale;
        //g_xZoom = zoom;
        g_lastevent = d3.event
        
        updateTScale()
        d3.event.sourceEvent.stopPropagation();
    }

        
    var rescale=function() {
        zoom.x(xScale)
    }

// To reinit with previous scale
//     if (g_xRange !== undefined) {
//         zoom.scale(g_xZoom.scale())
//         xScale.domain(g_xRange.domain());
//     }

    // ## Axis objects (display based on the scale)
    xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickSize(5)
        
    function customXAxis(g) {
        g.call(xAxis)
        //g.select(".domain").remove()
        g.selectAll(".tick text").style("font", "10px sans-serif")
    }

    var customTimeFormat = d3.time.format.multi([
      ["%S.%L", function(d) { return d.getMilliseconds(); }],
      ["%S", function(d) { return d.getSeconds(); }],
      ["%H:%M", function(d) { return d.getMinutes(); }],
      ["%H:00", function(d) { return d.getHours(); }],
      ["%b %d", function(d) { return d.getDate() != 1; }],
      ["%B", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);

    tAxis = d3.svg.axis()
        .scale(tScale)
        .orient("bottom")
        .tickSize(-height)
        .tickFormat(customTimeFormat)        

    yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .ticks(5)
        .tickSize(-width);

    // ## Build the layout

    vis0 = d3.select("#svgVisualize")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    vis = vis0
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom)
    vis
        .on("dblclick.zoom", null)
        .on("dragstart", function(){d3.event.sourceEvent.stopPropagation();})
        .on("dragend", function(){d3.event.sourceEvent.stopPropagation();})
        .on("zoomstart", function(){d3.event.sourceEvent.stopPropagation();})
        .on("zoomend", function(){d3.event.sourceEvent.stopPropagation();})

        
    vis.xScale=xScale
    vis.yScale=yScale
    

    var plotframe = vis.append("rect").attr('class','plotframe')
        .attr("width", width)
        .attr("height", height)
        .style("fill", "#f0fcff")
        .style("stroke", "gray")
        
    vis.on("click",function() {
        if (d3.event.defaultPrevented) return;
        var coords = d3.mouse(this);
        
        var frame = Math.round( xScale.invert(coords[0]) );
        
        console.log("Chrono: click on frame=",frame);
        
        video2.seekTo({'frame':frame})
    })

    vis.append("clipPath")       // define a clip path
        .attr("id", "rect-clip") // give the clipPath an ID
        .append("rect")          // shape it as a rect
        .attr("x", 0)         // position the x left
        .attr("y", 0)         // position the y top
        .attr("width", width)         
        .attr("height", height);         

    vis.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height+20) + ")")
        .call(customXAxis)

    vis.insert("g")
        .attr("class", "t axis")
        .attr("transform", "translate(0," + (height) + ")")
        .call(tAxis);

    vis.insert("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Add the text label for the x axis
    vis0.append("text")
        .attr("x", margin.left-15).attr("y", margin.top+height+10)
        .style("text-anchor", "end")
        //.text("Frame");
        .text("Time");
    vis0.append("text")
        .attr("x", margin.left-15).attr("y", margin.top+height+30)
        .style("text-anchor", "end")
        //.text("Frame");
        .text("Frame");

    // Add the text label for the Y axis
    vis0.append("text")
        .attr("transform", "rotate(-90, 10, "+(margin.top+height/2)+")")
        .attr("x", 10).attr("y", margin.top+height/2)
        //.attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Bee ID");
    
    chronArea = vis.insert("g").attr("clip-path", "url(#rect-clip)")
    chronArea.insert("rect").style("fill","none")
        .attr("x",0).attr("y", 0)
        .attr("width", width).attr("height", height)
    
    // Insert plotAreaTags before so that it renders below, 
    // and timeMark last so it appears on top

    plotArea = chronArea.insert("g")
    plotAreaTags = chronArea.insert("g")  
    
    timeMark = initTimeMark(chronArea)
    
    initChronoTagBars()

    // Init elements
    initActivities()
    initTagIntervals()
            
    // Store all handles for external reuse
    vis.rescale=rescale
    vis.reinitScale=reinitScale
    vis.zoom=zoom
    vis.updateTScale=updateTScale
    vis.customXAxis=customXAxis
}


function initTimeMark(parent) {
    timeMarkData = [{ 'frame':0 }]
    var timeMark = parent.append("rect")
          .attr('class','timeMark')
          .style("stroke", "#ff0000")
          .data(timeMarkData)
          .call(setTimeGeom)
    return timeMark
}
function setTimeGeom(selection) {
    selection
        .attr("x", function(d) {
            return vis.xScale(d.frame - 0.5);
        })
        .attr("y", function(d) {
            return vis.yScale.range()[0];
        })
        .attr("height", function(d) {
            return vis.yScale.range()[1]-vis.yScale.range()[0];
        })
        .attr("width", function(d) {
            return (vis.xScale(1) - vis.xScale(0.0));
        })
}
function updateTimeMark() {
    timeMarkData[0].frame = Number(getCurrentFrame())
    timeMark.data(timeMarkData).call(setTimeGeom)
}



function insertActivities(selection) {
    selection
        .insert("rect")
        .style("stroke-width", "1px")
        .attr("class", "chrono")
        .call(setGeomActivity)
}
function setGeomActivity(selection) {
    selection
        .attr("x", function(d) {
            //return xScale(Number(d.x) - 0.5);
            return vis.xScale(Number(d.x))-4;
        })
        .attr("y", function(d) {
            return vis.yScale(Number(d.y) + 0.1);
        })
        .attr("width", function(d) {
            //return (xScale(Number(d.x) + 1) - xScale(Number(d.x)));
            return 8
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
      activityRects.call(setGeomActivity)
    } else {
      // Full update
      activityRects = plotArea.selectAll(".chrono").data(chronogramData);
      activityRects.enter().call(insertActivities)
      activityRects.exit().remove();
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
            return vis.xScale(Number(d.begin));
        })
        .attr("y", function(d) {
            return vis.yScale(Number(d.id));
        })
        .attr("width", function(d) {
            return vis.xScale(Number(d.end))-vis.xScale(Number(d.begin));
        })
        .attr("height", function(d) {
            return vis.yScale(Number(d.id)+1)-vis.yScale(Number(d.id));
        })
}
function updateTagIntervals(onlyScaling) {
    // Redraw tag intervals
    if (onlyScaling) {
      setTagGeom(tagSel)
    } else {
      tagSel = plotArea.selectAll(".tag").data(tagIntervals);
      tagSel.enter().call(insertTag)
      tagSel.exit().remove();
      setTagGeom(tagSel)
    }
}
function initTagIntervals() {
    tagsData = []
    tagIntervals = []
    updateTagIntervals()
}


function initChronoTagBars() {

    var margin = {
            top: 10,
            right: 20,
            bottom: 10,
            left: 60
        }
    var tagAreaWidth = 960 - margin.left - margin.right;
    var tagAreaHeight = 50;
    
    var yTagScale = d3.scale.linear()
        .range([tagAreaHeight,0])
        .domain([0, 10])
    yTagAxis = d3.svg.axis()
        .scale(yTagScale)
        .orient("left")
        .ticks(5)
        .tickSize(-tagAreaWidth);

    tagVis = vis0.append('g').attr('id','tagVis')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    tagVis.insert("g")
        .attr("class", "y tagAxis")
        .call(yTagAxis)
    tagVis.append("line").style("stroke", "black")
          .attr({x1:0, y1:tagAreaHeight, x2:tagAreaWidth, y2:tagAreaHeight})
    tagVis.append("text")
        .attr("transform", "rotate(-90, -50, "+tagAreaHeight/2+")")
        .attr("x", -50).attr("y", margin.top+tagAreaHeight/2)
        //.attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("#Tags");

    tagArea = tagVis.append('g').attr('id','tagArea')
    tagArea.insert("rect").style("fill","none")
        .attr("x",0).attr("y", -tagAreaHeight-margin.bottom)
        .attr("width", tagAreaWidth).attr("height", tagAreaHeight)
        
    //tagArea.yTagScale = yTagScale
    
    function insertTagBars(selection) {
        selection
            .insert("rect")
            .attr("class", "tagBar")
            .style("fill", "blue")
            .style("stroke", "blue")
            .style("stroke-width", "1px")
    }
    function setTagBarsGeom(selection) {
        selection
            .attr("x", function(d) {
                return vis.xScale(Number(d.x) - 0.5);
            })
            .attr("y", function(d) {
                return yTagScale(Number(d.y));
            })
            .attr("height", function(d) {
                return -(yTagScale(Number(d.y)) - yTagScale(0.0));
            })
            .attr("width", function(d) {
                return (vis.xScale(Number(d.x) + 0.5) 
                        - vis.xScale(Number(d.x)-0.5));
            })
    }
    
    tagArea.setTagBarsGeom = setTagBarsGeom
    tagArea.insertTagBars = insertTagBars
    
    //tagsChronogramData = []
    tagsChronogramData.length = 0
    updateChronoTagBars()
}

function updateChronoTagBars(onlyScaling) {
    if (onlyScaling) {
      tagBars = tagArea.selectAll(".tagBar")
      tagBars.call(tagArea.setTagBarsGeom)
    } else {
      tagBars = tagArea.selectAll(".tagBar").data(tagsChronogramData);
      tagBars.enter().call(tagArea.insertTagBars)
      tagBars.exit().remove();
      tagBars.call(tagArea.setTagBarsGeom)
    }
}

// Init of Chrono
this.drawChrono = drawChrono
this.updateChronoXDomainFromVideo = updateChronoXDomainFromVideo
this.updateTimeMark = updateTimeMark

this.chronogramData = chronogramData
this.tagsChronogramData = tagsChronogramData
// Caution: never replace these variables, as only the original onces are used inside the scope
// To reinit chronogramData, use chrono.chronogramData.length = 0

initChrono()

return this

} // Chronogram


//excludedTags = [123, 129, 132, 197, 242, 444, 636, 840, 896, 970, 1512, 1555, 1561, 1600, 1602, 1605, 1610, 1611, 1612, 1627, 1639, 1640, 1643, 1655, 1786, 1853, 1973]
excludedTags = [886, 1602, 1610, 1611, 1640, 1755]
function refreshChronogram() {

    //Deleting everything on the svg so we can recreate the updated chart
    //d3.selectAll("svg > *").remove();
    //Emptying the array so we won't have duplicates
    //for (var i = 0; i < chronogramData.length; i++)
    //    chronogramData.pop();
    chrono.chronogramData.length = 0
    for (F in Tracks) {
        for (id in Tracks[F]) {
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

            chrono.chronogramData.push(chronoObs);
        }
    }

    excludedTags = eval("["+$('#excludedTags')[0].value+']')
    
    if (1) {
      chrono.tagsChronogramData.length = 0
      for (let F in Tags) {
          let tags = Tags[F].tags
          let count=0
          for (let i in tags) {
              let id = Number(tags[i].id)
              let hamming = Number(tags[i].hamming)
              if ((!excludedTags.includes(id)) && (hamming==0))
                  count += 1
          }
          let tagBar = {'x': Number(F), 'y':count}
          chrono.tagsChronogramData.push(tagBar)
      }
      //updateChronoTagBars() // included in drawChrono
    }
    
    
    tagsData.length=0
//     for (let F in Tags) {
//         let tags = Tags[F].tags
//         for (let i in tags) {
//             let id = Number(tags[i].id)
//             let hamming = Number(tags[i].hamming)
//             if ((!excludedTags.includes(id)) && (hamming==0)) {
//               let tag = {
//                 "frame":F,
//                 "id":id
//               }
//               tagsData.push(tag)
//             }
//         }
//     }

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
    
    console.log("refreshChronogram: drawChrono()...")

    //d3.selectAll("svg > *").remove();
    chrono.drawChrono();
}
