# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

#import logging
from datetime import datetime
from flask import Flask
from flask_mail import Mail
from flask_migrate import Migrate, MigrateCommand
from flask_script import Manager
from flask_sqlalchemy import SQLAlchemy
from flask_user import UserManager, SQLAlchemyAdapter
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__, static_url_path='')           # The WSGI compliant web application object
db = SQLAlchemy()               # Setup Flask-SQLAlchemy
manager = Manager(app)          # Setup Flask-Script

# Initialize Flask Application
def init_app(app, extra_config_settings={}):

    print('init_app: app=', app, '\nextra_config_settings=',extra_config_settings)

    # Read common settings from 'app/settings.py'
    app.config.from_object('labelbee.settings')

    # Read environment-specific settings from 'app/local_settings.py'
    try:
        app.config.from_object('labelbee.local_settings')
    except ImportError:
        print("The configuration file 'labelbee/local_settings.py' does not exist.\n"+
              "Please copy labelbee/local_settings_example.py to labelbee/local_settings.py\n"+
              "and customize its settings before you continue.")
        exit()

    # Add/overwrite extra settings from parameter 'extra_config_settings'
    app.config.update(extra_config_settings)
    if app.testing:
        app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF checks while testing

    # Initialize Flask-SQLAlchemy and Flask-Script _after_ app.config has been read
    db.init_app(app)

    # Setup Flask-Migrate
    migrate = Migrate(app, db)
    manager.add_command('db', MigrateCommand)

    # Setup Flask-Mail
    mail = Mail(app)

    # Setup WTForms CsrfProtect
    CSRFProtect(app)

    # Define bootstrap_is_hidden_field for flask-bootstrap's bootstrap_wtf.html
    from wtforms.fields import HiddenField

    def is_hidden_field_filter(field):
        return isinstance(field, HiddenField)

    app.jinja_env.globals['bootstrap_is_hidden_field'] = is_hidden_field_filter

    # Setup an error-logger to send emails to app.config.ADMINS
    init_email_error_handler(app)

    # Setup Flask-User to handle user account related forms
    from labelbee.models import User, MyRegisterForm
    from labelbee.views import user_profile_page

    try:
        db_adapter = SQLAlchemyAdapter(db, User)  # Setup the SQLAlchemy DB Adapter
    except Exception as e:
        raise Exception('ERROR connecting to the User database') from e
    user_manager = UserManager(db_adapter, app,  # Init Flask-User and bind to app
                               register_form=MyRegisterForm,  # using a custom register form with UserProfile fields
                               user_profile_view_function=user_profile_page,
    )

    import labelbee.manage_commands
    
    #print(app.logger)


def init_email_error_handler(app):
    """
    Initialize a logger to send emails on error-level messages.
    Unhandled exceptions will now send an email message to app.config.ADMINS.
    """
    if app.debug: return  # Do not send error emails while developing

    # Retrieve email settings from app.config
    host = app.config['MAIL_SERVER']
    port = app.config['MAIL_PORT']
    from_addr = app.config['MAIL_DEFAULT_SENDER']
    username = app.config['MAIL_USERNAME']
    password = app.config['MAIL_PASSWORD']
    secure = () if app.config.get('MAIL_USE_TLS') else None

    # Retrieve app settings from app.config
    to_addr_list = app.config['ADMINS']
    subject = app.config.get('APP_SYSTEM_ERROR_SUBJECT_LINE', 'System Error')

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





