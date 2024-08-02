from labelbee.app import db


class VideoData(db.Model):
    __tablename__ = "video_data"
    __table_args__ = (db.UniqueConstraint("file_name", "path"),)
    id = db.Column(db.Integer(), primary_key=True)
    file_name = db.Column(db.String(200), nullable=True)
    path = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    data_type = db.Column(db.String(25))
    data = db.Column(db.Text())
    notes = db.Column(db.Text())
    video_id = db.Column(db.Integer(), db.ForeignKey("videos.id", ondelete="CASCADE"))
    video = db.relationship("Video", backref="video_data")
    # created_from = db.relationship("VideoData", backref="created_from")
    # Terrible 
    created_from_id = db.Column(db.Integer(), db.ForeignKey("video_data.id"))
    created_by_id = db.Column(
        db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE")
    )
    created_by = db.relationship("User", backref="video_data")

