# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask import current_app
from flask import redirect, Blueprint
from flask import render_template, render_template_string, Markup, jsonify
from flask import request, url_for, safe_join
from flask_user import current_user, login_required, roles_accepted
from flask_login import logout_user, login_user
from werkzeug.exceptions import BadRequest, NotFound, Forbidden

import os
from datetime import datetime
import json
import pandas as pd
import numpy as np
import re

from labelbee.init_app import app, db, csrf
from labelbee.models import UserProfileForm, User
from labelbee.db_functions import video_list, dataset_list, video_data_list

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

    dataset = request.args.get("dataset")

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
        "pages/videos_page.html", videos=video_list(dataset), form=form
    )


@app.route("/videodata", methods=["GET", "POST"])
@login_required
def video_data_page():
    form = UserProfileForm(obj=current_user)

    videoid = request.args.get("videoid")

    video_url = request.args.get("video_url")

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
        video_data=video_data_list(videoid),
        video_url=video_url,
        form=form,
    )


@app.route("/datasets", methods=["GET", "POST"])
@login_required
def datasets_page():
    form = UserProfileForm(obj=current_user)

    # Process valid POST
    if request.method == "POST" and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for("datasets_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/datasets_page.html", datasets=dataset_list(), form=form
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

    print("labelbee_user_page launched with http_script_name=", http_script_name)

    if current_user.is_authenticated:
        try:
            os.makedirs(upload_dir + str(current_user.id))
        except:
            print("labelbee_user_page: could not create upload dir")
            pass

        return render_template(
            "pages/labelbee_page.html",
            userid=str(current_user.id),
            http_script_name=http_script_name,
            video_url=video_url,
            tag_file=tag_file,
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
    return render_template("pages/admin_page.html")


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
    email = request.form.get("email")
    password = request.form.get("password")

    # print(email,password)

    user = User.query.filter_by(email=email).first()

    def check_password(user, password):
        # print(user.password)
        return current_app.user_manager.verify_password(password, user)

    if user is None or not check_password(user, password):
        return jsonify(
            {
                "request": "login",
                "email": email,
                "status": "FAIL",
                "message": "Invalid username or password",
            }
        )

    login_user(user)
    return jsonify({"request": "login", "email": email, "status": "SUCCESS"})


@app.route("/rest/auth/logout", methods=["GET", "POST"])
def ajaxlogout():
    logout_user()
    return jsonify({"request": "logout", "status": "SUCCESS"})


@app.route("/rest/auth/whoami")
def whoami():
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


# LIST AND GET


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
