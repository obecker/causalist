package de.obqo.causalist

import dev.forkhandles.result4k.onFailure
import org.http4k.connect.amazon.s3.S3Bucket
import org.http4k.connect.amazon.s3.copyObject
import org.http4k.connect.amazon.s3.deleteObject
import org.http4k.connect.amazon.s3.getObject
import org.http4k.connect.amazon.s3.model.BucketKey
import org.http4k.connect.amazon.s3.putObject
import java.io.InputStream
import java.util.UUID

data class CaseDocument(
    val ownerId: UUID,
    val id: UUID = UUID.randomUUID(),
    val refId: String,
    val filename: String
)

interface CaseDocumentRepository : CrudRepository<CaseDocument, UUID, UUID> {

    fun getForCase(ownerId: UUID, refId: String): Sequence<CaseDocument>
    fun getForCase(case: Case): Sequence<CaseDocument> = getForCase(case.ownerId, case.ref.toId())

    fun hasDocuments(ownerId: UUID, refId: String): Boolean
}

interface CaseDocumentService {
    fun upload(ownerId: UUID, refId: String, filename: String, stream: InputStream): CaseDocument

    fun getForCase(case: Case): Sequence<CaseDocument>
    fun getForCase(ownerId: UUID, refId: String): Sequence<CaseDocument>

    fun hasDocuments(ownerId: UUID, refId: String): Boolean

    fun delete(ownerId: UUID, id: UUID, refId: String)
    fun delete(vararg documents: CaseDocument)

    fun move(ownerId: UUID, fromRefId: String, toRefId: String)

    fun download(ownerId: UUID, id: UUID, refId: String): InputStream?
    fun download(document: CaseDocument): InputStream? = download(document.ownerId, document.id, document.refId)
}

fun caseDocumentService(
    repository: CaseDocumentRepository,
    s3Bucket: S3Bucket
): CaseDocumentService {

    fun CaseDocument.bucketKey() = BucketKey.of("$ownerId/$refId/$id")

    return object : CaseDocumentService {
        override fun upload(ownerId: UUID, refId: String, filename: String, stream: InputStream): CaseDocument {
            val document = repository.save(CaseDocument(ownerId = ownerId, refId = refId, filename = filename))
            s3Bucket.putObject(document.bucketKey(), stream).onFailure {
                repository.delete(document)
                it.reason.throwIt()
            }
            return document
        }

        override fun getForCase(case: Case) = repository.getForCase(case)
        override fun getForCase(ownerId: UUID, refId: String) = repository.getForCase(ownerId, refId)

        override fun hasDocuments(ownerId: UUID, refId: String) = repository.hasDocuments(ownerId, refId)

        override fun delete(ownerId: UUID, id: UUID, refId: String) {
            repository.get(ownerId, id)
                ?.takeIf { document -> document.refId == refId }
                ?.let { document -> delete(document) }
        }

        override fun delete(vararg documents: CaseDocument) {
            documents.forEach { document ->
                s3Bucket.deleteObject(document.bucketKey()).onFailure { it.reason.throwIt() }
                repository.delete(document)
            }
        }

        override fun move(ownerId: UUID, fromRefId: String, toRefId: String) {
            repository.getForCase(ownerId, fromRefId).forEach { document ->
                val movedDocument = document.copy(refId = toRefId)
                s3Bucket.moveObject(document.bucketKey(), movedDocument.bucketKey()) {
                    repository.save(movedDocument)
                }
            }
        }

        override fun download(ownerId: UUID, id: UUID, refId: String): InputStream? =
            repository.get(ownerId, id)
                ?.takeIf { document -> document.refId == refId }
                ?.let { document -> s3Bucket.getObject(document.bucketKey()).onFailure { it.reason.throwIt() } }
    }
}

private fun S3Bucket.moveObject(fromKey: BucketKey, toKey: BucketKey, afterCopy: () -> Unit = {}) {
    copyObject(bucketName, fromKey, toKey).onFailure { it.reason.throwIt() }
    afterCopy()
    deleteObject(fromKey).onFailure { it.reason.throwIt() }
}
