package de.obqo.causalist

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe

class EncryptionSecretTest : DescribeSpec({

    describe("EncryptionSecret") {

        val validEncodedSecret = "YeXHqscqShyHU9HRJUm/n2s3DN0ilLbTzhVTb9QeVV0="

        it("should validate the given when using parse") {
            // valid value
            EncryptionSecret.parse(validEncodedSecret).shouldNotBeNull()

            // value is too short
            shouldThrow<IllegalArgumentException> {
                EncryptionSecret.parse(validEncodedSecret.substring(3, validEncodedSecret.length))
            }

            // value is too long
            shouldThrow<IllegalArgumentException> {
                EncryptionSecret.parse(validEncodedSecret.substring(0..2) + validEncodedSecret)
            }

            // value contains illegal (non base64) characters
            shouldThrow<IllegalArgumentException> {
                EncryptionSecret.parse(validEncodedSecret.replace('e', '#'))
            }
        }

        it("should validate the given value when using the factory method") {
            // valid value
            EncryptionSecret.of(ByteArray(32)).shouldNotBeNull()

            // value is too short
            shouldThrow<IllegalArgumentException> {
                EncryptionSecret.of(ByteArray(31))
            }

            // value is too long
            shouldThrow<IllegalArgumentException> {
                EncryptionSecret.of(ByteArray(33))
            }
        }

        it("should hide its contained value") {
            // given
            val secret = EncryptionSecret.parse(validEncodedSecret)

            // then
            secret.toString() shouldBe "*****"
            EncryptionSecret.show(secret) shouldBe "*****"
        }

        it("should correctly implement hashCode and equals") {
            // given
            val secret1 = EncryptionSecret.parse(validEncodedSecret)
            val secret2 = EncryptionSecret.parse(validEncodedSecret)

            // then
            secret1.hashCode() shouldBe secret2.hashCode()
            (secret1 == secret2) shouldBe true
        }

        it("should xor its value") {
            // given
            val secret1 = EncryptionSecret.of(ByteArray(32) { 13 })
            val secret2 = EncryptionSecret.of(ByteArray(32) { 42 })

            // then
            (secret1 xor secret2) shouldBe EncryptionSecret.of(ByteArray(32) { (13 xor 42).toByte() })
        }
    }
})
