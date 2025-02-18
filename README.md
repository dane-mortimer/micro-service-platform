# Unified Microservices Orchestration Platform

[tldr; How do I use this thing?](#usage)

## TOC 

1. [Summary](#summary)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Usage](#usage)
    1. [Assume credentials & Bootstrap account](#assume-credentials--bootstrap-account)
    2. [Ensure configuration is correct](#ensure-configuration-is-correct)
    3. [Deploy CDK infrastructure](#deploy-cdk-infrastructure)
5. [Local Development](#local-development)

## Summary

The purpose of this CDK application is to provision and manage a fully managed microservices architecture using Amazon ECS Fargate. The infrastructure is driven by a configuration file that defines services and their associated settings, such as CPU, memory, and whether a load balancer should be attached. For each service, you can specify a task role to grant access to necessary AWS resources. Additionally, you can define dependencies between services, which will automatically inject the dependent services' DNS names as environment variables (e.g., USER_SERVICE_DNS) for seamless communication.

For simplicity, the services are defined within this repository. However, in a real-world scenario, these services would typically be managed in separate repositories, owned and maintained by independent teams.

## Project structure

``` 
micro-service-platform/          # Root directory of the project
├── bin                          # CDK application entry point
├── config                       # CDK configuration file for multi-environment infrastructure
├── constructs                   # Construct Library 
├── lib                          # Stacks
├── scripts                      # Scripts / Any prerequisites
├── services                     # Application Services
├── test                         # Infrastructure Unit tests
└── utils                        # Utility functions
```

## Architecture

Below is an example architecture diagram of what can be built using this infrastructure. The design is highly flexible—the Application Load Balancer (ALB) can be deployed in the public subnet if needed, but this is optional and configurable.

A core principle of this application is its configuration-driven approach. All configurations are defined in ./config/config.ts, where you specify settings for each environment, including service locations, container CPU and memory allocation, and load balancer configurations.

Additional services can be easily integrated in the future by creating and building them in the services directory and adding their details to the configuration file.

![Architecture](./assets/Microservices-Platform.png)

## Usage

Pre-reqs:
  - Docker installed
  - Node installed
  - `npm install -g aws-cdk`

### Assume credentials & Bootstrap account

1. [Assume AWS Credentials](https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-configure.html)
    ``` bash
    # Once credentials have been assumed run this command
    export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
    ```
1. Bootstrap CDK account
    ``` bash
    export AWS_DEFAULT_REGION="eu-west-1"
    export CDK_DEFAULT_REGION=$AWS_DEFAULT_REGION

    cdk bootstrap
    ```

### Ensure configuration is correct

1. Check the environment configuration and ensure it matches your services.

``` typescript
// ./config/config.ts

const CONFIGURATION: IConfig = {
  'dev': {
    account: '12345678901',
    region: 'eu-west-1',
    services: [
      {
        serviceDockerfileDirectory: path.join(__dirname, '../services/user-service'),
        name: 'user-service', 
        containerPort: 80,
        taskRolePolicies: [], 
      },
      {
        serviceDockerfileDirectory: path.join(__dirname, '../services/movie-service'),
        name: 'movie-service', 
        dependentServices: [
          {
            name: 'user-service',
            port: 80
          }
        ],
        taskRolePolicies: []
      },
    ]
  },
}
```

### Deploy CDK infrastructure

Once your configuration has been successfully set, you can simply run the following command

:warning: `dev` is the key in the configuration file. 

``` bash
cdk deploy -c "environment=dev" 
```

## Local Development

``` bash
cd services

# Use docker-compose for local development
docker-compose up --build

curl "http://localhost:8081/movies?user_id=1"
```