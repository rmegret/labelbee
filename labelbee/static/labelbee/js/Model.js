/*jshint esversion: 6, asi: true */ 



var Tracks = [];
var Tags = [];

// ######################################################################
// MODEL: Tracks data structure

/** Basic Annotation class */
function Observation(ID) {
    this.ID = ID;
    this.time = 0;
    this.frame = 0;
    this.x = 0;
    this.y = 0;
    this.cx = 0;
    this.cy = 0;
    this.width = 0;
    this.height = 0;
    //this.marked = false;
    //this.permanent = false;
    this.angle = 0;

    this.bool_acts = [false, false, false, false]; //Should be kept numerical because Ram
    this.notes=''
    this.labels=''
}

function cloneObs(obs) {
    let cloned = {}
    copyObs(cloned, obs)
    return cloned
}

function deepcopy(obj) {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj))
}

function copyObs(obs, tmpObs) {
    // Shallow copy: internal handles such aslabels or parts point to same thing...
    obs.ID = tmpObs.ID;
    obs.time = tmpObs.time;
    obs.frame = tmpObs.frame;
    
    obs.x = tmpObs.x;
    obs.y = tmpObs.y;
    obs.cx = tmpObs.cx;
    obs.cy = tmpObs.cy;
    obs.width = tmpObs.width
    obs.height = tmpObs.height
    //obs.marked = tmpObs.marked;
    //obs.permanent = tmpObs.permanent;
    if (tmpObs.bool_acts) {
        obs.bool_acts = []
        obs.bool_acts[0] = tmpObs.bool_acts[0];
        obs.bool_acts[1] = tmpObs.bool_acts[1];
        obs.bool_acts[2] = tmpObs.bool_acts[2];
        obs.bool_acts[3] = tmpObs.bool_acts[3];
    } else {
        obs.bool_acts = [false, false, false, false]
    }
    obs.angle = tmpObs.angle;
    obs.notes = tmpObs.notes;
    obs.labels = tmpObs.labels;
    obs.parts = tmpObs.parts;
    obs.newid = tmpObs.newid; // in case of wrongid
    obs.fix = deepcopy(tmpObs.fix);
    if (tmpObs.visit) 
        obs.visit = tmpObs.visit
}
function hasParts(obs) {
    return (!!obs.parts && obs.parts.length>0)
}

function getValidIDsForFrame(frame) {
    // Return an Iterator to Tracks[frame]

    if (Tracks[frame] == null) {
        return [];
    }
    //NO: var ids = Array.from(Tracks[frame].keys()) // Problem: includes ids to undefined values also

    let trackf = Tracks[frame];
    let ids = [];
    for (let id in trackf) {
        if (trackf[id] != null) {
            ids.push(id);
        }
    }
    //console.log("getValidIDsForFrame: frame=",frame,",  Tracks[frame]=",trackf)
    //console.log("getValidIDsForFrame: ids=",ids)
    return ids;
}
function getValidIDsForFrames(interval) {
    let fmin = interval[0];
    let fmax = interval[1];
    
    var ids=new Set();
    for (let f=fmin; f<=fmax; f++) {
        let fids = getValidIDsForFrame(f);
        for (let id of fids) {
            ids.add(id);
        }
    }    
    return [...ids.values()];
}

function obsDoesExist(frame, id) {
    if (Tracks[frame] == null) {
        return false
    }
    if (Tracks[frame][id] == null) {
        return false
    }
    return true
}

function getObsHandle(frame, id, createIfEmpty) {
    if (createIfEmpty == null)
        createIfEmpty = false;

    var obs
    if (Tracks[frame] == null) {
        if (createIfEmpty) {
            Tracks[frame] = {}
        } else {
            return undefined
        }
    }

    if (Tracks[frame][id] == null) {
        if (createIfEmpty) {
            Tracks[frame][id] = new Observation(id);
        } else {
            return undefined
        }
    }
    return Tracks[frame][id]
}

function storeObs(tmpObs) {
    var obs = getObsHandle(tmpObs.frame, tmpObs.ID, true);
    
    copyObs(obs, tmpObs)

    if (logging.submitEvents)
        console.log("Submitting obs = ", obs)
}

/**
 * 
 * @param {*} frame 
 * @param {*} old_id 
 * @param {*} new_id 
 * @param {(false|true|'swap')} force 
 * @returns true if change was performed
 */
function changeObservationID(frame, old_id, new_id, force) {
    // REMI: modified to be be independent of View
    if (old_id==new_id) {
        console.log("changeObservationID: ABORT, old_id=",old_id," same as new_id=",new_id);
        return false
    }
    if (Tracks[frame] != null) {
        if (!force) {
            if (Tracks[frame][new_id] != null) {
                console.log("changeObservationID: ABORT, new_id=",new_id," already exists");
                return false
            }
        }
        if (Tracks[frame][old_id] != null) {
            if (logging.submitEvents)
                console.log("changeObservationID: frame=", frame, "old_id=", old_id, " new_id=", new_id);
            let backup_new_id = Tracks[frame][new_id]
            Tracks[frame][new_id] = Tracks[frame][old_id];
            if ((backup_new_id) && (force=='swap')) {
                Tracks[frame][old_id] = backup_new_id
                Tracks[frame][old_id].ID = old_id;
            } else {
                delete Tracks[frame][old_id];
            }
            Tracks[frame][new_id].ID = new_id;
            return true
        } else {
            console.log("changeObservationID: There's no bee id=", old_id, " on frame=", frame);
            return false
        }
    } else {
        console.log("changeObservationID: Empty frame, frame=", frame);
        return false
    }
}
function getFramesWithID(interval, id) {
    let fmin = interval[0];
    let fmax = interval[1];
    if (fmax==-1) {
        fmax = videoinfo.nframes-1
    }
    
    var frames = []
    for (let f=fmin; f<=fmax; f++) {
        if (obsDoesExist(f, id)) {
            frames.push(f)
        }
    }    
    return frames;
}
function getFramesWithSwapID(interval, id, new_id) {
    let fmin = interval[0];
    let fmax = interval[1];
    if (fmax==-1) {
        fmax = videoinfo.nframes-1
    }
    
    var frames = []
    for (let f=fmin; f<=fmax; f++) {
        if (obsDoesExist(f, id) && obsDoesExist(f, new_id)) {
            frames.push(f)
        }
    }    
    return frames;
}
function obs_swapID(interval, old_id, new_id) {
    let fmin = interval[0];
    let fmax = interval[1];
    if (fmax==-1) {
        fmax = videoinfo.nframes-1
    }

    for (let f=fmin; f<=fmax; f++) {
        if (obsDoesExist(f, old_id)) {
            let exist = obsDoesExist(f, new_id)
            if (exist) {
                if (logging.submitEvents) {
                    console.log('swapID, existing event frame='+f+' id='+new_id+' swapped down to id='+old_id)
                }
                changeObservationID(f, new_id, 'SWAP_save_'+new_id)
            }
            changeObservationID(f, old_id, new_id)
            if (exist) {
                changeObservationID(f, 'SWAP_save_'+new_id, old_id)
            }
        }
    }    
}



function printTracks() {
    //Just for debugging
    console.log("This is Tracks:")
    for (let F in Tracks) {
        for (let iid in Tracks[F]) {
            console.log("F =", F, ", iid =", iid, ", Tracks[F][idd] =", Tracks[F][iid])
        }
    }
}



// Model of Tags

function cacheTags() {
    tagCache = []
    for (let F in Tags) {
        let tags = Tags[F].tags
        for (let i in tags) {
            let tag = tags[i]
            let id = String(tag.id)
            let key = F.toString()+','+id
            if (typeof ttags[key] === 'undefined')
                tagCache[key]=[tag]
            else
                tagCache[key].push(tag);
        }
    }
}

/** Returns a list of tags matching frame and id. 
    Can be empty, have one element, or several */
function getTags(frame, id) {
    let key = frame.toString()+','+id.toString()
    let value = tagCache[key]
    return value
    //if (typeof value === "undefined") return undefined;
    //return value
}


