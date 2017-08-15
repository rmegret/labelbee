/*jshint esversion: 6, asi: true */

// ######################################################################
// INPUT/OUTPUT

function initAnnotationIO() {
    document.getElementById('load').addEventListener('change', loadFromFile);
    document.getElementById('loadtags')
            .addEventListener('change', loadTagsFromFile);
            
    ttags=[]
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

    function addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    let D = new Date()
    let timestamp = D.getFullYear()+addZero(D.getMonth()+1)+addZero(D.getDate())+
                   '_'+
                   addZero(D.getHours())+addZero(D.getMinutes())+addZero(D.getSeconds());
    //.toISOString()

    let filename = videoControl.videoName +
                   '-Tracks-'+timestamp+'.json'

    saveObjToJsonFile(Tracks, filename)
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

    saveCSVToFile(txt, 'Tracks.csv')
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
function tracksToBBoxes2(Tracks) {
    var csv = "#frame,id,tagx,tagy,angle,left,top,right,bottom,pollen,arrive,leave,fanning\n"
    if (Tracks === undefined) return csv
    for (let F in Tracks)
        for (let id in Tracks[F]) {
            var obs = Tracks[F][id]
            
            csv += (F + "," + obs.ID + 
                     "," + (obs.x+obs.width/2) + "," + (obs.y+obs.height/2) +
                     "," + Number(obs.angle) + // angle
                     "," + (obs.x) + "," + (obs.y) +
                     "," + (obs.x+obs.width) + "," + (obs.y+obs.height) +
                     "," + Number(obs.bool_acts[1]) + // pollen
                     "," + Number(obs.bool_acts[2]) + // arrive
                     "," + Number(obs.bool_acts[3]) + // leave
                     "," + Number(obs.bool_acts[0]) + // fanning
                     "\n")
        }
    return csv
}

function saveToBBoxes() {
    console.log("saveToBBoxes: exporting bounding boxes to CSV...")
    console.log("with simple format: frame, left, top, right, bottom, pollen")

    var txt = tracksToBBoxes2(Tracks);

    saveCSVToFile(txt, "BBoxes.csv")
}

function setTracks(obj) {
    console.log('setTracks: changing Tracks data structure and refreshing...')
    Tracks = obj;
    
    //fixOldTracksFormat()
    
    videoControl.onFrameChanged();
    refreshChronogram()
}
function onReaderLoad(event) {
    console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    console.log(obj)
    
    setTracks(obj);
}
function loadFromFile0(fileToRead) {
    console.log("loadFromFile0: importing from JSON...")

    $.get(fileToRead, function(data) {
        console.log("JSON loaded: ",data)
        var obj = JSON.parse(data)
        setTracks(obj);
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



function setTags(obj) {
    console.log('setTags: changing Tags data structure and refreshing...')
    Tags = obj;
    
    tagsAddFrames(Tags)
    
    ttags = getTTags()
    
    refreshChronogram()
    adjustChronogramHeight()
    videoControl.onFrameChanged();
}
function onTagsReaderLoad(event) {
    //console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    //console.log(obj) // Caution: heavy

    setTags(obj);
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


// Server I/O

var serverURL = 'http://127.0.0.1:5000/';
function jsonFromServer() {     
    var path = window.prompt("Please enter path for Track JSON (server)","data/Gurabo/Tracks-C02_170624100000.json");
    if (path==null || path=="") {
        console.log('jsonFromServer: canceled')
        return;
    }
    
    console.log('jsonFromServer: loading path "'+path+'"...')  

     $.getJSON( path ,
        function(data) {
          console.log('jsonFromServer: loaded "'+path+'"')  
        }
      )
      .done(function(data) {
          setTracks(data)
        }
      )
      .fail(function(data) {
          console.log('jsonFromServer: ERROR loading "'+path+'"')  
        }
      )
}
function tagsFromServer(path, quiet) {     
    //var path = "data/Gurabo/Tags-C02_170624100000.json" ;// Default
    
    if (path == null) {
        var p = videoControl.name.split('/')
        var q = p[p.length-1].split('.')
        q[0]='Tags-'+q[0];
        q[q.length-1]='json';
        p[p.length-1]=q.join('.');
    
        var path = p.join('/'); // Default
    }
    if (!quiet) {
        path = window.prompt("Please enter path for Tags JSON (server)",path);
        if (path==null || path=="") {
            console.log('tagsFromServer: canceled')
            return;
        }
    }
    
    console.log('tagsFromServer: loading path "'+path+'"...')  

     $.getJSON( path ,
        function(data) {
          console.log('tagsFromServer: loaded "'+path+'"')  
        }
      )
      .done(function(data) {
          setTags(data)
        }
      )
      .fail(function(data) {
          console.log('tagsFromServer: ERROR loading "'+path+'"')  
        }
      )
}
function videoListFromServer(path, defaultvideoid) {     
    if (!path) {
        var userpath = window.prompt("Please enter path for Video List (server)","data/Gurabo/videolist.csv");
        if (userpath==null || userpath=="") {
            console.log('videoListFromServer: canceled')
            return;
        }
    
        let path = userpath;
    }
    
    console.log('videoListFromServer: loading path "'+path+'"...')  

     $.ajax( path ,
        function(data) {
          console.log('videoListFromServer: loaded "'+path+'"')  
        }
      )
      .done(function(data) {
          console.log('videolist CSV content = ',data)
          let array = $.csv.toArrays(data);
          console.log('videolist converted to array: ',array)
          videoList = []
          videoListTable=[]
          for (let item of array) {
              if (item.length==0) continue;
              videoList.push(item[0]);
              if (item[1] ) {
                  $('#previewVideoName').val(item[1])
                  $('#previewVideoTimeScale').val('1')
              }
              let tmp = {video:item[0], preview:item[1], tags:item[2]}
              videoListTable.push(tmp)
          }

          updateVideoList()
          if (defaultvideoid==null)
              selectVideoByID(0)
          else
              selectVideoByID(defaultvideoid)
        }
      )
      .fail(function(data) {
          console.log('videoListFromServer: ERROR loading "'+path+'"')  
        }
      )
}

function jsonToServer() {
  window.open(serverURL,'popUpWindow','height=500,width=400,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes');
}
