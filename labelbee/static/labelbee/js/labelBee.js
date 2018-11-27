/*jshint esversion: 6, asi: true */

////////////////////////////////////////////////////////////////////////////////
// Global variables
var canvas, canvas1, ctx, ctx2, vid, radius = 5,
    dragging = false,
    final_id = 0;
var x, y, cx, cy, width, height;
//var vis;


/** Debugging levels */
var logging = {
  "rects": false,
  "frameEvents": false,
  "guiEvents": false,
  "submitEvents": false,
  "mouseEvents": false,
  "mouseMoveEvents": false,
  "keyEvents": false,
  "overlay": false,
  "selectionEvents": false,
  "chrono": false,
  "videoEvents": false,
  "canvasEvents": false,
  "idPrediction": false,
  "axesEvents": false,
  "zoomTag": false,
  "zoomOverlay": false,
  "videoList": false
};


// ######################################################################
// INITITALIZATION

 
/** Global init */
function init() {

     // Parameter passed through HTML Jinja template
     if (http_script_name_0) {
        http_script_name = http_script_name_0
     } else {
        http_script_name = '/'
     }

    // import * from "VideoList.js";
    initVideoList()
        
    // import * from "VideoNavigation";
    videoControl = new VideoControl('video') // Attach control to #video
    // Polyfill to get a global getCurrentFrame
    getCurrentFrame = videoControl.getCurrentFrame.bind(videoControl)

    // import * from "OverlayControl.js";
    overlay = new OverlayControl('canvas')

    // import * from "ChronoControl.js";
    initChrono();
    
    // import * from "AnnotationIO.js"
    initAnnotationIO()

    // ## Control panel
    // import * from "SelectionControl.js"
    initSelectionControl()    
    
    
    // Need collapsible before ZoomView
    $( ".collapsible" ).accordion({
        collapsible: true,
        active: false,
        heightStyle: "content",
        animate:false,
//         activate: function( event, ui ) { 
//           // Disable focus on tab header
//           var header = $("label.ui-accordion-header",event.target)
//           console.log("header=",header); 
//           header.removeAttr("tabindex");
//         }
    });
    $( ".collapsible.default-active" ).accordion({
        active: 0
    });
    //$('.collapsible>.ui-accordion-header').removeAttr("tabindex");

    // Make button rows collapsible
    $(".inline-collapsible > .block-header").prepend(
        "<span class='glyphicon collapse-arrow'></span> ")
    $(".inline-collapsible > .block-header").on("click",function (e) {
        //console.log(e)
        let header = $(e.currentTarget) //$(".block-header", $(e.currentTarget).parent())
        let content = $(".block-content", header.parent())
        content.toggle()
        header.toggleClass("collapsed",content.is(":hidden"))
        header.parent().toggleClass("collapsed",content.is(":hidden"))
        console.log('DONE\n\n')
      })
      
    $( ".sortable" ).sortable({
      connectWith: ".sortable",
      handle: "> label, > .block-header"
    });
    $( ".sortable" ).disableSelection();
    
    
    // import * from "ZoomView.js";
    initZoomView()
    
    // Note: zoomOverlay.selectionChanged is already bound
    $(selectionControl).on({
        'tagselection:created': zoomOverlay.selectionChanged, 
        'selection:created':    zoomOverlay.selectionChanged,
        'tagselection:cleared': zoomOverlay.selectionChanged,
        'selection:cleared':    zoomOverlay.selectionChanged
      })
    $(overlay).on({
        'object:moving':   zoomOverlay.selectionChanged,
        'object:modified': zoomOverlay.selectionChanged
      })


    // ## Keyboard control

    // REMI: use keyboard
    //$(window).on("keydown", onKeyDown);
    $('#left-side').attr("tabindex", "0")
    $('#left-side').on("keydown", onKeyDown);
    
    // ## Misc init

    // Do not trigger first refresh: onloadeddata will call it
    // refresh();
    updateForm(null);
    defaultSelectedBee = undefined;
    lastSelected = null; // Last selected rect (workaround for event selection:cleared not providing the last selection to onObjectDeselected)
    
    //loadEventsFromFile0('data/Tracks-demo.json')
    
    /* Set defaults */
    
    selectVideoByID(1)
    //Will trigger videoControl.onVideoLoaded
    onTrackWindowChanged() // to compute track window params
    
    whoami() // Refresh user status
    
    window.onbeforeunload = function (e) {
        console.log('Leaving...')
        var confirmationMessage = 'If you leave this page, all unsaved annotations will be lost. Are you sure?';

        (e || window.event).returnValue = confirmationMessage; //Gecko + IE
        return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    };
}

function printMessage(html, color) {
    if (typeof color === 'undefined') color='black'

    $('#alerttext').html(html)
    $('#alerttext').css('color', color);
    
    if (html !== "")
        console.log("MESSAGE: %c"+html, "color:"+color)
}

function toggleFullScreen() {
  var main = $('.container.main')[0]
  if (!document.fullscreenElement) {
      main.webkitRequestFullscreen();
  } else {
    if (main.exitFullscreen) {
      main.exitFullscreen(); 
    }
  }
}

var pathJoin = function(pathArr){
    return pathArr.map(function(path){
        if(path[0] === "/"){
            path = path.slice(1);        
        }
        if(path[path.length - 1] === "/"){
            path = path.slice(0, path.length - 1);   
        }
        return path;     
    }).join("/");
}

function url_for(path) {
    if (path[0]=='/') path = path.slice(1);
    let route = http_script_name + path
    return route
}



// ######################################################################
// CONTROLLERS

// ## Keyboard

function onKeyDown_IDEdit(event) {
    if (logging.keyEvents)
        console.log("onKeyDown_IDEdit: event=",event)
    var key = event.which || event.keyCode;
    if (key == 13) { // Enter
        let frame = getCurrentFrame()
        let fieldID = document.getElementById("I");
        let new_id = fieldID.value

        let activeObject = canvas1.getActiveObject()
        if (activeObject.status === "new") {
            activeObject.id = new_id
            printMessage("ID changed + submitted", "green")
            submit_bee(activeObject)
        } else /* status=="db"*/ {
            let old_id = activeObject.id
            if (changeObservationID(frame, old_id, new_id)) {
                // Successfull
                activeObject.id = new_id
                printMessage("ID changed succesfully!", "green")
            } else {
                console.log("onKeyDown_IDEdit: unsuccessfull ID change", {
                    object: activeObject,
                    old_id: old_id,
                    new_id: new_id
                })
                printMessage("ID not changed", "orange")
            }
            videoControl.refresh();
            refreshChronogram()
        }
    }
}

function onKeyDown(e) {
    if (logging.keyEvents)
        console.log("onKeyDown: e=",e)
        
    if (/textarea|select/i.test( e.target.nodeName ) || e.target.type === "text") {
      if (logging.keyEvents)
        console.log("onKeyDown: coming from text field. stopped event")
      e.stopPropagation();
      return;
    }
        
    if (e.target == document.getElementById("I")) {
        if (e.keyCode==32 || e.keyCode==188 || e.keyCode==190) {
          console.log("onKeyDown: detected keydown happened in textfield #I with keyCode for navigation shortcuts. Canceling it and showing a message.")
          printMessage("Editing ID. Press ESC to exit...", "green")
          return false
        }
    }
    if (e.target.type == "text") {
        if (logging.keyEvents)
            console.log("keyDown goes to text field")
        return true
    }
    if (e.key == "Delete" || e.key == 'd' || e.key == 'Backspace') {
        deleteSelected();
        return false
    }
    if (e.key == "p") {
        $('#P').prop('checked', !$('#P').prop('checked'));
        $( "#P" ).trigger( "change" );
        //automatic_sub();
        return false
    }
    if (e.key == "r" && e.ctrlKey) {
        videoControl.refresh()
        return false
    }
    switch (e.keyCode) {
/*        case 32: // Space
            var id_field = document.getElementById("I");
            id_field.focus(); // Facilitate changing the id
            id_field.select();
            return false; // Prevent the event to be used as input to the field
            break;
            */
        case 32: // Space
            if (e.ctrlKey) {
                if (e.shiftKey)
                    videoControl.playPauseVideoBackward(2);
                else
                    videoControl.playPauseVideo(2);
            } else {
                if (e.shiftKey)
                    videoControl.playPauseVideoBackward();
                else
                    videoControl.playPauseVideo();
            }
            return false;
        case 27: // Escape
            //return true;
            var id_field = document.getElementById("I");
            if ($(id_field).is(':focus')) {
                id_field.selectionStart = id_field.selectionEnd
                id_field.blur();
                return false;
            } else {
                id_field.focus(); // Facilitate changing the id
                id_field.select();
                return false;
            }
            break;
        //case 83: // key S
        //    submit_bee();
        //    if (logging.keyEvents)
        //        console.log("onKeyDown: 'S' bound to submit_bee. Prevented key 'S' to propagate to textfield.")
        //    return false; // Prevent using S in textfield
        case 13: // Enter
            if ($(document.activeElement)[0]==document.body) {
                // No specific focus, process the key
                submit_bee();
            }
            //onKeyDown_IDEdit(e) // Forward to IDedit keydown handler
            //return false;
            return true
        case 16: // Shift
        case 17: // Ctrl
        case 18: // Alt
        case 19: // Pause/Break
        case 20: // Caps Lock
        case 35: // End
        case 36: // Home
            break;
        case 188: // <
            if (e.ctrlKey && e.shiftKey)
                videoControl.rewind4();
            else if (e.ctrlKey)
                videoControl.rewind3();
            else if (e.shiftKey)
                videoControl.rewind2();
            else
                videoControl.rewind();
            return false;
        case 190: // >
            if (e.ctrlKey && e.shiftKey)
                videoControl.forward4();
            else if (e.ctrlKey)
                videoControl.forward3();
            if (e.shiftKey)
                videoControl.forward2();
            else
                videoControl.forward();
            return false;
            // Mac CMD Key
        case 91: // Safari, Chrome
        case 93: // Safari, Chrome
        case 224: // Firefox
            break;
    }
    /*
    let obj = canvas1.getActiveObject();
    if (obj) {
        switch (e.keyCode) {
            case 37: // Left
                if (e.shiftKey && obj.width > 10) {
                    obj.width -= 10;
                    obj.left += 5;
                } else
                    obj.left -= 10;
                obj.setCoords();
                videoControl.refresh();
                return false;
            case 39: // Right
                if (e.ctrlKey) {
                    obj.set("width", parseFloat(obj.get("width")) + 10)
                    obj.set("left", parseFloat(obj.get("left")) - 5)
                } else
                    obj.set("left", parseFloat(obj.get("left")) + 10)
                obj.setCoords();
                videoControl.refresh();
                return false;
            case 38: // Up
                if (e.ctrlKey) {
                    obj.set("height", parseFloat(obj.get("width")) + 10)
                    obj.set("top", parseFloat(obj.get("top")) - 5)
                } else
                    obj.set("top", parseFloat(obj.get("top")) - 10)
                obj.setCoords();
                videoControl.refresh();
                return false;
            case 40: // Down
                obj.set("top", parseFloat(obj.get("top")) + 10)
                obj.setCoords();
                videoControl.refresh();
                return false;
        }
    }
    */
    /*
    if (e.keyCode >= 48 && e.keyCode <= 57) { // Numbers from 0 to 9
        if (!$("#I").is(':focus')) { // If ID not focused, focus it
            $("#I")[0].focus()
            $("#I")[0].select()
                //$("#I").val(e.keyCode-48); // Type in the numerical character
            return true; // Let keycode be transfered to field
        }
    }
    */
}


















