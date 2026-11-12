from flask import render_template, render_template_string, jsonify, Blueprint, request
from .flask_range_requests import send_from_directory_partial, dir_listing
# from flask_user import current_user
import os

bp = Blueprint('download', __name__, url_prefix='/data')

@bp.route("/", defaults={'path': ''})
@bp.route("/<path:path>")  # no duplicate with url_prefix
def send_data(path):
    # Videos referenced by DataInfrastructure are served from DATA_DIR
    # (see DATAINFRA_PATH_PREFIX); falls back to the old static/data folder.
    data_dir = os.environ.get("DATA_DIR") or os.path.join(bp.root_path, "../static/data")
    return send_from_directory_partial(data_dir, path, "/data")
