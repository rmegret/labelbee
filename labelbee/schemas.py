from .models import (
    Video, 
    VideoData, 
    User,
    UsersRoles,
    DataSet,
    Role
)
from labelbee.app import ma
from marshmallow import validate, fields
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


class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User

    id = fields.Integer(dump_only=True)
    email = fields.Email(required=True)
    first_name = fields.String(required=True)
    last_name = fields.String(required=True)
    studentnum = fields.String()
    clase = fields.String()
    active = fields.Boolean()

class UsersRolesSchema(ma.SQLAlchemySchema):
    class Meta:
        model = UsersRoles

    id = fields.Integer(dump_only=True)
    role_id = fields.Integer(required=True)
    user_id = fields.Integer(required=True)

class RoleSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Role

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    label = fields.String(required=True)

class DataSetSchema(ma.SQLAlchemySchema):
    class Meta:
        model = DataSet
        # include_fk = True

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    description = fields.String()
    creator = fields.Integer(required=True)
    timestamp = fields.DateTime(required=True)



