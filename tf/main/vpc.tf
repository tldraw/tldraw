locals {
  # no point in splitting across three AZs in our case, two AZs is cheaper
  azs = ["eu-west-2a", "eu-west-2b"]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.6.0"

  name = "main"
  cidr = "10.0.0.0/16"

  azs              = local.azs
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  database_subnets = ["10.0.11.0/24", "10.0.12.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24"]


  # just one gateway is OK, they aren't free
  enable_nat_gateway = true
  single_nat_gateway = true
  # one_nat_gateway_per_az = true

  # RDSes can be public
  create_database_subnet_group           = true
  create_database_subnet_route_table     = true
  create_database_internet_gateway_route = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.default_tags
}