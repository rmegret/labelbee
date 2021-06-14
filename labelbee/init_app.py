# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

# import logging
from datetime import datetime
from flask import Flask
from flask_mail import Mail
from flask_migrate import Migrate  # , MigrateCommand
from flask_script import Manager
from flask_sqlalchemy import SQLAlchemy
from flask_user import UserManager
from flask_wtf.csrf import CSRFProtect

# Enable running in subdomain
# http://flask.pocoo.org/snippets/35/


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


####


app = Flask(__name__, static_url_path="")  # The WSGI compliant webapp object
app.wsgi_app = ReverseProxied(app.wsgi_app)

db = SQLAlchemy()  # Setup Flask-SQLAlchemy
manager = Manager(app)  # Setup Flask-Script
csrf = CSRFProtect(app)

####

# Initialize Flask Application


def init_app(app, extra_config_settings={}):

    print("init_app: app=", app, "\nextra_config_settings=", extra_config_settings)

    # Read common settings from 'app/settings.py'
    app.config.from_object("labelbee.settings")

    # Read environment-specific settings from 'app/local_settings.py'
    try:
        app.config.from_object("labelbee.local_settings")
    except ImportError:
        print(
            "The configuration file 'labelbee/local_settings.py' does not exist.\n"
            + "Please copy labelbee/local_settings_example.py to labelbee/local_settings.py\n"
            + "and customize its settings before you continue."
        )
        exit()

    # Add/overwrite extra settings from parameter 'extra_config_settings'
    app.config.update(extra_config_settings)
    if app.testing:
        # Disable CSRF checks while testing
        app.config["WTF_CSRF_ENABLED"] = False

    # Initialize Flask-SQLAlchemy and Flask-Script _after_ app.config has been read
    db.init_app(app)

    # Setup Flask-Migrate
    migrate = Migrate(app, db)
    # manager.add_command('db', MigrateCommand)

    # Setup Flask-Mail
    mail = Mail(app)

    # Setup WTForms CsrfProtect

    csrf.init_app(app)

    # Define bootstrap_is_hidden_field for flask-bootstrap's bootstrap_wtf.html
    from wtforms.fields import HiddenField

    def is_hidden_field_filter(field):
        return isinstance(field, HiddenField)

    app.jinja_env.globals["bootstrap_is_hidden_field"] = is_hidden_field_filter

    # Setup an error-logger to send emails to app.config.ADMINS
    init_email_error_handler(app)

    # Setup Flask-User to handle user account related forms
    from labelbee.models import User, CustomUserManager
    from labelbee.views import user_profile_page

    user_manager = CustomUserManager(app, db, User)

    from labelbee.db_functions import injest_tags

    # injest_tags("data/tags.csv")

    # print(app.logger)


def init_email_error_handler(app):
    """
    Initialize a logger to send emails on error-level messages.
    Unhandled exceptions will now send an email message to app.config.ADMINS.
    """
    if app.debug:
        return  # Do not send error emails while developing

    # Retrieve email settings from app.config
    host = app.config["MAIL_SERVER"]
    port = app.config["MAIL_PORT"]
    from_addr = app.config["MAIL_DEFAULT_SENDER"]
    username = app.config["MAIL_USERNAME"]
    password = app.config["MAIL_PASSWORD"]
    secure = () if app.config.get("MAIL_USE_TLS") else None

    # Retrieve app settings from app.config
    to_addr_list = app.config["ADMINS"]
    subject = app.config.get("APP_SYSTEM_ERROR_SUBJECT_LINE", "System Error")

    # Setup an SMTP mail handler for error-level messages
    import logging
    from logging.handlers import SMTPHandler

    mail_handler = SMTPHandler(
        mailhost=(host, port),  # Mail host and port
        fromaddr=from_addr,  # From address
        toaddrs=to_addr_list,  # To address
        subject=subject,  # Subject line
        credentials=(username, password),  # Credentials
        secure=secure,
    )
    mail_handler.setLevel(logging.ERROR)
    app.logger.addHandler(mail_handler)

    # Log errors using: app.logger.error('Some error message')
