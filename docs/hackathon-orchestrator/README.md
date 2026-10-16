# Hackathon Orchestrator

The Hackathon Orchestrator (`npm run hackathon`) is an interactive CLI designed to turn a problem statement into an approved technical project configuration in seconds, accelerating the critical first hour of any hackathon.

It acts as a **Planning and Recommendation System**, guiding the technical decision-making process without autonomously writing unverified domain code.

## Core Features

- **AI-Assisted Configuration**: Analyzes a problem statement, target clients, and time limit to recommend the optimal stack capabilities (using OpenAI/Anthropic via Vercel AI SDK).
- **Manual Mode**: Offers granular control to toggle 30+ internal capabilities (e.g., PostgreSQL, Redis, Auth, RAG, Webhooks, Push Notifications).
- **Dependency Resolution**: Automatically activates required underlying capabilities (e.g., selecting `rag` automatically enables `ai`, `database`, and `fileProcessing`).
- **Safe Scaffold**: Previews all environment modifications and files before mutating the repository (`--dry-run` available).
- **Project Blueprint**: Generates `.hackathon/` directory containing JSON manifests for capabilities, environment requirements, MVP scope, and API boundaries.

## Usage

Start the interactive wizard:
```bash
npm run hackathon
```

Jump directly to modes:
```bash
npm run hackathon:ai
npm run hackathon:manual
```

View the generated plan for the current repository:
```bash
npm run hackathon:snapshot
```

Clear the generated plan safely:
```bash
npm run hackathon:reset
```

## How It Works

1. **Problem Statement**: The wizard collects the hackathon goal and constraints.
2. **Analysis**: The AI processes the goal against the strict `CAPABILITIES` registry.
3. **Recommendation**: It classifies each capability as REQUIRED, RECOMMENDED, OPTIONAL, or NOT NEEDED with reasoning.
4. **Approval**: The developer explicitly approves or manually overrides the recommendations.
5. **Manifest Generation**: `.hackathon/` is populated with `capabilities.json`, `project.json`, `plan.json`, and `.env.requirements`.
6. **Scaffold**: The environment is securely bootstrapped with the chosen primitives.

The output explicitly stops short of writing domain-specific logic, leaving the codebase clean, generic, and ready for you to build the unique hackathon solution.
