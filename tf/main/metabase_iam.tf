data "aws_iam_policy_document" "allow_ecs_to_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "metabase_task" {
  name               = "metabase_task"
  assume_role_policy = data.aws_iam_policy_document.allow_ecs_to_assume_role.json
  tags               = merge({ Name = "metabase-task" }, local.default_tags)
}

# allow the task to do standard AWS calls, see
# https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
resource "aws_iam_role_policy_attachment" "allow_metabase_task_to_do_aws_calls" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  role       = aws_iam_role.metabase_task.name
}