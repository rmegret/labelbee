#!/bin/bash

# From https://stackoverflow.com/a/60652702
checkEnvVariable() {
  local env_var=
  env_var=$(declare -p "$1")
  if !  [[ -v $1 && $env_var =~ ^declare\ -x ]]; then
    echo "Error: Environment variable '$1' is not defined"
    exit 1
  fi
}

# Define all vars in a script and source it
# source gunicorn_config.sh

source .env

#checkEnvVariable LABELBEE_PORT
#checkEnvVariable LABELBEE_APPDIR
#checkEnvVariable LABELBEE_LOGDIR

GUNICORN_PIDFILE="$LABELBEE_LOGDIR"/labelbee.pid
GUNICORN_LOG="$LABELBEE_LOGDIR"/gunicorn_error_logs.log

# Setup CONDA, then activate labelbee env

source venv/bin/activate
# May be a good idea to check https://docs.gunicorn.org/en/latest/configure.html

gunicorn -p "$GUNICORN_PIDFILE" -b 127.0.0.1:$LABELBEE_PORT --chdir "$LABELBEE_APPDIR" appserver:gunicorn_app --log-file "$GUNICORN_LOG" -w 1 --threads 12 --timeout 300 --daemon
