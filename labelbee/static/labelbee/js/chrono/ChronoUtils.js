/*jshint esversion: 6, asi: true */
// Helpers of the chronogram views (ES module, refactor slice 8 step 8d): time format, flash of an element, debounce.
// Part of the former ChronoControl.js (now Chrono.js); no dependency.

// ### CHRONO EXTRA FUNCTION
var __section__chronogram_utils



export function format_HMS(date, format) {
  function pad(n) {
    return ("0" + n).substr(-2);
  }

  var time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(pad)
    .join(":");

  if (format === "HMS.") {
    time += "." + date.getMilliseconds();
  }

  return time;
}

// Util function for flashing a button to attrach user's attention
export function flash(elements) {
    $(elements).toggleClass("focus",true)
    var repeat = 0
    var interval = setInterval(function() {if (repeat>4) {$(elements).toggleClass("focus",false); clearInterval(interval); return;}
                                           repeat+=1;
    $(elements).toggleClass("focus")
  }, 100)
}



export function debouncer(func, timeout) {
  var timeoutID,
    timeout = timeout || 100;
  return function () {
    var scope = this,
      args = arguments;
    clearTimeout(timeoutID);
    timeoutID = setTimeout(function () {
      func.apply(scope, Array.prototype.slice.call(args));
    }, timeout);
  };
}
