provider "aws" {
  region = "eu-west-2"
}

module "terraform_state_backend" {
  source = "cloudposse/tfstate-backend/aws"
  version     = "1.4.1"
  namespace  = "tldraw"
  stage      = "prod"
  name       = "terraform"
  attributes = ["state"]

  enable_point_in_time_recovery = false

  force_destroy = false

  tags = {
    Environment = "prod"
    Stack = "bootstrap"
  }
}

output "tfstate_dynamodb_table_name" {
  value = module.terraform_state_backend.dynamodb_table_name
}

output "tfstate_s3_bucket_id" {
  value = module.terraform_state_backend.s3_bucket_id
}