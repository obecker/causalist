package de.obqo.causalist.dynamo

import de.obqo.causalist.CaseDocument
import de.obqo.causalist.CaseDocumentRepository
import org.http4k.connect.amazon.dynamodb.DynamoDb
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapper
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapperSchema
import org.http4k.connect.amazon.dynamodb.mapper.count
import org.http4k.connect.amazon.dynamodb.mapper.query
import org.http4k.connect.amazon.dynamodb.model.Attribute
import org.http4k.connect.amazon.dynamodb.model.IndexName
import org.http4k.connect.amazon.dynamodb.model.Item
import org.http4k.connect.amazon.dynamodb.model.TableName
import org.http4k.connect.amazon.dynamodb.model.with
import org.http4k.lens.BiDiLens
import org.http4k.lens.Meta
import org.http4k.lens.ParamMeta
import java.util.UUID

private val ownerAttr = Attribute.uuid().required("ownerId")
private val idAttr = Attribute.uuid().required("id")
private val refAttr = Attribute.string().required("ref")
private val filenameAttr = Attribute.string().required("filename")

private val caseDocumentLens = BiDiLens<Item, CaseDocument>(
    Meta(true, "dynamoCaseDocumentRepository", ParamMeta.ObjectParam, "caseDocument"),
    { item ->
        CaseDocument(
            ownerAttr(item),
            idAttr(item),
            refAttr(item),
            filenameAttr(item)
        )
    },
    { caseDocument, item ->
        item.with(
            ownerAttr of caseDocument.ownerId,
            idAttr of caseDocument.id,
            refAttr of caseDocument.refId,
            filenameAttr of caseDocument.filename
        )
    }
)

fun dynamoCaseDocumentRepository(
    dynamoDb: DynamoDb,
    tableName: TableName,
    createTable: Boolean = false
): CaseDocumentRepository {

    val table = DynamoDbTableMapper<CaseDocument, UUID, UUID>(
        dynamoDb = dynamoDb,
        tableName = tableName,
        itemLens = caseDocumentLens,
        primarySchema = DynamoDbTableMapperSchema.Primary(ownerAttr, idAttr)
    )

    val refIndex = DynamoDbTableMapperSchema.LocalSecondary<UUID, String>(
        indexName = IndexName.of("ReferenceIndex"),
        hashKeyAttribute = ownerAttr,
        sortKeyAttribute = refAttr
    )

    if (createTable) {
        table.createTable(refIndex)
    }

    return object : CaseDocumentRepository, DynamoCrudRepository<CaseDocument, UUID, UUID>(table) {
        override fun getForCase(ownerId: UUID, refId: String) =
            table.index(refIndex).query {
                keyCondition {
                    (hashKey eq ownerId) and (sortKey eq refId)
                }
            }

        override fun hasDocuments(ownerId: UUID, refId: String) =
            table.index(refIndex).count {
                keyCondition {
                    (hashKey eq ownerId) and (sortKey eq refId)
                }
            } > 0
    }
}
