resource "aws_lb_target_group" "metabase" {
  name        = "metabase"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  port        = local.metabase_container_port
  protocol    = "HTTP"

  health_check {
    path = "/"
  }

  tags = local.default_tags
}

resource "aws_lb_listener_rule" "metabase" {
  listener_arn = aws_lb_listener.main_https.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.metabase.arn
  }

  condition {
    host_header {
      values = [local.metabase_domain]
    }
  }
}