package de.obqo.causalist

import de.obqo.causalist.dynamo.dynamoCaseRepository
import de.obqo.causalist.dynamo.dynamoUserRepository
import org.http4k.connect.amazon.dynamodb.FakeDynamoDb
import org.http4k.connect.amazon.dynamodb.model.TableName

val fakeUserRepository = dynamoUserRepository(
    dynamoDb = FakeDynamoDb().client(),
    TableName.of("Users"),
    createTable = true
)

val fakeCaseRepository = dynamoCaseRepository(
    dynamoDb = FakeDynamoDb().client(),
    TableName.of("Cases"),
    createTable = true
)
