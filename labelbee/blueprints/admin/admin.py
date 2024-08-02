from flask import Blueprint, render_template, request, redirect, url_for
from flask_user import login_required, current_user, roles_accepted

from labelbee.database import (
    user_list,
    get_user_roles_by_id,
    edit_user
)

from labelbee.models import (
    UserProfileForm,
    UserUpdateForm,
    Role
)

import os 

from labelbee.database.user.schemas import RoleSchema, UserSchema


bp = Blueprint('admin', __name__, url_prefix='', template_folder="templates")

@bp.route("/admin")
@roles_accepted("admin")  # Limits access to users with the 'admin' role
def admin_page():
    form = UserProfileForm(obj=current_user)
    return render_template("admin_page.html", form=form)


@bp.route("/manage_users", methods=["GET", "POST"])
@roles_accepted("admin")  # Limits access to users with the 'admin' role
def manage_users_page():
    form = UserUpdateForm()
    form.roles.choices = [(RoleSchema().dump(role)['id'], RoleSchema().dump(role)['label']) for role in Role.query.all()]
    user_schema = UserSchema()
    roles_schema = RoleSchema()
    success = False
    editing = False
    # Process valid POST
    if form.validate_on_submit():
        editing = True
        success = edit_user(form.data)
    # Get data for each user
    users = [user_schema.dump(user) for user in user_list()]
    # Get roles for each user
    for user in users:
        user['roles'] = [roles_schema.dump(role) for role in get_user_roles_by_id(user['id'])]
    return render_template("manage_users_page.html", form=form, users=users, editing=editing, success=success)


@bp.route("/admin/version")
def version_page():
    import subprocess
    import shlex

    pwd = subprocess.check_output("pwd".split()).strip().decode()
    label = subprocess.check_output("git describe --always".split()).strip().decode()
    log = subprocess.check_output("git log -n 5".split()).strip().decode()
    hash = (
        subprocess.check_output(shlex.split("git log --pretty=format:'%H' -n 1"))
        .strip()
        .decode()
    )
    date = (
        subprocess.check_output(shlex.split("git log --pretty=format:'%ci (%cr)' -n 1"))
        .strip()
        .decode()
    )
    branch = (
        subprocess.check_output("git rev-parse --abbrev-ref HEAD".split())
        .strip()
        .decode()
    )
    details = subprocess.check_output("git status".split()).strip().decode()

    text = "<h3>Labelbee WebApp version information:</h3>"
    text += '\n<pre>pwd="' + pwd + '"</pre>'
    text += (
        "\n<h4>Current version</h4>\nBranch: <pre>"
        + branch
        + "</pre>"
        + "Commit date: <pre>"
        + date
        + "</pre>"
        + "Commit hash: <pre>"
        + hash
        + "</pre>"
    )
    text += "\n<h4>Log (5 last commits)</h4>\n<pre>" + log + "</pre>"
    text += "\n<h4>Details status</h4>\n<pre>" + details + "</pre>"
    return render_template("version_page.html", webapp_version=text)

#TODO: Implement video registration
# @bp.route("/video_registry")
# def video_registry():
#     directory = ""
#     directories = os.walk(directory)
#     return render_template("video_registry.html")