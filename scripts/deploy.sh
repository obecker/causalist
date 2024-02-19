#!/usr/bin/env zsh

# Perform an AWS deployment using terraform

environment=$1
if [[ "$environment" != "prod" && "$environment" != "stage" ]]
then
  echo "Unsupported environment $environment"
  echo "Usage: $0 [prod|stage]"
  exit 1
fi

chdir=$(dirname "$0")/../infrastructure
alias tf='terraform -chdir="$chdir"'

tfApply() {
  setopt local_traps local_options
  trap : INT
  tf apply --var-file="$1".tfvars
}

workspace=$(terraform workspace show)

echo "Deploying $environment ..."
tf workspace select "$environment"
tfApply "$environment"
tf workspace select "$workspace"
