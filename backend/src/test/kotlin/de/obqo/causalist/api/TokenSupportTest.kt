package de.obqo.causalist.api

import de.obqo.causalist.Config
import de.obqo.causalist.EncryptionSecret
import de.obqo.causalist.toBase64
import io.kotest.assertions.fail
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.datatest.withData
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import org.http4k.cloudnative.env.Secret
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

class TokenSupportTest : DescribeSpec({

    describe("TokenSupport") {

        val config = mockk<Config>()
        every { config.signingSecret } returns Secret("secret")
        every { config.encryptionSecret } returns EncryptionSecret.of(ByteArray(32))

        val encodedUserSecret = ByteArray(32) { it.toByte() }.toBase64()

        val tokenSupport = TokenSupport(config)

        fun validateToken(token: String, pwdHash: String?) = tokenSupport.validateToken(token) { pwdHash }

        it("should create and validate token") {
            // given
            val givenId = UUID(0, 0)
            val givenPwdHash = "pwdHash"
            val token = tokenSupport.createToken(givenId, givenPwdHash, encodedUserSecret)

            // when
            val userContext = tokenSupport.validateToken(token) { id ->
                id shouldBe givenId
                givenPwdHash
            }

            // then
            userContext.shouldNotBeNull().apply {
                userId shouldBe givenId
                encryptionKey.shouldNotBeNull()
            }
        }

        it("should reject token if password is different") {
            // given
            val token = tokenSupport.createToken(UUID.randomUUID(), "somePwdHash", encodedUserSecret)

            // when
            val userContext = validateToken(token, "otherPwdHash")

            // then
            userContext shouldBe null
        }

        describe("should reject invalid tokens") {
            withData(
                nameFn = { "token '$it' should be invalid" },
                "",
                "invalid token",
                "invalid.token",
                "too.few.parts",
                "far.too.many.many.token.parts",
                "token.with.very.wrong.signature"
            ) { token ->
                // when
                val userContext = tokenSupport.validateToken(token) {
                    fail("must not be called")
                }

                // then
                userContext shouldBe null
            }
        }

        describe("verify expiration after 1 day") {
            withData(
                nameFn = { (time, valid) -> "Issued at $time should be ${if (valid) "valid" else "invalid"}" },
                Instant.now() to true,
                Instant.now().minus(Duration.ofHours(1)) to true,
                Instant.now().minus(Duration.ofHours(23).plusMinutes(59)) to true,
                Instant.now().minus(Duration.ofHours(24).plusMillis(1)) to false,
            ) { (time, expectedValid) ->
                // given
                val givenPwdHash = "pwdHash"
                val token = tokenSupport.createToken(
                    UUID(0, 0),
                    givenPwdHash,
                    encodedUserSecret,
                    Clock.fixed(time, ZoneId.systemDefault())
                )

                // when
                val userContext = validateToken(token, givenPwdHash)

                // then
                if (expectedValid) {
                    userContext.shouldNotBeNull()
                } else {
                    userContext shouldBe null
                }
            }
        }
    }
})
