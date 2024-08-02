from labelbee.app import db


class DataSet(db.Model):
    __tablename__ = "data_set"
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(100), nullable=False, server_default="Dataset")
    description = db.Column(db.Text())
    created_by = db.Column(db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE"))
    creator = db.relationship("User", backref="data_set")

    # Properly link the data_set to videos
    # https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/
    videos = db.relationship("Video", backref="data_set", lazy=True)

