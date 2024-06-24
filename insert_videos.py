import json 
import sqlalchemy
from sqlalchemy.orm import Session
import pandas as pd
import os
from dotenv import load_dotenv
import shlex
import cv2
import glob 
from labelbee.models import Video
import time 

load_dotenv() 
files = ["flowerpatch_20240606_09h10.MP4",  "flowerpatch_20240606_10h12.MP4"
"flowerpatch_20240606_09h15.MP4",  "flowerpatch_20240606_10h17.MP4"
"flowerpatch_20240606_09h20.MP4",  "flowerpatch_20240606_10h22.MP4"
"flowerpatch_20240606_09h25.MP4",  "flowerpatch_20240606_10h27.MP4"
"flowerpatch_20240606_09h30.MP4",  "flowerpatch_20240606_10h32.MP4"
"flowerpatch_20240606_09h32.MP4",  "flowerpatch_20240606_10h37.MP4"
"flowerpatch_20240606_09h37.MP4",  "flowerpatch_20240606_10h42.MP4"
"flowerpatch_20240606_09h42.MP4",  "flowerpatch_20240606_10h46.MP4"
"flowerpatch_20240606_09h47.MP4",  "flowerpatch_20240606_10h51.MP4"
"flowerpatch_20240606_09h48.MP4",  "flowerpatch_20240606_10h56.MP4"
"flowerpatch_20240606_09h53.MP4",  "flowerpatch_20240606_11h01.MP4"
"flowerpatch_20240606_09h58.MP4",  "flowerpatch_20240606_11h04.MP4"
"flowerpatch_20240606_10h03.MP4",  "flowerpatch_20240606_11h09.MP4"
"flowerpatch_20240606_10h07.MP4",  "flowerpatch_20240606_11h14.MP4"]

def count_events(J):
    # Count annotated frames and number of events from labelbee JSON
    d = json.loads( J )
    D = d['data']
    evts=[]; frames=0
    for f in D:
        #print(f"# Frame {f}")
        #print([ev['id'] for ev in D[f]])
        E=[(f,ev['id']) for ev in D[f]]
        evts.extend( E )
        if (len(E)>0): frames+=1
    return frames, len(evts)



class LabelbeeDB:
    def __init__(self):
        user = None
        password = None
        host = None
        
        video_data = None
    
    # QUICKFIX: read the DB_ variables directly from the script code
    def load_credentials_from_script(self,bashsetupscript,
                                 vars=['DB_USER','DB_PASSWORD','DB_URL'],
                                 verbose=False):
        D = {}
        with open(bashsetupscript) as f:
            for line in f:
                if not('export' in line): continue; # FIXME: should be regexp
                (key,rawvalue) = line.strip().replace('export ', '', 1).split('=', 1)
                if (key not in vars): continue;
                value = shlex.split(rawvalue)[0] # unquote, ignore any additional arguments
                if (verbose):
                    print(f"##{line.strip()}##\n##{key}## <- ##{value}##")
                #os.environ.update( [(key,value)] )
                D[key]=value

        

        self.user = lo.get('DB_USER')
        self.password = D.get('DB_PASSWORD')
        self.host = D.get('DB_URL').split('/')

    def load_credentials_from_env(self):
        self.user = os.environ.get('MYSQL_USER')
        self.password = os.environ.get('MYSQL_PASSWORD')
        self.host = os.environ.get('MYSQL_HOST')
        #user, password, host

    def connect(self):
        url = sqlalchemy.engine.URL.create(
            drivername="mysql+pymysql",
            username='root',
            password='password',
            host="localhost",
            database="labelbee-db", 
            port=3306
        )
        print(f"Connecting...")

        engine = sqlalchemy.create_engine(url)
        metadata = sqlalchemy.MetaData()
        connection = engine.connect()
        
        self.engine = engine
        self.connection = connection
        
        self.video_data = sqlalchemy.Table('video_data', metadata, )
        self.videos = sqlalchemy.Table('videos', metadata)
        # datasets = sqlalchemy.Table('data_set', metadata)
        self.users = sqlalchemy.Table('users', metadata)
        
        print(f"Connected")
        # print(self.videos)

    def session(self):
        return sqlalchemy.orm.Session(self.engine)
    
    def userid_to_user(self, userid):
        users=self.users
        with self.session as session:
            a = session.query(users).filter(users.columns.id == userid).one()
        return f"{a['first_name']} {a['last_name']} <{a['email']}>"
        
    def get_videos(self, dataset=None):
        # Get all videos, or those from dataset
        # dataset in "gurabo10", "flowerpatch", "wild"
        
        vdf = pd.read_sql(
            "SELECT * FROM videos",
            con=self.connection
        )
        if (dataset is not None):
            vdf.index = vdf.id
            vids = vdf[vdf.path.str.contains(dataset)].id
            vdf = vdf.loc[vids]
        return vdf
    
    def get_videos_query(self):
        with self.session as session:
            a = session.query(video_data).all()
        return a
    
    def get_video_data(self, dataset=None):
        # Get all videos, or those from dataset
        # dataset in "gurabo10", "flowerpatch", "wild"
        
        edf = pd.read_sql(
            "SELECT * FROM video_data",
            con=self.connection
        )
        for _,item in edf.iterrows():
            #print(item)
            annotator = self.userid_to_user(item.created_by_id)
            f,e = count_events(item.data)
            print(f"{item.video_id} {vdf.loc[item.video_id].file_name} labeled_frames={f} nb_events={e} [{annotator}] [{item.timestamp}]")
            edf.loc[item.index,"labeled_frames"]=f
            edf.loc[item.index,"nb_events"]=e
            edf.loc[item.index,"username"]=annotator
        return edf
    
    def wildbee_videos_df(self):
        DF = self.get_videos("wild")
        EXP=DF.path.str.split("/", expand=True)
        #print(EXP)
        DF["cultivar"]=EXP[5]
        DF["year"]=EXP[4]
        DF["week"]=EXP[6]
        EXP2=DF.file_name.str.extract(".+_(day\d+)_.+")
        #print(EXP2)
        DF["day"]=EXP2
        DF["date"]=EXP[7]
        EXP3=DF.file_name.str.extract(".+_(\d\dh\d\d)\.MP4")
        DF["time"]=EXP3
        DF = DF[['id', 'file_name', 'year', 'cultivar', 'week', 'day', 'date','time','notes', 'path', 'timestamp', 
               'frames', 'height', 'width', 'fps', 'realfps', 'filesize', 'dataset']]
        return DF


db = LabelbeeDB()
db.load_credentials_from_env()
db.connect()
session = db.session()

# TODO: Figure out video_folder_path
# TODO: Figure out dataset id
# TODO: Determine Gurabo location


video_folder_path = "./labelbee/static/data/videos/"
dataset_id = "1"
for video_path in glob.glob(f"{video_folder_path}/*"):
    print(video_path)

    #Get fps
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error opening video file!")
    real_fps = cap.get(cv2.CAP_PROP_FPS)
    frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    file_name = video_path.split("/")[-1]
    path = "/".join(video_path.split("/")[:-1]) + "/"
    location = 1
    thumb = ""
    colony = 10
    notes = ""
    dataset = dataset_id
    filesize = os.path.getsize(video_path)
    _hash = ""
    fps = 60
    local_time = time.localtime(time.time())
    time_stamp = time.strftime("%Y-%m-%d", local_time)
    video_entry = {
        "file_name": file_name, #Yes
        "path": path, # Yes
        "timestamp": time_stamp,
        "location": location, #Yes
        "colony": colony, #Yes 
        "notes": notes,
        "dataset": dataset_id, #yes
        "thumb": thumb,
        "frames": frames, #yes)
        "height": height, #yes
        "width": width,
        "fps": fps,
        "realfps": real_fps,
        "filesize": filesize,
        "hash": _hash

    }
    video = Video(**video_entry)
    session.add(video)
    session.commit()