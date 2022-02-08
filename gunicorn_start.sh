#!/bin/bash

export SECRET_KEY=XXUu3fPg33ctsLX-JSyx0w
export DB_URL=136.145.54.43/videos
export DB_PASSWORD=9gji1=Y.6?4vJy
export DB_USER=labelbeeflask

source /var/www/flasktest/labelbee/bin/env/activate

cd /var/www/flasktest/labelbee/

gunicorn -p labelbee.pid -b 127.0.0.1:8090 manage:app -w 1 --threads 12 --timeout 300 --log-file /var/www/flasktest/labelbee/gunicorn_error_logs.log --daemon