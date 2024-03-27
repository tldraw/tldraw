resource "aws_lb" "main" {
  name               = "main-prod"
  load_balancer_type = "application"

  security_groups = [aws_security_group.lb.id]
  subnets         = module.vpc.public_subnets

  enable_deletion_protection = false

  tags = local.default_tags
}

# just redirect everything to HTTPS
resource "aws_lb_listener" "main_http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "main_https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  # this policy is recommended by AWS as of 2024-03
  # see https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html#describe-ssl-policies
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn = aws_acm_certificate_validation.aws_tldraw_xyz.certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not found"
      status_code  = "404"
    }
  }
}