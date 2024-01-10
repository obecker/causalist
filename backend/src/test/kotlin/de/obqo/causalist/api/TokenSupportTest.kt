package de.obqo.causalist.api

import de.obqo.causalist.Config
import de.obqo.causalist.EncryptionKey
import de.obqo.causalist.SigningSecret
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.datatest.withData
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockkObject
import io.mockk.unmockkObject
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

class TokenSupportTest : DescribeSpec({

    beforeSpec {
        mockkObject(Config)
        every { Config.signingSecret } returns SigningSecret.of("secret")
        every { Config.encryptionKey } returns EncryptionKey.of(ByteArray(32))
    }

    afterSpec {
        unmockkObject(Config)
    }

    describe("TokenSupport") {

        fun TokenSupport.validateToken(token: String) = validateToken(token) { _, _ -> true }

        it("should create and validate token") {
            // given
            val givenId = UUID(0, 0)
            val token = TokenSupport.createToken(givenId, "pwdHash", "userSecret")

            // when
            val userContext = TokenSupport.validateToken(token) { id, pwdHash ->
                id shouldBe givenId
                pwdHash shouldBe "pwdHash"
                true
            }

            // then
            userContext.shouldNotBeNull().apply {
                userId shouldBe givenId
                encryptionKey.shouldNotBeNull()
            }
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
                TokenSupport.validateToken(token) shouldBe null
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
                val token = TokenSupport.createToken(
                    UUID(0, 0),
                    "pwdHash",
                    "secret",
                    Clock.fixed(time, ZoneId.systemDefault())
                )

                // when
                val userContext = TokenSupport.validateToken(token)

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
