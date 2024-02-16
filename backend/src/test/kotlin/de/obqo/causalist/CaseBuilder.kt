package de.obqo.causalist

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

fun aReference() = Reference.parseValue("123 O 1/23")

fun Reference.next() = copy(number = RefNumber.of(number.value + 1))

class MutableReference(private var reference: Reference) {
    fun next() = reference.also { reference = reference.next() }
}

fun mutableReference() = MutableReference(aReference())

fun aCase() = Case(
    ownerId = UUID(0, 0),
    ref = aReference(),
    type = Type.SINGLE,
    parties = null,
    area = null,
    status = Status.UNKNOWN,
    statusNote = null,
    memo = null,
    markerColor = null,
    receivedOn = LocalDate.now(),
    settledOn = null,
    dueDate = null,
    todoDate = null
)

fun Case.withOwnerId(uuid: UUID) = copy(ownerId = uuid)
fun Case.withRef(ref: Reference) = copy(ref = ref)
fun Case.withRefId(ref: String) = withRef(Reference.parseId(ref))
fun Case.withRefValue(ref: String) = withRef(Reference.parseValue(ref))
fun Case.withType(type: Type) = copy(type = type)
fun Case.withParties(parties: String) = copy(parties = parties)
fun Case.withArea(area: String) = copy(area = area)
fun Case.withStatus(status: Status) = copy(status = status)
fun Case.withStatusNote(statusNote: String) = copy(statusNote = statusNote)
fun Case.withMemo(memo: String) = copy(memo = memo)
fun Case.withMarkerColor(color: String) = copy(markerColor = color)
fun Case.withReceivedOn(receivedOn: LocalDate) = copy(receivedOn = receivedOn)
fun Case.withSettledOn(settledOn: LocalDate) = copy(settledOn = settledOn)
fun Case.withDueDate(dueDate: LocalDate) = copy(dueDate = dueDate)
fun Case.withTodoDate(todoDate: LocalDate) = copy(todoDate = todoDate)
fun Case.withUpdatedAt(instant: Instant) = copy(updatedAt = instant)
