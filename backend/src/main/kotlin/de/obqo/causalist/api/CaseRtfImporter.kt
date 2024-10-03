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

typealias Cells = List<String>

class CellsLensException(val error: String) : RuntimeException()

class CellsLens<FINAL>(private val getFn: (Cells) -> FINAL) {

    operator fun invoke(target: Cells) = getFn(target)

    companion object {
        private val localDateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

        private fun base(): Spec<String> = Spec(Get { index, target -> target[index] })
        private fun nullIfEmpty() = base().map { it.ifEmpty { null } }

        fun string() = base()
        fun reference() = nullIfEmpty().map { str ->
            runCatching {
                Reference.parseValue(str).toResource()
            }.getOrElse {
                throw CellsLensException("Unerkanntes Aktenzeichen: $str")
            }
        }

        fun localDate() = nullIfEmpty().map { str ->
            runCatching {
                LocalDate.parse(str, localDateFormatter)
            }.getOrElse {
                throw CellsLensException("Unerkanntes Datum: $str")
            }
        }

        fun type() = base().map { str ->
            when (str) {
                "Berichterstatter" -> CHAMBER
                "Einzelrichter" -> SINGLE
                else -> throw CellsLensException("Unerkannter Bearbeiter: $str")
            }
        }

        fun dueDateStatus() = base().map { str ->
            when (str) {
                "Verkündungstermin" -> DECISION
                else -> SESSION
            }
        }
    }

    class Get<OUT>(private val getFn: (Int, Cells) -> OUT) {
        operator fun invoke(index: Int) = { target: Cells -> getFn(index, target) }

        fun <NEXT> map(nextFn: (OUT & Any) -> NEXT) = Get { index, target -> getFn(index, target)?.let { nextFn(it) } }
    }

    class Spec<OUT>(private val get: Get<OUT>) {
        fun required(index: Int) =
            CellsLens { get(index)(it) ?: throw CellsLensException("Fehlender Eintrag in Spalte ${index + 1}") }

        fun optional(index: Int) = CellsLens { get(index)(it) }

        fun <NEXT> map(nextFn: (OUT & Any) -> NEXT) = Spec(get.map(nextFn))
    }
}

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

sealed interface ImportStrategy {
    val type: ImportType

    fun processCells(
        cells: Cells,
        importDate: LocalDate,
        caseService: CaseService,
        currentUserId: UUID,
        secretKey: SecretKey
    )

    fun result(): ImportResult
}

abstract class AbstractStrategy(
    override val type: ImportType,
    private val tableHeaders: List<String>
) : ImportStrategy {
    protected val importedCaseRefs = mutableListOf<String>()
    protected val settledCaseRefs = mutableListOf<String>()
    protected val updatedCaseRefs = mutableListOf<String>()
    protected val ignoredCaseRefs = mutableListOf<String>()
    protected val unknownCaseRefs = mutableListOf<String>()
    private val errors = mutableListOf<String>()

    override fun result(): ImportResult = ImportResult(
        importType = type,
        importedCaseRefs = importedCaseRefs,
        settledCaseRefs = settledCaseRefs,
        updatedCaseRefs = updatedCaseRefs,
        ignoredCaseRefs = ignoredCaseRefs,
        unknownCaseRefs = unknownCaseRefs,
        errors = errors
    )

    protected fun processCells(cells: Cells, block: () -> Unit) {
        if (cells.size != tableHeaders.size) {
            return
        }
        try {
            block()
        } catch (e: CellsLensException) {
            errors.add(e.error)
        } catch (e: Exception) {
            errors.add("Fehler beim Verarbeiten der Zeile: ${cells.joinToString()}")
        }
    }

    protected fun MutableList<String>.addCase(case: Case) = add(case.ref.toValue())

    protected fun case(
        ref: ReferenceResource,
        type: String = SINGLE.name,
        parties: String? = null,
        status: String = UNKNOWN.name,
        receivedOn: LocalDate = LocalDate.now(),
        settledOn: LocalDate? = null,
        dueDate: LocalDate? = null,
    ) = CaseResource(
        ref = ref,
        type = type,
        parties = parties,
        area = "",
        status = status,
        statusNote = "",
        memo = "",
        markerColor = null,
        receivedOn = receivedOn,
        settledOn = settledOn,
        dueDate = dueDate,
        todoDate = null
    )
}

interface ImportStrategyFactory {
    fun matchesHeader(cells: Cells): Boolean
    fun create(): ImportStrategy
}

class NewCasesImporter : AbstractStrategy(ImportType.NEW_CASES, tableHeaders) {
    companion object : ImportStrategyFactory {
        private val tableHeaders = listOf("Aktenzeichen", "Kurzrubrum", "Status", "ER / K")
        override fun matchesHeader(cells: Cells) = tableHeaders == cells

        override fun create() = NewCasesImporter()
    }

    private val refLens = CellsLens.reference().required(0)
    private val partiesLens = CellsLens.string().optional(1)
    private val typeLens = CellsLens.type().required(3)

    override fun processCells(
        cells: Cells,
        importDate: LocalDate,
        caseService: CaseService,
        currentUserId: UUID,
        secretKey: SecretKey
    ) = processCells(cells) {
        val caseResource = case(
            ref = refLens(cells),
            type = typeLens(cells).name,
            parties = partiesLens(cells),
            status = UNKNOWN.name,
            receivedOn = importDate,
        )

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
}

class SettledCasesImporter : AbstractStrategy(ImportType.SETTLED_CASES, tableHeaders) {
    companion object : ImportStrategyFactory {
        private val tableHeaders = listOf("", "AZ", "Kurzrubrum", "Status", "Eingangsdatum", "Erledigungsdatum", "nächste WV")
        override fun matchesHeader(cells: Cells) = tableHeaders == cells

        override fun create() = SettledCasesImporter()
    }

    private val refLens = CellsLens.reference().required(1)
    private val settledLens = CellsLens.localDate().required(5)

    override fun processCells(
        cells: Cells,
        importDate: LocalDate,
        caseService: CaseService,
        currentUserId: UUID,
        secretKey: SecretKey
    ) = processCells(cells) {
        val caseResource = case(
            ref = refLens(cells),
            status = SETTLED.name,
            settledOn = settledLens(cells),
        )

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
}

class UpdateReceivedDatesImporter : AbstractStrategy(ImportType.UPDATED_RECEIVED_DATES, tableHeaders) {
    companion object : ImportStrategyFactory {
        private val tableHeaders = listOf("Aktenzeichen", "Kurzrubrum", "Status", "ZK-Eingang", "ZK-Nr.", "B-Nr.")
        override fun matchesHeader(cells: Cells) = tableHeaders == cells

        override fun create() = UpdateReceivedDatesImporter()
    }

    private val refLens = CellsLens.reference().required(0)
    private val dateLens = CellsLens.localDate().required(3)

    override fun processCells(
        cells: Cells,
        importDate: LocalDate,
        caseService: CaseService,
        currentUserId: UUID,
        secretKey: SecretKey
    ) = processCells(cells) {
        val caseResource = case(
            ref = refLens(cells),
            receivedOn = dateLens(cells),
        )

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
}

class UpdateDueDatesImporter : AbstractStrategy(ImportType.UPDATED_DUE_DATES, tableHeaders) {
    companion object : ImportStrategyFactory {
        private val tableHeaders =
            listOf("Nr", "AZ", "Kurzrubrum", "Art", "Datum", "Uhr", "Saal", "P", "Z", "S", "D", "Besetzung")

        override fun matchesHeader(cells: Cells) = tableHeaders == cells

        override fun create() = UpdateDueDatesImporter()
    }

    private val refLens = CellsLens.reference().required(1)
    private val statusLens = CellsLens.dueDateStatus().required(3)
    private val dueLens = CellsLens.localDate().required(4)

    override fun processCells(
        cells: Cells,
        importDate: LocalDate,
        caseService: CaseService,
        currentUserId: UUID,
        secretKey: SecretKey
    ) = processCells(cells) {
        val caseResource = case(
            ref = refLens(cells),
            status = statusLens(cells).name,
            dueDate = dueLens(cells),
        )
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
}


fun importCases(
    stream: InputStream,
    importDate: LocalDate,
    caseService: CaseService,
    currentUserId: UUID,
    secretKey: SecretKey
): ImportResult {
    val source = RtfStreamSource(stream)
    val parser = StandardRtfParser()
    val listener = CaseRtfImporter(importDate, caseService, currentUserId, secretKey)

    parser.parse(source, listener)

    return listener.importStrategy?.result() ?: ImportResult(
        importType = null,
        importedCaseRefs = emptyList(),
        settledCaseRefs = emptyList(),
        updatedCaseRefs = emptyList(),
        ignoredCaseRefs = emptyList(),
        unknownCaseRefs = emptyList(),
        errors = listOf("Es konnten leider keine Daten in der RTF-Datei erkannt werden.")
    )
}

private class CaseRtfImporter(
    private val importDate: LocalDate,
    private val caseService: CaseService,
    private val currentUserId: UUID,
    private val secretKey: SecretKey
) : RtfListenerAdaptor() {

    var importStrategy: ImportStrategy? = null

    private val importCandidates =
        listOf(NewCasesImporter, SettledCasesImporter, UpdateDueDatesImporter, UpdateReceivedDatesImporter)

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
        importStrategy?.processCells(cells, importDate, caseService, currentUserId, secretKey) ?: run {
            importStrategy = importCandidates.firstOrNull { it.matchesHeader(cells) }?.create()
        }
    }
}
