#!/usr/bin/env bash

# Initial creation of the required tables in a locally running DynamoDB

aws dynamodb create-table --table-name Users \
    --attribute-definitions AttributeName=id,AttributeType=S AttributeName=username,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes "[{\"IndexName\":\"UsernameIndex\",\"KeySchema\":[{\"AttributeName\":\"username\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --output table \
    --endpoint-url http://localhost:8000

aws dynamodb create-table --table-name Cases \
    --attribute-definitions AttributeName=ownerId,AttributeType=S AttributeName=id,AttributeType=S AttributeName=ref,AttributeType=S AttributeName=settledOn,AttributeType=S \
    --key-schema AttributeName=ownerId,KeyType=HASH AttributeName=id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --local-secondary-indexes "[{\"IndexName\": \"ActiveIndex\", \"KeySchema\": [{\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"ref\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}, {\"IndexName\": \"SettledIndex\", \"KeySchema\": [{\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"settledOn\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}]" \
    --output table \
    --endpoint-url http://localhost:8000

aws dynamodb create-table --table-name CaseDocuments \
    --attribute-definitions AttributeName=ownerId,AttributeType=S AttributeName=id,AttributeType=S AttributeName=ref,AttributeType=S \
    --key-schema AttributeName=ownerId,KeyType=HASH AttributeName=id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --local-secondary-indexes "[{\"IndexName\": \"ReferenceIndex\", \"KeySchema\": [{\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"ref\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}]" \
    --output table \
    --endpoint-url http://localhost:8000
