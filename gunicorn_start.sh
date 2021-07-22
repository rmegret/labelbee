#!/bin/bash

source /home/dsuazo/flasktest/labelbee/env/bin/activate

cd /home/dsuazo/flasktest/labelbee/labelbee

gunicorn -b 127.0.0.1:8090 manage:app --log-file /home/dsuazo/flasktest/labelbee/gunicorn_error_logs.log #--daemon

