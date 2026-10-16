# Quick Start

## Prerequisites

- Node.js 18+
- Docker Desktop (for local infrastructure)

## Setup

```bash
# Clone and install
git clone <repository>
cd fullstack-template
npm run setup

# Start infrastructure (PostgreSQL + Mailpit)
npm run infra:up

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

## Available Commands

| Command              | Description                          |
|----------------------|--------------------------------------|
| `npm run dev`        | Start Next.js development server     |
| `npm run build`      | Production build                     |
| `npm run typecheck`  | TypeScript type checking             |
| `npm run lint`       | ESLint                               |
| `npm run test`       | Run all tests                        |
| `npm run test:unit`  | Run unit tests                       |
| `npm run doctor`     | Diagnose environment issues          |
| `npm run infra:up`   | Start Docker infrastructure          |
| `npm run infra:down` | Stop Docker infrastructure           |
| `npm run db:migrate` | Run Prisma migrations                |
| `npm run db:seed`    | Seed database with demo data         |
| `npm run db:studio`  | Open Prisma Studio                   |
| `npm run demo`       | Seed demo data for presentation      |
| `npm run reset`      | Reset database (destructive)         |

## Infrastructure Services

| Service    | Port | Description             |
|------------|------|-------------------------|
| PostgreSQL | 5432 | Primary database        |
| Mailpit    | 8025 | Development email UI    |
| Mailpit    | 1025 | SMTP for sending email  |
| Redis      | 6379 | Optional (use profile)  |

To include Redis:
```bash
docker compose -f docker/compose.dev.yaml --profile redis up -d
```
