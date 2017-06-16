/*jshint esversion: 6, asi: true */

// ## VideoList
// Video List: selection, metainformation, loading

// export ...

var videoinfo;

/* Video List */
function initVideoSelection() {
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
    
    videoList = [ 'testvideo.mp4',
                  'vlc1.mp4',
                  'vlc2.mp4',
                  '1_02_R_170419141405.mp4',
                  '1_02_R_170426151700_cleaned.mp4',
                  '36_01_H_160715100000_copy.mp4',
                  'GuraboTest/4_02_R_170511130000.mp4' ]
    initVideoSelectbox()
}
function initVideoSelectbox() {
    var selectbox = $("#selectboxVideo")
    selectbox.find('option').remove()

    $.each(videoList, function (i, el) {
        selectbox.append("<option value='data/"+el+"'>"+el+"</option>");
    });
}
function selectVideo() {
    let file = $('#selectboxVideo')[0].value
    $('#video')[0].src = file;
    
    // Change handled in callback onVideoLoaded
}

/* Update Video List */
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
    let infourl = videourl+'.info.json'
        
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