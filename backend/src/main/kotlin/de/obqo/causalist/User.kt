package de.obqo.causalist

import de.obqo.causalist.CryptoUtils.generatePasswordHash
import de.obqo.causalist.CryptoUtils.verifyPasswordHash
import java.time.Instant
import java.util.UUID

data class User(
    val id: UUID = UUID.randomUUID(),
    val username: String,
    val password: String,
    val encryptedSecret: String,
    val lastLogin: Instant? = null
)

class DuplicateUsernameException(username: String) : IllegalArgumentException("Duplicate username: $username")

interface UserRepository : CrudRepository<User, UUID, Unit> {
    fun findByUsername(username: String): User?
}

interface UserService {
    fun register(username: String, password: String, encryptedSecret: String): User
    fun login(username: String, password: String): User?
    fun get(id: UUID): User?
}

fun userService(repository: UserRepository): UserService {

    return object : UserService {

        override fun register(username: String, password: String, encryptedSecret: String): User {
            repository.findByUsername(username)?.let { throw DuplicateUsernameException(username) }
            return repository.save(
                User(
                    username = username,
                    password = generatePasswordHash(password),
                    encryptedSecret = encryptedSecret
                )
            )
        }

        override fun login(username: String, password: String): User? =
            repository.findByUsername(username)
                .also {
                    // perform the same amount of work when the username was wrong
                    // (so the timing of the login will be the same for a wrong username and a wrong password)
                    if (it == null) generatePasswordHash("dummy")
                }
                ?.takeIf { verifyPasswordHash(password, it.password) }
                ?.let { repository.save(it.copy(lastLogin = Instant.now())) }

        override fun get(id: UUID) = repository.get(id)
    }
}
