import os
import sys

# *****************************
# Environment specific settings
# *****************************
from dotenv import load_dotenv

load_dotenv()

WTF_CSRF_TIME_LIMIT = None
DEBUG = os.environ["DEBUG"]

# Flask-Mail settings (use local server)
SECRET_KEY = os.environ[
        "SECRET_KEY"
    ] 
SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://root:password@localhost:3306/labelbee-db"
MAIL_SERVER = "localhost"
MAIL_PORT = 25
MAIL_USE_SSL = False
MAIL_USE_TLS = False
MAIL_USERNAME = None
MAIL_PASSWORD = None
MAIL_DEFAULT_SENDER = None

ADMINS = [
    '"Admin" <remi.megret@upr.edu>',
]
