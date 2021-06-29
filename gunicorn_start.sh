#!/bin/bash

source /var/www/flasktest/env/bin/activate

cd /var/www/flasktest/labelbee

gunicorn -b 127.0.0.1:8090 manage:app --log-file /var/www/flask/gunicorn_error_logs.log --daemon

