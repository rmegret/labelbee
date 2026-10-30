import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

# *****************************
# Environment specific settings
# *****************************

# DO NOT use "DEBUG = True" in production environments
DEBUG = True

# Read SECRET_KEY from .env, fallback to default if not set
SECRET_KEY = os.getenv("SECRET_KEY", "This is an UNSECURE Secret. CHANGE THIS for production environments.")

# SQLAlchemy settings using MYSQL_* environment variables for PostgreSQL connection
db_user = os.getenv("MYSQL_USER")
db_pass = os.getenv("MYSQL_PASSWORD")
db_host = os.getenv("MYSQL_HOST", "localhost")
db_port = os.getenv("MYSQL_PORT", "5432")
db_name = os.getenv("MYSQL_DATABASE")

SQLALCHEMY_DATABASE_URI = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

# Flask-Mail settings
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_SSL = False
MAIL_USE_TLS = True
MAIL_USERNAME = 'ivan.rodriguez5@upr.edu'
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "my-password")
MAIL_DEFAULT_SENDER = '"Soy yo" <ivan.rodriguez5@upr.edu>'

ADMINS = [
    '"Admin One" <ivan.rodriguez5@upr.edu>',
]
