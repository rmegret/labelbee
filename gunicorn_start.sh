#!/bin/bash

source /var/www/flask/env/flask/bin/activate

cd /var/www/flask/labelbee

gunicorn -b 127.0.0.1:8080 manage:app --log-file /var/www/flask/gunicorn_error_logs.log --daemon

