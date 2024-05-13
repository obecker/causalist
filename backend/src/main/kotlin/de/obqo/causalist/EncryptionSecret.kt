package de.obqo.causalist

import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.CryptoUtils.generateRandomAesKey
import de.obqo.causalist.CryptoUtils.toSecretKey
import dev.forkhandles.values.AbstractValue
import dev.forkhandles.values.ValueFactory
import javax.crypto.SecretKey

class EncryptionSecret private constructor(value: ByteArray) : AbstractValue<ByteArray>(value, { "*****" }) {
    companion object : ValueFactory<EncryptionSecret, ByteArray>(
        ::EncryptionSecret, { it.size == 32 }, { it.fromBase64() }, { "*****" }
    ) {
        fun randomSecret() = of(generateRandomAesKey().encoded)

        fun decrypt(encryptedString: String, secretKey: SecretKey) = of(encryptedString.fromBase64().decrypt(secretKey))
    }

    infix fun xor(other: EncryptionSecret) = EncryptionSecret(value xor other.value)

    fun toSecretKey() = value.toSecretKey()

    fun encrypt(secretKey: SecretKey) = value.encrypt(secretKey).toBase64()

    override fun hashCode(): Int = value.contentHashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as EncryptionSecret

        return value.contentEquals(other.value)
    }
}
