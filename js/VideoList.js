/*jshint esversion: 6, asi: true */

// ## VideoList
// Video List: selection, metainformation, loading

// export ...

var videoinfo;

/* Video List */
function initVideoList() {
    videoList = [ 'testvideo.mp4',
                  'vlc1.mp4',
                  'vlc2.mp4',
                  '1_02_R_170419141405.mp4',
                  '1_02_R_170426151700_cleaned.mp4',
                  '36_01_H_160715100000_copy.mp4',
                  'GuraboTest/4_02_R_170511130000.mp4',
                  '2017-06-Gurabo/2_02_R_170609100000.mp4' ]
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
}
function updateVideoList() {
    var data = videoList;
    
    var html = "";
    for (var i = 0; i < data.length; i++){
        html +="<tr>"+
                "<td><input type='button' data-arrayIndex='"+ i +"' onclick='selectVideoFromList(this)' class='btn btn-default btn-xs glyph-xs' value='"+(i+1)+"'></button>"+ "</td>"+
                "<td>"+ data[i] + "</td>"+
                "</tr>";
    }
    html += '<tr><td><button value="Add video to list" onclick="addVideoClick()" type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-plus-sign"></span></button></td><td></td></tr>'
    
    $("#videoList").html(html);
    
    updateVideoSelectbox()
}
function updateVideoSelectbox() {
    var selectbox = $("#selectboxVideo")
    selectbox.find('option').remove()

    $.each(videoList, function (i, el) {
        selectbox.append("<option value='data/"+el+"'>"+el+"</option>");
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
function selectVideoByID(id) {
    id = Number(id)
    if (id >= videoList.length || id<0) {
        throw ('selectVideobyID: invalid id, id='+id);
    }
    videoListCurrentID = id
    let file = 'data/'+videoList[id]
    updateVideoListSelection()
    videoControl.loadVideo(file)
    
    // Change handled in callback onVideoLoaded
}
function selectVideoFromList(target) {
    var id = Number($(target).attr('data-arrayindex'));
    console.log('selectVideoFromList: data-arrayindex=',id)
    selectVideoByID(id)
}

/* Update Video List */
function addVideoToList(videoname) {
    videoList.push(videoname)
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

