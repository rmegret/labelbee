import csv
from labelbee.init_app import db
from labelbee.models import Video


def injest_tags(filename):
    with open(filename) as tagfile:
        reader = csv.DictReader(tagfile)
        for i, row in enumerate(reader):
            print(row)

            video = Video()

            if i > 0:
                break


if __name__ == "__main__":
    injest_tags("data/tags.csv")
