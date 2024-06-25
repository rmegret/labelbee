from flask import render_template, render_template_string, jsonify, Blueprint, request
from flask_user import current_user
import os

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
    UserProfileForm,
    User,
    UsersRoles,
    Role,
    UserUpdateForm
)
from labelbee.db_functions import (
    add_video_data,
    delete_dataset_by_id,
    delete_user,
    delete_video,
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
    get_user_roles_by_id,
    get_video_data_by_id,
    edit_video_data
)

from labelbee.schemas import (
    VideoSchema
)

# TODO: Clean up
# TODO: Keep cleaning
# TODO: Make api restful
# TODO: Figure out if this should be done using flask-REST

bp = Blueprint('api', __name__, url_prefix='')


@bp.route("/rest/auth/login", methods=["POST"])
def ajaxlogin():
    """
    API GET endpoint for authentification

    Usage
    -----
    :param URL: /rest/auth/login
    :reqheader email: email used to log in
    :reqheader password: password used to log in

    Returns
    -------
    :return: JSON object with the following fields:
    :rtype: JSON object
    """
    email = request.form.get("email")
    password = request.form.get("password")
    # logger.debug(email)

    user = User.query.filter_by(email=email).first()

    def check_password(user, password):
        # print(user.password)
        return current_app.user_manager.verify_password(password, user.password)

    # Login fail
    if user is None or not check_password(user, password):
        return jsonify(
            {
                "request": "login",
                "email": email,
                "status": "FAIL",
                "message":"Incorrect credentials. Please try again."
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


@bp.route("/rest/auth/logout", methods=["GET", "POST"])
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


@bp.route("/rest/auth/whoami")
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
    # print
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


@bp.route("/rest/user/add_users", methods=["POST"])
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

# Deprecated, incompatible with new edit_user function implemented for
# admin manage users menu (route /manage_users)
# Assumes relationship between users and roles tables is one-to-many,
# when it really is many-to-many(users can have more than one role)
# @app.route("/rest/user/edit_users", methods=["POST"])
# def edit_users():
#     if current_user.is_authenticated and current_user.has_roles("admin"):
#         json_list = json.loads(request.form.get("json"))
#         for user in json_list:
#             edit_user(
#                 user_id=int(user["user_id"]),
#                 first_name=user.setdefault("first_name", None),
#                 last_name=user.setdefault("last_name", None),
#                 email=user.setdefault("email", None),
#                 password=user.setdefault("password", None),
#                 role_id=user.setdefault("role_id", 2),
#             )
#         return jsonify({"status": "SUCCESS"})
#     else:
#         return jsonify({"status": "FAIL", "message": "not authenticated"})


@bp.route("/rest/user/list_users", methods=["GET"])
def list_users():
    if current_user.is_authenticated:

        # Use Flask-Marshmallow Schema to make json serializable list of users
        user_schema = UserSchema(many=True)
        return jsonify({"status": "SUCCESS", "users": user_schema.dump(user_list())})
    else:
        return jsonify({"status": "FAIL"})


@bp.route("/rest/user/delete_users", methods=["POST"])
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
@bp.route("/rest/config/labellist", methods=["GET"])
@bp.route("/rest/config/labellist/", methods=["GET"])
@bp.route("/rest/config/labellist/<path:path>", methods=["GET"])
def labellist_get(path=""):
    # print("Handling labellist request PATH=" + path)
    # if (not current_user.is_authenticated):
    #    raise Forbidden('/rest/config/labellist GET: login required !')
    format = request.args.get("format", "html")
    
    # base_dir = os.path.join(app.root_path, "static/data/config/labellist/")
    # Quick fix using environment variable due to changes in config location
    base_dir = os.path.join(data_root_dir, "config/labellist/")
    base_uri = url_for("labellist_get", path="")  # '/rest/config/labellist/'
    return serve_files(base_dir, path, base_uri, format)


# LIST AND GET
@bp.route("/rest/config/keypointlabels", methods=["GET"])
@bp.route("/rest/config/keypointlabels/", methods=["GET"])
@bp.route("/rest/config/keypointlabels/<path:path>", methods=["GET"])
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


@bp.route("/rest/config/videolist", methods=["GET"])
@bp.route("/rest/config/videolist/", methods=["GET"])
@bp.route("/rest/config/videolist/<path:path>", methods=["GET"])
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
@bp.route("/rest/v2/videolist", methods=["GET"])
def videolist_get_v2():
    print("Handling videolist request")
    # if not current_user.is_authenticated:
        # raise Forbidden("/rest/v2/videolist GET: login required !")
    dataset = request.args.get("dataset", "")

    dataset = None if dataset == "" else dataset

    videos_schema = VideoSchema(many=True)

    try :
        video_payload = videos_schema.dump(video_list(dataset))
        return jsonify({"data": video_payload})
    except Exception as e:
        print(e)

@bp.route("/rest/v2/videodata", methods=["GET"])
def videodata_get_v2():
    print("Handling videodata request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/videodata GET: login required !")
    video_id = request.args.get("video_id")
    if (video_id is not None): video_id = int(video_id)
    #if video_id is None:
    #    raise BadRequest("/rest/v2/videodata GET: video_id required !")

    data_type = request.args.get("data_type", "")
    allusers = request.args.get("allusers", None)
    videodatas = VideoDataSchema(many=True)

    if data_type == "" and allusers not in ["True","true"]:
        videos = video_data_list(video_id, current_user.id)
    elif data_type == "" and allusers in ["True","true"]:
        videos = video_data_list(video_id)
    elif data_type != "" and allusers in ["True","true"]:
        videos = video_data_list(video_id, data_type)
    else:
        videos = video_data_list(video_id, data_type, current_user.id)
    videos_json = videodatas.dump(videos)

    for i in videos_json:
        user = get_user_by_id(i["created_by_id"])
        i["created_by"] = user.first_name + " " + user.last_name

    return jsonify({"data": videos_json})


@bp.route("/rest/v2/datasets", methods=["GET"])
def dataset_get_v2():
    print("Handling dataset request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/datasets GET: login required !")

    datasets_schema = DataSetSchema(many=True)

    return jsonify(datasets_schema.dump(dataset_list()))


@bp.route("/rest/v2/edit_video/<id>", methods=["PUT"])
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


@bp.route("/rest/v2/get_video_data/<id>", methods=["GET"])
def get_video_data_v2(id):
    print("Handling get_video_data request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/get_video_data GET: login required !")

    video_data_schema = VideoDataSchema()

    return jsonify({"data": video_data_schema.dump(get_video_data_by_id(id))})

@bp.route("/rest/v2/get_video_data_raw/<id>", methods=["GET"])
def get_video_data_raw_v2(id):
    print("Handling get_video_data request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/get_video_data GET: login required !")

    video_data_schema = VideoDataSchema()

    return Response(video_data_schema.dump(get_video_data_by_id(id))['data'], mimetype='application/json')

@bp.route("/rest/v2/edit_video_data/<id>", methods=["PUT"])
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


@bp.route("/rest/v2/add_video_data", methods=["POST"])
def add_video_data_v2():
    print("Handling add_video_data request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/add_video_data POST: login required !")
    #if not current_user.has_roles("admin"):
    #    raise Forbidden("/rest/v2/add_video_data POST: admin required !")

    video_data_schema = VideoDataSchema()
    form_data = json.dumps(request.form)
    newdata = video_data_schema.loads(form_data)

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


@bp.route("/rest/v2/get_video/<videoid>", methods=["GET"])
def get_video_v2(videoid):
    print("Handling get_video request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/add_video_data POST: login required !")

    video = get_video_by_id(videoid)

    video_schema = VideoSchema()

    return jsonify({"data": video_schema.dump(video)})


@bp.route("/rest/v2/delete_video/<videoid>", methods=["GET"])
def delete_video_v2(videoid):
    print("Handling delete_video request")
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/delete_video GET: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/delete_video GET: admin required !")

    delete_video(videoid)

    return jsonify({"data": "Video deleted"})


@bp.route("/rest/v2/get_video_info/<videoid>", methods=["GET"])
def get_videoinfo_v2(videoid):
    print("Handling get_videoinfo request")
    # if not current_user.is_authenticated:
        # raise Forbidden("/rest/v2/get_videoinfo GET: login required !")

    video = get_video_by_id(videoid)

    video_schema = VideoSchema()

    video = video_schema.dump(video)
    videoinfo = {
        "video_id": video["id"],
        "path": video["path"],
        "file_name": video["file_name"],
        "videofps": video["fps"],
        "realfps": video["realfps"],
        "starttime": video["timestamp"],
        "duration": video["frames"] / video["fps"],
        "nframes": video["frames"],
    }

    return jsonify(videoinfo)


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


@bp.route("/rest/v2/import_from_csv", methods=["POST"])
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


@bp.route("/rest/v2/update_paths", methods=["GET"])
def update_paths_endpoint():
    if not current_user.is_authenticated:
        raise BadRequest("/rest/v2/update_paths GET: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/update_paths GET: admin required !")

    update_paths()
    return jsonify({"data": "OK"})


@bp.route("/rest/v2/populate_datasets", methods=["GET"])
def populate_datasets_endpoint():
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/populate_datasets POST: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/populate_datasets POST: admin required !")

    populate_datasets()
    return jsonify({"data": "OK"})


@bp.route("/rest/v2/fix_datasets", methods=["GET"])
def fix_datasets_endpoint():
    if not current_user.is_authenticated:
        raise Forbidden("/rest/v2/fix_datasets POST: login required !")
    if not current_user.has_roles("admin"):
        raise Forbidden("/rest/v2/fix_datasets POST: admin required !")

    fix_datasets()
    return jsonify({"data": "OK"})


# LIST
@bp.route("/rest/events/", methods=["GET"])
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


@bp.route("/rest/events/", methods=["POST"])
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


@bp.route("/rest/events/<user>/<trackfile>", methods=["GET"])
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


@bp.route("/rest/events/self/<trackfile>", methods=["GET"])
def load_json(trackfile):
    if not current_user.is_authenticated:
        raise Forbidden("/rest/events GET: login required !")

    return loadtrack(str(current_user.id), trackfile)
