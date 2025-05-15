#!/bin/bash

# silent prompt
read -p 'GIT profile: ' profile

# switch
case $profile in
  remi)
    git config user.email "remi.megret@upr.edu"
    git config user.name "Remi Megret" 
    git config user.signingKey "id_rsa_github_remi"
    ;;
  andres)
    git config user.email "andres.ramos7@upr.edu"
    git config user.name "Andres Ramos" 
    git config user.signingKey "id_rsa_github_andres"
    ;;
  # default case: raise error
  *)
    >&2 echo "ERR: Unknown profile: $profile"
    exit 1
esac

