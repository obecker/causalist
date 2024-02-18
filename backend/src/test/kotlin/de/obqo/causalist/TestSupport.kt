package de.obqo.causalist

fun sleep(millis: Long) = runCatching { Thread.sleep(millis) }
