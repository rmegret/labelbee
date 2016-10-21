//// Observation table
function Activity(time, action) {
    this.time = time;
    this.action = action;
}

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

//// Chronogram prototype
function chronoObservation() {

    this.x = 0;
    this.y = 0;
    this.Activity = "";
}

//// Controller
function grabandCheckID() {
    var ID = document.getElementById("I");
    doesExistButton(ID.value);
}

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
        }
    }
}




//// Model
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

    console.log("Submitting obs = ", obs)
}

function doesExist(ID) {
    for (frame in Tracks) {
        for (id in Tracks[frame]) {
            if (id == ID) {
                return true;
            }
        }
    }
    return false;
}

function doesExistButton(ID) {
    for (frame in Tracks) {
        for (id in Tracks[frame]) {
            if (id == ID) {
                buttonManip2 = document.getElementById("special2");
                buttonManip2.className = "btn btn-danger btn-sm";
                buttonManip2.value = "Taken";
                return true;
            }
        }
    }

    buttonManip2 = document.getElementById("special2");
    buttonManip2.className = "btn btn-success btn-sm";
    buttonManip2.value = "Free to use";
    return false;
}

function changeObservationID(frame, old_id, new_id) {
    // REMI: modified to be be independent of View
    if (Tracks[frame] != undefined) {
        if (Tracks[frame][old_id] != undefined) {
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

function getObservation() { //Unimportant function with popup but using it for debugging for now

    var id = document.getElementById("obID");
    var frame = document.getElementById("obF");

    var A1 = document.getElementById("A1");
    var A2 = document.getElementById("A2");
    var A3 = document.getElementById("A3");
    var B1 = document.getElementById("B1");
    var B2 = document.getElementById("B2");
    var C1 = document.getElementById("C1");

    if (doesExist(id.value) == true) {
        A1.innerHTML = "ID: " + Tracks[frame.value][id.value].ID;
        A2.innerHTML = "Frame: " + Tracks[frame.value][id.value].frame;
        A3.innerHTML = "Time: " + Tracks[frame.value][id.value].time;
        B1.innerHTML = "Permanent: " + Tracks[frame.value][id.value].permanent;
        B2.innerHTML = "Marked: " + Tracks[frame.value][id.value].marked;
        C1.innerHTML = "Activities: " + Tracks[frame.value][id.value].bool_acts;
    } else {
        A1.innerHTML = "Observation does not exist";
        A2.innerHTML = "";
        A3.innerHTML = "";
        B1.innerHTML = "";
        B2.innerHTML = "";
        C1.innerHTML = "<img src='h2_6.png'>";
    }

    $(document).ready(function() {
        $("#ok").click(function() {
            $("#Modal3").modal();
        });
    });
}

function addObs(obj) {
    Tracks[obj.frame][obj.ID] = obj;
    console.log("This is obj in Tracks");
    console.log(Tracks[obj.frame][obj.ID]);
}

////////////////////////////////////////////////////////////////////////////////
// Global variables
var canvas, canvas1, canvas2, ctx, ctx2, vid, play, vidTimer, radius = 5,
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
    temporaryObs = new Observation(0),
    chronogramData = new Array(),
    chronoObs = new chronoObservation();
var buttonManip, undo = new Observation(0),
    alert1, transformFactor = 1.0;
var vis, xAxis, yAxis, circles;
var g_Moving = false,
    g_Dragging = false;
var fps;
var videoinfo;
var selectedBee = undefined

function init() {
    videoinfo = {
        'fps': 22, 
        'realfps': 20,  //realfps = 20.0078;
        'starttime': '09:59:59.360',
        'startdate': '2016-07-15'
    }
    fps = videoinfo.fps; 
    $('#selectboxVideo')[0].selectedIndex=1 // select long video

    video2 = VideoFrame({
        id: 'video',
        frameRate: fps, //30,
        callback: onFrameChanged // VERY IMPORTANT: all frame changes (play,next,prev...) trigger this callback. No refresh should be done outside of this callback
    });

    video = document.getElementById("video");
    play = document.getElementById("play"); //play button
    canvas = document.getElementById("canvas");
    time = document.getElementById("vidTime");
    ctx = canvas.getContext('2d');

    drawChrono();

    video.addEventListener('ended', vidEnd, false);
    video.addEventListener('play', vidSet, false);

    canvas1 = new fabric.Canvas('canvas1');

    canvas1.selection = false; // REMI: disable the blue selection (allow to select several rectangles at once, which pose problem)
    canvas1.uniScaleTransform = true; // REMI: allow free rescaling without constrained aspect ratio
    canvas1.centeredScaling = true; // REMI: rescale around center
    canvas1.on('mouse:down', onMouseDown);
    canvas1.on('mouse:up', onMouseUp);
    canvas1.on('object:moving', onObjectMoving); // When a rectangle is being modified
    canvas1.on('object:modified', onObjectModified); // When a rectangle has been modified
    canvas1.on('object:selected', onObjectSelected); // When clicking on a rectangle
    canvas1.on('selection:cleared', onObjectDeselected); // When deselecting an object   Not Working???

    $('#F').change(onActivityChanged)
    $('#P').change(onActivityChanged)
    $('#E').change(onActivityChanged)
    $('#L').change(onActivityChanged)

    // REMI: use keyboard
    $(window).on("keydown", onKeyDown);

    document.getElementById('load').addEventListener('change', loadFromFile);

    
    //$('#video')[0].onload = onFrameChanged
    $('#video')[0].onloadeddata = onVideoLoaded
    //$('#video')[0].src = 'data/testvideo.mp4';
    //$('#video')[0].src='36_01_H_160715100000.mp4';
    //$('#video')[0].src='NVR_ch1_main_20160429104800_20160429105800.mp4';
    //$('#video')[0].src='test.mp4';
    selectVideo() // Get src from selectboxVideo

    //currentFrame = $('#currentFrame');
    
    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#canvasresize").on( "resizestop", refreshCanvasSize );

    // Do not trigger first refresh: onloadeddata will call it
    // refresh();
    updateForm(undefined)
}

function selectVideo() {
    let file = $('#selectboxVideo')[0].value
    
    $('#video')[0].src = file;
}

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
    
    console.log(event)
    $("load")[0].value='Loaded '+fileToRead
}

function loadFromFile(event) {
    console.log("loadFromFile: importing from JSON...")

    fileToRead = event.target.files[0]

    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(fileToRead);
}

function onKeyDown(e) {
    //console.log("onKeyDown: e=",e)
    if (e.key == "Delete") {
        removeDecision();
        return false
    }
    switch (e.keyCode) {
        case 32: // Space
            var id_field = document.getElementById("I");
            id_field.focus(); // Facilitate changing the id
            id_field.select();
            return false; // Prevent the event to be used as input to the field
            break;
        case 27: // Escape
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
        case 83: // key S
            submit_bee();
            console.log("onKeyDown: 'S' bound to submit_bee. Prevented key 'S' to propagate to textfield.")
            return false; // Prevent using S in textfield
        case 13: // Enter
            onKeyDown_IDEdit(e) // Forward to IDedit keydown handler
            return false;
        case 16: // Shift
        case 17: // Ctrl
        case 18: // Alt
        case 19: // Pause/Break
        case 20: // Caps Lock
        case 35: // End
        case 36: // Home
            break;
        case 188: // <
            rewind();
            return false;
        case 190: // >
            forward();
            return false;
            // Mac CMD Key
        case 91: // Safari, Chrome
        case 93: // Safari, Chrome
        case 224: // Firefox
            break;
    }
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
    if (e.keyCode >= 48 && e.keyCode <= 57) { // Numbers from 0 to 9
        if (!$("#I").is(':focus')) { // If ID not focused, focus it
            $("#I")[0].focus()
            $("#I")[0].select()
                //$("#I").val(e.keyCode-48); // Type in the numerical character
            return true; // Let keycode be transfered to field
        }
    }
}

function vidSet() {
    clearTimeout(vidTimer);
    vidTimer = setTimeout(refresh, 25);
}


function resizeCanvas(w,h) {
    canvas.width = w
    canvas.height = h
    canvas1.setWidth(w)
    canvas1.setHeight(h)
    
    var wrap = $('.canvaswrapper')[0]
    wrap.style.width = w.toString() + 'px'
    wrap.style.height = h.toString() + 'px'
}
function refreshCanvasSize(event, ui) {
    console.log('refreshCanvasSize')
    let wd = parseInt($("#canvasresize")[0].style.width)-16 // Assume width is in px
    let hd = video.videoHeight/video.videoWidth*wd
        
    resizeCanvas(wd,hd)
        
    onFrameChanged()
}

function onVideoLoaded(event) {
    console.log('videoLoaded', event)
    var w,h
    
    w = video.videoWidth
    h = video.videoHeight
    
    console.log("w=",w)
    console.log("h=",h)
    
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

// This callback is the only one that should handle frame changes. It is called automatically by video2
function onFrameChanged(event) {
    console.log('frameChanged', video2.toMilliseconds()/1000.0)

    //Cframe = video2.get();
    //Cframe = event.frame;
    Cframe = getCurrentFrame(); // Use a high-level API that encapsulate video2.get()
    //console.log("onFrameChanged: ",event, Cframe)

    $('#currentFrame').html("Frame: " + Cframe);
    $('#vidTime').html("Video Time: " + video2.toHMSm(video2.toMilliseconds()/1000.0));
    $('#realTime').html("Real Time: " + video2.toHMSm((video2.toMilliseconds()*fps/videoinfo.realfps+video2.toMilliseconds(videoinfo.starttime))/1000.0));

    transformFactor = video.videoWidth / canvas.width;

    updateForm(undefined);
    canvas1.clear();

    default_id = 0; // Default to 0, then incremented inside createRectsFromTracks
    createRectsFromTracks()

    //getChronogram();

    refresh();
    
    selectBeeByID(selectedBee);
}

function refresh() {
    // Updating the form for frame and time is now done in onFrameChanged()
    //ctx.drawImage(video, 0, 0);
    ctx.drawImage(video, 0, 0, video.videoWidth / transformFactor, video.videoHeight / transformFactor);

    // for each new frame, we need to reset everything:
    // remove all rectangles and recreate them
    if (canvas1) {
        canvas1.renderAll(); // Render all rectangles
        
        if (flagShowTrack) {
            plotTracks(ctx);
        }
        
        plotBees(ctx); // Identify the rectangles
    }

    //getChronogram();
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
    return {
        left: obs.x / transformFactor,
        top: obs.y / transformFactor,
        width: obs.width / transformFactor,
        height: obs.height / transformFactor,
    }
}

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

    let range_backward = 5
    let range_forward = 5
    let fmin = F-range_backward;
    let fmax = F+range_forward;
    if (fmin<0) fmin=0;
    //if (fmax>maxframe) fmax=maxframe;

    for (let id of ids) { // For each valid bee ID, create a track for it
        for (let f=fmin; f<=fmax; f++) {
            let obs = getObsHandle(f, id, false)
            if (!obs) continue;
            let rect = videoToCanvasCoords(obs)
            
            let x = rect.left + rect.width / 2;
            let y = rect.top + rect.height / 2;
    
            if (f-F<0)
                paintDot(ctx, {'x':x, 'y':y}, 3, "red", id)
            else
                paintDot(ctx, {'x':x, 'y':y}, 3, "green", id)
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

    let acti = ''
    if (rect.obs.bool_acts[0]) acti += 'F'
    if (rect.obs.bool_acts[1]) acti += 'P'
    if (rect.obs.bool_acts[2]) acti += 'E'
    if (rect.obs.bool_acts[3]) acti += 'L'

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(acti, x, y + radius + 3);
    ctx.textBaseline = 'alphabetic';
}

function playPauseVideo() {
    if (play.value == "Play") {
        video.play();
        play.value = "Pause";

        video2.listen('frame'); // Configure the listener before starting playing to avoid missing any frame
        video2.video.play();

        // Any call to refresh is now handled by the video2 callback to onFrameChanged
    } else {
        video.pause();
        play.value = "Play";

        video2.video.pause();
        video2.stopListen();

        // Any call to refresh is now handled by the video2 callback to onFrameChanged
    }
}

function rewind() {
    video2.seekBackward();
}
function forward() {
    video2.seekForward();
}

function rewind2() {
    video2.seekBackward(fps*5);
}
function forward2() {
    video2.seekForward(fps*5);
}

function rewind3() {
    video2.seekBackward(fps*60*5);
}
function forward3() {
    video2.seekForward(fps*60*5);
}


function vidEnd() {
    play.value = "Play";
}

var flagShowTrack = false
function clickShowTrack() {
    flagShowTrack = $("#checkboxShowTrack")[0].checked
    refresh()
}


var default_width = 60;
var default_height = 40;

// Auxiliary functions to manage fabric rectangles
// Create a fabric rectangle with (top,left) corner
// the user is supposed to drag the other corner
// startX and startY in canvas coordinates
function addRectInteractive(id, startX, startY) {
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
        console.log("onMouseUp_Dragging: e=", e)
        canvas1.off('mouse:move', onMouseMove_Dragging);
        canvas1.off('mouse:up', onMouseUp_Dragging);

        var activeObject = rect;
        console.log('onMouseUp_Dragging: rect=', rect, 'active=', canvas1.getActiveObject())
        if (activeObject.validated) {
            fixRectSizeAfterScaling(activeObject) // Fix negative width or height
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
        } else {
            canvas1.deactivateAll()
            canvas1.remove(activeObject);
            //canvas1.renderAll();
            id = document.getElementById("I");
            id.value = "no selection"
            console.log('onMouseUp: removing non validated activeObject=', activeObject)
            updateForm(undefined)
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
    });
    console.log("addRect: rect =", rect)

    rect.setControlVisible('mtr', false)
    canvas1.add(rect);

    if (parseInt(default_id) <= id)
        default_id = parseInt(id) + 1;

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

// REMI
function getCurrentFrame() {
    return video2.get();
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

function onMouseDown(option) {
    console.log('onMouseDown: option=', option)
    if (g_Moving || g_Dragging) {
        console.log("WARNING in onMouseDown: moving or dragging already active. Aborting them.");
        g_Moving = false;
        g_Dragging = false;
        canvas1.off('mouse:move');
    }

    //console.log('onMouseDown',option)
    resetCheck(); //Check button goes back to blue
    alert1 = document.getElementById("alert");
    alert1.innerHTML = "";
    if (typeof option.target != "undefined") {
        // Clicked on an existing object
        console.log("onMouseDown: Clicked on object ", option.target)
            // This is now handled by event onObjectSelected()
        return false;
    } else {
        // Clicked on the background
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
                console.log("onMouseDown: copied rect from ", obs)
            } else {
                rect = addRect(prediction.id, startX - default_width / 2, startY - default_height / 2,
                    default_width, default_height, "new");
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
            console.log("onMouseDown: creating new rect interactive", rect)
        }

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
    console.log('onMouseUp: option=', option)
        //canvas1.off('mouse:move'); // See onMouseUp_Dragging
        // All moving stuff handled now by event onObjectModified() and onMouseUp_Dragging()
}

function onObjectSelected(option) {
    console.log("onObjectSelected", option)
        //var activeObject = canvas1.getActiveObject();
    if (option.target.id != undefined) {
        console.log("Current object id=", option.target.id)
        console.log("ActiveObject id=", canvas1.getActiveObject().id)
        selectBee(option.target)
    }
}

function onObjectDeselected(option) {
   console.log("onObjectDeselected: ", option);
}

function onObjectMoving(option) {
    return; // No real need for Moving, we can update everything once at the end in onObjectModified

    // Called during translation only
    var activeObject = option.target; //canvas1.getActiveObject();
    fixRectSizeAfterScaling(activeObject)
    console.log("onObjectMoving: activeObject=", activeObject);

    canvas1.renderAll(); // Refresh rectangles drawing
    updateForm(activeObject);
    //automatic_sub();
}

function onObjectModified(option) {
    // Called after translation or scaling
    var activeObject = option.target; //canvas1.getActiveObject();
    fixRectSizeAfterScaling(activeObject)
    console.log("onObjectModified: activeObject=", activeObject);

    canvas1.renderAll(); // Refresh rectangles drawing
    updateForm(activeObject);
    //showZoom(activeObject)
    automatic_sub();
}

function onActivityChanged(event) {
    console.log("onActivityChanged: event=", event)
    var activeObject = canvas1.getActiveObject()
    if (activeObject !== undefined) {
        let tmpObs = activeObject.obs;
        tmpObs.bool_acts[0] = $('#F').prop('checked');
        tmpObs.bool_acts[1] = $('#P').prop('checked');
        tmpObs.bool_acts[2] = $('#E').prop('checked');
        tmpObs.bool_acts[3] = $('#L').prop('checked');
        automatic_sub()
    }
}


/* Update form rectangle data from activeObject */
function updateForm(activeObject) {

    var id = document.getElementById("I");
    var width = document.getElementById("W");
    var height = document.getElementById("H");
    var cx = document.getElementById("CX");
    var cy = document.getElementById("CY");
    var x = document.getElementById("X");
    var y = document.getElementById("Y");

    if (activeObject === undefined) {
        id.value = '-'
        x.innerHTML = "X: -"
        y.innerHTML = "Y: -"
        width.innerHTML = "Width: [" + default_width + "]"
        height.innerHTML = "Height: [" + default_height + "]"
        cx.innerHTML = "Center X: -"
        cy.innerHTML = "Center Y: -"
        $('#F').prop('checked', false);
        $('#P').prop('checked', false);
        $('#E').prop('checked', false);
        $('#L').prop('checked', false);
    } else {
        id.value = activeObject.id;
        w = activeObject.width;
        h = activeObject.height;

        let vr = canvasToVideoCoords(activeObject)

        x.innerHTML = "X: " + vr.x.toFixed(0);
        y.innerHTML = "Y: " + vr.y.toFixed(0);

        width.innerHTML = "Width: " + vr.width.toFixed(0);
        height.innerHTML = "Height: " + vr.height.toFixed(0);

        cx.innerHTML = "Center X: " + (vr.x + vr.width / 2).toFixed(0);
        cy.innerHTML = "Center Y: " + (vr.y + vr.height / 2).toFixed(0);

        let obs = activeObject.obs;
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
    //final_id = $('#I')[0].value;
    //activeObject.id = final_id;
    final_id = activeObject.id;
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

    console.log(doesExist(activeObject.id));

    let tmpObs = activeObject.obs
    tmpObs.ID = final_id;
    updateForm(activeObject);

    let videoRect = canvasToVideoCoords(activeObject)

    //Transform the coordinates to video coordinates before saving them in Tracks
    tmpObs.time = video.currentTime;
    tmpObs.frame = getCurrentFrame();
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

    storeObs(tmpObs);
    activeObject.status = "db"

    refresh();

    //getChronogram();
    resetRemove(); //you lose your chance of undoing remove
}

function automatic_sub() {
    var activeObject = canvas1.getActiveObject();
    if (activeObject.status == "db") {
        submit_bee()
    } else {
        console.log("automatic_sub: not submitted, as tmp rect")
        refresh() // Just refresh
    }
}

function showZoom(rect) {
    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    zoom_ctx.clearRect(0, 0, 200, 150)
    let w = rect.width,
        h = rect.height
    let mw = w * 0.5,
        mh = h * 0.5
    let w2 = w + 2 * mw,
        h2 = h + 2 * mh
    let sc = Math.min(5, 200 / w2)
    zoom_ctx.drawImage(video, (rect.left - mw) * transformFactor, (rect.top - mh) * transformFactor, w2 *
        transformFactor, h2 * transformFactor,
        100 - w2 * sc / 2, 75 - h2 * sc / 2, w2 * sc, h2 * sc);
    zoom_ctx.beginPath();
    zoom_ctx.rect(100 - w * sc / 2, 75 - h * sc / 2, w * sc, h * sc)
    zoom_ctx.strokeStyle = 'blue'
    zoom_ctx.stroke()
}

function selectBeeByID(id) {
   let rect = findRect(id);
   if (rect) {
       selectBee(rect);
   } else {
       selectedBee=undefined;
       console.log('selectBeeByID: No rect found for id=',id);
   }
}

//This function is needed to update the display when a different bee is selected
//in the GUI
//function selectBee(beeId) {
function selectBee(rect) {
    console.log("selectBee: rect=", rect);
    let beeId = rect.id;
    
    selectedBee = beeId;

    // Update form from rect
    updateForm(rect)
    //showZoom(rect)

    // Update form from matching observation
    //var obs = getObsHandle(getCurrentFrame(), beeId, false);
    var obs = rect.obs;
    if (obs == undefined) {
        console.log("WARNING: selectBee called for rect with non existing observation. rect=", rect)
        return
    } else {
        console.log("selectBee: obs=", obs)
    }
    $('#marked').prop('checked', obs.marked);
    $('#permanent').prop('checked', obs.permanent);
    $('#F').prop('checked', obs.bool_acts[0]);
    $('#P').prop('checked', obs.bool_acts[1]);
    $('#E').prop('checked', obs.bool_acts[2]);
    $('#L').prop('checked', obs.bool_acts[3]);
}

function deleteObjects() { //Deletes selected rectangle(s) when remove bee is pressed
    //Deletes an observation
    var activeObject = canvas1.getActiveObject(),
        activeGroup = canvas1.getActiveGroup();

    if (activeObject) {
        canvas1.remove(activeObject);
        temporaryObs = new Observation(0);
        console.log(activeObject.id);
        if (doesExist(activeObject.id)) {
            undo = Tracks[video2.get()][activeObject.id];
            console.log("This is undo");
            console.log(undo);
            delete Tracks[video2.get()][activeObject.id];
        }

        getChronogram();
    }

    refresh()
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

    addObs(undo);

    refresh();

    getChronogram();
}

function resetRemove() {
    buttonManip = document.getElementById("special");
    buttonManip.className = "btn btn-info";
    buttonManip.value = "Remove obs";
}

function resetCheck() {
    buttonManip = document.getElementById("special2");
    buttonManip.className = "btn btn-info btn-sm";
    buttonManip.value = "Check";
}

////THE CHRONOGRAM////////////////////////////////////////////////////////////////////////////
var g_xRange = undefined,
    g_xZoom = undefined;

function drawChrono() {

    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 40
        },
        width = 960 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width])
        .domain([d3.min(chronogramData,
                function(d) {
                    return Number(d.x) - 0.5;
                }),
            d3.max(chronogramData,
                function(d) {
                    return Number(d.x) + 0.5;
                })
        ]);

    var y = d3.scale.linear()
        .range([0, height])
        .domain([d3.min(chronogramData,
                function(d) {
                    return Number(d.y) - 0.5;
                }),
            d3.max(chronogramData,
                function(d) {
                    return Number(d.y) + 0.5;
                })
        ]);

    xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickSize(-height);

    yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5)
        .tickSize(-width);

    var zoom = d3.behavior.zoom()
        .x(x)
        /*.y(y)*/
        .scaleExtent([1, 32])
        .on("zoom", zoomed);

    if (g_xRange !== undefined) {
        zoom.scale(g_xZoom.scale())
        x.domain(g_xRange.domain());
    }

    vis = d3.select("#svgVisualize")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);

    vis.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "#f0f0ff")
        .style("stroke", "gray")

    vis.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    vis.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Add the text label for the x axis
    vis.append("text")
        .attr("transform", "translate(" + 70 + " ," + -10 + ")")
        .style("text-anchor", "middle")
        .text("Frame");


    // Add the text label for the Y axis
    vis.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -220)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Bee ID");

    var chronArea = vis.append("g");

    var timeMark = chronArea.append("rect")
        .attr("x", function(d) {
            return x(Number(getCurrentFrame()) - 0.05);
        })
        .attr("y", function(d) {
            return y(-0.5);
        })
        .attr("height", function(d) {
            return (y(Number(y.range()[1]) + 0.5) - y(-0.5));
        })
        .attr("width", function(d) {
            return (x(0.1) - x(0.0));
        })
        .style("fill", "#ff0000")

    circles = chronArea.append("g").selectAll("rect").data(chronogramData);

    circles
        .enter()
        .insert("rect")
        .attr("x", function(d) {
            return x(Number(d.x) - 0.5);
        })
        .attr("y", function(d) {
            return y(Number(d.y) - 0.4);
        })
        .attr("height", function(d) {
            return (y(Number(d.y) + 0.4) - y(Number(d.y) - 0.4));
        })
        .attr("width", function(d) {
            return (x(Number(d.x) + 1) - x(d.x));
        })
        .style("fill", function(d) {
            var color = "black";
            if (d.Activity == "fanning")
                color = "#99CCFF";
            else if (d.Activity == "entering")
                color = "#FFFF00";
            else if (d.Activity == "exiting")
                color = "#CC00FF";
            else if (d.Activity == "pollenating")
                color = "#00CC99";
            return color;
        })
        .style("stroke", "black");

    function zoomed() { //Function inside function
        g_xRange = x;
        g_xZoom = zoom;

        vis.select(".x.axis").call(xAxis);
        vis.select(".y.axis").call(yAxis);

        timeMark
            .attr("x", function(d) {
                return x(Number(getCurrentFrame()) - 0.05);
            })
            .attr("y", function(d) {
                return y(-0.5);
            })
            .attr("height", function(d) {
                return (y(Number(y.range()[1]) + 0.5) - y(-0.5));
            })
            .attr("width", function(d) {
                return (x(0.1) - x(0.0));
            })

        circles
            .attr("x", function(d) {
                return x(Number(d.x) - 0.5);
            })
            .attr("y", function(d) {
                return y(Number(d.y) - 0.4);
            })
            .attr("height", function(d) {
                return (y(Number(d.y) + 0.4) - y(Number(d.y) - 0.4));
            })
            .attr("width", function(d) {
                return (x(Number(d.x) + 1) - x(d.x));
            })
    }
}

function getChronogram() {

    //Deleting everything on the svg so we can recreate the updated chart
    d3.selectAll("svg > *").remove();
    //Emptying the array so we won't have duplicates
    for (var i = 0; i < chronogramData.length; i++)
        chronogramData.pop();
    for (F in Tracks) {
        for (id in Tracks[F]) {
            chronoObs.x = F;
            chronoObs.y = id;


            if (Tracks[F][id].bool_acts[0]) {
                chronoObs.Activity = "fanning";
            } else if (Tracks[F][id].bool_acts[1]) {
                chronoObs.Activity = "pollenating";
            } else if (Tracks[F][id].bool_acts[2]) {
                chronoObs.Activity = "entering";
            } else if (Tracks[F][id].bool_acts[3]) {
                chronoObs.Activity = "exiting";
            }


            chronogramData.push(chronoObs);

            chronoObs = new chronoObservation();
        }
    }

    d3.selectAll("svg > *").remove();
    drawChrono();
}