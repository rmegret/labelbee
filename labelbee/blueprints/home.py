from flask import render_template, Blueprint

bp = Blueprint('home', __name__, url_prefix='/')

@bp.route("/")
def home_page():
    return render_template("home/home_page.html")
