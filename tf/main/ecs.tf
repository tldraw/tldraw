resource "aws_ecs_cluster" "main" {
  name = "main"

  tags = local.default_tags
}