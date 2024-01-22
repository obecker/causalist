package de.obqo.causalist.app

import de.obqo.causalist.Config
import de.obqo.causalist.Status.APPRAISERS_REPORT
import de.obqo.causalist.Status.ORDER_FOR_EVIDENCE
import de.obqo.causalist.Status.SESSION_TO_BE_SCHEDULED
import de.obqo.causalist.Status.WRITTEN_PRELIMINARY_PROCEDURE
import de.obqo.causalist.api.authentication
import de.obqo.causalist.api.httpApi
import de.obqo.causalist.caseService
import de.obqo.causalist.dynamo.dynamoCaseRepository
import de.obqo.causalist.dynamo.dynamoUserRepository
import de.obqo.causalist.userService
import org.http4k.client.Java8HttpClient
import org.http4k.cloudnative.env.Environment
import org.http4k.cloudnative.env.EnvironmentKey
import org.http4k.connect.amazon.dynamodb.DynamoDb
import org.http4k.connect.amazon.dynamodb.Http
import org.http4k.connect.amazon.dynamodb.model.TableName
import org.http4k.core.Filter
import org.http4k.core.HttpHandler
import org.http4k.core.Method
import org.http4k.core.NoOp
import org.http4k.core.Request
import org.http4k.core.Status
import org.http4k.core.Uri
import org.http4k.core.then
import org.http4k.filter.ClientFilters.SetBaseUriFrom
import org.http4k.lens.value
import org.http4k.server.SunHttp
import org.http4k.server.asServer
import org.http4k.serverless.ApiGatewayV2LambdaFunction
import org.http4k.serverless.AppLoader

// run the server locally with environment from .env or .env.<ENV>
fun main() {
    val env: String? = System.getenv("ENV")?.lowercase()
    val envResource = env?.let { ".env.$it" } ?: ".env"
    println("Read environment from $envResource")
    val environment = Environment.fromResource(envResource)

    val dynamoDbUriFilter = environment["DYNAMODB_URI"]?.let { SetBaseUriFrom(Uri.of(it)) } ?: Filter.NoOp
    val dynamoDb = DynamoDb.Http(
        env = environment,
        http = dynamoDbUriFilter.then(Java8HttpClient())
    )
    val api = buildApi(environment, dynamoDb)

    // smoke test that the DB is available
    val response = api(Request(method = Method.POST, "/api/login").body("""{"username":"foo","password":""}"""))
    check(response.status == Status.FORBIDDEN) { response }

    api.asServer(SunHttp(9000)).start()
    println("Server started${env?.let { " with environment $it" }.orEmpty()}")
}

// entrypoint for the AWS Lambda Runtime
@Suppress("Unused")
class ApiLambdaHandler : ApiGatewayV2LambdaFunction(AppLoader {
    val environment = Environment.from(it)
    val dynamoDb = DynamoDb.Http(
        env = environment,
        http = Java8HttpClient()
    )
    buildApi(environment, dynamoDb)
})

private fun buildApi(
    environment: Environment,
    dynamoDb: DynamoDb
): HttpHandler {
    Config.init(environment)

    val usersTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_USERS_TABLE")
    val casesTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_CASES_TABLE")

    val userRepository = dynamoUserRepository(dynamoDb, usersTableKey(environment))
    val userService = userService(userRepository)

    val caseRepository = dynamoCaseRepository(dynamoDb, casesTableKey(environment))
    val caseService = caseService(caseRepository)

    val authentication = authentication(userService)

    // migration of deprecated status values
    userRepository.findAll().forEach { user ->
        val migrated = caseRepository.findByOwner(user.id, status = listOf(ORDER_FOR_EVIDENCE, SESSION_TO_BE_SCHEDULED))
            .map {
                it.copy(
                    status = when (it.status) {
                        ORDER_FOR_EVIDENCE -> WRITTEN_PRELIMINARY_PROCEDURE
                        SESSION_TO_BE_SCHEDULED -> APPRAISERS_REPORT
                        else -> error(it.status) // must not happen
                    }
                )
            }
            .toList()
        caseRepository.save(migrated)
    }

    return httpApi(authentication, caseService)
}
