#!/usr/bin/env bash
aws dynamodb create-table --table-name Cases \
    --attribute-definitions AttributeName=ownerId,AttributeType=S AttributeName=id,AttributeType=S AttributeName=ref,AttributeType=S AttributeName=settledOn,AttributeType=S \
    --key-schema AttributeName=ownerId,KeyType=HASH AttributeName=id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --local-secondary-indexes "[{\"IndexName\": \"ActiveIndex\", \"KeySchema\": [{\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"ref\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}, {\"IndexName\": \"SettledIndex\", \"KeySchema\": [{\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"settledOn\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}]" \
    --endpoint-url http://localhost:8000
