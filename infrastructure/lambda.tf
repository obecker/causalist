resource "aws_iam_role" "backend" {
  name = "iam-for-backend-${var.env}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

data "local_file" "lambda_handler_lib" {
  filename = "${local.project_dir}/backend/build/libs/causalist-1.0-SNAPSHOT-all.jar"
}

resource "aws_lambda_function" "backend" {
  function_name    = "causalist-backend-${var.env}"
  role             = aws_iam_role.backend.arn
  filename         = data.local_file.lambda_handler_lib.filename
  handler          = "de.obqo.causalist.app.ApiLambdaHandler"
  runtime          = "java17"
  memory_size      = 2048
  timeout          = 30
  source_code_hash = data.local_file.lambda_handler_lib.content_base64sha256
  publish          = true

#  snap_start {
#    apply_on = "PublishedVersions"
#  }

  environment {
    variables = {
      JAVA_TOOL_OPTIONS               = "-XX:+TieredCompilation -XX:TieredStopAtLevel=1"
      CAUSALIST_USERS_TABLE           = local.users_table
      CAUSALIST_CASES_TABLE           = local.cases_table
      CAUSALIST_CASE_DOCUMENTS_TABLE  = local.documents_table
      CAUSALIST_CASE_DOCUMENTS_BUCKET = local.documents_bucket
      CAUSALIST_ENCRYPTION_KEY        = var.encryption_key
      CAUSALIST_PASSWORD_SALT         = var.password_salt
      CAUSALIST_SIGNING_SECRET        = var.signing_secret
    }
  }
}

resource "aws_lambda_alias" "backend" {
  name             = "causalist-backend-alias-${var.env}"
  function_name    = aws_lambda_function.backend.function_name
  function_version = aws_lambda_function.backend.version
}

resource "aws_iam_policy" "dynamodb" {
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          "${aws_dynamodb_table.db_users.arn}",
          "${aws_dynamodb_table.db_users.arn}/index/*",
          "${aws_dynamodb_table.db_cases.arn}",
          "${aws_dynamodb_table.db_cases.arn}/index/*",
          "${aws_dynamodb_table.db_documents.arn}",
          "${aws_dynamodb_table.db_documents.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "s3_documents" {
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = [
          "${aws_s3_bucket.documents.arn}",
          "${aws_s3_bucket.documents.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "dynamodb_policy" {
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.dynamodb.arn
}

resource "aws_iam_role_policy_attachment" "s3_documents_policy" {
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.s3_documents.arn
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name = "/aws/lambda/${aws_lambda_function.backend.function_name}"

  retention_in_days = 30
}
