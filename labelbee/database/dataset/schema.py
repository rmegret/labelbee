from labelbee.models import DataSet

from labelbee.app import ma
from marshmallow import fields
from ..user.schemas import UserSchema

class DataSetSchema(ma.SQLAlchemySchema):
    class Meta:
        model = DataSet
        # include_fk = True

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    description = fields.String()
    creator = fields.Nested(UserSchema)
    timestamp = fields.DateTime(required=True)