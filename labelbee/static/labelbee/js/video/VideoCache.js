/*
 * VideoCache: random access to the frames of a video, with an LRU of decoded frames and a priority queue of
 * decodes (refactor slice 8 step 5, ADR 0015). Moved verbatim from VideoControl.js (the block that ended with
 * `END VIDEOCACHE`); no behavior change. `VideoControl` builds it (`new VideoCache(this)`) through the global installed by
 * labelbeeBridge.js, at `init()` time.
 *
 * Libraries stay classic globals (ADR 0015 decision 1): `$` (jQuery) and `LRUCache` (extern/lru_cache-master), both
 * read at call time.
 */
import { logging } from '../core/Notifier.js';

/**
  * VideoCache provides random access to individual frames in a video
  * @constructor 
*/
export function VideoCache(videoControl, videoCacheTagId) {
  let videoCache = this;
  videoCache.opts = {
    videoCacheSize: 1000,
    decodeTimeoutMs: 15000 // a decode that takes longer is abandoned (failed), the queue goes on
  }
  this.queryQueue = []
  this.onStatusChanged = null // optional callback, called whenever the cache content or queue changed
  this.currentQuery = null // query being decoded (state 'inprocess'), not in queryQueue
  this.failedDecodeFrames = new Set() // keys url:frame whose last decode failed (ADR 0013)
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
  let promises = []
  for (let frame of frames) {
    if (frame < 0) continue
    //let img = await this.getFrameImage(videoUrl, frame, fps)
    console.log('Queueing frame ', frame)
    promises.push(this.enqueueFrame(videoUrl, frame, fps))
  }
  this.processQueue()
  // Done when every requested frame has settled (loaded, failed or cancelled), not when this call returns:
  // processQueue returns at once if another call is already running the queue
  await Promise.allSettled(promises)
  console.log('Preload DONE')
  //this.preloading = false
}
// Value the promise of a cancelled query is rejected with: `VideoCache.isCanceled(err)`
VideoCache.CANCELED = Object.freeze({ canceled: true })
VideoCache.isCanceled = function (err) { return err === VideoCache.CANCELED }
// Value a regular request is rejected with when the queue is full (ADR 0013)
VideoCache.QUEUE_FULL = Object.freeze({ queueFull: true })
VideoCache.isQueueFull = function (err) { return err === VideoCache.QUEUE_FULL }

VideoCache.prototype.cancelQueue = function () {
  for (let query of this.queryQueue) {
    if (this.getFrameState(query.videoUrl, query.frame) == "inqueue")
      this.removeFrame(query.videoUrl, query.frame)
    query.deferred.reject(VideoCache.CANCELED)
  }
  this.queryQueue = []
  // The decode in flight cannot be killed: flag it and stop waiting for it, its result is thrown away if it ends
  let current = this.currentQuery
  if (current) {
    current.cancelled = true
    this.removeFrame(current.videoUrl, current.frame)
    current.abandon(VideoCache.CANCELED) // the queue does not wait for it: a decode that hangs cannot block it
  }
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
  if (this.onStatusChanged) this.onStatusChanged() // set only while the chronogram cache status is shown
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
// Regular request (preload): a new frame goes at the back, a known frame is left as it is
VideoCache.prototype.enqueueFrame = async function (videoUrl, frame, fps) {
  return this._enqueue(videoUrl, frame, fps, false)
}
// Priority request (hover, display of the current frame): a new frame goes at the front,
// a frame waiting in the queue moves to the front; a frame in process or in cache is left as it is
VideoCache.prototype.enqueueFramePriority = async function (videoUrl, frame, fps) {
  return this._enqueue(videoUrl, frame, fps, true)
}
VideoCache.prototype._enqueue = function (videoUrl, frame, fps, priority) {
  let key = videoUrl + ':' + frame

  let item = this.lrucache.get(key)
  if (item) {
    if (priority && item.state == 'inqueue') {
      let i = this.queryQueue.findIndex((q) => q.key === key)
      if (i > 0) this.queryQueue.unshift(this.queryQueue.splice(i, 1)[0])
    }
    console.log('videoCache.enqueue: already ' + item.state, key)
    return item.promise
  }
  // The queue never holds more frames than the cache: a priority request makes room, a regular one fails
  if (this.queryQueue.length >= this.opts.videoCacheSize) {
    if (!priority || this.queryQueue.length === 0) {
      console.log('videoCache.enqueue: queue full, rejected', key)
      return Promise.reject(VideoCache.QUEUE_FULL)
    }
    let dropped = this.queryQueue.pop()
    this.removeFrame(dropped.videoUrl, dropped.frame)
    dropped.deferred.reject(VideoCache.CANCELED)
    console.log('videoCache.enqueue: queue full, dropped', dropped.key)
  }
  console.log('videoCache.enqueue: Pushing ', key, priority ? '(priority)' : '')
  let D = $.Deferred()
  this.setFrameState(videoUrl, frame, 'inqueue', undefined, D.promise())

  let query = { videoUrl: videoUrl, frame: frame, fps: fps, key: key, deferred: D, cancelled: false, abandon: null }
  if (priority) this.queryQueue.unshift(query)
  else this.queryQueue.push(query)
  this.updateStatus()
  return D.promise()
}
VideoCache.prototype.getFrameImageAsync = async function (videoUrl, frame, fps) {
  let promise = this.enqueueFramePriority(videoUrl, frame, fps)
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
      let query = this.queryQueue.shift()
      let key = query.key
      this.currentQuery = query
      this.setFrameState(query.videoUrl, query.frame, 'inprocess', undefined, query.deferred.promise())
      this.updateStatus()
      console.log('VideoCache.processQueue: processing',key,query)
      // The decode cannot be killed, but the queue stops waiting for it when it is cancelled or too slow
      let timer
      let abandoned = new Promise((resolve, reject) => {
        query.abandon = reject
        timer = setTimeout(() => reject(new Error('decode timeout')), this.opts.decodeTimeoutMs)
      })
      let decoding = this.getImageForce(query.videoUrl, query.frame, query.fps)
      decoding.catch(() => {}) // if abandoned, a later failure is not an error
      try {
        let image = await Promise.race([decoding, abandoned])
        if (query.cancelled) {
          query.deferred.reject(VideoCache.CANCELED) // result thrown away (entry already removed by cancelQueue)
        } else {
          this.lrucache.set(key, { 'state': 'incache', 'image': image, 'promise': query.deferred.promise() })
          this.failedDecodeFrames.delete(key)
          console.log('videoCache.processQueue: resolve ', key)
          query.deferred.resolve(image)
        }
      } catch (err) {
        if (query.cancelled) {
          query.deferred.reject(VideoCache.CANCELED)
        } else {
          console.error('VideoCache.processQueue: decode failed', key, err)
          this.removeFrame(query.videoUrl, query.frame)
          this.failedDecodeFrames.add(key)
          query.deferred.reject(err)
        }
      } finally {
        clearTimeout(timer)
        this.currentQuery = null
      }

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
  let video = this.video

  if (video.currentSrc != videoUrl)
    video.src = videoUrl;

  // Wait for the first frame of a newly loaded video (readyState >= 2) rather than a blind sleep and a random seek
  if (video.readyState < 2) {
    await new Promise((resolve, reject) => {
      let cleanup = () => {
        video.removeEventListener('loadeddata', onLoaded)
        video.removeEventListener('error', onError)
      }
      let onLoaded = () => { cleanup(); resolve() }
      let onError = () => { cleanup(); reject(new Error('VideoCache: video failed to load ' + videoUrl)) }
      video.addEventListener('loadeddata', onLoaded)
      video.addEventListener('error', onError)
    })
  }

  let currentTime = frame / fps + 0.00001;

  if (Math.abs(video.currentTime - currentTime) < 0.00005) {
    console.log('videoCache.seekWithCallback: already at currentTime. RESOLVE', currentTime)
    return video
  }
  // The one-shot callback is registered right before the seek: nothing else can use it up (e.g. the first frame
  // presented after the load), which left the seek of the first query waiting for ever
  await new Promise((resolve) => {
    video.requestVideoFrameCallback((now, metadata) => {
      frameCallback(now, metadata)
      resolve()
    })
    video.currentTime = currentTime
  })
  return video
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
