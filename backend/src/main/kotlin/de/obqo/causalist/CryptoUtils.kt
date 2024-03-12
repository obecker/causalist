package de.obqo.causalist

import java.io.ByteArrayInputStream
import java.io.InputStream
import java.io.SequenceInputStream
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlin.text.Charsets.UTF_8

object CryptoUtils {

    private const val ALGORITHM = "AES"
    private const val ENCRYPT_ALGO = "AES/GCM/NoPadding"
    private const val HASH_ALGO = "PBKDF2WithHmacSHA256"
    private const val TAG_LENGTH_BIT = 128 // must be one of {128, 120, 112, 104, 96}

    // IV with 96 bits, https://crypto.stackexchange.com/questions/41601/aes-gcm-recommended-iv-size-why-12-bytes
    private const val IV_LENGTH_BYTE = 12
    private const val SALT_LENGTH_BYTE = 16
    private const val KEY_SIZE = 256
    private const val ITERATIONS = 500_000 // determines the time required for login validation

    private fun randomBytes(length: Int) = ByteArray(length).apply {
        SecureRandom().nextBytes(this)
    }

    /**
     * Generates a password hash that can be stored in the database.
     */
    fun generatePasswordHash(password: String): String {
        val salt = randomBytes(SALT_LENGTH_BYTE)
        val hash = computeHash(password, salt)
        return (salt + hash).toBase64()
    }

    /**
     * Verifies that the given password matches the given hash.
     */
    fun verifyPasswordHash(password: String, hash: String): Boolean {
        val bytes = hash.fromBase64()
        val salt = bytes.copyOfRange(0, SALT_LENGTH_BYTE)
        val computedHash = computeHash(password, salt)
        return computedHash.contentEquals(bytes.copyOfRange(SALT_LENGTH_BYTE, bytes.size))
    }

    /**
     * Generates an AES key from the given password and salt for encrypting and decrypting data.
     */
    fun generatePasswordAesKey(password: String, salt: String): SecretKey =
        SecretKeySpec(computeHash(password, salt.toByteArray()), ALGORITHM)

    private fun computeHash(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_SIZE)
        val factory = SecretKeyFactory.getInstance(HASH_ALGO)
        return factory.generateSecret(spec).encoded
    }

    fun generateRandomAesKey(): SecretKey = KeyGenerator.getInstance(ALGORITHM).apply {
        init(KEY_SIZE, SecureRandom.getInstanceStrong())
    }.generateKey()

    fun ByteArray.toSecretKey(): SecretKey = SecretKeySpec(this, ALGORITHM)

    /**
     * Encrypts the given [String] with the given [SecretKey] using AES/GCM/NoPadding.
     * The result is a Base64 encoded string containing the IV and the cipher text.
     */
    fun String.encrypt(secretKey: SecretKey): String {
        val iv = randomBytes(IV_LENGTH_BYTE)
        val cipher = Cipher.getInstance(ENCRYPT_ALGO)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(TAG_LENGTH_BIT, iv))

        val plainTextBytes = toByteArray()
        val cipherText = cipher.doFinal(plainTextBytes)
        return (iv + cipherText).toBase64()
    }

    /**
     * Decrypts the given [String] with the given [SecretKey] using AES/GCM/NoPadding.
     * The given [String] must be a Base64 encoded string containing the IV and the cipher text.
     */
    fun String.decrypt(secretKey: SecretKey): String {
        val cipherTextBytes = fromBase64()
        val iv = cipherTextBytes.copyOfRange(0, IV_LENGTH_BYTE)
        val cipher = Cipher.getInstance(ENCRYPT_ALGO)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(TAG_LENGTH_BIT, iv))

        val cipherText = cipherTextBytes.copyOfRange(IV_LENGTH_BYTE, cipherTextBytes.size)
        val plainText = cipher.doFinal(cipherText)
        return String(plainText, UTF_8)
    }

    /**
     * Encrypts the given [InputStream] with the given [SecretKey] using AES/GCM/NoPadding.
     * The result is an [InputStream] containing the IV and the cipher bytes.
     */
    fun InputStream.encrypt(secretKey: SecretKey): InputStream {
        val iv = randomBytes(IV_LENGTH_BYTE)
        val cipher = Cipher.getInstance(ENCRYPT_ALGO)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(TAG_LENGTH_BIT, iv))

        val cipherStream = CipherInputStream(this, cipher)
        return SequenceInputStream(ByteArrayInputStream(iv), cipherStream)
    }

    /**
     * Decrypts the given [InputStream] with the given [SecretKey] using AES/GCM/NoPadding.
     * The given [InputStream] must start with the bytes of the IV.
     */
    fun InputStream.decrypt(secretKey: SecretKey): InputStream {
        val iv = readNBytes(IV_LENGTH_BYTE)
        val cipher = Cipher.getInstance(ENCRYPT_ALGO)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(TAG_LENGTH_BIT, iv))

        return CipherInputStream(this, cipher)
    }
}
