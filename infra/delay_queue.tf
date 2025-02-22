
locals {
  delay_queue_name = "${var.project_name}-delay-queue"
}

resource "aws_sqs_queue" "delay_queue" {
  name                       = local.delay_queue_name
  message_retention_seconds  = 1209600 // 14 days (max)
  receive_wait_time_seconds  = 20      // long polling
  visibility_timeout_seconds = 6 * local.news_lambda_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.blogs_queue_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "blogs_queue_dlq" {
  name = "${local.delay_queue_name}-dlq"
}