"""
Database Functions
====================================
All functions that interact with the database.
"""


from csv import DictReader
from datetime import datetime
from labelbee.models import Video, VideoData, DataSet, VideoDataSet, User
from labelbee.init_app import db, app
from typing import List


def injest_videos(filename: str) -> None:
    """
    Injest videos from a csv file.

    Parameters
    ----------
    filename : str
        The name of the csv file to injest.
    """

    with app.app_context():
        with open(filename) as tagfile:
            reader = DictReader(tagfile)
            for row in reader:
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
    """
    Injest tags from a csv file.

    Parameters
    ----------
    filename : str
        The name of the csv file to injest.
    """

    with app.app_context():
        with open(filename) as tagfile:
            reader = DictReader(tagfile)
            for row in reader:
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
                video = Video.query.filter(
                    Video.file_name == row["mp4file"].split("/")[-1],
                    Video.path == "/".join(row["mp4file"].split("/")[:-1]),
                ).first()
                if video:
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
    """
    Get a list of all video data for a video.

    Parameters
    ----------
    videoid : int
        The id of the video to get data for.

    Returns
    -------
    List[VideoData]
        A list of all video data.
    """

    return VideoData.query.filter(VideoData.video == videoid).all()


def video_list(dataset=None) -> List[Video]:
    """
    Get a list of all videos in a dataset.

    Parameters
    ----------
    dataset : DataSet
        The dataset to get videos from.
        if None, get all videos.

    Returns
    -------
    List[Video]
        A list of all videos.
    """

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
    """
    Get list of all datasets.

    Returns
    -------
    List[DataSet]
        A list of all datasets.
    """

    return DataSet.query.all()


def video_info(videoid: int) -> Video:
    """
    Get a video by id.

    Parameters
    ----------
    videoid : int
        The id of the video to get.

    Returns
    -------
    Video
        The video.
    """

    return Video.query.filter(Video.id == videoid).first()


def new_dataset(name: str, description: str, user: User):
    """
    Create a new dataset.

    Parameters
    ----------
    name : str
        The name of the dataset.
    description : str
        The description of the dataset.
    user : User
        The user creating the dataset.
    """

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
    """
    Search for a video by name.

    Parameters
    ----------
    query : str
        The name of the video to search for.

    Returns
    -------
    List[Video]
        A list of videos matching the query.
    """

    return Video.query.filter(Video.file_name.like(f"%{query}%")).all()


def get_user_by_id(userid: int) -> User:
    """
    Get a user by id.

    Parameters
    ----------
    userid : int
        The id of the user to get.

    Returns
    -------
    User
        The user.
    """

    return User.query.filter(User.id == userid).first()


def get_dataset_by_id(datasetid: int) -> DataSet:
    """
    Get a dataset by id.

    Parameters
    ----------
    datasetid : int
        The id of the dataset to get.

    Returns
    -------
    DataSet
        The dataset.
    """
    return DataSet.query.filter(DataSet.id == datasetid).first()


def delete_dataset_by_id(datasetid: int) -> None:
    """
    Delete a dataset by id.

    Parameters
    ----------
    datasetid : int
        The id of the dataset to delete.
    """

    dataset = get_dataset_by_id(datasetid)
    if dataset:
        db.session.delete(dataset)
        db.session.commit()


# Add video to a dataset using video id and dataset id
def add_video_to_dataset(videoid: int, datasetid: int) -> None:
    """
    Add a video to a dataset.

    Parameters
    ----------
    videoid : int
        The id of the video to add.
    datasetid : int
        The id of the dataset to add the video to.
    """
    video_data_set = VideoDataSet(video_id=videoid, ds_id=datasetid)
    db.session.add(video_data_set)
    db.session.commit()


def edit_dataset(datasetid: int, name: str, description: str) -> None:
    """
    Edit a dataset.

    Parameters
    ----------
    datasetid : int
        The id of the dataset to edit.
    name : str
        The new name of the dataset.
    description : str
        The new description of the dataset.
    """

    dataset = get_dataset_by_id(datasetid)
    if dataset:
        dataset.name = name
        dataset.description = description
        db.session.commit()


def get_video_by_id(videoid: int) -> Video:
    """
    Get a video by id.

    Parameters
    ----------
    videoid : int
        The id of the video to get.

    Returns
    -------
    Video
        The video.
    """

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
    """
    Edit a video.

    Parameters
    ----------
    videoid : int
        The id of the video to edit.
    file_name : str
        The new name of the video.
    path : str
        The new path of the video.
    timestamp : datetime
        The new timestamp of the video.
    location : str
        The new location of the video.
    colony : int
        The new colony of the video.
    frames : int
        The new number of frames of the video.
    width : int
        The new width of the video.
    height : int
        The new height of the video.
    """

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
    """
    Get a video data by id.

    Parameters
    ----------
    video_dataid : int
        The id of the video data to get.

    Returns
    -------
    VideoData
        The video data.
    """

    return VideoData.query.filter(VideoData.id == video_dataid).first()


def edit_video_data(
    video_dataid: int,
    file_name: str,
    path: str,
    timestamp: datetime,
    data_type: str,
    video: int,
) -> None:
    """
    Edit a video data.

    Parameters
    ----------
    video_dataid : int
        The id of the video data to edit.
    file_name : str
        The new name of the video data.
    path : str
        The new path of the video data.
    timestamp : datetime
        The new timestamp of the video data.
    data_type : str
        The new data type of the video data.
    video : int
        The new video for the video data.
    """
    video_data = get_video_data_by_id(video_dataid)
    video_data.file_name = file_name
    video_data.path = path
    video_data.timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    video_data.data_type = data_type
    video_data.video = video
    db.session.commit()


def add_video_data(
    file_name: str,
    path: str,
    timestamp: datetime,
    data_type: str,
    video: int,
) -> None:
    """
    Add a video data.

    Parameters
    ----------
    file_name : str
        The name of the video data.
    path : str
        The path of the video data.
    timestamp : datetime
        The timestamp of the video data.
    data_type : str
        The data type of the video data.
    video : int
        The video for the video data.
    """
    video_data = VideoData(
        file_name=file_name,
        path=path,
        timestamp=datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S"),
        data_type=data_type,
        video=video,
    )
    db.session.add(video_data)
    db.session.commit()


def user_list() -> List[User]:
    """
    Get a list of users.

    Returns
    -------
    List[User]
        A list of all users.
    """
    return User.query.all()


def delete_user(userid: int) -> None:
    """
    Delete a user.

    Parameters
    ----------
    userid : int
        The id of the user to delete.
    """

    user = User.query.filter(User.id == userid).first()
    if user:
        db.session.delete(user)
        db.session.commit()
