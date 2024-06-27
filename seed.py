from labelbee import  create_app, db
from labelbee.models import User, Role, UsersRoles, DataSet, Video, VideoData
from sqlalchemy import DateTime
from flask_security import hash_password
import bcrypt

import time

app = create_app()

with app.app_context():

    role_1 = Role(
            name="admin",
            label="admin"
        )
    role_2 = Role(
            name="user",
            label="user"
        )
    
    password = "password"
    hashed_password =  bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user_1 = User(
        email="andres.ramos7@upr.edu",
        password=hashed_password,
        active=True,
        first_name="Andres",
        last_name="Ramos",
        studentnum="801-16-6704",

    )
    user_2 =  User(
        email="josue.rodriguez10@upr.edu",
        password=hashed_password,
        active=True,
        first_name="Josue",
        last_name="Rodriguez",
        studentnum="802-08-7180",
    )

    user_3 = User(
        email="gabriel.santiago21@upr.edu",
        password=hashed_password,
        active=True,
        first_name="Gabriel",
        last_name="Santiago",
        studentnum="801-18-8367",
    )

    db.session.add(role_1)
    db.session.add(role_2)
    db.session.add(user_1)
    db.session.add(user_2)
    db.session.add(user_3)

    db.session.commit()


    userrole_1 = UsersRoles(
        user_id=user_1.id,
        role_id=role_1.id
    )
    userrole_2 = UsersRoles(
        user_id=user_2.id,
        role_id=role_1.id
    )
    userrole_3 = UsersRoles(
        user_id=user_3.id,
        role_id=role_1.id
    )

    db.session.add(userrole_1)
    db.session.add(userrole_2)
    db.session.add(userrole_3)

    db.session.commit()

    dataset_1 = DataSet(
        name="Bee Dataset Gurabo",
        description="",
        created_by=user_1.id,

    )

    dataset_2 = DataSet(
        name="Mango Dataset RP",
        description="Mango pollinators filmed in RP",
        created_by=user_1.id,

    )

    dataset_3 = DataSet(
        name="Mango Dataset Juana Diaz",
        description="Mango pollinators filmed in Juana Diaz",
        created_by=user_2.id,

    )

    db.session.add(dataset_1)
    db.session.add(dataset_2)
    db.session.add(dataset_3)
    db.session.commit()


    video_1 = Video(
        file_name="gurabo_video.mp4",
        path="/videos",
        timestamp="2020/01/01",
        location=1,
        colony="colony 1",
        notes="",
        dataset=dataset_1.id,
        thumb="./thumbnails/gurabo_video_1.png",
        frames=6126,
        height=2816,
        width=2816,
        fps=22.700312844682205,
        realfps=22.700312844682205,
        filesize=2652712916,
        hash="",
        trimmed=False,
        hasframe0 = False,
        hasframe_1s = False,
        hasframe_2s = False,
        hasframe_10s = False,
        hasframeN_30s = False,
        hasframeN_2s = False,
        hasframeN_1s = False,
        hasframeN = False
    )

    video_2 = Video(
        file_name="pollinators_RP_video.mp4",
        path="/videos",
        timestamp="2020/01/01",
        location=5,
        colony="colony 2",
        notes="",
        dataset=dataset_2.id,
        thumb="./thumbnails/pollinators_video_rp.png",
        frames=10000,
        height=1080,
        width=1080,
        fps=60,
        realfps=60,
        filesize=1020391723,
        hash="",
        trimmed=False,
        hasframe0 = False,
        hasframe_1s = False,
        hasframe_2s = False,
        hasframe_10s = False,
        hasframeN_30s = False,
        hasframeN_2s = False,
        hasframeN_1s = False,
        hasframeN = False
    )

    video_3 = Video(
        file_name="pollinators_Juana_Diaz_video.mp4",
        path="/videos",
        timestamp="2023/05/01",
        location=3,
        colony="colony 10",
        notes="",
        dataset=dataset_3.id,
        thumb="./thumbnails/pollinators_video_juana_diaz.png",
        frames=10000,
        height=1080,
        width=1080,
        fps=60,
        realfps=60,
        filesize=1020391723,
        hash="",
        trimmed=False,
        hasframe0 = False,
        hasframe_1s = False,
        hasframe_2s = False,
        hasframe_10s = False,
        hasframeN_30s = False,
        hasframeN_2s = False,
        hasframeN_1s = False,
        hasframeN = False
    )

    db.session.add(video_1)
    db.session.add(video_2)
    db.session.add(video_3)
    db.session.commit()

    video_data_1 = VideoData(
        file_name="gurabo_video_data",
        path="/video_data",
        timestamp="2024/02/12",
        data_type="csv",
        data="not sure",
        notes="",
        video_id = video_1.id,
        created_by_id=user_1.id
    )

    video_data_2 = VideoData(
        file_name="pollinators_rp_video_data",
        path="/video_data",
        timestamp="2024/02/12",
        data_type="csv",
        data="not sure",
        notes="",
        video_id = video_2.id,
        created_by_id=user_1.id
    )

    video_data_3 = VideoData(
        file_name="pollinators_juana_diaz_video_data",
        path="/video_data",
        timestamp="2024/03/31",
        data_type="csv",
        data="not sure",
        notes="",
        video_id = video_2.id,
        created_by_id=user_2.id
    )

    db.session.add(video_data_1)
    db.session.add(video_data_2)
    db.session.add(video_data_3)
    db.session.commit()