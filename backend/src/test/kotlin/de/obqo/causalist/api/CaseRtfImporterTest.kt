package de.obqo.causalist.api

import de.obqo.causalist.Type.CHAMBER
import de.obqo.causalist.Type.SINGLE
import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.CryptoUtils.generateRandomAesKey
import de.obqo.causalist.Reference
import de.obqo.causalist.Status
import de.obqo.causalist.aCase
import de.obqo.causalist.caseService
import de.obqo.causalist.fakeCaseRepository
import de.obqo.causalist.withDueDate
import de.obqo.causalist.withOwnerId
import de.obqo.causalist.withParties
import de.obqo.causalist.withReceivedOn
import de.obqo.causalist.withRef
import de.obqo.causalist.withStatus
import de.obqo.causalist.withTodoDate
import de.obqo.causalist.withType
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.inspectors.shouldForAll
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSingleElement
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import java.time.LocalDate
import java.util.UUID

class CaseRtfImporterTest : DescribeSpec({
    describe("CaseRtfImporter") {

        val caseService = caseService(fakeCaseRepository)
        val userId = UUID.randomUUID()
        val secretKey = generateRandomAesKey()

        beforeEach {
            fakeCaseRepository.deleteAll()
        }

        it("should import cases from an RTF document") {
            // given
            val refExisting = "00123O18-00113"
            val refUpdated = "00123O18-00209"
            val refSettled = "00123O19-00124"

            val existingDate = LocalDate.of(2023, 12, 10)
            caseService.persist(
                aCase().withOwnerId(userId).withRef(Reference.parseId(refExisting)).withStatus(Status.SESSION)
                    .withParties("Existing".encrypt(secretKey)).withType(CHAMBER).withReceivedOn(existingDate)
            )
            caseService.persist(
                aCase().withOwnerId(userId).withRef(Reference.parseId(refUpdated)).withStatus(Status.SESSION)
                    .withParties("Updated".encrypt(secretKey)).withType(CHAMBER).withReceivedOn(existingDate)
            )
            caseService.persist(
                aCase().withOwnerId(userId).withRef(Reference.parseId(refSettled)).withStatus(Status.SETTLED)
                    .withParties("Settled".encrypt(secretKey)).withType(CHAMBER).withReceivedOn(existingDate)
            )

            val inputStream = ImportResult::class.java.getResourceAsStream("CasesToImport.rtf")
                ?: throw AssertionError("file not found")
            val importDate = LocalDate.of(2023, 12, 27)

            // when
            val importResult = importCases(inputStream, importDate, caseService, userId, secretKey)

            // then
            importResult.importType shouldBe ImportType.NEW_CASES
            importResult.importedCases.shouldContainExactly("123 O 358/14", "123 O 209/18", "123 O 124/19", "123 O 195/19", "123 O 54/21", "123 O 202/21", "123 S 4/23", "123 S 5/23")
            importResult.ignoredCases.shouldContainExactly(Reference.parseId(refExisting).toString())
            importResult.unknownCases.shouldBeEmpty()
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 54/23",
                "Unerkannter Bearbeiter: Referendar"
            )

            val persistedCases = caseService.findByOwner(userId, null, emptyList(), false).toList()
            persistedCases shouldHaveSize 9
            persistedCases.map { it.ref.toString() }.shouldContainExactly(
                "123 O 358/14",
                "123 O 113/18",
                "123 O 209/18",
                "123 O 124/19",
                "123 O 195/19",
                "123 O 54/21",
                "123 O 202/21",
                "123 S 4/23",
                "123 S 5/23"
            )
            persistedCases.map { it.parties?.decrypt(secretKey) }
                .shouldContainExactly(
                    "Müller-Meier, M. ./. Mehl-Meierei GmbH",
                    "Existing",
                    "Updated",
                    "Settled",
                    "Klöbner ./. Müller-Lüdenscheidt",
                    "Wolf, W. ./. Geiß, G.",
                    "Deutsche Rentenversicherung Bund ./. Private Rentenversicherung Hamburg",
                    "Asterix u.a. ./. Caesar, J.",
                    "Universitäres Gefäßzentrum Hamburg ./. Töpfer, T."
                )
            persistedCases.map { it.type }.shouldContainExactly(
                CHAMBER, CHAMBER, SINGLE, SINGLE, CHAMBER, SINGLE, CHAMBER, CHAMBER, CHAMBER
            )
            val refsWithExistingDate = listOf(refExisting, refUpdated, refSettled)
            persistedCases.shouldForAll {
                val expectedReceivedOn = if (refsWithExistingDate.contains(it.ref.toId())) existingDate else importDate
                it.receivedOn shouldBe expectedReceivedOn
            }
            val refsWithSession = listOf(refExisting, refUpdated)
            persistedCases.shouldForAll {
                val expectedStatus = if (refsWithSession.contains(it.ref.toId())) Status.SESSION else Status.UNKNOWN
                it.status shouldBe expectedStatus
            }
        }

        it("should import received date from an RTF document") {
            // given
            val ref1 = "00123O21-00202"
            val ref2 = "00123O19-00195"

            caseService.persist(aCase().withOwnerId(userId).withRef(Reference.parseId(ref1)))
            caseService.persist(aCase().withOwnerId(userId).withRef(Reference.parseId(ref2))
                .withReceivedOn(LocalDate.of(2019, 8, 29)))

            val inputStream = ImportResult::class.java.getResourceAsStream("CasesToUpdateReceivedOn.rtf")
                ?: throw AssertionError("file not found")

            // when
            val importResult = importCases(inputStream, LocalDate.now(), caseService, userId, secretKey)

            // then
            importResult.importType shouldBe ImportType.UPDATED_RECEIVED_DATES
            importResult.importedCases.shouldContainExactly(Reference.parseId(ref1).toString())
            importResult.ignoredCases.shouldContainExactly(Reference.parseId(ref2).toString())
            importResult.unknownCases.shouldContainExactly("123 O 201/22", "123 O 207/22")
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 46/20",
                "Unerkanntes Datum 2021-01-02 für Aktenzeichen 123 O 3/21"
            )

            caseService.get(userId, ref1).shouldNotBeNull().apply {
                receivedOn shouldBe LocalDate.of(2021, 10, 1)
            }
            caseService.get(userId, ref2).shouldNotBeNull().apply {
                receivedOn shouldBe LocalDate.of(2019, 8, 29)
            }
        }

        it("should import session dates from an RTF document") {
            // given
            val refIdChamber1 = "00123O21-00202"
            val refIdSingle1 = "00123O21-00054"
            val refIdChamber2 = "00123O19-00195"
            val refIdSingle2 = "00123O19-00124"
            val refIdNotUpdated = "00123S23-00004"

            caseService.persist(aCase().withOwnerId(userId).withRef(Reference.parseId(refIdChamber1)).withType(CHAMBER))
            caseService.persist(aCase().withOwnerId(userId).withRef(Reference.parseId(refIdSingle1)).withType(SINGLE))
            caseService.persist(aCase().withOwnerId(userId).withRef(Reference.parseId(refIdChamber2)).withType(CHAMBER))
            caseService.persist(aCase().withOwnerId(userId).withRef(Reference.parseId(refIdSingle2)).withType(SINGLE))
            caseService.persist(
                aCase().withOwnerId(userId).withRef(Reference.parseId(refIdNotUpdated)).withType(SINGLE)
                    .withStatus(Status.DECISION)
                    .withDueDate(LocalDate.of(2024, 1, 19))
                    .withTodoDate(LocalDate.of(2024, 1, 15))
            )

            val inputStream = ImportResult::class.java.getResourceAsStream("CasesToUpdateDueDate.rtf")
                ?: throw AssertionError("file not found")

            // when
            val importResult = importCases(inputStream, LocalDate.now(), caseService, userId, secretKey)

            // then
            importResult.importType shouldBe ImportType.UPDATED_DUE_DATES
            importResult.importedCases.shouldContainExactly("123 O 202/21", "123 O 54/21", "123 O 195/19", "123 O 124/19")
            importResult.ignoredCases.shouldContainExactly(Reference.parseId(refIdNotUpdated).toString())
            importResult.unknownCases.shouldContainExactly("123 O 1/23")
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 46/20",
                "Unerkanntes Datum 2024-01-12 für Aktenzeichen 123 O 3/21"
            )

            caseService.get(userId, refIdChamber1).shouldNotBeNull().apply {
                status shouldBe Status.SESSION
                dueDate shouldBe LocalDate.of(2024, 1, 9)
                todoDate shouldBe LocalDate.of(2024, 1, 2)
            }
            caseService.get(userId, refIdSingle1).shouldNotBeNull().apply {
                status shouldBe Status.SESSION
                dueDate shouldBe LocalDate.of(2024, 1, 10)
                todoDate shouldBe LocalDate.of(2024, 1, 9)
            }
            caseService.get(userId, refIdChamber2).shouldNotBeNull().apply {
                status shouldBe Status.DECISION
                dueDate shouldBe LocalDate.of(2024, 1, 12)
                todoDate shouldBe LocalDate.of(2024, 1, 5)
            }
            caseService.get(userId, refIdSingle2).shouldNotBeNull().apply {
                status shouldBe Status.DECISION
                dueDate shouldBe LocalDate.of(2024, 1, 15)
                todoDate shouldBe LocalDate.of(2024, 1, 12) // moved to Friday
            }
            caseService.get(userId, refIdNotUpdated).shouldNotBeNull().apply {
                status shouldBe Status.DECISION
                dueDate shouldBe LocalDate.of(2024, 1, 19)
                todoDate shouldBe LocalDate.of(2024, 1, 15) // unchanged
            }
        }

        it("should handle unknown RTF document") {
            val inputStream = ImportResult::class.java.getResourceAsStream("Text.rtf")
                ?: throw AssertionError("file not found")

            // when
            val importResult = importCases(inputStream, LocalDate.now(), caseService, userId, secretKey)

            // then
            importResult.importType.shouldBeNull()
            importResult.importedCases.shouldBeEmpty()
            importResult.ignoredCases.shouldBeEmpty()
            importResult.unknownCases.shouldBeEmpty()
            importResult.errors shouldHaveSingleElement "Es konnten leider keine Daten in der RTF-Datei erkannt werden."

        }
    }
})
