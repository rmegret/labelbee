# This file starts the WSGI web application.
# - Heroku starts gunicorn, which loads Procfile, which starts manage.py
# - Developers can run it from the command line: python runserver.py

from labelbee.init_app import app, init_app, logger
from labelbee.manage_commands import init_db

import sys
import logging
import os
print("manage.py called with __name__==", __name__)

# Start a development web server, processing extra command line parameters. E.g.:
# - python manage.py init_db
# - python manage.py runserver
if __name__ == "__main__":
    init_app(app)
    # manager.run()

if __name__ == "manage":
    print("manage.py: __name__==manage")

    init_app(app)
    # manager.run()