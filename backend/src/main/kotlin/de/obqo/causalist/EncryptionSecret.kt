package de.obqo.causalist

import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.CryptoUtils.generateRandomAesKey
import de.obqo.causalist.CryptoUtils.toSecretKey
import dev.forkhandles.values.AbstractValue
import dev.forkhandles.values.ValueFactory
import javax.crypto.SecretKey

class EncryptionSecret private constructor(value: ByteArray) : AbstractValue<ByteArray>(value.clone(), { "*****" }) {

    companion object : ValueFactory<EncryptionSecret, ByteArray>(
        ::EncryptionSecret, { it.size == 32 }, { it.fromBase64() }, { "*****" }
    ) {
        fun randomSecret() = of(generateRandomAesKey().encoded)

        fun decrypt(encryptedString: String, secretKey: SecretKey) = of(encryptedString.fromBase64().decrypt(secretKey))
    }

    private val _value: ByteArray = super.value

    override val value: ByteArray get() = _value.clone() // copy to prevent subsequent modification

    override fun hashCode(): Int = _value.contentHashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as EncryptionSecret

        return _value.contentEquals(other._value)
    }

    infix fun xor(other: EncryptionSecret) = EncryptionSecret(_value xor other._value)

    fun toSecretKey() = _value.toSecretKey()

    fun encrypt(secretKey: SecretKey) = _value.encrypt(secretKey).toBase64()
}
