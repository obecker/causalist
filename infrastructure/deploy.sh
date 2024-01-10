#!/usr/bin/env zsh

environment=$1
if [[ "$environment" != "prod" && "$environment" != "stage" ]]
then
  echo "Unsupported environment $environment"
  echo "Usage: $0 [prod|stage]"
  exit 1
fi

terraformApply() {
  setopt local_traps local_options
  trap : INT
  terraform apply --var-file="$1".tfvars
}

workspace=$(terraform workspace show)

echo "Deploying $environment ..."
terraform workspace select "$environment"
terraformApply "$environment"
terraform workspace select "$workspace"
