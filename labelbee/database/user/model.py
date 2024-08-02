from labelbee.app import db
from flask_user import UserMixin


# Define the User data model. Make sure to add the flask_user.UserMixin !!
class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # User authentication information (required for Flask-User)
    email = db.Column(db.Unicode(255), nullable=False, server_default=u"", unique=True)
    email_confirmed_at = db.Column(db.DateTime(), default=db.func.now())
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

#TODO: Ask why this table exists
# Define the UserRoles association model
class UsersRoles(db.Model):
    __tablename__ = "users_roles"
    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE"))
    role_id = db.Column(db.Integer(), db.ForeignKey("roles.id", ondelete="CASCADE"))
