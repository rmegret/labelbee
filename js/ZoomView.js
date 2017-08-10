
// ## Auxiliary display

function initZoomView() {
    $("#zoom").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#tagImage").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    zoomShowOverlay = false;
    $('#checkboxZoomShowOverlay').prop('checked', zoomShowOverlay);
    flagShowZoom = true;
    $('#checkboxShowZoom').prop('checked', flagShowZoom);
    
    tagImageRoot='data/tags/tag25h5inv/png'
    
    zoomScale = 1
}

function clickZoomShowOverlay() {
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if ($('#zoom').is(':visible')) {
        showZoom(lastSelected)
    }
}
function clickShowZoom() {
    flagShowZoom = $('#checkboxShowZoom').is(':checked')
    updateShowZoom()
}
function updateShowZoom() {
    if (flagShowZoom) {
        $('#zoomDiv').show()
        showZoom(lastSelected)
    } else {
        $('#zoomDiv').hide()
    }
}
function showZoom(rect) {
    refreshZoom(defaultSelectedBee)
    return

    let zw=400
    let zh=400

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    zoom_canvas.width=zw
    zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    
    let video = $('#video')[0]
    zoom_ctx.drawImage(video, 
       (rect.obs.cx - mw), (rect.obs.cy - mh), w, h,
        0,0,zh,zw);
    
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if (zoomShowOverlay) {
      let activeObject = canvas1.getActiveObject()
      let obs = activeObject.obs
    
      zoom_ctx.beginPath();
      zoom_ctx.moveTo(mw,0)
      zoom_ctx.lineTo(mw,zh)
      zoom_ctx.moveTo(0,mh)
      zoom_ctx.lineTo(zw,mh)
      zoom_ctx.rect(mw+obs.x-obs.cx,mh+obs.y-obs.cy, obs.width,obs.height)
      zoom_ctx.strokeStyle = 'blue'
      zoom_ctx.stroke()        
    }
}
function zoomApplyScale(factor) {
    zoomScale *= factor;
    if (isNaN(zoomScale)) zoomScale=1
    updateShowZoom()
}
function zoomSetScale(scale) {
    zoomScale = scale
    updateShowZoom()
}


function plotArrow(ctx, p0, p1, L) {
    let u = {x:p1.x-p0.x, y:p1.y-p0.y}
    let n = Math.sqrt(u.x*u.x+u.y*u.y)
    u.x=u.x/n
    u.y=u.y/n
    ctx.beginPath();
    ctx.moveTo(p1.x+L*(-u.x-0.6*u.y), p1.y+L*(-u.y+0.6*u.x))
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p1.x+L*(-u.x+0.6*u.y), p1.y+L*(-u.y-0.6*u.x))
    ctx.stroke()
}

var oldCX, oldCY, oldAngle;
function refreshZoom() {
    let zw=400
    let zh=400

    if (logging.zoomTag)
        console.log('showZoomTag')
  
    let cx=0
    let cy=0
    let tag=getCurrentTag()
    if (typeof tag === 'undefined') {
        let rect=getSelectedRect()
        if (rect != null) {
            let geom=rotatedRectGeometry(rect)
            let pt = canvasToVideoPoint(geom.center)
            cx = pt.x
            cy = pt.y
            angle = geom.angle
        } else {
            cx = oldCX
            cy = oldCY
            angle = oldAngle
        }
    } else {
        cx = tag.c[0]
        cy = tag.c[1]
        angle = tagAngle(tag)/180*Math.PI
    }
    
    oldCX = cx
    oldCY = cy
    oldAngle = angle

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    zoom_canvas.width=zw
    zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    
    let video = $('#video')[0]
    
    zoom_ctx.save()
//     zoom_ctx.translate(mw,mh)
//     zoom_ctx.rotate(-angle)
//     zoom_ctx.scale(zoomScale,zoomScale)
//     zoom_ctx.translate(-mw,-mh)
//     zoom_ctx.drawImage(video, 
//        (cx - mw), (cy - mh), w, h,
//         0,0,zh,zw);
    zoom_ctx.translate(+mw,+mh)
    zoom_ctx.scale(zoomScale,zoomScale)
    zoom_ctx.rotate(-angle)
    zoom_ctx.translate(-cx,-cy)
    zoom_ctx.drawImage(video,0,0) // Possible out of sync when playing
    //zoom_ctx.drawImage(videoCanvas,0,0)
    zoom_ctx.restore()
    
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if (zoomShowOverlay) {
      if (tag != null) {
          zoom_ctx.save()
          // Same transform as the image
          zoom_ctx.translate(+mw,+mh)
          zoom_ctx.scale(zoomScale,zoomScale)
          zoom_ctx.rotate(-angle)
          zoom_ctx.translate(-cx,-cy)
          let p = tag.p;
          
          // U shape of the tag (opening on the top)
          zoom_ctx.moveTo(p[0][0],p[0][1])
          zoom_ctx.lineTo(p[3][0],p[3][1])
          zoom_ctx.lineTo(p[2][0],p[2][1])
          zoom_ctx.lineTo(p[1][0],p[1][1])
          zoom_ctx.strokeStyle = 'blue'
          zoom_ctx.stroke()   
          
          let xa = (p[0][0]+p[1][0])/2
          let ya = (p[0][1]+p[1][1])/2
          let xb = (p[2][0]+p[3][0])/2
          let yb = (p[2][1]+p[3][1])/2
          let a0 = {x:xa+(xa-xb)*0.05,y:ya+(ya-yb)*0.05}
          let a1 = {x:xa+(xa-xb)*0.8,y:ya+(ya-yb)*0.8}
          plotArrow(zoom_ctx,a0, a1, 10)
          zoom_ctx.beginPath();
          zoom_ctx.moveTo(a0.x,a0.y)
          zoom_ctx.lineTo(a1.x,a1.y)
          zoom_ctx.stroke()
          
          let hh=2;
          zoom_ctx.fillStyle = 'red'
          zoom_ctx.fillRect(p[0][0]-hh,p[0][1]-hh,2*hh+1,2*hh+1)
          zoom_ctx.fillStyle = 'green'
          zoom_ctx.fillRect(p[1][0]-hh,p[1][1]-hh,2*hh+1,2*hh+1)
          zoom_ctx.fillStyle = 'blue'
          zoom_ctx.fillRect(p[2][0]-hh,p[2][1]-hh,2*hh+1,2*hh+1)
          zoom_ctx.fillStyle = 'yellow'
          zoom_ctx.fillRect(p[3][0]-hh,p[3][1]-hh,2*hh+1,2*hh+1)
          
          zoom_ctx.restore()
      } else {
      zoom_ctx.save()
      zoom_ctx.beginPath();
      zoom_ctx.moveTo(mw,0)
      zoom_ctx.lineTo(mw,zh)
      zoom_ctx.moveTo(0,mh)
      zoom_ctx.lineTo(zw,mh)
      zoom_ctx.strokeStyle = 'blue'
      zoom_ctx.stroke()   
      
      if (typeof tag !== 'undefined') {
          zoom_ctx.beginPath();
          zoom_ctx.rect(mw-3,mh-3,6,6)
          zoom_ctx.fillStyle = 'yellow'
          zoom_ctx.fill()   
      }     
      zoom_ctx.restore()
      }
    }
}

function refreshTagImage() {
    if (logging.zoomTag)
        console.log('refreshTagImage')
  
    let id=getCurrentID()
    if (typeof id === 'undefined') {
        return
    }
  
    let padding = 4
  
    let paddedID = String(id);
    let N=paddedID.length
    for (var i=0; i<padding-N; i++)
        paddedID='0'+paddedID;

    $('#tagImage').attr('src',tagImageRoot+'/keyed'+paddedID+'.png')
    
}

