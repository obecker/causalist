package de.obqo.causalist

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe

class LangUtilsTest : DescribeSpec({

    it("should convert byte array to base64 string") {
        // given
        val bytes = byteArrayOf(0x01, 0x02, 0x03, 0x04)

        // when
        val base64String = bytes.toBase64()

        // then
        base64String shouldBe "AQIDBA=="
    }

    it("should convert base64 string to byte array") {
        // given
        val base64String = "AQIDBA=="

        // when
        val bytes = base64String.fromBase64()

        // then
        bytes shouldBe byteArrayOf(0x01, 0x02, 0x03, 0x04)
    }

    it("should xor byte arrays") {
        // given
        val bytes1 = byteArrayOf(0x01, 0x02, 0x03, 0x04)
        val bytes2 = byteArrayOf(0x05, 0x06, 0x07, 0x08)

        // when
        val result = bytes1 xor bytes2

        // then
        result shouldBe byteArrayOf(0x04, 0x04, 0x04, 0x0c)
    }
})
