package de.obqo.causalist.api

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import de.obqo.causalist.CaseDocumentService
import de.obqo.causalist.CaseExistsException
import de.obqo.causalist.CaseMissingException
import de.obqo.causalist.CaseService
import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.Reference
import de.obqo.causalist.Status
import de.obqo.causalist.Type
import io.github.oshai.kotlinlogging.KLogger
import io.github.oshai.kotlinlogging.KotlinLogging
import org.http4k.contract.PreFlightExtraction
import org.http4k.contract.contract
import org.http4k.contract.div
import org.http4k.contract.meta
import org.http4k.contract.openapi.ApiInfo
import org.http4k.contract.openapi.v3.OpenApi3
import org.http4k.contract.openapi.v3.OpenApi3ApiRenderer
import org.http4k.contract.security.BearerAuthSecurity
import org.http4k.contract.ui.swaggerUiLite
import org.http4k.core.Body
import org.http4k.core.ContentType
import org.http4k.core.Filter
import org.http4k.core.HttpHandler
import org.http4k.core.Method.DELETE
import org.http4k.core.Method.GET
import org.http4k.core.Method.POST
import org.http4k.core.Method.PUT
import org.http4k.core.RequestContexts
import org.http4k.core.Response
import org.http4k.core.Status.Companion.CONFLICT
import org.http4k.core.Status.Companion.CREATED
import org.http4k.core.Status.Companion.INTERNAL_SERVER_ERROR
import org.http4k.core.Status.Companion.NOT_FOUND
import org.http4k.core.Status.Companion.NO_CONTENT
import org.http4k.core.Status.Companion.OK
import org.http4k.core.then
import org.http4k.core.with
import org.http4k.filter.ServerFilters
import org.http4k.format.ConfigurableMoshi
import org.http4k.format.ListAdapter
import org.http4k.format.MapAdapter
import org.http4k.format.asConfigurable
import org.http4k.format.withStandardMappings
import org.http4k.lens.MultipartFormField
import org.http4k.lens.MultipartFormFile
import org.http4k.lens.Path
import org.http4k.lens.Query
import org.http4k.lens.RequestContextKey
import org.http4k.lens.StringBiDiMappings.enum
import org.http4k.lens.Validator
import org.http4k.lens.binary
import org.http4k.lens.boolean
import org.http4k.lens.localDate
import org.http4k.lens.map
import org.http4k.lens.multipartForm
import org.http4k.lens.string
import org.http4k.lens.uuid
import org.http4k.routing.bind
import org.http4k.routing.routes
import se.ansman.kotshi.KotshiJsonAdapterFactory
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

private val logger: KLogger = KotlinLogging.logger {}

@KotshiJsonAdapterFactory
private object CausalistJsonAdapterFactory : JsonAdapter.Factory by KotshiCausalistJsonAdapterFactory

// configure JSON AutoMarshalling without reflection, via Kotshi
val causalistJson = ConfigurableMoshi(
    Moshi.Builder()
        .add(CausalistJsonAdapterFactory)
        .add(ListAdapter)
        .add(MapAdapter)
        .asConfigurable()
        .withStandardMappings()
        .done()
)

val caseLens = causalistJson.autoBody<CaseResource>().toLens()
val casesLens = causalistJson.autoBody<CasesResource>().toLens()
val statusQueryLens = Query.map(enum<Status>()).multi.defaulted("status[]", emptyList())
val typeQueryLens = Query.map(enum<Type>()).optional("type")
val settledQueryLens = Query.boolean().defaulted("settled", false)

val uploadPart = MultipartFormFile.required("upload")
val datePart = MultipartFormField.string().localDate().required("date")
val importCasesFormLens = Body.multipartForm(Validator.Strict, uploadPart, datePart).toLens()
val importResultLens = causalistJson.autoBody<ImportResult>().toLens()

val filenamePart = MultipartFormField.string().required("filename")
val uploadCaseDocumentLens = Body.multipartForm(Validator.Strict, uploadPart, filenamePart).toLens()
val caseDocumentLens = causalistJson.autoBody<CaseDocumentResource>().toLens()
val caseDocumentsLens = causalistJson.autoBody<CaseDocumentsResource>().toLens()

object Spec {

    private val reference = Reference.parseValue("123 O 1/23")
    private val referenceSample = reference.toResource()
    private val getCaseSample = CaseResource(
        reference.toId(), referenceSample, Type.SINGLE.name, "", "", "", Status.SESSION.name, "",
        "red", LocalDate.now(), null, LocalDate.now().plusDays(7), null, null, false, Instant.now()
    )
    private val postCaseSample = getCaseSample.copy(id = null, updatedAt = null)
    private val casesSample = CasesResource(listOf(getCaseSample))
    private val importResultSample = ImportResult(
        ImportType.NEW_CASES,
        listOf("123 O 45/23", "123 O 67/23", "123 O 12/24"),
        listOf("123 O 3/23"),
        listOf("123 O 4/23"),
        listOf("Unknown reference")
    )
    private val documentSample = CaseDocumentResource(UUID.randomUUID(), "foobar.txt")
    private val documentsSample = CaseDocumentsResource(listOf(documentSample))

    val listCases = "/cases" meta {
        operationId = "listCases"
        summary = "list cases"
        queries += statusQueryLens
        queries += typeQueryLens
        queries += settledQueryLens
        returning(OK, casesLens to casesSample)
    } bindContract GET

    val createCase = "/cases" meta {
        operationId = "createCase"
        summary = "create case"
        receiving(caseLens to postCaseSample)
        returning(CREATED, caseLens to getCaseSample)
    } bindContract POST

    val importCases = "/cases/import" meta {
        operationId = "importCases"
        summary = "import cases"
        preFlightExtraction = PreFlightExtraction.IgnoreBody // avoid reading the multipart stream twice
        receiving(importCasesFormLens)
        returning(OK, importResultLens to importResultSample)
    } bindContract POST

    val getCase = "/cases" / Path.string().of("refId") meta {
        operationId = "getCase"
        summary = "get case by ID"
        returning(OK, caseLens to getCaseSample)
    } bindContract GET

    val putCase = "/cases" / Path.string().of("refId") meta {
        operationId = "putCase"
        summary = "update case by ID"
        returning(OK)
    } bindContract PUT

    val deleteCase = "/cases" / Path.string().of("refId") meta {
        operationId = "deleteCase"
        summary = "delete case by ID"
        returning(NO_CONTENT)
    } bindContract DELETE

    val uploadDocument = "/cases" / Path.string().of("refId") / "documents" meta {
        operationId = "uploadDocument"
        summary = "upload a document for a case"
        preFlightExtraction = PreFlightExtraction.IgnoreBody // avoid reading the multipart stream twice
        receiving(uploadCaseDocumentLens)
        returning(OK, caseDocumentLens to documentSample)
    } bindContract POST

    val downloadDocument = "/cases" / Path.string().of("refId") / "documents" / Path.uuid().of("docId") meta {
        val contentType = ContentType.OCTET_STREAM
        operationId = "downloadDocument"
        summary = "download a document"
        produces += contentType
        returning(OK, Body.binary(contentType).toLens() to "example".byteInputStream())
    } bindContract GET

    val deleteDocument = "/cases" / Path.string().of("refId") / "documents" / Path.uuid().of("docId") meta {
        operationId = "deleteDocument"
        summary = "delete a document"
        returning(NO_CONTENT)
    } bindContract DELETE

    val getDocuments = "/cases" / Path.string().of("refId") / "documents" meta {
        operationId = "getDocuments"
        summary = "get the list of attached documents for a case"
        returning(OK, caseDocumentsLens to documentsSample)
    } bindContract GET
}

fun httpApi(
    authentication: Authentication,
    caseService: CaseService,
    caseDocumentService: CaseDocumentService
): HttpHandler {
    val contexts = RequestContexts()
    val userContextKey = RequestContextKey.required<UserContext>(contexts)

    val registrationRoute = "/register" bind POST to authentication.registrationHandler
    val loginRoute = "/login" bind POST to authentication.loginHandler

    fun listCases(): HttpHandler = { request ->
        val (userId, encryptionKey) = userContextKey(request)
        logger.info { "List cases" }
        val status = statusQueryLens(request)
        val type = typeQueryLens(request)
        val settled = settledQueryLens(request)
        val cases = caseService.findByOwner(userId, type, status, settled)
        Response(OK).with(casesLens of cases.toList().toResource(encryptionKey))
    }

    fun createCase(): HttpHandler = { request ->
        logger.info { "Create cases" }
        val resource = caseLens(request)
        val (userId, encryptionKey) = userContextKey(request)
        runCatching { caseService.persist(resource.toEntity(userId, encryptionKey)) }
            .map { case -> Response(CREATED).with(caseLens of case.toResource(encryptionKey)) }
            .getOrElse { error ->
                logger.error(error) { "Error creating case" }
                if (error is CaseExistsException) {
                    Response(CONFLICT).body("Case with reference ${resource.ref} already exists")
                } else {
                    Response(INTERNAL_SERVER_ERROR).body(error.message ?: "Error creating case")
                }
            }
    }

    fun importCases(): HttpHandler = { request ->
        logger.info { "Import cases" }
        val (userId, encryptionKey) = userContextKey(request)
        importCasesFormLens(request).use {
            val file = uploadPart(it)
            val importDate = datePart(it)
            val result = importCases(file.content, importDate, caseService, userId, encryptionKey)
            Response(OK).with(importResultLens of result)
        }
    }

    fun getCase(refId: String): HttpHandler = { request ->
        logger.info { "Get case $refId" }
        val (userId, encryptionKey) = userContextKey(request)
        caseService.get(userId, refId)
            ?.let { case -> Response(OK).with(caseLens of case.toResource(encryptionKey)) }
            ?: Response(NOT_FOUND)
    }

    fun updateCase(refId: String): HttpHandler = { request ->
        logger.info { "Update case $refId" }
        val resource = caseLens(request)
        val (userId, encryptionKey) = userContextKey(request)
        val caseToUpdate = resource.toEntity(userId, encryptionKey)
        runCatching {
            val currentReference = Reference.parseId(refId)
            if (caseToUpdate.ref == currentReference) {
                caseService.update(caseToUpdate)
            } else {
                caseService.move(caseToUpdate, currentReference)
            }
        }
            .map { case -> Response(OK).with(caseLens of case.toResource(encryptionKey)) }
            .getOrElse { error ->
                logger.error(error) { "Error updating case" }
                when (error) {
                    is IllegalArgumentException,
                    is CaseMissingException -> {
                        Response(NOT_FOUND).body("Case with id $refId doesn't exist")
                    }
                    is CaseExistsException -> {
                        Response(CONFLICT).body("Case with reference ${caseToUpdate.ref} already exists")
                    }

                    else -> {
                        Response(INTERNAL_SERVER_ERROR).body(error.message ?: "Error updating case")
                    }
                }
            }
    }

    fun deleteCase(refId: String): HttpHandler = { request ->
        logger.info { "Delete case $refId" }
        val (userId) = userContextKey(request)
        caseService.get(userId, refId)?.let { case ->
            caseService.delete(case)
            Response(NO_CONTENT)
        } ?: Response(NOT_FOUND)
    }

    fun uploadDocument(refId: String, @Suppress("UNUSED_PARAMETER") unused: String): HttpHandler = { request ->
        logger.info { "Upload document" }
        val (userId, encryptionKey) = userContextKey(request)
        val doc = uploadCaseDocumentLens(request).use {
            val file = uploadPart(it)
            val filename = filenamePart(it)
            caseDocumentService.upload(
                userId,
                refId,
                filename.encrypt(encryptionKey),
                file.content.encrypt(encryptionKey)
            )
        }
        caseService.update(userId, refId) { it.copy(hasDocuments = true) }
        Response(OK).with(caseDocumentLens of doc.toResource(encryptionKey))
    }

    fun downloadDocument(refId: String, @Suppress("UNUSED_PARAMETER") unused: String, docId: UUID): HttpHandler =
        { request ->
            logger.info { "Download document $docId" }
            val (userId, encryptionKey) = userContextKey(request)
            caseDocumentService.download(userId, docId, refId)?.decrypt(encryptionKey)?.let {
                Response(OK).body(it)
            } ?: Response(NOT_FOUND)
        }

    fun deleteDocument(refId: String, @Suppress("UNUSED_PARAMETER") unused: String, docId: UUID): HttpHandler =
        { request ->
            logger.info { "Delete document $docId" }
            val (userId) = userContextKey(request)
            caseDocumentService.delete(userId, docId, refId)
            if (caseDocumentService.getForCase(userId, refId).none()) {
                caseService.update(userId, refId) { it.copy(hasDocuments = false) }
            }
            Response(NO_CONTENT)
        }

    fun getDocuments(refId: String, @Suppress("UNUSED_PARAMETER") unused: String): HttpHandler = { request ->
        logger.info { "Download documents for case ${Reference.parseId(refId)}" }
        val (userId, encryptionKey) = userContextKey(request)
        caseService.get(userId, refId)?.let { case -> caseDocumentService.getForCase(case) }
            ?.let { documents ->
                Response(OK).with(
                    caseDocumentsLens of documents.toList().toResource(encryptionKey)
                )
            }
            ?: Response(NOT_FOUND)
    }

    val bearerAuth = ServerFilters.BearerAuth(userContextKey, authentication.contextLookup)

    val api = contract {

        routes += listOf(
            Spec.listCases to ::listCases,
            Spec.createCase to ::createCase,
            Spec.importCases to ::importCases,
            Spec.getCase to ::getCase,
            Spec.putCase to ::updateCase,
            Spec.deleteCase to ::deleteCase,
            Spec.uploadDocument to ::uploadDocument,
            Spec.downloadDocument to ::downloadDocument,
            Spec.deleteDocument to ::deleteDocument,
            Spec.getDocuments to ::getDocuments
        )

        // generate OpenApi spec with non-reflective JSON provider
        renderer = OpenApi3(
            apiInfo = ApiInfo("Causalist API", "1.0"),
            json = causalistJson,
            apiRenderer = OpenApi3ApiRenderer(causalistJson)
        )
        descriptionPath = "/docs/openapi.json"
        security = BearerAuthSecurity(bearerAuth)
    }

    val openapi = swaggerUiLite {
        url = "/api/docs/openapi.json"
        pageTitle = "Causalist API 1.0"
    }

    @Suppress("UNUSED_VARIABLE")
    val logRequest = Filter { next: HttpHandler ->
        { request ->
            logger.info { "${request.method} ${request.uri}\n${request.headers.joinToString("\n") { "${it.first}: ${it.second}" }}" }
            next(request)
        }
    }

    return ServerFilters.InitialiseRequestContext(contexts)
//        .then(logRequest)
        .then(ServerFilters.CatchAll { t ->
            logger.error(t) { "Caught ${t.message}" }
            if (t !is Exception) {
                throw t
            }
            Response(INTERNAL_SERVER_ERROR)
        })
        .then(routes("/api" bind routes(registrationRoute, loginRoute, api, openapi)))
}
