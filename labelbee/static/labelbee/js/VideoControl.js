/*jshint esversion: 6, asi: true */

// ## VideoControl
// Video Control: frame/time conversion, seek

// import {VideoFrame} from "extern/VideoFrame.js";

function VideoControl(videoTagId) {
    if (this === window) { 
        console.log('ERROR: VideoControl should be created with "new VideoControl()"')
        return new VideoControl(); 
    }
    
    /* Emit events:
        video:loaded
        frame:changed
        previewframe:changed
        videosize:changed
    */
    
    this.isValidVideo = false
    this.flagCopyVideoToCanvas = true;
    this.seekWallTime = 0;
    this.seekTiming = false
    this.playbackRate = 1
    this.videoname = 'unknownVideo'
    this.currentMode = 'video'
    this.currentFrame = 0
    
    if (typeof videoTagId === 'undefined')
        videoTagId = 'video'; // Default HTML5 video tag to attach to
    
    this.video2 = new VideoFrame({
        id: videoTagId,
        /* We use the fps declared in the video here, even if not real */
        frameRate: videoinfo.videofps,
        callback: this.onFrameChanged.bind(this) // VERY IMPORTANT: all frame changes (play,next,prev...) trigger this callback. No refresh should be done outside of this callback
    });
    this.video2.onListen = function() {console.log('video2.onListen');};
    this.video2.onStopListen = function() {console.log('video2.onStopListen');};
    
    this.video = this.video2.video; // Same as $('#video')[0]
    this.video.onloadeddata = this.onVideoLoaded.bind(this);
    this.video.onerror = this.onVideoError.bind(this);
    
    this.previewVideo = document.createElement('video');
    let videoControl = this;
    this.previewVideo.addEventListener('timeupdate', 
          function() {videoControl.onPreviewFrameChanged()}, false);
}

VideoControl.prototype = {} // Prepare for all VideoControl methods

// #MARK ### Play/pause

VideoControl.prototype.playRateInputChanged = function() {
    let text = $('#playRate').val()
    let a=text.split('/')
    if (a.length==1) {
        this.playbackRate = Number(text)
    } else if (a.length==2) {
        this.playbackRate = Number(a[0])/Number(a[1])
    } else {
        console.log('playRateInputChanged: ERROR, playRate format not recognized. playRate=',text)
        return
    }
    this.video2.setPlaybackRate(this.playbackRate)
}

VideoControl.prototype.playPauseVideo = function(option) {
    if (logging.guiEvents) console.log('playPauseVideo()');
    let playingState = this.video2.playingState()
    if (playingState == "paused" || playingState == "playingBackwards") {
        this.playForwards(option)
    } else {
        this.pause()
    }
}
VideoControl.prototype.playPauseVideoBackward = function(option) {
    if (logging.guiEvents) console.log('playPauseVideoBackward()');
    let playingState = this.video2.playingState()
    if (playingState == "paused" || playingState == "playingForwards") {
        this.playBackwards(option)
    } else {
        this.pause()
    }
}
VideoControl.prototype.playForwards = function(option) {      
      if (logging.frameEvents)
            console.log('playForwards');
                 
      if (Number(option)==2)
          this.video2.playForwards(1000.0/20/4);
      else {
          this.video2.playForwards()
      }
      
      this.updateNavigationView()
      // Any call to refresh is handled by the video2 callback to onFrameChanged
}
VideoControl.prototype.playBackwards = function(option) {
      if (logging.frameEvents)
            console.log('playBackwards');
      
      this.video2.stopListen(); // Cut any other play occuring
      if (Number(option)==2)
          this.video2.playBackwards(1000.0/20/4);
      else
          this.video2.playBackwards();
      this.updateNavigationView()

      // Any call to refresh is now handled by the video2 callback to onFrameChanged
}
VideoControl.prototype.pause = function() {
    // Was playing, pause
    if (logging.frameEvents)
        console.log('pause');

    this.video2.video.pause();
    this.video2.stopListen();
    this.updateNavigationView()
}

// #MARK # Change current frame
VideoControl.prototype.startSeekTimer = function() {
    this.seekWallTime = new Date().getTime()
    this.seekTiming = true
}

VideoControl.prototype.seekFrame = function(frame, useFastSeek) {
    this.startSeekTimer()
    if (useFastSeek) {
        this.previewFrame = frame;
        this.currentMode = 'preview'
        
        // preview keeps 1 keyframe out of 40 frames
        // and is encoded at same speed as original (0.5fps=20fps/40)
        //let t = Math.round((frame+videoinfo.frameoffset)/40)*40/20
        
        // preview keeps 1 keyframe out of 40 frames
        // and is encoded at 20 fps
        //let t = Math.round((frame+videoinfo.frameoffset)/40)/20
        
        let t = (frame+videoinfo.frameoffset)
                 /videoinfo.videofps/videoinfo.preview.previewTimescale;
        
        if (logging.frameEvents)
            console.log('videoControl.seekFrame: FAST, f=',frame,' t=',t)
        this.previewVideo.currentTime =  t
    } else {
        this.currentMode = 'video'
        this.video2.seekTo({'frame':frame+videoinfo.frameoffset})
    }
}
VideoControl.prototype.rewind = function(frames) {
    if (!frames) frames = 1;
    this.startSeekTimer()
    this.video2.seekBackward(frames);
}
VideoControl.prototype.forward = function(frames) {
    if (!frames) frames = 1;
    this.startSeekTimer()
    this.video2.seekForward(frames);
}
VideoControl.prototype.rewind2 = function() {
    this.rewind(videoinfo.videofps);
}
VideoControl.prototype.forward2 = function() {
    this.forward(videoinfo.videofps);
}
VideoControl.prototype.rewind3 = function() {
    this.rewind(videoinfo.videofps*10); // 10s
}
VideoControl.prototype.forward3 = function() {
    this.forward(videoinfo.videofps*10);
}
VideoControl.prototype.rewind4 = function() {
    this.rewind(videoinfo.videofps*60); // 1 min
}
VideoControl.prototype.forward4 = function() {
    this.forward(videoinfo.videofps*60);
}

// # Get current frame/time
VideoControl.prototype.getCurrentVideoFrame = function() {
    if (this.currentMode == 'preview')
        return this.previewFrame-videoinfo.frameoffset;
    else // currentMode == 'video'
        return this.video2.get()-videoinfo.frameoffset;
}
VideoControl.prototype.getCurrentFrame = function() {
    // Modified only by onFrameChanged or onPreviewFrameChanged
    // To try to sync currentFrame with the actual frame shown
    return this.currentFrame;
}
VideoControl.prototype.getCurrentVideoTime = function(format) {
    return this.video2.toMilliseconds()/1000.0
}
VideoControl.prototype.getCurrentRealDate = function(format) {
    var D = new Date(videoinfo.starttime)
    D = new Date(D.getTime()+this.video2.toMilliseconds()*videoinfo.videofps/videoinfo.realfps)
    return D
}
VideoControl.prototype.frameToTime = function(frame) {
    var D = new Date(videoinfo.starttime)
    var sec = (frame-videoinfo.frameoffset)/videoinfo.realfps
    D = new Date(D.getTime()+sec*1000)
    return D
}


// #MARK ## View

VideoControl.prototype.updateNavigationView = function() {
   let playingState = this.video2.playingState()
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

// Event handler
VideoControl.prototype.onFrameTextChanged = function() {
    let frame = Number($('#currentFrame').val())
    this.seekFrame(frame)
}

// This callback is the only one that should handle frame changes. It is called automatically by video2
VideoControl.prototype.onFrameChanged = function(event) {
    this.currentMode = 'video'
    this.currentFrame = this.getCurrentVideoFrame();
    
    if (this.seekTiming) {
        this.seekTiming=false;
        let elapsed = (new Date().getTime() - this.seekWallTime)/1000.0
        console.log('Seek frame '+this.currentFrame+': elapsed='+elapsed+' s')
    }
    
    if (logging.frameEvents)
        console.log('frameChanged', this.currentFrame)

    this.hardRefresh();
    
    // Trigger public event 
    // listened by: 
    // - ChronoControl to change trackWindow View and timeMark View
    // - OverlayControl to redraw overlay
    $( this ).trigger('frame:changed')
}

VideoControl.prototype.onPreviewFrameChanged = function(event) {
    console.log('videoControl.onPreviewFrameChanged')
    
    this.currentMode = 'preview'
    this.currentFrame = this.getCurrentVideoFrame();
    
    if (logging.frameEvents)
        console.log('previewFrameChanged', this.currentFrame)
    
    this.hardRefresh();
    
    $( this ).trigger('previewframe:changed')
}

VideoControl.prototype.updateVideoControlForm = function() {
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
        
    if (this.currentMode == 'preview') {
        $('#currentFrame').val(''+this.currentFrame+'[P]')
    } else {
        $('#currentFrame').val(+this.currentFrame)
    }
    $('#vidTime').html("Video Time: " + this.video2.toHMSm(this.getCurrentVideoTime()))
    $('#realTime').html("Real Time: " + toLocaleISOString(this.getCurrentRealDate()))

    printMessage("")
}

VideoControl.prototype.hardRefresh = function() {
    // Hard refresh when video or frame changed

    if (logging.frameEvents)
        console.log('hardRefresh', this.currentFrame)
    
    this.refresh()
}
VideoControl.prototype.refresh = function() {
    // Refresh when frame changed
    
    if (logging.frameEvents)
        console.log('videoControl.refresh', this.currentFrame)
        
    this.updateVideoControlForm()

    overlay.hardRefresh()
    
    // Zoom Overlay supposed to be updated by triggers from overlay refresh    
    // zoomOverlay.refreshZoom()
}



// #MARK ## Loading

VideoControl.prototype.loadVideo = function(url, previewURL) {
    if (logging.videoEvents)
        console.log('loadVideo: url=',url)

    this.name = url;
    this.video.src = url;
    videoinfo.videoURL = url;
    // Update of display handled in callback onVideoLoaded
    
    let tmp = url.split('/')
    videoinfo.videoName = tmp[tmp.length-1].split('.')[0]
    
//     if (previewURL) {
//         this.previewURL = previewURL;
//     } else {
//         previewURL = url+'.scale4.mp4'
//         this.previewURL = previewURL;
//     }
//     $("#previewVideoName").val(this.previewURL)
    
    this.setPreviewVideoStatus('undefined')
    
    statusWidget.statusRequest('videoLoad', [])
}
VideoControl.prototype.onVideoLoaded = function(event) {
    if (logging.videoEvents)
        console.log('onVideoLoaded', event)
        
    console.log('onVideoLoaded: VIDEO loaded ',this.video.src)
    statusWidget.statusUpdate('videoLoad', true, [])
    
    this.isValidVideo = true;
    
    this.onVideoSizeChanged()
    
    videoinfo.duration = this.video.duration
    videoinfo.name = this.video.src
    
    let name = videoinfo.name
    $('#videoName').html(name)
    
    let videourl = videoinfo.videoURL;
    
    this.loadVideoInfo(videourl+'.info.json')
    this.loadPreviewVideo()
    
    statusWidget.statusRequest('tagsLoad', [])
    tagsFromServer(videoinfo.tags.videoTagURL, true) // quiet
    
    $( this ).trigger('video:loaded') 
    
    this.hardRefresh()
}
VideoControl.prototype.onVideoError = function(event) {
    if (logging.videoEvents)
        console.log('onVideoError', event)
    console.log('onVideoError: could not load ',this.video.src)
        
    statusWidget.statusUpdate('videoLoad', false, [])
    
    this.isValidVideo = false;
    
    this.onVideoSizeChanged()
    
    this.hardRefresh()
}

VideoControl.prototype.setPreviewVideoStatus = function(status) {
    $("#previewVideoStatus").removeClass('undefined loading loaded infoloaded error')
    switch (status) {
        case 'undefined':
          $("#previewVideoStatus").html('?')
          $("#previewVideoStatus").addClass('undefined')
          $("#previewVideoStatus").prop('title', 'undefined')
          break;
        case 'loading':
          $("#previewVideoStatus").html('&mapstodown;')
          $("#previewVideoStatus").addClass('loading')
          $("#previewVideoStatus").prop('title', 'Loading preview video')
          break;
        case 'loaded':
          $("#previewVideoStatus").html('&#10004;')
          $("#previewVideoStatus").addClass('loaded')
          $("#previewVideoStatus").prop('title', 'Preview video loaded successfully')
          break;
        case 'error':
          $("#previewVideoStatus").html('&#10006;')
          $("#previewVideoStatus").addClass('error')
          $("#previewVideoStatus").prop('title', 'Error loading preview video')
          break;
        case 'infoloaded':
          $("#previewVideoStatus").html('&#10004;&#10004;')
          $("#previewVideoStatus").addClass('infoloaded')
          $("#previewVideoStatus").prop('title', 'Preview video loaded with info')
          break;
    }
}
VideoControl.prototype.loadPreviewVideo = function(previewURL) {
    let videoControl = this;
    
    if (!previewURL) {
        previewURL = videoinfo.videoURL+'.scale4.mp4'
    }
    videoinfo.preview.previewURL = previewURL;
    $("#previewVideoName").val(previewURL)

    statusWidget.statusRequest('videopreviewLoad', [])
    
    function _onPreviewVideoLoaded(event) {
        if (logging.videoEvents)
            console.log('onPreviewVideoLoaded', event)

        console.log('onPreviewVideoLoaded: PREVIEW available. Use CTRL+mousemove in the chronogram. url=',event.target.src)
        
        videoControl.setPreviewVideoStatus('loaded')
        statusWidget.statusUpdate('videopreviewLoad', true, [])
                    
        let infourl = videoinfo.preview.previewURL+'.info.json';
        videoControl.loadPreviewVideoInfo(infourl)
    }
    function _onPreviewVideoError(e) {
        //if (logging.videoEvents)
            console.log('onPreviewVideoError: could not load preview video.',{previewURL:previewURL})
        videoControl.setPreviewVideoStatus('error')
        statusWidget.statusUpdate('videopreviewLoad', false, [])
    }
    videoControl.setPreviewVideoStatus('loading')
    videoControl.previewVideo.onerror=_onPreviewVideoError
    videoControl.previewVideo.onloadeddata=_onPreviewVideoLoaded

    videoControl.previewVideo.src = previewURL;
    if (logging.videoEvents)
        console.log('loadPreviewVideo: previewURL=',previewURL)
}
VideoControl.prototype.changePreviewVideoName = function(event) {
    //console.log(event)
    let previewVideoURL = $('#previewVideoName').val()
    this.loadPreviewVideo(previewVideoURL)
}
// update from form
VideoControl.prototype.changePreviewVideoInfo = function(event) {
    //console.log(event)
    videoinfo.preview.previewTimescale = Number($('#previewVideoTimeScale').val())
}
// load from file
VideoControl.prototype.loadPreviewVideoInfo = function(infoURL) {
    let videoControl = this;
    
    if (!infoURL) {
        infoURL = videoinfo.preview.previewURL+'.info.json'
    }
    videoinfo.preview.previewInfoURL=infoURL;
    
    let _onVideoInfoLoaded = function(data) {
        if (logging.videoEvents)
            console.log( "PREVIEW loadVideoInfo loaded" );
        console.log('PREVIEW videojsoninfo = ',data)    
        videojsoninfo = data
    
        if ($.isNumeric(videojsoninfo.timescale)) {
          videoinfo.preview.previewTimescale = Number(videojsoninfo.timescale)
          $('#previewVideoTimeScale').val(videoinfo.preview.previewTimescale)
        }
    }
    let _onVideoInfoError = function(jqXHR, textStatus, errorThrown) {
        console.log( "PREVIEW loadVideoInfo: could not load ",infoURL,"\nerror='", textStatus, "', details='", errorThrown,"'\n  videoInfo unchanged")
        statusWidget.statusUpdate('previewVideoInfoLoad', false, [])
    }
    let _onVideoInfoChanged = function() { 
        //videoControl.onPreviewVideoInfoChanged()
    }
    
    statusWidget.statusRequest('previewVideoInfoLoad', [])
    var jqxhr = $.getJSON(infoURL, _onVideoInfoLoaded)
        .fail(_onVideoInfoError)
        .complete(_onVideoInfoChanged)
    // Update of videoInfo handled in callback onVideoInfoChanged
}

VideoControl.prototype.onVideoSizeChanged = function() {
    /* Video size */

    var w,h
    if (this.isValidVideo) {    
        w = this.video.videoWidth
        h = this.video.videoHeight
    } else {
        w = 600
        h = 400
    }
    
    if (logging.videoEvents) {
        console.log("videoSizeChanged: w=",w," h=",h)
    }    
        
    //$( this ).trigger('videosize:changed', w,h) 
    overlay.canvasSetVideoSize(w,h)
}
VideoControl.prototype.videoSize = function() {
    if (this.isValidVideo) {    
        return { left: 0,
                 top: 0,
                 right: this.video.videoWidth,
                 bottom: this.video.videoHeight
                }
    } else {
        return { left: 0,
                 top: 0,
                 right: 600,
                 bottom: 400
                }
    }
}





VideoControl.prototype.loadVideoInfo = function(infourl) {
    let videoControl = this;
    
    let _onVideoInfoLoaded = function(data) {
        if (logging.videoEvents)
            console.log( "loadVideoInfo loaded" );
        console.log('videojsoninfo = ',data)    
        videojsoninfo = data
    
        if ($.isNumeric(videojsoninfo.videofps)) {
          videoinfo.videofps = Number(videojsoninfo.videofps)
          videoControl.video2.frameRate = videoinfo.videofps
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
        statusWidget.statusUpdate('videoinfoLoad', true, [])
        //'starttime': '2016-07-15T09:59:59.360',
        //'duration': 1/20, // Duration in seconds
        //'nframes': 1
    }
    let _onVideoInfoError = function(jqXHR, textStatus, errorThrown) {
        console.log( "loadVideoInfo: could not load ",infourl,"\nerror='", textStatus, "', details='", errorThrown,"'\n  videoInfo unchanged")
        statusWidget.statusUpdate('videoinfoLoad', false, [])
    }
    let _onVideoInfoChanged = function() { 
        videoControl.onVideoInfoChanged()
    }
    
    statusWidget.statusRequest('videoinfoLoad', [])
    var jqxhr = $.getJSON(infourl, _onVideoInfoLoaded)
        .fail(_onVideoInfoError)
        .complete(_onVideoInfoChanged)
    // Update of videoInfo handled in callback onVideoInfoChanged
}
VideoControl.prototype.onVideoInfoChanged = function() {
    if (logging.videoEvents)
        console.log('onVideoInfoChanged', event)

    videoinfo.nframes = Math.floor(videoinfo.duration*videoinfo.videofps)
    this.video2.frameRate = videoinfo.videofps
        
    videoManager.updateVideoInfoForm()
        
    updateChronoXDomainFromVideo()   // Should trigger chrono refresh
    //refreshChronogram()
}

VideoControl.prototype.maxframe = function() {
    return Math.floor(videoinfo.duration*videoinfo.videofps)
}


