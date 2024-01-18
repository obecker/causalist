package de.obqo.causalist

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.datatest.withData
import io.kotest.matchers.shouldBe

class ReferenceTest : DescribeSpec({

    describe("Reference") {
        // given
        val reference1 = Reference(
            RefEntity.of(123),
            RefRegister.of("O"),
            RefNumber.of(456),
            RefYear.of(23)
        )
        val reference2 = Reference(
            RefEntity.of(1),
            RefRegister.of("OH"),
            RefNumber.of(2),
            RefYear.of(3)
        )

        it("should provide toValue()") {
            reference1.toValue() shouldBe "123 O 456/23"
            reference2.toValue() shouldBe "1 OH 2/03"
        }

        it("should provide toId()") {
            reference1.toId() shouldBe "00123O23-00456"
            reference2.toId() shouldBe "00001OH03-00002"
        }

        it("should provide parseValue()") {
            Reference.parseValue(reference1.toValue()) shouldBe reference1
            Reference.parseValue(reference2.toValue()) shouldBe reference2
        }

        it("should provide parseId()") {
            Reference.parseId(reference1.toId()) shouldBe reference1
            Reference.parseId(reference2.toId()) shouldBe reference2
        }

        withData(
            nameFn = { "should reject parsing ID '$it'" },
            "foobar", // illegal format
            "123456O23-00456", // entity out of range
            "00000O23-00456", // entity out of range
            "00123X23-00456", // unknown register
            "00123OH23-456789", // number out of range
            "00123OH23-00000", // number out of range
            "00123O234-00456" // year out of range
        ) {
            shouldThrow<IllegalArgumentException> {
                Reference.parseId(it)
            }
        }

        withData(
            nameFn = { "should reject parsing value '$it'" },
            "foobar", // illegal format
            "123456 O 456/23", // entity out of range
            "00000 O 456/23", // entity out of range
            "123 X 456/23", // unknown register
            "123 OH 456789/23", // number out of range
            "123 OH 0/23", // number out of range
            "123 O 456/234" // year out of range
        ) {
            shouldThrow<IllegalArgumentException> {
                Reference.parseId(it)
            }
        }
    }
})
