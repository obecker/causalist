# <img src="frontend/public/logo.svg" width="24"> Causalist

Causalist is a tool designed for the organization and monitoring of legal cases in the German legal system. 
The application operates on AWS and comprises a Kotlin-based lambda backend along with a React-based frontend.

Please be aware that the deployed service is presently not accessible to the public.


## Backend

The [backend](backend) directory contains a Gradle project responsible for the backend service, which exposes a 
REST API for the frontend. This service, implemented in Kotlin, utilizes [http4k](https://github.com/http4k/http4k) 
for the API and [http4k-connect](https://github.com/http4k/http4k-connect) 
for [DynamoDB](https://aws.amazon.com/dynamodb/) and [S3](https://aws.amazon.com/s3/) access.

To run the service locally, local instances of DynamoDB and S3 are required. 
There is a [docker compose](scripts/docker-compose.yml) file that starts a local DynamoDB and a [MinIO](https://min.io)
server (for S3).
The scripts [init-local-dynamodb.sh](scripts/init-local-dynamodb.sh) and [init-local-s3.sh](scripts/init-local-s3.sh) 
facilitate the initial creation of the required local DynamoDB tables and the local S3 bucket.

Execute the command `gradle runShadow` to launch the application at `http://localhost:4000`.

Visit http://localhost:4000/api/ to access a Swagger UI providing documentation for the service's API.


## Frontend

Within the [frontend](frontend) directory, you'll find the source code for a single-page application that interfaces 
with the backend service. This application is developed in JavaScript, employing [Vite](https://vitejs.dev), 
[React](https://react.dev), and [Tailwind CSS](https://tailwindcss.com).

To initiate a server delivering the frontend, execute the command `pnpm run start`.
The frontend will be accessible at http://localhost:3000, while it will interact with the backend service at 
`http://localhost:4000`.


## Infrastructure

In the [infrastructure](infrastructure) directory, you'll find the [Terraform](https://www.terraform.io) source code 
for deploying the service on AWS. Before the first deployment you need to:

- Create a Terraform [workspace](https://developer.hashicorp.com/terraform/language/state/workspaces) named `prod` (and optionally `stage`).
- Supply the necessary variables, as outlined in [variables.tf](infrastructure/variables.tf), by creating a file named 
  `prod.tfvars` (and optionally `stage.tfvars`).

To execute an AWS deployment, follow these steps:

1. Run `gradle assemble` in the backend directory.
2. Run `pnpm run build` in the frontend directory.
3. Execute `scripts/deploy.sh prod` or `scripts/deploy.sh stage`.

Note: Every AWS Lambda deployment creates a new function version, however
[terraform currently doesn't remove previous function versions](https://github.com/hashicorp/terraform-provider-aws/issues/17668).
To get rid of unused functions versions, execute the script [cleanup-lambda.sh](scripts/cleanup-lambda.sh).
