"""
Views
====================================
All web endpoints are defined here.
"""

from sqlalchemy.orm.query import _MapperEntity
from labelbee.user_management import create_user, edit_user
from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask import current_app
from flask import redirect
from flask import render_template, render_template_string, Markup, jsonify
from flask import request, url_for, safe_join
from flask_user import current_user, login_required, roles_accepted
from flask_login import logout_user, login_user
from flask_wtf.csrf import generate_csrf
from werkzeug.exceptions import BadRequest, Forbidden
import json

import os
from datetime import datetime
import json
import re

from labelbee.init_app import app, db, csrf
from labelbee.models import (
    DataSetSchema,
    UserProfileForm,
    User,
    UserSchema,
    VideoDataSchema,
    VideoSchema,
)
from labelbee.db_functions import (
    add_video_data,
    add_video_to_dataset,
    delete_dataset_by_id,
    delete_user,
    edit_dataset,
    edit_video,
    get_dataset_by_id,
    get_video_by_id,
    new_dataset,
    user_list,
    video_list,
    dataset_list,
    video_data_list,
    video_info,
    get_user_by_id,
    get_video_data_by_id,
    edit_video_data,
)

upload_dir = "labelbee/static/upload/"


# -------------------------------------------
# PAGES

# The Home page is accessible to anyone
@app.route("/")
def home_page():
    return render_template("pages/home_page.html")


# The User page is accessible to authenticated users (users that have logged in)


@app.route("/user")
@login_required  # Limits access to authenticated users
def user_page():

    return render_template("pages/user_page.html", userid=str(current_user.id))


@app.route("/videos", methods=["GET", "POST"])
@login_required
def videos_page():
    form = UserProfileForm(obj=current_user)

    datasetid = request.args.get("dataset")
    if datasetid != None:
        # Parse the request to get the user name from id
        e = get_dataset_by_id(datasetid=datasetid)
        dataset = {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "created_by": get_user_by_id(e.created_by).first_name
            + " "
            + get_user_by_id(e.created_by).last_name,
            "timestamp": e.timestamp,
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
        return redirect(url_for("videos_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/videos_page.html",
        form=form,
        dataset=dataset,
    )


@app.route("/edit_dataset", methods=["GET", "POST"])
@roles_accepted("admin")
def edit_dataset_page():
    form = UserProfileForm(obj=current_user)

    datasetid = request.args.get("dataset")
    if datasetid != None:
        e = get_dataset_by_id(datasetid=datasetid)
        dataset = {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "created_by": get_user_by_id(e.created_by).first_name
            + " "
            + get_user_by_id(e.created_by).last_name,
            "timestamp": e.timestamp,
        }

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        edit_dataset(
            datasetid=request.form.get("dataset"),
            name=request.form.get("name"),
            description=request.form.get("description"),
        )

        # Redirect to home page
        return redirect(
            url_for("videos_page") + "?dataset=" + request.form.get("dataset")
        )

    # Process GET or invalid POST
    return render_template("pages/edit_dataset.html", form=form, dataset=dataset)


@app.route("/delete_dataset", methods=["GET", "POST"])
@roles_accepted("admin")
def delete_dataset():
    form = UserProfileForm(obj=current_user)

    datasetid = request.args.get("dataset")

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)
        delete_dataset_by_id(datasetid=datasetid)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("datasets_page"))

    # Process GET or invalid POST
    return render_template(url_for("datasets_page"))


@app.route("/edit_video", methods=["GET", "POST"])
@roles_accepted("admin")
def edit_video_page():
    form = UserProfileForm(obj=current_user)

    videoid = request.args.get("video")
    if videoid != None:
        video = get_video_by_id(videoid=videoid)

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        edit_video(
            videoid=request.form.get("video"),
            file_name=request.form.get("file_name"),
            path=request.form.get("path"),
            timestamp=request.form.get("timestamp"),
            location=request.form.get("location"),
            colony=request.form.get("colony"),
            frames=request.form.get("frames"),
            width=request.form.get("width"),
            height=request.form.get("height"),
        )

        # Redirect to home page
        return redirect(
            url_for("video_data_page") + "?videoid=" + request.form.get("video")
        )

    # Process GET or invalid POST
    return render_template("pages/edit_video.html", form=form, video=video)


@app.route("/add_video", methods=["GET", "POST"])
@login_required
def add_video_page():
    form = UserProfileForm(obj=current_user)

    datasetid = request.args.get("dataset")
    dataset = get_dataset_by_id(datasetid=datasetid)

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        datasetid = request.form.get("dataset")
        dataset = get_dataset_by_id(datasetid=datasetid)

        video_id = request.form.get("videoid")
        add_video_to_dataset(videoid=video_id, datasetid=datasetid)
        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("add_video_page") + "?dataset=" + str(datasetid))

    # Process GET or invalid POST
    return render_template(
        "pages/add_video.html",
        number_videos=len(video_list()),
        form=form,
        dataset=dataset,
        videos=video_list(),
    )


@app.route("/videodata", methods=["GET", "POST"])
@login_required
def video_data_page():
    form = UserProfileForm(obj=current_user)

    videoid = request.args.get("videoid")

    video_url = request.args.get("video_file")

    datasetid = request.args.get("dataset")

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("video_data_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/video_data_page.html",
        video_url=video_url,
        video=video_info(videoid),
        form=form,
        datasetid=datasetid,
    )


@app.route("/add_dataset", methods=["GET", "POST"])
@login_required
def add_dataset_page():
    form = UserProfileForm(obj=current_user)

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()
        new_dataset(
            name=request.form.get("name"),
            description=request.form.get("description"),
            user=current_user,
        )

        # Redirect to home page
        return redirect(url_for("datasets_page"))

    # Process GET or invalid POST
    return render_template("pages/add_dataset.html", form=form)


@app.route("/datasets", methods=["GET", "POST"])
@login_required
def datasets_page():
    form = UserProfileForm(obj=current_user)

    # Parse the request to get the user name from id
    datasets = [
        {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "created_by": get_user_by_id(e.created_by).first_name
            + " "
            + get_user_by_id(e.created_by).last_name,
            "timestamp": e.timestamp,
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
        return redirect(url_for("datasets_page"))

    # Process GET or invalid POST
    return render_template("pages/datasets_page.html", datasets=datasets, form=form)


@app.route("/video_data_details", methods=["GET", "POST"])
@login_required
def video_data_details_page():
    form = UserProfileForm(obj=current_user)

    video_dataid = request.args.get("video_data")
    video_data = get_video_data_by_id(video_dataid=video_dataid)

    video_id = request.args.get("video")
    datasetid = request.args.get("dataset")

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("video_data_details_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/video_data_details_page.html",
        form=form,
        video_data=video_data,
        datasetid=datasetid,
        video_id=video_id,
    )


@app.route("/edit_video_data", methods=["GET", "POST"])
@roles_accepted("admin")
def edit_video_data_page():
    form = UserProfileForm(obj=current_user)

    video_dataid = request.args.get("video_data")
    if video_dataid != None:
        video_data = get_video_data_by_id(video_dataid=video_dataid)

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()
        video = get_video_by_id(videoid=request.form.get("video"))
        edit_video_data(
            video_dataid=request.form.get("video_data"),
            file_name=request.form.get("file_name"),
            path=request.form.get("path"),
            timestamp=request.form.get("timestamp"),
            data_type=request.form.get("data_type"),
            video=video,
        )

        video = get_video_by_id(request.form.get("video"))
        # Redirect to home page
        return redirect(
            url_for("video_data_details_page")
            + "?video_url="
            + video.path
            + "/"
            + video.file_name
            + "&tag_file="
            + request.form.get("path")
            + "/"
            + request.form.get("file_name")
            + "&video_data="
            + request.form.get("video_data")
        )

    # Process GET or invalid POST
    return render_template(
        "pages/edit_video_data.html", form=form, video_data=video_data
    )


@app.route("/user/profile", methods=["GET", "POST"])
@login_required
def user_profile_page():
    # Initialize form
    form = UserProfileForm(obj=current_user)

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("home_page"))

    # Process GET or invalid POST
    return render_template("pages/user_profile_page.html", form=form)


@app.route("/labelbee/gui")
# @login_required  # Limits access to authenticated users
def labelbee_user_page():

    # print('SCRIPT_NAME=',request.environ.get('SCRIPT_NAME'))

    video_url = request.args.get("video_url")
    tag_file = request.args.get("tag_file")

    http_script_name = request.environ.get("SCRIPT_NAME")

    if current_user.is_authenticated:
        try:
            os.makedirs(upload_dir + str(current_user.id))
        except:
            print("labelbee_user_page: could not create upload dir")
            pass
        print(tag_file)
        return render_template(
            "pages/labelbee_page.html",
            userid=str(current_user.id),
            http_script_name=http_script_name,
            video_url="datasets/gurabo10avi/mp4/" + video_url,
            tag_file="datasets/gurabo10avi/tags/" + tag_file,
        )
    else:
        return render_template(
            "pages/labelbee_page.html",
            userid="anonymous",
            http_script_name=http_script_name,
            video_url=video_url,
            tag_file=tag_file,
        )


# The Admin page is accessible to users with the 'admin' role
@app.route("/admin")
@roles_accepted("admin")  # Limits access to users with the 'admin' role
def admin_page():
    form = UserProfileForm(obj=current_user)
    return render_template("pages/admin_page.html", form=form)


@app.route("/manage_users", methods=["GET", "POST"])
@roles_accepted("admin")  # Limits access to users with the 'admin' role
def manage_users_page():

    form = UserProfileForm(obj=current_user)
    users = user_list()

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return render_template("pages/manage_users_page.html", form=form, users=users)

    # Process GET or invalid POST

    return render_template("pages/manage_users_page.html", form=form, users=users)


@app.route("/admin/version")
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
    return render_template("pages/version_page.html", webapp_version=Markup(text))


# ---------------------------------------------------
# HEAVY STATIC CONTENT

# Note: special handling of partial request to access this static content
# is provided only for local debugging.
# These routes should be served directly by Apache in the production server


# Enable range requests
# https://blog.asgaard.co.uk/2012/08/03/http-206-partial-content-for-flask-python


@app.after_request
def after_request(response):
    response.headers.add("Accept-Ranges", "bytes")
    return response


@app.route("/data/<path:path>")
def send_data(path):
    print("Handling file request PATH=" + path)
    data_dir = os.path.join(app.root_path, "static/data")
    return send_from_directory_partial(data_dir, path, "/data")


@app.route("/data/")
def send_data_():
    path = ""
    print("Handling file request PATH=" + path)
    data_dir = os.path.join(app.root_path, "static/data")
    return dir_listing(data_dir, "", "/data")


# --------------------------------------
# REST API for authentification


@app.route("/rest/auth/login", methods=["GET", "POST"])
def ajaxlogin():
    """
    API endpoint for authentification

    Usage
    -----
    - GET: Log in with a get request using an email and password

    Returns
    -------
    CSRF token
    """

    email = request.form.get("email")
    password = request.form.get("password")

    # print(email,password)

    user = User.query.filter_by(email=email).first()

    def check_password(user, password):
        # print(user.password)
        return current_app.user_manager.verify_password(password, user.password)

    if user is None or not check_password(user, password):
        return jsonify(
            {
                "request": "login",
                "email": email,
                "status": "FAIL",
            }
        )

    # login and return token
    login_user(user)
    return jsonify(
        {
            "request": "login",
            "email": email,
            "status": "SUCCESS",
            "csrf_token": generate_csrf(),
        }
    )


@app.route("/rest/auth/logout", methods=["GET", "POST"])
def ajaxlogout():
    """
    Logs out the current user
    """
    if not current_user.is_authenticated:
        return jsonify(
            {
                "request": "logout",
                "status": "FAIL",
            }
        )
    else:
        logout_user()
        return jsonify(
            {
                "request": "logout",
                "status": "SUCCESS",
            }
        )


@app.route("/rest/auth/whoami")
def whoami():
    """
    Returns the current user

    Returns
    -------
    is_authenticated: boolean
    first_name: string
    last_name: string
    email: string
    id: int
    """

    if current_user.is_authenticated:
        return jsonify(
            {
                "is_authenticated": current_user.is_authenticated,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "email": current_user.email,
                "id": current_user.id,
            }
        )
    else:
        return jsonify({"is_authenticated": current_user.is_authenticated})


@app.route("/rest/user/add_users", methods=["POST"])
def add_users():
    """
    Adds a new users to the database

    POST parameters
    ---------------
    csrf_token: string
    json: string
        json requirements for user creation:
        [
            {
                "first_name": string,
                "last_name": string,
                "email" string,
                "password": string,
                "role_id": int
            }
        ]
    """

    if not current_user.is_authenticated or not current_user.has_roles("admin"):
        return jsonify({"status": "FAIL"})

    json_list = json.loads(request.form.get("json"))
    user_list = []
    for user in json_list:
        user_list.append(
            create_user(
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
                password=user["password"],
                role_id=int(user["role_id"]),
            )
        )
    user_schema = UserSchema(many=True)
    return jsonify({"status": "SUCCESS", "users": user_schema.dump(user_list)})


@app.route("/rest/user/edit_users", methods=["POST"])
def edit_users():
    if current_user.is_authenticated and current_user.has_roles("admin"):
        json_list = json.loads(request.form.get("json"))
        for user in json_list:
            edit_user(
                user_id=int(user["user_id"]),
                first_name=user.setdefault("first_name", None),
                last_name=user.setdefault("last_name", None),
                email=user.setdefault("email", None),
                password=user.setdefault("password", None),
                role_id=user.setdefault("role_id", 2),
            )
        return jsonify({"status": "SUCCESS"})
    else:
        return jsonify({"status": "FAIL", "message": "not authenticated"})


@app.route("/rest/user/list_users", methods=["GET"])
def list_users():
    if current_user.is_authenticated:

        # Use Flask-Marshmallow Schema to make json serializable list of users
        user_schema = UserSchema(many=True)
        return jsonify({"status": "SUCCESS", "users": user_schema.dump(user_list())})
    else:
        return jsonify({"status": "FAIL"})


@app.route("/rest/user/delete_users", methods=["POST"])
def delete_users():
    if current_user.is_authenticated and current_user.has_roles("admin"):
        json_list = json.loads(request.form.get("json"))
        for user_id in json_list:
            delete_user(user_id)
        return jsonify({"status": "SUCCESS"})
    else:
        return jsonify({"status": "FAIL"})


# --------------------------------------
# REST API for events: /rest/events/
# GET list, POST new item, GET item


def parse_trackfilename(filename):
    m = re.search(r"(?P<video>C\d\d_\d{12})-(?P<timestamp>\d{12})", filename)
    if m is not None:
        return m.groupdict()

    m = re.search(
        r"(?P<video>C\d\d_\d{12})-Tracks-20(?P<timestamp1>\d{6})_(?P<timestamp2>\d{6}) - (?P<name>.*)\.json",
        filename,
    )
    if m is not None:
        d = m.groupdict()
        if d.get("timestamp1") is not None and d.get("timestamp2") is not None:
            ts = d.get("timestamp1") + d.get("timestamp2")
        else:
            ts = None
        return {"video": d.get("video"), "timestamp": ts, "name": d.get("name")}

    return {"video": "unknown", "timestamp": "unknown"}


def serve_files(base_dir, path, base_uri, format="html"):
    filepath = safe_join(base_dir, path)
    uripath = safe_join(base_uri, path)

    print("serve_files...")
    print("filepath={}".format(filepath))
    print("uripath={}".format(uripath))

    if not os.path.exists(filepath):
        raise BadRequest("GET " + base_uri + ': File not found "{}"'.format(filepath))

    if format == "html":
        if os.path.isfile(filepath):
            return send_from_directory_partial(base_dir, path, base_uri)
        if os.path.isdir(filepath):
            return dir_listing(filepath, "", uripath, show_hidden=False)
    elif format == "json":
        if os.path.isfile(filepath):
            raise BadRequest(
                "GET "
                + base_uri
                + ": Attempting to get file in JSON format. try format=html"
            )
        if os.path.isdir(filepath):
            items = os.listdir(filepath)
            # files = [f for f in items if f.endswith('.json') and os.path.isfile(safe_join(filepath,f))]
            files = [f for f in items if os.path.isfile(safe_join(filepath, f))]
            dirs = [f for f in items if os.path.isdir(safe_join(filepath, f))]
            if path != "":
                dirs.append("..")
            files_obj = [
                {
                    # url_for('send_data', path=os.path.join('config/labellist/',path,filename)),
                    "uri": os.path.normpath(os.path.join(base_uri, path, filename)),
                    "filename": filename,
                    "path": os.path.normpath(os.path.join(path, filename)),
                }
                for filename in files
            ]
            dirs_obj = [
                {
                    # url_for('labellist_get', path=os.path.join(path,filename+'/'), format=format),
                    "uri": os.path.normpath(
                        os.path.join(base_uri, path, filename + "/")
                    ),
                    "filename": filename + "/",
                    "path": os.path.normpath(os.path.join(path, filename + "/")),
                }
                for filename in dirs
            ]

            result = {
                "files": files_obj,
                "dirs": dirs_obj,
                "base_uri": base_uri,
                "path": path,
                "uri": uripath,
            }
            return jsonify(result)
        raise BadRequest("GET " + base_uri + ": Internal error")
    else:
        raise BadRequest(
            "GET " + base_uri + ': Unrecognized format "{}"'.format(format)
        )

    raise BadRequest("GET " + base_uri + ": Internal error")


# LIST AND GET
@app.route("/rest/config/labellist", methods=["GET"])
@app.route("/rest/config/labellist/", methods=["GET"])
@app.route("/rest/config/labellist/<path:path>", methods=["GET"])
def labellist_get(path=""):
    print("Handling labellist request PATH=" + path)
    # if (not current_user.is_authenticated):
    #    raise Forbidden('/rest/config/labellist GET: login required !')
    format = request.args.get("format", "html")

    base_dir = os.path.join(app.root_path, "static/data/config/labellist/")
    base_uri = url_for("labellist_get", path="")  # '/rest/config/labellist/'

    return serve_files(base_dir, path, base_uri, format)


# LIST AND GET
@app.route("/rest/config/keypointlabels", methods=["GET"])
@app.route("/rest/config/keypointlabels/", methods=["GET"])
@app.route("/rest/config/keypointlabels/<path:path>", methods=["GET"])
def keypointlabels_get(path=""):
    print("Handling keypointlabels request PATH=" + path)
    # if (not current_user.is_authenticated):
    #    raise Forbidden('/rest/config/labellist GET: login required !')
    format = request.args.get("format", "html")

    base_dir = os.path.join(app.root_path, "static/data/config/keypointlabels/")
    # '/rest/config/keypointlabels/'
    base_uri = url_for("keypointlabels_get", path="")

    return serve_files(base_dir, path, base_uri, format)


# LIST AND GET V1


@app.route("/rest/config/videolist", methods=["GET"])
@app.route("/rest/config/videolist/", methods=["GET"])
@app.route("/rest/config/videolist/<path:path>", methods=["GET"])
def videolist_get(path=""):
    print("Handling videolist request PATH=" + path)
    # if (not current_user.is_authenticated):
    #    raise Forbidden('/rest/config/labellist GET: login required !')
    format = request.args.get("format", "html")

    print("format=", format)

    base_dir = os.path.join(app.root_path, "static/data/config/videolist/")
    # '/rest/config/keypointlabels/'
    base_uri = url_for("videolist_get", path="")

    return serve_files(base_dir, path, base_uri, format)


# LIST AND GET V2
@app.route("/rest/v2/videolist", methods=["GET"])
def videolist_get_v2():
    print("Handling videolist request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/videolist GET: login required !")
    dataset = request.args.get("dataset", "")

    dataset = None if dataset == "" else dataset

    videos_schema = VideoSchema(many=True)

    return jsonify({"data": videos_schema.dump(video_list(dataset))})


@app.route("/rest/v2/videodata", methods=["GET"])
def videodata_get_v2():
    print("Handling videodata request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/videodata GET: login required !")
    video_id = int(request.args.get("video_id"))
    if video_id is None:
        raise BadRequest("/rest/v2/videodata GET: video_id required !")

    data_type = request.args.get("data_type", "")
    allusers = request.args.get("allusers", None)
    videodatas = VideoDataSchema(many=True)

    if data_type == "" and allusers != "True":
        videos = video_data_list(video_id, current_user.id)
    elif data_type == "" and allusers == "True":
        videos = video_data_list(video_id)
    elif data_type != "" and allusers == "True":
        videos = video_data_list(video_id, data_type)
    else:
        videos = video_data_list(video_id, data_type, current_user.id)
    videos_json = videodatas.dump(videos)

    for i in videos_json:
        user = get_user_by_id(i["created_by_id"])
        i["created_by"] = user.first_name + " " + user.last_name

    return jsonify({"data": videos_json})


@app.route("/rest/v2/datasets", methods=["GET"])
def dataset_get_v2():
    print("Handling dataset request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/datasets GET: login required !")

    datasets_schema = DataSetSchema(many=True)

    return jsonify(datasets_schema.dump(dataset_list()))


@app.route("/rest/v2/edit_video/<id>", methods=["PUT"])
def edit_video_v2(id):
    print("Handling edit_videos request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/edit_videos POST: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/edit_videos POST: admin required !")

    video_schema = VideoSchema()

    # video = video_schema.dump(get_video_by_id(id))

    newdata = video_schema.loads(request.form.get("data"))

    video = video_schema.dump(
        edit_video(
            videoid=id,
            file_name=newdata.setdefault("file_name", None),
            path=newdata.setdefault("path", None),
            timestamp=newdata.setdefault("timestamp", None),
        )
    )

    return jsonify({"data": video})


@app.route("/rest/v2/get_video_data/<id>", methods=["GET"])
def get_video_data_v2(id):
    print("Handling get_video_data request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/get_video_data GET: login required !")

    video_data_schema = VideoDataSchema()

    return jsonify({"data": video_data_schema.dump(get_video_data_by_id(id))})


@app.route("/rest/v2/edit_video_data/<id>", methods=["PUT"])
def edit_video_data_v2(id):
    print("Handling edit_video_data request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/edit_video_data POST: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/edit_video_data POST: admin required !")

    video_data_schema = VideoDataSchema()

    newdata = video_data_schema.loads(request.form.get("data"))

    video_data = video_data_schema.dump(
        edit_video_data(
            video_dataid=id,
            file_name=newdata.setdefault("file_name", None),
            path=newdata.setdefault("path", None),
            timestamp=newdata.setdefault("timestamp", None),
            data_type=newdata.setdefault("data_type", None),
            video_id=newdata.setdefault("video_id", None),
        )
    )

    return jsonify({"data": video_data})


@app.route("/rest/v2/add_video_data", methods=["POST"])
def add_video_data_v2():
    print("Handling add_video_data request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/add_video_data POST: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/add_video_data POST: admin required !")

    video_data_schema = VideoDataSchema()
    newdata = video_data_schema.loads(request.form.get("data"))

    if "video_id" not in newdata:
        raise BadRequest("/rest/v2/add_video_data POST: video_id required !")
    if "created_by_id" not in newdata:
        raise BadRequest("/rest/v2/add_video_data POST: created_by_id required !")
    if "data" not in newdata:
        raise BadRequest("/rest/v2/add_video_data POST: data required !")
    if "data_type" not in newdata:
        raise BadRequest("/rest/v2/add_video_data POST: data_type required !")

    video = get_video_by_id(newdata["video_id"])
    created_by = get_user_by_id(newdata["created_by_id"])

    video_data = video_data_schema.dump(
        add_video_data(
            file_name=newdata.setdefault("file_name", None),
            path=newdata.setdefault("path", None),
            timestamp=newdata.setdefault("timestamp", None),
            data_type=newdata.setdefault("data_type", None),
            video=video,
            created_by=created_by,
            data=newdata.setdefault("data", None),
            notes=newdata.setdefault("notes", None),
            created_from=newdata.setdefault("created_from", None),
        )
    )

    return jsonify({"data": video_data})


@app.route("/rest/v2/get_video/<videoid>", methods=["GET"])
def get_video_v2(videoid):
    print("Handling get_video request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/add_video_data POST: login required !")

    video = get_video_by_id(videoid)

    video_schema = VideoSchema()

    return jsonify({"data": video_schema.dump(video)})


# @app.route("/rest/v2/add_video", methods=["POST"])
# def add_video_v2():
#     if not current_user.is_authenticated:
#         raise Forbidden("/rest/v2/add_video POST: login required !")
#     if not current_user.has_roles("admin"):
#         raise Forbidden("/rest/v2/add_video POST: admin required !")

#     video_schema = VideoSchema()
#     newdata = video_schema.loads(request.form.get("data"))

#     if "created_by_id" not in newdata:
#         raise BadRequest("/rest/v2/add_video POST: created_by_id required !")
#     if "file_name" not in newdata:
#         raise BadRequest("/rest/v2/add_video POST: file_name required !")
#     if "path" not in newdata:
#         raise BadRequest("/rest/v2/add_video POST: path required !")


#     created_by = get_user_by_id(newdata["created_by_id"])

#     video = video_schema.dump(
#         # TODO CREATE ADD_VIDEO FUNCTION
#         add_video(
#             file_name=newdata.setdefault("file_name", None),
#             path=newdata.setdefault("path", None),
#             timestamp=newdata.setdefault("timestamp", None),
#             created_by=created_by,
#             notes=newdata.setdefault("notes", None),
#             created_from=newdata.setdefault("created_from", None),
#         )
#     )


@app.route("/rest/v2/import_from_csv", methods=["POST"])
def import_from_csv_v2():
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/import_from_csv POST: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/import_from_csv POST: admin required !")

    csv_file = request.files["csv_file"]
    dataset = request.form.get("dataset")
    if not csv_file:
        raise BadRequest("/rest/v2/import_from_csv POST: csv_file required !")
    if not dataset:
        raise BadRequest("/rest/v2/import_from_csv POST: dataset required !")

    import_from_csv(csv_file, dataset)

    return jsonify({"data": "OK"})


# LIST
@app.route("/rest/events/", methods=["GET"])
def events_get_list():
    if not current_user.is_authenticated:
        raise Forbidden("/rest/events GET: login required !")

    format = request.args.get("format", "html")
    video = request.args.get("video")
    metadata = request.args.get("metadata")

    print("metadata", metadata)

    user_ids = os.listdir("labelbee/static/upload/")
    # user_ids = [str(current_user.id))]

    uri_list = []
    for user_id in user_ids:
        user_dir = "labelbee/static/upload/" + user_id
        if not os.path.isdir(user_dir):
            continue
        tracks = os.listdir(user_dir)
        print("user_id=", user_id)
        user = User.query.filter_by(id=int(user_id)).first()
        print("user=", user)
        print("user.id=", user.id)
        print("user.first_name=", user.first_name)
        print("user.email=", user.email)
        for file in tracks:
            if file.split(".")[-1] != "json":
                continue
            parsedfilename = parse_trackfilename(file)

            if video is not None:
                if parsedfilename.get("video") != video:
                    continue

            uri_list.append(
                {
                    "filename": file,
                    "uri": url_for("loadtrack", user=user.id, trackfile=file),
                    "user_id": user.id,
                    "user_name": user.first_name + " " + user.last_name,
                    "user_email": user.email,
                    "timestamp": parsedfilename.get("timestamp"),
                    "video": parsedfilename.get("video"),
                }
            )

            if metadata is not None:
                with open(user_dir + "/" + file, "r") as json_file:
                    data = json.load(json_file)
                    if "info" in data:
                        uri_list[-1]["metadata"] = data["info"]

    uri_list = sorted(uri_list, key=lambda item: item["timestamp"])

    if format == "html":
        string = ""
        for item in uri_list:
            string += (
                '<button onclick="jsonFromServer('
                + "'"
                + item["uri"]
                + "'"
                + ')">'
                + item["filename"]
                + "</button> <br>"
            )
        # print (string)
        result = {"data": string}
    elif format == "json":
        result = uri_list
    else:
        # abort('/rest/events GET: unrecognized format "{}"'.format(format))
        raise BadRequest('/rest/events GET: unrecognized format "{}"'.format(format))

    return jsonify(result)


# CREATE ITEM


@app.route("/rest/events/", methods=["POST"])
def events_post():
    if not current_user.is_authenticated:
        raise Forbidden("/rest/events GET: login required !")

    obj = request.get_json()
    # timestamp = str(datetime.utcnow()).replace(" ","")
    timestamp = datetime.now().strftime("%y%m%d%H%M%S")

    # print(obj)

    data = obj.get("data")
    video = obj.get("video", "C00_000000000000")

    # path = str(current_user.id)+'/tracks'+timestamp+'.json'
    path = (
        str(current_user.id)
        + "/"
        + "{video}-{timestamp}.json".format(video=video, timestamp=timestamp)
    )

    jsonfile = upload_dir + path
    uri = "/rest/events/" + path

    print(
        'json_to_server: Saving JSON to file "{}" (uri={}):\njson={}'.format(
            jsonfile, uri, data
        )
    )

    #         try:
    #             os.makedirs(upload_dir+str(current_user.id))
    #         except:
    #             pass

    with open(jsonfile, "w") as outfile:
        json.dump(data, outfile)

    return uri


# RETRIEVE ITEM


@app.route("/rest/events/<user>/<trackfile>", methods=["GET"])
def loadtrack(user, trackfile):
    if not current_user.is_authenticated:
        raise Forbidden("/rest/events GET: login required !")

    filename = "labelbee/static/upload/" + user + "/" + trackfile
    # print(os.path.isfile(filename))

    with open(filename, "r") as f:
        data = f.read()

    # print('loadtrack: Sending JSON from file "{}":\njson={}'.format(filename,data))
    print('loadtrack: Sending JSON from file "{}"'.format(filename))
    return data


@app.route("/rest/events/self/<trackfile>", methods=["GET"])
def load_json(trackfile):
    if not current_user.is_authenticated:
        raise Forbidden("/rest/events GET: login required !")

    return loadtrack(str(current_user.id), trackfile)
