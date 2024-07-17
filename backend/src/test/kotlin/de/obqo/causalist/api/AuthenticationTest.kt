package de.obqo.causalist.api

import de.obqo.causalist.Config
import de.obqo.causalist.CryptoUtils
import de.obqo.causalist.DuplicateUsernameException
import de.obqo.causalist.EncryptionSecret
import de.obqo.causalist.User
import de.obqo.causalist.UserService
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.datatest.withData
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.http4k.config.Secret
import org.http4k.core.Method
import org.http4k.core.Request
import org.http4k.core.Status
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
            password = password, // actually, this will be the hashed password - however, for test simplicity ...
            encryptedSecret = userSecret.encrypt(CryptoUtils.generatePasswordAesKey(password, "dummySalt"))
        )

    fun register(username: String, password: String) = authentication.registrationHandler(
        Request(Method.POST, "/register").with(
            loginLens of Login(username, password)
        )
    )

    fun login(username: String, password: String) = authentication.loginHandler(
        Request(Method.POST, "/login").with(
            loginLens of Login(username, password)
        )
    )

    beforeAny {
        clearMocks(userServiceMock)
    }

    describe("registrationHandler") {

        it("should successfully register user") {
            // given
            every { userServiceMock.register(any(), any(), any()) } returns givenUser()

            // when
            val response = register("username", "Secret@1234")

            // then
            response.status shouldBe Status.OK
            val result = resultLens(response)
            result.success shouldBe true
            result.message shouldBe null
            result.token shouldBe null

            verify { userServiceMock.register("username", "Secret@1234", any()) }
        }

        describe("should reject insufficient parameters") {
            withData(
                nameFn = { (username, password) -> "$username, $password" },
                "abc" to "12345ABcde", // short username
                "abcde" to "Pwd@123!X", // short password
            ) { (username, password) ->

                // when
                val response = register(username, password)

                // then
                response.status shouldBe Status.BAD_REQUEST
                val result = resultLens(response)
                result.success shouldBe false
                result.message.shouldNotBeNull()
            }
        }

        it("should reject existing username") {
            // given
            every { userServiceMock.register(any(), any(), any()) } throws DuplicateUsernameException("username")

            // when
            val response = register("username", "Secret@1234")

            // then
            response.status shouldBe Status.CONFLICT
            val result = resultLens(response)
            result.success shouldBe false
            result.message shouldBe "Username exists"
            result.token shouldBe null
        }
    }

    describe("loginHandler") {

        it("should return success on successful login") {
            // given
            val user = givenUser()
            every { userServiceMock.login(user.username, user.password) } returns user

            // when
            val response = login(user.username, user.password)

            // then
            response.status shouldBe Status.OK
            val result = resultLens(response)

            result.success shouldBe true
            result.message shouldBe null
            result.token.shouldNotBeNull()
        }

        it("should return failure on unsuccessful login") {
            // given
            every { userServiceMock.login(any(), any()) } returns null

            // when
            val response = login("someUser", "somePass")

            // then
            response.status shouldBe Status.FORBIDDEN
            val result = resultLens(response)

            result.success shouldBe false
            result.message shouldBe "Authentication failed"
            result.token shouldBe null
        }
    }

    describe("contextLookup") {

        fun successfulLogin(user: User): String {
            every { userServiceMock.login(user.username, user.password) } returns user

            val response = login(user.username, user.password)
            return resultLens(response).token!!
        }

        val userSecret = EncryptionSecret.randomSecret()
        val user = givenUser(userSecret)
        val token = successfulLogin(user)

        it("should succeed with correct token") {
            // given
            every { userServiceMock.get(user.id) } returns user

            // when
            val userContext = authentication.contextLookup(token)

            // then
            userContext.shouldNotBeNull()
            userContext.userId shouldBe user.id
            userContext.encryptionKey shouldBe (appSecret xor userSecret).toSecretKey()
        }

        it("should fail with wrong token - wrong format") {
            // given
            every { userServiceMock.get(user.id) } returns user

            // when
            val userContext = authentication.contextLookup("illegalDummyToken")

            // then
            userContext.shouldBeNull()
        }

        it("should fail with wrong token - different passwords") {
            // given
            val anotherUser = givenUser(password = "differentPassword")

            every { userServiceMock.get(user.id) } returns anotherUser

            // when
            val userContext = authentication.contextLookup(token)

            // then
            userContext.shouldBeNull()
        }

        it("should fail with wrong token - user not found") {
            // given
            every { userServiceMock.get(user.id) } returns null

            // when
            val userContext = authentication.contextLookup(token)

            // then
            userContext.shouldBeNull()
        }

        it("should pass through exception thrown by userService") {
            // given
            val thrownException = Exception("db access failed")
            every { userServiceMock.get(user.id) } throws thrownException

            // expect
            shouldThrow<Exception> {
                authentication.contextLookup(token)
            } shouldBe thrownException
        }
    }
})
