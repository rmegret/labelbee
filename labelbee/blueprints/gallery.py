from flask import render_template, Blueprint, request, redirect, url_for
from flask_user import current_user, login_required, roles_accepted
from labelbee.database import (
    dataset_list,
    get_user_by_id,
    get_dataset_by_id,
    new_dataset,
    delete_dataset_by_id,
    get_video_by_id,
    edit_video,
    video_info,
    get_video_data_by_id,
    edit_dataset
)

from labelbee.app import db

from labelbee.models import UserProfileForm

bp = Blueprint('gallery', __name__, url_prefix='/')


@bp.route("/datasets", methods=["GET", "POST"])
@login_required
def datasets_page():
    form = UserProfileForm(obj=current_user)
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
        return redirect(url_for("gallery.datasets_page"))

    # Process GET or invalid POST
    return render_template("gallery/datasets_page.html", datasets=datasets, form=form)



@bp.route("/add_dataset", methods=["GET", "POST"])
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
        return redirect(url_for("gallery.datasets_page"))

    # Process GET or invalid POST
    return render_template("gallery/add_dataset.html", form=form)



@bp.route("/delete_dataset", methods=["GET", "POST"])
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
        return redirect(url_for("gallery.datasets_page"))

    # Process GET or invalid POST
    return render_template(url_for("gallery.datasets_page"))



@bp.route("/videos", methods=["GET", "POST"])
@login_required
def videos_page():
    form = UserProfileForm(obj=current_user)

    datasetid = request.args.get("dataset")
    # logger.info(f"videos_page: datasetid={datasetid}")
    if datasetid != None:
        # Parse the request to get the user name from id
        # logger.info(f"videos_page: datasetid={datasetid}")
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
        return redirect(url_for("gallery.videos_page"))

    # Process GET or invalid POST
    return render_template(
        "gallery/videos_page.html",
        form=form,
        dataset=dataset,
    )

@bp.route("/edit_video", methods=["GET", "POST"])
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
            url_for("gallery.video_data_page") + "?videoid=" + request.form.get("video")
        )

    # Process GET or invalid POST
    return render_template("gallery/edit_video.html", form=form, video=video)


@bp.route("/videodata", methods=["GET", "POST"])
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
        return redirect(url_for("gallery.video_data_page"))

    # Process GET or invalid POST
    return render_template(
        "gallery/video_data_page.html",
        video_url=video_url,
        video=video_info(videoid),
        form=form,
        datasetid=datasetid,
    )

@bp.route("/video_data_details", methods=["GET", "POST"])
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
        return redirect(url_for("gallery.video_data_details_page"))

    # Process GET or invalid POST
    return render_template(
        "gallery/video_data_details_page.html",
        form=form,
        video_data=video_data,
        datasetid=datasetid,
        video_id=video_id,
    )


@bp.route("/edit_dataset", methods=["GET", "POST"])
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

