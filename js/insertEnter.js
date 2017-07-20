      let insertEnter = axes.plotArea.selectAll(".enter").data(allIntervals);
        insertEnter.call(initEnteringExiting);

        insertEnter.enter();
        insertEnter.filter(function (d){ 
            return (d.Activity == "entering")
        }).call(updateEnteringExiting);
        insertEnter.exit().remove();