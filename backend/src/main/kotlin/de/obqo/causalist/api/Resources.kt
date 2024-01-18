package de.obqo.causalist.api

import de.obqo.causalist.Case
import de.obqo.causalist.CryptoUtils.decrypt
import de.obqo.causalist.CryptoUtils.encrypt
import de.obqo.causalist.RefEntity
import de.obqo.causalist.RefNumber
import de.obqo.causalist.RefRegister
import de.obqo.causalist.RefYear
import de.obqo.causalist.Reference
import de.obqo.causalist.Status
import de.obqo.causalist.Type
import se.ansman.kotshi.JsonSerializable
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.IsoFields
import java.util.UUID
import javax.crypto.SecretKey

@JsonSerializable
data class ReferenceResource(
    val entity: Int,
    val register: String,
    val number: Int,
    val year: Int,
    val value: String?
)

@JsonSerializable
data class CaseResource(
    val id: String? = null,
    val ref: ReferenceResource,
    val type: String,
    val parties: String?,
    val area: String?,
    val status: String,
    val statusNote: String?,
    val memo: String?,
    val receivedOn: LocalDate,
    val settledOn: LocalDate?,
    val dueDate: LocalDate?,
    val todoDate: LocalDate?,
    val todoWeekOfYear: Int? = todoDate?.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR),
    val updatedAt: Instant? = null
)

@JsonSerializable
data class CasesResource(
    val cases: List<CaseResource>
)

fun Reference.toResource() = ReferenceResource(
    entity.value, register.value, number.value, year.value, toValue()
)

fun ReferenceResource.toEntity() = Reference(
    RefEntity.of(entity), RefRegister.of(register), RefNumber.of(number), RefYear.of(year)
)

fun Case.toResource(encryptionKey: SecretKey) = CaseResource(
    id = ref.toId(),
    ref = ref.toResource(),
    type = type.name,
    parties = parties?.decrypt(encryptionKey) ?: "",
    area = area?.decrypt(encryptionKey) ?: "",
    status = status.name,
    statusNote = statusNote?.decrypt(encryptionKey) ?: "",
    memo = memo?.decrypt(encryptionKey) ?: "",
    receivedOn = receivedOn,
    settledOn = settledOn,
    dueDate = dueDate,
    todoDate = todoDate,
    updatedAt = updatedAt
)

fun CaseResource.toEntity(ownerId: UUID, encryptionKey: SecretKey) = Case(
    ownerId = ownerId,
    ref = ref.toEntity(),
    type = Type.valueOf(type),
    parties = parties?.ifBlank { null }?.encrypt(encryptionKey),
    area = area?.ifBlank { null }?.encrypt(encryptionKey),
    status = Status.valueOf(status),
    statusNote = statusNote?.ifBlank { null }?.encrypt(encryptionKey),
    memo = memo?.ifBlank { null }?.encrypt(encryptionKey),
    receivedOn = receivedOn,
    settledOn = settledOn,
    dueDate = dueDate,
    todoDate = todoDate,
    // updatedAt will be automatically set
)

fun List<Case>.toResource(encryptionKey: SecretKey) = CasesResource(this.map { it.toResource(encryptionKey) })
