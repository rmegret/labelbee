from flask import render_template, render_template_string, jsonify, Blueprint, request
from flask_user import current_user, login_required, roles_accepted

from flask_user import current_user
import os

bp = Blueprint('labelbee', __name__, url_prefix='/', template_folder="templates")


@bp.route("/labelbee/gui")
@login_required  # Limits access to authenticated users
def labelbee_user_page():

    video_url = request.args.get("video_url")
    tag_file = request.args.get("tag_file")

    http_script_name = request.environ.get("SCRIPT_NAME")
    # TODO: What does this do?
    if current_user.is_authenticated:
        try:
            os.makedirs(upload_dir + str(current_user.id))
        except:
            print("labelbee_user_page: could not create upload dir")
            pass
        print(tag_file)
        # TODO: Make pages a constant
        return render_template(
            "labelbee_page.html",
            userid=str(current_user.id),
            http_script_name=http_script_name,
            video_url="datasets/gurabo10avi/mp4/", # + video_url  
            tag_file = "datasets/gurabo10avi/tags/"# + tag_file,
            
        )
    else:
        #TODO: Make pages a constant
        return render_template(
            "labelbee_page.html",
            userid="anonymous",
            http_script_name=http_script_name,
            video_url=video_url,
            tag_file=tag_file,
        )
