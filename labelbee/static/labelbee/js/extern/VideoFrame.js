/** @preserve
VideoFrame: HTML5 Video - SMTPE Time Code capturing and Frame Seeking API
@version 0.2.2
@author Allen Sarkisyan
@copyright (c) 2013 Allen Sarkisyan
@license Released under the Open Source MIT License

Contributors:
Allen Sarkisyan - Lead engineer
Paige Raynes - Product Development
Dan Jacinto - Video Asset Quality Analyst
Modified: Rémi Mégret, 2016-17, keep MIT license for VideoFrame.js file

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and/or distribute copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

- The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
- Attribution must be credited to the original authors in derivative works.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * @class
 * @classdesc Main VideoFrame Implementation.
 * @param {Object} options - Configuration object for initialization.
 */
var VideoFrame = function(options) {
  if (this === window) { return new VideoFrame(options); }
  var that=this;
  
  this.obj = options || {};
  this.frameRate = this.obj.frameRate || 24;
  this.video = document.getElementById(this.obj.id) || document.getElementsByTagName('video')[0];

  this.interval = undefined
  this.intervalPlayForwards = undefined  
  this.intervalPlayBackwards = undefined
  this.displayed = false
  this.lastdisplayed = undefined
  
  this.playbackRate = 1
  
  let videoframe = this
  this.frameChangedWrapper = function(event) {
    // Do not trigger callback twice for the same frame
    let frame = videoframe.get();
    if (frame != that.forceFrameChanged) {
      if (frame == videoframe.lastdisplayed) return;
    }
    videoframe.lastdisplayed = frame;
    videoframe.displayed = true
    
    if (videoframe.obj.callback) { videoframe.obj.callback(frame, event); }
  }
  // Set to frame to force frameChanged event in seekTo
  this.forceFrameChanged = undefined; 
  
  // REMI: call callback on timeupdate instead of directly in seek, because seek sometime calls the callback too fast (image not yet updated)
  this.video.addEventListener('timeupdate', this.frameChangedWrapper, false);
  
  // Add some hooks to react to external control of video
  this.hookEnded = function(event) {
       videoframe.stopListen()
    }
  this.hookPlay = function(event) {
      // If video starts playing from external source, hook up listener
      // to trigger frequent frameChanged callback
      if (videoframe.obj.callback && !videoframe.interval)
        videoframe.listen("frame")
    }
  this.hookPause = function(event) {
      // If video paused from external source, stop listener
      if (videoframe.interval)
        videoframe.stopListen()
      // FIXME: Interact badly with playBackwards, which triggers an async pause
      // that kills its interval after creating it
    }
  this.video.addEventListener('ended', videoframe.hookEnded, false);
  this.video.addEventListener('play',  videoframe.hookPlay, false);
  this.video.addEventListener('pause', videoframe.hookPause, false);
};

/**
 * FrameRates - Industry standard frame rates
 *
 * @namespace
 * @type {Object}
 * @property {Number} film - 24
 * @property {Number} NTSC - 29.97
 * @property {Number} NTSC_Film - 23.98
 * @property {Number} NTSC_HD - 59.94
 * @property {Number} PAL - 25
 * @property {Number} PAL_HD - 50
 * @property {Number} web - 30
 * @property {Number} high - 60
 */
var FrameRates = {
  film: 24,
  NTSC : 29.97,
  NTSC_Film: 23.98,
  NTSC_HD : 59.94,
  PAL: 25,
  PAL_HD: 50,
  web: 30,
  high: 60
};

VideoFrame.prototype = {
  /**
   * Returns the current frame number
   *
   * @return {Number} - Frame number in video
   */
  get : function() {
    return Math.floor(this.video.currentTime.toFixed(5) * this.frameRate);
  },
  /**
   * Event listener for handling callback execution at double the current frame rate interval
   *
   * @param  {String} format - Accepted formats are: SMPTE, time, frame
   * @param  {Number} tick - Number to set the interval by.
   * @return {Number} Returns a value at a set interval
   */
  listen : function(format, tick) {
    var _video = this;
    if (!format) { console.log('VideoFrame: Error - The listen method requires the format parameter.'); return; }
    if (!!this.interval) {clearInterval(this.interval)}
    this.interval = setInterval(function(event) {
      if (_video.video.paused || _video.video.ended) {
          // If paused and not currently playing manually, abort
          if ((!this.intervalPlayBackwards) 
           && (!this.intervalPlayForwards)) { return; }
      }
      var frame = ((format === 'SMPTE') ? _video.toSMPTE() : ((format === 'time') ? _video.toTime() : _video.get()));

      _video.frameChangedWrapper(event)
            
      return frame;
    }, (tick ? tick : 1000 / (_video.frameRate*_video.playbackRate) / 2));
    if (_video.onListen) { _video.onListen({'target': _video}); }
  },
  /** Clears the current interval */
  stopListen : function() {
    //console.log('VideoFrame.stopListen()')
    var _video = this;
    clearInterval(_video.interval);
    clearInterval(_video.intervalPlayBackwards);
    clearInterval(_video.intervalPlayForwards);
    _video.interval = undefined
    _video.intervalPlayBackwards = undefined
    _video.intervalPlayForwards = undefined
    if (_video.onStopListen) { _video.onStopListen({'target': _video}); }
  },
  fps : FrameRates,
  setFrameRate : function(fr) {
      this.frameRate = fr;
  },
  setPlaybackRate : function(fr) {
      this.playbackRate = fr;
  }
};



/**
 * Returns the current time code in the video in HH:MM:SS format
 * - used internally for conversion to SMPTE format.
 *
 * @param  {Number} frames - The current time in the video
 * @return {String} Returns the time code in the video
 */
VideoFrame.prototype.toTime = function(frames) {
  var time = (typeof frames !== 'number' ? this.video.currentTime : frames), frameRate = this.frameRate;
  var dt = (new Date()), format = 'hh:mm:ss' + (typeof frames === 'number' ? ':ff' : '');
  dt.setHours(0); dt.setMinutes(0); dt.setSeconds(0); dt.setMilliseconds(time * 1000);
  function wrap(n) { return ((n < 10) ? '0' + n : n); }
  return format.replace(/hh|mm|ss|ff/g, function(format) {
    switch (format) {
      case "hh": return wrap(dt.getHours() < 13 ? dt.getHours() : (dt.getHours() - 12));
      case "mm": return wrap(dt.getMinutes());
      case "ss": return wrap(dt.getSeconds());
      case "ff": return wrap(Math.floor(((time % 1) * frameRate)));
    }
  });
};

/**
 * Returns the current SMPTE Time code in the video.
 * - Can be used as a conversion utility.
 *
 * @param  {Number} frame - OPTIONAL: Frame number for conversion to it's equivalent SMPTE Time code.
 * @return {String} Returns a SMPTE Time code in HH:MM:SS:FF format
 */
VideoFrame.prototype.toSMPTE = function(frame) {
  if (frame===undefined) { return this.toTime(this.video.currentTime); }
  var frameNumber = Number(frame);
  var fps = this.frameRate;
  function wrap(n) { return ((n < 10) ? '0' + n : n); }
  var _hour = ((fps * 60) * 60), _minute = (fps * 60);
  var _hours = Math.floor(frameNumber / _hour)
  var _minutes = (Number((frameNumber / _minute).toString().split('.')[0]) % 60);
  var _seconds = (Number((frameNumber / fps).toString().split('.')[0]) % 60);
  var SMPTE = (wrap(_hours) + ':' + wrap(_minutes) + ':' + wrap(_seconds) + ':' + wrap(frameNumber % fps));
  return SMPTE;
};

VideoFrame.prototype.toHMSm = function(seconds) {
  if (seconds===undefined) { return this.toTime(this.video.currentTime); }
  function wrap(n) { return ((n < 10) ? '0' + n : n); }
  function pad(n,k) {
      var s = String(n);
      while (s.length < (k || 2)) {s = "0" + s;}
      return s;
    }
  var _hour = ((1 * 60) * 60), _minute = (1 * 60);
  var _hours = Math.floor(seconds / _hour).toString();
  var _minutes = (Math.floor(Number(seconds / _minute)).toString()) % 60;
  var _seconds = (Math.floor(Number(seconds)).toString()) % 60;
  var HMSm = (pad(_hours) + ':' + pad(_minutes) + ':' + pad(_seconds) + '.' + pad(((seconds*1000)%1000).toFixed(0),3));
  return HMSm;
};

/**
 * Converts a SMPTE Time code to Seconds
 *
 * @param  {String} SMPTE - a SMPTE time code in HH:MM:SS:FF format
 * @return {Number} Returns the Second count of a SMPTE Time code
 */
VideoFrame.prototype.toSeconds = function(SMPTE) {
  if (SMPTE===undefined) { return Math.floor(this.video.currentTime); }
  var time = SMPTE.split(':');
  return (((Number(time[0]) * 60) * 60) + (Number(time[1]) * 60) + Number(time[2]));
};

/**
 * Converts a SMPTE Time code, or standard time code to Milliseconds
 *
 * @param  {String} SMPTE OPTIONAL: a SMPTE time code in HH:MM:SS:FF format,
 * or standard time code in HH:MM:SS format.
 * @return {Number} Returns the Millisecond count of a SMPTE Time code
 */
VideoFrame.prototype.toMilliseconds = function(SMPTE) {
  var frames = (SMPTE===undefined) ? Number(this.toSMPTE().split(':')[3]) : Number(SMPTE.split(':')[3]);
  var milliseconds = (1000 / this.frameRate) * (isNaN(frames) ? 0 : frames);
  return Math.floor(((this.toSeconds(SMPTE) * 1000) + milliseconds));
};

/**
 * Converts a SMPTE Time code to it's equivalent frame number
 *
 * @param  {String} SMPTE - OPTIONAL: a SMPTE time code in HH:MM:SS:FF format
 * @return {Number} Returns the long running video frame number
 */
VideoFrame.prototype.toFrames = function(SMPTE) {
  var time = (SMPTE===undefined) ? this.toSMPTE().split(':') : SMPTE.split(':');
  var frameRate = this.frameRate;
  var hh = (((Number(time[0]) * 60) * 60) * frameRate);
  var mm = ((Number(time[1]) * 60) * frameRate);
  var ss = (Number(time[2]) * frameRate);
  var ff = Number(time[3]);
  return Math.floor((hh + mm + ss + ff));
};

/**
 * Private - seek method used internally for the seeking functionality.
 *
 * @param  {String} direction - Accepted Values are: forward, backward
 * @param  {Number} frames - Number of frames to seek by.
 */
VideoFrame.prototype.__seek = function(direction, frames) {
  if (!this.video.paused) { this.pause(); }
  var frame = Number(this.get());
  /** To seek forward in the video, we must add 0.00001 to the video runtime for proper interactivity */
  this.video.currentTime = ((((direction === 'backward' ? (frame - frames) : (frame + frames))) / this.frameRate) + 0.00001);
};

/**
 * Seeks forward [X] amount of frames in the video.
 *
 * @param  {Number} frames - Number of frames to seek by.
 * @param  {Function} callback - Callback function to execute once seeking is complete.
 */
VideoFrame.prototype.seekForward = function(frames, callback) {
  if (!frames) { frames = 1; }
  this.__seek('forward', Number(frames));
    // REMI: Let callback be called by timeupdate event 
    // to avoid calling before data is actually available
  return true;//(callback ? callback() : true); 
};

/**
 * Seeks backward [X] amount of frames in the video.
 *
 * @param  {Number} frames - Number of frames to seek by.
 * @param  {Function} callback - Callback function to execute once seeking is complete.
 */
VideoFrame.prototype.seekBackward = function(frames, callback) {
  if (!frames) { frames = 1; }
  this.__seek('backward', Number(frames));
    // REMI: Let callback be called by timeupdate event 
    // to avoid calling before data is actually available
  return true;//(callback ? callback() : true);
};

/**
 * For seeking to a certain SMPTE time code, standard time code, frame, second, or millisecond in the video.
 * - Was previously deemed not feasible. Veni, vidi, vici.
 *
 * @param  {Object} option - Configuration Object for seeking allowed keys are SMPTE, time, frame, seconds, and milliseconds
 * example: { SMPTE: '00:01:12:22' }, { time: '00:01:12' },  { frame: 1750 }, { seconds: 72 }, { milliseconds: 72916 }
 */
VideoFrame.prototype.seekTo = function(config) {
  var obj = config || {}, seekTime, SMPTE;
  /** Only allow one option to be passed */
  var option = Object.keys(obj)[0];

  if (option == 'SMPTE' || option == 'time') {
    SMPTE = obj[option];
    seekTime = ((this.toMilliseconds(SMPTE) / 1000) + 0.001);
    this.video.currentTime = seekTime;
    return;
  }

  switch(option) {
    case 'frame':
      SMPTE = this.toSMPTE(obj[option]);
      seekTime = ((this.toMilliseconds(SMPTE) / 1000) + 0.001);
      break;
    case 'seconds':
      seekTime = Number(obj[option]);
      break;
    case 'milliseconds':
      seekTime = ((Number(obj[option]) / 1000) + 0.001);
      break;
  }

  // Force frameChangedWrapper to generate event for that specific frame
  // Due to async, some event may be triggered after we set currentTime,
  // but before the actual currentTime frame is available
  // which would waste the next lastdisplayed test on the wrong frame
  this.forceFrameChanged = Math.round(seekTime * this.frameRate)

  if (!isNaN(seekTime)) {
    if (option.fast)
      this.video.fastSeek(seekTime)
    else
      this.video.currentTime = seekTime;
  }
};


VideoFrame.prototype.playBackwards = function(tick) {
    var _video = this;
    this.pause();
    _video.displayed = true
    this.intervalPlayBackwards = setInterval(function() {
      // Do not continue to next frame until timeupdate signal has been received
      if (!_video.displayed) return false
      _video.displayed = false
      _video.seekBackward();
      return true;
    }, (tick ? tick : 1000 / (_video.frameRate*_video.playbackRate)));
    this.listen('frame');
};
  
VideoFrame.prototype.playForwards = function(tick) {
    var _video = this;
    this.pause();
    if (tick) {
      _video.displayed = true
      this.intervalPlayForwards = setInterval(function() {
        // Do not continue to next frame until timeupdate signal has been received
        if (!_video.displayed) return false
        _video.displayed = false
        _video.seekForward();
        return true;
      }, (tick ? tick : 1000 / (_video.frameRate*_video.playbackRate)));
    } else {
      // More efficient than seeking for each frame
      this.video.playbackRate=this.playbackRate
      this.video.play()
    }
    this.listen('frame');
};
VideoFrame.prototype.pause = function() {
    this.video.pause()
    this.stopListen()
    // NOTE: a seek may still be active. 
    // It will trigger the frameChangedWrapper even though listen is off
    // Hence the test in frameChangedWrapper
}

VideoFrame.prototype.playingState = function() {
  if (!!this.intervalPlayBackwards) return "playingBackwards"
  else if (!!this.intervalPlayForwards || !this.video.paused) return "playingForwards"
  else return "paused"
}

