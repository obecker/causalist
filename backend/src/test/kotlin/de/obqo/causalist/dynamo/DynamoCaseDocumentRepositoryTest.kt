package de.obqo.causalist.dynamo

import de.obqo.causalist.CaseDocument
import de.obqo.causalist.mutableReference
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.sequences.shouldBeEmpty
import io.kotest.matchers.sequences.shouldContainExactly
import io.kotest.matchers.shouldBe
import org.http4k.connect.amazon.dynamodb.FakeDynamoDb
import org.http4k.connect.amazon.dynamodb.model.TableName
import java.util.UUID

class DynamoCaseDocumentRepositoryTest : DescribeSpec({

    describe("DynamoCaseDocumentRepository") {
        val repo = dynamoCaseDocumentRepository(
            dynamoDb = FakeDynamoDb().client(),
            TableName.of("CaseDocument"),
            createTable = true
        )

        afterEach {
            repo.deleteAll()
        }

        it("should save and get case documents") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val mutableRef = mutableReference()
            val refId1 = mutableRef.next().toId()
            val refId2 = mutableRef.next().toId()
            val refId3 = mutableRef.next().toId()
            val documentId1 = UUID.randomUUID()
            val documentId2 = UUID.randomUUID()
            val documentId3 = UUID.randomUUID()
            val documentId4 = UUID.randomUUID()

            val caseDocument111 = CaseDocument(ownerId1, documentId1, refId1, "filename1.doc")
            val caseDocument112 = CaseDocument(ownerId1, documentId2, refId1, "filename2.doc")
            val caseDocument12 = CaseDocument(ownerId1, documentId3, refId2, "filename3.doc")
            val caseDocument23 = CaseDocument(ownerId2, documentId4, refId3, "filename4.doc")

            // when
            repo.save(caseDocument111, caseDocument112, caseDocument12, caseDocument23)

            // then
            repo.get(ownerId1, documentId1) shouldBe caseDocument111
            repo.get(ownerId1, documentId2) shouldBe caseDocument112
            repo.get(ownerId1, documentId3) shouldBe caseDocument12
            repo.get(ownerId1, documentId4) shouldBe null
            repo.get(ownerId2, documentId1) shouldBe null
            repo.get(ownerId2, documentId2) shouldBe null
            repo.get(ownerId2, documentId3) shouldBe null
            repo.get(ownerId2, documentId4) shouldBe caseDocument23

            repo.getForCase(ownerId1, refId1).shouldContainExactly(caseDocument111, caseDocument112)
            repo.getForCase(ownerId1, refId2).shouldContainExactly(caseDocument12)
            repo.getForCase(ownerId1, refId3).shouldBeEmpty()
            repo.getForCase(ownerId2, refId1).shouldBeEmpty()
            repo.getForCase(ownerId2, refId2).shouldBeEmpty()
            repo.getForCase(ownerId2, refId3).shouldContainExactly(caseDocument23)

            repo.hasDocuments(ownerId1, refId1) shouldBe true
            repo.hasDocuments(ownerId1, refId2) shouldBe true
            repo.hasDocuments(ownerId1, refId3) shouldBe false
            repo.hasDocuments(ownerId2, refId1) shouldBe false
            repo.hasDocuments(ownerId2, refId2) shouldBe false
            repo.hasDocuments(ownerId2, refId3) shouldBe true
        }
    }
})
