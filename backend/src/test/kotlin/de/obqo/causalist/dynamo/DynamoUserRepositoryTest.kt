package de.obqo.causalist.dynamo

import de.obqo.causalist.User
import de.obqo.causalist.fakeUserRepository
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import java.util.UUID

class DynamoUserRepositoryTest : DescribeSpec({

    describe("DynamoUserRepository") {

        val repo = fakeUserRepository

        afterEach {
            repo.deleteAll()
        }

        it("should save and get users") {
            // given
            val user1 = User(username = "me", password = "123456", encryptedSecret = "dummy")
            val user2 = User(username = "myself", password = "abcdef", encryptedSecret = "dummy")

            // when
            repo.save(user1)
            repo.save(user2)

            // then
            repo.get(user1.id) shouldBe user1
            repo.get(user2.id) shouldBe user2
            repo.get(UUID.randomUUID()) shouldBe null
        }

        it("should overwrite user with same ID") {
            // given
            val user1 = User(username = "me", password = "123456", encryptedSecret = "dummy")
            val user2 = user1.copy(username = "myself", password = "abcdef", encryptedSecret = "dummy")

            // when
            repo.save(user1)
            repo.save(user2)

            // then
            repo.get(user1.id) shouldBe user2
        }

        it("should find user by username") {
            // given
            val user1 = User(username = "me", password = "123456", encryptedSecret = "dummy")
            val user2 = User(username = "myself", password = "abcdef", encryptedSecret = "dummy")

            // when
            repo.save(user1)
            repo.save(user2)

            // then
            repo.findByUsername(user1.username) shouldBe user1
            repo.findByUsername(user2.username) shouldBe user2
            repo.findByUsername("dummy") shouldBe null
        }
    }
})
