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

source .env
# Define all vars in a script and source it
# source gunicorn_config.sh

#checkEnvVariable LABELBEE_LOGDIR

GUNICORN_PIDFILE="$LABELBEE_LOGDIR"/labelbee.pid
GUNICORN_LOG="$LABELBEE_LOGDIR"/gunicorn_error_logs.log

PID=$(<"$GUNICORN_PIDFILE")
echo "### $GUNICORN_PIDFILE => PID=$PID"

#echo "### PS:"
#pstree -alc $PID
# if pstree not installed: sudo dnf install psmisc

echo "### tail $GUNICORN_LOG"
tail "$GUNICORN_LOG"

