# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev        # Hot reload dev server
npm run start:debug      # Debug mode with inspector

# Build
npm run build            # Compile TypeScript

# Testing
npm run test             # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # With coverage
npm run test:e2e         # End-to-end tests

# Code quality
npm run lint             # ESLint with auto-fix
npm run format           # Prettier formatting
```

To run a single test file:
```bash
npx jest src/app.controller.spec.ts
```

## Architecture

This is a **NestJS** application deployed to **AWS ECS Fargate** via GitHub Actions.

### Application Structure

- `src/main.ts` — Bootstraps NestJS; listens on `process.env.PORT ?? 3000`
- `src/app.module.ts` — Root module wiring controller + service
- `src/app.controller.ts` — HTTP controller (GET `/`)
- `src/app.service.ts` — Business logic (currently returns greeting string)

### CI/CD

Two GitHub Actions workflows:
- **`pr-build.yml`** — Triggered on PRs to `main`: installs, builds, verifies Docker build
- **`deploy-main.yml`** — Triggered on push to `main`: builds and pushes Docker image to **Amazon ECR**, then deploys to **ECS** (Fargate) by updating the task definition

### Docker

`Dockerfile` is the active multi-stage build (Node 20-alpine):
- **development** stage: hot reload
- **build** stage: compiles TypeScript, prunes dev deps
- **production** stage: minimal image, non-root user (`nestjs:1001`), exposes port **3002**

`Dockerfile.new` and `Dockerfile.newest` are Node 22-alpine variants (not currently deployed).

### Testing Context

Per `docs/tickets/STRAND-0/`, the project is intended for **load and stress testing on ECS**. Recommended tooling is **k6** (primary), Artillery (secondary), with CloudWatch correlation for ECS metrics.
