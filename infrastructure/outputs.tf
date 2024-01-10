output "cloudfront_url" {
  value = aws_cloudfront_distribution.causalist.domain_name
}
