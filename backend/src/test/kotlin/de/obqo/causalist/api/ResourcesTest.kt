package de.obqo.causalist.api

import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.CryptoUtils.generatePasswordAesKey
import de.obqo.causalist.Reference
import de.obqo.causalist.Status
import de.obqo.causalist.Type
import de.obqo.causalist.aCase
import de.obqo.causalist.withArea
import de.obqo.causalist.withDueDate
import de.obqo.causalist.withHasDocuments
import de.obqo.causalist.withMarkerColor
import de.obqo.causalist.withMemo
import de.obqo.causalist.withParties
import de.obqo.causalist.withReceivedOn
import de.obqo.causalist.withRefValue
import de.obqo.causalist.withStatus
import de.obqo.causalist.withStatusNote
import de.obqo.causalist.withTodoDate
import de.obqo.causalist.withType
import de.obqo.causalist.withUpdatedAt
import io.kotest.core.spec.style.DescribeSpec
import java.time.Instant
import java.time.LocalDate

class ResourcesTest : DescribeSpec({

    describe("ReferenceResource") {
        it("should be converted to Resource and serialized as JSON") {
            // given
            val ref = Reference.parseValue("123 O 234/24")

            // when
            val resource = ref.toResource()

            // then
            resource.shouldEqualJson(
                """
                {
                  "entity": 123,
                  "register": "O",
                  "number": 234,
                  "year": 24,
                  "value": "123 O 234/24"
                }
                """
            )
        }
    }

    describe("CaseResource") {
        it("should be converted to Resource and serialized as JSON") {
            // given
            val key = generatePasswordAesKey("password", "salt")
            val case = aCase().withRefValue("123 O 234/24").withType(Type.CHAMBER).withStatus(Status.SESSION)
                .withParties("two parties".encrypt(key))
                .withArea("an area".encrypt(key))
                .withStatusNote("a note".encrypt(key))
                .withMemo("a memo".encrypt(key))
                .withMarkerColor("blue")
                .withReceivedOn(LocalDate.of(2023, 12, 10))
                .withDueDate(LocalDate.of(2024, 2, 5))
                .withTodoDate(LocalDate.of(2024, 1, 29))
                .withHasDocuments(true)
                .withUpdatedAt(Instant.parse("2024-01-18T13:08:39.123Z"))

            // when
            val resource = case.toResource(key)

            // then
            resource.shouldEqualJson(
                """
                {
                    "id": "00123O24-00234",
                    "ref": {
                        "entity": 123,
                        "register": "O",
                        "number": 234,
                        "year": 24,
                        "value": "123 O 234/24"
                    },
                    "type": "CHAMBER",
                    "parties": "two parties",
                    "area": "an area",
                    "status": "SESSION",
                    "statusNote": "a note",
                    "memo": "a memo",
                    "markerColor": "blue",
                    "receivedOn": "2023-12-10",
                    "dueDate": "2024-02-05",
                    "todoDate": "2024-01-29",
                    "todoWeekOfYear": 5,
                    "hasDocuments": true,
                    "updatedAt": "2024-01-18T13:08:39.123Z"
                }
                """
            )
        }
    }
})
