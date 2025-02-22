locals {
  function_name       = "${var.project_name}-lambda"
  zip_path            = "${path.module}/temp/${local.function_name}.zip"
  layer_zip_path      = "${path.module}/temp/${local.function_name}-layer.zip"
  news_lambda_timeout = 60 * 5 // 5 minutes
}

resource "aws_lambda_function" "lambda" {
  function_name    = local.function_name
  handler          = "index.handler"
  memory_size      = 1024
  package_type     = "Zip"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  filename         = local.zip_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = local.news_lambda_timeout
  architectures    = ["arm64"]
  layers           = [aws_lambda_layer_version.lambda_layer.arn]

  environment {
    variables = {
      BSKY_DRY_RUN = var.dry_run
      BUCKET_NAME  = aws_s3_bucket.bucket.bucket
    }
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../${local.function_name}/dist"
  output_path = local.zip_path
}

resource "aws_lambda_layer_version" "lambda_layer" {
  filename         = "temp/${local.function_name}-layer.zip"
  layer_name       = "${local.function_name}-layer"
  source_code_hash = data.archive_file.lambda_layer_zip.output_base64sha256

  compatible_runtimes = ["nodejs20.x"]
}

data "archive_file" "lambda_layer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../${local.function_name}-layer"
  output_path = local.layer_zip_path
}

// Event source mapping
resource "aws_lambda_event_source_mapping" "event_source_mapping" {
  event_source_arn                   = aws_sqs_queue.delay_queue.arn
  enabled                            = true
  function_name                      = aws_lambda_function.lambda.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 60
  function_response_types            = ["ReportBatchItemFailures"]
}

## Lambda Role
data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  name               = "${local.function_name}-role"
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

## Allow access to Secrets Manager
data "aws_iam_policy_document" "read_secrets" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecretVersionIds"
    ]

    resources = [
      aws_secretsmanager_secret.bsky_secrets.arn,
    ]
  }
}

# Allow receiving messages from SQS
data "aws_iam_policy_document" "receive_sqs" {
  statement {
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]

    resources = [
      aws_sqs_queue.delay_queue.arn,
    ]
  }
}

resource "aws_iam_policy" "receive_sqs" {
  name   = "${local.function_name}-receive-sqs"
  path   = "/"
  policy = data.aws_iam_policy_document.receive_sqs.json
}

resource "aws_iam_role_policy_attachment" "receive_sqs" {
  policy_arn = aws_iam_policy.receive_sqs.arn
  role       = aws_iam_role.lambda_role.name
}

resource "aws_iam_policy" "read_secrets" {
  name   = "${local.function_name}-read-secrets"
  path   = "/"
  policy = data.aws_iam_policy_document.read_secrets.json
}

resource "aws_iam_role_policy_attachment" "read_secrets" {
  policy_arn = aws_iam_policy.read_secrets.arn
  role       = aws_iam_role.lambda_role.name
}

## Allow read/write access to DynamoDB table
data "aws_iam_policy_document" "dynamodb_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem",
      "dynamodb:PutItem",
      "dynamodb:DescribeTable",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem"
    ]

    resources = [
      aws_dynamodb_table.table.arn,
    ]
  }
}

resource "aws_iam_policy" "dynamodb_access" {
  name   = "${local.function_name}-dynamodb-access"
  path   = "/"
  policy = data.aws_iam_policy_document.dynamodb_access.json
}

resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  policy_arn = aws_iam_policy.dynamodb_access.arn
  role       = aws_iam_role.lambda_role.name
}

# Allow read from S3
data "aws_iam_policy_document" "s3_access" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${aws_s3_bucket.bucket.arn}/*",
    ]
  }
}

resource "aws_iam_policy" "s3_access" {
  name   = "${local.function_name}-s3-access"
  path   = "/"
  policy = data.aws_iam_policy_document.s3_access.json
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  policy_arn = aws_iam_policy.s3_access.arn
  role       = aws_iam_role.lambda_role.name
}

resource "aws_cloudwatch_log_group" "function_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.lambda.function_name}"
  retention_in_days = 7
  lifecycle {
    prevent_destroy = false
  }
}
