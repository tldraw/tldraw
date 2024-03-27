# this zone is delegated from Cloudflare
resource "aws_route53_delegation_set" "main" {
  reference_name = "main"
}

resource "aws_route53_zone" "aws_tldraw_xyz" {
  name              = "aws.tldraw.xyz"
  delegation_set_id = aws_route53_delegation_set.main.id

  tags = local.default_tags
}

output "nameservers" {
  value = aws_route53_delegation_set.main.name_servers
}

resource "aws_route53_record" "aws_tlraw_xyz_caa" {
  name    = "aws.tldraw.xyz"
  type    = "CAA"
  zone_id = aws_route53_zone.aws_tldraw_xyz.id
  ttl     = 600

  records = [
    "0 issue \"amazonaws.com\"",
    "0 issuewild \"amazonaws.com\""
  ]
}

resource "aws_route53_record" "aws_tldraw_xyz_a_to_lb" {
  for_each = toset(["aws.tldraw.xyz", "metabase.aws.tldraw.xyz"])

  name    = each.key
  type    = "A"
  zone_id = aws_route53_zone.aws_tldraw_xyz.id

  alias {
    evaluate_target_health = false
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
  }
}