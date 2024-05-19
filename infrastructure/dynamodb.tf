locals {
  table_suffix    = var.env == "prod" ? "" : title(var.env)
  users_table     = "CausalistUsers${local.table_suffix}"
  cases_table     = "CausalistCases${local.table_suffix}"
  documents_table = "CausalistCaseDocuments${local.table_suffix}"
}

resource "aws_dynamodb_table" "db_users" {
  name                        = local.users_table
  billing_mode                = "PAY_PER_REQUEST"
  deletion_protection_enabled = true
  hash_key                    = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "username"
    type = "S"
  }

  global_secondary_index {
    name            = "UsernameIndex"
    hash_key        = "username"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false // not enabled yet
  }
}

resource "aws_dynamodb_table" "db_cases" {
  name                        = local.cases_table
  billing_mode                = "PAY_PER_REQUEST"
  deletion_protection_enabled = true
  hash_key                    = "ownerId"
  range_key                   = "id"

  attribute {
    name = "ownerId"
    type = "S"
  }
  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "ref"
    type = "S"
  }
  attribute {
    name = "settledOn"
    type = "S"
  }

  local_secondary_index {
    name            = "ActiveIndex"
    range_key       = "ref"
    projection_type = "ALL"
  }
  local_secondary_index {
    name            = "SettledIndex"
    range_key       = "settledOn"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.env == "prod"
  }
}

resource "aws_dynamodb_table" "db_documents" {
  name                        = local.documents_table
  billing_mode                = "PAY_PER_REQUEST"
  deletion_protection_enabled = true
  hash_key                    = "ownerId"
  range_key                   = "id"

  attribute {
    name = "ownerId"
    type = "S"
  }
  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "ref"
    type = "S"
  }

  local_secondary_index {
    name            = "ReferenceIndex"
    range_key       = "ref"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false // needs to be in sync with s3
  }
}
