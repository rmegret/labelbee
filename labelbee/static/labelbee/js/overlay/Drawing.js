/*jshint esversion: 6, asi: true */
// The drawing of the overlay on its canvas: bee IDs and event tracks, tags and tag tracks, ROI and exclude rects. ES module (refactor
// slice 8 step 11c4, ADR 0015), cut from overlay/Overlay.js as it was. Page globals (`overlay`, `chrono`, `videoControl`,
// `selection`...) are read at call time.

// Geometry of a fabric rotated rect (center, corners, unrotated box, angle), in canvas pixels; read by `fabric.BeeRect` and the plots
export function rotatedRectGeometry(rect) {
  // Compute various properties of Fabric.js rotated rect
  var geom = {};

  rect.setCoords(); // Compute coordinates
  var coords = rect.oCoords;
  //console.log(rect)
  let center = {
    x: (coords.tl.x + coords.br.x) / 2,
    y: (coords.tl.y + coords.br.y) / 2,
  };
  geom.center = center;
  geom.tl = { x: coords.tl.x, y: coords.tl.y };
  geom.tr = { x: coords.tr.x, y: coords.tr.y };
  geom.bl = { x: coords.bl.x, y: coords.bl.y };
  geom.br = { x: coords.br.x, y: coords.br.y };
  geom.unrotated = {
    left: center.x - rect.width / 2,
    top: center.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
  };

  if (typeof rect.angle !== "undefined") geom.angle = rect.angle;
  else geom.angle = 0;

  return geom;
}

// #MARK # CANVAS DRAWING: TRACKS AND EVENTS

// #MARK ## Bee ID and event tracks

/* Basic drawing */
function paintDot(ctx, pt, radius, color, id) {
  let x = pt.x,
    y = pt.y;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.closePath();
  ctx.fill();

  ctx.font = "10px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(String(id), x, y - radius - 3);
}
function wrapText(context, text, x, y, maxWidth, lineHeight, splitToken) {
  // From http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
  if (!splitToken) splitToken=" "
  var words = text.split(splitToken);
  var line = "";

  let y0 = y
  for (var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + " ";
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
  return y - y0 + lineHeight
}
function activityString(obs) {
  let acti = "";
  let b = Labels.bool_acts(obs);
  if (b[0]) acti += "F";
  if (b[1]) acti += "P";
  if (b[2]) acti += "E";
  if (b[3]) acti += "L";
  return acti;
}
function identify(ctx, rect, radius) {
  // old prototype: obs, x,y, color){

  var color;
  if (rect.draft) color = "green";
  else color = "yellow";

  //let x = rect.left + rect.width / 2;
  //let y = rect.top + rect.height / 2;
  let geom = rotatedRectGeometry(rect);
  let x = geom.center.x;
  let y = geom.center.y;

  console.log("identify ctx=", ctx, x, y);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.closePath();
  ctx.fill();

  ctx.font = "20px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";

  let obs = rect.obs;
  if (hasLabel(obs, "wrongid")) {
    ctx.fillStyle = "cyan";
    ctx.fillText(String(rect.id), x, y - radius - 3);
  } else {
    ctx.fillText(String(rect.id), x, y - radius - 3);
  }

  let acti = activityString(rect.obs);

  ctx.font = "10px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(acti, x, y + radius + 3);
  ctx.textBaseline = "alphabetic";
}

// Main function to display annotation info
export function identifyBeeRect(ctx, rect, radius, isActive) {
  let font

  var color = overlay.opts.ID_color
  // if (rect.status === "new")
  //     color = "green"
  // else if (rect.status === "db")
  //     color = "yellow"
  // else
  //     color = "red" //problem

  // Local coordinates ?
  let x = 0;
  let y = 0;

  //console.log('identifyBeeRect ctx=',ctx, x,y)

  ctx.save();

  let obs = rect.obs

  if (overlay.opts.showPredictedStatus) {
    let obs = getObsHandle(rect.obs.frame, rect.obs.ID)//rect.obs
    if (obs.predicted) {
      ctx.globalAlpha = 0.25
    } else {
      ctx.globalAlpha = 1.0
    }
  }

  // Compensate rotation to have upright labels
  ctx.rotate((-rect.angle / 180) * Math.PI);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.closePath();
  ctx.fill();

  if (!overlay.opts.showRect) {
    if (isActive) {
      // Compensate for the fact the selected rect will not have visible handles
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 3
      ctx.stroke();
    }
  }

  let ID_offset = 0
  if (overlay.opts.ID_offsetType=='top') {
    ID_offset = -(rect.height/2+3)
  } else {
    ID_offset = -(radius+3)
  }
  if (overlay.opts.showID) {
    //ctx.font = "20px Arial";
    font = '' + overlay.opts.ID_fontSize + 'px Arial'
    ctx.font = font
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    if (hasLabel(obs, 'wrongid')) {
      if (obs.newid == null) {
        ctx.fillStyle = "cyan";
        ctx.fillText(String(obs.ID), x, y + ID_offset);
      } else {
        ctx.font = "14px Arial";
        ctx.fillStyle = "cyan";
        ctx.fillText(String(obs.ID), x, y + ID_offset);
        ctx.font = "10px Arial";
        ctx.fillStyle = color;
        ctx.fillText(String(obs.newid), x, y + ID_offset - 13);
      }
    } else {
      ctx.fillText(String(rect.id), x, y + ID_offset);
    }
  }

  let labelOffset = 0
  if (overlay.opts.label_offsetType=='bottom') {
    labelOffset = (rect.height/2)+3
  } else {
    labelOffset = radius+3
  }
  if (overlay.opts.showSpan) {
    //ctx.font = "10px Arial";
    let obs = getObsHandle(rect.obs.frame, rect.obs.ID)//rect.obs
    if ((obs) && ('span' in obs)) {
      let spannotes = ''
      let f = obs.frame
      let f1 = Number(obs.span.f1)
      let f2 = Number(obs.span.f2)
      if (f2 != f1) {
        spannotes = '[' + f1 + '-' + f2 + ']'
      }
      font = '' + (overlay.opts.ID_fontSize / 2) + 'px Arial'
      ctx.font = font
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      wrapText(ctx, spannotes, x, y + labelOffset, 80, 10)
      labelOffset += overlay.opts.ID_fontSize / 2
    }
  }
  if (overlay.opts.showLabels) {
    let acti = overlay.opts.labelFormatter(rect.obs)
    //activityString(rect.obs)

    //ctx.font = "10px Arial";
    font = '' + (overlay.opts.ID_fontSize / 2) + 'px Arial'
    ctx.font = font
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (acti != '') {
      if (overlay.opts.wrapLabels) {
        labelOffset += wrapText(ctx, acti, x, y + labelOffset, overlay.opts.wrapLabelsWidth, 10, ",")
      } else {
        ctx.fillText(acti, x, y + labelOffset);
        labelOffset += overlay.opts.ID_fontSize / 2
      }
      ctx.textBaseline = 'alphabetic';
    }
  }
  if (overlay.opts.showNotes) {
    if (typeof rect.obs.notes !== 'undefined') {
      //ctx.font = "10px Arial";
      let notes = rect.obs.notes
      font = '' + (overlay.opts.ID_fontSize / 2) + 'px Arial'
      ctx.font = font
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      labelOffset += wrapText(ctx, notes, x, y + labelOffset, 80, 10)
    }
    //labelOffset += overlay.opts.ID_fontSize / 2
  }

  ctx.restore();
};

/* Obs tracks */
export function plotTracks(ctx) {
  let F = videoControl.getCurrentFrame();

  let win = getWindow();
  let fmin = win[0],
    fmax = win[1];
  let ids = getValidIDsForFrames(win);

  let color, radius
  const setColor = function (f) {
    if (f <= F) {
      color =
        "rgba(255,0,128," + (1 - Math.abs((f - F) / (fmin - F - 1))) + ")";
      //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
    } else {
      color =
        "rgba(0,128,128," + (1 - Math.abs((f - F) / (fmax - F + 1))) + ")";
    }
    return color;
  };
  const setColorS = function (f) {
    if (f <= F) {
      color = "rgba(255,0,0," + (1 - Math.abs((f - F) / (fmin - F - 1))) + ")";
      //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
    } else {
      color = "rgba(0,128,0," + (1 - Math.abs((f - F) / (fmax - F + 1))) + ")";
    }
    return color;
  };

  for (let id of ids) {
    // For each valid bee ID, create a track for it
    let isSelected = isCurrentSelection(id);
    let obs = getObsHandle(fmin, id, false);
    let x = undefined,
      y = undefined,
      z = 0;
    if (!!obs) {
      let rect = overlay.obsToCanvasRect(obs);
      //let geom = rotatedRectGeometry(rect)
      //x = geom.center.x
      //y = geom.center.y
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
      z = 1;
    }

    for (let f = fmin + 1; f <= fmax; f++) {
      let obs = getObsHandle(f, id, false);
      if (!obs) {
        z = 0;
        continue;
      }
      let rect = overlay.obsToCanvasRect(obs);
      let x2 = rect.left + rect.width / 2;
      let y2 = rect.top + rect.height / 2;
      //             let x2 = geom.center.x
      //             let y2 = geom.center.y
      let z2 = 1;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);

      ctx.lineWidth = 1;
      if (z) ctx.setLineDash([]);
      else ctx.setLineDash([10, 10]);
      if (isSelected) {
        ctx.strokeStyle = setColorS(f);
      } else {
        ctx.strokeStyle = setColor(f);
      }
      ctx.stroke();
      ctx.strokeStyle = "none";
      ctx.setLineDash([]);

      x = x2;
      y = y2;
      z = z2;
    }
    for (let f = fmin; f <= fmax; f++) {
      if (overlay.opts.showObs && f == F) continue;

      let obs = getObsHandle(f, id, false);
      if (!obs) continue;
      let rect = overlay.obsToCanvasRect(obs);

      //let geom = rotatedRectGeometry(rect)
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;

      if (isSelected) {
        color = setColorS(f);
      } else {
        color = setColor(f);
      }
      if (f == F) {
        color = "yellow";
      }

      radius = 3;
      paintDot(ctx, { x: x, y: y }, radius, color, id);

      let acti = activityString(obs);

      ctx.font = "8px Arial";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(acti, x, y + radius + 3);
      ctx.textBaseline = "alphabetic";
    }
  }
}

// #MARK ## Tag tracks

/* Access (`getTag` is in chrono/ChronoData.js) */
function isCurrentSelection(id) {
  return typeof selection.getId() !== "undefined" && id == selection.getId();
}
function tagCorners(tag) {
  if (typeof tag.p === "undefined") return undefined;
  let ppt = [];
  for (let i of [0, 1, 2, 3]) {
    ppt[i] = overlay.videoToCanvasPoint({ x: tag.p[i][0], y: tag.p[i][1] });
  }
  return ppt;
}
function tagUp(tag) {
  if (typeof tag.p === "undefined") return undefined;
  let p = tag.p;
  let ppt = tagCorners(tag);
  let dir = [ppt[1].x - ppt[2].x, ppt[1].y - ppt[2].y];
  let m = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
  dir = [dir[0] / m, dir[1] / m];
  return dir;
}
export function tagAngle(tag) {
  let up = tagUp(tag);
  if (typeof up === "undefined") return undefined;
  let angle = (Math.atan2(up[0], -up[1]) / Math.PI) * 180;
  return angle;
}
function tagSize(tag) {
  if (typeof tag.p === "undefined") return undefined;
  let p = tag.p;
  let d = { x: p[0][0] - p[1][0], y: p[0][1] - p[1][1] };
  let m = Math.sqrt(d.x * d.x + d.y * d.y);
  d = { x: p[2][0] - p[1][0], y: p[2][1] - p[1][1] };
  m += Math.sqrt(d.x * d.x + d.y * d.y);
  d = { x: p[2][0] - p[3][0], y: p[2][1] - p[3][1] };
  m += Math.sqrt(d.x * d.x + d.y * d.y);
  d = { x: p[3][0] - p[0][0], y: p[3][1] - p[0][1] };
  m += Math.sqrt(d.x * d.x + d.y * d.y);
  m /= 4;
  return m;
}

/* Basic drawing */
function plotTag(ctx, tag, color, flags) {
  if (!chrono.filters.sample(tag)) {
    return;
  }
  if (color === undefined) {
    if (tag.hamming == 0) color = "#ff0000";
    else if (tag.hamming == 2) color = "#ff6000";
    else color = "#ffb000";
  }
  if (typeof flags === "undefined") {
    flags = {
      id: true,
      radius: 5,
      simple: false,
    };
  }
  let radius = flags.radius;
  if (typeof radius === "undefined") {
    radius = 5;
  }

  let pt = overlay.videoToCanvasPoint({ x: tag.c[0], y: tag.c[1] });

  if (isCurrentSelection(tag.id)) {
    if (tag.frame == videoControl.getCurrentFrame()) {
      if (overlay.opts.showTagsOrientation) {
        plotTagOrientation(ctx, tag, "#00ff00");
      } else {
        ctx.beginPath();
        if (overlay.opts.tagMarker == "quad" && tag.p) {
          let p = tag.p;
          let q = [
            overlay.videoToCanvasPoint({ x: p[0][0], y: p[0][1] }),
            overlay.videoToCanvasPoint({ x: p[1][0], y: p[1][1] }),
            overlay.videoToCanvasPoint({ x: p[2][0], y: p[2][1] }),
            overlay.videoToCanvasPoint({ x: p[3][0], y: p[3][1] }),
          ];
          ctx.moveTo(q[0].x, q[0].y);
          ctx.lineTo(q[1].x, q[1].y);
          ctx.lineTo(q[2].x, q[2].y);
          ctx.lineTo(q[3].x, q[3].y);
          ctx.lineTo(q[0].x, q[0].y);
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
        } else if (overlay.opts.tagMarker == "cross") {
          ctx.moveTo(pt.x - 20, pt.y);
          ctx.lineTo(pt.x + 20, pt.y);
          ctx.moveTo(pt.x, pt.y - 20);
          ctx.lineTo(pt.x, pt.y + 20);
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
        } else if (overlay.opts.tagMarker == "circle") {
          // 'round'
          ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2, true);
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
        } else {
          //
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 4;
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.closePath();
    }
  } else {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.closePath();
    ctx.stroke();
    if (tag.frame == videoControl.getCurrentFrame() && overlay.opts.showTagsOrientation) {
      plotTagOrientation(ctx, tag, "magenta");
    }
  }

  if (flags.id === true) {
    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(String(tag.id), pt.x, pt.y + radius + 8);

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText("H" + tag.hamming, pt.x, pt.y + radius + 16);
  }
}
function plotTagOrientation(ctx, tag, color) {
  let pt = overlay.videoToCanvasPoint({ x: tag.c[0], y: tag.c[1] });
  let dir = tagUp(tag);
  if (typeof dir !== "undefined") {
    ctx.save();
    let L = 40,
      L1 = 35,
      W1 = 4;
    ctx.beginPath();
    ctx.moveTo(pt.x - dir[0] * L, pt.y - dir[1] * L);
    ctx.lineTo(pt.x + dir[0] * L, pt.y + dir[1] * L);
    ctx.lineTo(
      pt.x + dir[0] * L1 + dir[1] * W1,
      pt.y + dir[1] * L1 - dir[0] * W1
    );
    ctx.strokeStyle = color;
    if (tag.hamming > 2) ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
}
export function plotTags(ctx) {
  let F = videoControl.getCurrentFrame();
  let tagsFrame = AnnotationStore.getTags()[F];
  if (tagsFrame !== undefined) {
    let tags = tagsFrame.tags;
    //console.log('Found tags',tags)
    for (let i in tags) {
      let tag = tags[i];
      //console.log(tag)
      plotTag(ctx, tag);
    }

    let msg = "";
    for (let i in tags) {
      let tag = tags[i];
      msg =
        msg +
        tag.id +
        " H" +
        tag.hamming +
        " (" +
        tag.c[0] +
        "," +
        tag.c[1] +
        ")<br>";
    }
    $("#tagDetails")[0].innerHTML = msg;
    //console.log('plotTags: msg=',msg)
  }
}

function plotTrackArrow(ctx, p0, p1, L) {
  let u = { x: p1.x - p0.x, y: p1.y - p0.y };
  let n = Math.sqrt(u.x * u.x + u.y * u.y);
  u.x = u.x / n;
  u.y = u.y / n;
  ctx.beginPath();
  ctx.moveTo(p1.x + L * (-u.x - 0.6 * u.y), p1.y + L * (-u.y + 0.6 * u.x));
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p1.x + L * (-u.x + 0.6 * u.y), p1.y + L * (-u.y - 0.6 * u.x));
  ctx.stroke();
}

/* Tag tracks */
export function plotTagsTracks(ctx) {
  let F = videoControl.getCurrentFrame();

  let win = getWindow();
  let fmin = win[0],
    fmax = win[1];
  let frange = F - fmin > fmax - F ? F - fmin : fmax - F;

  let tProx = function (f) {
    return Math.max(0, 1 - Math.abs((f - F) / frange));
  };
  let tProxSigned = function (f) {
    return Math.max((f - F) / frange);
  };
  let setColor = function (f, alpha) {
    if (alpha == null) alpha = 1.0;
    var color;
    if (false) {
      let T = tProx(f);
      if (f <= F) {
        color = "rgba(255,0,0," + T + ")";
      } else {
        color = "rgba(0,0,255," + T + ")";
      }
    } else {
      let T = tProx(f) * alpha;
      let S = tProxSigned(f) / 2 + 0.5;
      let r = Math.round(255 * (1 - S));
      let g = 0;
      let b = Math.round(255 * S);
      color = "rgba(" + r + "," + g + "," + b + "," + T + ")";
    }
    return color;
  };

  if (overlay.opts.showTagsTracks) {
    // Plot past and future tag positions

    for (var id in chronoState.ttags) {
      let tagline = chronoState.ttags[id];
      if (typeof tagline === "undefined") continue;

      let p0 = null;
      for (let fs in tagline) {
        let f = Number(fs);
        let tag = tagline[f];

        if (f < fmin || f > fmax) continue;
        if (!chrono.filters.sample(tag)) {
          continue;
        }

        let color = setColor(f);

        if (!tagHasCenter(tag)) {
          if (logging.tagMissCenter) console.log("plotTagsTracks, all tag tracks: tag " + id + " at frame " + f + " has no center c, skipped", tag);
          continue;
        }
        //console.log(tag)
        let p1 = overlay.videoToCanvasPoint({ x: tag.c[0], y: tag.c[1] });
        p1.frame = f;

        if (p0 != null && Number(p1.frame) - Number(p0.frame) <= 40) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          if (tag.hamming < 1000 && Number(p1.frame) - Number(p0.frame) <= 1) {
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            color = setColor(f);
          } else {
            //ctx.setLineDash([3,3])
            ctx.lineWidth = 1;
            color = setColor(f, 0.5);
          }
          ctx.strokeStyle = color;
          ctx.stroke();
          ctx.setLineDash([]);
          plotTrackArrow(ctx, p0, p1, 6 * tProx(f) + 1);
          ctx.restore();
        }
        p0 = { x: p1.x, y: p1.y, frame: p1.frame };

        if (tag.hamming < 1000)
          plotTag(ctx, tag, color, { id: false, radius: tProx(f) + 1 });
        else plotTag(ctx, tag, color, { id: false, radius: tProx(f) + 1 });
      }
    }
  }

  if (overlay.opts.showSelectedTagsTracks) {
    // Plot track of selected bee
    if (typeof selection.getId() !== "undefined") {
      let setColor2 = function (f, alpha) {
        if (alpha == null) alpha = 1.0;
        var color;
        if (false) {
          let T = tProx(f);
          if (f <= F) {
            color = "rgba(255,255,0," + T + ")";
          } else {
            color = "rgba(128,255,128," + T + ")";
          }
        } else {
          let T = tProx(f) * alpha;
          let S = tProxSigned(f) / 2 + 0.5;
          let r = Math.round(128 + 127 * (1 - S));
          let g = 255;
          let b = Math.round(128 * S);
          color = "rgba(" + r + "," + g + "," + b + "," + T + ")";
        }
        return color;
      };

      //console.log('selection.getId()=',selection.getId())
      let p0 = [];
      for (let f = fmin; f <= fmax; f++) {
        let tagsFrame = AnnotationStore.getTags()[f];
        if (typeof tagsFrame === "undefined") continue;
        let tags = tagsFrame.tags;

        let ii = -1;
        for (let i in tags) {
          if (tags[i].id == selection.getId()) {
            ii = i;
            break;
          }
        }
        if (ii < 0) continue;
        let tag = tags[ii];
        {
          //console.log('tag=',tag)
          if (!tag) continue;

          if (!chrono.filters.sample(tag)) {
            continue;
          }

          let color2 = setColor2(f);

          if (!tagHasCenter(tag)) {
            if (logging.tagMissCenter) console.log("plotTagsTracks, selectedTagTrack: tag " + tag.id + " at frame " + f + " has no center c, skipped", tag);
            continue;
          }
          //console.log(tag)
          let p1 = overlay.videoToCanvasPoint({ x: tag.c[0], y: tag.c[1] });
          p1.frame = f;

          if (
            p0 != null &&
            p0[tag.id] != null &&
            Number(p1.frame) - Number(p0[tag.id].frame) <= 40
          ) {
            //                if (typeof p0[tag.id] !== 'undefined') {

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p0[tag.id].x, p0[tag.id].y);
            ctx.lineTo(p1.x, p1.y);
            if (
              tag.hamming < 1000 &&
              Number(p1.frame) - Number(p0[tag.id].frame) <= 1
            ) {
              ctx.setLineDash([]);
              ctx.lineWidth = 2;
              color2 = setColor2(f);
            } else {
              //ctx.setLineDash([3,3])
              ctx.lineWidth = 1;
              color2 = setColor2(f, 0.5);
            }
            ctx.strokeStyle = color2;
            ctx.stroke();
            ctx.setLineDash([]);
            plotTrackArrow(ctx, p0[tag.id], p1, 6 * tProx(f) + 1);
            ctx.restore();
          }
          p0[tag.id] = { x: p1.x, y: p1.y, frame: p1.frame };

          // No need for tag with arrow plot, except if only ont point
          plotTag(ctx, tag, color2, { id: false, radius: tProx(f) + 1 });
        }
      }
    }
  }

  if (false) {
    // Done in plotTag
    // Plot current tag position
    let f = F;
    let tagsFrame = AnnotationStore.getTags()[f];
    if (typeof tagsFrame !== "undefined") {
      let tags = tagsFrame.tags;
      let color = setColor(f);
      for (let i in tags) {
        let tag = tags[i];
        //console.log(tag)

        plotTag(ctx, tag, color, { id: true });
      }
    }
  }
}

// #MARK # OVERLAY PARAMETERS MANAGEMENT

/* ROI and exclude rects: drawing only. State and filters are in chrono/ChronoData.js (`chrono.config.region`),
   buttons and dialog in chrono/ChronoControlInteraction.js */
// Plot
export function plotROI(ctx) {
  if (!chrono.config.region.useROI) return;

  let R = {
    left: chrono.config.region.ROI.left,
    top: chrono.config.region.ROI.top,
    width: chrono.config.region.ROI.right - chrono.config.region.ROI.left,
    height: chrono.config.region.ROI.bottom - chrono.config.region.ROI.top,
  };
  let R2 = overlay.videoToCanvasRect(R);

  ctx.save();
  ctx.beginPath();
  ctx.rect(R2.left, R2.top, R2.width, R2.height);
  ctx.strokeStyle = "#fff";
  //ctx.setLineDash([4,4])
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  //ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(0, 0, overlay.canvas.width, R2.top);
  ctx.fillRect(0, R2.top, R2.left, R2.height);
  ctx.fillRect(
    R2.left + R2.width,
    R2.top,
    overlay.canvas.width - R2.left - R2.width,
    R2.height
  );
  ctx.fillRect(
    0,
    R2.top + R2.height,
    overlay.canvas.width,
    overlay.canvas.height - R2.top - R2.height
  );
  ctx.restore();
}

// Plot
export function plotExcludeRects(ctx) {
  if (!chrono.config.region.useExcludeRects) return;
  //console.log('plotExcludeRects')
  for (let r of chrono.config.region.excludeRects) {
    let R = {
      left: r.cx - r.w / 2,
      top: r.cy - r.h / 2,
      width: r.w,
      height: r.h,
    };
    let R2 = overlay.videoToCanvasRect(R);

    //console.log("r=",r, " R=",R, " R2=",R2)

    ctx.save();
    ctx.beginPath();
    ctx.rect(R2.left, R2.top, R2.width, R2.height);
    ctx.strokeStyle = "#fd0";
    //ctx.setLineDash([4,4])
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    //ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillStyle = "rgba(255,200,100,0.5)";
    ctx.fillRect(R2.left, R2.top, R2.width, R2.height);
    ctx.restore();
  }

  if (chrono.config.region.excludeRectSelection >= 0) {
    let r = chrono.config.region.excludeRects[chrono.config.region.excludeRectSelection];
    let R = {
      left: r.cx - r.w / 2,
      top: r.cy - r.h / 2,
      width: r.w,
      height: r.h,
    };
    let R2 = overlay.videoToCanvasRect(R);

    ctx.save();
    ctx.beginPath();
    ctx.rect(R2.left, R2.top, R2.width, R2.height);
    ctx.strokeStyle = "#fff";
    //ctx.setLineDash([4,4])
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/* A partial tag (for instance only {id, frame} from an events CSV) has no center `c` */
function tagHasCenter(tag) {
  return tag.c != null && tag.c[0] != null && tag.c[1] != null;
}
