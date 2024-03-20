locals {
  metabase_domain         = "metabase.aws.tldraw.xyz"
  metabase_container_name = "metabase"
  # Metabase uses this port by default
  metabase_container_port = 3000

  metabase_db_user = "captain"

  metabase_container_defs = [
    {
      name        = local.metabase_container_name
      image       = "metabase/metabase:v0.49.0"
      essential   = true
      environment = local.metabase_env

      portMappings = [
        {
          containerPort = local.metabase_container_port
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.metabase.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ]

  metabase_env = [
    {
      name  = "JAVA_TIMEZONE"
      value = "Europe/London"
    },
    {
      name  = "MB_DB_TYPE"
      value = "postgres"
    },
    {
      name  = "MB_DB_DBNAME"
      value = aws_db_instance.metabase.db_name
    },
    {
      name  = "MB_DB_PORT"
      value = tostring(aws_db_instance.metabase.port)
    },
    {
      name  = "MB_DB_HOST"
      value = aws_db_instance.metabase.address
    },
    {
      name  = "MB_DB_USER",
      value = local.metabase_db_user
    },
    {
      name      = "MB_DB_PASS"
      value = var.metabase_db_password
    },
  ]
}

resource "aws_cloudwatch_log_group" "metabase" {
  name              = "metabase"
  retention_in_days = 7

  tags = local.default_tags
}

resource "aws_ecs_task_definition" "metabase" {
  family                   = "metabase"
  container_definitions    = jsonencode(local.metabase_container_defs)
  execution_role_arn       = aws_iam_role.metabase_task.arn
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024 # this is 1 full vCPU
  memory                   = 2048 # mb; min size for 1vCPU

  tags = local.default_tags
}

resource "aws_ecs_service" "metabase" {
  name                              = "metabase"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.metabase.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  propagate_tags                    = "SERVICE"
  health_check_grace_period_seconds = 30
  depends_on = [
    # it won't be accessible before the rule is created and there is no direct resource dependency
    aws_lb_listener_rule.metabase,
  ]

  load_balancer {
    target_group_arn = aws_lb_target_group.metabase.arn
    container_name   = local.metabase_container_name
    container_port   = local.metabase_container_port
  }

  network_configuration {
    security_groups = [aws_security_group.metabase_ecs_task.id]
    subnets         = module.vpc.private_subnets
  }

  # terraform will not finish the apply till the service is healthy or fails
  # wait_for_steady_state = true

  # it's OK to switch off while deploying
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = local.default_tags
}