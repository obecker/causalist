package de.obqo.causalist.api

import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.CryptoUtils.generateRandomAesKey
import de.obqo.causalist.Reference
import de.obqo.causalist.Status
import de.obqo.causalist.Type.CHAMBER
import de.obqo.causalist.Type.SINGLE
import de.obqo.causalist.aCase
import de.obqo.causalist.caseService
import de.obqo.causalist.fakeCaseRepository
import de.obqo.causalist.withDueDate
import de.obqo.causalist.withDueTime
import de.obqo.causalist.withOwnerId
import de.obqo.causalist.withParties
import de.obqo.causalist.withReceivedOn
import de.obqo.causalist.withRef
import de.obqo.causalist.withSettledOn
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
import io.mockk.mockk
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

class CaseRtfImporterTest : DescribeSpec({
    describe("CaseRtfImporter") {

        val caseService = caseService(fakeCaseRepository, mockk())
        val userId = UUID.randomUUID()
        val secretKey = generateRandomAesKey()

        fun importFile(name: String, importDate: LocalDate = LocalDate.now()): ImportResult {
            val inputStream = CaseRtfImporterTest::class.java.getResourceAsStream(name)
                ?: throw AssertionError("file $name not found")
            return importCases(inputStream, importDate, caseService, userId, secretKey)
        }

        beforeEach {
            fakeCaseRepository.deleteAll()
        }

        it("should import cases from an RTF document") {
            // given
            val refExisting = Reference.parseValue("123 O 85/17")
            val refUpdated = Reference.parseValue("123 O 209/18")
            val refSettled = Reference.parseValue("123 O 132/19")

            val existingDate = LocalDate.of(2023, 12, 10)
            caseService.persist(
                aCase().withOwnerId(userId).withRef(refExisting).withStatus(Status.SESSION)
                    .withParties("Existing".encrypt(secretKey)).withType(CHAMBER).withReceivedOn(existingDate)
            )
            caseService.persist(
                aCase().withOwnerId(userId).withRef(refUpdated).withStatus(Status.SESSION)
                    .withParties("Updated".encrypt(secretKey)).withType(CHAMBER).withReceivedOn(existingDate)
            )
            caseService.persist(
                aCase().withOwnerId(userId).withRef(refSettled).withStatus(Status.SETTLED)
                    .withParties("Settled".encrypt(secretKey)).withType(CHAMBER).withReceivedOn(existingDate)
            )

            val importDate = LocalDate.of(2023, 12, 27)

            // when
            val importResult = importFile("CasesToImport.rtf", importDate)

            // then
            importResult.importType shouldBe ImportType.NEW_CASES
            importResult.importedCaseRefs.shouldContainExactly(
                "123 O 358/14",
                "123 O 195/19",
                "123 O 54/21",
                "123 O 201/22",
                "123 S 4/23",
                "123 S 5/23"
            )
            importResult.updatedCaseRefs.shouldContainExactly(refUpdated.toValue(), refSettled.toValue())
            importResult.ignoredCaseRefs.shouldContainExactly(refExisting.toValue())
            importResult.unknownCaseRefs.shouldBeEmpty()
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 54/23",
                "Unerkannter Bearbeiter: Referendar"
            )

            val persistedCases = caseService.findByOwner(userId, null, emptyList(), false).toList()
            persistedCases shouldHaveSize 9
            persistedCases.map { it.ref.toValue() }.shouldContainExactly(
                "123 O 358/14",
                "123 O 85/17",
                "123 O 209/18",
                "123 O 132/19",
                "123 O 195/19",
                "123 O 54/21",
                "123 O 201/22",
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
                    "Gesetzliche Entenversicherung ./. Private Entenversicherung",
                    "Asterix u.a. ./. Caesar, J.",
                    "Gefäßzentrum Harburg ./. Töpfer, T."
                )
            persistedCases.map { it.type }.shouldContainExactly(
                CHAMBER, CHAMBER, SINGLE, SINGLE, CHAMBER, SINGLE, CHAMBER, CHAMBER, CHAMBER
            )
            val refsWithExistingDate = listOf(refExisting, refUpdated, refSettled)
            persistedCases.shouldForAll {
                val expectedReceivedOn = if (refsWithExistingDate.contains(it.ref)) existingDate else importDate
                it.receivedOn shouldBe expectedReceivedOn
            }
            val refsWithSession = listOf(refExisting, refUpdated)
            persistedCases.shouldForAll {
                val expectedStatus = if (refsWithSession.contains(it.ref)) Status.SESSION else Status.UNKNOWN
                it.status shouldBe expectedStatus
            }

            // when reimporting
            val secondImportResult = importFile("CasesToImport.rtf", importDate)

            // then all imported cases should be ignored
            secondImportResult.importType shouldBe ImportType.NEW_CASES
            secondImportResult.importedCaseRefs.shouldBeEmpty()
            secondImportResult.updatedCaseRefs.shouldBeEmpty()
            secondImportResult.ignoredCaseRefs.shouldContainExactly(
                "123 O 358/14",
                "123 O 85/17",
                "123 O 209/18",
                "123 O 132/19",
                "123 O 195/19",
                "123 O 54/21",
                "123 O 201/22",
                "123 S 4/23",
                "123 S 5/23"
            )
        }

        it("should import settled cases from an RTF document") {
            // given
            val ref1 = Reference.parseValue("123 O 54/21")
            val ref2 = Reference.parseValue("123 S 4/23")
            val ref3 = Reference.parseValue("123 O 14/22")

            caseService.persist(aCase().withOwnerId(userId).withRef(ref1))
            caseService.persist(
                aCase().withOwnerId(userId).withRef(ref2).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2024, 3, 31))
            )
            caseService.persist(
                aCase().withOwnerId(userId).withRef(ref3).withStatus(Status.SETTLED)
                    .withSettledOn(LocalDate.of(2023, 7, 20))
            )

            // when
            val importResult = importFile("CasesToSettle.rtf")

            // then
            importResult.importType shouldBe ImportType.SETTLED_CASES
            importResult.importedCaseRefs.shouldBeEmpty()
            importResult.settledCaseRefs.shouldContainExactly(ref1.toValue())
            importResult.updatedCaseRefs.shouldContainExactly(ref2.toValue())
            importResult.ignoredCaseRefs.shouldContainExactly(ref3.toValue())
            importResult.unknownCaseRefs.shouldContainExactly("123 O 13/22")
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 1/21",
                "Unerkanntes Datum: 2023-08-30"
            )

            caseService.get(userId, ref1).shouldNotBeNull().apply {
                status shouldBe Status.SETTLED
                settledOn shouldBe LocalDate.of(2023, 8, 16)
            }
            caseService.get(userId, ref2).shouldNotBeNull().apply {
                status shouldBe Status.SETTLED
                settledOn shouldBe LocalDate.of(2024, 3, 26)
            }

            // when reimporting
            val secondImportResult = importFile("CasesToSettle.rtf")

            // then all imported cases should be ignored
            secondImportResult.importType shouldBe ImportType.SETTLED_CASES
            secondImportResult.settledCaseRefs.shouldBeEmpty()
            secondImportResult.updatedCaseRefs.shouldBeEmpty()
            secondImportResult.ignoredCaseRefs.shouldContainExactly(ref1.toValue(), ref2.toValue(), ref3.toValue())
        }

        it("should import received date from an RTF document") {
            // given
            val ref1 = Reference.parseValue("123 O 201/22")
            val ref2 = Reference.parseValue("123 O 195/19")

            caseService.persist(aCase().withOwnerId(userId).withRef(ref1))
            caseService.persist(
                aCase().withOwnerId(userId).withRef(ref2).withReceivedOn(LocalDate.of(2019, 8, 29))
            )

            // when
            val importResult = importFile("CasesToUpdateReceivedOn.rtf")

            // then
            importResult.importType shouldBe ImportType.UPDATED_RECEIVED_DATES
            importResult.importedCaseRefs.shouldBeEmpty()
            importResult.updatedCaseRefs.shouldContainExactly(ref1.toValue())
            importResult.ignoredCaseRefs.shouldContainExactly(ref2.toValue())
            importResult.unknownCaseRefs.shouldContainExactly("123 O 203/22", "123 O 207/22")
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 46/20",
                "Unerkanntes Datum: 2021-01-02"
            )

            caseService.get(userId, ref1.toId()).shouldNotBeNull().apply {
                receivedOn shouldBe LocalDate.of(2021, 10, 1)
            }
            caseService.get(userId, ref2.toId()).shouldNotBeNull().apply {
                receivedOn shouldBe LocalDate.of(2019, 8, 29)
            }

            // when reimporting
            val secondImportResult = importFile("CasesToUpdateReceivedOn.rtf")

            // then all imported cases should be ignored
            secondImportResult.importType shouldBe ImportType.UPDATED_RECEIVED_DATES
            secondImportResult.updatedCaseRefs.shouldBeEmpty()
            secondImportResult.ignoredCaseRefs.shouldContainExactly(ref1.toValue(), ref2.toValue())
        }

        it("should import session dates from an RTF document") {
            // given
            val refChamber1 = Reference.parseValue("123 O 201/22")
            val refSingle1 = Reference.parseValue("123 O 54/21")
            val refChamber2 = Reference.parseValue("123 O 195/19")
            val refSingle2 = Reference.parseValue("123 O 132/19")
            val refNotUpdated = Reference.parseValue("123 S 4/23")

            caseService.persist(aCase().withOwnerId(userId).withRef(refChamber1).withType(CHAMBER))
            caseService.persist(aCase().withOwnerId(userId).withRef(refSingle1).withType(SINGLE))
            caseService.persist(aCase().withOwnerId(userId).withRef(refChamber2).withType(CHAMBER))
            caseService.persist(aCase().withOwnerId(userId).withRef(refSingle2).withType(SINGLE))
            caseService.persist(
                aCase().withOwnerId(userId).withRef(refNotUpdated).withType(SINGLE)
                    .withStatus(Status.DECISION)
                    .withDueDate(LocalDate.of(2024, 1, 19))
                    .withDueTime(LocalTime.of(13, 50))
                    .withTodoDate(LocalDate.of(2024, 1, 15))
            )

            // when
            val importResult = importFile("CasesToUpdateDueDate.rtf")

            // then
            importResult.importType shouldBe ImportType.UPDATED_DUE_DATES
            importResult.importedCaseRefs.shouldBeEmpty()
            importResult.updatedCaseRefs.shouldContainExactly(
                refChamber1.toValue(),
                refSingle1.toValue(),
                refChamber2.toValue(),
                refSingle2.toValue()
            )
            importResult.ignoredCaseRefs.shouldContainExactly(refNotUpdated.toValue())
            importResult.unknownCaseRefs.shouldContainExactly("123 O 1/23")
            importResult.errors.shouldContainExactly(
                "Unerkanntes Aktenzeichen: 123 Z 46/20",
                "Unerkanntes Datum: 2024-01-12",
                "Unerkannte Uhrzeit: 8 Uhr",
            )

            caseService.get(userId, refChamber1.toId()).shouldNotBeNull().apply {
                status shouldBe Status.SESSION
                dueDate shouldBe LocalDate.of(2024, 1, 9)
                dueTime shouldBe LocalTime.of(9, 30)
                todoDate shouldBe LocalDate.of(2024, 1, 2)
            }
            caseService.get(userId, refSingle1.toId()).shouldNotBeNull().apply {
                status shouldBe Status.SESSION
                dueDate shouldBe LocalDate.of(2024, 1, 10)
                dueTime shouldBe LocalTime.of(11, 0)
                todoDate shouldBe LocalDate.of(2024, 1, 9)
            }
            caseService.get(userId, refChamber2.toId()).shouldNotBeNull().apply {
                status shouldBe Status.DECISION
                dueDate shouldBe LocalDate.of(2024, 1, 12)
                dueTime shouldBe LocalTime.of(9, 50)
                todoDate shouldBe LocalDate.of(2024, 1, 5)
            }
            caseService.get(userId, refSingle2.toId()).shouldNotBeNull().apply {
                status shouldBe Status.DECISION
                dueDate shouldBe LocalDate.of(2024, 1, 15)
                dueTime shouldBe LocalTime.of(15, 15)
                todoDate shouldBe LocalDate.of(2024, 1, 12) // moved to Friday
            }
            caseService.get(userId, refNotUpdated.toId()).shouldNotBeNull().apply {
                status shouldBe Status.DECISION
                dueDate shouldBe LocalDate.of(2024, 1, 19)
                dueTime shouldBe LocalTime.of(13, 50)
                todoDate shouldBe LocalDate.of(2024, 1, 15) // unchanged
            }

            // when reimporting
            val secondImportResult = importFile("CasesToUpdateDueDate.rtf")

            // then all imported cases should be ignored
            secondImportResult.importType shouldBe ImportType.UPDATED_DUE_DATES
            secondImportResult.updatedCaseRefs.shouldBeEmpty()
            secondImportResult.ignoredCaseRefs.shouldContainExactly(
                refChamber1.toValue(),
                refSingle1.toValue(),
                refChamber2.toValue(),
                refSingle2.toValue(),
                refNotUpdated.toValue()
            )
        }

        it("should handle unknown RTF document") {
            // when
            val importResult = importFile("Text.rtf")

            // then
            importResult.importType.shouldBeNull()
            importResult.importedCaseRefs.shouldBeEmpty()
            importResult.updatedCaseRefs.shouldBeEmpty()
            importResult.ignoredCaseRefs.shouldBeEmpty()
            importResult.unknownCaseRefs.shouldBeEmpty()
            importResult.errors shouldHaveSingleElement "Es konnten leider keine Daten in der RTF-Datei erkannt werden."

        }
    }
})
