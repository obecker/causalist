package de.obqo.causalist.app

import de.obqo.causalist.Config
import de.obqo.causalist.CryptoUtils
import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
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
import de.obqo.causalist.toBase64
import de.obqo.causalist.userService
import dev.failsafe.Failsafe
import dev.failsafe.RetryPolicy
import io.github.oshai.kotlinlogging.KLogger
import io.github.oshai.kotlinlogging.KotlinLogging
import org.crac.Context
import org.crac.Core
import org.crac.Resource
import org.http4k.client.JavaHttpClient
import org.http4k.cloudnative.env.Environment
import org.http4k.connect.amazon.AWS_REGION
import org.http4k.connect.amazon.CredentialsChain
import org.http4k.connect.amazon.Environment
import org.http4k.connect.amazon.containercredentials.ContainerCredentials
import org.http4k.connect.amazon.dynamodb.DynamoDb
import org.http4k.connect.amazon.dynamodb.Http
import org.http4k.connect.amazon.s3.Http
import org.http4k.connect.amazon.s3.S3Bucket
import org.http4k.core.HttpHandler
import org.http4k.core.Method
import org.http4k.core.Request
import org.http4k.core.Response
import org.http4k.core.Status
import org.http4k.core.then
import org.http4k.filter.FailsafeFilter
import org.http4k.server.SunHttp
import org.http4k.server.asServer
import org.http4k.serverless.ApiGatewayV2LambdaFunction
import org.http4k.serverless.AppLoader
import java.time.Duration
import java.util.UUID

private val logger: KLogger = KotlinLogging.logger {}

// run the server locally with environment from .env or .env.<ENV>
fun main() {
    val env: String? = System.getenv("ENV")?.lowercase()
    val envResource = env?.let { ".env.$it" } ?: ".env"
    println("Read environment from $envResource")
    val environment = Environment.fromResource(envResource)

    val api = buildApi(environment)

    // smoke test that the DB is available
    val response = api(Request(method = Method.POST, "/api/login").body("""{"username":"foo","password":""}"""))
    check(response.status == Status.FORBIDDEN) { response }

    api.asServer(SunHttp(4000)).start().also {
        println("Server started${env?.let { " with environment $env" }.orEmpty()}")
    }.block()
}

// entrypoint for the AWS Lambda Runtime
@Suppress("Unused")
class ApiLambdaHandler : ApiGatewayV2LambdaFunction(AppLoader { env ->
    buildApi(Environment.from(env))
})

private fun buildApi(environment: Environment): HttpHandler {

    val config = Config(environment)

    val retryPolicy = RetryPolicy.builder<Response>()
        .handleIf { response, ex -> ex != null || response?.status?.serverError == true }
        .onRetry { event ->
            logger.warn(event.lastException) { "Request failed with ${event.lastResult?.status}, will retry" }
        }
        .withMaxRetries(5)
        .withBackoff(Duration.ofMillis(100), Duration.ofSeconds(2))
        .withJitter(0.5)
        .build()
    val httpClient = FailsafeFilter(Failsafe.with(retryPolicy))
        .then(JavaHttpClient())

    val credentialsProvider = CredentialsChain.ContainerCredentials(environment, httpClient)
        .orElse(CredentialsChain.Environment(environment))
        .provider()

    val dynamoDb = DynamoDb.Http(
        env = environment,
        http = httpClient,
        credentialsProvider = credentialsProvider,
        overrideEndpoint = config.optionalDynamoDbUri
    )

    val userRepository = dynamoUserRepository(dynamoDb, config.usersTable)
    val userService = userService(userRepository)

    val authentication = authentication(userService, config)

    val s3Bucket = S3Bucket.Http(
        bucketName = config.caseDocumentsBucketName,
        bucketRegion = AWS_REGION(environment),
        credentialsProvider = credentialsProvider,
        http = httpClient,
        overrideEndpoint = config.optionalS3Uri,
        forcePathStyle = config.optionalS3Uri != null,
    )
    val s3BucketWrapper = S3BucketWrapper(config.caseDocumentsBucketName, s3Bucket)

    val caseDocumentRepository = dynamoCaseDocumentRepository(dynamoDb, config.caseDocumentsTable)
    val caseDocumentService = caseDocumentService(caseDocumentRepository, s3BucketWrapper)

    val caseRepository = dynamoCaseRepository(dynamoDb, config.casesTable)
    val caseService = caseService(caseRepository, caseDocumentService)

    val api = httpApi(authentication, caseService, caseDocumentService)

    fun doPriming() {
        // Prime the application by executing some typical functions
        // https://aws.amazon.com/de/blogs/compute/reducing-java-cold-starts-on-aws-lambda-functions-with-snapstart/
        val dummyUuid = UUID.randomUUID()
        val ref = Reference.parseValue("123 O 45/67")
        caseService.get(dummyUuid, Reference.parseId(ref.toId()))
        caseService.findByOwner(dummyUuid, Type.CHAMBER, de.obqo.causalist.Status.entries, false)
        caseService.findByOwner(dummyUuid, Type.SINGLE, emptyList(), true)

        // config needs to be recreated, since secrets have been consumed already
        val tokenSupport = TokenSupport(Config(environment))
        val dummySecret = ByteArray(32) { it.toByte() }.toBase64()
        val token = tokenSupport.createToken(dummyUuid, "pwdHash", dummySecret)
        api(Request(method = Method.GET, "/api/cases").header("Authorization", "Bearer $token"))

        val key = CryptoUtils.generateRandomAesKey()
        token.encrypt(key).decrypt(key)
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
