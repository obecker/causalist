###
### Public S3 bucket for the frontend
###

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.env == "prod" ? "" : format("%s.", var.env)}causalist.de"
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# https://registry.terraform.io/modules/hashicorp/dir/template/latest
module "frontend_files" {
  source   = "hashicorp/dir/template"
  version  = "1.0.2"
  base_dir = "${local.project_dir}/frontend/build"
}

resource "aws_s3_object" "frontend" {
  for_each = {
    for filename, file in module.frontend_files.files : filename => file
    if !endswith(filename, ".DS_Store")
  }

  bucket       = aws_s3_bucket.frontend.id
  key          = each.key
  content_type = each.value.content_type
  source       = each.value.source_path
  etag         = each.value.digests.md5
  cache_control = (startswith(each.value.content_type, "text/html")
    ? "no-store"
    : startswith(each.key, "assets") ? "max-age=31536000" : "max-age=86400"
  )

  acl = "public-read"
}


###
### Private S3 bucket for uploaded case documents
###

locals {
  documents_bucket = "causalist-case-documents-${var.env}"
}

resource "aws_s3_bucket" "documents" {
  bucket = local.documents_bucket
}

resource "aws_s3_bucket_ownership_controls" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "documents" {
  depends_on = [aws_s3_bucket_ownership_controls.documents]
  bucket     = aws_s3_bucket.documents.id
  acl        = "private"
}
