
function ChronoAxes(parent, videoinfo, options) {
    // Create by passing the SVG parent element as D3 selector
    // Axes adjust automatically to SVG size
    // videoinfo should have fields fps and starttime

    var axes = this 
    axes.parent = parent
    axes.selectedID = null
    
    /* ### MODEL/VIEW: Layout sizes ### */
    
    var margin = {
            left: 60,
            top: 15,
            right: 20,
            bottom: 50
        }
        
    // Local variables visible throughout the function
    // Updated by recomputeSizes()
    var svgWidth, svgHeight
    var left, top, width, height
    
    function recomputeSizes() {
        // Get actual width of parent SVG
        svgWidth  = parent.node().width.baseVal.value
        svgHeight = parent.node().height.baseVal.value
    
        // Compute position/dimensions of plotArea
        left = margin.left
        top = margin.top
        width = svgWidth - margin.left - margin.right
        height = svgHeight - margin.top - margin.bottom
        
//         console.log({
//             svgWidth: svgWidth,
//             svgHeight: svgHeight,
//             left: left,
//             top: top,
//             width: width,
//             height: height
//         })
    }
    recomputeSizes()
    
    // Layout sizes exports
    axes.margin = margin
    // axes.recomputeSizes = recomputeSizes // Private. Called by refreshLayout()
    /* Getters for accessing computer layout */
    axes.width = function() {
        return width // Return local private variable
    }
    axes.height = function() {
        return height // Return local private variable
    }
    axes.top = function() {
        return top
    }
    axes.left = function() {
        return left
    }
    
    /* ### INTERNAL MODEL for the axes: scales */
    
    axes.videoinfo = videoinfo

    // ## Scale objects (model that maps (frames,id) to pixels)
    var xScale = d3.scale.linear()
        .range([0, width])
    var tScale = d3.time.scale.utc()
        .range([0, width])
    var yScale
    if (options.useOrdinalScale) {
        yScale = d3.scale.ordinal()
        .domain(['-'])
        .rangeBands([0, height],0)
    } else {
        yScale = d3.scale.linear()
        .range([0, height])
    }
    // axis scales API
    function updateTDomain() {        
        /* Update tScale based on xScale */
        // FIXME: avoid accessing global variables by deining API to change 
        // the video parameters
        //console.log('updateTScale()')
        var d = xScale.domain()  // Get X domain expressed in frames
        var a = new Date(axes.videoinfo.starttime) // Get start time of video
        tScale.domain([ new Date(a.getTime()+d[0]/axes.videoinfo.realfps*1000), 
                        new Date(a.getTime()+d[1]/axes.videoinfo.realfps*1000) ])
    }
    function xdomain(domain) {
        if (!arguments.length) return xScale.domain();
        /* Update xAxis and tAxis to domain = [firstFrame, lastFrame] */
        xScale.domain(domain)
        updateTDomain()
        reinitZoom()
        refreshAxes({'type': 'xDomainChanged','domain':domain})
        return axes // return itself to be able to chain commands
    }
    function ydomain(domain) {
        if (!arguments.length) return yScale.domain();
        /* Update yAxis to domain = [minID, maxID] */
        if (domain.length == 0) domain=['-']
        yScale.domain(domain)
        refreshAxes({'type': 'yDomainChanged','domain':domain})
        return axes // return itself to be able to chain commands
    }
    
    function xdomainFocus(domain, marginFactor) {
        if (!arguments.length) return xScale.domain();
        let oldT = zoom.translate()
        let oldS = zoom.scale()
        
        // Get to basic zoom first to get original domain
        zoom.translate([0, 0]) // [DX,DY]
        zoom.scale(1)
        let xdomain = xScale.domain();
        let xrange = xScale.range();
        
        let x0 = domain[0], x1=domain[1];
        
        if (typeof marginFactor == 'undefined')
            marginFactor = 1.1;
        
        // Zoom out 10% to see around
        let c = (x1+x0)/2;
        x0 = (x0-c)*marginFactor+c
        x1 = (x1-c)*marginFactor+c
        
        let S = (xdomain[1]-xdomain[0])/(x1-x0);
        if (S>zoom.scaleExtent()[1]) {
            S=zoom.scaleExtent()[1];
            x0=c-0.5*(xdomain[1]-xdomain[0])/S;
            x1=c+0.5*(xdomain[1]-xdomain[0])/S;
        }
        
        let S0 = (xdomain[1]-xdomain[0])/(xrange[1]-xrange[0])
        let T = -S*x0/S0
        
        zoom.translate([T, 0]) // [DX,DY]
        zoom.scale(S)
        
        if (isNaN(xScale.domain()[0])) {
            console.log('xdomainFocus: ERROR, failed to zoom X axis scale')
            zoom.translate(oldT)
            zoom.scale(oldS)
            //xScale.domain(xdomain); // Reset
        }
        refreshAxes({'type': 'xDomainChanged','domain':domain})
        return axes // return itself to be able to chain commands
    }
    function xdomainScale(scale, center) {
        let xdomain = xScale.domain(); // Current domain
        let x0 = xdomain[0], x1=xdomain[1];
   
        if (typeof center == 'undefined')
            center = (x1+x0)/2;

        x0 = (x0-center)/scale+center
        x1 = (x1-center)/scale+center
        
        xdomainFocus([x0,x1])
        
        return axes // return itself to be able to chain commands
    }
    function xdomainCenter(frame) {
        let xdomain = xScale.domain(); // Current domain
        let x0 = xdomain[0], x1=xdomain[1];
   
        center = (x1+x0)/2;

        x0 = x0-center+frame
        x1 = x1-center+frame
        
        xdomainFocus([x0,x1],1.0)
        
        return axes // return itself to be able to chain commands
    }
    
    // axis scales exports
    axes.xScale=xScale   // Public, used by refreshTimeMark (could be closured)
    axes.yScale=yScale
    axes.tScale=tScale
    axes.xdomain = xdomain
    axes.ydomain = ydomain
    axes.xdomainFocus = xdomainFocus
    axes.xdomainScale = xdomainScale
    axes.xdomainCenter = xdomainCenter
    //axes.updateTDomain=updateTDomain  // Private


    /* ### VIEW: axes, layout */

    // DOM Hierarchy of axes. e.g. for xAxisGroup:
    // .x.axis > g.tick > line (created by xAxis)
    // .x.axis > g.tick > text (created by xAxis)
    // .x.axis > path.domain   (created by xAxis)
    // .x.axis > text.label    (created by xAxisInit, updated by xAxisResized)
    // .x.axis                 (transform updated by xAxisInit and xAxisResized)
    
    // How to use:
    // xAxisGroup == d3.select('.x.axis')  /* D3 sel. of axis top <g> element */
    // xAxisInit(xAxisGroup)     /* create the axis, labels... */
    // xAxisResized(xAxisGroup)  /* update full axis based on layout sizes */
    // xAxis(xAxisGroup)         /* update only the axis ticks */

    // ## Axis creation methods for X axis
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickSize(5)
    function xAxisInit(xAxisGroup) {
        // Create the SVG elements and styles
        xAxisGroup.attr("transform", "translate(0," + (height+20) + ")")
        xAxisGroup.insert("rect",":first-child").attr('class','bgRect')
              .attr("x",0).attr("y",0)
              .attr("width",width).attr("height",19)
              .style("fill", "#fff0f0")
        xAxisGroup.append("text").attr("class", "label")
              .attr("x", -15).attr("y", 15)  // Relative to xaxis group
              .style("text-anchor", "end")
              .text("Frame");
        xAxisGroup.call(xAxis) // Create axis and ticks
        return xAxisGroup
    }
    function xAxisResized(xAxisGroup) {
      
        if (true) {
            // Change range is a way that does not break the zoom interaction
            // See http://stackoverflow.com/questions/25875316/

            (function() {
                // Cache zoom parameters
                var cacheScale = zoom.scale();
                var cacheTranslate = zoom.translate();
                var cacheTranslatePerc = zoom.translate().map( 
                   function(v,i,a) {return (v * -1) / getFullWidth();} );
                zoom.scale( 1 ).translate( [0, 0] );

                // Change the range
                xScale.range( [0, width] );

                // Reapply zoom parameters
                zoom.x( xScale );
                zoom.scale( cacheScale );
                cacheTranslate[0] = -(getFullWidth() * cacheTranslatePerc[0]);
                zoom.translate( cacheTranslate );

                function getFullWidth() { 
                    return xScale.range()[1] * zoom.scale();
                }
            })()
        } else
            // Simple way
            xScale.range([0, width])  // Update scaling model
        
        xAxis.ticks(Math.ceil(width/50)) // Around 50px per tick for frames

        xAxisGroup.attr("transform", "translate(0," + (height+20) + ")")
        xAxisGroup.selectAll(".bgRect")
              .attr("width",width).attr("height",19)
        xAxisGroup.call(xAxis)
        return xAxisGroup
    }
    
    // ## Axis creation methods for T axis
    var customTimeFormat = d3.time.format.multi([
      ["%S.%L", function(d) { return d.getMilliseconds(); }],
      ["%S", function(d) { return d.getSeconds(); }],
      ["%H:%M", function(d) { return d.getMinutes(); }],
      ["%H:00", function(d) { return d.getHours(); }],
      ["%b %d", function(d) { return d.getDate() != 1; }],
      ["%B", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);
    var tAxisBase = d3.svg.axis()
        .scale(tScale)
        .orient("bottom")
        .tickSize(-height)   // Used as gridline
        .tickFormat(customTimeFormat)
    var tAxis = function(tAxisParent) {
        // See http://stackoverflow.com/questions/29305824 
        // for how to customize the D3 axis object
        //svg.selectAll(".t.axis > .tick > text") 
        tAxisParent.call(tAxisBase)    // Update axis view (ticks, labels...)
        tAxisParent.selectAll(".tick > text")  // Refine tick properties
            .attr('class',function (d) {
                // Define different classes depending on scale
                // Loot at custom.css for how this is converted into font-size
                if (d.getMilliseconds()!==0) return "ms_tick"
                if (d.getSeconds()!==0) return "s_tick"
                if (d.getMinutes()!==0) return "m_tick"
                return "h_tick"
            })
    }
    function tAxisInit(tAxisGroup) {
        tAxisGroup.attr("transform", "translate(0," + (height) + ")")
        tAxisGroup.insert("rect",":first-child").attr('class','bgRect')
              .attr("x",0).attr("y",0)
              .attr("width",width).attr("height",19)
              .style("fill", "#f0f0f0")
        tAxisGroup.append("text").attr("class", "label")
          .attr("x", -15).attr("y", 15)  // Relative to taxis group
          .style("text-anchor", "end")
          .text("Time");
        tAxisGroup.call(tAxis);
        return tAxisGroup
    }
    function tAxisResized(tAxisGroup) {
        tScale.range([0, width])
        
        tAxisBase.ticks(Math.ceil(width/100)) // Around 100px per tick for time
        tAxisBase.tickSize(-height)
        
        tAxisGroup.attr("transform", "translate(0," + (height) + ")")
        tAxisGroup.select('.bgRect')
              .attr("x",0).attr("y",0)
              .attr("width",width).attr("height",19)
        tAxisGroup.call(tAxis);
        return tAxisGroup
    }

    // ## Axis creation methods for Y axis
    var yAxisBase = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .ticks(5)
        .tickSize(0); // Use manual grid creation below
        //.tickSize(-width); // Grid line
    var yAxis = function(yAxisParent) {
        // See http://stackoverflow.com/questions/29305824 
        // for how to customize the D3 axis object
        //svg.selectAll(".t.axis > .tick > text") 
        yAxisParent.call(yAxisBase)    // Update axis view (ticks, labels...)
        // Create the grid manually, D3 does not seem to be able to draw a grid not centered on the ticks
        if (options.useOrdinalScale) {
          //console.log(yScale.range())
          let join = yAxisParent.selectAll(".gridline").data(yScale.range())
          join.exit().remove()
          join.enter()
            .append("line")
            .attr("class", "gridline")
          join
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", function(d){ return d;})
            .attr("y2", function(d){ return d;})
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-width", "1px")
          }
    }
    function yAxisInit(yAxisGroup) {
        yAxisGroup.insert("rect",":first-child").attr('class','bgRect')
              .attr("x",-40).attr("y",0)
              .attr("width",40).attr("height",height)
              .style("fill", "#fffff0")
        yAxisGroup.append("text").attr("class", "label")
            .attr("transform", "rotate(-90, -40, "+(height/2)+")")
            .attr("x", -40).attr("y", height/2)
            //.attr("dy", "1em")
            .style("text-anchor", "bottom")
            .text("ID");
        yAxisGroup.call(yAxis);
        return yAxisGroup
    }
    function yAxisResized(yAxisGroup) {
        if (options.useOrdinalScale)
            yScale.rangeBands([0, height],0)
        else
            yScale.range([0, height])
        
        yAxisBase.ticks(Math.ceil(height/20)) // Around 20 per tick for IDs
        //yAxisBase.tickSize(-width); // Grid line

        yAxisGroup.select('.bgRect')
              .attr("x",-40).attr("y",0)
              .attr("width",40).attr("height",height)
        yAxisGroup.select('.label')
            .attr("transform", "rotate(-90, -30, "+(height/2)+")")
            .attr("x", -40).attr("y", height/2)
        yAxisGroup.call(yAxis);
        return yAxisGroup
    }
    
    /*
    axes.xAxis = xAxis    // Private
    axes.tAxis = tAxis    // Private
    axes.yAxis = yAxis    // Private
    //*/

    
    /* ### Layout hierarchy of the axes ### */
    
    // D3 DOM selections are children of 'svg > #chronoGroup'
    //    example: 'svg > #chronoGroup' > .x.axis'
    // For convenience, some elements are also stored as fields
    // of the axes object
    //    example: axes.xAxisGroup
    //
    //    D3 selection                      JS handle
    // -----------------------------------------------------
    // #chronoGroup                      axes.chronoGroup
    //    .plotAreaBackground
    //    .x.axis                        axes.xAxisGroup
    //    .t.axis                        axes.tAxisGroup
    //    .y.axis                        axes.yAxisGroup
    //    #plotAreaClipPath
    //    .plotArea                      axes.plotArea     
    //    .timeMark                      axes.timeMark


    // ## Top-level group with coordinates aligned with plotArea */
    var chronoGroup = parent
        .append("g").attr("id", "chronoGroup")
        .attr("transform", "translate("+left+","+top+")")
    axes.chronoGroup = chronoGroup //  Public
    
    let plotBackground = chronoGroup.append("g").attr('class','plotBackground')
    
    plotBackground.append("rect").attr('class','plotAreaBackground')
        .attr("width", width)
        .attr("height", height)
        .style("fill", "#f0fcff")
        .style("stroke", "gray")
    
    // ## Axes widgets */
    var xAxisGroup = chronoGroup.append("g").attr("class", "x axis")
        .call(xAxisInit)
    var tAxisGroup = chronoGroup.insert("g").attr("class", "t axis")
        .call(tAxisInit)
    var yAxisGroup = chronoGroup.insert("g").attr("class", "y axis")
        .call(yAxisInit)
    
    // ## Plot area (clipped)
    chronoGroup.append("clipPath")       // define a clip path
        .attr("id", "plotAreaClipPath") // give the clipPath an ID
        .append("rect")          // shape it as a rect
        .attr("x", 0)         // position the x left
        .attr("y", 0)         // position the y top
        .attr("width", width)         
        .attr("height", height);
    var clippedArea = chronoGroup.insert("g")
                      .attr("class","clipArea")
                      .attr("clip-path", "url(#plotAreaClipPath)")
    
    var timeMarkLayer = clippedArea.append("g")
        .attr("class", "timeMarkLayer")
    insertTimeMark(timeMarkLayer)  // Show in front of background, but below rest of elements
    
    // ## Content can be inserted in plotArea, on top of timemark
    
    plotArea = clippedArea.insert("g").attr("class","plotArea")
  
    // Exports of the layout
    //axes.xAxisGroup = xAxisGroup //  Private
    //axes.tAxisGroup = tAxisGroup //  Private
    //axes.yAxisGroup = yAxisGroup //  Private
    axes.plotArea   = plotArea   //  Public
          
        
    // ### View update and signaling ###
        
    function refreshLayout() {
        /* Update layout sizes and SVG elements accordingly */
        /* To be called when SVG has resized or user changed the margins */
        recomputeSizes()
    
        xAxisGroup.call(xAxisResized)
        tAxisGroup.call(tAxisResized)
        yAxisGroup.call(yAxisResized)
        chronoGroup.attr("transform", "translate("+left+","+top+")")
        chronoGroup.select(".plotAreaBackground")
                   .attr("width", width)         
                   .attr("height", height);
        chronoGroup.select("#plotAreaClipPath > rect")
                   .attr("width", width)         
                   .attr("height", height);
                   
        chronoGroup.select(".zoomEventRect")
                   .attr("width", width)         
                   .attr("height", height+margin.bottom);  
        
        refreshAxes({'type': 'resize'})
    }
    axes.refreshLayout = refreshLayout
        
    function triggerEvent(fun, event) {
        /* Util function: call the callback if it is valid, else return false */
        if (typeof fun === 'function')
            fun(event)
            return true
        if (typeof fun === 'undefined')
            return true
        return false // Error: invalid callback
    }
    function refreshAxes(event) {
        if (logging.axesEvents)
            console.log('axes.refreshAxes: event=',event)
        /* Redraw axes ticks. To be called when scales have changed */
        updateTDomain() // Update tScale based on xScale

        // Can access xAxisGroup from JS, or using D3 selector ".x.axis":
        // xAxisGroup == axes.parent.select(".x.axis")
        // to redraw the axes after scale change
        chronoGroup.select('.x.axis').call(xAxis);
        chronoGroup.select('.t.axis').call(tAxis);
        chronoGroup.select('.y.axis').call(yAxis);
        
        refreshTimeMark()
        refreshIdSelection()

        // Signal the plot content should be redrawn
        // Protection for infinite loops: trigger only if internal events
        if (typeof event === 'object' && 
            (event.type==='xDomainChanged' || 
             event.type==='yDomainChanged' || 
             event.type==='zoom_x' || 
             event.type==='resize')) {
             $(axes).trigger({'type': 'axes:changed', 'sourceevent':event})
            // if (!triggerEvent(axes.onAxesChanged, event))
//                 console.log('WARNING in refreshAxes: callback not valid, onAxesChanged=',onAxesChanged)
//              } else {
//                  console.log('WARNING refreshAxes: onAxesChanged not called, as event not within predefined list. event=',event)
//              }
        }
    }
    axes.refreshAxes = refreshAxes
    
    // Callback to be defined by the user
    // Called whenever the axes scale changed (resize or zoom)
    axes.onAxesChanged = undefined
    
    // ### ID selection API ###
    function selectId(id) {
      axes.selectedID = id
      refreshIdSelection()
    }
    function refreshIdSelection() {
    //axes.refreshIdSelection = function(){
        axes.chronoGroup.select('.y.axis').selectAll('.tick')
                   //.style('fill','black')
                   //.style('font-weight','normal')
                   .classed('selectedid',false)
        axes.chronoGroup.select('.y.axis').selectAll('.tick')
                   .filter(function(d) {return d==axes.selectedID})
                   //.style('fill','blue')
                   //.style('font-weight','bold')
                   .classed('selectedid',true)
                   
        axes.chronoGroup.selectAll(".plotBackground > .selection").remove()
        if (axes.selectedID!=null) {
            axes.chronoGroup.select(".plotBackground").append("rect")
                .attr('class','selection')
                .attr("x", 0)
                .attr("width", axes.width())
                .attr("y", axes.yScale(axes.selectedID))
                .attr("height", axes.yScale.rangeBand())
                .style("fill", "#ffffff")
                .style("stroke", "#008000")
                .style("stroke-width", "2px")
        }
    }
    axes.refreshIdSelection = refreshIdSelection
    axes.selectId=selectId

    
    // ### timeMark API ###
    
    // timeMark Methods
    function insertTimeMark(parent) {
        var timeMark = parent.append("rect")
              .attr('class','timeMark') 
        // For timeMark style, look at custom.css
        timeMark.frame = 0    // Store current frame inside timeMark object
        axes.timeMark = timeMark
        refreshTimeMark()
    }
    function refreshTimeMark() {
        let frame = axes.timeMark.frame;
        let isOut = false;
        if (frame<=axes.xScale.domain()[0]-1) {
            frame = axes.xScale.domain()[0]
            isOut = true
        } else if (frame>=axes.xScale.domain()[1]) {
            frame = axes.xScale.domain()[1]
            isOut = true
        }
        if (isOut) {
            axes.timeMark
                .attr("x", axes.xScale(frame)-1)
                .attr("y", 0) 
                .attr("width", 2)
                .attr("height", axes.height())
                .attr("class", "timeMark out")
        } else {
            let w = axes.xScale(1) - axes.xScale(0.0)
            let minW = 1
            let isThin = w<minW
            axes.timeMark
                .attr("x", axes.xScale(frame) - 1)
                .attr("y", 0)  // In plotArea translated coordinates
                .attr("width", isThin?(minW+2):(w+2))
                .attr("height", axes.height())
                .attr("class", isThin?"timeMark thin":"timeMark")
        }
    }
    function setTimeMark(frame) {
        if (typeof axes.timeMark === 'undefined') {
            console.log('ChronoAxes.setTimeMark called, but timeMark is undefined. Ignored.')
            return
        }
        axes.timeMark.frame=frame;
        refreshTimeMark()
    }
    // timeMark Exports
    // axes.timeMark = timeMark // Private
    axes.setTimeMark = setTimeMark
    
    
    // ### CONTROLER: Add mouse interaction ###

    // ## Zooming (applies to the xScale object only)
    var zoom = d3.behavior.zoom()
    reinitZoom()
    zoom.on("zoom", onZoom)
    //    chronoGroup.select(".plotAreaBackground").call(zoom)
    // Zoom behavior is applied to an invisible rect on top of the plotArea
    // chronoGroup.append("rect").attr('class', 'zoomEventRect')
//                .style("fill", "none")
//                .attr("width", width).attr("height", height+margin.bottom)
//                //.style("pointer-events", "all")
               //.call(zoom)
    chronoGroup.style("pointer-events", "all")
               .call(zoom)
    function onZoom() {
        if (logging.axesEvents)
            console.log('zoomed',d3.event)
        refreshAxes({'type': 'zoom_x', 'd3_event': d3.event})
        // Avoid scroll event to trigger normal scrolling in the browser
        if (!!d3.event.sourceEvent)
            d3.event.sourceEvent.stopPropagation(); 
    }
    function reinitZoom() {
        let d = xScale.domain()
        zoom.x(xScale)
            .scaleExtent([1/24, (d[1]-d[0])/10]) // Put limit in how far we can zoom in/out
    }
    
    /* Monkey patch events from D3 selection */
    function injectEventFilter(eventSource, eventType, filterFun) {
        // Get original D3 callback
        originalCallback = eventSource.on(eventType)
        if (typeof originalCallback !== 'function') {
            console.log('injectZoomEventFilter: no callback found for '+eventSource+'.on('+eventType+')')
            return
        }
        // Define wrapper that calls original if test is true
        function filteredCallback() {
            var args=arguments
            //console.log('args=',args)
            if (filterFun(d3.event))
                originalCallback.apply(this, args)
        }
        // Replace by filtered callback
        eventSource.on(eventType, filteredCallback)
    }
    // Need shift key to zoom 
    // (to avoid zooming when just scrolling across the page)
    injectEventFilter( chronoGroup, 
          "wheel.zoom", function(event) {
              //console.log('chronoGroup, ',event)
              // Coordinates are not plotArea related (FIXME)
              //if ((d3.event.x<0) || (d3.event.y<0) || (d3.event.x>width) || (d3.event.y>height)) return false
              if (!mousewheelMode) return true
              return event.shiftKey==true
          } )

    axes.zoom = zoom  // Private
    axes.reinitZoom = reinitZoom
    
    // ## Click callback, can be modified by the user as axes.onClick=...
    //axes.onClick = undefined
    // Replaced by jQuery event "mouse:down"
    
    function invertYScale(y) {
        var id 
        if (options.useOrdinalScale) {
          let rangeExtent = yScale.rangeExtent()
          let rangeBand = yScale.rangeBand()
          rank = Math.floor((y-rangeExtent[0])/rangeBand);
          if (rank<0 || rank>= yScale.domain().length)
             id = undefined
          else
             id = yScale.domain()[rank]
          //console.log("chronoGroup.onClick: rank=", rank)
        } else {
          rank = Math.round( yScale.invert(y) );
          if (rank<yScale.domain()[0] || rank> yScale.domain()[1])
            id = undefined
          else
            id = rank
        }
        return id
    }
    
    function onAxesClick() {
        //if (typeof axes.onClick == 'undefined') return;
        if (d3.event.defaultPrevented) return;
        
        var coords = d3.mouse(this);
        var frame = Math.round( xScale.invert(coords[0]) );
        var id = invertYScale( coords[1] )
    
        if (logging.axesEvents)
            console.log("Triggering ChronoAxes.onClick: click on frame=",frame," id=",id);
    
        // Trigger the callback, passing frame and id information
        // if (!triggerEvent(axes.onClick, {'frame': frame, 'id': id}))
        //             console.log('ERROR: callback ChronoAxes.onClick is invalid. onClick=',axes.onClick)
        $(axes).trigger({'type': "axes:clicked", 'frame': frame, 'id': id, 'mouseevent': d3.event});
    }
    chronoGroup.on("click", onAxesClick)
    
    
    function onAxesDblClick() {
        //if (typeof axes.onClick == 'undefined') return;
        if (d3.event.defaultPrevented) return;
        
        var coords = d3.mouse(this);
        var frame = Math.round( xScale.invert(coords[0]) );
        var id = invertYScale( coords[1] )
    
        if (logging.axesEvents)
            console.log("onAxesDblClick: dblclick on frame=",frame," id=",id);
    
        // Trigger the callback, passing frame and id information
        // if (!triggerEvent(axes.onClick, {'frame': frame, 'id': id}))
        //             console.log('ERROR: callback ChronoAxes.onClick is invalid. onClick=',axes.onClick)
        $(axes).trigger({'type': "axes:dblclick", 
                         'frame': frame, 'id': id, 'mouseevent': d3.event});
    }
    chronoGroup.on("dblclick", onAxesDblClick)
    
    injectTrackFrame(chronoGroup);
    function injectTrackFrame(target) {
        chronoGroup.on("mouseenter.trackFrame", trackFrame_mouseEnter);
        chronoGroup.on("mouseleave.trackFrame", trackFrame_mouseLeave); 
        var mouseCache = [undefined, undefined]
        function trackFrame_mouseEnter() {
            if (logging.mouseMoveEvents)
                console.log('trackFrame_mouseEnter')
            d3.select("body").on('keydown.trackFrame',trackFrame_keyDown)
            chronoGroup.on("mousemove", trackFrame_mouseMove);
            var coords = d3.mouse(chronoGroup.node());
            mouseCache[0] = coords[0];
            mouseCache[1] = coords[1];
        }
        function trackFrame_mouseLeave() {
            if (logging.mouseMoveEvents)
                console.log('trackFrame_mouseLeave')
            d3.select("body").on('keydown.trackFrame',null) // callback off
            //d3.select("body").on('keyup.trackFrame',null) // callback off
            chronoGroup.on("mousemove", null);
            $( axes ).trigger('previewframe:trackend') // jQuery callback
        }
        function trackFrame_keyDown() {
            if (d3.event.ctrlKey) {
                // Register mousemove is not already done
            
                d3.select("body").on('keydown.trackFrame',null) // Callback off 
                d3.select("body").on('keyup.trackFrame',trackFrame_keyUp) 

                if (logging.mouseMoveEvents)
                      console.log('Started mousemove tracking in chronogram')
                      
                  trackFrame_change()
            }
        }
        function trackFrame_keyUp() {
            if (!d3.event.ctrlKey) {
                //axes.trackFrame_on = false;
                
                d3.select("body").on('keydown.trackFrame',trackFrame_keyDown) 
                d3.select("body").on('keyup.trackFrame',null)
                
                $( axes ).trigger('previewframe:trackend') // jQuery callback
            }
        }
        function trackFrame_mouseMove() {
    
            var coords = d3.mouse(chronoGroup.node());
            mouseCache[0] = coords[0];
            mouseCache[1] = coords[1];
            
            if (!d3.event.ctrlKey) {
                //console.log('trackFrame_mouseMove: runaway call')
                //chronoGroup.on("mousemove", null);
                //axes.trackFrame_on = false;
                return;
            }
            //if (typeof axes.onClick == 'undefined') return;
            if (d3.event.defaultPrevented) return;
            
            trackFrame_change()
        }
        function trackFrame_change() {
            var coords = mouseCache
            if (coords[0]<axes.xScale.range()[0] ||
                    coords[0]>axes.xScale.range()[1] ||
                    coords[1]<axes.yScale.rangeExtent()[0] ||
                    coords[1]>axes.yScale.rangeExtent()[1]) {
                if (logging.mouseMoveEvents)
                    console.log("trackFrame_change: outside of axes range, ignoring. coords=",coords);
                return;                        
            }
              
            var frame = Math.round( xScale.invert(coords[0]) );
        
            let domain = axes.xScale.domain();
            if (frame<domain[0] || frame>domain[1]) {
                if (logging.mouseMoveEvents)
                    console.log("trackFrame_change: f="+frame+" out of bound. Ignoring.");
                return;
            }
        
            if (typeof glob_offset === 'undefined') glob_offset=0
            //frame = Math.round(frame/40)*40+glob_offset
        
            var id = invertYScale( coords[1] )
    
            if (logging.mouseMoveEvents)
                console.log("trackFrame_change: frame=",frame," id=",id);
    
            $( axes ).trigger({'type': 'previewframe:trackmove', 'frame': frame, 'id': id, 'mouseevent': d3.event}) // jQuery callback
        }
    }
    
    return axes
    
    // Usage:
    // // Creation
    // axes = new ChronoAxes(svgParentSelection)
    // // Update the axis domains
    // axes.xdomain( [ minframe, maxframe] )
    // axes.ydomain( [ minid, maxid] )
    // axes.refreshLayout() // Read directly svgParent size
    // // Change timeMark
    // axes.setTimeMark(frame)
    // // Set callback when clicked
    // axes.onClick = function(event){ event.frame...}
    // // Set callback when zoomed or resized
    // axes.onAxesChanged = function(){...}
}
