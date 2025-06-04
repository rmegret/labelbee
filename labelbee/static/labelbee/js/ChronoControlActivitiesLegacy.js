

// ### CHRONO D3 ACTIVITY INTERVALS
var __section__chronogram_d3_prepare_activities_legacy

// chronogramData => allIntervals
function createIntervalList_legacy() {
  //initiliaze allIntervals to update data
  let tempCoordinates = {};

  for (var i = 0; i < chronogramData.length; i++) {
    if (chronogramData[i].id in tempCoordinates) {
      //Make sure y coordinate is not in tempCoordiantes
      tempCoordinates[chronogramData[i].id].push(i);
    } else {
      //Create new beeId key with it's x coordiantes as value
      tempCoordinates[chronogramData[i].id] = [];
      tempCoordinates[chronogramData[i].id].push(i);
    }
  }
  //initiliaze allIntervals to update data
  allIntervals = [];
  acts = ["", "pollen", "entering", "leaving", "fanning"];
  for (var a of acts) {
    for (var id in tempCoordinates) {
      let xValues = [];

      let iArray = tempCoordinates[id];

      iArray = iArray.filter(function (i) {
        return chronogramData[i].Activity == a;
      });

      if (iArray.length == 0) {
        continue;
      }

      let passThroughROI=false
      for (let j = 0; j < iArray.length; j++) {
        xValues[j] = Number(chronogramData[iArray[j]].x);
      }

      let iData = chronogramData[iArray[0]];
      let tempInterval = {
        x1: xValues[0],
        x2: xValues[0],
        y: iData.y,  // XXX Reuse y
        id: id,
        Activity: iData.Activity,
        labels: iData.labels,
        pollen: iData.pollen,
        tag: iData.tag,
        obs: iData.obs,
        passThroughROI: iData.inROI,
        startInsideROI: iData.inROI,
        endInsideROI: iData.inROI
      };

      // let tempInterval = { x1: xValues[0], x2: xValues[0], y: y,
      //     Activity: iData.Activity, pollen: iData.pollen, issue: "" };

      for (var i = 1; i < xValues.length; i++) {
        let iData = chronogramData[iArray[i]];
        // console.log("Act temp interval IN: ", tempInterval[i].Activity);
        if (xValues[i] - xValues[i - 1] == 1) {
          tempInterval.x2 = xValues[i]; //Extend the existing interval
          tempInterval.pollen |= iData.pollen;
          tempInterval.passThroughROI |= iData.inROI
          tempInterval.endInsideROI = iData.inROI
        } else {
          allIntervals.push(tempInterval);
          tempInterval = {
            x1: xValues[i],
            x2: xValues[i],
            y: iData.y,  // XXX Reuse y
            id: id,
            Activity: iData.Activity,
            labels: iData.labels,
            pollen: iData.pollen,
            tag: iData.tag,
            obs: iData.obs,
            passThroughROI: iData.inROI,
            startInsideROI: iData.inROI,
            endInsideROI: iData.inROI
          }; // New interval
        }
      }
      allIntervals.push(tempInterval);
    }
  }

  // Filter out
  if (flag_useROI)
    allIntervals = allIntervals.filter( interval => interval.passThroughROI )

  // Pass extra data from chronogramData to allInterval
  for (let interval of allIntervals) {
    var tempArray = interval.labels.split(",");
    if (tempArray.includes("wrongid")) {
      interval.wrongid = true;
      interval.newid = interval.obs.newid;
    }
  }

  // Subsets of allIntervals
  crosses = allIntervals.filter(function (d) {
    var tempArray = d.labels.split(",");
    if (tempArray.includes("falsealarm") || tempArray.includes("wrongid")) {
      return true;
    }
  });
  rectIntervals = allIntervals.filter(function (d) {
    return d.x1 != d.x2;
  });
  circlesIntervals = allIntervals.filter(function (d) {
    return d.x1 == d.x2;
  });
  partsIntervals = allIntervals.filter(function (d) {
    return hasParts(d.obs);
  });
}

// ### CHRONO D3 ACTIVITY INTERVALS
var __section__chronogram_d3_activities_legacy

function initActivities() {
  //chronogramData = []
  chronogramData.length = 0;
  updateActivities();
}

function onActivityClick(event, d) {
  console.log("CLICK Activity d=", d);
  // Prevent default chronogram click to go to the correct frame
  event.stopPropagation();

  gotoEvent(d.x1, d.id);
}
function onObsSpanClick(event, obsspan) {
  console.log("CLICK ObsSpan obsspan=", obsspan);
  // Prevent default chronogram click to go to the correct frame
  event.stopPropagation();

  gotoEvent(obsspan.frame, obsspan.id);
}

//black orb rectangles are made here
function insertActivities(selection) {
  //console.log('selection=',selection)
  selection
    .insert("rect")
    .attr("class", "activity")
    .style("stroke-width", "1px")
    .on("click", onActivityClick)
    .call(setGeomActivity);
}

//v2 of intervals
//Unlike the circles coordinates, the rectangles are being created here because if they're added
//at the updateActivity function, there will be a uncought typeError
function setGeomActivity(selection) {
  selection
    .attr("x", d => axes.xScale(d.x1) )
    .attr("y", d => axes.yScale(d.y) )
    .attr("width", d => axes.xScale(d.x2 + 1) - axes.xScale(d.x1) )
    .attr("height", d => axes.yScale.bandwidth() / 2 )
    .style("fill", "gray");
  //.style("stroke", activityColor);
  //Add text to display annotation info
  selection.select("rect").selectAll("title").remove();
  selection
    .select("rect")
    .append("title")
    .text(function (d) {
      return (
        "Bee ID: " + d.id +
        " Start Frame: " + d.x1 +
        " End Frame: " + (d.x2 + 1) +
        " Activity: " + d.Activity
      );
    });
}

// Entering visuals
function initEntering(input) {
  input
    .insert("rect")
    .attr("width", "1px")
    .attr("class", "entering")
    .on("click", onActivityClick);
}
function updateEntering(input) {
  input
    .attr("x", d => axes.xScale(d.x1) )
    .attr("y", d => axes.yScale(d.y) )
    .attr("width", "4px")
    .attr("height", d => axes.yScale.bandwidth() / 2 )
    .style("fill", "green");
}

//create exit visuals
function initLeaving(input) {
  input
    .insert("rect")
    .attr("width", "1px")
    .attr("class", "leaving")
    .on("click", onActivityClick);
}
function updateLeaving(input) {
  input
    .attr("x", d => axes.xScale(d.x2) )
    .attr("y", d => axes.yScale(d.y) )
    .attr("width", "4px")
    .attr("height", d => axes.yScale.bandwidth() / 2 )
    .style("fill", "red");
}

//Create Pollen visuals
function initPollen(input) {
  input
    .insert("rect")
    .attr("width", "1px")
    .attr("class", "pollen")
    .on("click", onActivityClick);
}
function updatePollen(input) {
  input
    .attr("x", d => axes.xScale(d.x1) )
    .attr("y", d => axes.yScale(d.y) )
    .attr("width", d => axes.xScale(d.x2 + 1) - axes.xScale(d.x1) )
    .attr("height", d => axes.yScale.bandwidth() / 2 )
    .style("fill", "yellow");
}

//Create Fanning visuals
function initFanning(input) {
  input
    .insert("rect")
    .attr("width", "1px")
    .attr("class", "fanning")
    .on("click", onActivityClick);
}
function updateFanning(input) {
  input
    .attr("x", d => axes.xScale(d.x1) )
    .attr("y", d => axes.yScale(d.y) + axes.yScale.bandwidth() / 2 )
    .attr("width", d => axes.xScale(d.x2 + 1) - axes.xScale(d.x1) )
    .attr("height", d => axes.yScale.bandwidth() / 2 )
    .style("fill", "purple");
}

// Common color and height channels
function activityColor(d) {
  var color = "gray";
  if (d.Activity == "pollen") color = "#CFCF00";
  else if (d.Activity == "entering") color = "#FF0000";
  else if (d.Activity == "leaving") color = "#0000FF";
  else if (d.Activity == "fanning") color = "#20FF20";
  return color;
}
function activityHeight(d) {
  var h = 2;
  if (d.Activity == "entering") h = 4;
  else if (d.Activity == "leaving") h = 4;
  else if (d.Activity == "pollen") h = 6;
  else if (d.Activity == "fanning") h = 6;
  return h;
}

//Create item span visuals
function initObsSpan(selection) {
  //console.log('selection=',selection)
  selection
    .insert("rect")
    .attr("class", "obsspan")
    .style("stroke-width", "1px")
    //.on('click',onObsSpanClick)
    .call(updateObsSpan);
}

function updateObsSpan(selection) {
  selection
    .attr("x", function (d) {
      return axes.xScale(d.span.f1);
    })
    .attr("y", function (d) {
      return axes.yScale(d.y); // ordinal   // XXX Use y
      //axes.yScale(d.id)+axes.yScale.bandwidth()/2; // ordinal
    })
    .attr("width", function (d) {
      return axes.xScale(d.span.f2 + 1) - axes.xScale(d.span.f1);
    })
    .attr("height", function (d) {
      return axes.yScale.bandwidth(); //axes.yScale.bandwidth()/2;
    })
    .style("fill", "none")
    .style("stroke", "red")
    .style("pointer-events", "all")
    // Display tooltip message
    .on("click", onObsSpanClick);
  /*
        .on("mouseover", function(obsspan){
            var d = obsspan.obs;
            
            var message = "";
            message += "BeeID=" + d.ID + " Frame=" + d.frame
                    + "<br>Time=" + format_HMS(videoControl.frameToTime(d.frame))
                    + "<br><u>Annotation:</u>"+
                     "<br>Labels=" + d.labels;
            if (d.wrongid) {
                message += '<br>newid='+d.newid
            }
            if (d.tag != undefined){
                message += 
                    "<br><u>Tag:</u>"+
                    "<br>Hamming=" + d.tag.hamming + 
                    "<br>DM=" + d.tag.dm;
            } else {
                message += "<br><u>Tag:</u><br><i>None</i>"
            }
            
            var tooltip = d3.select("body").selectAll(".tooltip")
            tooltip.style("left",d3.event.pageX + "px")
                   .style("top",d3.event.pageY + "px")
                   .style("visibility", "visible")
                   .html(message);
        })
        .on("mouseout", function(d){ 
            var tooltip = d3.select("body").selectAll(".tooltip")
            tooltip.style("visibility", "hidden");
          });
          */
}

function updateAlertCircle(selection) {
  selection.exit().remove();
  selection
    .enter()
    .insert("circle")
    .attr("class", "alertcircle")
    .style("fill", "none")
    .style("stroke-width", "2px")
    //.on('click',onActivityClick)
    .call(updateObsSpan);
  selection
    .attr("cx", function (d) {
      return axes.xScale(d.frame);
    })
    .attr("cy", function (d) {
      return axes.yScale(d.y) + axes.yScale.bandwidth() / 2; // ordinal  // XXX Use y
    })
    .attr("r", 7)
    .style("stroke", "cyan");
}


function removeActivities(){
  svgInterval.selectAll(".activity").remove()
  svgSpanRects.selectAll(".obsspan").remove()
  svgTop.selectAll(".alertcircle").remove()
  svgTop.selectAll(".pollen").remove()
  svgTop.selectAll(".fanning").remove()
  svgTop.selectAll(".entering").remove()
  svgTop.selectAll(".leaving").remove()
  svgTop.selectAll("circle.obs").remove()
  
  svgInterval.selectAll("*").remove()
  svgTop.selectAll("*").remove()
}
// Render Activities
// INPUTS: allIntervals, flatTracks
function updateActivities(onlyScaling) {
  // Redraw activities
  if (onlyScaling) {
    // Lightweight update (reuse previous activityRects)
    let activityRects = svgInterval.selectAll(".activity").data(allIntervals);
    activityRects.call(setGeomActivity);
  } else {
    //createIntervalList(); // Should be done only on update data

    // Full update
    let activityRects = svgInterval.selectAll(".activity").data(allIntervals);

    activityRects.call(setGeomActivity);
    activityRects.enter().call(insertActivities);
    activityRects.exit().remove();

    if (flag_showIndividualEvents) {
      let spanRects = svgSpanRects.selectAll(".obsspan").data(flatTracks);
      spanRects.enter().call(initObsSpan);
      spanRects.exit().remove();
      spanRects.call(updateObsSpan);

      let alertCircle = svgTop
        .selectAll(".alertcircle")
        .data(flatTracks.filter((d) => !!d.isredundant));
      alertCircle.call(updateAlertCircle);
    } else {
      let spanRects = svgSpanRects.selectAll(".obsspan").data([]);
      spanRects.exit().remove();

      let alertCircle = svgTop.selectAll(".alertcircle").data([]);
      alertCircle.call(updateAlertCircle);
    }

    //Object for pollen visuals
    let insertPollen = svgTop.selectAll(".pollen")
      .data( allIntervals.filter( d => d.Activity == "pollen" ) )

    insertPollen.enter().call(initPollen);
    insertPollen.exit().remove();
    insertPollen.call(updatePollen);

    //Object for fanning visuals
    let insertFanning = svgTop.selectAll(".fanning").data(
      allIntervals.filter(function (d) {
        return d.Activity == "fanning";
      })
    );

    insertFanning.enter().call(initFanning);
    insertFanning.exit().remove();
    insertFanning.call(updateFanning);

    //Object to create enter visuals
    let insertEnter = svgTop.selectAll(".entering").data(
      allIntervals.filter(function (d) {
        return d.Activity == "entering";
      })
    );

    insertEnter.enter().call(initEntering);
    insertEnter.exit().remove();
    insertEnter.call(updateEntering);

    //Object for exit visuals
    let insertLeaving = svgTop.selectAll(".leaving").data(
      allIntervals.filter(function (d) {
        return d.Activity == "leaving";
      })
    );

    insertLeaving.enter().call(initLeaving);
    insertLeaving.exit().remove();
    insertLeaving.call(updateLeaving);
  }

  var chart = svgTop;

  //Circles for solo bee iD
  let circles = chart.selectAll("circle.obs").data(allIntervals);

  d3.select("body").selectAll(".tooltip").remove();

  var tooltip = d3
    .select("body")
    .append("div")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("opacity", "1")
    .attr("class", "tooltip");

  circles
    .enter()
    .append("circle")
    .attr("class", "obs")
    .on("click", onActivityClick)
    .append("title"); //Add circle chronoGroup
  circles.exit().remove();
  //Update circles
  circles
    .attr("cx", function (d) {
      return axes.xScale(Number(d.x1));
    })
    .attr("cy", function (d) {
      return axes.yScale(d.y) + axes.yScale.bandwidth() / 2;  // XXX Use y
    })
    .attr("r", 5) //change radius
    .style("stroke", function (d) {
      var color = "black";
      if (d.pollen) {
        color = "ffbb00";
      }
      return color;
    })
    .style("stroke-width", function (d) {
      var width = 1;
      if (d.pollen) {
        width = 3;
      }
      return width;
    })

    circles.style("fill", function (d) {
          var color = "black";
          if (d.Activity == "fanning") color = "#99CCFF";
          else if (d.Activity == "pollen") color = "#FFFF00";
          else if (d.Activity == "entering") color = "#FFC0C0";
          else if (d.Activity == "leaving") color = "#C0FFC0";
          return color;
      })
    // Display tooltip message
    circles
    .on("mouseover", function (event, d) {
      var message = "";
      message +=
        "BeeID=" +
        d.id +  // xxx Use id
        " Frame=" +
        d.x1 +
        "<br>Time=" +
        format_HMS(videoControl.frameToTime(d.x1)) +
        "<br><u>Annotation:</u>" +
        "<br>Labels=" +
        d.labels;
      if (d.wrongid) {
        message += "<br>newid=" + d.newid;
      }
      if (d.tag != undefined) {
        message +=
          "<br><u>Tag:</u>" +
          "<br>Hamming=" +
          d.tag.hamming +
          "<br>DM=" +
          d.tag.dm;
      } else {
        message += "<br><u>Tag:</u><br><i>None</i>";
      }
      tooltip
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px")
        .style("visibility", "visible")
        .html(message);
    })
    .on("mouseout", function (event, d) {
      tooltip.style("visibility", "hidden");
    });

  var lineFunction = d3.line()
    .x(function (d) {
      return d.x;
    })
    .y(function (d) {
      return d.y; // XXX Use y
    })
    .curve(d3.curveLinear);

  function crossFunction(x, y, r) {
    x = Number(x);
    y = Number(y);
    if (!r) {
      r = 10;
    }

    return (
      "M" +
      (x - r) +
      "," +
      (y - r) +
      "L" +
      (x + r) +
      "," +
      (y + r) +
      "M" +
      (x + r) +
      "," +
      (y - r) +
      "L" +
      (x - r) +
      "," +
      (y + r)
    );
  }

  //Append line to chronogram
  let path = chart.selectAll(".crossLeft").data(crosses);
  //filter for labels, split it refreshChronogram so no need

  path.enter().append("path").attr("class", "crossLeft");
  // Caution: check CSS property pointer-events:
  // crossLeft does not receive mouse events

  path
    .attr("d", function (d) {
      var X = axes.xScale(Number(d.x1)),
        Y = axes.yScale(d.y) + axes.yScale.bandwidth() / 2;  // XXX Use y
      //if((d.labels == "wrongid") && (d.newid != null))
      //    return crossFunction(X,Y,5);
      return crossFunction(X, Y, 5);
    })
    .attr("stroke", function (d) {
      var color = "black";
      if (d.labels == "falsealarm") color = "red";
      else if (d.labels == "wrongid") color = "#009fff";
      return color;
    })
    .attr("stroke-width", function (d) {
      var width = 3;
      if (d.labels == "wrongid" && d.newid != null) width = 1.5;
      return width;
    })
    .attr("fill", "none");
  path.exit().remove();

  function squareFunction(x, y) {
    x = Number(x);
    y = Number(y);

    return (
      "M" +
      (x - 10) +
      "," +
      (y - 10) +
      "L" +
      (x + 10) +
      "," +
      (y + 10) +
      "M" +
      (x + 10) +
      "," +
      (y - 10) +
      "L" +
      (x - 10) +
      "," +
      (y + 10)
    );
  }

  renderChrono_Parts(onlyScaling)

  //renderChrono_Dangling(onlyScaling)
}
function renderChrono_Parts(onlyScaling) {
  const chart = svgTop;

  if (!flag_showPartsOnChrono) {
    chart.selectAll(".partsAvailable").remove();
    return
  }

  //Append line to chronogram
  let parts = chart.selectAll(".partsAvailable").data(partsIntervals);
  //filter for labels, split it refreshChronogram so no need

  // Caution: check CSS property pointer-events:
  // partsAvailable does not receive mouse events

  parts
    .join("rect")
    .attr("class", "partsAvailable")
    .attr("x", function (d) {
      return axes.xScale(Number(d.x1)) - axes.yScale.bandwidth() / 2;
    })
    .attr("y", function (d) {
      return axes.yScale(d.y);  // XXX Use y
    })
    .attr("width", axes.yScale.bandwidth())
    .attr("height", axes.yScale.bandwidth())
    .attr("stroke", function (d) {
      var color = "black";
      return color;
    })
    .attr("stroke-width", 1)
    .attr("fill", "none");
  //parts.exit().remove();
}



// ### CHRONO D3 TAGS
var __section__chronogram_d3_tags_legacy


function onTagClick(event, tagInterval) {
  console.log("CLICK Tag tagInterval=", tagInterval);
  // Prevent default chronogram click to go to the correct frame
  event.stopPropagation();

  gotoEvent(Number(tagInterval.begin), tagInterval.id);
}

function insertTag(selection) {
  selection
    .insert("rect")
    .style("fill", "blue")
    .style("fill-opacity", "0.2")
    .style("stroke", "blue")
    .style("stroke-width", "1px")
    //.attr("r",5)
    .attr("class", "tag")
    .on("click", onTagClick)
    .call(setTagGeom);
}
function setTagGeom(selection) {
  // Tag interval
  let H = axes.yScale.bandwidth();
  function tagHeight(d) {
    if (d.hammingavg > 2) return H / 4;
    else return (H * (4 - d.hammingavg)) / 4;
  }
  selection
    .attr("x", function (d) {
      //return xScale(Number(d.frame) - 0.5);
      return axes.xScale(Number(d.begin));
    })
    .attr("y", function (d) {
      return axes.yScale(d.y) + H - tagHeight(d);  // XXX Use y  // tagIntervals?
    })
    .attr("width", function (d) {
      return axes.xScale(Number(d.end) + 1) - axes.xScale(Number(d.begin));
    })
    .attr("height", function (d) {
      return tagHeight(d); // Ordinal scale
    })
    .style("fill", function (interval) {
      if (interval.virtual) return "white";
      if (interval.labeling.entering) {
        //console.log('setTagGeom: found entering, d=',d)
        return "#ff00c0";
      } else if (interval.labeling.leaving) {
        //console.log('setTagGeom: found entering, d=',d)
        return "#00ef00";
      } else {
        return "blue";
      }
    })
    .style("stroke", function (interval) {
      if (interval.labeling.entering) return "#ff00c0";
      else if (interval.labeling.leaving) return "#00e000";
      else return "blue";
    })
    .style("fill-opacity", function (interval) {
      if (interval.virtual) return "0.1";
      else return "0.2";
    });
  if (true) {
    d3.select("body").selectAll(".tooltip2").remove();

    var tooltip2 = d3
      .select("body")
      .append("div")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .style("opacity", "1")
      .attr("class", "tooltip2");

    selection
      .style("z-index", "1000")
      .style("pointer-events", "all")
      //.on("wheel", function(){console.log('got wheeled')})
      .on("mouseover", function (event, taginterval) {
        //console.log('mouseover: ',taginterval)
        var message = "";
        if (taginterval) {
          message +=
            "BeeID=" +
            taginterval.id +
            " Frame=" +
            taginterval.begin +
            "<br>Time=" +
            format_HMS(videoControl.frameToTime(taginterval.begin)) +
            "<br><u>Tag:</u>" +
            "<br>HammingAvg=" +
            taginterval.hammingavg +
            "<br>DM=" +
            taginterval.dmavg;
        } else {
          message += "<u>Tag:</u><br><i>None</i>";
        }
        tooltip2
          .style("left", event.pageX + "px")
          .style("top", event.pageY + "px")
          .style("visibility", "visible")
          .html(message);
        //             // Highlight source tag for wrongid annotations
        //             if (taginterval && typeof taginterval.oldid != 'undefined') {
        //                 message += '<br>virtualtag: oldid='+taginterval.oldid
        //                     selection
        //                     .filter(d=>(d.id==taginterval.oldid) && (d.begin==taginterval.begin))
        //                     .style("fill","green")
        //                     .style("stroke","green")
        //             }
      })
      .on("mouseout", function (event, taginterval) {
        tooltip2.style("visibility", "hidden");
        //             setTagGeom(selection
        //                     .filter(d=>(d.id==taginterval.oldid) && (d.begin==taginterval.begin))
        //             )
      });
  }
  //.attr("hidden", function(d) {return (typeof axes.yScale(d.id));})
}
function renderTagIntervals(onlyScaling) {
  // Redraw tag intervals
  if (onlyScaling) {
    setTagGeom(tagSel);
  } else {
    tagSel = svgTag.selectAll(".tag").data(tagIntervals);
    tagSel.enter().call(insertTag);
    tagSel.exit().remove();
    tagSel.call(setTagGeom);
  }
}
function initTagIntervals() {
  //tagsData = []
  tagIntervals = [];
  renderTagIntervals();
}
