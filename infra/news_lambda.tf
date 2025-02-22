locals {
  news_function_name  = "${var.project_name}-lambda"
  news_zip_path       = "${path.module}/temp/${local.news_function_name}.zip"
  news_layer_zip_path = "${path.module}/temp/${local.news_function_name}-layer.zip"
  news_lambda_timeout = 60 * 5 // 5 minutes
}

resource "aws_lambda_function" "news_lambda" {
  function_name    = local.news_function_name
  handler          = "index.handler"
  memory_size      = 1024
  package_type     = "Zip"
  role             = aws_iam_role.news_lambda_role.arn
  runtime          = "nodejs20.x"
  filename         = local.news_zip_path
  source_code_hash = data.archive_file.news_lambda_zip.output_base64sha256
  timeout          = local.news_lambda_timeout
  architectures    = ["arm64"]
  layers           = [aws_lambda_layer_version.news_lambda_layer.arn]

  environment {
    variables = {
      BSKY_DRY_RUN        = var.dry_run
      BUCKET_NAME         = aws_s3_bucket.bucket.bucket
      NOVA_MICRO_MODEL_ID = "amazon.nova-micro-v1:0"
    }
  }
}

data "archive_file" "news_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../${local.news_function_name}/dist"
  output_path = local.news_zip_path
}

resource "aws_lambda_layer_version" "news_lambda_layer" {
  filename         = "temp/${local.news_function_name}-layer.zip"
  layer_name       = "${local.news_function_name}-layer"
  source_code_hash = data.archive_file.news_lambda_layer_zip.output_base64sha256

  compatible_runtimes = ["nodejs20.x"]
}

data "archive_file" "news_lambda_layer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../${local.news_function_name}-layer"
  output_path = local.news_layer_zip_path
}

// Event source mapping
resource "aws_lambda_event_source_mapping" "news_event_source_mapping" {
  event_source_arn                   = aws_sqs_queue.delay_queue.arn
  enabled                            = true
  function_name                      = aws_lambda_function.news_lambda.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 60
  function_response_types            = ["ReportBatchItemFailures"]
}

## Lambda Role
data "aws_iam_policy_document" "news_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "news_lambda_role" {
  assume_role_policy = data.aws_iam_policy_document.news_assume_role.json
  name               = "${local.news_function_name}-role"
}

resource "aws_iam_role_policy_attachment" "news_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.news_lambda_role.name
}

## Allow access to Secrets Manager
data "aws_iam_policy_document" "news_read_secrets" {
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
data "aws_iam_policy_document" "news_receive_sqs" {
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

resource "aws_iam_policy" "news_receive_sqs" {
  name   = "${local.news_function_name}-receive-sqs"
  path   = "/"
  policy = data.aws_iam_policy_document.news_receive_sqs.json
}

resource "aws_iam_role_policy_attachment" "news_receive_sqs" {
  policy_arn = aws_iam_policy.news_receive_sqs.arn
  role       = aws_iam_role.news_lambda_role.name
}

# Allow reading from secrets
resource "aws_iam_policy" "news_read_secrets" {
  name   = "${local.news_function_name}-read-secrets"
  path   = "/"
  policy = data.aws_iam_policy_document.news_read_secrets.json
}

resource "aws_iam_role_policy_attachment" "news_read_secrets" {
  policy_arn = aws_iam_policy.news_read_secrets.arn
  role       = aws_iam_role.news_lambda_role.name
}

# Allow read/write access to DynamoDB table
data "aws_iam_policy_document" "news_dynamodb_access" {
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

resource "aws_iam_policy" "news_dynamodb_access" {
  name   = "${local.news_function_name}-dynamodb-access"
  path   = "/"
  policy = data.aws_iam_policy_document.news_dynamodb_access.json
}

resource "aws_iam_role_policy_attachment" "news_dynamodb_access" {
  policy_arn = aws_iam_policy.news_dynamodb_access.arn
  role       = aws_iam_role.news_lambda_role.name
}

# Allow read from S3
data "aws_iam_policy_document" "news_s3_access" {
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

resource "aws_iam_policy" "news_s3_access" {
  name   = "${local.news_function_name}-s3-access"
  path   = "/"
  policy = data.aws_iam_policy_document.news_s3_access.json
}

resource "aws_iam_role_policy_attachment" "news_s3_access" {
  policy_arn = aws_iam_policy.news_s3_access.arn
  role       = aws_iam_role.news_lambda_role.name
}

# Allow to invoke Bedrock Model
data "aws_iam_policy_document" "news_invoke_bedrock" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:ListFoundationModels"
    ]

    resources = [
      "*",
    ]
  }
}

resource "aws_iam_policy" "news_invoke_bedrock" {
  name   = "${local.news_function_name}-invoke-bedrock"
  path   = "/"
  policy = data.aws_iam_policy_document.news_invoke_bedrock.json
}

resource "aws_iam_role_policy_attachment" "news_invoke_bedrock" {
  policy_arn = aws_iam_policy.news_invoke_bedrock.arn
  role       = aws_iam_role.news_lambda_role.name
}

resource "aws_cloudwatch_log_group" "news_function_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.news_lambda.function_name}"
  retention_in_days = 7
  lifecycle {
    prevent_destroy = false
  }
}
