/*jshint esversion: 6, asi: true */

// ## VideoControl
// Video Control: frame/time conversion, seek

//import {VideoFrame} from "extern/VideoFrame.js";
//var LRUCache = require("extern/lru_cache-master/index").LRUCache


function VideoControl(videoTagId) {
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
    frameRate: videoinfo.videofps,
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

  // FIXME: define videoCache as global
  videoCache = new VideoCache(this);
  this.videoCache = videoCache; // make it available from videoControl also
}



/**
  * VideoCache provides random access to individual frames in a video
  * @constructor 
*/
function VideoCache(videoControl, videoCacheTagId) {
  let videoCache = this;
  videoCache.opts = {
    videoCacheSize: 1000
  }
  this.queryQueue = []
  this.abortFlag = false
  this.preloading = false
  this.video = document.createElement('video');
  $(this.video).addClass('videoCache')
  //this.video.addEventListener('timeupdate', 
  //      function() {videoCache.onFrameChanged()}, false);
  this.videoControl = videoControl
  this.lrucache = new LRUCache(Number(videoCache.opts.videoCacheSize))
  this.canvas = document.createElement('canvas'); // Precreated canvas
  this.ctx = this.canvas.getContext('2d');
}
VideoCache.prototype = {} // Prepare for all methods

// GUI method
VideoCache.prototype.onVideoCacheParamsChanged = function (event) {
  // Read from GUI
  let cacheSize = $('#videoCacheSize').val()
  this.setCacheSize(cacheSize)

  // Update GUI
  $('#videoCacheSize').val(String(this.opts.videoCacheSize))
}

// Model methods
VideoCache.prototype.setCacheSize = function (size) {
  let psize = parseInt(size)
  if (Number.isNaN(psize)) {
    console.log('VideoCache: invalid size ', size, ' parsed as', psize)
    return
  }
  console.log('VideoCache: new size ', psize)
  this.opts.videoCacheSize = psize
  this.lrucache.setLimit(psize)
}
VideoCache.prototype.loadVideo = function (url) {
  this.isValidVideo = false;
  this.name = url;
  this.video.src = url;
  // Update of display handled in callback onVideoLoaded
}
VideoCache.prototype.onVideoLoaded = function (event) {
  if (logging.videoEvents)
    console.log('VideoCache.onVideoLoaded', event)

  console.log('VideoCache.onVideoLoaded: VIDEO loaded ', this.video.src)
  this.isValidVideo = true;
  $(this).trigger('video:loaded')
}
VideoCache.prototype.preloadFrames = async function (videoUrl, frames, fps) {
  let images = []
  if (this.abortFlag) {
    console.log('VideoCache.preloadFrames: abortFlag==true. ABORTED')
    return
  }
  //if (this.preloading) {
  //    console.log('VideoCache.preloadFrames: preloading==true. ABORTED')
  //    return
  //}
  console.log('Preloading ', frames)
  if (frames.length > this.opts.videoCacheSize / 2) {
    console.log('VideoCache.preloadFrames: frames.length > this.opts.videoCacheSize. ABORTED')
    return
  }
  //this.preloading = true
  for (let frame of frames) {
    if (frame < 0) continue
    //let img = await this.getFrameImage(videoUrl, frame, fps)
    console.log('Queueing frame ', frame)
    this.enqueueFrame(videoUrl, frame, fps)
  }
  await this.processQueue()
  console.log('Preload DONE')
  //this.preloading = false
}
VideoCache.prototype.cancelQueue = function () {
  for (query of this.queryQueue) {
    let videoUrl = query.videoUrl
    let frame = query.frame
    let state = this.getFrameState(videoUrl, frame)
    if (state != "inqueue") continue;
    this.removeFrame(videoUrl, frame)
    //query.deferred.reject()
  }
  this.queryQueue = []
  this.processingQueue = false
  this.updateStatus()
}
VideoCache.prototype.resetCache = function () {
  this.cancelQueue()
  this.lrucache.removeAll()
  this.updateStatus()
}

VideoCache.prototype.updateStatus = function () {
  let queueSize = this.queryQueue.length
  let cacheUsed = this.lrucache.size
  let cacheSize = this.opts.videoCacheSize
  let status = $('#cache-status').html(`${cacheUsed}/${cacheSize},Q${queueSize}`)
}

// Only two functions supposed to interact with lrucache
VideoCache.prototype.getFrameImageSync = function (videoUrl, frame) {
  let key = videoUrl + ':' + frame

  let item = this.lrucache.get(key)
  if (item && item.state == 'incache') {
    console.log('VideoCache: found in cache: ' + key)
    return item.image
  }
  console.log('VideoCache: not found in cache: ' + key)
  return undefined
}
VideoCache.prototype.getFrameState = function (videoUrl, frame) {
  let key = videoUrl + ':' + frame

  let item = this.lrucache.get(key)
  if (!item) return undefined
  return item.state
}
VideoCache.prototype.setFrameState = function (videoUrl, frame, state, image, promise) {
  let key = videoUrl + ':' + frame

  let item = { 'state': state, 'image': image, 'promise': promise }
  this.lrucache.set(key, item)
}
VideoCache.prototype.removeFrame = function (videoUrl, frame) {
  let key = videoUrl + ':' + frame
  this.lrucache.remove(key)
}
VideoCache.prototype.enqueueFrame = async function (videoUrl, frame, fps) {
  let key = videoUrl + ':' + frame

  let state = this.getFrameState(videoUrl, frame)
  let item = this.lrucache.get(key)
  if (state == 'incache') {
    console.log('videoCache.enqueueFrame: incache ', key)
    return item.promise
  }
  if (state == 'inqueue') {
    console.log('videoCache.enqueueFrame: inqueue ', key)
    return item.promise
  }
  console.log('videoCache.enqueueFrame: Pushing ', key)
  let D = $.Deferred()
  this.setFrameState(videoUrl, frame, 'inqueue', undefined, D.promise())

  this.queryQueue.push({ videoUrl: videoUrl, frame: frame, fps: fps, key:key, deferred: D })
  this.updateStatus()
  return D.promise()
}
VideoCache.prototype.getFrameImageAsync = async function (videoUrl, frame, fps) {
  let promise = this.enqueueFrame(videoUrl, frame, fps)
  this.processQueue()
  return promise
}
VideoCache.prototype.processQueue = async function (force) {
  this.updateStatus()
  if (this.queryQueue.length == 0) {
    console.log('VideoCache.processQueue: empty queue. ABORTED')
    return
  }
  // Force singleton processing
  if (this.processingQueue && (!force)) {
    console.log('VideoCache.processQueue: already processing. ABORTED')
    return
  }
  this.processingQueue = true

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  try {
    console.log('VideoCache.processQueue: start processing...')
    while (this.queryQueue.length > 0) {
      if (this.abortFlag) {
        console.log('VideoCache.processQueue: abortFlag==true. ABORTED')
        return
      }
      let query = this.queryQueue[0]
      let key = query.key
      console.log('VideoCache.processQueue: processing',key,query)
      let image = await this.getImageForce(query.videoUrl, query.frame, query.fps)
      let item = { 'state': 'incache', 'image': image, 'promise': query.deferred.promise() }
      this.lrucache.set(key, item)
      console.log('videoCache.processQueue: resolve ', key)
      query.deferred.resolve(image)
      this.queryQueue.shift()

      this.updateStatus()
      console.log('Sleeping...')
      //await 
      sleep(20)
    }
  } finally {
    this.processingQueue = false
  }

}
VideoCache.prototype.getImageForce = async function (videoUrl, frame, fps) {
  let base64ImageData = await this.getFrameDataURLForce(videoUrl, frame, fps)

  let image = new Image();
  if (base64ImageData)
    image.src = base64ImageData;
  else
    image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='
  await image.decode();

  return image
}
VideoCache.prototype.getFrameDataURLForce = async function (videoUrl, frame, fps) {
  let frameCallback = function (now, metadata) {
    // Draw as soon as possible
    //context.drawImage(this.video, 0, 0, w, h);
    //console.log('frameCallback', metadata)
    console.log('frameCallback: queried = ', frame, ' received = ', metadata.mediaTime * fps)
  }
  await this.seekWithCallback(videoUrl, frame, fps, frameCallback)
  //let vid = await this.seekToFrame(videoUrl, frame, fps)

  let canvas = this.canvas
  let context = this.ctx
  let [w, h] = [this.video.videoWidth, this.video.videoHeight]
  if ((w != canvas.width) || (h != canvas.height)) {
    canvas.width = w;
    canvas.height = h;
  }

  context.drawImage(this.video, 0, 0, w, h);

  let base64ImageData = canvas.toDataURL('image/jpeg');

  console.log('frameCallback: encoded in base64, len=', base64ImageData.length, base64ImageData.length < 30 ? base64ImageData : 'xxx')
  return base64ImageData
}
VideoCache.prototype.seekToFrame = async function (videoUrl, frame, fps) {
  return new Promise(async (resolve) => {

    // fully download it first (no buffering):
    //let videoBlob = await fetch(videoUrl).then(r => r.blob());
    //let videoObjectUrl = URL.createObjectURL(videoBlob);
    let video = this.video

    let seekResolve;
    video.addEventListener('seeked', async function () {
      if (seekResolve) seekResolve();
    });

    if (video.currentSrc != videoUrl)
      video.src = videoUrl;

    // workaround chromium metadata bug (https://stackoverflow.com/q/38062864/993683)
    while ((video.duration === Infinity || isNaN(video.duration)) && video.readyState < 2) {
      console.log('videoCache.seekToFrame: duration workaround')
      await new Promise(r => setTimeout(r, 1000));
      video.currentTime = 10000000 * Math.random();
    }
    let duration = video.duration;

    let frames = [];
    let interval = 1 / fps;
    let currentTime = frame / fps + 0.00001;

    if (Math.abs(video.currentTime-currentTime)<0.00005) {
      console.log('videoCache.seekToFrame: already at currentTime. RESOLVE',currentTime)
      resolve(video);
    } else {
      video.currentTime = currentTime;
      await new Promise(r => seekResolve = r);
      resolve(video);
    }
  });
}
VideoCache.prototype.seekWithCallback = async function (videoUrl, frame, fps, frameCallback) {
  return new Promise(async (resolve, reject) => {

    // fully download it first (no buffering):
    //let videoBlob = await fetch(videoUrl).then(r => r.blob());
    //let videoObjectUrl = URL.createObjectURL(videoBlob);
    let video = this.video

    let seekResolve;
    let seeked = async function (now, metadata) {
      //console.log('seeked mediaTime*fps=',metadata.mediaTime*fps)
      frameCallback(now, metadata)
      if (seekResolve) seekResolve();
    }
    let cbHandle = video.requestVideoFrameCallback(seeked);

    if (video.currentSrc != videoUrl)
      video.src = videoUrl;

    // workaround chromium metadata bug (https://stackoverflow.com/q/38062864/993683)
    //while 
    if ((video.duration === Infinity || isNaN(video.duration)) && video.readyState < 2) {
      console.log('videoCache.seekWithCallback: duration workaround')
      await new Promise(r => setTimeout(r, 1000));
      video.currentTime = 10000000 * Math.random();
    }
    // Just reject instead of trying too hard
    if ((video.duration === Infinity || isNaN(video.duration)) && video.readyState < 2) {
      console.log('videoCache.seekWithCallback: duration workaround ABORTED')
      video.cancelVideoFrameCallback(cbHandle)
      reject()
      return
    }
    let duration = video.duration;

    let frames = [];
    let interval = 1 / fps;
    let currentTime = frame / fps + 0.00001;

    if (Math.abs(video.currentTime-currentTime)<0.00005) {
      console.log('videoCache.seekToFrame: already at currentTime. RESOLVE',currentTime)
      resolve(video);
    } else {
      video.currentTime = currentTime;
      await new Promise(r => seekResolve = r);
      resolve(video);
    }
  });
}
VideoCache.prototype.getFrameCropDataURL = async function (videoUrl, frame, fps, crop) {
  if (this.abortFlag) {
    console.log('VideoCache.preloadFrames: abortFlag==true. ABORTED')
    return
  }
  let key = videoUrl + ':' + frame

  let image = await this.getFrameImageAsync(videoUrl, frame, fps)
  //console.log('videoCache.getFrameCropDataURL: got image ', image)
  if (!image) return undefined

  let canvas = document.createElement('canvas');
  let context = canvas.getContext('2d');
  let [w, h] = [crop.w, crop.h]
  if ((w != canvas.width) || (h != canvas.height)) {
    canvas.width = w;
    canvas.height = h;
  }

  context.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  let base64ImageData = canvas.toDataURL('image/jpeg');

  return base64ImageData
}
/* END VIDEOCACHE */

VideoControl.prototype = {}; // Prepare for all VideoControl methods

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
  //console.log("playTick:",timestamp,this.playLastTime, videoinfo.videofps)
  if (timestamp - this.playLastTime < 1000/videoinfo.videofps/this.playbackRate) {
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
  if ((frame<0)|(frame>=videoinfo.nframes)) {
    console.log("VideoControl.seekFrame: ABORTED, frame out of bounds",frame)
    return;
  }
  this.startSeekTimer();
  
  if (this.currentMode == "cache") {
    this.cacheRequestedFrame = frame;
    //this.currentMode = "cache";
    if (logging.frameEvents)
      console.log("videoControl.seekFrame: CACHE, f=", frame);
    this.videoCache.getFrameImageAsync(this.video.src, frame + videoinfo.frameoffset, videoinfo.videofps)
      .catch((err) => { console.error('videoControl.seekFrame getFrameImageAsync ERROR',err); })
      .then((img) => {
        this.cacheImage = img
        this.cacheFrame = frame
        this.onFrameChangedCache()
      }
      );
  } else if (this.currentMode == "cache-preview") {
    this.cacheRequestedFrame = frame;
    //this.currentMode = "cache";
    if (logging.frameEvents)
      console.log("videoControl.seekFrame: CACHE PREVIEW, f=", frame);
    this.videoCache.enqueueFrame(this.video.src, frame + videoinfo.frameoffset, videoinfo.videofps)
    this.videoCache.processQueue()
    let img = this.videoCache.getFrameImageSync(this.video.src, frame + videoinfo.frameoffset)
    if (img) {
      this.cacheImage = img
      this.cacheFrame = frame
      this.onFrameChangedCachePreview()
    } else {
      if (logging.frameEvents)
        console.log("videoControl.seekFrame: CACHE PREVIEW, invalid image", img);
    }
  } else if (this.currentMode == "preview") {
    this.previewFrame = frame;
    //this.currentMode = "preview";

    // preview keeps 1 keyframe out of 40 frames
    // and is encoded at same speed as original (0.5fps=20fps/40)
    //let t = Math.round((frame+videoinfo.frameoffset)/40)*40/20

    // preview keeps 1 keyframe out of 40 frames
    // and is encoded at 20 fps
    //let t = Math.round((frame+videoinfo.frameoffset)/40)/20

    let t =
    (frame + videoinfo.frameoffset) /
    videoinfo.videofps /
    videoinfo.preview.previewTimescale;

    if (logging.frameEvents)
      console.log("videoControl.seekFrame: PREVIEW, f=", frame, " t=", t);
    this.previewVideo.currentTime = t;
    // will call onPreviewFrameChanged when seeked
  } else if (this.currentMode == "video") {
    //this.currentMode = "video";
    if (logging.frameEvents)
      console.log("videoControl.seekFrame: VIDEO2, f=", frame);
    this.video2.seekTo({ frame: frame + videoinfo.frameoffset });
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
  if ((newframe<0)|(newframe>=videoinfo.nframes)) {
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
  this.rewind(videoinfo.videofps);
};
VideoControl.prototype.forward2 = function () {
  this.forward(videoinfo.videofps);
};
VideoControl.prototype.rewind3 = function () {
  this.rewind(videoinfo.videofps * 10); // 10s
};
VideoControl.prototype.forward3 = function () {
  this.forward(videoinfo.videofps * 10);
};
VideoControl.prototype.rewind4 = function () {
  this.rewind(videoinfo.videofps * 60); // 1 min
};
VideoControl.prototype.forward4 = function () {
  this.forward(videoinfo.videofps * 60);
};

VideoControl.prototype.preloadCache = function (centerFrame) {
  function interval(start, end) {
    return Array.from({length: end-start+1}, (x, i) => start+i);
  }

  if (centerFrame == undefined) centerFrame = this.currentFrame

  let f1 = Math.max(0, centerFrame - this.preloadSpanBefore)
  let f2 = Math.min(videoinfo.nframes-1, centerFrame + this.preloadSpanAfter)
  console.log("preloadCache, centerFrame", centerFrame,", interval", f1,f2)

  let frames = interval( centerFrame, f2 )
  this.videoCache.preloadFrames(videoControl.video.src, frames, videoinfo.videofps)
  frames = interval( f1, centerFrame-1 )
  this.videoCache.preloadFrames(videoControl.video.src, frames, videoinfo.videofps)
};

// # Get current frame/time // FIXME: move logic to specific frameChanged callbacks
VideoControl.prototype.getCurrentVideoFrame = function () {
  if (this.currentMode == "preview")
    return this.previewFrame - videoinfo.frameoffset;
  // currentMode == 'video'
  else return this.video2.get() - videoinfo.frameoffset;
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
  var D = new Date(videoinfo.starttime);
  D = new Date(
    D.getTime() +
    (this.video2.toMilliseconds() * videoinfo.videofps) / videoinfo.realfps
  );
  return D;
};
VideoControl.prototype.frameToTime = function (frame) {
  var D = new Date(videoinfo.starttime);
  var sec = (frame - videoinfo.frameoffset) / videoinfo.realfps;
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

  if (logging.frameEvents) console.log("video2 frameChanged", this.currentFrame);

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
    $('.currentFrameDiv').text('Frame: ' + this.currentFrame)
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

VideoControl.prototype.loadVideo = function (url, previewURL) {
  if (logging.videoEvents) console.log("loadVideo: url=", url);

  this.name = url;
  this.video.src = url;
  videoinfo.videoURL = url;
  // Update of display handled in callback onVideoLoaded

  let tmp = url.split("/");
  videoinfo.videoName = tmp[tmp.length - 1].split(".")[0];

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

  videoinfo.duration = this.video.duration;
  videoinfo.name = this.video.src;

  let name = videoinfo.name;
  $("#videoName").html(name);

  $("a.videolink").attr("href", videoinfo.videoPath);

  let videourl = videoinfo.videoURL;

  this.loadVideoInfo(videourl + ".info.json");
  this.loadPreviewVideo();

  $(this).trigger("video:loaded");

  this.hardRefresh();

  statusWidget.statusRequest("tagsLoad", []);
  tagsFromServer(videoinfo.tags.videoTagURL, true); // quiet
};
VideoControl.prototype.onVideoError = function (event) {
  if (logging.videoEvents) console.log("onVideoError", event);
  console.log("onVideoError: could not load ", this.video.src);
  fromServerDialog.setMessage("red", "onVideoError: could not load \n" + this.video.src);
  statusWidget.statusUpdate("videoLoad", false, []);

  this.isValidVideo = false;

  this.onVideoSizeChanged();

  this.hardRefresh();
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
    previewURL = videoinfo.videoURL + ".scale4.mp4";
  }
  videoinfo.preview.previewURL = previewURL;
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

    let infourl = videoinfo.preview.previewURL + ".info.json";
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
  videoinfo.preview.previewTimescale = Number(
    $("#previewVideoTimeScale").val()
  );
};
// load from file
VideoControl.prototype.loadPreviewVideoInfo = function (infoURL) {
  let videoControl = this;

  if (!infoURL) {
    infoURL = videoinfo.preview.previewURL + ".info.json";
  }
  videoinfo.preview.previewInfoURL = infoURL;

  let _onVideoInfoLoaded = function (data) {
    if (logging.videoEvents) console.log("PREVIEW loadVideoInfo loaded");
    console.log("PREVIEW videojsoninfo = ", data);
    videojsoninfo = data;

    if ($.isNumeric(videojsoninfo.timescale)) {
      videoinfo.preview.previewTimescale = Number(videojsoninfo.timescale);
      $("#previewVideoTimeScale").val(videoinfo.preview.previewTimescale);
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
    videojsoninfo = data;

    if ($.isNumeric(videojsoninfo.videofps)) {
      videoinfo.videofps = Number(videojsoninfo.videofps);
      videoControl.video2.frameRate = videoinfo.videofps;
    }
    if ($.isNumeric(videojsoninfo.realfps)) {
      videoinfo.realfps = Number(videojsoninfo.realfps);
    }
    if (
      videojsoninfo.starttime instanceof Date &&
      !isNaN(videojsoninfo.starttime.valueOf())
    ) {
      videoinfo.starttime = videojsoninfo.starttime;
    }
    if (typeof videojsoninfo.tagsfamily !== "undefined") {
      videoinfo.tagsfamily = videojsoninfo.tagsfamily;
    }
    if (typeof videojsoninfo.place !== "undefined") {
      videoinfo.place = videojsoninfo.place;
    }
    if (typeof videojsoninfo.comments !== "undefined") {
      videoinfo.comments = videojsoninfo.comments;
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
  if (logging.videoEvents) console.log("onVideoInfoChanged", event);

  videoinfo.nframes = Math.floor(videoinfo.duration * videoinfo.videofps);
  this.video2.frameRate = videoinfo.videofps;

  videoManager.updateVideoInfoForm();

  updateChronoXDomainFromVideo(); // Should trigger chrono refresh
  //refreshChronogram()
};

VideoControl.prototype.maxframe = function () {
  return Math.floor(videoinfo.duration * videoinfo.videofps);
};

VideoControl.prototype.loadVideo2 = function (videoURL) {
  if (logging.videoEvents) console.log("loadVideo2: url=", videoURL);
  this.name = videoinfo.name;
  this.video.src = videoURL;
}

VideoControl.prototype.onVideoLoaded2 = async function () {
  console.log("onVideoLoaded2: VIDEO loaded ", this.video.src);
  fromServerDialog.closeDialog()

  this.setPreviewVideoStatus("undefined");
  statusWidget.statusRequest("videoLoad", []);
  statusWidget.statusUpdate("videoLoad", true, []);
  
  videoControl.video2.frameRate = videoinfo.videofps
  this.isValidVideo = true;
  this.onVideoSizeChanged();
  
  let name = videoinfo.name;
  $("#videoName").html(name);
  $("a.videolink").attr("href", videoinfo.videoPath);
  $("a.videoinfolink").attr("href", url_for("/videodata?videoid="+videoManager.currentVideoID) );
  // this.loadPreviewVideo();
  
  $(this).trigger("video:loaded");
  this.hardRefresh();

  // HACKY SOLUTION
  // Video image was blank after loading a video
  // Using these two function calls to force display 
  // of first frame
  videoControl.forward(1);
  setTimeout(() => { videoControl.rewind(0); }, 1500);

  // Make initial video size larger when loading a video
  //$("#canvasresize")[0].style.height = "650px";
  //overlay.refreshCanvasSize();
}
