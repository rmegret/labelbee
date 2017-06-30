/*jshint esversion: 6, asi: true */

// ## VideoControl
// Video Control: frame/time conversion, seek

// import {VideoFrame} from "extern/VideoFrame.js";

function VideoControl(videoTagId) {
    if (this === window) { 
        console.log('ERROR: VideoControl should be created with "new VideoControl()"')
        return new VideoControl(); 
    }
    
    this.flagCopyVideoToCanvas = true;
    this.seekWallTime = 0;
    this.seekTiming = false
    
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
}

VideoControl.prototype = {} // Prepare for all VideoControl methods

// ### Play/pause

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

// # Change current frame
VideoControl.prototype.startSeekTimer = function() {
    this.seekWallTime = new Date().getTime()
    this.seekTiming = true
}

VideoControl.prototype.seekFrame = function(frame, useFastSeek) {
    this.startSeekTimer()
    if (useFastSeek) {
        this.video2.seekTo({'frame':frame+videoinfo.frameoffset, 
                       'fast':true}) // Experimental, not actually faster
    } else {
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
VideoControl.prototype.getCurrentFrame = function() {
    return this.video2.get()-videoinfo.frameoffset;
}
VideoControl.prototype.getCurrentVideoTime = function(format) {
    return this.video2.toMilliseconds()/1000.0
}
VideoControl.prototype.getCurrentRealDate = function(format) {
    var D = new Date(videoinfo.starttime)
    D = new Date(D.getTime()+this.video2.toMilliseconds()*videoinfo.videofps/videoinfo.realfps)
    return D
}


// ## View

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
    let Cframe = this.getCurrentFrame();
    
    if (this.seekTiming) {
        this.seekTiming=false;
        let elapsed = (new Date().getTime() - this.seekWallTime)/1000.0
        console.log('Seek frame '+Cframe+': elapsed='+elapsed+' s')
    }
    
    if (logging.frameEvents)
        console.log('frameChanged', Cframe)

    this.hardRefresh();
}

VideoControl.prototype.hardRefresh = function() {
    let Cframe = this.getCurrentFrame();
    if (logging.frameEvents)
        console.log('hardRefresh', Cframe)
        
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
        
    //$('#currentFrame').html("Frame: " + Cframe)
    $('#currentFrame').val(Cframe)
    $('#vidTime').html("Video Time: " + this.video2.toHMSm(this.getCurrentVideoTime()))
    $('#realTime').html("Real Time: " + toLocaleISOString(this.getCurrentRealDate()))

    printMessage("")

    canvas1.clear();
    createRectsFromTracks()

    selectBeeByID(defaultSelectedBee);
    //updateForm(null);
    
    this.refresh()
    
}
VideoControl.prototype.refresh = function() {
    let video = $('#video')[0]
    if (this.flagCopyVideoToCanvas) {
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
    refreshOverlay()
    
    if (flagShowZoom) {
        refreshZoom()
    }
    
    updateDeleteButton()
    updateUndoButton()
    
    updateTimeMark()

    //refreshChronogram();
}

VideoControl.prototype.loadVideo = function(url) {
    this.video.src = url;
    // Update of display handled in callback onVideoLoaded
}

VideoControl.prototype.onVideoLoaded = function(event) {
    if (logging.videoEvents)
        console.log('onVideoLoaded', event)
    
    this.onVideoSizeChanged()
    
    videoinfo.duration = this.video.duration
    videoinfo.name = this.video.src
    
    let videourl = this.video.src;
    let infourl = videourl+'.info.json'
    this.loadVideoInfo(infourl)
}

VideoControl.prototype.onVideoSizeChanged = function() {
    /* Video size */
    
    var w,h
    
    w = this.video.videoWidth
    h = this.video.videoHeight
    
    if (logging.videoEvents) {
        console.log("videoSizeChanged: w=",w," h=",h)
    }    
        
    canvasSetVideoSize(w,h)
}

VideoControl.prototype.loadVideoInfo = function(infourl) {
    let videoControl = this;
    var jqxhr = $.getJSON( infourl, function(data) {
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

            //'starttime': '2016-07-15T09:59:59.360',
            //'duration': 1/20, // Duration in seconds
            //'nframes': 1
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log( "loadVideoInfo: could not load ",infourl,"\nerror='", textStatus, "', details='", errorThrown,"'\n  videoInfo unchanged")
        })
        .complete(function() { 
            videoControl.onVideoInfoChanged()
        })
    // Update of videoInfo handled in callback onVideoInfoChanged
}
VideoControl.prototype.onVideoInfoChanged = function() {
    if (logging.videoEvents)
        console.log('onVideoInfoChanged', event)

    videoinfo.nframes = Math.floor(videoinfo.duration*videoinfo.videofps)
    this.video2.frameRate = videoinfo.videofps
        
    updateVideoInfoForm()
        
    updateChronoXDomainFromVideo()   // Should trigger chrono refresh
    //refreshChronogram()
}

// function onVideoReady(event) {
//     video.oncanplay = undefined
//     if (logging.videoEvents)
//         console.log('videoReady', event)
//     videoControl.rewind()
// }
