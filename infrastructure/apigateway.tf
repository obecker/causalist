resource "aws_apigatewayv2_api" "backend" {
  name          = "causalist-backend-${var.env}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id = aws_apigatewayv2_api.backend.id

  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }
}

resource "aws_apigatewayv2_integration" "backend" {
  api_id = aws_apigatewayv2_api.backend.id

  integration_uri        = aws_lambda_alias.backend.invoke_arn
  integration_type       = "AWS_PROXY"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "backend" {
  api_id = aws_apigatewayv2_api.backend.id

  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name = "/aws/api_gw/${aws_apigatewayv2_api.backend.name}"

  retention_in_days = 30
}

resource "aws_lambda_permission" "backend" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  qualifier     = aws_lambda_alias.backend.name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.backend.execution_arn}/*/*"
}
