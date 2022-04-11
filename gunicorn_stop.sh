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
# source env_config.sh

checkEnvVariable LABELBEE_LOGDIR

GUNICORN_PIDFILE="$LABELBEE_LOGDIR"/labelbee.pid

PID=$(<"$GUNICORN_PIDFILE")

echo "Killing PID=$PID, from $GUNICORN_PIDFILE"

kill $PID

