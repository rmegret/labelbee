from flask import render_template, Blueprint

bp = Blueprint('home', __name__, url_prefix='/', template_folder="templates")

@bp.route("/")
def home_page():
    return render_template("home_page.html")
