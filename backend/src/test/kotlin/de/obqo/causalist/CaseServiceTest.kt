package de.obqo.causalist

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.sequences.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe

class CaseServiceTest : DescribeSpec({

    describe("CaseService") {
        val caseRepository = fakeCaseRepository
        val caseService = caseService(caseRepository)

        afterEach {
            caseRepository.deleteAll()
        }

        it("should persist new case") {
            // when
            val persisted = caseService.persist(aCase())

            // then
            persisted shouldNotBe null
            caseRepository.get(persisted) shouldBe persisted
        }

        it("should prevent persisting multiple cases having the same reference") {
            // given
            val reference = aReference()

            // when/then
            caseService.persist(aCase().withRef(reference))
            shouldThrow<CaseExistsException> {
                caseService.persist(aCase().withRef(reference))
            }
        }

        it("should update existing case") {
            // given
            val persistedCase = caseService.persist(aCase())

            // when
            val updatedCase = caseService.update(persistedCase.withParties("A vs B"))

            // then
            updatedCase shouldNotBe null
            updatedCase shouldNotBe persistedCase // different parties
            caseRepository.get(persistedCase) shouldBe updatedCase
        }

        it("should prevent updating a case if it doesn't exist") {
            shouldThrow<CaseMissingException> {
                caseService.update(aCase())
            }
        }

        it("should move a case") {
            // given
            val oldReference = aReference()
            val newReference = oldReference.next()
            val case = caseService.persist(aCase().withRef(oldReference))

            // then
            caseRepository.get(case.ownerId, oldReference) shouldBe case
            caseRepository.get(case.ownerId, newReference) shouldBe null

            // when
            val movedCase = caseService.move(case.copy(ref = newReference), oldReference)

            // then
            caseRepository.get(case.ownerId, oldReference) shouldBe null
            caseRepository.get(case.ownerId, newReference) shouldBe movedCase
            caseRepository.findAll() shouldHaveSize 1
        }

        it("should prevent moving a case to an existing case") {
            // given
            val oldReference = aReference()
            val newReference = oldReference.next()
            val case = caseService.persist(aCase().withRef(oldReference).withParties("A"))
            val existingCase = caseService.persist(aCase().withRef(newReference).withParties("B"))

            // then
            shouldThrow<CaseExistsException> {
                caseService.move(case.copy(ref = newReference), oldReference)
            }
            caseRepository.get(case.ownerId, oldReference) shouldBe case
            caseRepository.get(case.ownerId, newReference) shouldBe existingCase
        }
    }
})
