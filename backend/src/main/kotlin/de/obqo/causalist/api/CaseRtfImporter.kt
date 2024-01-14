package de.obqo.causalist.api

import com.rtfparserkit.parser.RtfListenerAdaptor
import com.rtfparserkit.parser.RtfStreamSource
import com.rtfparserkit.parser.standard.StandardRtfParser
import com.rtfparserkit.rtf.Command
import de.obqo.causalist.Case
import de.obqo.causalist.CaseService
import de.obqo.causalist.RefEntity
import de.obqo.causalist.RefNumber
import de.obqo.causalist.RefRegister
import de.obqo.causalist.RefYear
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
    NEW_CASES, UPDATED_RECEIVED_DATES, UPDATED_DUE_DATES
}

@JsonSerializable
data class ImportResult(
    val importType: ImportType?,
    val importedCases: Int,
    val ignoredCases: Int,
    val errors: List<String>
)

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

    var importedCases = 0
    var ignoredCases = 0
    val unknownCases = mutableListOf<String>()
    when (listener.detectedImportType) {
        ImportType.NEW_CASES -> listener.newCases.forEach { caseResource ->
            val importedCase = caseResource.toEntity(currentUserId, secretKey)
            val persistedCase = caseService.get(importedCase)
            if (persistedCase == null) {
                caseService.persist(importedCase)
                importedCases += 1
            } else {
                var updatedCase: Case = persistedCase
                if (importedCase.type != persistedCase.type) {
                    updatedCase = updatedCase.copy(type = importedCase.type)
                }
                if (persistedCase.status == SETTLED) {
                    updatedCase = updatedCase.copy(status = UNKNOWN)
                }

                if (updatedCase === persistedCase) {
                    ignoredCases += 1
                } else {
                    caseService.update(updatedCase)
                    importedCases += 1
                }
            }
        }

        ImportType.UPDATED_RECEIVED_DATES -> listener.updatedCases.forEach { caseResource ->
            val importedCase = caseResource.toEntity(currentUserId, secretKey)
            val persistedCase = caseService.get(importedCase)
            if (persistedCase != null) {
                if (persistedCase.receivedOn != importedCase.receivedOn) {
                    caseService.update(persistedCase.copy(receivedOn = importedCase.receivedOn))
                    importedCases++
                } else {
                    ignoredCases++
                }
            } else {
                unknownCases += importedCase.ref.toString()
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
                    importedCases += 1
                } else {
                    ignoredCases += 1
                }
            } else {
                unknownCases.add(importedCase.ref.toString())
//                listener.errors.add("${caseResource.ref.toEntity()} ist nicht im Bestand")
            }
        }

        else -> if (listener.errors.isEmpty()) {
            listener.errors.add("Es konnten leider keine Daten in der RTF-Datei erkannt werden.")
        }
    }

    if (unknownCases.isNotEmpty()) {
        listener.errors.add("Nicht im Bestand: " + unknownCases.joinToString())
    }

    return ImportResult(
        importType = listener.detectedImportType,
        importedCases = importedCases,
        ignoredCases = ignoredCases,
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
            6 -> processReceivedDateUpdate()
            12 -> processDueDateUpdate()
        }
    }

    private fun abort() {
        detectedImportType = null
        processingAborted = true
        errors.clear()
    }

    private fun checkImportType(importType: ImportType) {
        if (detectedImportType != null) {
            if (detectedImportType != importType) {
                abort()
            }
        } else {
            detectedImportType = importType
        }
    }

    private fun processNewCase() {
        checkImportType(ImportType.NEW_CASES)

        if (cells[0] == "Aktenzeichen") { // table header
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
            receivedOn = importDate,
            settledOn = null,
            dueDate = null,
            todoDate = null
        )
        newCases.add(case)
    }

    private fun processReceivedDateUpdate() {
        checkImportType(ImportType.UPDATED_RECEIVED_DATES)

        if (cells[0] == "Aktenzeichen") { // table header
            return
        }

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
                receivedOn = receivedDate,
                settledOn = null,
                dueDate = null,
                todoDate = null
            )
        )
    }

    private fun processDueDateUpdate() {
        checkImportType(ImportType.UPDATED_DUE_DATES)

        if (cells[0] == "Nr") { // table header
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
                receivedOn = importDate, // required field - but not used
                settledOn = null,
                dueDate = dueDate,
                todoDate = null
            )
        )
    }

    companion object {

        private val referenceParser = Regex("(\\d+)\\s*([A-Z]+)\\s*(\\d+)/(\\d+)")

        private fun parseReference(string: String) = referenceParser.matchEntire(string)?.let {
            try {
                val (entity, register, number, year) = it.destructured
                Reference(
                    RefEntity.parse(entity),
                    RefRegister.parse(register),
                    RefNumber.parse(number),
                    RefYear.parse(year)
                )
            } catch (ex: RuntimeException) {
                null
            }
        }

        private val localDateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }
}
