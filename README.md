# Sample NestJS ECS Deployment

This repository serves as a sample to demonstrate the deployment of a NestJS application to AWS ECS (Fargate).

## Features

- **NestJS Application**: Initialized with `@nestjs/cli`.
- **Dockerfile**: Optimized multi-stage build following best practices for production (runs as a non-root user).
- **GitHub Actions workflows**:
  - `pr-build.yml`: Verifies the Docker build on PRs pointing to `main`.
  - `deploy-main.yml`: Builds and pushes the Docker image to AWS ECR, and updates the ECS task definition when merging to `main`.
