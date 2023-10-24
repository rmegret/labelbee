"""
Database Functions
====================================
All functions that interact with the database.
"""


from csv import DictReader
from datetime import datetime

from werkzeug.datastructures import FileStorage
from labelbee.models import Video, VideoData, DataSet, User, UsersRoles, Role
from labelbee.init_app import db, app
from typing import List, Optional


def import_from_csv(csvfile: FileStorage, dataset: str) -> None:

    """Injest videos from a csv file.

    :param filename: The name of the csv file to injest.
    :type filename: str

    """

    with app.app_context():
        reader = DictReader(csvfile.read().decode("utf-8").split("\n"))
        for row in reader:
            mp4path = (
                f"/mnt/storage/Gurabo/datasets/{dataset}/col{row['newcol']}/mp4"
                if row.setdefault("newcol", False)
                else f"/mnt/storage/Gurabo/datasets/{dataset}/mp4"
            )
            file_name = row["mp4file"].split("/")[-1]

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
                path=mp4path,
                timestamp=timestamp,
                location=row["cam"],
                colony=int(float(row.setdefault("newcol", 1)))
                if dataset != "gurabo1"
                else "C01",
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
        print("added all videos")

        for row in reader:
            mp4path = (
                f"/mnt/storage/Gurabo/datasets/{dataset}/col{row['newcol']}/mp4"
                if row.setdefault("newcol", False)
                else f"/mnt/storage/Gurabo/datasets/{dataset}/mp4"
            )
            tagspath = (
                f"/mnt/storage/Gurabo/datasets/{dataset}/col{row['colony']}/tags"
                if row.setdefault("colony", False)
                else f"/mnt/storage/Gurabo/datasets/{dataset}/tags"
            )
            file_name = row["tagsfile"]

            timestamp = datetime(
                year=int("20" + row["YY"]),
                month=int(row["MM"]),
                day=int(row["DD"]),
                hour=int(row["hh"]),
                minute=int(row["mm"]),
                second=int(row["ss"]),
            )
            video = Video.query.filter(
                Video.file_name == row["mp4file"],
                Video.path == mp4path,
            ).first()
            if not video:
                raise Exception(
                    f"""No video found with name {row["mp4file"]} and path {mp4path}"""
                )

            video_data = VideoData(
                file_name=file_name,
                path=tagspath,
                timestamp=timestamp,
                data_type="tag",
                video=video,
                created_by=User.query.filter(User.id == 1).first(),
            )
            db.session.add(video_data)
        db.session.commit()
        print("added all tags")


def injest_videos(filename: str) -> None:
    """Injest videos from a csv file.

    :param filename: The name of the csv file to injest.
    :type filename: str

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
                    path=f"/mnt/storage/Gurabo/datasets/gurabo10avi/mp4/{path}",
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
    """Injest tags from a csv file.

    :param filename: The name of the csv file to injest.
    :type filename: str
    :raises Exception: No Video file Found

    """

    with app.app_context():
        with open(filename) as tagfile:
            reader = DictReader(tagfile)
            for row in reader:
                file_name = row["tagsfile"].split("/")[-1]
                path = "/mnt/storage/Gurabo/datasets/gurabo10avi/tags/" + "".join(
                    row["tagsfile"].split("/")[:-1]
                )

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
                    Video.path
                    == "/mnt/storage/Gurabo/datasets/gurabo10avi/mp4/"
                    + "".join(row["mp4file"].split("/")[:-1]),
                ).first()
                if not video:
                    raise Exception(
                        f"""No video found with name {row["mp4file"].split("/")[-1]} and path {"/mnt/storage/Gurabo/datasets/gurabo10avi/mp4/" + "".join(row["mp4file"].split("/")[:-1])}"""
                    )

                video_data = VideoData(
                    file_name=file_name,
                    path=path,
                    timestamp=timestamp,
                    data_type="tag",
                    video=video,
                    created_by=User.query.filter(User.id == 1).first(),
                )
                db.session.add(video_data)
            db.session.commit()
            print("added all video_data")


def update_paths() -> None:
    """Update paths in the database from relative to absolute."""

    with app.app_context():
        videos = Video.query.all()
        for video in videos:
            if video.path.startswith("/mnt/storage"):
                temp = video.path.split("/")
                # print(video.path)
                # print(temp)
                # print(f"/{'/'.join(temp[4:])}")
                video.path = f"/{ '/'.join(temp[4:]) }"
        video_data = VideoData.query.all()
        for video_datum in video_data:
            if video_datum.path.startswith("/mnt/storage"):
                temp = video_datum.path.split("/")
                # print(video_datum.path)
                # print(temp)
                # print(f"/{ '/'.join(temp[4:]) }")
                # break
                video_datum.path = f"/{ '/'.join(temp[4:]) }"
                # video_datum.path = f"/mnt/storage/Gurabo/datasets/{video_datum.path}"

        db.session.commit()


def populate_datasets() -> None:
    """Populate datasets for each video."""

    with app.app_context():
        videos = Video.query.all()
        for video in videos:
            if video.colony == "C01":
                video.dataset = "gurabo1"
            else:
                video.dataset = "gurabo10"
        db.session.commit()


def video_data_list(
    videoid: Optional[int], datatype: str = "", userid: int = None
) -> List[VideoData]:
    """Get a list of all video data for a video.

    :param videoid: The id of the video to get data for
    :type videoid: int
    :return: A list of all video data.
    :rtype: List[VideoData]
    """
    if (videoid is None):
        if datatype == "":
            if not userid:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
            else:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(
                        VideoData.created_by_id == userid
                    )
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
        else:
            if not userid:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(VideoData.data_type == datatype)
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
            else:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(
                        VideoData.data_type == datatype,
                        VideoData.created_by_id == userid,
                    )
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
    else:
        if datatype == "":
            if not userid:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(VideoData.video_id == videoid)
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
            else:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(
                        VideoData.video_id == videoid, VideoData.created_by_id == userid
                    )
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
        else:
            if not userid:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(VideoData.video_id == videoid, VideoData.data_type == datatype)
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )
            else:
                return (
                    VideoData.query.with_entities(
                        VideoData.id,
                        VideoData.file_name,
                        VideoData.path,
                        VideoData.timestamp,
                        VideoData.data_type,
                        VideoData.video_id,
                        VideoData.created_by_id,
                        VideoData.created_from_id,
                    )
                    .filter(
                        VideoData.video_id == videoid,
                        VideoData.data_type == datatype,
                        VideoData.created_by_id == userid,
                    )
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )


def video_list(dataset: int = None) -> List[Video]:
    """Get a list of all videos in a dataset.

    :param dataset: The dataset to get videos from, defaults to None
    :type dataset: DataSet, optional
    :return: A list of videos from a dataset, if None, all videos are returned.
    :rtype: List[Video]
    """

    if dataset:
        return Video.query.filter(Video.dataset == dataset).all()
    else:
        return Video.query.all()


def dataset_list() -> List[DataSet]:
    """Get list of all datasets.

    :return: A list of all datasets.
    :rtype: List[DataSet]
    """

    return DataSet.query.all()


def video_info(videoid: int) -> Video:
    """Get a video by id.

    :param videoid: The id of the video to get.
    :type videoid: int
    :return: The video specified by the id.
    :rtype: Video
    """

    return Video.query.filter(Video.id == videoid).first()


def new_dataset(name: str, description: str, user: User):
    """Create a new dataset.

    :param name: The name of the dataset.
    :type name: str
    :param description: The description of the dataset.
    :type description: str
    :param user: The user creating the dataset.
    :type user: User
    """

    dataset = DataSet(
        name="New Dataset" if name.strip() == "" else name,
        description=description,
        created_by=user.id,
    )
    db.session.add(dataset)
    db.session.commit()


# search for a video using sqlalchemy flask
def search_video(query: str) -> List[Video]:
    """Search for a video by name.

    :param query: The name of the video to search for.
    :type query: str
    :return: A list of videos matching the query.
    :rtype: List[Video]
    """

    return Video.query.filter(Video.file_name.like(f"%{query}%")).all()

def get_dataset_by_id(datasetid: int) -> DataSet:
    """Get a dataset by id.

    :param datasetid: The id of the dataset to get.
    :type datasetid: int
    :return: The dataset specified by the id.
    :rtype: DataSet
    """

    return DataSet.query.filter(DataSet.id == datasetid).first()


def delete_dataset_by_id(datasetid: int) -> None:
    """Delete a dataset by id.

    :param datasetid: The id of the dataset to delete.
    :type datasetid: int
    """

    dataset = get_dataset_by_id(datasetid)
    if dataset:
        db.session.delete(dataset)
        db.session.commit()


# Old deprecated function from when dataset was a custom folder of videos

# Add video to a dataset using video id and dataset id
# def add_video_to_dataset(videoid: int, datasetid: int) -> None:
#     """Add a video to a dataset.

#     :param videoid: The id of the video to add.
#     :type videoid: int
#     :param datasetid: The id of the dataset to add the video to.
#     :type datasetid: int
#     """

#     video_data_set = VideoDataSet(video_id=videoid, ds_id=datasetid)
#     db.session.add(video_data_set)
#     db.session.commit()


def edit_dataset(datasetid: int, name: str, description: str) -> None:
    """Edit a dataset.

    :param datasetid: The id of the dataset to edit.
    :type datasetid: int
    :param name: The new name of the dataset.
    :type name: str
    :param description: The new description of the dataset.
    :type description: str
    """

    dataset = get_dataset_by_id(datasetid)
    if dataset:
        dataset.name = name
        dataset.description = description
        db.session.commit()


def get_video_by_id(videoid: int) -> Video:
    """Get a video by id.

    :param videoid: The id of the video to get.
    :type videoid: int
    :return: The video specified by the id.
    :rtype: Video
    """

    return Video.query.filter(Video.id == videoid).first()


def edit_video(
    videoid: int,
    file_name: str = None,
    path: str = None,
    timestamp: datetime = None,
    location: str = None,
    colony: int = None,
    frames: int = None,
    width: int = None,
    height: int = None,
    dataset: str = None,
) -> Video:
    """Edit a video.

    :param videoid: The id of the video to edit
    :type videoid: int
    :param file_name: The new name of the video.
    :type file_name: str
    :param path: The new path of the video.
    :type path: str
    :param timestamp: The new timestamp of the video.
    :type timestamp: datetime
    :param location: The new location of the video.
    :type location: str
    :param colony: The new colony of the video.
    :type colony: int
    :param frames: The new number of frames of the video.
    :type frames: int
    :param width: The new width of the video.
    :type width: int
    :param height: The new height of the video.
    :type height: int
    """

    video = get_video_by_id(videoid)
    video.file_name = file_name if file_name else video.file_name
    video.path = path if path else video.path
    video.timestamp = (
        datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S")
        if timestamp
        else video.timestamp
    )
    video.location = location if location else video.location
    video.colony = colony if colony else video.colony
    video.frames = frames if frames else video.frames
    video.width = width if width else video.width
    video.height = height if height else video.height
    video.dataset = dataset if dataset else video.dataset

    db.session.commit()
    return video


def delete_video(videoid: int) -> None:
    """Delete a video.

    :param videoid: The id of the video to delete.
    :type int: int
    """
    video = get_video_by_id(videoid)
    db.session.delete(video)
    db.session.commit()


def get_video_data_by_id(video_dataid: int) -> VideoData:
    """Get a video data by id.

    :param video_dataid: The id of the video data to get.
    :type video_dataid: int
    :return: The video data specified by the id.
    :rtype: VideoData
    """

    return VideoData.query.filter(VideoData.id == video_dataid).first()


def edit_video_data(
    video_dataid: int,
    file_name: str = None,
    path: str = None,
    timestamp: datetime = None,
    data_type: str = None,
    video_id: int = None,
    parent_id: int = None,
) -> VideoData:
    """Edit a video data.

    :param video_dataid: The id of the video data to edit.
    :type video_dataid: int
    :param file_name: The new name of the video data.
    :type file_name: str
    :param path: The new path of the video data.
    :type path: str
    :param timestamp: The new timestamp of the video data.
    :type timestamp: datetime
    :param data_type: The new data type of the video data.
    :type data_type: str
    :param video: The new video for the video data.
    :type video: int
    """

    video_data = get_video_data_by_id(video_dataid)
    video_data.file_name = file_name if file_name else video_data.file_name
    video_data.path = path if path else video_data.path
    video_data.timestamp = timestamp if timestamp else video_data.timestamp
    video_data.data_type = data_type if data_type else video_data.data_type
    video_data.video_id = video_id if video_id else video_data.video_id
    video_data.created_from_id = parent_id if parent_id else video_data.created_from_id
    db.session.commit()
    return video_data


def add_video_data(
    file_name: str,
    path: str,
    data_type: str,
    video: int,
    created_by: User,
    data: str,
    timestamp: str = None,
    created_from: int = None,
    notes: str = None,
) -> VideoData:
    """Add a video data.

    :param file_name: The name of the video data.
    :type file_name: str
    :param path: The path of the video data.
    :param timestamp: The timestamp of the video data.
    :type timestamp: datetime
    :param data_type: The data type of the video data.
    :type data_type: str
    :param video: The video for the video data.
    :type video: int
    """

    timestamp = (
        datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S") if not timestamp else timestamp
    )

    video_data = VideoData(
        file_name=file_name,
        path=path,
        timestamp=datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S"),
        data_type=data_type,
        video=video,
        created_by=created_by,
        data=data,
        created_from_id=created_from,
        notes=notes,
    )
    db.session.add(video_data)
    db.session.commit()
    return video_data

def fix_datasets() -> None:
    """Fix datasets."""

    print("Fixing datasets")
    with app.app_context():
        for video in Video.query.all():
            if video.dataset == "gurabo1":
                video.dataset = 1
            elif video.dataset == "gurabo10":
                video.dataset = 2

        db.session.commit()

def user_list() -> List[User]:
    """Get a list of users.

    :return: A list of all users.
    :rtype: List[User]
    """

    return User.query.all()


def delete_user(userid: int) -> None:
    """Delete a user.

    :param userid: The id of the user to delete.
    :type userid: int
    """

    user = User.query.filter(User.id == userid).first()
    if user:
        db.session.delete(user)
        db.session.commit()

def get_user_by_id(userid: int) -> User:
    """Get a user by id.

    :param userid: The id of the user to get.
    :type userid: int
    :return: The user specified by the id.
    :rtype: User
    """

    return User.query.filter(User.id == userid).first()

def get_user_roles_by_id(userid: int) -> [Role]:
    """Get roles for a user, given id

    :param userid: The id of the user to get the roles for.
    :type userid: int
    :return: The roles for the user specified by the id.
    :rtype: Role list
    """
    return db.session.query(Role).join(UsersRoles).filter(UsersRoles.user_id==userid)