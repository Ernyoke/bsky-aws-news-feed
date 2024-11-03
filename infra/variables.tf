variable "project_name" {
  default = "bsky-aws-news-feed"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "bsky_handle" {
  type = string
}

variable "bsky_password" {
  type = string
}

variable "dry_run" {
  type    = bool
  default = true
}