from flask import render_template, render_template_string, jsonify, Blueprint, request
from .flask_range_requests import send_from_directory_partial, dir_listing
from flask_user import current_user
import os

bp = Blueprint('download', __name__, url_prefix='/data')

@bp.route("/data/<path:path>")
def send_data(path):
    # TODO: Make strigs into constants
    data_dir = os.path.join(bp.root_path, "../static/data")
    return send_from_directory_partial(data_dir, path, "/data")
