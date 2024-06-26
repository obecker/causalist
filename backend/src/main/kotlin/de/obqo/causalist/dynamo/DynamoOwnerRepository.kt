package de.obqo.causalist.dynamo

import de.obqo.causalist.User
import de.obqo.causalist.UserRepository
import org.http4k.connect.amazon.dynamodb.DynamoDb
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapper
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapperSchema
import org.http4k.connect.amazon.dynamodb.model.Attribute
import org.http4k.connect.amazon.dynamodb.model.IndexName
import org.http4k.connect.amazon.dynamodb.model.Item
import org.http4k.connect.amazon.dynamodb.model.TableName
import org.http4k.connect.amazon.dynamodb.model.with
import org.http4k.lens.BiDiLens
import java.util.UUID

private val idAttr = Attribute.uuid().required("id")
private val usernameAttr = Attribute.string().required("username")
private val passwordAttr = Attribute.string().required("password")
private val encryptedSecretAttr = Attribute.string().required("encryptedSecret")
private val lastLoginAttr = Attribute.instant().optional("lastLogin")

private val userLens = BiDiLens<Item, User>(
    dynamoLensMeta("dynamoUserRepository", "user"),
    { item ->
        User(idAttr(item), usernameAttr(item), passwordAttr(item), encryptedSecretAttr(item), lastLoginAttr(item))
    },
    { user, item ->
        item.with(
            idAttr of user.id,
            usernameAttr of user.username,
            passwordAttr of user.password,
            encryptedSecretAttr of user.encryptedSecret,
            lastLoginAttr of user.lastLogin
        )
    }
)

fun dynamoUserRepository(dynamoDb: DynamoDb, tableName: TableName, createTable: Boolean = false): UserRepository {
    val table = DynamoDbTableMapper<User, UUID, Unit>(
        dynamoDb = dynamoDb,
        tableName = tableName,
        primarySchema = DynamoDbTableMapperSchema.Primary(
            hashKeyAttribute = idAttr,
            lens = userLens
        )
    )
    val usernameIndex = DynamoDbTableMapperSchema.GlobalSecondary<User, String, Unit>(
        indexName = IndexName.of("UsernameIndex"),
        hashKeyAttribute = usernameAttr,
        lens = userLens
    )

    if (createTable) {
        table.createTable(usernameIndex)
    }

    return object : UserRepository, DynamoCrudRepository<User, UUID, Unit>(table) {
        override fun findByUsername(username: String) = table.index(usernameIndex).query(username).firstOrNull()
    }
}
