variable "env" {
  type        = string
  description = "Environment identifier: prod, stage, ..."
}

variable "certificate_arn" {
  type        = string
  description = "ARN of an existing SSL/TLS certificate in ACM, see https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list"
}

variable "encryption_key" {
  type        = string
  sensitive   = true
  description = "Base64 encoded 256 bit (32 byte) secret key"
}

variable "password_salt" {
  type        = string
  sensitive   = true
  description = "Password salt used for creating the key that encrypts/decrypts the user encryption key"
}

variable "signing_secret" {
  type        = string
  sensitive   = true
  description = "Secret used for signing the API key of the user"
}

variable "basic_auth" {
  type        = string
  sensitive   = true
  description = "Basic authentication credentials in the form username:password"
}
