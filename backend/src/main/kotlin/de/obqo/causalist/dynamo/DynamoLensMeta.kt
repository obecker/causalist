package de.obqo.causalist.dynamo

import org.http4k.lens.Meta
import org.http4k.lens.ParamMeta.ObjectParam

fun dynamoLensMeta(location: String, name: String) = Meta(true, location, ObjectParam, name, null, emptyMap())
