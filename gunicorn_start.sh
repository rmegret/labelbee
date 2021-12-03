#!/bin/bash

source /home/dsuazo/flasktest/labelbee/env/bin/activate

cd /home/dsuazo/flasktest/labelbee

gunicorn -p labelbee.pid -b 127.0.0.1:8090 manage:app -w 1 --threads 12 --timeout 300 --log-file /home/dsuazo/flasktest/labelbee/gunicorn_error_logs.log --daemon

