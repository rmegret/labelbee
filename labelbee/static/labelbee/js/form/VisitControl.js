// Visit module: the visit widget (Annotations > Visits, edit-visit mode). The Pick Flower tool of the pick-frame mode is in
// overlay/TimelinePicker.js. Both edit `visit` and `span` of a stored observation, always through events.update (ADR 0008 R3).
// Moved out of OverlayControl.js. ES module (refactor slice 8 step 9b, ADR 0015): `VisitWidget` is installed on window by
// labelbeeBridge.js (OverlayControl.js builds it) and is the helper of the mode 'edit-visit' (`overlay.modes`, step 11b2).
// `default_id` was an implicit global, only written here.
import { getObsHandle } from '../annotation/Model.js'
import { selectBeeByIDandFrame } from '../SelectionControl.js'
import { deleteEvent } from '../commands/EditActions.js'

let default_id

export const VisitWidget = function(overlay) {
    this.overlay = overlay
    
    this.pollinator = undefined // obs
    this.flower = undefined // obs
    
    this.visit = undefined // visit obs
    this.id = undefined
    this.frame = undefined

    this.create()
}
// Interaction mode 'edit-visit' (registered in `overlay.modes`, see OverlayControl.js `setInteractionMode`)
VisitWidget.prototype.enter = function(opts) {
    console.log('overlay.setInteractionMode', 'changing to edit-visit')
    if (!opts) opts = {}

    this.overlay.interaction.mode = 'edit-visit'
    this.overlay.interaction.opts = opts
    return {}
}
VisitWidget.prototype.refreshInteraction = function(opts) {
    $('.edit-visit').addClass("active")
}
VisitWidget.prototype.pickMode = function(mode) {
    console.log('VisitWidget.pickMode', mode)
    if (mode == 'pollinator') {
        this.overlay.setInteractionMode('edit-visit',{pickMode:'pollinator'})
    } else if (mode == 'flower') {
        this.overlay.setInteractionMode('edit-visit',{pickMode:'flower'})
    } else {
        console.log('pickMode ABORT: Unknown pick mode', mode)
        return
    }
    this.update()
}
VisitWidget.prototype.gotoObs = function(mode) {
    console.log('VisitWidget.selectObs', mode)
    if (mode == 'pollinator') {
        if (!this.pollinator) return
        selectBeeByIDandFrame(this.pollinator.ID, this.pollinator.frame)
    } else if (mode == 'flower') {
        if (!this.flower) return
        selectBeeByIDandFrame(this.flower.ID,this.flower.frame)
    } else if (mode == 'visit') {
        if (!this.visit) return
        selectBeeByIDandFrame(this.visit.ID,this.visit.frame)
    } else {
        console.log('pickMode ABORT: Unknown pick mode', mode)
        return
    }
    this.update()
}
VisitWidget.prototype.selectVisit = function(obs) {
    this.visit = obs
    default_id = obs.ID
    this.update()
}
VisitWidget.prototype.newVisit = function() {
    if (!this.pollinator || !this.flower) {
        console.log('VisitWidget.newVisit CANCELED, missing data',this.pollinator, this.flower)
        return
    }

    let pollinator_id = this.pollinator.ID
    let flower_id = this.flower.ID
    let id = "V-"+pollinator_id+"-"+flower_id
    let frame= videoControl.getCurrentFrame()
    let time = videoControl.getCurrentVideoTime()

    let x1 = this.pollinator.x+this.pollinator.width/2
    let y1 = this.pollinator.y+this.pollinator.height/2
    let x2 = this.flower.x+this.flower.width/2
    let y2 = this.flower.y+this.flower.height/2
    let cx = (x1+x2)/2
    let cy = (y1+y2)/2
    let w = overlay.defaultRectSize.width
    let h = overlay.defaultRectSize.height

    // Create the new event in memory, then refresh
    let tmpObs = {
        ID: id,
        frame: frame,
        time: time,
        x: cx-w/2,
        y: cy-h/2,
        cx: cx,
        cy: cy,
        width: w,
        height: h,
        angle: 0,
        notes: '',
        labels: '',
        visit: {pollinator: pollinator_id, flower: flower_id},
        span: {'f1':frame, 'f2':frame}
    }
    events.commit(tmpObs);
    
    this.visit = getObsHandle(frame, id)
    default_id = id

    refresh.rebuild()

    //submit_bee();
    //rect.obs.visit = {pollinator: pollinator_id, flower: flower_id}

    this.update()
}
VisitWidget.prototype.deleteVisit = function() {
    let visit = this.visit
    if (!visit) {
        console.log('deleteVisit: no visit selected')
        return
    }
    this.visit = undefined
    deleteEvent(visit.frame, visit.ID)
    this.update()
}
VisitWidget.prototype.close = function() {
    this.visit = undefined
    this.pollinator = undefined
    this.flower = undefined
    this.id = undefined
    this.frame = undefined
    this.update()
}
VisitWidget.prototype.create = function() {
    let overlay = this.overlay
    $('#visitblockdiv').html("EDIT VISIT: ")
            .append($('<button>DISMISS</button>').click(()=>this.close()))
        .append("<br>visit event, frame <span id='frame'></span>, id <span id='visit_id'></span>&nbsp;")
        .append('<br>')
            .append($('<button class="btn btn-default btn-xs goto-visit">Goto</button>').click(()=>this.gotoObs('visit')))
            .append($('<button class="btn btn-default btn-xs new-visit">Create</button>').click(()=>this.newVisit()))
            .append($('<button class="btn btn-default btn-xs delete-visit">Delete</button>').click(()=>this.deleteVisit()))
        .append('<br>')
        .append('&nbsp;&nbsp;&nbsp;Pollinator: <span id="pollinator_id"></span>')
            .append($('<button class="btn btn-default btn-blue-toggle btn-xs select-pollinator">Goto</button>').click(()=>this.gotoObs('pollinator')))
            .append($('<button class="btn btn-default btn-blue-toggle btn-xs pick-pollinator">Pick</button>').click(()=>this.pickMode('pollinator')))
        .append('<br>')
            .append('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Flower: <span id="flower_id"></span>')
            .append($('<button class="btn btn-default btn-blue-toggle btn-xs select-flower">Goto</button>').click(()=>this.gotoObs('flower')))
            .append($('<button class="btn btn-default btn-blue-toggle btn-xs pick-flower">Pick</button>').click(()=>this.pickMode('flower')))
        .append('<br>')
        .append('Start frame: <span id="start-frame"></span>')
            .append($('<button class="btn btn-default btn-xs goto-start-frame">Goto</button>').click(()=>this.gotoSpanFrame('start')))
            .append($('<button class="btn btn-default btn-xs set-start-frame">Set</button>').click(()=>this.setSpanFrame('start')))
        .append('<br>')
        .append('&nbsp;End frame: <span id="end-frame"></span>')
            .append($('<button class="btn btn-default btn-xs goto-end-frame">Goto</button>').click(()=>this.gotoSpanFrame('end')))
            .append($('<button class="btn btn-default btn-xs set-end-frame">Set</button>').click(()=>this.setSpanFrame('end')))
}
VisitWidget.prototype.setFlower = function(obs) {
    console.log('VisitWidget.setFlower',obs); 
    if (!obs) {
        console.log('VisitWidget.setFlower, no obs',obs); 
        overlay.setInteractionMode('main')
        this.update()
        return
    }
    if (!String(obs.ID).startsWith('F')) {
        console.log('VisitWidget.setFlower, not a flower',obs); 
        overlay.setInteractionMode('main')
        this.update()
        return
    }
    this.flower = obs
    overlay.setInteractionMode('main')
    this.update()
}
VisitWidget.prototype.setPollinator = function(obs) {
    console.log('VisitWidget.setPollinator',obs); 
    if (!obs) {
        console.log('VisitWidget.setPollinator, no obs',obs);
        overlay.setInteractionMode('main')
        this.update()
        return
    }
    if (!String(obs.ID).startsWith('P')) {
        console.log('VisitWidget.setPollinator, not a pollinator',obs); 
        overlay.setInteractionMode('main')
        this.update()
        return
    }
    this.pollinator = obs
    overlay.setInteractionMode('main')
    this.update()
}
VisitWidget.prototype.setFlower = function(obs) {
    console.log('VisitWidget.setFlower',obs); 
    if (!obs) {
        console.log('VisitWidget.setFlower, no obs',obs); 
        overlay.setInteractionMode('main')
        this.update()
        return
    }
    if (!String(obs.ID).startsWith('F')) {
        console.log('VisitWidget.setFlower, not a flower',obs); 
        overlay.setInteractionMode('main')
        this.update()
        return
    }
    this.flower = obs
    overlay.setInteractionMode('main')
    this.update()
}
VisitWidget.prototype.setSpanFrame = function(mode) {
    console.log('VisitWidget.setSpanFrame'); 
    let visit = this.visit
    if (!visit) {
        console.log('VisitWidget.setSpanFrame, no visit'); 
        return
    }
    let frame = videoControl.getCurrentFrame()
    // The span is the unit: a new one is stored whole (a visit that does not contain span info yet gets one)
    let span = Object.assign({'f1':visit.frame, 'f2':visit.frame}, visit.span)
    if (mode=='start') {
        if (frame > visit.frame) {
            console.log('VisitWidget.setSpanFrame: ABORT, current frame > visit frame',frame,visit.frame);
            this.update()
            return
        }
        span.f1 = frame
    }
    if (mode=='end') {
        if (frame < visit.frame) {
            console.log('VisitWidget.setSpanFrame: ABORT, current frame < visit frame',frame,visit.frame);
            this.update()
            return
        }
        span.f2 = frame
    }
    events.update(visit.frame, visit.ID, {span: span})
    refresh.rebuild() // a span decides which boxes the overlay shows
    this.update()
}
VisitWidget.prototype.gotoSpanFrame = function(mode) {
    console.log('VisitWidget.gotoSpanFrame'); 
    let visit = this.visit
    if (!visit) {
        console.log('VisitWidget.gotoSpanFrame, no visit'); 
        return
    }
    if (!('span' in visit)) {
        console.log('VisitWidget.gotoSpanFrame, no visit span'); 
        return
    }
    if (mode=='start') {
        selectBeeByIDandFrame(visit.ID,visit.span.f1)
    }
    if (mode=='end') {
        selectBeeByIDandFrame(visit.ID,visit.span.f2)
    }
}
VisitWidget.prototype.update = function() {
    if (this.visit) {
        this.pollinator = getObsHandle(this.visit.frame, this.visit.visit.pollinator)
        this.flower = getObsHandle(this.visit.frame, this.visit.visit.flower)
    }

    let visit_id = this?.visit?.ID
    let frame = this?.visit?.frame ?? this?.pollinator?.frame ?? this?.flower?.frame ?? undefined

    let pollinator_id = this?.pollinator?.ID ?? this?.visit?.visit?.pollinator
    let flower_id = this?.flower?.ID ?? this?.visit?.visit?.flower

    if (!this.visit) {
        let id = "V-"+pollinator_id+"-"+flower_id
        this.visit = getObsHandle(frame, id)
    }
    this.frame = frame
    $('#visitblockdiv > #pollinator_id').html(pollinator_id ?? "??")
    $('#visitblockdiv > #flower_id').html(flower_id ?? "??")
    $('#visitblockdiv > #frame').html(frame ?? "??")
    $('#visitblockdiv > #visit_id').html(visit_id ?? "??")
    $('#visitblockdiv > #start-frame').html(this?.visit?.span?.f1 ?? "??")
    $('#visitblockdiv > #end-frame').html(this?.visit?.span?.f2 ?? "??")
    if (this.overlay?.interaction?.mode == 'edit-visit') {
        let pickMode = this.overlay.interaction.opts.pickMode
        $('#visitblockdiv > .btn.pick-pollinator').toggleClass("active",pickMode =='pollinator')
        $('#visitblockdiv > .btn.pick-flower').toggleClass("active",pickMode =='flower')
    } else {
        $('#visitblockdiv > .btn.pick-pollinator').toggleClass("active",false)
        $('#visitblockdiv > .btn.pick-flower').toggleClass("active",false)
    }

    $('#visitblockdiv > .btn.new-visit').prop('disabled', !!(this.visit) || (!this.pollinator || !this.flower))
    $('#visitblockdiv > .btn.delete-visit').prop('disabled', (!this.visit))

    $('#visitblockdiv > .btn.select-pollinator').prop('disabled', (!this.pollinator))
    $('#visitblockdiv > .btn.select-flower').prop('disabled', (!this.flower))

    $('#visitblockdiv > .btn.pick-pollinator').prop('disabled', !!(this.visit))
    $('#visitblockdiv > .btn.pick-flower').prop('disabled', !!(this.visit))

}
VisitWidget.prototype.open = function() {
    let overlay = this.overlay
    let centerframe = videoControl.currentFrame

    if (this.interaction.mode != 'edit-visit') {
        console.log('Not editiing visit... ABORT')
        return
    }


    let activeObj = this.getActiveRect()
    if (!activeObj) {
        console.log('overlay.setInteractionMode: CANCELED, no active object')
        return;
    }
    let obs = activeObj.obs
    if (!obs) {
        console.log('overlay.setInteractionMode: CANCELED, no obs')
        return;
    }
    let frame = videoControl.getCurrentFrame()

    
    this.interaction.opts.obs = obs
    this.interaction.opts.id = obs.ID
    this.interaction.opts.frame = frame
    this.interaction.opts.showTimeline = false // Hide timeline by default


    function intervalRange(start, end) {
        return Array.from({length: end-start+1}, (x, i) => start+i);
    }
    let deltas =  intervalRange(-overlay.opts.timelineMaxDelta, overlay.opts.timelineMaxDelta)  //[-3,-2,-1,0,1,2,3,4]
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    console.log('Creating timeline...')


    // let id = overlay.interaction.opts.id
    // let frame0 = overlay.interaction.opts.frame
    // let obs=getObsHandle(frame0,id) 
    // if (!obs) {
    //     printMessage("Timeline: didn't find annotation to pick frame for")
    //     return
    // }
    // if (!size) {
    //     size = obs.width>obs.height ? obs.width : obs.height
    //     size *= overlay.opts.timelineZoom
    //     size = Math.round(size)
    // }
    // if (!displaySize) {
    //     displaySize = overlay.opts.timelineDisplaySize
    // }
    // let w = size
    // let h = size
    // let cx = obs.x + obs.width/2
    // let cy = obs.y + obs.height/2
    // let crop = {x: Math.round(cx-w/2), y: Math.round(cy-h/2), w: w, h: h}
    
    // $('#pick-frame-timeline').html("Timeline:<br>")
    // for (var delta of deltas) {
    //     //console.log(i); 
    //     let frame = Number(centerframe)+Number(delta)
    //     let img = await this.getFrameCropImg(frame, crop)
    //     img.width = displaySize
    //     img.height = displaySize
    //     if (img) {
    //         let extra=''
    //         let pref=''
    //         let div = $('<div style="display: inline-block"></div>')
    //         div.addClass('timeline')
    //         $('#pick-frame-timeline').append(div)
    //         if (frame == frame0) {
    //             div.addClass('selected')
    //             extra+=' Event'
    //         }
    //         if (frame == obs.span.f1) {
    //             div.addClass('selected-f1')
    //             extra+=' Start'
    //         }
    //         if (frame == obs.span.f2) {
    //             div.addClass('selected-f2')
    //             extra+=' End'
    //         }
    //         if (frame == centerframe) {
    //             pref+='Current '
    //         }
    //         div.click(()=>gotoEvent(frame, id))
    //         div.html('<small>'+pref+'Frame '+frame+extra+'</small><br>')
    //         div.append(img)
    //     }
    // }

}
