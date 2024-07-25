from labelbee.models import (
    User, UsersRoles, Role
)
from labelbee.app import ma
from marshmallow import validate, fields
from labelbee.validation import FileName, Path

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