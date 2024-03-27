resource "aws_db_instance" "metabase" {
  storage_type      = "gp3"
  allocated_storage = 20
  db_name           = "metabase"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.t4g.micro"

  username = "captain"
  # this is not ideal, but Secrets Manager seems to be a bit of a pain:
  # - there is no good way to either handle autoration or disable it
  # - the API doesn't seem to accept AWSCURRENT as a version
  # with this approach, the password is stored in the state file, but it's OK
  # as the state is in our private bucket
  password = var.metabase_db_password

  parameter_group_name = aws_db_parameter_group.force_ssl.name

  skip_final_snapshot = true

  backup_retention_period = 7
  ca_cert_identifier      = data.aws_rds_certificate.default.id

  db_subnet_group_name = module.vpc.database_subnet_group_name
  deletion_protection  = false

  multi_az = false

  vpc_security_group_ids = [aws_security_group.metabase_db.id]

  tags = local.default_tags
}
