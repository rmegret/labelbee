from flask import render_template, Blueprint, Response

bp = Blueprint('home', __name__, url_prefix="/")

@bp.route("/")
def home_page():
    print("aqii")
    return render_template("home/home_page.html")


@bp.route("/test")
def foo():
    print("aca")
    return Response(f"""
    <!DOCTYPE html> 
    <html> 
        <body> 

        <video width="400" controls>
        <source src="/home/andres/Documents/labelbee/labelbee/static/data/videos/2ca6e508-1d9a-4787-983a-0cddfa1435a8.mp4" type="video/mp4">
        Your browser does not support HTML video.
        </video>

        
        </body> 
    </html>
    """)