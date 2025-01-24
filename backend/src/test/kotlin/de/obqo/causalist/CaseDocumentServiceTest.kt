package de.obqo.causalist

import dev.forkhandles.result4k.onFailure
import dev.forkhandles.result4k.valueOrNull
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import org.http4k.aws.AwsCredentials
import org.http4k.connect.amazon.core.model.Region
import org.http4k.connect.amazon.s3.FakeS3
import org.http4k.connect.amazon.s3.Http
import org.http4k.connect.amazon.s3.S3
import org.http4k.connect.amazon.s3.S3Bucket
import org.http4k.connect.amazon.s3.createBucket
import org.http4k.connect.amazon.s3.deleteObject
import org.http4k.connect.amazon.s3.listObjectsV2
import org.http4k.connect.amazon.s3.model.BucketName
import java.util.UUID

class CaseDocumentServiceTest : DescribeSpec({

    describe("CaseDocumentService") {
        val repository = fakeCaseDocumentRepository
        val region = Region.of("eu-central-1")
        val bucketName = BucketName.of("case-documents")
        val credentials = AwsCredentials("accessKey", "secretKey")
        val http = FakeS3()
        val s3 = S3.Http({ credentials }, http)
        val bucket = S3Bucket.Http(bucketName, region, { credentials }, http)

        s3.createBucket(bucketName, region).onFailure { it.reason.throwIt() }

        val caseDocumentService = caseDocumentService(repository, bucket)

        val ownerId = UUID.randomUUID()
        val refId = aReference().toId()

        afterEach {
            repository.deleteAll()
            bucket.listObjectsV2().valueOrNull()?.items?.forEach {
                bucket.deleteObject(it.Key)
            }
        }

       it("should create and delete documents") {
            // given
            val fileContent = "dummy"
            val document1 = caseDocumentService.upload(ownerId, refId, "foo.txt", fileContent.byteInputStream())
            val document2 = caseDocumentService.upload(ownerId, refId, "bar.txt", fileContent.byteInputStream())
            val document3 = caseDocumentService.upload(ownerId, refId, "baz.txt", fileContent.byteInputStream())

            val uri1 = caseDocumentService.download(document1)
            val uri3 = caseDocumentService.download(document3)
            uri1.shouldNotBeNull()
            uri3.shouldNotBeNull()

            // when
            caseDocumentService.delete(document1, document2)

            // then
            caseDocumentService.download(document1).shouldBeNull()
            caseDocumentService.download(document2).shouldBeNull()
            caseDocumentService.download(document3).shouldNotBeNull()

            // deleting documents again will not fail
            caseDocumentService.delete(document1, document2)
        }

        it("should create and download documents") {
            // given
            val fileContent = "dummy"
            val document = caseDocumentService.upload(ownerId, refId, "foo.txt", fileContent.byteInputStream())

            // when
            val download = caseDocumentService.download(document)

            // then
            download.shouldNotBeNull()
            String(download.readAllBytes()) shouldBe fileContent
        }

        it("should move documents") {
            // given
            val fileContent = "dummy"
            val ref = mutableReference()
            val refId1 = ref.next().toId()
            val refId2 = ref.next().toId()
            val document = caseDocumentService.upload(ownerId, refId1, "foo.txt", fileContent.byteInputStream())

            // when
            caseDocumentService.move(ownerId, refId1, refId2)

            // then
            caseDocumentService.hasDocuments(ownerId, refId1) shouldBe false
            caseDocumentService.download(ownerId, document.id, refId1).shouldBeNull()

            caseDocumentService.hasDocuments(ownerId, refId2) shouldBe true
            caseDocumentService.download(ownerId, document.id, refId2).shouldNotBeNull()
        }

        it("should return no stream for an unknown document") {
            // given
            val document = CaseDocument(ownerId = ownerId, refId = refId, filename = "foo.txt")

            // when
            val download = caseDocumentService.download(document)

            // then
            download.shouldBeNull()
        }
    }
})
