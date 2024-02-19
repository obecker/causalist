#!/usr/bin/env bash

# Initial creation of the required bucket in a locally running S3

# MinIO requires real access keys, see docker-compose.yml
export AWS_ACCESS_KEY_ID=dummyAccessKey
export AWS_SECRET_ACCESS_KEY=dummyAccessSecret

aws s3api create-bucket --bucket case-documents \
    --create-bucket-configuration LocationConstraint="$(aws configure get region)" \
    --output table \
    --endpoint-url http://localhost:9000
