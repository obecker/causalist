package de.obqo.causalist

import java.time.LocalDate
import java.util.UUID

fun aReference() = Reference.parseId("00123O23-00001")

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
    memo = null,
    area = null,
    status = Status.UNKNOWN,
    statusNote = null,
    receivedOn = LocalDate.now(),
    settledOn = null,
    dueDate = null,
    todoDate = null
)

fun Case.withOwnerId(uuid: UUID) = copy(ownerId = uuid)
fun Case.withRef(ref: Reference) = copy(ref = ref)
fun Case.withRef(ref: String) = withRef(Reference.parseId(ref))
fun Case.withType(type: Type) = copy(type = type)
fun Case.withParties(parties: String) = copy(parties = parties)
fun Case.withArea(area: String) = copy(area = area)
fun Case.withStatus(status: Status) = copy(status = status)
fun Case.withStatusNote(statusNote: String) = copy(statusNote = statusNote)
fun Case.withMemo(memo: String) = copy(memo = memo)
fun Case.withReceivedOn(receivedOn: LocalDate) = copy(receivedOn = receivedOn)
fun Case.withSettledOn(settledOn: LocalDate) = copy(settledOn = settledOn)
fun Case.withDueDate(dueDate: LocalDate) = copy(dueDate = dueDate)
fun Case.withTodoDate(todoDate: LocalDate) = copy(todoDate = todoDate)
