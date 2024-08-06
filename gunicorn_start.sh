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

checkEnvVariable SECRET_KEY
checkEnvVariable DB_URL
checkEnvVariable DB_PASSWORD
checkEnvVariable DB_USER

checkEnvVariable LABELBEE_PORT
checkEnvVariable LABELBEE_APPDIR
checkEnvVariable LABELBEE_LOGDIR

checkEnvVariable CONDA_EXE

GUNICORN_PIDFILE="$LABELBEE_LOGDIR"/labelbee.pid
GUNICORN_LOG="$LABELBEE_LOGDIR"/gunicorn_error_logs.log

# Setup CONDA, then activate labelbee env
#eval "$($CONDA_EXE shell.bash hook)"
#conda activate labelbee
source venv/bin/activate
# May be a good idea to check https://docs.gunicorn.org/en/latest/configure.html

gunicorn -p "$GUNICORN_PIDFILE" -b 127.0.0.1:$LABELBEE_PORT --chdir "$LABELBEE_APPDIR" manage:app -w 1 --threads 12 --timeout 300 --log-file "$GUNICORN_LOG" --daemon

