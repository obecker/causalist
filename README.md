# <img src="frontend/public/logo.svg" width="24"> Causalist

Causalist is a tool designed for the organization and monitoring of legal cases in the German legal system. 
The application operates on AWS and comprises a Kotlin-based lambda backend along with a React-based frontend.

Please be aware that the deployed service is presently not accessible to the public.


## Backend

The [backend](backend) directory contains a Gradle project responsible for the backend service, which exposes a 
REST API for the frontend. This service, implemented in Kotlin, utilizes [http4k](https://github.com/http4k/http4k) 
for the API and [http4k-connect](https://github.com/http4k/http4k-connect) 
for [DynamoDB](https://aws.amazon.com/dynamodb/) access.

To run the service locally, a local DynamoDB instance on `http://localhost:8000` is required. 
You can achieve this by using tools like [NoSQL Workbench for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html)
or by running a [DynamoDB docker image](https://hub.docker.com/r/amazon/dynamodb-local).
The scripts in [backend/scripts](backend/scripts) facilitate the creation of the two tables `Users` and `Cases` in
the local DynamoDB instance.

Execute the command `gradle runShadow` to launch the application at `http://localhost:9000`.

Visit http://localhost:9000/api/ to access a Swagger UI providing documentation for the service's API.


## Frontend

Within the [frontend](frontend) directory, you'll find the source code for a single-page application that interfaces 
with the backend service. This application is developed in JavaScript, employing [Vite](https://vitejs.dev), 
[React](https://react.dev), and [Tailwind CSS](https://tailwindcss.com).

To initiate a server delivering the frontend, execute the command `npm run start`.
The frontend will be accessible at http://localhost:3000, while it will interact with the backend service at 
`http://localhost:9000`.


## Infrastructure

In the [infrastructure](infrastructure) directory, you'll find the [Terraform](https://www.terraform.io) source code 
for deploying the service on AWS. Before the first deployment you need to:

- Create a Terraform [workspace](https://developer.hashicorp.com/terraform/language/state/workspaces) named `prod` (and optionally `stage`).
- Supply the necessary variables, as outlined in [variables.tf](infrastructure/variables.tf), by creating a file named 
  `prod.tfvars` (and optionally `stage.tfvars`).

To execute an AWS deployment, follow these steps:

1. Run `gradle build` in the backend directory.
2. Run `npm run build` in the frontend directory.
3. Execute `./deploy.sh prod` or `./deploy.sh stage` in the infrastructure directory.
