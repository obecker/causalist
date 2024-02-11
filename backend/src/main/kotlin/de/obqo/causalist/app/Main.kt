package de.obqo.causalist.app

import de.obqo.causalist.Config
import de.obqo.causalist.Reference
import de.obqo.causalist.Type
import de.obqo.causalist.api.TokenSupport
import de.obqo.causalist.api.authentication
import de.obqo.causalist.api.httpApi
import de.obqo.causalist.caseDocumentService
import de.obqo.causalist.caseService
import de.obqo.causalist.dynamo.dynamoCaseDocumentRepository
import de.obqo.causalist.dynamo.dynamoCaseRepository
import de.obqo.causalist.dynamo.dynamoUserRepository
import de.obqo.causalist.s3.S3BucketWrapper
import de.obqo.causalist.userService
import org.crac.Context
import org.crac.Core
import org.crac.Resource
import org.http4k.client.JavaHttpClient
import org.http4k.cloudnative.env.Environment
import org.http4k.cloudnative.env.EnvironmentKey
import org.http4k.connect.amazon.AWS_REGION
import org.http4k.connect.amazon.CredentialsChain
import org.http4k.connect.amazon.Environment
import org.http4k.connect.amazon.containercredentials.ContainerCredentials
import org.http4k.connect.amazon.dynamodb.DynamoDb
import org.http4k.connect.amazon.dynamodb.Http
import org.http4k.connect.amazon.dynamodb.model.TableName
import org.http4k.connect.amazon.s3.Http
import org.http4k.connect.amazon.s3.S3Bucket
import org.http4k.connect.amazon.s3.model.BucketName
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
import java.util.UUID

private val httpClient = JavaHttpClient()

// run the server locally with environment from .env or .env.<ENV>
fun main() {
    val env: String? = System.getenv("ENV")?.lowercase()
    val envResource = env?.let { ".env.$it" } ?: ".env"
    println("Read environment from $envResource")
    val environment = Environment.fromResource(envResource)

    val dynamoDbUriFilter = environment["DYNAMODB_URI"]?.let { SetBaseUriFrom(Uri.of(it)) } ?: Filter.NoOp
    val dynamoHttp = dynamoDbUriFilter.then(httpClient)

    val s3UriFilter = environment["S3_URI"]?.let { SetBaseUriFrom(Uri.of(it)) } ?: Filter.NoOp
    val s3Http = s3UriFilter.then(httpClient)

    val api = buildApi(
        environment = environment,
        dynamoHttp = dynamoHttp,
        s3Http = s3Http
    )

    // smoke test that the DB is available
    val response = api(Request(method = Method.POST, "/api/login").body("""{"username":"foo","password":""}"""))
    check(response.status == Status.FORBIDDEN) { response }

    api.asServer(SunHttp(9000)).start()
    println("Server started${env?.let { " with environment $it" }.orEmpty()}")
}

// entrypoint for the AWS Lambda Runtime
@Suppress("Unused")
class ApiLambdaHandler : ApiGatewayV2LambdaFunction(AppLoader { env ->
    buildApi(Environment.from(env), httpClient, httpClient)
})

private fun buildApi(
    environment: Environment,
    dynamoHttp: HttpHandler,
    s3Http: HttpHandler
): HttpHandler {
    Config.init(environment)

    val usersTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_USERS_TABLE")
    val casesTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_CASES_TABLE")
    val caseDocumentsTableKey = EnvironmentKey.value(TableName).required("CAUSALIST_CASE_DOCUMENTS_TABLE")
    val caseDocumentsBucketNameKey = EnvironmentKey.value(BucketName).required("CAUSALIST_CASE_DOCUMENTS_BUCKET")

    val credentialsProvider = CredentialsChain.ContainerCredentials(environment, httpClient)
        .orElse(CredentialsChain.Environment(environment))
        .provider()

    val dynamoDb = DynamoDb.Http(
        env = environment,
        http = dynamoHttp,
        credentialsProvider = credentialsProvider
    )

    val userRepository = dynamoUserRepository(dynamoDb, usersTableKey(environment))
    val userService = userService(userRepository)

    val authentication = authentication(userService)

    val bucketName = caseDocumentsBucketNameKey(environment)
    val s3Bucket = S3Bucket.Http(
        bucketName = bucketName,
        bucketRegion = AWS_REGION(environment),
        env = environment,
        http = s3Http,
        credentialsProvider = credentialsProvider
    )
    val s3BucketWrapper = S3BucketWrapper(bucketName, s3Bucket)

    val caseDocumentRepository = dynamoCaseDocumentRepository(dynamoDb, caseDocumentsTableKey(environment))
    val caseDocumentService = caseDocumentService(caseDocumentRepository, s3BucketWrapper)

    val caseRepository = dynamoCaseRepository(dynamoDb, casesTableKey(environment))
    val caseService = caseService(caseRepository, caseDocumentService)

    val api = httpApi(authentication, caseService, caseDocumentService)

    fun doPriming() {
        // Prime the application by executing some typical service functions
        // https://aws.amazon.com/de/blogs/compute/reducing-java-cold-starts-on-aws-lambda-functions-with-snapstart/
        val uuid = UUID.randomUUID()
        val ref = Reference.parseValue("123 O 45/67")
        caseService.get(uuid, Reference.parseId(ref.toId()))
        caseService.findByOwner(uuid, Type.CHAMBER, de.obqo.causalist.Status.entries, false)
        caseService.findByOwner(uuid, Type.SINGLE, emptyList(), true)

        val token = TokenSupport.createToken(uuid, "pwdHash", "userSecret")
        api(Request(method = Method.GET, "/api/cases").header("Authorization", "Bearer $token"))
    }

    return object : HttpHandler, Resource {

        init {
            Core.getGlobalContext().register(this)
        }

        override fun invoke(request: Request) = api(request)

        override fun beforeCheckpoint(context: Context<out Resource>?) {
            doPriming()
        }

        override fun afterRestore(context: Context<out Resource>?) {
            // nothing to do
        }
    }
}
