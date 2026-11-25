/*jshint esversion: 6, asi: true */

// ## VideoControl
// Video Control: frame/time conversion, seek

import { instrument } from "../core/RefreshInstrumentBridge.js";
import { VideoCache } from "./VideoCache.js";
import { HoverControl } from "./HoverControl.js";
import { getVideoInfo } from "./VideoInfo.js";
import { url_for } from "../core/Utils.js";
import { updateChronoXDomainFromVideo } from "../chrono/ChronoRender.js";
import { tagsFromServer } from "../commands/LoadFromServer.js";
import { logging } from "../core/Notifier.js";

// `lasthash` (page global, shared with labelBee.js:onhashchange) is created by labelBee.js, which runs first

//import {VideoFrame} from "extern/VideoFrame.js";
//var LRUCache = require("extern/lru_cache-master/index").LRUCache


export function VideoControl(videoTagId) {
  if (this === window) {
    console.log(
      'ERROR: VideoControl should be created with "new VideoControl()"'
    );
    return new VideoControl();
  }

  /* Emit events:
        video:loaded
        frame:changed
        previewframe:changed
        videosize:changed
    */

  this.isValidVideo = false;
  this.flagCopyVideoToCanvas = true;
  this.seekWallTime = 0;
  this.seekTiming = false;
  this.playbackRate = 1;
  this.playingState = 'paused'
  this.videoname = "unknownVideo";
  this.currentMode = "video";
  this.currentFrame = 0;
  
  this.delayedSeekFrame = undefined;

  this.preloadSpanBefore = 50
  this.preloadSpanAfter = 100

  if (typeof videoTagId === "undefined") videoTagId = "video"; // Default HTML5 video tag to attach to

  /*  Architecture:
      this.video is handle to <video id='video'> HTML tag is responsible for loading and decoding the video
      this.video2 is VideoFrame API to control this.video frame by frame
      this.previewVideo is handle to <video> HTML tag to decode previewVideo
      */
  this.video2 = new VideoFrame({
    id: videoTagId,
    /* We use the fps declared in the video here, even if not real */
    frameRate: getVideoInfo().videofps,
    callback: this.onFrameChangedVideo2.bind(this), // VERY IMPORTANT: all frame changes (play,next,prev...) trigger this callback. No refresh should be done outside of this callback
  });
  this.video2.onListen = function () {
    console.log("video2.onListen");
  };
  this.video2.onStopListen = function () {
    console.log("video2.onStopListen");
  };

  this.video = this.video2.video; // Same as $('#video')[0]
  this.video.onloadeddata = this.onVideoLoaded2.bind(this);
  this.video.onerror = this.onVideoError.bind(this);

  this.previewVideo = document.createElement("video");
  let videoControl = this;
  this.previewVideo.addEventListener('timeupdate',
    function () { videoControl.onPreviewFrameChanged() }, false);

  this.videoCache = new VideoCache(this);

  this.hover = new HoverControl(this); // hover preview queries (cache-preview mode)
}




// #MARK ### Play/pause

VideoControl.prototype.playRateInputChanged = function () {
  let text = $("#playRate").val();
  let a = text.split("/");
  if (a.length == 1) {
    this.playbackRate = Number(text);
  } else if (a.length == 2) {
    this.playbackRate = Number(a[0]) / Number(a[1]);
  } else {
    console.log(
      "playRateInputChanged: ERROR, playRate format not recognized. playRate=",
      text
    );
    return;
  }
  this.video2.setPlaybackRate(this.playbackRate);
};

VideoControl.prototype.playPauseVideo = function (option) {
  if (logging.guiEvents) console.log("playPauseVideo()");
  //let playingState = this.video2.playingState();
  if (this.playingState == "paused" || this.playingState == "playingBackwards") {
    this.playForwards(option);
  } else {
    this.pause();
  }
};
VideoControl.prototype.playPauseVideoBackward = function (option) {
  if (logging.guiEvents) console.log("playPauseVideoBackward()");
  //let playingState = this.video2.playingState();
  if (this.playingState == "paused" || this.playingState == "playingForwards") {
    this.playBackwards(option);
  } else {
    this.pause();
  }
};
VideoControl.prototype.playForwards = function (option) {
  if (logging.frameEvents) console.log("playForwards");

  this.pause();
  this.playingState = "playingForwards"
  if (this.currentMode == "video") {
    if (Number(option) == 2) this.video2.playForwards(1000.0 / 20 / 4);
    else {
      this.video2.playForwards();
    }
  } else {
    // cache
    this.playStart()
  }

  this.updateNavigationView();
  // Any call to refresh is handled by the video2 callback to onFrameChanged
};
VideoControl.prototype.playBackwards = function (option) {
  if (logging.frameEvents) console.log("playBackwards");

  this.pause();
  this.playingState = "playingBackwards"
  if (this.currentMode == "video") {
    //this.video2.stopListen(); // Cut any other play occuring
    if (Number(option) == 2) this.video2.playBackwards(1000.0 / 20 / 4);
    else this.video2.playBackwards();
  } else {
    // cache
    this.playStart()
  }
  this.updateNavigationView();

  // Any call to refresh is now handled by the video2 callback to onFrameChanged
};
VideoControl.prototype.pause = function () {
  // Was playing, pause
  if (logging.frameEvents) console.log("pause");

  this.playingState = "paused"
  this.video2.video.pause();
  this.video2.stopListen();
  this.updateNavigationView();
};

VideoControl.prototype.playStart = function () {
  this.playLastFrame = -1
  this.playFrame = this.currentFrame
  window.requestAnimationFrame((timestamp)=>this.playTick(timestamp));
}
VideoControl.prototype.playTick = function (timestamp) {
  if (this.playingState== 'paused') {
    if (logging.frameEvents) console.log("tick->pause");
    return
  }

  let step = 1
  if (this.playingState== 'playingBackwards') {
    step = -1
  }

  if (this.playLastFrame == -1) {
    this.playLastFrame = this.playFrame
    this.playLastTime = timestamp
    this.playFrame += step
    this.seekFrame(this.playFrame)
    window.requestAnimationFrame((timestamp)=>this.playTick(timestamp));
    return
  }
  //console.log("playTick:",timestamp,this.playLastTime, getVideoInfo().videofps)
  if (timestamp - this.playLastTime < 1000/getVideoInfo().videofps/this.playbackRate) {
    // Wait for frame period
    window.requestAnimationFrame((timestamp)=>this.playTick(timestamp));
    return
  }
  if (this.currentFrame != this.playFrame) {
    // didnt display requested frame yet, need to slow down
    window.requestAnimationFrame((timestamp)=>this.playTick(timestamp));
    return
  }

  this.playLastFrame = this.playFrame
  this.playLastTime = timestamp
  this.playFrame += step
  this.seekFrame(this.playFrame)

  window.requestAnimationFrame((timestamp)=>this.playTick(timestamp));
};

// #MARK # Change current frame
VideoControl.prototype.startSeekTimer = function () {
  this.seekWallTime = new Date().getTime();
  this.seekTiming = true;
};

VideoControl.prototype.seekFrame = function (frame, useFastSeek) {
  if (useFastSeek == "preview") {
    // Legacy ChronoControl call to seek preview frame
    if (this.currentMode != "cache-preview") {  
      this.savedMode = this.currentMode;
      this.savedFrame = this.currentFrame;
      console.log("videoControl.seekFrame: start-preview, saved mode", this.savedMode, " saved frame", this.savedFrame);
      this.currentMode = "cache-preview";
    }
  } else if (useFastSeek == "end-preview") {
    if (this.currentMode == "cache-preview") {
      this.hover.end();
      this.currentMode = this.savedMode;
      if (frame==-1) frame = this.savedFrame;
      console.log("videoControl.seekFrame: end-preview, come back to mode", this.savedMode, 
        " and frame,savedFrame", frame, this.savedFrame);
    } else {
      console.log("videoControl.seekFrame: end-preview, ignore, not in cache-preview mode", this.currentMode);
      return
    }
  } else {
    this.savedFrame = this.currentFrame;
  } 
  if ((frame<0)|(frame>=getVideoInfo().nframes)) {
    console.log("VideoControl.seekFrame: ABORTED, frame out of bounds",frame)
    return;
  }
  this.startSeekTimer();
  
  if (this.currentMode == "cache") {
    this.cacheRequestedFrame = frame;
    //this.currentMode = "cache";
    if (logging.frameEvents)
      console.log("videoControl.seekFrame: CACHE, f=", frame);
    this.videoCache.getFrameImageAsync(this.video.src, frame + getVideoInfo().frameoffset, getVideoInfo().videofps)
      .then((img) => {
        if (this.cacheRequestedFrame !== frame) return // stale answer: a newer frame was requested since
        this.cacheImage = img
        this.cacheFrame = frame
        this.onFrameChangedCache()
      }, (err) => {
        // cancelled: nobody waits for this frame any more
        if (!VideoCache.isCanceled(err)) console.error('videoControl.seekFrame getFrameImageAsync ERROR',err)
      });
  } else if (this.currentMode == "cache-preview") {
    this.cacheRequestedFrame = frame;
    if (logging.frameEvents)
      console.log("videoControl.seekFrame: CACHE PREVIEW, f=", frame);
    this.hover.query(frame); // shows the frame when available, if still hovered then
  } else if (this.currentMode == "preview") {
    this.previewFrame = frame;
    //this.currentMode = "preview";

    // preview keeps 1 keyframe out of 40 frames
    // and is encoded at same speed as original (0.5fps=20fps/40)
    //let t = Math.round((frame+getVideoInfo().frameoffset)/40)*40/20

    // preview keeps 1 keyframe out of 40 frames
    // and is encoded at 20 fps
    //let t = Math.round((frame+getVideoInfo().frameoffset)/40)/20

    let t =
    (frame + getVideoInfo().frameoffset) /
    getVideoInfo().videofps /
    getVideoInfo().preview.previewTimescale;

    if (logging.frameEvents)
      console.log("videoControl.seekFrame: PREVIEW, f=", frame, " t=", t);
    this.previewVideo.currentTime = t;
    // will call onPreviewFrameChanged when seeked
  } else if (this.currentMode == "video") {
    //this.currentMode = "video";
    if (logging.frameEvents)
      console.log("videoControl.seekFrame: VIDEO2, f=", frame);
    this.video2.seekTo({ frame: frame + getVideoInfo().frameoffset });
    // will call onFrameChangedVideo2 when seeked
  }
};
VideoControl.prototype.rewind = function (frames) {
  if (!frames) frames = 1;
  if (this.currentMode == 'video') {
    this.startSeekTimer();
    this.video2.seekBackward(frames);
  } else
    this.seekFrame(this.currentFrame-frames)
};
VideoControl.prototype.forward = function (frames) {
  if (!frames) frames = 1;
  let newframe=this.currentFrame+frames
  if ((newframe<0)|(newframe>=getVideoInfo().nframes)) {
    console.log("VideoControl.forward: ABORTED, frame out of bounds",newframe)
    return;
  }
  if (this.currentMode == 'video') {
    this.startSeekTimer();
    this.video2.seekForward(frames);
  } else
    this.seekFrame(this.currentFrame+frames)
};
VideoControl.prototype.rewind2 = function () {
  this.rewind(getVideoInfo().videofps); // 1s
};
VideoControl.prototype.forward2 = function () {
  this.forward(getVideoInfo().videofps);
};
VideoControl.prototype.rewind3 = function () {
  this.rewind(getVideoInfo().videofps * 10); // 10s
};
VideoControl.prototype.forward3 = function () {
  this.forward(getVideoInfo().videofps * 10);
};
VideoControl.prototype.rewind4 = function () {
  this.rewind(getVideoInfo().videofps * 60); // 1 min
};
VideoControl.prototype.forward4 = function () {
  this.forward(getVideoInfo().videofps * 60);
};

VideoControl.prototype.preloadCache = function (centerFrame) {
  function interval(start, end) {
    return Array.from({length: end-start+1}, (x, i) => start+i);
  }

  if (centerFrame == undefined) centerFrame = this.currentFrame

  let f1 = Math.max(0, centerFrame - this.preloadSpanBefore)
  let f2 = Math.min(getVideoInfo().nframes-1, centerFrame + this.preloadSpanAfter)
  console.log("preloadCache, centerFrame", centerFrame,", interval", f1,f2)

  let frames = interval( centerFrame, f2 )
  this.videoCache.preloadFrames(videoControl.video.src, frames, getVideoInfo().videofps)
  frames = interval( f1, centerFrame-1 )
  this.videoCache.preloadFrames(videoControl.video.src, frames, getVideoInfo().videofps)
};

// # Get current frame/time // FIXME: move logic to specific frameChanged callbacks
VideoControl.prototype.getCurrentVideoFrame = function () {
  if (this.currentMode == "preview")
    return this.previewFrame - getVideoInfo().frameoffset;
  // currentMode == 'video'
  else return this.video2.get() - getVideoInfo().frameoffset;
};
VideoControl.prototype.getCurrentFrame = function () {
  // Modified only by onFrameChanged or onPreviewFrameChanged
  // To try to sync currentFrame with the actual frame shown
  return this.currentFrame;
};
VideoControl.prototype.getCurrentVideoTime = function (format) {
  return this.video2.toMilliseconds() / 1000.0;
};
VideoControl.prototype.getCurrentRealDate = function (format) {
  var D = new Date(getVideoInfo().starttime);
  D = new Date(
    D.getTime() +
    (this.video2.toMilliseconds() * getVideoInfo().videofps) / getVideoInfo().realfps
  );
  return D;
};
VideoControl.prototype.frameToTime = function (frame) {
  var D = new Date(getVideoInfo().starttime);
  var sec = (frame - getVideoInfo().frameoffset) / getVideoInfo().realfps;
  D = new Date(D.getTime() + sec * 1000);
  return D;
};

// #MARK ## View

VideoControl.prototype.updateNavigationView = function () {
  let playingState = this.video2.playingState();
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
    console.log("ERROR: unknown video2.playingState():", playingState);
  }
};

// Event handler
VideoControl.prototype.onFrameTextChanged = function () {
  let frame = Number($("#currentFrame").val());
  this.seekFrame(frame);
};

// This callback is the only one that should handle frame changes. It is called automatically by video2
VideoControl.prototype.onFrameChangedVideo2 = function (event) {
  //console.log("videoControl.onFrameChangedVideo2");
  if (this.currentMode != "video") {
    console.log("onFrameChangedVideo2: DISMISSED event, currentMode=", this.currentMode);
    return;
  }
  this.previewReady = true;
  //this.currentMode = "video";
  this.currentFrame = this.getCurrentVideoFrame();

  if (this.seekTiming) {
    this.seekTiming = false;
    let elapsed = (new Date().getTime() - this.seekWallTime) / 1000.0;
    if (logging.frameEvents)
      console.log(
        "Seek frame " + this.currentFrame + ": elapsed=" + elapsed + " s"
      );
  }

  if (logging.frameEvents) console.log("videoControl.onFrameChangedVideo2", this.currentFrame);

  if (!this.isValidVideo) {
    console.log("videoControl.onFrameChangedVideo2 ABORT, no valid video");
    return
  }

  this.onFrameChanged()
}

VideoControl.prototype.onPreviewFrameChanged = function (event) {
  console.log("videoControl.onPreviewFrameChanged");
  if (this.currentMode != "preview") {
    console.log("onPreviewFrameChanged: DISMISSED event, currentMode=", this.currentMode);
    return;
  }
  if (!this.previewReady) {
    console.log("onPreviewFrameChanged: not ready, skip");
    return;
  }

  //this.currentMode = "preview";
  this.currentFrame = this.getCurrentVideoFrame(); // FIXME: handling not consistent between preview and video

  if (logging.frameEvents) console.log("previewFrameChanged", this.currentFrame);

  this.onFrameChanged()
};

VideoControl.prototype.onFrameChangedCache = function (event) {
  console.log("videoControl.onFrameChangedCache");
  if (this.currentMode != "cache") {
    console.log("onFrameChangedCache: DISMISSED event, currentMode=", this.currentMode);
    return;
  }

  //this.currentMode = "cache";
  this.currentFrame = this.cacheFrame;
  this.currentImage = this.cacheImage;

  if (logging.frameEvents) console.log("cache frameChanged", this.currentFrame);

  this.onFrameChanged()
};

VideoControl.prototype.onFrameChangedCachePreview = function (event) {
  console.log("videoControl.onFrameChangedCachePreview");
  if (this.currentMode != "cache-preview") {
    console.log("onFrameChangedCachePreview: DISMISSED event, currentMode=", this.currentMode);
    return;
  }

  //this.currentMode = "cache";
  this.currentFrame = this.cacheFrame;
  this.currentImage = this.cacheImage;

  if (logging.frameEvents) console.log("cache preview frameChanged", this.currentFrame);

  this.onFrameChanged()
};

// Final callback when frame changed
// Mode specific frame changed callbacks should call it
// after making sure currentMode and currentFrame are updated
VideoControl.prototype.onFrameChanged = function (event) {
  if (logging.frameEvents) console.log("frameChanged", this.currentFrame);

  if (this.removeHashOnFrameChange) {
    if ((this.delayedSeekFrame == undefined) & (this.currentFrame != this.removeHashOnFrameChangeFrame)) {
      const parsedHash = new URLSearchParams(
        location.hash.substring(1) // foo=bar&baz=qux&val=val+has+spaces
      );
      if (parsedHash.has('frame')) {
        this.removeHashOnFrameChange = false
        // Avoid infinite feedback loop by not listening to hash changes
        removeEventListener("hashchange", onhashchange);
        console.log('videoControl.onFrameChanged: remove hash #frame=xxx due to frame change')
        parsedHash.delete("frame")
        lasthash = String(parsedHash) // Save to check manually when hash really changed
        location.hash = parsedHash
        addEventListener("hashchange", onhashchange);
      }
    }
  }

  // The frame is the controller's to change, not a view's: the selection keeps its id and takes the observation of that id here
  selection.changeFrame(this.currentFrame);
  this.hardRefresh();

  // Trigger public event
  // listened by:
  // - ChronoControl to change trackWindow View and timeMark View
  // - OverlayControl to redraw overlay
  // (Update: videoControl.hardRefresh calls overlay.hardRefresh directly. Synchronicyt issue?)
  $(this).trigger('frame:changed')
}

VideoControl.prototype.updateVideoControlForm = function () {
  function toLocaleISOString(date) {
    // Polyfill to get local ISO instead of UTC http://stackoverflow.com/questions/14941615/how-to-convert-isostring-to-local-isostring-in-javascript
    function pad(n) {
      return ("0" + n).substr(-2);
    }

    var day = [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-"),
      time = [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map(pad)
        .join(":");
    if (date.getMilliseconds()) time += "." + date.getMilliseconds();
    var o = date.getTimezoneOffset();
    var h = Math.floor(Math.abs(o) / 60);
    var m = Math.abs(o) % 60;
    o = o === 0 ? "Z" : (o < 0 ? "+" : "-") + pad(h) + ":" + pad(m);
    return day + "T" + time; //+o;
  }

  if (this.currentMode == 'preview') {
    $('#currentFrame').val('' + this.currentFrame)
    $('.currentFrameDiv').text('Frame: ' + this.currentFrame + ' [P]')
  } else {
    $('#currentFrame').val('' + this.currentFrame)
    //$('.currentFrameDiv').text('Frame: ' + this.currentFrame)
    $('.currentFrameDiv').html(`<a href="#video_id=${videoManager.currentVideoID}&frame=${this.currentFrame}" target="_blank">Frame: ${this.currentFrame}</a>`) // Add link to current frame in Labelbee
  }
  $("#vidTime").html(
    "Video Time: " + this.video2.toHMSm(this.getCurrentVideoTime())
  );
  $("#realTime").html(
    "Real Time: " + toLocaleISOString(this.getCurrentRealDate())
  );

  printMessage("");
};

VideoControl.prototype.hardRefresh = function () {
  // Hard refresh when video or frame changed

  if (logging.frameEvents) console.log("hardRefresh", this.currentFrame);

  this.refresh();
};
VideoControl.prototype.refresh = function () {
  // Refresh when frame changed

  if (logging.frameEvents)
    console.log("videoControl.refresh", this.currentFrame);

  this.updateVideoControlForm();

  overlay.hardRefresh();

  // Zoom Overlay supposed to be updated by triggers from overlay refresh
  // zoomOverlay.refreshZoom()
};

// #MARK ## Loading

// WARNING: DEPRECATED. Use loadVideo2 instead
VideoControl.prototype.loadVideo = function (url, previewURL) {
  if (logging.videoEvents) console.log("loadVideo: url=", url);

  this.name = url;
  this.video.src = url;
  getVideoInfo().videoURL = url;
  // Update of display handled in callback onVideoLoaded

  let tmp = url.split("/");
  getVideoInfo().videoName = tmp[tmp.length - 1].split(".")[0];

  //     if (previewURL) {
  //         this.previewURL = previewURL;
  //     } else {
  //         previewURL = url+'.scale4.mp4'
  //         this.previewURL = previewURL;
  //     }
  //     $("#previewVideoName").val(this.previewURL)

  this.setPreviewVideoStatus("undefined");

  statusWidget.statusRequest("videoLoad", []);
};
VideoControl.prototype.onVideoLoaded = function (event) {
  console.log('OBSOLETE FUNCTION CALL WARNING: VideoControl.onVideoLoaded', event)

  if (logging.videoEvents) console.log("onVideoLoaded", event);

  console.log("onVideoLoaded: VIDEO loaded ", this.video.src);
  fromServerDialog.closeDialog();
  statusWidget.statusUpdate("videoLoad", true, []);

  this.isValidVideo = true;

  this.onVideoSizeChanged();

  getVideoInfo().duration = this.video.duration;
  getVideoInfo().name = this.video.src;

  let name = getVideoInfo().name;
  $("#videoName").html(name);

  $("a.videolink").attr("href", getVideoInfo().videoPath);

  let videourl = getVideoInfo().videoURL;

  this.loadVideoInfo(videourl + ".info.json");
  this.loadPreviewVideo();

  $(this).trigger("video:loaded");

  this.hardRefresh();

  statusWidget.statusRequest("tagsLoad", []);
  tagsFromServer(getVideoInfo().tags.videoTagURL, true); // quiet
};
VideoControl.prototype.onVideoError = function (event) {
  let rawsrc = this.video.getAttribute('src')
  if (rawsrc == "") { // Not yet initialized
    console.log("onVideoError: rawsrc==''");
    //statusWidget.statusUpdate("videoLoad", false, []);
    this.isValidVideo = false;

  } else {
    console.log("onVideoError: could not load ", this.video.src);
    fromServerDialog.setMessage("red", "onVideoError: could not load \n" + this.video.src);
    statusWidget.statusUpdate("videoLoad", false, []);
    this.isValidVideo = false;
    
    this.onVideoSizeChanged();
    this.hardRefresh();
  }

};

VideoControl.prototype.setPreviewVideoStatus = function (status) {
  $("#previewVideoStatus").removeClass(
    "undefined loading loaded infoloaded error"
  );
  switch (status) {
    case "undefined":
      $("#previewVideoStatus").html("?");
      $("#previewVideoStatus").addClass("undefined");
      $("#previewVideoStatus").prop("title", "undefined");
      break;
    case "loading":
      $("#previewVideoStatus").html("&mapstodown;");
      $("#previewVideoStatus").addClass("loading");
      $("#previewVideoStatus").prop("title", "Loading preview video");
      break;
    case "loaded":
      $("#previewVideoStatus").html("&#10004;");
      $("#previewVideoStatus").addClass("loaded");
      $("#previewVideoStatus").prop(
        "title",
        "Preview video loaded successfully"
      );
      break;
    case "error":
      $("#previewVideoStatus").html("&#10006;");
      $("#previewVideoStatus").addClass("error");
      $("#previewVideoStatus").prop("title", "Error loading preview video");
      break;
    case "infoloaded":
      $("#previewVideoStatus").html("&#10004;&#10004;");
      $("#previewVideoStatus").addClass("infoloaded");
      $("#previewVideoStatus").prop("title", "Preview video loaded with info");
      break;
  }
};
VideoControl.prototype.loadPreviewVideo = function (previewURL) {
  let videoControl = this;

  if (!previewURL) {
    previewURL = getVideoInfo().videoURL + ".scale4.mp4";
  }
  getVideoInfo().preview.previewURL = previewURL;
  $("#previewVideoName").val(previewURL);

  statusWidget.statusRequest("videopreviewLoad", []);

  this.previewReady = false;

  function _onPreviewVideoLoaded(event) {
    if (logging.videoEvents) console.log("onPreviewVideoLoaded", event);

    console.log(
      "onPreviewVideoLoaded: PREVIEW available. Use CTRL+mousemove in the chronogram. url=",
      event.target.src
    );

    videoControl.setPreviewVideoStatus("loaded");
    statusWidget.statusUpdate("videopreviewLoad", true, []);

    let infourl = getVideoInfo().preview.previewURL + ".info.json";
    videoControl.loadPreviewVideoInfo(infourl);
  }
  function _onPreviewVideoError(e) {
    //if (logging.videoEvents)
    console.log("onPreviewVideoError: could not load preview video.", {
      previewURL: previewURL,
    });
    videoControl.setPreviewVideoStatus("error");
    statusWidget.statusUpdate("videopreviewLoad", false, []);
  }
  videoControl.setPreviewVideoStatus("loading");
  videoControl.previewVideo.onerror = _onPreviewVideoError;
  videoControl.previewVideo.onloadeddata = _onPreviewVideoLoaded;

  videoControl.previewVideo.src = previewURL;
  if (logging.videoEvents)
    console.log("loadPreviewVideo: previewURL=", previewURL);
};
VideoControl.prototype.changePreviewVideoName = function (event) {
  //console.log(event)
  let previewVideoURL = $("#previewVideoName").val();
  this.loadPreviewVideo(previewVideoURL);
};
// update from form
VideoControl.prototype.changePreviewVideoInfo = function (event) {
  //console.log(event)
  getVideoInfo().preview.previewTimescale = Number(
    $("#previewVideoTimeScale").val()
  );
};
// load from file
VideoControl.prototype.loadPreviewVideoInfo = function (infoURL) {
  let videoControl = this;

  if (!infoURL) {
    infoURL = getVideoInfo().preview.previewURL + ".info.json";
  }
  getVideoInfo().preview.previewInfoURL = infoURL;

  let _onVideoInfoLoaded = function (data) {
    if (logging.videoEvents) console.log("PREVIEW loadVideoInfo loaded");
    console.log("PREVIEW videojsoninfo = ", data);
    const videojsoninfo = data;

    if ($.isNumeric(videojsoninfo.timescale)) {
      getVideoInfo().preview.previewTimescale = Number(videojsoninfo.timescale);
      $("#previewVideoTimeScale").val(getVideoInfo().preview.previewTimescale);
    }
  };
  let _onVideoInfoError = function (jqXHR, textStatus, errorThrown) {
    console.log(
      "PREVIEW loadVideoInfo: could not load ",
      infoURL,
      "\nerror='",
      textStatus,
      "', details='",
      errorThrown,
      "'\n  videoInfo unchanged"
    );
    statusWidget.statusUpdate("previewVideoInfoLoad", false, []);
  };
  let _onVideoInfoChanged = function () {
    //videoControl.onPreviewVideoInfoChanged()
  };

  statusWidget.statusRequest("previewVideoInfoLoad", []);
  var jqxhr = $.getJSON(infoURL, _onVideoInfoLoaded)
    .fail(_onVideoInfoError)
    .complete(_onVideoInfoChanged);
  // Update of videoInfo handled in callback onVideoInfoChanged
};

VideoControl.prototype.onVideoSizeChanged = function () {
  /* Video size */

  var w, h;
  if (this.isValidVideo) {
    w = this.video.videoWidth;
    h = this.video.videoHeight;
  } else {
    w = 600;
    h = 400;
  }

  if (logging.videoEvents) {
    console.log("videoSizeChanged: w=", w, " h=", h);
  }

  //$( this ).trigger('videosize:changed', w,h)
  overlay.canvasSetVideoSize(w, h);
};
VideoControl.prototype.videoSize = function () {
  if (this.isValidVideo) {
    return {
      left: 0,
      top: 0,
      right: this.video.videoWidth,
      bottom: this.video.videoHeight,
    };
  } else {
    return { left: 0, top: 0, right: 600, bottom: 400 };
  }
};

VideoControl.prototype.loadVideoInfo = function (infourl) {
  let videoControl = this;

  let _onVideoInfoLoaded = function (data) {
    if (logging.videoEvents) console.log("loadVideoInfo loaded");
    console.log("videojsoninfo = ", data);
    const videojsoninfo = data;

    if ($.isNumeric(videojsoninfo.videofps)) {
      getVideoInfo().videofps = Number(videojsoninfo.videofps);
      videoControl.video2.frameRate = getVideoInfo().videofps;
    }
    if ($.isNumeric(videojsoninfo.realfps)) {
      getVideoInfo().realfps = Number(videojsoninfo.realfps);
    }
    if (
      videojsoninfo.starttime instanceof Date &&
      !isNaN(videojsoninfo.starttime.valueOf())
    ) {
      getVideoInfo().starttime = videojsoninfo.starttime;
    }
    if (typeof videojsoninfo.tagsfamily !== "undefined") {
      getVideoInfo().tagsfamily = videojsoninfo.tagsfamily;
    }
    if (typeof videojsoninfo.place !== "undefined") {
      getVideoInfo().place = videojsoninfo.place;
    }
    if (typeof videojsoninfo.comments !== "undefined") {
      getVideoInfo().comments = videojsoninfo.comments;
    }
    statusWidget.statusUpdate("videoinfoLoad", true, []);
    //'starttime': '2016-07-15T09:59:59.360',
    //'duration': 1/20, // Duration in seconds
    //'nframes': 1
  };
  let _onVideoInfoError = function (jqXHR, textStatus, errorThrown) {
    console.log(
      "loadVideoInfo: could not load ",
      infourl,
      "\nerror='",
      textStatus,
      "', details='",
      errorThrown,
      "'\n  videoInfo unchanged"
    );
    statusWidget.statusUpdate("videoinfoLoad", false, []);
  };
  let _onVideoInfoChanged = function () {
    videoControl.onVideoInfoChanged();
  };

  statusWidget.statusRequest("videoinfoLoad", []);
  var jqxhr = $.getJSON(infourl, _onVideoInfoLoaded)
    .fail(_onVideoInfoError)
    .complete(_onVideoInfoChanged);
  // Update of videoInfo handled in callback onVideoInfoChanged
};
VideoControl.prototype.onVideoInfoChanged = function () {
  if (logging.videoEvents) console.log("onVideoInfoChanged");

  getVideoInfo().nframes = Math.floor(getVideoInfo().duration * getVideoInfo().videofps);
  this.video2.frameRate = getVideoInfo().videofps;

  videoManager.updateVideoInfoForm();

  updateChronoXDomainFromVideo(); // Should trigger chrono refresh
  //refreshChronogram()
};

VideoControl.prototype.maxframe = function () {
  return Math.floor(getVideoInfo().duration * getVideoInfo().videofps);
};

const timeout = (promise, time, name) =>
	Promise.race([promise, new Promise((_r, rej) => setTimeout(()=>{rej(new DOMException("TIMEOUT "+name, "TimeoutError"))}, time))]);


VideoControl.prototype.loadVideo2 = function (videoURL, callback) {
  if (logging.videoEvents) console.log("loadVideo2: url=", videoURL);
  this.flagLoadingVideo = true
  
  let P = new Promise((resolve, reject)=>{
      this.video.addEventListener('loadeddata', ()=>{console.log("loadVideo2: RESOLVED loadeddata videoURL=",videoURL); resolve()}, {once: true});
      this.video.addEventListener('error', (error)=>{console.log("loadVideo2: REJECTED loadeddata videoURL=",videoURL); reject(error)}, {once: true});
      this.video.src = videoURL;
  })

  return timeout(P, 10000,"loadVideo2 promise url="+videoURL)
}

VideoControl.prototype.onVideoLoaded2 = async function () {
  console.log("onVideoLoaded2: VIDEO loaded ", this.video.src);
  fromServerDialog.closeDialog()

  this.setPreviewVideoStatus("undefined");
  statusWidget.statusRequest("videoLoad", []);
  statusWidget.statusUpdate("videoLoad", true, []);
  
  videoControl.video2.frameRate = getVideoInfo().videofps
  this.isValidVideo = true;
  this.onVideoSizeChanged();
  
  let name = getVideoInfo().name;
  $("#videoName").html(name);
  $("a.videolink").attr("href", getVideoInfo().videoPath);
  $("a.videoinfolink").attr("href", url_for("/videodata?videoid="+videoManager.currentVideoID) );
  // this.loadPreviewVideo();
  
  this.flagLoadingVideo = false
  console.log("onVideoLoaded2: trying to refresh, time=", this.video.currentTime);

  //this.hardRefresh();
  //this.hardRefresh();
  
  // HACKY SOLUTION
  // Video image was blank after loading a video
  // Using these two function calls to force display 
  // of first frame
  //videoControl.forward(1);
  //setTimeout(() => { videoControl.rewind(0); }, 1500);

  if (this.delayedSeekFrame != undefined) {
    console.log("onVideoLoaded2 delayedSeekFrame",this.delayedSeekFrame)
    const frame = this.delayedSeekFrame // read before clearing: the timer used to read the cleared value
    this.delayedSeekFrame = undefined
    setTimeout(() => { videoControl.seekFrame(frame); }, 500);
  } else {
    console.log("onVideoLoaded2 delayedSeekFrame undefined")
    setTimeout(() => { videoControl.hardRefresh(); }, 500);
  }

  $(this).trigger("video:loaded");

  // Make initial video size larger when loading a video
  //$("#canvasresize")[0].style.height = "650px";
  //overlay.refreshCanvasSize();
}

VideoControl.prototype.delayedSeek = function (frame) {
  console.log("delayedSeek frame=",frame)
  if (this.flagLoadingVideo) {
    console.log("delayedSeek setting for onload event")
    this.delayedSeekFrame = frame
  } else {
    console.log("delayedSeek seeking immediatly")
    this.seekFrame(frame)
  }
}

// Entry points of the refresh (ADR 0009 step 0): logged by `refreshLog`
VideoControl.prototype.refresh = instrument("overlay", "VideoControl.refresh", VideoControl.prototype.refresh);
VideoControl.prototype.onFrameChanged = instrument("frame", "VideoControl.onFrameChanged", VideoControl.prototype.onFrameChanged);
