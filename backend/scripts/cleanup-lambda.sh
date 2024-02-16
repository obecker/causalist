#!/usr/bin/env bash
# see https://github.com/karl-cardenas-coding/go-lambda-cleanup
docker run -e AWS_ACCESS_KEY_ID="$(aws configure get aws_access_key_id)" -e AWS_SECRET_ACCESS_KEY="$(aws configure get aws_secret_access_key)" ghcr.io/karl-cardenas-coding/go-lambda-cleanup:2.0.12 clean -r "$(aws configure get region)"
