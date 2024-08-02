from labelbee.models import Video
from typing import List
from labelbee.app import db
from datetime import datetime


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


def video_info(videoid: int) -> Video:
    """Get a video by id.

    :param videoid: The id of the video to get.
    :type videoid: int
    :return: The video specified by the id.
    :rtype: Video
    """

    return Video.query.filter(Video.id == videoid).first()


def get_video_by_id(videoid: int) -> Video:
    """Get a video by id.

    :param videoid: The id of the video to get.
    :type videoid: int
    :return: The video specified by the id.
    :rtype: Video
    """

    return Video.query.filter(Video.id == videoid).first()


# search for a video using sqlalchemy flask
def search_video(query: str) -> List[Video]:
    """Search for a video by name.

    :param query: The name of the video to search for.
    :type query: str
    :return: A list of videos matching the query.
    :rtype: List[Video]
    """

    return Video.query.filter(Video.file_name.like(f"%{query}%")).all()


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
