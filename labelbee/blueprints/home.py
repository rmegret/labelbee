from flask import render_template, render_template_string, jsonify, Blueprint, request
from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask_user import current_user
import os

from flask import render_template, render_template_string, jsonify, Blueprint, request
from flask_user import current_user
import os

"""
Views
====================================
All web endpoints are defined here.
"""

from labelbee.user_management import create_user, edit_user
from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask import current_app
from flask import redirect
from flask import render_template, render_template_string, jsonify, Blueprint
from flask import request, url_for
from flask_user import current_user, login_required, roles_accepted
from flask_login import logout_user, login_user
from flask_wtf.csrf import generate_csrf
from werkzeug.exceptions import BadRequest, Forbidden
from flask import Response
import sys
import json

# from labelbee.__init__ import app


from werkzeug.security import safe_join

import os
from datetime import datetime
import json
import re
import logging

from labelbee.init_app import app, db, csrf, logger
from labelbee.models import (
    DataSetSchema,
    UserProfileForm,
    User,
    UserSchema,
    UsersRoles,
    UsersRolesSchema,
    Role,
    RoleSchema,
    VideoDataSchema,
    VideoSchema,
    UserUpdateForm
)
from labelbee.db_functions import (
    add_video_data,
    delete_dataset_by_id,
    delete_user,
    delete_video,
    edit_dataset,
    edit_video,
    fix_datasets,
    get_dataset_by_id,
    get_video_by_id,
    new_dataset,
    populate_datasets,
    user_list,
    video_list,
    dataset_list,
    video_data_list,
    video_info,
    get_user_by_id,
    get_user_roles_by_id,
    get_video_data_by_id,
    edit_video_data,
    import_from_csv,
    update_paths,
)

bp = Blueprint('home', __name__, url_prefix='/')



@bp.route("/")
def home_page():
    return render_template("pages/home_page.html")


@bp.route("/datasets", methods=["GET", "POST"])
# @login_required
def datasets_page():
    form = UserProfileForm(obj=current_user)

    print(dataset_list())
    # Parse the request to get the user name from id
    datasets = [
        {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "created_by": e.created_by,
            #"timestamp": e.timestamp,
        }
        for e in dataset_list()
    ]
    # Process valid POST
    if request.method == "POST":
        # Copy form fields to user_profile fields
        # form.populate_obj(current_user)

        # # Save user_profile
        # db.session.commit()

        # Redirect to home page
        return redirect(url_for("home.datasets_page"))

    # Process GET or invalid POST
    return render_template("pages/datasets_page.html", datasets=datasets, form=form)

@bp.route("/user")
# @login_required  # Limits access to authenticated users
def user_page():

    return render_template("pages/user_page.html", userid={"current_user": "andres"})



# The Admin page is accessible to users with the 'admin' role
@bp.route("/admin")
# @roles_accepted("admin")  # Limits access to users with the 'admin' role
def admin_page():
    form = UserProfileForm(obj=current_user)
    return render_template("pages/admin_page.html", form=form)



@bp.route("/videos", methods=["GET", "POST"])
# @login_required
def videos_page():
    form = UserProfileForm(obj=current_user)

    datasetid = request.args.get("dataset")
    logger.info(f"videos_page: datasetid={datasetid}")
    if datasetid != None:
        # Parse the request to get the user name from id
        logger.info(f"videos_page: datasetid={datasetid}")
        e = get_dataset_by_id(datasetid=datasetid)
        user = get_user_by_id(e.created_by)
        dataset = {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "created_by": f"{user.first_name} {user.last_name} ({e.created_by})" if user is not None else "_"
            #"timestamp": e.timestamp,
        }
    else:
        dataset = None

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("home.videos_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/videos_page.html",
        form=form,
        dataset=dataset,
    )
