# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

import re
from flask_user import UserMixin, UserManager
from flask_user.forms import RegisterForm, unique_email_validator
from flask_wtf import FlaskForm
from sqlalchemy.orm import backref
from wtforms import StringField, SubmitField, validators, BooleanField, PasswordField, HiddenField
from wtforms.fields import SelectMultipleField
from labelbee.init_app import db, ma
from marshmallow import validate, fields
from labelbee.validation import FileName, Path

# Define the User data model. Make sure to add the flask_user.UserMixin !!
class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)

    # User authentication information (required for Flask-User)
    email = db.Column(db.Unicode(255), nullable=False, server_default=u"", unique=True)
    email_confirmed_at = db.Column(db.DateTime())
    password = db.Column(db.String(255), nullable=False, server_default="")

    # User information
    active = db.Column("is_active", db.Boolean(), nullable=False, server_default="0")
    first_name = db.Column(db.Unicode(50), nullable=False, server_default=u"")
    last_name = db.Column(db.Unicode(50), nullable=False, server_default=u"")
    studentnum = db.Column(db.Unicode(50), nullable=False, server_default=u"")
    clase = db.Column(db.Unicode(50), nullable=False, server_default=u"")

    # Relationships
    roles = db.relationship(
        "Role", secondary="users_roles", backref=db.backref("users", lazy="dynamic")
    )


# Define the Role data model
class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(
        db.String(50), nullable=False, server_default=u"", unique=True
    )  # for @roles_accepted()
    # for display purposes
    label = db.Column(db.Unicode(255), server_default=u"")


# Define the UserRoles association model
class UsersRoles(db.Model):
    __tablename__ = "users_roles"
    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE"))
    role_id = db.Column(db.Integer(), db.ForeignKey("roles.id", ondelete="CASCADE"))


class Video(db.Model):
    __tablename__ = "videos"
    __table_args__ = (db.UniqueConstraint("file_name", "path"),)
    id = db.Column(db.Integer(), primary_key=True)
    file_name = db.Column(db.String(200), nullable=False, server_default=u"")
    path = db.Column(db.String(100), nullable=False, server_default=u"")
    timestamp = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.Integer(), nullable=False)
    colony = db.Column(db.String(50))
    notes = db.Column(db.Text())
    dataset = db.Column(db.Integer, db.ForeignKey("data_set.id"))

    frames = db.Column(db.Integer(), nullable=False)
    height = db.Column(db.Integer(), nullable=False)
    width = db.Column(db.Integer(), nullable=False)
    fps = db.Column(db.Numeric(), nullable=False)
    realfps = db.Column(db.Numeric(), nullable=False)
    filesize = db.Column(db.BigInteger(), nullable=False)
    hash = db.Column(db.String(70))
    corrupted = db.Column(db.Boolean())
    trimmed = db.Column(db.Boolean())
    hasframe0 = db.Column(db.Boolean())
    hasframe_1s = db.Column(db.Boolean())
    hasframe_2s = db.Column(db.Boolean())
    hasframe_10s = db.Column(db.Boolean())
    hasframeN_30s = db.Column(db.Boolean())
    hasframeN_2s = db.Column(db.Boolean())
    hasframeN_1s = db.Column(db.Boolean())
    hasframeN = db.Column(db.Boolean())


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
    created_from_id = db.Column(db.Integer(), db.ForeignKey("video_data.id"))
    created_by_id = db.Column(
        db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE")
    )
    created_by = db.relationship("User", backref="video_data")


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

class CustomUserManager(UserManager):
    def customize(self, app):
        # Override properties
        self.RegisterFormClass = MyRegisterForm

# Define the User registration form
# It augments the Flask-User RegisterForm with additional fields
class MyRegisterForm(RegisterForm):
    first_name = StringField(
        "First name", validators=[validators.DataRequired("First name is required")]
    )
    last_name = StringField(
        "Last name", validators=[validators.DataRequired("Last name is required")]
    )


# Define the User profile form
class UserProfileForm(FlaskForm):
    first_name = StringField(
        "First name", validators=[validators.DataRequired("First name is required")]
    )
    last_name = StringField(
        "Last name", validators=[validators.DataRequired("Last name is required")]
    )
    submit = SubmitField("Save")


# Define an update user form
class UserUpdateForm(FlaskForm):
    id = HiddenField()
    email = StringField(
        'Email', 
        validators=[
            validators.DataRequired('Email is required'),
            validators.Email('Invalid Email')
        ]
    )
    password = PasswordField(
        'Password',
    )
    first_name = StringField(
        "First name", 
        validators=[
            validators.DataRequired("First name is required")
        ]
    )
    last_name = StringField(
        "Last name", 
        validators=[
            validators.DataRequired("Last name is required")
        ]
    )
    studentnum = StringField("Student number")
    clase = StringField("Class")
    active = BooleanField("Active?")
    roles = SelectMultipleField("Roles", choices=[], coerce=int)
    # roles = QuerySelectMultipleField(query_factory=lambda: Role.query.all(), get_label=lambda x: x.label)
    submit = SubmitField("Submit")