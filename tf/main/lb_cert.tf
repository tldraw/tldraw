resource "aws_acm_certificate" "aws_tldraw_xyz" {
  domain_name               = "aws.tldraw.xyz"
  subject_alternative_names = ["*.aws.tldraw.xyz"]
  validation_method         = "DNS"

  tags = local.default_tags
}

resource "aws_route53_record" "aws_tldraw_xyz_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.aws_tldraw_xyz.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.aws_tldraw_xyz.zone_id

  depends_on = [
    # otherwise validation will fail
    aws_route53_record.aws_tlraw_xyz_caa
  ]
}

resource "aws_acm_certificate_validation" "aws_tldraw_xyz" {
  certificate_arn         = aws_acm_certificate.aws_tldraw_xyz.arn
  validation_record_fqdns = [for record in aws_route53_record.aws_tldraw_xyz_cert_validation : record.fqdn]
}