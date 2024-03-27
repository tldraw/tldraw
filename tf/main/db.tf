data "aws_rds_certificate" "default" {
  id = "rds-ca-rsa2048-g1" # selected by default as of 2024-03
}

# AWS documentation is unclear if it's on by default for PG16, so it's set explicitly
resource "aws_db_parameter_group" "force_ssl" {
  name        = "force-ssl"
  family      = "postgres16"
  description = "Default + forced SSL"

  parameter {
    # required to avoid deltas
    apply_method = "pending-reboot"
    name         = "rds.force_ssl"
    value        = "1"
  }
}
