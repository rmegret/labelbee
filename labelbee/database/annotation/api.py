
from datetime import datetime
from labelbee.models import VideoData, User
from labelbee.app import db
from typing import List, Optional


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
                        VideoData.notes,
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
                        VideoData.notes,
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
                        VideoData.notes,
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
                        VideoData.notes,
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
                        VideoData.notes,
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
                        VideoData.notes,
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
                        VideoData.notes,
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
                        VideoData.notes,
                    )
                    .filter(
                        VideoData.video_id == videoid,
                        VideoData.data_type == datatype,
                        VideoData.created_by_id == userid,
                    )
                    .order_by(VideoData.timestamp.desc())
                    .all()
                )


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


