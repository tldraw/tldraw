resource "aws_security_group" "lb" {
  name        = "lb"
  description = "Load Balancer security group: allow HTTP and TLS inbound traffic and all outbound traffic"
  vpc_id      = module.vpc.vpc_id

  tags = local.default_tags

  lifecycle {
    create_before_destroy = true
  }
}

# the LB can be accessed via HTTP
resource "aws_vpc_security_group_ingress_rule" "lb_allow_https_ipv4" {
  security_group_id = aws_security_group.lb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# the LB can be accessed via HTTP
resource "aws_vpc_security_group_ingress_rule" "lb_allow_http_ipv4" {
  security_group_id = aws_security_group.lb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

# the LB can talk to anything
resource "aws_vpc_security_group_egress_rule" "lb_allow_all_ipv4" {
  security_group_id = aws_security_group.lb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # apparently equivalent to "all ports"
}
