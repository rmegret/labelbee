from flask import render_template, render_template_string, jsonify, Blueprint, request
from flask_user import current_user
from flask import redirect, url_for, Response

import os

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

from . import db

import logging

logger = logging.getLogger(__name__)

#TODO: Break into more blueprints
# 1. Home
# 2. Auth
# 3. API
# 4. Datasets

bp = Blueprint('home', __name__, url_prefix='/')


@bp.route("/")
def home_page():
    return render_template("pages/home_page.html")


#Datasets views

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


@bp.route("/add_dataset", methods=["GET", "POST"])
# @login_required
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
        return redirect(url_for("home.datasets_page"))

    # Process GET or invalid POST
    return render_template("pages/add_dataset.html", form=form)


@bp.route("/edit_dataset", methods=["GET", "POST"])
# @roles_accepted("admin")
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
            url_for("home.videos_page") + "?dataset=" + request.form.get("dataset")
        )

    # Process GET or invalid POST
    return render_template("pages/edit_dataset.html", form=form, dataset=dataset)


#Videos views


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


@bp.route("/video_data_details", methods=["GET", "POST"])
# @login_required
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
        return redirect(url_for("home.video_data_details_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/video_data_details_page.html",
        form=form,
        video_data=video_data,
        datasetid=datasetid,
        video_id=video_id,
    )



@bp.route("/videodata", methods=["GET", "POST"])
# @login_required
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
        return redirect(url_for("home.video_data_page"))

    # Process GET or invalid POST
    return render_template(
        "pages/video_data_page.html",
        video_url=video_url,
        video=video_info(videoid),
        form=form,
        datasetid=datasetid,
    )



#User views

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



#Apis



# LIST AND GET V2
@bp.route("/rest/v2/videolist", methods=["GET"])
def videolist_get_v2():
    print("Handling videolist request")
    # if not current_user.is_authenticated:
        # raise Forbidden("/rest/v2/videolist GET: login required !")
    dataset = request.args.get("dataset", "")

    dataset = None if dataset == "" else dataset

    videos_schema = VideoSchema(many=True)

    return jsonify({"data": videos_schema.dump(video_list(dataset))})


@bp.route("/rest/v2/videodata", methods=["GET"])
def videodata_get_v2():
    print("Handling videodata request")
    # if not current_user.is_authenticated:
        # raise Forbidden("/rest/v2/videodata GET: login required !")
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


@bp.route("/rest/v2/get_video_data_raw/<id>", methods=["GET"])
def get_video_data_raw_v2(id):
    print("Handling get_video_data request")
    # if not current_user.is_authenticated:
        # raise Forbidden("/rest/v2/get_video_data GET: login required !")

    video_data_schema = VideoDataSchema()

    return Response(video_data_schema.dump(get_video_data_by_id(id))['data'], mimetype='application/json')
