#!/bin/bash 

if [ $# != 2 ];
  echo "$0 expects 2 arguemnts <repo-name> <region>"
  exit 1 
fi

# Variables
REPO_NAME=$1  # Replace with your desired repository name
AWS_REGION=$2   # Replace with your AWS region

# Check if the ECR repository already exists
REPO_EXISTS=$(aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" 2>&1)

if echo "$REPO_EXISTS" | grep -q "RepositoryNotFoundException"; then
  # Create the ECR repository
  echo "Creating ECR repository: $REPO_NAME"
  aws ecr create-repository \
    --repository-name "$REPO_NAME" \
    --region "$AWS_REGION"

  # Output the repository URI
  REPO_URI=$(aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" --query "repositories[0].repositoryUri" --output text)
  echo "ECR repository created successfully."
  echo "Repository URI: $REPO_URI"
else
  # Repository already exists
  echo "ECR repository '$REPO_NAME' already exists."
  REPO_URI=$(aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" --query "repositories[0].repositoryUri" --output text)
  echo "Repository URI: $REPO_URI"
fi