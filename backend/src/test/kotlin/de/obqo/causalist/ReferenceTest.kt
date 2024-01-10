package de.obqo.causalist

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.datatest.withData
import io.kotest.matchers.shouldBe

class ReferenceTest : DescribeSpec({

    describe("Reference") {
        it("should provide toString()") {
            Reference(
                RefEntity.of(303),
                RefRegister.of("O"),
                RefNumber.of(456),
                RefYear.of(23)
            ).toString() shouldBe "303 O 456/23"
            Reference(
                RefEntity.of(1),
                RefRegister.of("OH"),
                RefNumber.of(2),
                RefYear.of(3)
            ).toString() shouldBe "1 OH 2/03"
        }
        it("should provide parseId()") {
            Reference.parseId("00303OH23-00456") shouldBe Reference(
                RefEntity.of(303),
                RefRegister.of("OH"),
                RefNumber.of(456),
                RefYear.of(23)
            )
        }
        withData(
            nameFn = { "should reject parsing '$it'" },
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
        it("should provide toId() function") {
            Reference.parseId("00303O23-00456").toId() shouldBe "00303O23-00456"
        }
    }
})
