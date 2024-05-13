package de.obqo.causalist

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.date.shouldBeAfter
import io.kotest.matchers.date.shouldBeBefore
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import java.time.Instant

class UserServiceTest : DescribeSpec({

    describe("UserService") {

        val userRepository = fakeUserRepository
        val userService = userService(userRepository)

        val username = "testUser"
        val clearPassword = "123456"
        val encryptedSecret = "dummy"

        afterEach {
            userRepository.deleteAll()
        }

        it("should register users") {
            // when
            val user = userService.register(username, clearPassword, encryptedSecret)

            // then
            user.username shouldBe username
            user.password shouldNotBe clearPassword
            user.encryptedSecret shouldBe encryptedSecret
            user.lastLogin shouldBe null
        }

        it("should prevent duplicate usernames") {
            // given
            userService.register(username, clearPassword, encryptedSecret)

            // then
            shouldThrow<DuplicateUsernameException> {
                userService.register(username, clearPassword, encryptedSecret)
            }.apply {
                message shouldBe "Duplicate username: $username"
            }
        }

        it("should login user") {
            // given
            val registeredAt = Instant.now()
            val registeredUser = userService.register(username, clearPassword, encryptedSecret)

            // when
            val loggedInUser = userService.login(username, clearPassword)

            // then
            loggedInUser.shouldNotBeNull()
            loggedInUser.id shouldBe registeredUser.id
            loggedInUser.username shouldBe registeredUser.username
            loggedInUser.password shouldBe registeredUser.password
            loggedInUser.encryptedSecret shouldBe registeredUser.encryptedSecret
            loggedInUser.lastLogin.shouldNotBeNull().apply {
                shouldBeAfter(registeredAt)
                shouldBeBefore(Instant.now())
            }
        }

        it("should reject wrong user or wrong password") {
            // given
            userService.register(username, clearPassword, encryptedSecret)

            // then
            userService.login("otherUser", clearPassword) shouldBe null
            userService.login(username, "wrong password") shouldBe null
        }
    }
})
