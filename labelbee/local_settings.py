import os
import sys

# *****************************
# Environment specific settings
# *****************************

# DO NOT use "DEBUG = True" in production environments
try:
    DEBUG = os.environ["DEBUG"]
except KeyError:
    DEBUG = False

# DO NOT use Unsecure Secrets in production environments
# Generate a safe one with:
#     python -c "import os; print repr(os.urandom(24));"
try:
    SECRET_KEY = os.environ[
        "SECRET_KEY"
    ]  # "This is an UNSECURE Secret. CHANGE THIS for production environments."
except KeyError:
    sys.exit("Environment variable SECRET_KEY not set.")

WTF_CSRF_TIME_LIMIT = None

# SQLAlchemy settings
# SQLALCHEMY_DATABASE_URI = "sqlite:///private/app.sqlite"
try:
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}@{os.environ['DB_URL']}"
except KeyError:
    sys.exit("Environment variables DB_USER, DB_PASSWORD, and DB_URL Required")

# Flask-Mail settings (use local server)
MAIL_SERVER = "localhost"
MAIL_PORT = 25
MAIL_USE_SSL = False
MAIL_USE_TLS = False
MAIL_USERNAME = None
MAIL_PASSWORD = None
MAIL_DEFAULT_SENDER = None

ADMINS = [
    '"Admin One" <ivan.rodriguez5@upr.edu>',
    '"Admin Two" <danielsuazo9@gmail.com>',
]
