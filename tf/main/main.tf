provider "aws" {
  region = "eu-west-2"
}

terraform {
  backend "s3" {
    region  = "eu-west-2"
    key     = "tfstate/main/terraform.tfstate"
    encrypt = true

    # managed by /tf/bootstrap
    dynamodb_table = "tldraw-prod-terraform-state-lock"
    bucket         = "tldraw-prod-terraform-state"
  }
}

locals {
  default_tags = {
    "Stack"       = "main"
    "Environment" = "prod"
  }
}

data "aws_region" "current" {}