// ES module (refactor slice 8 step 12b, ADR 0015): `initVideoSettings` is called once by labelbeeBridge.js (it was a classic script).
// VideoSettings: gear button of the Video panel (#video-settings-button) opens a dialog with
// the settings of the video, one section per concern:
//  - Cache: Use Cache, Preload, Cancel, Reset (the buttons themselves are handled by core code);
//  - Video Display: Fixed Aspect (idem);
//  - Toolbar: show/hide the Backward play button and the Speed field, and the frame step of the
//    "second" and "minute" buttons. The buttons read the steps from the global videoToolbar.
// The moved buttons keep their classes, so the core code still updates their state.
// Settings of the toolbar are kept in localStorage. Layout only.
window.videoToolbar = { stepSecond: 20, stepMinute: 200 }; // global: read by the onclick of the buttons (a module `var` would not be global)
const videoToolbar = window.videoToolbar

export function initVideoSettings() {
  var KEY = "labelbee.videoToolbar";

  function load() { try { return JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(v) { try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }

  var dlg = $("#dialog-video-settings");
  var button = document.getElementById("video-settings-button");
  if (!dlg.length || !button) return;

  var settings = $.extend({ showPlayBackward: true, showSpeed: true }, load());
  var steps = [
    { key: "stepSecond", cls: ".toolbar-step-second", input: $("#toolbar-step-second") },
    { key: "stepMinute", cls: ".toolbar-step-minute", input: $("#toolbar-step-minute") },
  ];
  steps.forEach(function (s) { // defaults are the values of the page
    if (settings[s.key] === undefined) settings[s.key] = videoToolbar[s.key];
    videoToolbar[s.key] = settings[s.key];
  });

  function apply() {
    $("#playbackward").toggleClass("toolbar-hidden", !settings.showPlayBackward);
    $("#playRateControl").toggleClass("toolbar-hidden", !settings.showSpeed);
    $("#toolbar-show-playbackward").prop("checked", settings.showPlayBackward);
    $("#toolbar-show-speed").prop("checked", settings.showSpeed);
    steps.forEach(function (s) {
      var n = videoToolbar[s.key];
      s.input.val(n);
      $(s.cls).each(function () { // titles: "-20 frames" / "+20 frames"
        this.title = (this.value.indexOf("Previous") === 0 ? "-" : "+") + n + (n == 1 ? " frame" : " frames");
      });
    });
  }

  $("#toolbar-show-playbackward").on("change", function () {
    settings.showPlayBackward = this.checked; save(settings); apply();
  });
  $("#toolbar-show-speed").on("change", function () {
    settings.showSpeed = this.checked; save(settings); apply();
  });
  steps.forEach(function (s) {
    s.input.on("change", function () {
      var n = parseInt(this.value, 10);
      if (n >= 1) { settings[s.key] = videoToolbar[s.key] = n; save(settings); }
      apply(); // an invalid entry goes back to the previous value
    });
  });

  dlg.dialog({
    autoOpen: false,
    modal: false, // keep the video visible and usable while adjusting
    width: 360,
    buttons: { Close: function () { $(this).dialog("close"); } },
  });
  button.addEventListener("click", function () {
    if (dlg.dialog("isOpen")) dlg.dialog("close");
    else dlg.dialog("open");
  });

  apply();
}
