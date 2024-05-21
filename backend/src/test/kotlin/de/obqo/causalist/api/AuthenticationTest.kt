package de.obqo.causalist.api

import de.obqo.causalist.Config
import de.obqo.causalist.CryptoUtils
import de.obqo.causalist.EncryptionSecret
import de.obqo.causalist.User
import de.obqo.causalist.UserService
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.mockk
import org.http4k.cloudnative.env.Secret
import org.http4k.core.Method
import org.http4k.core.Request
import org.http4k.core.with
import java.util.UUID

class AuthenticationTest : DescribeSpec({

    val loginLens = causalistJson.autoBody<Login>().toLens()
    val resultLens = causalistJson.autoBody<Result>().toLens()

    val userServiceMock = mockk<UserService>()

    val appSecret = EncryptionSecret.randomSecret()
    val configMock = mockk<Config>()
    every { configMock.passwordSalt } returns Secret("dummySalt")
    every { configMock.signingSecret } returns Secret("dummySecret")
    every { configMock.encryptionSecret } returns appSecret

    val authentication = authentication(userServiceMock, configMock)

    fun givenUser(userSecret: EncryptionSecret = EncryptionSecret.randomSecret(), password: String = "dummyPassword") =
        User(
            id = UUID.randomUUID(),
            username = "dummyUser",
            password = password, // actually, this should be the hashed password - however, for test simplicity ...
            encryptedSecret = userSecret.encrypt(CryptoUtils.generatePasswordAesKey(password, "dummySalt"))
        )

    fun login(user: User): String {
        every { userServiceMock.login(user.username, user.password) } returns user

        val response = authentication.loginHandler(
            Request(Method.POST, "/login").with(
                loginLens of Login(user.username, user.password)
            )
        )
        val result = resultLens(response)
        result.success shouldBe true

        val token = result.token
        token.shouldNotBeNull()

        return token
    }

    beforeAny {
        clearMocks(userServiceMock)
    }

    describe("contextLookup") {
        it("should succeed with correct token") {
            // given
            val userSecret = EncryptionSecret.randomSecret()
            val user = givenUser(userSecret)
            val token = login(user)

            every { userServiceMock.get(user.id) } returns user

            // when
            val userContext = authentication.contextLookup(token)

            // then
            userContext.shouldNotBeNull()
            userContext.userId shouldBe user.id
            userContext.encryptionKey shouldBe (appSecret xor userSecret).toSecretKey()
        }

        it("should fail with wrong token - different passwords") {
            // given
            val user = givenUser()
            val token = login(user)

            val anotherUser = givenUser(password = "differentPassword")

            every { userServiceMock.get(user.id) } returns anotherUser

            // when
            val userContext = authentication.contextLookup(token)

            // then
            userContext.shouldBeNull()
        }

        it("should fail with wrong token - user not found") {
            // given
            val user = givenUser()
            val token = login(user)

            every { userServiceMock.get(user.id) } returns null

            // when
            val userContext = authentication.contextLookup(token)

            // then
            userContext.shouldBeNull()
        }

        it("should pass through exception thrown by userService") {
            // given
            val user = givenUser()
            val token = login(user)

            val thrownException = Exception("db access failed")
            every { userServiceMock.get(user.id) } throws thrownException

            // expect
            shouldThrow<Exception> {
                authentication.contextLookup(token)
            } shouldBe thrownException
        }
    }
})
