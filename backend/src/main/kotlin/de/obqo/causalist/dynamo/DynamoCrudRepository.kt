package de.obqo.causalist.dynamo

import de.obqo.causalist.CrudRepository
import org.http4k.connect.amazon.dynamodb.mapper.DynamoDbTableMapper
import org.http4k.connect.amazon.dynamodb.mapper.plusAssign

abstract class DynamoCrudRepository<Document : Any, HashKey : Any, SortKey : Any>(
    private val table: DynamoDbTableMapper<Document, HashKey, SortKey>
) : CrudRepository<Document, HashKey, SortKey> {
    override fun save(document: Document) = document.also {
        table += document
    }

    override fun save(documents: Collection<Document>): Collection<Document> = documents.also {
        table += documents
    }

    override fun get(id: HashKey, sortKey: SortKey?) = table[id, sortKey]

    override fun findAll() = table.primaryIndex().scan()

    override fun delete(document: Document) = table.delete(document)

    override fun delete(hashKey: HashKey, sortKey: SortKey?) = table.delete(hashKey, sortKey)

    override fun deleteAll() {
        val batchPutLimit = 25 // as defined by DynamoDB
        findAll().chunked(batchPutLimit).forEach { table.batchDelete(it) }
    }
}
