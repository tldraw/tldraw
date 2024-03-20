resource "aws_security_group" "metabase_ecs_task" {
  name   = "metabase_ecs_task"
  vpc_id = module.vpc.vpc_id

  tags = local.default_tags

  lifecycle {
    create_before_destroy = true
  }
}

# metabase can reach out to the internet (and elsewhere)
resource "aws_vpc_security_group_egress_rule" "metabase_allow_all_ipv4" {
  security_group_id = aws_security_group.metabase_ecs_task.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # apparently equivalent to "all ports"
}

# metabase can be accessed by the LB
resource "aws_vpc_security_group_ingress_rule" "metabase_allow_lb" {
  security_group_id            = aws_security_group.metabase_ecs_task.id
  referenced_security_group_id = aws_security_group.lb.id
  from_port                    = local.metabase_container_port
  to_port                      = local.metabase_container_port
  ip_protocol                  = "tcp"
}

resource "aws_security_group" "metabase_db" {
  name   = "metabase_db"
  vpc_id = module.vpc.vpc_id

  tags = local.default_tags

  lifecycle {
    create_before_destroy = true
  }
}

# allow metabase task to connect to its db
resource "aws_vpc_security_group_ingress_rule" "metabase_db" {
  security_group_id            = aws_security_group.metabase_db.id
  referenced_security_group_id = aws_security_group.metabase_ecs_task.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
