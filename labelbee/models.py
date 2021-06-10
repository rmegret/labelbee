# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

from flask_user import UserMixin, UserManager
from flask_user.forms import RegisterForm
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, validators
from labelbee.init_app import db


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


class Video(db.Model):
    __tablename__ = "videos"
    id = db.Column(db.Integer(), primary_key=True)
    file_name = db.Column(db.String(200), nullable=False, server_default=u"")
    path = db.Column(db.String(100), nullable=False, server_default=u"")
    timestamp = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.Integer(), nullable=False)
    colony = db.Column(db.Integer(), db.ForeignKey("colonies.id", ondelete="CASCADE"))
    frames = db.Column(db.Integer(), nullable=False)
    height = db.Column(db.Integer(), nullable=False)
    width = db.Column(db.Integer(), nullable=False)
    fps = db.Column(db.Numeric(), nullable=False)
    realfps = db.Column(db.Numeric(), nullable=False)
    filesize = db.Column(db.Integer(), nullable=False)
    hash = db.Column(db.String(70), nullable=False)
    corrupted = db.Column(db.Boolean(), nullable=False)
    trimmed = db.Column(db.Boolean(), nullable=False)
    hasframe0 = db.Column(db.Boolean(), nullable=False)
    hasframe_1s = db.Column(db.Boolean(), nullable=False)
    hasframe_2s = db.Column(db.Boolean(), nullable=False)
    hasframe_10s = db.Column(db.Boolean(), nullable=False)
    hasframeN_30s = db.Column(db.Boolean(), nullable=False)
    hasframeN_2s = db.Column(db.Boolean(), nullable=False)
    hasframeN_1s = db.Column(db.Boolean(), nullable=False)
    hasframeN = db.Column(db.Boolean(), nullable=False)


class Colony(db.Model):
    __tablename__ = "colonies"
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(100), nullable=False, server_default=u"")
    locations = db.Column(db.Integer())


class VideoData(db.Model):
    __tablename__ = "video_data"
    id = db.Column(db.Integer(), primary_key=True)
    file_name = db.Column(db.String(200), nullable=False, server_default=u"")
    path = db.Column(db.String(100), nullable=False, server_default=u"")
    timestamp = db.Column(db.DateTime, nullable=False)
    data_type = db.Column(db.String(25))
    video = db.Column(db.Integer(), db.ForeignKey("videos.id", ondelete="CASCADE"))
    created_by = db.Column(db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE"))


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
