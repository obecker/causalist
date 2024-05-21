package de.obqo.causalist.api

import de.obqo.causalist.Config
import de.obqo.causalist.CryptoUtils.generatePasswordAesKey
import de.obqo.causalist.DuplicateUsernameException
import de.obqo.causalist.EncryptionSecret
import de.obqo.causalist.User
import de.obqo.causalist.UserService
import de.obqo.causalist.toBase64
import io.github.oshai.kotlinlogging.KotlinLogging
import org.http4k.core.HttpHandler
import org.http4k.core.Response
import org.http4k.core.Status
import org.http4k.core.with
import se.ansman.kotshi.JsonSerializable
import java.security.GeneralSecurityException
import java.security.MessageDigest
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

private val logger = KotlinLogging.logger {}

data class UserContext(
    val userId: UUID,
    val encryptionKey: SecretKey
)

interface Authentication {
    val registrationHandler: HttpHandler
    val loginHandler: HttpHandler
    val contextLookup: (String) -> UserContext?
}

@JsonSerializable
data class Login(
    val username: String,
    val password: String
)

@JsonSerializable
data class Result(
    val success: Boolean,
    val message: String? = null,
    val token: String? = null
)

private fun success(token: String? = null) = Result(success = true, token = token)
private fun failure(message: String? = null) = Result(success = false, message = message)

/**
 * Create and validate signed tokens for API authentication. This is similar to JWT, except that we don't need an
 * extra library for this (and tokens will not be passed to other applications, so there's no need for a common token
 * format).
 */
class TokenSupport(private val config: Config) {

    companion object {
        private const val ALGORITHM = "HmacSHA384"
    }

    private val signingSecretKeySpec = config.signingSecret.use { SecretKeySpec(it.toByteArray(), ALGORITHM) }
    private val appEncryptionSecretKey = config.encryptionSecret.toSecretKey()

    private fun sign(vararg values: String): String {
        val mac = Mac.getInstance(ALGORITHM)
        mac.init(signingSecretKeySpec)
        for (v in values) {
            mac.update(v.toByteArray())
        }
        return mac.doFinal().toBase64()
    }

    fun createToken(
        id: UUID,
        pwdHash: String,
        userSecret: EncryptionSecret,
        clock: Clock = Clock.systemDefaultZone()
    ): String {
        val expires = clock.instant().plus(Duration.ofDays(1)).toEpochMilli()
        val encryptedUserSecret = userSecret.encrypt(appEncryptionSecretKey)
        val signature = sign(id.toString(), pwdHash, encryptedUserSecret, expires.toString())
        return "$id.$pwdHash.$encryptedUserSecret.$expires.$signature"
    }

    fun validateToken(token: String, resolvePwdHash: (UUID) -> String?): UserContext? = try {
        val parts = token.split(".")
        require(parts.size == 5) { "Illegal token format" }
        require(sign(parts[0], parts[1], parts[2], parts[3]) == parts[4]) { "Invalid token signature" }
        require(Instant.ofEpochMilli(parts[3].toLong()).isAfter(Instant.now())) { "Token has expired" }
        val id = UUID.fromString(parts[0])
        val pwdHash = parts[1]
        val userSecret = EncryptionSecret.decrypt(parts[2], appEncryptionSecretKey)
        if (resolvePwdHash(id) == pwdHash) {
            UserContext(id, (userSecret xor config.encryptionSecret).toSecretKey())
        } else {
            null
        }
    } catch (ex: RuntimeException) {
        logger.info(ex) { "Token validation failed" }
        null
    } catch (ex: GeneralSecurityException) {
        logger.info(ex) { "Token validation failed" }
        null
    }
}

fun String.tokenHash(): String {
    val digest = MessageDigest.getInstance("SHA3-384")
    return digest.digest(toByteArray()).toBase64()
}

fun authentication(userService: UserService, config: Config): Authentication {

    val tokenSupport = TokenSupport(config)

    val generatePasswordSecret = config.passwordSalt.use { salt ->
        { password: String -> generatePasswordAesKey(password, salt) }
    }

    val loginLens = causalistJson.autoBody<Login>().toLens()
    val resultLens = causalistJson.autoBody<Result>().toLens()

    val login: HttpHandler = { request ->
        val (username, password) = loginLens(request)
        userService.login(username, password)?.let { user: User ->
            val passwordSecret = generatePasswordSecret(password)
            val userSecret = EncryptionSecret.decrypt(user.encryptedSecret, passwordSecret)

            Response(Status.OK).with(
                resultLens of success(tokenSupport.createToken(user.id, user.password.tokenHash(), userSecret))
            )
        } ?: run {
            Response(Status.FORBIDDEN).with(
                resultLens of failure("Authentication failed")
            )
        }
    }

    fun validateRegistrationInput(username: String, password: String) {
        if (username.trim().length < 4) {
            throw IllegalArgumentException("username")
        }
        if (password.length < 10) {
            throw IllegalArgumentException("password")
        }
    }

    val registration: HttpHandler = { request ->
        try {
            val (username, password) = loginLens(request)
            validateRegistrationInput(username, password)
            val passwordSecret = generatePasswordSecret(password)
            val userSecret = EncryptionSecret.randomSecret()
            val encryptedSecret = userSecret.encrypt(passwordSecret)
            userService.register(username, password, encryptedSecret)
            Response(Status.OK).with(resultLens of success())
        } catch (_: DuplicateUsernameException) {
            Response(Status.CONFLICT).with(
                resultLens of failure("Username exists")
            )
        } catch (e: IllegalArgumentException) {
            Response(Status.BAD_REQUEST).with(
                resultLens of failure(e.message)
            )
        }
    }

    return object : Authentication {
        override val registrationHandler: HttpHandler = registration

        override val loginHandler: HttpHandler = login

        override val contextLookup: (String) -> UserContext? = { token: String ->
            tokenSupport.validateToken(token) { id -> userService.get(id)?.password?.tokenHash() }
        }
    }
}
