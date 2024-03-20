resource "aws_security_group" "cf_worker_analytics_db" {
  name   = "cf_worker_analytics"
  vpc_id = module.vpc.vpc_id

  tags = local.default_tags

  lifecycle {
    create_before_destroy = true
  }
}

# allow incoming connections from everywhere
# todo: tighten this up
resource "aws_vpc_security_group_ingress_rule" "cf_worker_analytics_db" {
  security_group_id            = aws_security_group.cf_worker_analytics_db.id
  cidr_ipv4                    = "0.0.0.0/0"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}


resource "aws_db_instance" "cf_worker_analytics" {
  storage_type      = "gp3"
  allocated_storage = 20
  db_name           = "cfwanalytics"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.t4g.micro"

  username = "captain"
  # see the comment in metabase_db.tf
  password = var.cf_worker_analytics_db_password

  parameter_group_name = aws_db_parameter_group.force_ssl.name

  skip_final_snapshot = true # todo

  backup_retention_period = 7
  ca_cert_identifier      = data.aws_rds_certificate.default.id

  db_subnet_group_name = module.vpc.database_subnet_group_name
  deletion_protection  = false # todo: set to true

  multi_az = false

  publicly_accessible    = true
  vpc_security_group_ids = [aws_security_group.cf_worker_analytics_db.id]

  tags = local.default_tags
}
