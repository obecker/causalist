package de.obqo.causalist.api

import com.rtfparserkit.parser.RtfListenerAdaptor
import com.rtfparserkit.parser.RtfStreamSource
import com.rtfparserkit.parser.standard.StandardRtfParser
import com.rtfparserkit.rtf.Command
import de.obqo.causalist.Case
import de.obqo.causalist.CaseService
import de.obqo.causalist.Reference
import de.obqo.causalist.Status.DECISION
import de.obqo.causalist.Status.SESSION
import de.obqo.causalist.Status.SETTLED
import de.obqo.causalist.Status.UNKNOWN
import de.obqo.causalist.Type.CHAMBER
import de.obqo.causalist.Type.SINGLE
import se.ansman.kotshi.JsonSerializable
import java.io.InputStream
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.UUID
import javax.crypto.SecretKey

enum class ImportType {
    NEW_CASES, SETTLED_CASES, UPDATED_RECEIVED_DATES, UPDATED_DUE_DATES
}

@JsonSerializable
data class ImportResult(
    val importType: ImportType?,
    val importedCaseRefs: List<String>,
    val settledCaseRefs: List<String>,
    val updatedCaseRefs: List<String>,
    val ignoredCaseRefs: List<String>,
    val unknownCaseRefs: List<String>,
    val errors: List<String>
)

private val localDateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

private fun MutableList<String>.addCase(case: Case) = add(case.ref.toValue())

fun importCases(
    stream: InputStream,
    importDate: LocalDate,
    caseService: CaseService,
    currentUserId: UUID,
    secretKey: SecretKey
): ImportResult {
    val source = RtfStreamSource(stream)
    val parser = StandardRtfParser()
    val listener = CaseRtfImporter(importDate)

    parser.parse(source, listener)

    val importedCaseRefs = mutableListOf<String>()
    val settledCaseRefs = mutableListOf<String>()
    val updatedCaseRefs = mutableListOf<String>()
    val ignoredCaseRefs = mutableListOf<String>()
    val unknownCaseRefs = mutableListOf<String>()

    when (listener.detectedImportType) {
        ImportType.NEW_CASES -> listener.newCases.forEach { caseResource ->
            val importedCase = caseResource.toEntity(currentUserId, secretKey)
            val persistedCase = caseService.get(importedCase)
            if (persistedCase == null) {
                caseService.persist(importedCase)
                importedCaseRefs.addCase(importedCase)
            } else {
                var updatedCase: Case = persistedCase
                if (importedCase.type != persistedCase.type) {
                    updatedCase = updatedCase.copy(type = importedCase.type)
                }
                if (persistedCase.status == SETTLED) {
                    updatedCase = updatedCase.copy(status = UNKNOWN)
                }

                if (updatedCase === persistedCase) {
                    ignoredCaseRefs.addCase(persistedCase)
                } else {
                    caseService.update(updatedCase)
                    updatedCaseRefs.addCase(updatedCase)
                }
            }
        }

        ImportType.SETTLED_CASES -> listener.updatedCases.forEach { caseResource ->
            val importedCase = caseResource.toEntity(currentUserId, secretKey)
            val persistedCase = caseService.get(importedCase)
            if (persistedCase != null) {
                if (persistedCase.status != SETTLED) {
                    caseService.update(persistedCase.copy(status = SETTLED, settledOn = importedCase.settledOn))
                    settledCaseRefs.addCase(persistedCase)
                } else if (persistedCase.settledOn != importedCase.settledOn) {
                    caseService.update(persistedCase.copy(settledOn = importedCase.settledOn))
                    updatedCaseRefs.addCase(persistedCase)
                } else {
                    ignoredCaseRefs.addCase(persistedCase)
                }
            } else {
                unknownCaseRefs.addCase(importedCase)
            }
        }

        ImportType.UPDATED_RECEIVED_DATES -> listener.updatedCases.forEach { caseResource ->
            val importedCase = caseResource.toEntity(currentUserId, secretKey)
            val persistedCase = caseService.get(importedCase)
            if (persistedCase != null) {
                if (persistedCase.receivedOn != importedCase.receivedOn) {
                    caseService.update(persistedCase.copy(receivedOn = importedCase.receivedOn))
                    updatedCaseRefs.addCase(persistedCase)
                } else {
                    ignoredCaseRefs.addCase(persistedCase)
                }
            } else {
                unknownCaseRefs.addCase(importedCase)

            }
        }

        ImportType.UPDATED_DUE_DATES -> listener.updatedCases.forEach { caseResource: CaseResource ->
            val importedCase = caseResource.toEntity(currentUserId, secretKey)
            val persistedCase = caseService.get(importedCase)
            if (persistedCase != null) {
                val preparationDays: Long? = when {
                    persistedCase.type == SINGLE && importedCase.status == SESSION -> 1
                    persistedCase.type == SINGLE && importedCase.status == DECISION -> 2
                    persistedCase.type == CHAMBER && importedCase.status == SESSION -> 7
                    persistedCase.type == CHAMBER && importedCase.status == DECISION -> 7
                    else -> null // will not happen
                }

                if (persistedCase.dueDate != importedCase.dueDate || persistedCase.status != importedCase.status) {
                    // prevent updates of todoDate when dueDate and status haven't changed
                    val todoDate = preparationDays?.let { importedCase.dueDate?.minus(it, ChronoUnit.DAYS) }
                        ?.let {
                            when (it.dayOfWeek) {
                                DayOfWeek.SATURDAY -> it.minus(1, ChronoUnit.DAYS)
                                DayOfWeek.SUNDAY -> it.minus(2, ChronoUnit.DAYS)
                                else -> it
                            }
                        }
                    caseService.update(
                        persistedCase.copy(
                            status = importedCase.status,
                            dueDate = importedCase.dueDate,
                            todoDate = todoDate
                        )
                    )
                    updatedCaseRefs.addCase(persistedCase)
                } else {
                    ignoredCaseRefs.addCase(persistedCase)
                }
            } else {
                unknownCaseRefs.addCase(importedCase)
            }
        }

        else -> if (listener.errors.isEmpty()) {
            listener.errors.add("Es konnten leider keine Daten in der RTF-Datei erkannt werden.")
        }
    }

    return ImportResult(
        importType = listener.detectedImportType,
        importedCaseRefs = importedCaseRefs,
        settledCaseRefs = settledCaseRefs,
        updatedCaseRefs = updatedCaseRefs,
        ignoredCaseRefs = ignoredCaseRefs,
        unknownCaseRefs = unknownCaseRefs,
        errors = listener.errors
    )
}

private class CaseRtfImporter(val importDate: LocalDate) : RtfListenerAdaptor() {

    var detectedImportType: ImportType? = null
    val newCases = mutableListOf<CaseResource>()
    val updatedCases = mutableListOf<CaseResource>()
    val errors = mutableListOf<String>()
    var processingAborted = false

    private var currentCell: String = ""
    private val cells = mutableListOf<String>()

    private val newCasesTableHeaders = listOf("Aktenzeichen", "Kurzrubrum", "Status", "ER / K")
    private val receivedDateTableHeaders =
        listOf("Aktenzeichen", "Kurzrubrum", "Status", "ZK-Eingang", "ZK-Nr.", "B-Nr.")
    private val settledDateTableHeaders = listOf("", "AZ", "Kurzrubrum", "Status", "Erledigungsdatum", "nächste WV")
    private val dueDateTableHeaders =
        listOf("Nr", "AZ", "Kurzrubrum", "Art", "Datum", "Uhr", "Saal", "P", "Z", "S", "D", "Besetzung")

    override fun processString(string: String?) {
        currentCell += string ?: return
    }

    override fun processCommand(command: Command?, parameter: Int, hasParameter: Boolean, optional: Boolean) {
        when (command) {
            Command.cell -> { // end of (table) cell
                cells.add(currentCell.trim())
                currentCell = ""
            }

            Command.trowd -> { // start of table row
                currentCell = ""
            }

            Command.row -> { // end of table row
                processTableRow()
                cells.clear()
            }

            else -> Unit
        }
    }

    private fun processTableRow() {
        if (processingAborted) {
            return
        }

        when (cells.size) {
            4 -> processNewCase()
            6 -> processReceivedDateUpdateOrSettledCases()
            12 -> processDueDateUpdate()
        }
    }

    private fun abort(error: String? = null) {
        detectedImportType = null
        processingAborted = true
        errors.clear()
        error?.let { errors.add(it) }
    }

    private fun checkImportType(importType: ImportType, expectedHeaders: List<String>) {
        if (detectedImportType != null) {
            if (detectedImportType != importType) {
                abort()
            }
        } else if (expectedHeaders != cells) {
            abort("Unbekannte Tabelle: ${cells.joinToString()}")
        } else {
            detectedImportType = importType
        }
    }

    private fun parseReference(refString: String) = runCatching { Reference.parseValue(refString) }.getOrNull()

    private fun processNewCase() {
        checkImportType(ImportType.NEW_CASES, newCasesTableHeaders)

        if (cells == newCasesTableHeaders) { // table header
            return
        }

        val refString = cells[0]
        val reference = parseReference(refString)?.toResource() ?: run {
            errors.add("Unerkanntes Aktenzeichen: $refString")
            return
        }

        val type = when (val typeString = cells[3]) {
            "Berichterstatter" -> CHAMBER
            "Einzelrichter" -> SINGLE
            else -> {
                errors.add(("Unerkannter Bearbeiter: $typeString"))
                return
            }
        }

        val case = CaseResource(
            ref = reference,
            type = type.name,
            parties = cells[1],
            area = "",
            status = UNKNOWN.name,
            statusNote = "",
            memo = "",
            markerColor = null,
            receivedOn = importDate,
            settledOn = null,
            dueDate = null,
            todoDate = null
        )
        newCases.add(case)
    }

    private fun processReceivedDateUpdateOrSettledCases() {
        when (detectedImportType) {
            null -> when (cells) {
                receivedDateTableHeaders -> detectedImportType = ImportType.UPDATED_RECEIVED_DATES
                settledDateTableHeaders -> detectedImportType = ImportType.SETTLED_CASES
                else -> abort("Unbekannte Tabelle: ${cells.joinToString()}")
            }

            ImportType.UPDATED_RECEIVED_DATES -> processReceivedDateUpdate()
            ImportType.SETTLED_CASES -> processSettledCases()
            else -> abort()
        }
    }

    private fun processReceivedDateUpdate() {
        val refString = cells[0]
        val reference = parseReference(refString)?.toResource() ?: run {
            errors.add("Unerkanntes Aktenzeichen: $refString")
            return
        }

        val receivedDate = runCatching { LocalDate.parse(cells[3], localDateFormatter) }.getOrElse {
            errors.add("Unerkanntes Datum ${cells[3]} für Aktenzeichen $refString")
            return
        }

        updatedCases.add(
            CaseResource(
                ref = reference,
                type = SINGLE.name, // required field - but not used
                parties = null,
                area = "",
                status = UNKNOWN.name, // required field - but not used
                statusNote = "",
                memo = "",
                markerColor = null,
                receivedOn = receivedDate,
                settledOn = null,
                dueDate = null,
                todoDate = null
            )
        )
    }

    private fun processSettledCases() {
        val refString = cells[1]
        val reference = parseReference(refString)?.toResource() ?: run {
            errors.add("Unerkanntes Aktenzeichen: $refString")
            return
        }

        val settledDate = runCatching { LocalDate.parse(cells[4], localDateFormatter) }.getOrElse {
            errors.add("Unerkanntes Datum ${cells[4]} für Aktenzeichen $refString")
            return
        }

        updatedCases.add(
            CaseResource(
                ref = reference,
                type = SINGLE.name, // required field - but not used
                parties = null,
                area = "",
                status = SETTLED.name,
                statusNote = "",
                memo = "",
                markerColor = null,
                receivedOn = importDate, // required field - but not used
                settledOn = settledDate,
                dueDate = null,
                todoDate = null
            )
        )
    }

    private fun processDueDateUpdate() {
        checkImportType(ImportType.UPDATED_DUE_DATES, dueDateTableHeaders)

        if (cells == dueDateTableHeaders) { // table header
            return
        }

        val refString = cells[1]
        val reference = parseReference(refString)?.toResource() ?: run {
            errors.add("Unerkanntes Aktenzeichen: $refString")
            return
        }

        val status = when (cells[3]) {
            "Verkündungstermin" -> DECISION
            else -> SESSION
        }

        val dueDate = runCatching { LocalDate.parse(cells[4], localDateFormatter) }.getOrElse {
            errors.add("Unerkanntes Datum ${cells[4]} für Aktenzeichen $refString")
            return
        }

        updatedCases.add(
            CaseResource(
                ref = reference,
                type = SINGLE.name, // required field - but not used
                parties = null,
                area = "",
                status = status.name,
                statusNote = "",
                memo = "",
                markerColor = null,
                receivedOn = importDate, // required field - but not used
                settledOn = null,
                dueDate = dueDate,
                todoDate = null
            )
        )
    }
}
