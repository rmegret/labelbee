/*jshint esversion: 6, asi: true */

// ######################################################################
// INPUT/OUTPUT

function initAnnotationIO() {
    document.getElementById('load').addEventListener('change', loadFromFile);
    document.getElementById('loadtags')
            .addEventListener('change', loadTagsFromFile);
}


// ## Annotations control

function saveBlobToFile(blob, filename) {
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.hidden = true;
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    console.log("saveBlobToFile: waiting for user to save to file")
        //window.URL.revokeObjectURL(url);
    console.log("saveBlobToFile: done")
    
    // New simplified API?
    //saveAs(blob, filename)
}
function saveObjToJsonFile(obj, filename) {
    var json = JSON.stringify(obj);

    var blob = new Blob([json], {
        type: "text/json"
    });
    
    saveBlobToFile(blob, filename)
}
function saveCSVToFile(txt, filename) {
    var blob = new Blob([txt], {
        type: "text/csv"
    });
    saveBlobToFile(blob, filename)
}

function saveToFile() {
    console.log("savetoFile: exporting to JSON...")

    saveObjToJsonFile(Tracks, 'Tracks.json')
}

function tracksToCSV(Tracks) {
    var csv = "Date,Time (frame),ID,Action,Cargo,Shift\n"
    if (Tracks === undefined) return csv
    for (let F in Tracks)
        for (let id in Tracks[F]) {
            var obs = Tracks[F][id]
            var action = "",
                cargo = ""
            var conc = function(s1, s2) {
                if (s2 === "") s1 += s2;
                else s1 += ";" + s2
            }
            if (obs.bool_acts[0]) action += (action === "" ? "" : ";") + "fanning"
            if (obs.bool_acts[2]) action += (action === "" ? "" : ";") + "came in"
            if (obs.bool_acts[3]) action += (action === "" ? "" : ";") + "went out"

            if (obs.bool_acts[1]) cargo += "pollen"
            csv += "nodate," + F + "," + obs.ID + "," + action + "," + cargo
            
            csv += ','  // Shift ?
            
            csv += "\n"
        }
    return csv
}

function saveToCSV() {
    console.log("savetoFile: exporting to CSV...")

    var txt = tracksToCSV(Tracks);

    saveCSVToFile(txt, 'Tacks.csv')
}


function tracksToBBoxes(Tracks) {
    var csv = "#frame,left,top,right,bottom,pollen,arrive,leave,fanning,angleAroundCenter\n"
    if (Tracks === undefined) return csv
    for (let F in Tracks)
        for (let id in Tracks[F]) {
            var obs = Tracks[F][id]
            
            csv += (F + "," + obs.x + "," + obs.y +
                     "," + (obs.x+obs.width) + "," + (obs.y+obs.height) +
                     "," + Number(obs.bool_acts[1]) + // pollen
                     "," + Number(obs.bool_acts[2]) + // arrive
                     "," + Number(obs.bool_acts[3]) + // leave
                     "," + Number(obs.bool_acts[0]) + // fanning
                     "," + Number(obs.angle) + // angle
                     "\n")
        }
    return csv
}

function saveToBBoxes() {
    console.log("saveToBBoxes: exporting bounding boxes to CSV...")
    console.log("with simple format: frame, left, top, right, bottom, pollen")

    var txt = tracksToBBoxes(Tracks);

    saveCSVToFile(blob, "BBoxes.csv")
}

function onReaderLoad(event) {
    console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    console.log(obj)
    Tracks = obj;
    onFrameChanged();
    
    refreshChronogram()
    
    console.log(event)
    //$("#load")[0].value='Loaded '+fileToRead
}
function loadFromFile0(fileToRead) {
    console.log("loadFromFile0: importing from JSON...")

    $.get(fileToRead, function(data) {
        console.log("JSON loaded: ",data)
        var obj = JSON.parse(data)
        Tracks = obj;
        onFrameChanged();
        
        refreshChronogram()
    });

}
function loadFromFile(event) {
    console.log("loadFromFile: importing from JSON...")

    fileToRead = event.target.files[0]

    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(fileToRead);
}

function tagsAddFrames(Tags) {
      for (let f in Tags) {
        let tagsFrame = Tags[f].tags
        if (tagsFrame == null) continue;

        for (let i in tagsFrame) {
            let tag = tagsFrame[i]
            if (tag == null) continue;
            
            tag.frame=Number(f)          
        }    
    }
}




function onTagsReaderLoad(event) {
    //console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    //console.log(obj) // Caution: heavy
    Tags = obj;
    
    tagsAddFrames(Tags)
    
    refreshChronogram()
    
    adjustChronogramHeight()
    
    onFrameChanged();
    
    //console.log(event)
    //$("#load")[0].value='Loaded '+fileToRead
    
    //console.log(Tags)
}

function loadTagsFromFile(event) {
    console.log("loadTagsFromFile: importing from JSON...")

    fileToRead = event.target.files[0]

    var reader = new FileReader();
    reader.onload = onTagsReaderLoad;
    reader.readAsText(fileToRead);
}

function saveTagsToFile(event) {
    console.log("saveTagsToFile: exporting to JSON...")

    saveObjToJsonFile(Tags, 'Tags.json')
}
