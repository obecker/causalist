package de.obqo.causalist.dynamo

import de.obqo.causalist.Case
import de.obqo.causalist.CaseRepository
import de.obqo.causalist.Reference
import de.obqo.causalist.Status
import de.obqo.causalist.Type
import org.http4k.connect.amazon.dynamodb.DynamoDb
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapper
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapperSchema
import org.http4k.connect.amazon.dynamodb.mapper.query
import org.http4k.connect.amazon.dynamodb.model.Attribute
import org.http4k.connect.amazon.dynamodb.model.IndexName
import org.http4k.connect.amazon.dynamodb.model.Item
import org.http4k.connect.amazon.dynamodb.model.TableName
import org.http4k.connect.amazon.dynamodb.model.asRequired
import org.http4k.connect.amazon.dynamodb.model.with
import org.http4k.lens.BiDiLens
import org.http4k.lens.Meta
import org.http4k.lens.ParamMeta
import java.time.LocalDate
import java.util.UUID

private val ownerAttr = Attribute.uuid().required("ownerId")
private val idAttr = Attribute.string().required("id")
private val refAttr = Attribute.string().optional("ref", ignoreNull = true)
private val typeAttr = Attribute.enum<Type>().required("type")
private val partiesAttr = Attribute.string().optional("parties", ignoreNull = true)
private val areaAttr = Attribute.string().optional("area", ignoreNull = true)
private val statusAttr = Attribute.enum<Status>().required("status")
private val statusNoteAttr = Attribute.string().optional("statusNote", ignoreNull = true)
private val memoAttr = Attribute.string().optional("memo", ignoreNull = true)
private val markerColorAttr = Attribute.string().optional("markerColor", ignoreNull = true)
private val receivedOnAttr = Attribute.localDate().required("receivedOn")
private val settledOnAttr = Attribute.localDate().optional("settledOn", ignoreNull = true)
private val dueDateAttr = Attribute.localDate().optional("dueDate", ignoreNull = true)
private val todoDateAttr = Attribute.localDate().optional("todoDate", ignoreNull = true)
private val hasDocumentsAttr = Attribute.boolean().defaulted("hasDocuments", false)
private val updatedAtAttr = Attribute.instant().required("updatedAt")

private fun Case.isActive() = status != Status.SETTLED

private val caseLens = BiDiLens<Item, Case>(
    Meta(true, "dynamoCaseRepository", ParamMeta.ObjectParam, "case"),
    { item ->
        Case(
            ownerId = ownerAttr(item),
            ref = Reference.parseId(idAttr(item)),
            type = typeAttr(item),
            parties = partiesAttr(item),
            area = areaAttr(item),
            status = statusAttr(item),
            statusNote = statusNoteAttr(item),
            memo = memoAttr(item),
            markerColor = markerColorAttr(item),
            receivedOn = receivedOnAttr(item),
            settledOn = settledOnAttr(item),
            dueDate = dueDateAttr(item),
            todoDate = todoDateAttr(item),
            hasDocuments = hasDocumentsAttr(item),
            updatedAt = updatedAtAttr(item)
        )
    },
    { case, item ->
        val id = case.ref.toId()
        item.with(
            ownerAttr of case.ownerId,
            idAttr of id,
            refAttr of if (case.isActive()) id else null, // ActiveIndex sort key
            typeAttr of case.type,
            partiesAttr of case.parties,
            areaAttr of case.area,
            statusAttr of case.status,
            statusNoteAttr of case.statusNote,
            memoAttr of case.memo,
            markerColorAttr of case.markerColor,
            receivedOnAttr of case.receivedOn,
            settledOnAttr of case.settledOn, // SettledIndex sort key
            dueDateAttr of case.dueDate,
            todoDateAttr of case.todoDate,
            hasDocumentsAttr of case.hasDocuments,
            updatedAtAttr of case.updatedAt
        )
    }
)

fun dynamoCaseRepository(dynamoDb: DynamoDb, tableName: TableName, createTable: Boolean = false): CaseRepository {
    val table = DynamoDbTableMapper<Case, UUID, String>(
        dynamoDb = dynamoDb,
        tableName = tableName,
        itemLens = caseLens,
        primarySchema = DynamoDbTableMapperSchema.Primary(ownerAttr, idAttr)
    )

    val activeIndex = DynamoDbTableMapperSchema.LocalSecondary<UUID, String>(
        indexName = IndexName.of("ActiveIndex"),
        hashKeyAttribute = ownerAttr,
        sortKeyAttribute = refAttr.asRequired()
    )
    val settledIndex = DynamoDbTableMapperSchema.LocalSecondary<UUID, LocalDate>(
        indexName = IndexName.of("SettledIndex"),
        hashKeyAttribute = ownerAttr,
        sortKeyAttribute = settledOnAttr.asRequired()
    )

    if (createTable) {
        table.createTable(activeIndex, settledIndex)
    }

    return object : CaseRepository, DynamoCrudRepository<Case, UUID, String>(table) {
        override fun findByOwner(ownerId: UUID, type: Type?, status: List<Status>, settled: Boolean) =
            if (settled) {
                table.index(settledIndex).query(ScanIndexForward = false, ConsistentRead = true) {
                    keyCondition {
                        hashKey eq ownerId
                    }
                    filterExpression {
                        type?.let { typeAttr eq it }
                    }
                }
            } else {
                table.index(activeIndex).query(ConsistentRead = true) {
                    keyCondition {
                        hashKey eq ownerId
                    }
                    filterExpression {
                        val typeExpr = type?.let { typeAttr eq it }
                        val statusExpr = status.ifEmpty { null }?.let { statusAttr isIn it }

                        typeExpr and statusExpr
                    }
                }
            }
    }
}
