from flask import Blueprint, render_template, request, redirect, url_for
from flask_user import login_required, current_user
from labelbee.app import db

from labelbee.models import UserProfileForm

bp = Blueprint('auth', __name__, url_prefix='', template_folder="templates")

@bp.route("/user")
@login_required  # Limits access to authenticated users
def user_page():

    return render_template("user_page.html", userid={"current_user": "andres"})


@bp.route("/user/profile", methods=["GET", "POST"])
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
        return redirect(url_for("home.home_page"))

    # Process GET or invalid POST
    return render_template("user_profile_page.html", form=form)
