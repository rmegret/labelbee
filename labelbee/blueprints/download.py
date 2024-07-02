from flask import render_template, render_template_string, jsonify, Blueprint, request
from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask_user import current_user
import os

bp = Blueprint('download', __name__, url_prefix='/')


#TODO: Send id in path
#TODO: Use storage api to get the bytes 
#TODO: Send bytes using partial thing 
@bp.route("/data/<path:path>")
def send_data(path):
    # TODO: Make strigs into constants
    # TODO: Use storage api to get the correct path
    
    data_dir = os.path.join(bp.root_path, "../static/data")
    return send_from_directory_partial(data_dir, path, "/data")
