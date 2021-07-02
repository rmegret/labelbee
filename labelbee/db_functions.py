from csv import DictReader
from datetime import datetime
from labelbee.models import Video, VideoData, DataSet, VideoDataSet
from labelbee.init_app import db, app


def injest_videos(filename):
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


def injest_tags(filename):
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


def video_data_list(videoid):
    result_json = []

    for entry in VideoData.query.filter(VideoData.video == videoid).all():
        print(entry.file_name)
        result_json.append(
            {
                "file_name": entry.file_name,
                "timestamp": entry.timestamp,
                "data_type": entry.data_type,
                "created_by": entry.created_by,
                "path": entry.path,
            }
        )
    return result_json


def video_list(dataset=None):
    result_json = []

    if dataset:
        for entry in (
            Video.query.join(VideoDataSet)
            .filter(
                VideoDataSet.ds_id == dataset,
                Video.id == VideoDataSet.video_id,
            )
            .all()
        ):
            result_json.append(
                {
                    "video_name": entry.file_name,
                    "timestamp": entry.timestamp,
                    "colony": entry.colony,
                    "path": entry.path,
                    "id": entry.id,
                }
            )
    else:
        for entry in Video.query.all():
            result_json.append(
                {
                    "video_name": entry.file_name,
                    "timestamp": entry.timestamp,
                    "colony": entry.colony,
                    "path": entry.path,
                    "id": entry.id,
                }
            )

    return result_json


def dataset_list():
    return DataSet.query.all()
