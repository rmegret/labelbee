/*jshint esversion: 6, asi: true */

// ######################################################################
// INPUT/OUTPUT

function initAnnotationIO() {
    document.getElementById('load')
            .addEventListener('change', loadEventsFromFile);
    document.getElementById('loadtags')
            .addEventListener('change', loadTagsFromFile);
            
    ttags=[]
}


function whoami() {

     $.getJSON( url_for('/rest/auth/whoami') ,
        function(data) {
          console.log('whoami: data=',data)  
        }
      )
      .done(function(data) {
          //$('#whoami').html(JSON.stringify(data))
          if (data.is_authenticated) {
              $('#whoami').html('Logged in as "'+data.first_name+'"')
              $('.require-server').toggleClass('disabled',false)
          } else {
              $('#whoami').html('Not logged in')
              $('.require-server').toggleClass('disabled',true)
          }
          
        }
      )
      .fail(function(data) {
          console.log('whoami: ERROR',data)  
          $('#whoami').html('No connection to server storage')
          $('.require-server').toggleClass('disabled',true)
        }
      )
    
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

function convertTracksToV1() {
    let obj = []

    let nitems = 0

    for (let f in Tracks) {
        let frameItem = Tracks[f]
        if (frameItem == null) continue;
        
        console.log('saveEventsToFile: frame '+f)
        
        let frameItem1 = {}
        obj[Number(f)] = frameItem1;

        for (let i in frameItem) {
            let evt = frameItem[i]
            if (evt == null) continue;

            console.log('saveEventsToFile: frame '+f+'  id '+evt.ID)
            
            let evt1 = Object.assign(evt)
            //delete evt1.ID
            //delete evt1.bool_acts
            delete evt1.marked
            delete evt1.permanent
            evt1.cx = evt1.x+evt1.width/2
            evt1.cy = evt1.y+evt1.height/2
            
            evt1.x = Math.round(evt1.x*1000)/1000
            evt1.y = Math.round(evt1.y*1000)/1000
            evt1.width = Math.round(evt1.width*1000)/1000
            evt1.height = Math.round(evt1.height*1000)/1000
            evt1.cx = Math.round(evt1.cx*1000)/1000
            evt1.cy = Math.round(evt1.cy*1000)/1000
        
            frameItem1[String(i)] = evt1
            
            nitems++
        }
    }
    
    console.log('convertTracksToV1: converted '+nitems+' items')
    
    return obj
}
function convertTracksToV2() {
    let obj = {'info': TracksInfo, 'data':{}}
    
    obj.info.formatnote = 'Warning: data[f][i] is `i`ˆth event in frame `f`, with id `id` obtained by data[f][i].id, do not access directly as data[f][id] !'
    
    if (!obj.info.history) obj.info.history = []
    obj.info.history.push("Saved using labelbee on "+Date())
    
    let nitems = 0
    
    for (let f in Tracks) {
        let frameItem = Tracks[f]
        if (frameItem == null) continue;
        
        console.log('saveEventsToFile: frame '+f)
        
        let frameItem1 = []
        obj.data[String(f)] = frameItem1;

        for (let i in frameItem) {
            let evt = frameItem[i]
            if (evt == null) continue;

            console.log('saveEventsToFile: frame '+f+'  id '+evt.ID)
            
            let evt1 = Object.assign({'id': String(i)}, evt)
            delete evt1.ID
            delete evt1.bool_acts
            delete evt1.marked
            delete evt1.permanent
            evt1.cx = evt1.x+evt1.width/2
            evt1.cy = evt1.y+evt1.height/2
            
            evt1.x = Math.round(evt1.x*1000)/1000
            evt1.y = Math.round(evt1.y*1000)/1000
            evt1.width = Math.round(evt1.width*1000)/1000
            evt1.height = Math.round(evt1.height*1000)/1000
            evt1.cx = Math.round(evt1.cx*1000)/1000
            evt1.cy = Math.round(evt1.cy*1000)/1000
        
            frameItem1.push( evt1 )
            
            nitems++
        }
    }
    
    console.log('convertTracksToV2: converted '+nitems+' items')
    
    return obj
}
function saveEventsToFile(format) {
    console.log("saveEventsToFile: exporting to JSON...")

    if (!format) {format='v2'}

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

    let obj = null
    if (format == 'v1')
        obj = convertTracksToV1()
    else if (format == 'v2')
        obj = convertTracksToV2()
    if (obj == null) {
        console.log('saveEventsToFile: error while preparing data, Aborted.')
    }

    saveObjToJsonFile(obj, filename)
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

function saveEventsToCSV() {
    console.log("saveEventsToCSV: exporting to CSV...")

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

function saveEventsToBBoxes() {
    console.log("saveEventsToBBoxes: exporting bounding boxes to CSV...")
    console.log("with simple format: frame, left, top, right, bottom, pollen")

    var txt = tracksToBBoxes2(Tracks);

    saveCSVToFile(txt, "BBoxes.csv")
}

function eraseEvents() {
    var r = confirm("Are you sure you want to ERASE all manual annotations (Tracks)?");
    if (r == true) {
        console.log('ERASING all Tracks...')
        setTracks([])
    } else {
        console.log('User CANCELED Erase Tracks ...')
    }
}
function sanitizeEvents(obj) {
    var info
    var data
    if ('info' in obj) {
        // New events format v2 with metainfo
        
        // obj['info']
        info = obj['info']
        
        if (info['type'] != "events-multiframe") {
            console.log('sanitizeEvents: ABORTED, unsupported file format. info["type"]='+info['type'])
            return
        }
        
        // obj['data'].tags[tag_id_in_frame]
        data0 = obj['data']
        
        // New format more complex (store each frame as array of evts,
        // instead of dict of evts: allow duplicate ids, 
        // which current interface does not support)
        // for the moment, downgrade to simpler format
        
        hasDuplicateEntries = false
        
        data = {}
        for (let f in data0) {
            let frameItem0 = data0[f]
            if (frameItem0 == null) continue;
            
            let frameItem = {}
            data[String(f)] = frameItem;

            for (let i in frameItem0) {
                let evt0 = frameItem0[i]
                if (evt0 == null) continue;
                
                let evt = Object.assign({'ID': String(evt0.id)}, evt0)
                delete evt.id
                
                evt.bool_acts = [
                      hasLabel(evt,'fanning'),
                      hasLabel(evt,'pollen'),
                      hasLabel(evt,'entering'),
                      hasLabel(evt,'leaving')
                  ]
            
                if (frameItem[String(evt0.id)] == null) {
                    frameItem[String(evt0.id)] = evt
                } else {
                    console.log('sanitizeEvents: WARNING duplicate entry data['+f+']['+evt0.id+'] ignored.')
                    hasDuplicateEntries = true
                }
            }
        }
        
        if (hasDuplicateEntries) {
            alert('WARNING: Events file was loaded, but it has duplicate entries. Current version of software deleted redundant events.')
        }
        
    } else {
        // Old format v1: Tracks JSON directly stored in the json
        // obj is an array
        // obj[frame][bee_id]
        
        // Create dummy info header
        info = {
            "type": "events-multiframe",
            "source": "Converted from Tracks v1"
          }
        
        console.log('sanitizeEvents: Tracks JSON v1')
        if (typeof(obj) == 'array') {
            console.log('sanitizeEvents: got an array, converting to object')
            data = obj.reduce(function(acc, cur, i) {
              acc[i] = cur;
              return acc;
            }, {});
            info.source = "Converted from Tracks v1 array"
        } else if (typeof(obj) == 'object') {
          console.log('sanitizeEvents: got an object, use directly')
          data = obj;
          info.source = "Converted from Tracks v1 object"
        } else {
          console.log('sanitizeEvents: ABORTED, unsupported file format. Should be either array of frames, or object with frame ids as keys.')
          return
        }
        if ((!Object.keys(data).every(v => /^(0|[1-9]\d*)$/.test(v)))
           &(!Object.keys(data).every(v => Number.isInteger(v)))) {
            console.log('sanitizeEvents: ABORTED, unsupported file format. All keys should be positive integers (frame ids).')
            return
        }
    }
    
    return {'info':info, 'data':data}
}
function setTracks(obj) {
    console.log('setTracks: changing Tracks data structure and refreshing...')
    
    var evts = sanitizeEvents(obj);
    
    if (!evts) {
      console.log('setTracks: ABORTED, wrong format.')
      return;
    }
    
    Tracks = evts.data;
    TracksInfo = evts.info;
    
    videoControl.onFrameChanged();
    refreshChronogram()
}
function onReaderLoad(event) {
    console.log(event.target.result);
    var obj = JSON.parse(event.target.result);
    console.log(obj)
    
    setTracks(obj);
}
function loadEventsFromFile0(fileToRead) {
    console.log("loadFromFile0: importing from JSON...")

    $.get(fileToRead, function(data) {
        console.log("JSON loaded: ",data)
        var obj = JSON.parse(data)
        setTracks(obj);
    });

}
function loadEventsFromFile(event) {
    console.log("loadEventsFromFile: importing from JSON...")

    fileToRead = event.target.files[0]

    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(fileToRead);
}


function eraseTags() {
    var r = confirm("Are you sure you want to ERASE all Tags?");
    if (r == true) {
        console.log('ERASING all Tags...')
        setTags({})
    } else {
        console.log('User CANCELED Erase Tags ...')
    }
}

/* Augment tag items with frame field */
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
    
    var info
    if ('info' in obj) {
        // New tag format v2 with metainfo
        
        // obj['info']
        info = obj['info']
        
        if (info['type'] != "tags-multiframe") {
            console.log('setTags: ABORTED, unsupported file format. info["type"]='+info['type'])
            return
        }
        
        // obj['data'].tags[tag_id_in_frame]
        obj = obj['data']
    } else {
        // Old format v1: Tags JSON directly stored in the json
        // obj is an object
        // obj[frame].tags[tag_id_in_frame]
        
        console.log('setTags: Tags JSON v1, dictionary of frames')
        if (typeof(obj) != 'object') {
            console.log('setTags: ABORTED, unsupported file format. typeof(obj) is "'+typeof(obj)+'", should be "object"')
            return
        }
        if ((!Object.keys(Tags).every(v => /^(0|[1-9]\d*)$/.test(v)))
           &(!Object.keys(Tags).every(v => Number.isInteger(v)))) {
            console.log('setTags: ABORTED, unsupported file format. All keys should be positive integers (frame ids).')
            return
        }
        
        // Just use obj directly
        
        // Create dummy info header
        info = {
            "type": "tags-multiframe",
            "source": "Converted from Tags v1"
          }
    }
    
    Tags = obj;
    TagsInfo = info
    
    tagsAddFrames(Tags)
    
    ttags = getTTags()
    
    // Check if Tags data structure support the DM field
    tagsHaveDM = false
    if (!jQuery.isEmptyObject(Tags)) {
        let tags0 = Tags[Object.keys(Tags)[0]].tags
        if (tags0.length>0) {
            tagsHaveDM = ('dm' in tags0[0])
        }
    }
    // Disable DM field if not there
    $('.requireDM').prop('disabled', !tagsHaveDM); 
    $('.requireDM').toggleClass('disabled', !tagsHaveDM); 
    
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

    obj = {
        "info": {
            "type": "tags-multiframe",
            "data-format": "root.data[frame].tags[id_in_frame]"
            //"source": "Exported from labelbee on "+Date()
        },
        "data": Tags
    }

    saveObjToJsonFile(Tags, 'Tags.json')
}




// Server I/O

/* REST API Tracks files */

function tracksListFromServer(){
  var route = '/rest/events/'; // Hardcoded
  
  console.log("tracksListFromServer: importing Tracks List from URL '"+route+"'...")

  $('#loadTracksFromServerDialog .modal-body').html('<div>Loading Tracks file list from server. Please wait...</div>');

  $.ajax({
    url: url_for(route),
    type: 'GET',
    contentType: 'application/json',
    //data:{format:'json'}, // Without 'video', list all videos
    data:{format:'json', video:videoControl.videoName},
    success:function(json){
      // Get the file list in JSON format

      console.log("tracksListFromServer: SUCCESS\ntracksList=",json)

      let html = ""
      if (false) {
          for (let item of json) {
                html += '<button onclick="jsonFromServer(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button> <br>'
          }
      } else {
          html+="<table><thead>"
              +"<th>Link</th>"
              +"<th>Video</th>"
              +"<th>Owner</th>"
              +"<th>Created on</th>"
              +"</thead><tbody>"
          function boldize(text, flag) {
              if (flag) {
                  return '<b>'+text+'</b>'
              } else
                  return text
          }
          function formattimestamp(timestamp) {
              if (timestamp.length==12) {
                return "20"+timestamp.slice(0,2)+"-"
                       +timestamp.slice(2,4)+"-"+timestamp.slice(4,6)
                       +' '
                       +timestamp.slice(6,8)+':'
                       +timestamp.slice(8,10)+':'
                       +timestamp.slice(10,12)
              } else 
                return timestamp
          }
          for (let item of json) {
                html += ( '<tr>'
                +'<td><button onclick="jsonFromServer(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button></td>'
                +'<td>'+boldize(item['video'],
                                item['video']==videoControl.videoName)+'</td>'
                +'<td>'+item['user_name']+' ('+item['user_id']+')</td>'
                +'<td>'+formattimestamp(item['timestamp'])+'</td>'
                +'</tr>' )
          }
          html+="</tbody></table>"
      }
      $('#loadTracksFromServerDialog .modal-body').html(html);
      
      // Nothing else to do here: 
      // The modal #loadTracksFromServerDialog is supposed to be open 
      // and filled with links to each Track file
      // Clicking on one of the link will trigger jsonFromServer()
      },
    error: showAjaxError('ERROR in jsonFromServer', 
                          function() {$('#loadTracksFromServerDialog').modal('hide')})
  })
}

function jsonFromServer(url){

    console.log("jsonFromServer: importing Tracks from URL '"+url+"'...")

    $.ajax({
          url: url, //server url
          type: 'GET',    //passing data as post method
          contentType: 'application/json', // returning data as json
          data:'',
          success:function(json)
          {
            //alert("success");  //response from the server given as alert message

            console.log('jsonFromServer: SUCCESS\njson=', json); 
            Tracks= JSON.parse(json);
            videoControl.onFrameChanged();

            refreshChronogram();
          },
          error: showAjaxError('ERROR in jsonFromServer')
        });
  }
  
  
function mainAlert(text) {
    $('#mainAlertDialog .modal-body').html(text)
    $('#mainAlertDialog').modal('show')
}

function showAjaxError(title, prehook) {
    var callback = function(jqXHR, textStatus, errorThrown) {
        console.log('AJAX ERROR: '+title, jqXHR, textStatus, errorThrown, jqXHR.responseText)
        if (prehook) {
            prehook(jqXHR, textStatus, errorThrown)
        }
        mainAlert(title 
                  +'<br>Status: '+ textStatus
                  +'<br>Error: '+ errorThrown
                  +'<br>'+ jqXHR.responseText
)
    }
    return callback
}
  
function jsonToServer() {
    var route = '/rest/events/';

    console.log("jsonToServer")
        
    $.ajax({
        url: url_for(route), //server url
        type: 'POST',    //passing data as post method
        contentType: 'application/json', // returning data as json
        data: JSON.stringify({'video':videoControl.videoName,'data':Tracks}),  //form values
        success: function(json) {
          alert("Save JSON to server: Success "+json);  //response from the server given as alert message
        },
        error: showAjaxError('ERROR in jsonToServer')
    });

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
    statusRequest('tagsLoad','')

     $.getJSON( url_for(path) ,
        function(data) {
          console.log('tagsFromServer: loaded "'+path+'"')  
          statusUpdate('tagsLoad',true,'')
        }
      )
      .fail(function(data) {
          console.log('tagsFromServer: ERROR loading "'+path+'"')  
          statusUpdate('tagsLoad',false,'')
          setTags([])
        }
      )
      .done(function(data) {
          setTags(data)
        }
      )
}
function videoListFromServer(path, defaultvideoid) {     
    if (!path) {
        var userpath = window.prompt("Please enter path for Video List (server)","/data/videolist.csv");
        if (userpath==null || userpath=="") {
            console.log('videoListFromServer: canceled')
            return;
        }
    
        path = userpath;
    }
    
    console.log('videoListFromServer: loading path "'+path+'"...')  
    statusRequest('videolistLoad',true,'')
          
     $.ajax( url_for(path) ,
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
          statusUpdate('videolistLoad',true,'')
        }
      )
      .fail(function(data) {
          console.log('videoListFromServer: ERROR loading "'+path+'"')  
          statusUpdate('videolistLoad',false,'')
        }
      )
}
