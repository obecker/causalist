package de.obqo.causalist.api

import io.kotest.matchers.Matcher
import io.kotest.matchers.MatcherResult
import io.kotest.matchers.should
import org.http4k.format.AwsCoreMoshi.asPrettyJsonString
import org.http4k.format.MoshiNode
import org.intellij.lang.annotations.Language

fun equalJson(expected: MoshiNode): Matcher<MoshiNode> = object : Matcher<MoshiNode> {
    override fun test(value: MoshiNode): MatcherResult {
        val result = expected == value
        return MatcherResult(
            result,
            { "Expected ${expected.asPrettyJsonString()}, but was ${value.asPrettyJsonString()}" },
            { "Should not equal ${expected.asPrettyJsonString()}" }
        )
    }
}

infix fun MoshiNode.shouldEqualJson(expected: MoshiNode) = this should equalJson(expected)

// Note: when used as infix function, the language injection doesn't work
// https://youtrack.jetbrains.com/issue/KTIJ-1001/infix-function-parameter-annotated-with-Language-has-no-language-injected
infix fun Any.shouldEqualJson(@Language("JSON") json: String) =
    causalistJson.asJsonObject(this) shouldEqualJson (causalistJson.parse(json))
