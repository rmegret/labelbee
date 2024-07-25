from datetime import datetime
from flask import Flask, render_template
# from flask_mail import Mail
from flask_migrate import Migrate
# from flask_script import Manager
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_user import UserManager
from flask_wtf.csrf import CSRFProtect
import sys
import logging
import os


log_dir = os.environ.get("LABELBEE_LOGDIR")
log_dir = "./"

# Enable running in subdomain
# http://flask.pocoo.org/snippets/35/

# TODO: Maybe poner en proxy?
class ReverseProxied(object):
    """Wrap the application in this middleware and configure the
    front-end server to add these headers, to let you quietly bind
    this to a URL other than / and to an HTTP scheme that is
    different than what is used locally.

    In nginx:
    location /myprefix {
        proxy_pass http://192.168.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Scheme $scheme;
        proxy_set_header X-Script-Name /myprefix;
        }

    :param app: the WSGI application
    """

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # print('ReverseProxied',environ,start_response)
        script_name = environ.get("HTTP_X_SCRIPT_NAME", "")
        if script_name:
            environ["SCRIPT_NAME"] = script_name
            path_info = environ["PATH_INFO"]
            if path_info.startswith(script_name):
                environ["PATH_INFO"] = path_info[len(script_name) :]

        scheme = environ.get("HTTP_X_SCHEME", "")
        if scheme:
            environ["wsgi.url_scheme"] = scheme

        server = environ.get("HTTP_X_FORWARDED_SERVER", "")
        if server:
            environ["HTTP_HOST"] = server

        port = environ.get("HTTP_X_FORWARDED_PORT", "")
        if port:
            environ["SERVER_PORT"] = port

        return self.app(environ, start_response)


db = SQLAlchemy()
ma = Marshmallow()
csrf = CSRFProtect()

from labelbee.models import *
# from labelbee.views import *

# Initialize Flask Application

def create_app():
    app = Flask(__name__, static_url_path="", template_folder="templates")  # The WSGI compliant webapp object
    app.wsgi_app = ReverseProxied(app.wsgi_app)

    ####

    # Configure Logging
    # app.logger.removeHandler(app.logger.handlers[0])
    # app.logger.addHandler(logging.FileHandler(log_dir + "/gunicorn_error_logs.log"))
    # app.logger.setLevel(logging.DEBUG)
    # app.logger.handlers[0].setFormatter(logging.Formatter('[%(asctime)s] [%(filename)s] [%(levelname)s] %(message)s'))
    # logger = logging.getLogger('labelbee.init_app')


    # Read common settings from 'app/settings.py'
    app.config.from_object("labelbee.settings")
    # print(app.config)
    # Read environment-specific settings from 'app/local_settings.py'
    try:
        app.config.from_object("labelbee.local_settings")
    except ImportError as e:
        print(e)
        exit(
            "The configuration file 'labelbee/local_settings.py' does not exist.\n"
            + "Please copy labelbee/local_settings_example.py to labelbee/local_settings.py\n"
            + "and customize its settings before you continue."
        )

    # Add/overwrite extra settings from parameter 'extra_config_settings'
    # app.config.update(extra_config_settings)
    if app.testing:
        # Disable CSRF checks while testing
        app.config["WTF_CSRF_ENABLED"] = False

  # Setup CSRF protection
    # ma = Marshmallow(app)  # Setup Flask_Marshmallow for API


    # Initialize Flask-SQLAlchemy and Flask-Script _after_ app.config has been read
    db.init_app(app)
    ma.init_app(app)
    # Setup Flask-Migrate
    migrate = Migrate(app, db)
    # Setup Flask-Mail
    # mail = Mail(app)
    # Setup WTForms CsrfProtect
    csrf.init_app(app)

    # Define bootstrap_is_hidden_field for flask-bootstrap's bootstrap_wtf.html
    from wtforms.fields import HiddenField

    def is_hidden_field_filter(field):
        return isinstance(field, HiddenField)

    app.jinja_env.globals["bootstrap_is_hidden_field"] = is_hidden_field_filter

    from .blueprints import auth
    app.register_blueprint(auth.bp)

    from .blueprints import admin
    app.register_blueprint(admin.bp)

    from .blueprints import home
    app.register_blueprint(home.bp)

    from .blueprints import gallery
    app.register_blueprint(gallery.bp)

    from .blueprints import labelbee
    app.register_blueprint(labelbee.bp)

    from .blueprints import download
    app.register_blueprint(download.bp)

    # from .blueprints import api
    # app.register_blueprint(api.bp)
    
    from .blueprints import test_api
    app.register_blueprint(test_api.bp)

    user_manager = UserManager(app, db, User)

    # logger.info("APPLICATION_ROOT=%s",app.config['APPLICATION_ROOT'])
    #logger.info("config=%s",app.config)
    return app

