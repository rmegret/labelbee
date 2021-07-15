from csv import DictReader
from datetime import datetime
from labelbee.models import Video, VideoData, DataSet, VideoDataSet, User
from labelbee.init_app import db, app
from typing import List


def injest_videos(filename: str) -> None:
    with app.app_context():
        with open(filename) as tagfile:
            reader = DictReader(tagfile)
            for i, row in enumerate(reader):
                file_name = row["mp4file"].split("/")[-1]
                path = "/".join(row["mp4file"].split("/")[:-1])

                timestamp = datetime(
                    year=int("20" + row["YY"]),
                    month=int(row["MM"]),
                    day=int(row["DD"]),
                    hour=int(row["hh"]),
                    minute=int(row["mm"]),
                    second=int(row["ss"]),
                )

                video = Video(
                    file_name=file_name,
                    path=path,
                    timestamp=timestamp,
                    location=row["cam"],
                    colony=int(float(row["newcol"])),
                    frames=int(float(row["frames"])),
                    width=int(float(row["width"])),
                    height=int(float(row["height"])),
                    fps=float(row["fps"]),
                    realfps=float(row["realfps"]),
                    filesize=int(row["filesize"]),
                    hash=row["hash"],
                    corrupted=bool(row["corrupted"]),
                    trimmed=bool(row["trimmed"]),
                    hasframe0=bool(row["hasframe0"]),
                    hasframe_1s=bool(row["hasframe_1s"]),
                    hasframe_2s=bool(row["hasframe_2s"]),
                    hasframe_10s=bool(row["hasframe_10s"]),
                    hasframeN_30s=bool(row["hasframeN_30s"]),
                    hasframeN_2s=bool(row["hasframeN_2s"]),
                    hasframeN_1s=bool(row["hasframeN_1s"]),
                    hasframeN=bool(row["hasframeN"]),
                )
                db.session.add(video)
            db.session.commit()


def injest_tags(filename: str) -> None:
    with app.app_context():
        with open(filename) as tagfile:
            reader = DictReader(tagfile)
            for i, row in enumerate(reader):
                file_name = row["tagsfile"].split("/")[-1]
                path = "/".join(row["tagsfile"].split("/")[:-1])

                timestamp = datetime(
                    year=int("20" + row["YY"]),
                    month=int(row["MM"]),
                    day=int(row["DD"]),
                    hour=int(row["hh"]),
                    minute=int(row["mm"]),
                    second=int(row["ss"]),
                )
                if video := Video.query.filter(
                    Video.file_name == row["mp4file"].split("/")[-1],
                    Video.path == "/".join(row["mp4file"].split("/")[:-1]),
                ).first():
                    video = video.id
                else:
                    raise Exception(
                        f"""No video found with name {row["mp4file"].split("/")[-1]} and path {"/".join(row["mp4file"].split("/")[:-1])}"""
                    )

                video_data = VideoData(
                    file_name=file_name,
                    path=path,
                    timestamp=timestamp,
                    data_type="tag",
                    video=video,
                    created_by="bigdbee",
                )
                db.session.add(video_data)
            db.session.commit()


def video_data_list(videoid: int) -> List[VideoData]:
    return VideoData.query.filter(VideoData.video == videoid).all()


def video_list(dataset=None) -> List[Video]:
    if dataset:
        return (
            Video.query.join(VideoDataSet)
            .filter(
                VideoDataSet.ds_id == dataset,
                Video.id == VideoDataSet.video_id,
            )
            .all()
        )
    else:
        return Video.query.all()


def dataset_list() -> List[DataSet]:
    return DataSet.query.all()


def video_info(videoid: int) -> Video:
    return Video.query.filter(Video.id == videoid).first()


def new_dataset(name: str, description: str, user: User):
    dataset = DataSet(
        name="New Dataset" if name.strip() == "" else name,
        description=description,
        created_by=user.id,
        timestamp=datetime.utcnow(),
    )
    db.session.add(dataset)
    db.session.commit()


# search for a video using sqlalchemy flask
def search_video(query: str) -> List[Video]:
    return Video.query.filter(Video.file_name.like(f"%{query}%")).all()


def get_user_by_id(userid: int) -> User:
    return User.query.filter(User.id == userid).first()


def get_dataset_by_id(datasetid: int) -> DataSet:
    return DataSet.query.filter(DataSet.id == datasetid).first()


def delete_dataset_by_id(datasetid: int) -> None:
    dataset = get_dataset_by_id(datasetid)
    print(dataset.name, dataset.id)
    db.session.delete(dataset)
    db.session.commit()


# Add video to a dataset using video id and dataset id
def add_video_to_dataset(videoid: int, datasetid: int) -> None:
    video_data_set = VideoDataSet(video_id=videoid, ds_id=datasetid)
    db.session.add(video_data_set)
    db.session.commit()


def edit_dataset(datasetid: int, name: str, description: str) -> None:
    dataset = get_dataset_by_id(datasetid)
    dataset.name = name
    dataset.description = description
    db.session.commit()


def get_video_by_id(videoid: int) -> Video:
    return Video.query.filter(Video.id == videoid).first()


def edit_video(
    videoid: int,
    file_name: str,
    path: str,
    timestamp: datetime,
    location: str,
    colony: int,
    frames: int,
    width: int,
    height: int,
) -> None:
    video = get_video_by_id(videoid)
    video.file_name = file_name
    video.path = path
    video.timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    video.location = location
    video.colony = colony
    video.frames = frames
    video.width = width
    video.height = height
    db.session.commit()


def get_video_data_by_id(video_dataid: int) -> VideoData:
    print(video_dataid)
    return VideoData.query.filter(VideoData.id == video_dataid).first()


def edit_video_data(
    video_dataid: int,
    file_name: str,
    path: str,
    timestamp: datetime,
    data_type: str,
    video: int,
) -> None:
    video_data = get_video_data_by_id(video_dataid)
    video_data.file_name = file_name
    video_data.path = path
    video_data.timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    video_data.data_type = data_type
    video_data.video = video
    db.session.commit()
