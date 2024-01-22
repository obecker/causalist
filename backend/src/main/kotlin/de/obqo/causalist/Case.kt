package de.obqo.causalist

import dev.forkhandles.values.IntValue
import dev.forkhandles.values.StringValue
import dev.forkhandles.values.StringValueFactory
import dev.forkhandles.values.Value
import dev.forkhandles.values.ValueFactory
import dev.forkhandles.values.between
import dev.forkhandles.values.regex
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class Type {
    SINGLE, CHAMBER
}

enum class Status {
    UNKNOWN, // unbekannt (neu importiert)
    LEGAL_AID, // (Antrag auf) Prozesskostenhilfe
    ADVANCE_PAYMENT_PENDING, // warten auf Kostenvorschuss
    WRITTEN_PRELIMINARY_PROCEDURE, // schriftliches Vorverfahren
    AT_THE_APPRAISER, // beim Sachverständigen
    APPRAISERS_REPORT, // Gutachten liegt vor
    SESSION, // Verhandlung ist anberaumt
    DECISION, // Verkündungstermin
    SETTLED // erledigt
}

private fun maxIntOfWidth(width: Int): Int = "".padEnd(width, '9').toInt()

open class ZeroPaddedIntValueFactory<DOMAIN : Value<Int>>(
    fn: (Int) -> DOMAIN, minValue: Int, width: Int
) : ValueFactory<DOMAIN, Int>(
    fn,
    (minValue..maxIntOfWidth(width)).between,
    String::toInt,
    { it.toString().padStart(width, '0') }
)

// Spruchkörper
class RefEntity private constructor(value: Int) : IntValue(value) {
    fun idPart() = RefEntity.show(this)

    companion object : ZeroPaddedIntValueFactory<RefEntity>(::RefEntity, 1, 5)
}

// Registerzeichen
class RefRegister private constructor(value: String) : StringValue(value) {
    fun idPart() = RefRegister.show(this)

    companion object : StringValueFactory<RefRegister>(::RefRegister, "O|OH|S|T".regex)
}

class RefNumber private constructor(value: Int) : IntValue(value) {
    fun idPart() = RefNumber.show(this)

    companion object : ZeroPaddedIntValueFactory<RefNumber>(::RefNumber, 1, 5)
}

class RefYear private constructor(value: Int) : IntValue(value) {
    fun idPart() = RefYear.show(this)
    fun show() = RefYear.show(this)

    companion object : ZeroPaddedIntValueFactory<RefYear>(::RefYear, 0, 2)
}

// Aktenzeichen, 123 O 456/23
data class Reference(
    val entity: RefEntity,
    val register: RefRegister,
    val number: RefNumber,
    val year: RefYear
) {
    fun toId() = toId(this)

    fun toValue() = toValue(this)

    override fun toString() = toValue()

    companion object {

        private val idRegex = Regex("(?<entity>\\d+)(?<register>[A-Z]+)(?<year>\\d+)-(?<number>\\d+)")
        private val valueRegex = Regex("(?<entity>\\d+)\\s*(?<register>[A-Z]+)\\s*(?<number>\\d+)/(?<year>\\d+)")
        private val regexGroups = listOf("entity", "register", "number", "year")

        private fun toId(ref: Reference) =
            "${ref.entity.idPart()}${ref.register.idPart()}${ref.year.idPart()}-${ref.number.idPart()}"

        fun parseId(id: String): Reference = parse(id, idRegex)

        private fun toValue(ref: Reference) =
            "${ref.entity} ${ref.register} ${ref.number}/${ref.year.show()}"

        fun parseValue(value: String) = parse(value, valueRegex)

        private fun parse(value: String, regex: Regex) = regex.matchEntire(value)?.let { result ->
            val (entity, register, number, year) = regexGroups.map { result.groups[it]?.value!! }
            Reference(
                RefEntity.parse(entity),
                RefRegister.parse(register),
                RefNumber.parse(number),
                RefYear.parse(year)
            )
        } ?: throw IllegalArgumentException("Illegal Reference: $value")
    }
}

data class Case(
    val ownerId: UUID,
    val ref: Reference,
    val type: Type,
    val parties: String?,
    val area: String?,
    val status: Status,
    val statusNote: String?,
    val memo: String?,
    val receivedOn: LocalDate,
    val settledOn: LocalDate?,
    val dueDate: LocalDate?,
    val todoDate: LocalDate?,
    val updatedAt: Instant = Instant.now()
)

interface CaseRepository : CrudRepository<Case, UUID, String> {
    fun get(ownerId: UUID, ref: Reference): Case? = get(ownerId, ref.toId())
    fun get(case: Case) = get(case.ownerId, case.ref)

    fun findByOwner(
        ownerId: UUID,
        type: Type? = null,
        status: List<Status> = emptyList(),
        settled: Boolean = false
    ): Sequence<Case>
}

class CaseExistsException : RuntimeException()
class CaseMissingException : RuntimeException()

interface CaseService {
    fun persist(case: Case): Case

    fun update(case: Case): Case

    fun move(case: Case, fromReference: Reference): Case

    fun get(ownerId: UUID, refId: String): Case?
    fun get(ownerId: UUID, ref: Reference): Case? = get(ownerId, ref.toId())
    fun get(case: Case) = get(case.ownerId, case.ref)

    fun delete(case: Case)

    fun findByOwner(ownerId: UUID, type: Type?, status: List<Status>, settled: Boolean): Sequence<Case>
}

fun caseService(repository: CaseRepository): CaseService = object : CaseService {
    override fun persist(case: Case): Case {
        if (repository.get(case) != null) {
            throw CaseExistsException()
        }
        return repository.save(case)
    }

    override fun update(case: Case): Case {
        if (repository.get(case) == null) {
            throw CaseMissingException()
        }
        return repository.save(case)
    }

    override fun move(case: Case, fromReference: Reference): Case {
        persist(case)
        repository.delete(case.ownerId, fromReference.toId())
        return case
    }

    override fun get(ownerId: UUID, refId: String) = repository.get(ownerId, refId)

    override fun delete(case: Case) = repository.delete(case)

    override fun findByOwner(ownerId: UUID, type: Type?, status: List<Status>, settled: Boolean) =
        repository.findByOwner(ownerId, type, status, settled)
}
