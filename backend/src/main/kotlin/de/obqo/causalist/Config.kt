package de.obqo.causalist

import dev.forkhandles.values.AbstractValue
import dev.forkhandles.values.StringValue
import dev.forkhandles.values.StringValueFactory
import dev.forkhandles.values.ValueFactory
import org.http4k.cloudnative.env.Environment
import org.http4k.cloudnative.env.EnvironmentKey
import org.http4k.lens.value

class EncryptionKey private constructor(value: ByteArray) : AbstractValue<ByteArray>(value) {
    companion object : ValueFactory<EncryptionKey, ByteArray>(
        ::EncryptionKey, { it.size == 32 }, { it.fromBase64() }, { it.toBase64() }
    )
}

class PasswordSalt private constructor(value: String) : StringValue(value) {
    companion object : StringValueFactory<PasswordSalt>(::PasswordSalt, { it.isNotBlank() })
}

class SigningSecret private constructor(value: String) : StringValue(value) {
    companion object : StringValueFactory<SigningSecret>(::SigningSecret, { it.isNotBlank() })
}

object Config {

    private lateinit var env: Environment

    private val encryptionKeyLens = EnvironmentKey.value(EncryptionKey).required("CAUSALIST_ENCRYPTION_KEY")
    private val passwordSaltLens = EnvironmentKey.value(PasswordSalt).required("CAUSALIST_PASSWORD_SALT")
    private val signingSecretLens = EnvironmentKey.value(SigningSecret).required("CAUSALIST_SIGNING_SECRET")

    fun init(environment: Environment) {
        env = environment
    }

    val passwordSalt by lazy { passwordSaltLens(env) }
    val signingSecret by lazy { signingSecretLens(env) }
    val encryptionKey by lazy { encryptionKeyLens(env) }
}
