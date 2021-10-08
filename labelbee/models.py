# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

import re
from flask_user import UserMixin, UserManager
from flask_user.forms import RegisterForm
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, validators
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
    # reset_password_token = db.Column(db.String(100), nullable=False, server_default='')
    active = db.Column(db.Boolean(), nullable=False, server_default="0")

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


class VideoDataSet(db.Model):
    __tablename__ = "video_data_set"
    ds_id = db.Column(
        db.Integer(), db.ForeignKey("data_set.id", ondelete="CASCADE"), primary_key=True
    )
    video_id = db.Column(
        db.Integer(), db.ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True
    )


class Video(db.Model):
    __tablename__ = "videos"
    __table_args__ = (db.UniqueConstraint("file_name", "path"),)
    id = db.Column(db.Integer(), primary_key=True)
    file_name = db.Column(db.String(200), nullable=False, server_default=u"")
    path = db.Column(db.String(100), nullable=False, server_default=u"")
    timestamp = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.Integer(), nullable=False)
    colony = db.Column(db.Integer())
    notes = db.Column(db.Text())

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

    data_set = db.relationship(
        "VideoDataSet",
        backref=db.backref("video", lazy=True),
        lazy=True,
        cascade="delete, delete-orphan",
    )


class VideoData(db.Model):
    __tablename__ = "video_data"
    __table_args__ = (db.UniqueConstraint("file_name", "path"),)
    id = db.Column(db.Integer(), primary_key=True)
    file_name = db.Column(db.String(200), nullable=False, server_default=u"")
    path = db.Column(db.String(100), nullable=False, server_default=u"")
    timestamp = db.Column(db.DateTime, nullable=False)
    data_type = db.Column(db.String(25))
    data = db.Column(db.Text())
    video_id = db.Column(db.Integer(), db.ForeignKey("videos.id", ondelete="CASCADE"))
    video = db.relationship("Video", backref="video_data")
    # created_from = db.relationship("VideoData", backref="created_from")
    # created_from_id = db.Column(db.Integer(), db.ForeignKey("video_data.id"))
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
    timestamp = db.Column(db.DateTime, nullable=False)

    # Properly link the data_set to videos
    # https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/
    videos = db.relationship(
        "VideoDataSet",
        backref=db.backref("data_set", lazy=True),
        lazy=True,
        cascade="delete, delete-orphan",
    )


class RoleSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Role

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)


class VideoSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Video

    id = fields.Integer(dump_only=True)
    file_name = FileName()
    path = Path()
    timestamp = fields.DateTime()
    location = fields.Integer()
    colony = fields.Integer()
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
    data_type = fields.String(validate=validate.OneOf(["tag", "annotation", "event"]))
    video_id = fields.Integer()
    created_by_id = fields.Integer()
    data = fields.String()
    # created_from_id = fields.Integer()

    # id = fields.Integer(dump_only=True)
    # file_name = FileName(required=True)
    # path = Path(required=True)
    # timestamp = fields.DateTime(required=True)
    # data_type = fields.String(required=True, validate=validate.OneOf(["tag"]))
    # video = fields.Integer()
    # created_by_id = fields.Integer()


class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User

    id = fields.Integer(dump_only=True)
    email = fields.Email(required=True)
    first_name = fields.String(required=True)
    last_name = fields.String(required=True)
    studentnum = fields.String()
    clase = fields.String()

    # id = fields.Integer(dump_only=True)
    # email = fields.Email(required=True)
    # first_name = fields.String(required=True)
    # last_name = fields.String(required=True)
    # studentnum = fields.Integer()
    # clase = fields.String()


class DataSetSchema(ma.SQLAlchemySchema):
    class Meta:
        model = DataSet
        # include_fk = True

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    description = fields.String()
    creator = fields.Integer(required=True)
    timestamp = fields.DateTime(required=True)


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


class CustomUserManager(UserManager):
    def customize(self, app):
        # Override properties
        self.RegisterFormClass = MyRegisterForm
