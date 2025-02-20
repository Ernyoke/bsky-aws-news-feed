locals {
  fetcher_function_name       = "${var.project_name}-fetcher-lambda"
  fetcher_zip_path            = "${path.module}/temp/${local.fetcher_function_name}.zip"
  fetcher_news_lambda_timeout = 60 * 5 // 5 minutes
}

resource "aws_lambda_function" "fetcher_lambda" {
  function_name    = local.fetcher_function_name
  handler          = "index.handler"
  memory_size      = 1024
  package_type     = "Zip"
  role             = aws_iam_role.fetcher_lambda_role.arn
  runtime          = "nodejs20.x"
  filename         = local.fetcher_zip_path
  source_code_hash = data.archive_file.fetcher_lambda_zip.output_base64sha256
  timeout          = local.fetcher_news_lambda_timeout
  architectures    = ["arm64"]

  environment {
    variables = {
      SQS_URL      = aws_sqs_queue.delay_queue.url
      TABLE_NAME   = aws_dynamodb_table.table.name
    }
  }
}

data "archive_file" "fetcher_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../${local.fetcher_function_name}/dist"
  output_path = local.fetcher_zip_path
}

resource "aws_cloudwatch_event_rule" "fetcher_every_thirty_minutes" {
  name                = "${local.fetcher_function_name}-every-30-min"
  description         = "Run ${local.fetcher_function_name} every thirty minutes"
  schedule_expression = "rate(30 minutes)"
  state               = "DISABLED"
}

resource "aws_cloudwatch_event_target" "fetcher_target" {
  rule      = aws_cloudwatch_event_rule.fetcher_every_thirty_minutes.name
  target_id = "${local.fetcher_function_name}-target"
  arn       = aws_lambda_function.fetcher_lambda.arn
}

resource "aws_lambda_permission" "fetcher_lambda_permission" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fetcher_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.fetcher_every_thirty_minutes.arn
}

## Lambda Role
data "aws_iam_policy_document" "fetcher_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "fetcher_lambda_role" {
  assume_role_policy = data.aws_iam_policy_document.fetcher_assume_role.json
  name               = "${local.fetcher_function_name}-role"
}

resource "aws_iam_role_policy_attachment" "fetcher_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.fetcher_lambda_role.name
}

## Allow read/write access to DynamoDB table
data "aws_iam_policy_document" "fetcher_dynamodb_access" {
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

resource "aws_iam_policy" "fetcher_dynamodb_access" {
  name   = "${local.fetcher_function_name}-dynamodb-access"
  path   = "/"
  policy = data.aws_iam_policy_document.fetcher_dynamodb_access.json
}

resource "aws_iam_role_policy_attachment" "fetcher_dynamodb_access" {
  policy_arn = aws_iam_policy.fetcher_dynamodb_access.arn
  role       = aws_iam_role.fetcher_lambda_role.name
}

resource "aws_cloudwatch_log_group" "fetcher_function_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.fetcher_lambda.function_name}"
  retention_in_days = 7
  lifecycle {
    prevent_destroy = false
  }
}
