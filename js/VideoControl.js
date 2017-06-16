/*jshint esversion: 6, asi: true */

// ## VideoControl
// Video Control: frame/time conversion, seek, 

// import {VideoFrame} from "extern/VideoFrame.js";

function VideoControl() {
    if (this === window) { return new VideoControl(); }
    
    flagCopyVideoToCanvas = true;
    
    if (typeof video2 !== 'undefined') { console.log('WARNING in VideoControl.js: video2 already defined. Overwriting.') }
    
    video2 = new VideoFrame({
        id: 'video',
        /* We use the fps declared in the video here, even if not real */
        frameRate: videoinfo.videofps,
        callback: onFrameChanged // VERY IMPORTANT: all frame changes (play,next,prev...) trigger this callback. No refresh should be done outside of this callback
    });
    video2.onListen = function() {console.log('video2.onListen');};
    video2.onStopListen = function() {console.log('video2.onStopListen');};
}

VideoControl.prototype = {}

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
function fastSeekFrame(frame) {
    startSeekTimer()
    video2.seekTo({'frame':frame+videoinfo.frameoffset, 'fast':true})
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
    let video = $('#video')[0]
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