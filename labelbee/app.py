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
from labelbee.middlewares.reverse_proxy import ReverseProxied


log_dir = os.environ.get("LABELBEE_LOGDIR")
db = SQLAlchemy()
ma = Marshmallow()
csrf = CSRFProtect()
logger = logging.getLogger('labelbee.init_app')


from labelbee.models import *

def create_app():

    app = Flask(__name__, static_url_path="", template_folder="blueprints/templates")  # The WSGI compliant webapp object
    app.wsgi_app = ReverseProxied(app.wsgi_app)

    # Configure Logging
    app.logger.removeHandler(app.logger.handlers[0])
    #TODO: Pull this from the env file
    os.makedirs("../logs", exist_ok=True)
    app.logger.addHandler(logging.FileHandler(log_dir + "/gunicorn_error_logs.log"))
    app.logger.setLevel(logging.DEBUG)
    app.logger.handlers[0].setFormatter(logging.Formatter('[%(asctime)s] [%(filename)s] [%(levelname)s] %(message)s'))
    logger = logging.getLogger('labelbee.init_app')


    app.config.from_object("labelbee.settings.settings")
    # Read environment-specific settings from 'app/local_settings.py'
    try:
        app.config.from_object("labelbee.settings.local_settings")
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

    ma = Marshmallow(app)  # Setup Flask_Marshmallow for API


    # Initialize Flask-SQLAlchemy and Flask-Script _after_ app.config has been read
    db.init_app(app)
    ma.init_app(app)
    migrate = Migrate(app, db)
    # Setup CSRF protection
    csrf.init_app(app)
    # mail = Mail(app)
    

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

    from .blueprints.download import download
    app.register_blueprint(download.bp)

    from .blueprints import api
    app.register_blueprint(api.bp)

    user_manager = UserManager(app, db, User)

    logger.info("APPLICATION_ROOT=%s",app.config['APPLICATION_ROOT'])
    logger.info("config=%s",app.config)
    return app

