/*jshint esversion: 6, asi: true */

// ## VideoList
// Video List: selection, metainformation, loading

// export ...

var videoinfo;

/* Video List */
function initVideoList() {
    videoListTable=[]

    videoList = [ 'testvideo.mp4',
                  'vlc1.mp4',
                  'vlc2.mp4',
                  '1_02_R_170419141405.mp4',
                  '1_02_R_170426151700_cleaned.mp4',
                  '36_01_H_160715100000_copy.mp4',
                  'GuraboTest/4_02_R_170511130000.mp4',
                  '2017-06-Gurabo/2_02_R_170609100000.mp4',
                  '2_02_R_170609100000.mp4' ]
    videoListTable = []
    for (let videoname of videoList) {
        videoListTable.push(videonameToTable(videoname))
    }
    videoListCurrentID = 0;
    
    updateVideoList()
    updateVideoSelectbox()
    
    videoinfo = {
        'name': 'No video loaded',
        'videofps': 20, // Should be equal to realfps (unless broken encoder)
        'realfps': 20,  //realfps = 20.0078;
        'starttime': '2016-07-15T09:59:59.360',
        'duration': 1/20, // Duration in seconds
        'nframes': 1,
        'frameoffset':0
    };
    updateVideoInfoForm()
    
    videoListFromServer('data/videolist.csv', 1)
}

function checkVideoList() {
    console.log('checkVideoList')
    let count = videoListTable.length
    for (var i = 0; i < videoListTable.length; i++){
        let videoname = videoListTable[i].video
        let url = videonameToURL(videoname)
        
        let itemToUpdate = videoListTable[i]
        itemToUpdate.checked = undefined
        
        if (logging.videoList)
            console.log('Checking ',url)
        
        fetch(url, {
            method: "head",
            mode: "no-cors"
        })
        .then(function(response) {
            if (response.status == 200) {
                itemToUpdate.checked = true
                count--
                //if (count==0) {
                    updateVideoList()
                //}
            } else {
                itemToUpdate.checked = false
                count--
                //if (count==0) {
                    updateVideoList()
                //}
            }
        })
        .catch(function(error) {
            count--
            //if (count==0) {
                updateVideoList()
            //}
        });
    }
}

function updateVideoList() {
    //var data = videoList;
    
    var html = "";
    for (var i = 0; i < videoListTable.length; i++){
        let checkStr = "?"
        if (typeof videoListTable[i].checked != 'undefined') {
            if (videoListTable[i].checked) 
                checkStr = "&#x2713;"
            else
                checkStr = "&times;"
        }
    
        html +="<tr>"+
                "<td><input type='button' data-arrayIndex='"+ i +"' onclick='selectVideoFromList(this)' class='btn btn-default btn-xs glyph-xs' value='"+(i+1)+"'></button>"+ "</td>"+
                "<td>"+ videoListTable[i].video + "</td>"+
                "<td>"+ checkStr + "</td>"+
                "</tr>";
    }
    html += '<tr><td><button value="Add video to list" onclick="addVideoClick()" type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-plus-sign"></span></button></td><td></td></tr>'
    
    $("#videoList").html(html);
    
    updateVideoSelectbox()
}
function updateVideoSelectbox() {
    var selectbox = $("#selectboxVideo")
    selectbox.find('option').remove()

    $.each(videoListTable, function (i, el) {
        selectbox.append("<option value='data/"+el.video+"'>"+el.video+"</option>");
    });
}
function updateVideoListSelection() {
    var id = videoListCurrentID;
    $( "#videoList tr.selected" ).removeClass("selected")
    $( "#videoList tr:nth-child("+(id+1)+")" ).addClass("selected") // jQuery index starts at 1
    
    $('#selectboxVideo').prop("selectedIndex", id);
}
function onSelectboxVideoChanged() {
    let id = $('#selectboxVideo').prop("selectedIndex")
    selectVideoByID(id)
}
function prefillVideoFields() {
    if (videoListTable==null) return;
    if (videoListTable[videoListCurrentID]==null) return;
    let tagfile = videoListTable[videoListCurrentID].tags
    if (tagfile != null) {
            videoTagURL = 'data/'+tagfile
    } else {
            videoTagURL = undefined
    }
}
function videonameToURL(videoname) {
    return 'data/'+videoname
}
function selectVideoByID(id) {
    id = Number(id)
    if (id >= videoListTable.length || id<0) {
        throw ('selectVideobyID: invalid id, id='+id);
    }
    videoListCurrentID = id
    
    prefillVideoFields()
    updateVideoListSelection()
    
    let url = videonameToURL(videoListTable[videoListCurrentID].video)
    
    videoControl.loadVideo(url)
    
    // Change handled in callback onVideoLoaded
}
function selectVideoFromList(target) {
    var id = Number($(target).attr('data-arrayindex'));
    console.log('selectVideoFromList: data-arrayindex=',id)
    selectVideoByID(id)
}

function videonameToTable(videoname) {
    let path = videoname.split('/')
    let name = path[path.length-1].replace(/\.[^/.]+$/, "")
    path[path.length-1] = 'Tags-'+name
    let tagname = path.join("/")
    return {video:videoname, 
            preview:videoname+'preview.mp4',
            tags:tagname}
}

/* Update Video List */
function addVideoToList(videoname) {
    videoListTable.push(videonameToTable(videoname))
    updateVideoList()
    selectVideoByID(videoList.length-1);
}
function addVideoClick() {
    var videoname = prompt("Add video to the list and select it:\n\nEnter video filename\ndata/ will be prefixed to its name", "vlc1.mp4");

    if (videoname == null || videoname == "") {
        console.log('addVideoClick: no video name entered')
    } else {
        addVideoToList(videoname)
    }
}


// ## Video custom metadata

function onStartTimeChanged(event) {
    console.log('onStartTimeChanged', event)

    var d = new Date(event.target.value)
    videoinfo.starttime = d.toISOString()

    updateChronoXDomainFromVideo()
    drawChrono()
}
function onVideoFPSChanged(event) {
    console.log('onVideoFPSChanged', event)

    videoinfo.videofps = Number(event.target.value)
    //video2.frameRate = videoinfo.videofps // Now handled by videoControl
    videoControl.onVideoInfoChanged() // Force recomputation of various parameters: nframes...
}
function onFPSChanged(event) {
    console.log('onFPSChanged (real)', event)

    videoinfo.realfps = Number(event.target.value)
    updateChronoXDomainFromVideo() // Change the real timeline
    drawChrono()
}
function onFrameOffsetChanged(event) {
    console.log('onFrameOffsetChanged (real)', event)

    videoinfo.frameoffset = Number(event.target.value)
    videoControl.onVideoInfoChanged() // Force recomputation of various parameters: nframes...
}

function updateVideoInfoForm() {
    $('#videofps').val(videoinfo.videofps)
    $('#realfps').val(videoinfo.realfps)
    $('#startTime').val(videoinfo.starttime)
    $('#videoTagsFamily').val(videoinfo.tagsfamily)
    $('#videoPlace').val(videoinfo.place)
    $('#videoComments').text(videoinfo.comments)
}

