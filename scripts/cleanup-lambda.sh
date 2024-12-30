#!/usr/bin/env bash
# terraform doesn't delete old function versions automatically, see https://github.com/hashicorp/terraform-provider-aws/issues/17668
# this docker image will do the cleanup, see https://github.com/karl-cardenas-coding/go-lambda-cleanup
docker run --rm -e AWS_ACCESS_KEY_ID="$(aws configure get aws_access_key_id)" -e AWS_SECRET_ACCESS_KEY="$(aws configure get aws_secret_access_key)" ghcr.io/karl-cardenas-coding/go-lambda-cleanup:v2.0.16 clean -r "$(aws configure get region)"
