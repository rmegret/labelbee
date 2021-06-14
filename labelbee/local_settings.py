import os

# *****************************
# Environment specific settings
# *****************************

# DO NOT use "DEBUG = True" in production environments
DEBUG = True

# DO NOT use Unsecure Secrets in production environments
# Generate a safe one with:
#     python -c "import os; print repr(os.urandom(24));"
SECRET_KEY = "This is an UNSECURE Secret. CHANGE THIS for production environments."

WTF_CSRF_TIME_LIMIT = None

# SQLAlchemy settings
SQLALCHEMY_DATABASE_URI = "sqlite:///private/app.sqlite"

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
