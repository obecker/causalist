terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.14.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4.1"
    }
  }

  required_version = ">= 1.6.6"
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      Service     = "Causalist"
      Environment = var.env
    }
  }
}

locals {
  project_dir = "${path.root}/.."
}
