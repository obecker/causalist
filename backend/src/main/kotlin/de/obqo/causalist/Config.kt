package de.obqo.causalist

import de.obqo.causalist.CryptoUtils.toSecretKey
import dev.forkhandles.values.AbstractValue
import dev.forkhandles.values.ValueFactory
import org.http4k.cloudnative.env.Environment
import org.http4k.cloudnative.env.EnvironmentKey
import org.http4k.connect.amazon.dynamodb.model.TableName
import org.http4k.connect.amazon.s3.model.BucketName
import org.http4k.lens.secret
import org.http4k.lens.uri
import org.http4k.lens.value

class EncryptionSecret private constructor(value: ByteArray) : AbstractValue<ByteArray>(value, { "*****" }) {
    companion object : ValueFactory<EncryptionSecret, ByteArray>(
        ::EncryptionSecret, { it.size == 32 }, { it.fromBase64() }, { "*****" }
    )

    infix fun xor(other: EncryptionSecret) = EncryptionSecret(value xor other.value)

    fun toSecretKey() = value.toSecretKey()

    override fun hashCode(): Int = value.contentHashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as EncryptionSecret

        return value.contentEquals(other.value)
    }
}

private val optionalDynamoDbUriKey = EnvironmentKey.uri().optional("DYNAMODB_URI")
private val optionalS3UriKey = EnvironmentKey.uri().optional("S3_URI")
private val usersTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_USERS_TABLE")
private val casesTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_CASES_TABLE")
private val caseDocumentsTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_CASE_DOCUMENTS_TABLE")
private val caseDocumentsBucketNameKey = EnvironmentKey.value(BucketName).required("CAUSALIST_CASE_DOCUMENTS_BUCKET")
private val encryptionSecretEnvKey = EnvironmentKey.value(EncryptionSecret).required("CAUSALIST_ENCRYPTION_KEY")
private val passwordSaltEnvKey = EnvironmentKey.secret().required("CAUSALIST_PASSWORD_SALT")
private val signingSecretEnvKey = EnvironmentKey.secret().required("CAUSALIST_SIGNING_SECRET")

class Config(env: Environment) {

    val optionalDynamoDbUri = optionalDynamoDbUriKey(env)
    val optionalS3Uri = optionalS3UriKey(env)
    val usersTable = usersTableKey(env)
    val casesTable = casesTableKey(env)
    val caseDocumentsTable = caseDocumentsTableKey(env)
    val caseDocumentsBucketName = caseDocumentsBucketNameKey(env)
    val encryptionSecret = encryptionSecretEnvKey(env)
    val passwordSalt = passwordSaltEnvKey(env)
    val signingSecret = signingSecretEnvKey(env)
}
