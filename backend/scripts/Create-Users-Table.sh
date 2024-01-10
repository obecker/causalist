#!/usr/bin/env bash
aws dynamodb create-table --table-name Users \
    --attribute-definitions AttributeName=id,AttributeType=S AttributeName=username,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes "[{\"IndexName\":\"UsernameIndex\",\"KeySchema\":[{\"AttributeName\":\"username\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --endpoint-url http://localhost:8000
