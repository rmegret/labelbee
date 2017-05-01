
function ChronoAxes(parent, videoinfo) {
    // Create by passing the SVG parent element as D3 selector
    // Axes adjust automatically to SVG size
    // videoinfo should have fields fps and starttime

    var axes = this 
    axes.parent = parent
    
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


    /* ### INTERNAL MODEL for the axes: scales */
    
    axes.videoinfo = videoinfo

    // ## Scale objects (model that maps (frames,id) to pixels)
    var xScale = d3.scale.linear()
        .range([0, width])
    var tScale = d3.time.scale.utc()
        .range([0, width])
    var yScale = d3.scale.linear()
        .range([0, height])        
    // axis scales API
    function updateTDomain() {        
        /* Update tScale based on xScale */
        // FIXME: avoid accessing global variables by deining API to change 
        // the video parameters
        //console.log('updateTScale()')
        var d = xScale.domain()  // Get X domain expressed in frames
        var a = new Date(axes.videoinfo.starttime) // Get start time of video
        tScale.domain([ new Date(a.getTime()+d[0]/axes.videoinfo.fps*1000), 
                        new Date(a.getTime()+d[1]/axes.videoinfo.fps*1000) ])
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
        yScale.domain(domain)
        refreshAxes({'type': 'yDomainChanged','domain':domain})
        return axes // return itself to be able to chain commands
    }
    // axis scales exports
    axes.xScale=xScale   // Public, used by refreshTimeMark (could be closured)
    axes.yScale=yScale
    axes.tScale=tScale
    axes.xdomain = xdomain
    axes.ydomain = ydomain
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
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .ticks(5)
        .tickSize(-width); // Grid line
    function yAxisInit(yAxisGroup) {
        yAxisGroup.insert("rect",":first-child").attr('class','bgRect')
              .attr("x",-40).attr("y",0)
              .attr("width",40).attr("height",height)
              .style("fill", "#fffff0")
        yAxisGroup.append("text").attr("class", "label")
            .attr("transform", "rotate(-90, -30, "+(height/2)+")")
            .attr("x", -40).attr("y", height/2)
            //.attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Bee ID");
        yAxisGroup.call(yAxis);
        return yAxisGroup
    }
    function yAxisResized(yAxisGroup) {
        yScale.range([0, height])
        
        yAxis.ticks(Math.ceil(height/20)) // Around 20 per tick for IDs
        yAxis.tickSize(-width); // Grid line

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
    axes.chronoGroup = chronoGroup
    chronoGroup.append("rect").attr('class','plotAreaBackground')
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
                      .attr("clip-path", "url(#plotAreaClipPath)")

    // ## Content can be inserted in plotArea
    // so that timeMark will always be on top
    plotArea = clippedArea.insert("g").attr("class","plotArea")
  
    insertTimeMark(clippedArea)
  
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
                   .attr("height", height);  
        
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
        /* Redraw axes ticks. To be called when scales have changed */
        updateTDomain() // Update tScale based on xScale

        // Can access xAxisGroup from JS, or using D3 selector ".x.axis":
        // xAxisGroup == axes.parent.select(".x.axis")
        // to redraw the axes after scale change
        chronoGroup.select('.x.axis').call(xAxis);
        chronoGroup.select('.t.axis').call(tAxis);
        chronoGroup.select('.y.axis').call(yAxis);
        
        refreshTimeMark()

        // Signal the plot content should be redrawn
        // Protection for infinite loops: trigger only if internal events
        if (typeof event === 'object' && 
            (event.type==='xDomainChanged' || 
             event.type==='yDomainChanged' || 
             event.type==='zoom_x' || 
             event.type==='resize')) {
            if (!triggerEvent(axes.onAxesChanged, event))
                console.log('WARNING in refreshAxes: callback not valid, onAxesChanged=',onAxesChanged)
             } else {
                 console.log('WARNING refreshAxes: onAxesChanged not called, as event not within predefined list. event=',event)
             }
    }
    axes.refreshAxes = refreshAxes
    
    // Callback to be defined by the user
    // Called whenever the axes scale changed (resize or zoom)
    axes.onAxesChanged = undefined

    
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
        var frame = axes.timeMark.frame;
        axes.timeMark
            .attr("x", function(d) {
                return axes.xScale(frame - 0.5);
            })
            .attr("y", function(d) {
                return axes.yScale.range()[0];
            })
            .attr("height", function(d) {
                return axes.yScale.range()[1]-axes.yScale.range()[0];
            })
            .attr("width", function(d) {
                return (axes.xScale(1) - axes.xScale(0.0));
            })
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
    zoom.x(xScale)  // horizontal zoom applies to xScale
        /*.y(yScale)*/
        .scaleExtent([1/24, 1000]) // Put limit in how far we can zoom in/out
        .on("zoom", onZoom)
    //    chronoGroup.select(".plotAreaBackground").call(zoom)
    // Zoom behavior is applied to an invisible rect on top of the plotArea
    chronoGroup.append("rect").attr('class', 'zoomEventRect')
               .style("fill", "none")
               .attr("width", width).attr("height", height)
               .style("pointer-events", "all")
               .call(zoom)
    function onZoom() {
        if (logging.axesEvents)
            console.log('zoomed',d3.event)
        refreshAxes({'type': 'zoom_x', 'd3_event': d3.event})
        // Avoid scroll event to trigger normal scrolling in the browser
        d3.event.sourceEvent.stopPropagation(); 
    }
    var reinitZoom=function() {
        zoom.x(xScale)
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
    injectEventFilter( chronoGroup.select(".zoomEventRect"), 
          "wheel.zoom", function(event) {return event.shiftKey==true} )

    axes.zoom = zoom  // Private
    axes.reinitZoom = reinitZoom
    
    // ## Click callback, can be modified by the user as axes.onClick=...
    axes.onClick = undefined
    
    chronoGroup.on("click",function() {
        if (typeof axes.onClick == 'undefined') return;
        if (d3.event.defaultPrevented) return;
        
        var coords = d3.mouse(this);
        var frame = Math.round( xScale.invert(coords[0]) );
        var id = Math.round( yScale.invert(coords[1]) );
    
        if (logging.axesEvents)
            console.log("Triggering ChronoAxes.onClick: click on frame=",frame," id=",id);
    
        // Trigger the callback, passing frame and id information
        if (!triggerEvent(axes.onClick, {'frame': frame, 'id': id}))
            console.log('ERROR: callback ChronoAxes.onClick is invalid. onClick=',axes.onClick)
    })
    
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
