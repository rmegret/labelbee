from csv import DictReader
from datetime import datetime
from labelbee.models import Video
from labelbee.init_app import db, app
from json import dumps


def injest_tags(filename):
    with app.app_context():
        with open(filename) as tagfile:
            reader = DictReader(tagfile)
            for i, row in enumerate(reader):
                file_name = row["mp4file"].split("/")[-1]
                path = "/".join(row["mp4file"].split("/")[:-1])
                if not Video.query.filter(
                    Video.file_name == file_name and Video.path == path
                ).first():

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


def video_list(page=1):
    result_json = []

    for entry in Video.query.all():
        result_json.append(
            {
                "video_name": entry.file_name,
                "timestamp": entry.timestamp,
                "colony": entry.colony,
            }
        )

    return result_json
