package de.obqo.causalist

import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.CryptoUtils.generatePasswordAesKey
import de.obqo.causalist.CryptoUtils.generatePasswordHash
import de.obqo.causalist.CryptoUtils.generateRandomAesKey
import de.obqo.causalist.CryptoUtils.toSecretKey
import de.obqo.causalist.CryptoUtils.verifyPasswordHash
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldNotContain
import java.io.ByteArrayInputStream

class CryptoUtilsTest : DescribeSpec({

    it("should generate random AES key having 32 bytes") {
        // when
        val key1 = generateRandomAesKey()
        val key2 = generateRandomAesKey()

        // then
        key1.encoded.toTypedArray() shouldHaveSize 32 // 256 bits / 8 = 32 bytes
        key1 shouldNotBe key2
    }

    it("should generate AES key from password having 32 bytes") {
        // given
        val password = "password"
        val salt = "salt"

        // when
        val key = generatePasswordAesKey(password, salt)

        // then
        key.encoded.toTypedArray() shouldHaveSize 32 // 256 bits / 8 = 32 bytes
        key.encoded.toBase64() shouldBe "1rxzlg/RuLMGQBWWVTK2HHInKKnwM/ADe13PT9RFiXY="
    }

    it("should convert byte array to secret key") {
        // given
        val bytes = byteArrayOf(0x01, 0x02, 0x03, 0x04)

        // when
        val key = bytes.toSecretKey()

        // then
        key.encoded shouldBe bytes
    }

    it("should encrypt and decrypt string") {
        // given
        val key = generatePasswordAesKey("password", "salt")
        val plaintext = "Hello String!"

        // when
        val ciphertext = plaintext.encrypt(key)

        // then
        ciphertext shouldNotBe plaintext
        ciphertext shouldNotContain plaintext

        // when
        val decrypted = ciphertext.decrypt(key)

        // then
        decrypted shouldBe plaintext
    }

    it("should generate and verify password hash") {
        // given
        val password = "password"

        // when
        val hash1 = generatePasswordHash(password)
        val hash2 = generatePasswordHash(password)
        val hash3 = generatePasswordHash("something different")

        // then
        hash1 shouldNotBe password
        hash1 shouldNotContain password
        // two generated hashes for the same plain text password will be different
        hash1 shouldNotBe hash2

        verifyPasswordHash(password, hash1) shouldBe true
        verifyPasswordHash(password, hash2) shouldBe true
        verifyPasswordHash(password, hash3) shouldBe false
    }

    it("should encrypt and decrypt inputstream") {
        // given
        val key = generatePasswordAesKey("password", "salt")
        val plainBytes = "Hello Stream!".toByteArray()
        val plainStream = ByteArrayInputStream(plainBytes)

        // when
        val cipherStream = plainStream.encrypt(key)
        val cipherBytes = cipherStream.readAllBytes()

        // then
        cipherBytes shouldNotBe plainBytes
        cipherBytes.size shouldNotBe plainBytes.size

        // when
        val decryptedStream = ByteArrayInputStream(cipherBytes).decrypt(key)
        val decryptedBytes = decryptedStream.readAllBytes()

        // then
        decryptedBytes shouldBe plainBytes
    }
})
