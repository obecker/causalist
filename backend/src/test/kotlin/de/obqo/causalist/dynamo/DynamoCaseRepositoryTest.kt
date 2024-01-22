package de.obqo.causalist.dynamo

import de.obqo.causalist.Status
import de.obqo.causalist.Type
import de.obqo.causalist.aCase
import de.obqo.causalist.mutableReference
import de.obqo.causalist.withOwnerId
import de.obqo.causalist.withRef
import de.obqo.causalist.withRefId
import de.obqo.causalist.withSettledOn
import de.obqo.causalist.withStatus
import de.obqo.causalist.withType
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.sequences.shouldBeEmpty
import io.kotest.matchers.sequences.shouldContainExactly
import io.kotest.matchers.shouldBe
import org.http4k.connect.amazon.dynamodb.FakeDynamoDb
import org.http4k.connect.amazon.dynamodb.model.TableName
import java.time.LocalDate
import java.util.UUID

class DynamoCaseRepositoryTest : DescribeSpec({

    describe("DynamoCaseRepository") {

        val repo = dynamoCaseRepository(
            dynamoDb = FakeDynamoDb().client(),
            TableName.of("Case"),
            createTable = true
        )

        afterEach {
            repo.deleteAll()
        }

        it("should save and get cases") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val reference = mutableReference()
            val case11 = aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.UNKNOWN)
            val case12 = aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SESSION)
            val case21 = aCase().withOwnerId(ownerId2).withRef(reference.next()).withStatus(Status.SETTLED)

            // when
            repo.save(case11, case12, case21)

            // then
            listOf(case11, case12, case21).forEach { case ->
                repo.get(case.ownerId, case.ref) shouldBe case
            }
            // owner and case mismatch
            repo.get(case11.ownerId, case21.ref) shouldBe null
        }

        it("should find active cases by ownerId in natural order") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val case11 = repo.save(aCase().withOwnerId(ownerId1).withRefId("00303O23-00124"))
            val case12 = repo.save(aCase().withOwnerId(ownerId1).withRefId("00303O23-00123"))
            val case13 = repo.save(aCase().withOwnerId(ownerId1).withRefId("00033O23-00444"))
            val case21 = repo.save(aCase().withOwnerId(ownerId2).withRefId("00303O23-00125"))
            // not active
            repo.save(aCase().withOwnerId(ownerId2).withRefId("00303O23-00126").withStatus(Status.SETTLED))

            // then
            repo.findByOwner(ownerId1).shouldContainExactly(case13, case12, case11)
            repo.findByOwner(ownerId2).shouldContainExactly(case21)
        }

        it("should find active cases by ownerId and type") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val reference = mutableReference()
            val case11 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.SINGLE))
            val case12 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.SINGLE))
            val case13 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.CHAMBER))
            val case2 = repo.save(aCase().withOwnerId(ownerId2).withRef(reference.next()).withType(Type.CHAMBER))
            // not active
            repo.save(
                aCase().withOwnerId(ownerId2).withRef(reference.next()).withType(Type.CHAMBER)
                    .withStatus(Status.SETTLED)
            )

            // then
            repo.findByOwner(ownerId1, type = Type.SINGLE).shouldContainExactly(case11, case12)
            repo.findByOwner(ownerId1, type = Type.CHAMBER).shouldContainExactly(case13)
            repo.findByOwner(ownerId2, type = Type.SINGLE).shouldBeEmpty()
            repo.findByOwner(ownerId2, type = Type.CHAMBER).shouldContainExactly(case2)
        }

        it("should find active cases by ownerId and status") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val reference = mutableReference()
            val case11 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()))
            val case12 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SESSION))
            val case13 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.WRITTEN_PRELIMINARY_PROCEDURE)
            )
            val case14 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.DECISION))
            val case15 =
                repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.LEGAL_AID))
            val case16 = repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SESSION))
            repo.save(aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)) // not active
            val case2 = repo.save(aCase().withOwnerId(ownerId2).withRef(reference.next()).withStatus(Status.SESSION))

            // then
            repo.findByOwner(ownerId1, status = listOf(Status.SESSION)).shouldContainExactly(case12, case16)
            repo.findByOwner(
                ownerId1,
                status = listOf(Status.DECISION, Status.UNKNOWN, Status.LEGAL_AID, Status.APPRAISERS_REPORT)
            ).shouldContainExactly(case11, case14, case15)
            repo.findByOwner(
                ownerId1,
                status = listOf(Status.WRITTEN_PRELIMINARY_PROCEDURE, Status.ADVANCE_PAYMENT_PENDING)
            ).shouldContainExactly(case13)
            repo.findByOwner(ownerId2, status = listOf(Status.SESSION)).shouldContainExactly(case2)
            repo.findByOwner(ownerId2, status = listOf(Status.DECISION)).shouldBeEmpty()
            repo.findByOwner(ownerId1, status = listOf(Status.SETTLED))
                .shouldBeEmpty() // not active, therefore not found
        }

        it("should find active cases by ownerId, type, and status") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val reference = mutableReference()
            val case11 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.SINGLE).withStatus(Status.SESSION)
            )
            val case12 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.SINGLE)
                    .withStatus(Status.DECISION)
            )
            val case13 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.CHAMBER)
                    .withStatus(Status.DECISION)
            )
            val case14 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withType(Type.CHAMBER)
                    .withStatus(Status.ADVANCE_PAYMENT_PENDING)
            )

            // then
            repo.findByOwner(ownerId1, Type.SINGLE, listOf(Status.SESSION)).shouldContainExactly(case11)
            repo.findByOwner(ownerId1, Type.SINGLE, listOf(Status.DECISION)).shouldContainExactly(case12)
            repo.findByOwner(ownerId1, Type.CHAMBER, listOf(Status.DECISION, Status.ADVANCE_PAYMENT_PENDING))
                .shouldContainExactly(case13, case14)
            repo.findByOwner(ownerId1, Type.SINGLE, listOf(Status.ADVANCE_PAYMENT_PENDING))
                .shouldBeEmpty()
            repo.findByOwner(ownerId2, Type.CHAMBER, listOf(Status.DECISION, Status.ADVANCE_PAYMENT_PENDING))
                .shouldBeEmpty()
        }

        it("should find settled cases by owner ordered by settledOn date") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val reference = mutableReference()
            repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.DECISION) // not settled
            )
            val case12 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 10, 1))
            )
            val case13 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 10, 2))
            )
            val case14 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 9, 27))
            )
            val case15 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 11, 11))
            )
            val case21 = repo.save(
                aCase().withOwnerId(ownerId2).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 11, 11))
            )
            repo.save(
                aCase().withOwnerId(ownerId2).withRef(reference.next()).withStatus(Status.SETTLED)
                // without settledOn date (shouldn't happen actually) -> will not be found
            )

            // then
            repo.findByOwner(ownerId1, settled = true).shouldContainExactly(case15, case13, case12, case14)
            repo.findByOwner(ownerId2, settled = true).shouldContainExactly(case21)
        }

        it("should find settled cases by owner and type") {
            // given
            val ownerId1 = UUID.randomUUID()
            val ownerId2 = UUID.randomUUID()
            val reference = mutableReference()
            repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.DECISION) // not settled
                    .withType(Type.SINGLE)
            )
            val case12 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 10, 1))
                    .withType(Type.SINGLE)
            )
            val case13 = repo.save(
                aCase().withOwnerId(ownerId1).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 10, 2))
                    .withType(Type.CHAMBER)
            )
            val case2 = repo.save(
                aCase().withOwnerId(ownerId2).withRef(reference.next()).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 10, 3))
                    .withType(Type.CHAMBER)
            )

            // then
            repo.findByOwner(ownerId1, Type.SINGLE, settled = true).shouldContainExactly(case12)
            repo.findByOwner(ownerId1, Type.CHAMBER, settled = true).shouldContainExactly(case13)
            repo.findByOwner(ownerId2, Type.SINGLE, settled = true).shouldBeEmpty()
            repo.findByOwner(ownerId2, Type.CHAMBER, settled = true).shouldContainExactly(case2)
        }
    }
})
