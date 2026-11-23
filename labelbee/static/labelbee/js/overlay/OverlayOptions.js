/*jshint esversion: 6, asi: true */
// Display options of the overlay (ES module, refactor slice 8 step 11b3d, ADR 0015): `overlay.opts` is an `OverlayOptions`.
// It owns the toggle buttons `.overlayOpts-<name>`, the ID/label parameters, the angle switch, the observation and tag display
// checkboxes and the tag marker. Moved as it is out of OverlayControl.js (page globals `showObs`... and `overlay.guiAngle`
// became fields). Built by the overlay constructor, `OverlayOptions` is installed on window by labelbeeBridge.js.
// Page globals (`videoControl`, `overlay`) are read at call time.

function selectboxSetOptions(selectbox, options, names) {
  selectbox.find("option").remove();
  $.each(options, function (i, el) {
    let name;
    if (name == null) {
      name = el;
    } else {
      name = names[i];
    }
    selectbox.append("<option value='" + el + "'>" + name + "</option>");
  });
}

export class OverlayOptions {
  constructor(overlay) {
    this.overlay = overlay

    // Toggle buttons and parameters of the observation display
    this.showRect = true
    this.showID = true
    this.showLabels = true
    /* labelFormatter: function(obs) {return activityString(obs)}, */
    this.labelFormatter = (obs)=>obs.labels
    this.label_offsetType = 'bottom'
    this.wrapLabels = true
    this.wrapLabelsWidth = 80
    this.showNotes = true
    this.showSpan = false
    this.resizeAroundCenter = false
    this.ID_dotRadius = 4 // Radius of dot center
    this.ID_fontSize = 20
    this.ID_color = 'yellow'
    this.ID_offsetType = 'center'
    this.clickModeSelectMultiframe = false
    this.clickModeNewAnnotation = false
    this.clickModeAutoCentering = false
    this.predictIdClickRadius = 120
    this.showImageDiff = false
    this.useImageCache = false
    this.showPredictedStatus = false
    this.timelineZoom = 4.0
    this.timelineMaxDelta = 3
    this.timelineDisplaySize = 300
    this.fixedAspect = true

    // Angle control of the rectangles ("Disable Angle Control")
    this.angleEnabled = true

    // Observation and tag display (checkboxes #showObs...)
    this.showObs = true
    this.showObsTracks = true
    this.showTags = true
    this.showTagsTracks = true
    this.showSelectedTagsTracks = true
    this.showTagsOrientation = false

    this.tagMarkerOptions = ['quad','cross','circle']
    this.tagMarker = 'quad'
  }

  // Set the buttons and inputs from the fields (called once the page is ready, by the overlay constructor)
  init() {
    $('#showObs').prop('checked',this.showObs)
    $('#showObsTracks').prop('checked',this.showObsTracks)
    $('#showTags').prop('checked',this.showTags)
    $('#showTagsTracks').prop('checked',this.showTagsTracks)
    $('#showSelectedTagsTracks').prop('checked',this.showSelectedTagsTracks)
    $('#showTagsOrientation').prop('checked',this.showTagsOrientation)
    this.updateButtons()
    this.updateDisableAngleButton()
    this.selectboxTagMarkerInit()
    this.selectboxTagMarkerUpdate()
  }

  toggle(option) {
    console.log('overlay.opts.toggle')
    const overlay = this.overlay

    this[option] = !this[option]
    this.updateButtons()

    if (option=="useImageCache") {
      if (this[option]) { // Enable cache
        if (videoControl.currentMode != "cache") {
          console.log('opts.toggle: changing videoControl.currentMode to cache')
          videoControl.currentMode = "cache"
          videoControl.hardRefresh()
          return
        } else {
          overlay.hardRefresh()
          return
        }
      } else { // Disable cache
        if (videoControl.currentMode == "cache") {
          console.log('opts.toggle: changing videoControl.currentMode to video')
          videoControl.currentMode = "video"
          videoControl.hardRefresh()
          return
        } else {
          overlay.hardRefresh()
          return
        }
      }
    }
    if (option=="fixedAspect") {
      if (this[option]) { // Enable fixed aspect ratio
        overlay.canvasSetVideoSize(overlay.videoSize.w,overlay.videoSize.h)
        $("#canvasresize")
          .resizable("option", "aspectRatio", overlay.videoSize.w/overlay.videoSize.h)
          .data('ui-resizable')._aspectRatio = overlay.videoSize.w/overlay.videoSize.h;
      } else {
        $("#canvasresize")
          .resizable("option", "aspectRatio", false)
          .data('ui-resizable')._aspectRatio = false;
      }
    }
    overlay.hardRefresh()
  }
  updateButtons() {
    //console.log('overlay.opts.updateButtons')
    for (const option of ['showRect','showID','showLabels','showNotes','showSpan','resizeAroundCenter',
                    'clickModeSelectMultiframe','clickModeNewAnnotation','clickModeAutoCentering',
                    'showImageDiff','useImageCache','showPredictedStatus', 'fixedAspect']) {
        //console.log(option)
        if ( this[option] ) {
            $(".overlayOpts-"+option).addClass("active")
        } else {
            $(".overlayOpts-"+option).removeClass("active")
        }
    }
    $('#overlayOpts-ID_dotRadius').val(String(this.ID_dotRadius))
    $('#overlayOpts-ID_fontSize').val(String(this.ID_fontSize))
    $('#overlayOpts-ID_color').val(String(this.ID_color))
    $('#overlayOpts-ID_offsetType').val(String(this.ID_offsetType))
    $('#overlayOpts-label_offsetType').val(String(this.label_offsetType))
  }
  onParamsChanged() {
    console.log('overlay.opts.onParamsChanged')
    this.ID_dotRadius = Number($('#overlayOpts-ID_dotRadius').val())
    this.ID_fontSize = Number($('#overlayOpts-ID_fontSize').val())
    this.ID_color = $('#overlayOpts-ID_color').val()
    this.ID_offsetType = $('#overlayOpts-ID_offsetType').val()
    this.label_offsetType = $('#overlayOpts-label_offsetType').val()
    this.overlay.refreshOverlay()
  }

  // GUI for enabling/disabling angle in BB
  onClickDisableAngle() {
    console.log("overlay.opts.onClickDisableAngle");

    this.angleEnabled = !this.angleEnabled;
    this.updateDisableAngleButton();

    this.overlay.refreshOverlay();
  }
  updateDisableAngleButton() {
    console.log("overlay.opts.updateDisableAngleButton");
    if (!this.angleEnabled) {
      $(".guiAngle-disableAngle").addClass("active");
    } else {
      $(".guiAngle-disableAngle").removeClass("active");
    }
  }

  // Callbacks when the display checkboxes have changed
  onShowObsChanged() {
    this.showObs = $("#showObs")[0].checked;
    this.showObsTracks = $("#showObsTracks")[0].checked;
    //videoControl.refresh()
    this.overlay.hardRefresh();
  }
  onShowTagsChanged() {
    this.showTags = $("#showTags")[0].checked;
    this.showTagsOrientation = $("#showTagsOrientation")[0].checked;
    videoControl.refresh();
  }
  onShowTagsTracksChanged() {
    this.showTagsTracks = $("#showTagsTracks")[0].checked;
    this.showSelectedTagsTracks = $("#showSelectedTagsTracks")[0].checked;
    videoControl.refresh();
  }

  selectboxTagMarkerInit() {
    var selectbox = $("#selectboxTagMarker");

    selectboxSetOptions(selectbox, this.tagMarkerOptions);
  }
  selectboxTagMarkerUpdate(value) {
    var selectbox = $("#selectboxTagMarker");

    if (value != null) {
      this.tagMarker = value;
    }

    selectbox.val(this.tagMarker);
  }
  selectboxTagMarkerChanged() {
    this.tagMarker = $("#selectboxTagMarker").val();
    this.overlay.hardRefresh();
  }
}
