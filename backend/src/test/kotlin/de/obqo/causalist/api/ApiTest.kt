package de.obqo.causalist.api

import de.obqo.causalist.CaseService
import de.obqo.causalist.UserService
import io.kotest.core.spec.style.DescribeSpec
import io.mockk.mockk
import org.http4k.core.ContentType
import org.http4k.core.Method
import org.http4k.core.Request
import org.http4k.core.Status
import org.http4k.kotest.shouldHaveContentType
import org.http4k.kotest.shouldHaveStatus

class ApiTest: DescribeSpec( {

    describe("Contract") {
        it("should render OpenAPI spec") {
            // given
            val userServiceMock = mockk<UserService>()
            val caseServiceMock = mockk<CaseService>()

            val api = httpApi(authentication(userServiceMock), caseServiceMock)

            // when
            val response = api(Request(Method.GET, "/api/docs/openapi.json"))

            // then just test that the spec can be generated (and is not broken because of bad samples)
            response shouldHaveStatus Status.OK
            response shouldHaveContentType ContentType.APPLICATION_JSON
        }
    }
})
