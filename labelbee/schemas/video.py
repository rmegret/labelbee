from labelbee.models import Video

from labelbee.app import ma
from marshmallow import fields
from labelbee.validation import FileName, Path

class VideoSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Video

    id = fields.Integer(dump_only=True)
    file_name = FileName()
    path = Path()
    timestamp = fields.DateTime()
    location = fields.Integer()
    colony = fields.String()
    dataset = fields.String()
    notes = fields.String()
    frames = fields.Integer()
    height = fields.Integer()
    width = fields.Integer()
    fps = fields.Float()
    realfps = fields.Float()
    filesize = fields.Integer()
    hash = fields.String()
    corrupted = fields.Boolean()
    trimmed = fields.Boolean()
    hasframe0 = fields.Boolean()
    hasframe_1s = fields.Boolean()
    hasframe_2s = fields.Boolean()
    hasframe_10s = fields.Boolean()
    hasframeN_30s = fields.Boolean()
    hasframeN_2s = fields.Boolean()
    hasframeN_1s = fields.Boolean()
    hasframeN = fields.Boolean()
    thumb = fields.String()

