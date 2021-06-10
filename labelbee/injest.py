from csv import DictReader
from datetime import datetime
from labelbee.models import Video
from labelbee.init_app import db, manager, app


@manager.command
def injest_tags(filename):
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
                if not Video.query.filter(
                    Video.file_name == file_name and Video.path == path
                ).first():

                    video = Video(
                        file_name=file_name,
                        path=path,
                        timestamp=timestamp,
                        location=row["cam"],
                        colony=int(float(row["newcol"])),
                    )
                    db.session.add(video)
                    db.session.commit()
                break
