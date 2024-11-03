locals {
  bucket_name = "${var.project_name}-resources"
  cover_path  = "${path.module}/resources/cover.png"
}

resource "aws_s3_bucket" "bucket" {
  bucket = local.bucket_name
}

resource "aws_s3_object" "cover" {
  bucket      = local.bucket_name
  key         = "cover.png"
  source      = local.cover_path
  source_hash = filemd5(local.cover_path)
}