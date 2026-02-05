package de.obqo.causalist

import kotlin.experimental.xor
import kotlin.io.encoding.Base64

fun ByteArray.toBase64(): String = Base64.encode(this)

fun String.fromBase64(): ByteArray = Base64.decode(this)

infix fun ByteArray.xor(other: ByteArray) = zip(other) { a, b -> a xor b }.toByteArray()
