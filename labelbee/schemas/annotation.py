from labelbee.models import (
    VideoData
)
from labelbee.app import ma
from marshmallow import validate, fields
from labelbee.validation import FileName, Path

class VideoDataSchema(ma.SQLAlchemySchema):
    class Meta:
        model = VideoData

    id = fields.Integer(dump_only=True)
    file_name = FileName()
    path = Path()
    timestamp = fields.DateTime()
    data_type = fields.String(
        validate=validate.OneOf(
            [
                "tag",
                "event",
                "flowers",
            ]
        )
    )
    video_id = fields.Integer()
    created_by_id = fields.Integer()
    data = fields.String()
    notes = fields.String()
    created_from_id = fields.Integer()