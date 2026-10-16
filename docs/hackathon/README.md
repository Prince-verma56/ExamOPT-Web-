# Fullstack Hackathon Template

## Developer Experience & Architecture

This repository is optimized for speed, modularity, and rapid prototyping during 24-hour hackathons.

### Getting Started

Run the setup command to automatically verify your environment, install dependencies, spin up infrastructure, seed the database, and verify the build:

```bash
npm run setup
```

To see the health of your environment, run:

```bash
npm run doctor
```

### Core Architecture

- **Next.js App Router** (React 19)
- **Database:** PostgreSQL (with `pgvector`) via Prisma ORM
- **UI:** Tailwind CSS v4, shadcn/ui, base-ui, GSAP, Lenis
- **AI Engine:**
  - Standardized `AIContextBuilder`
  - Integrated persistent memory and conversational state
  - Text + Voice unified continuity
  - MCP Tool Registry
  - LangGraph for multi-step agents
- **Voice:** Vapi (via separate Webhook for secure context injection)

### Feature Toggles (config/features.ts)
Change capabilities centrally using `config/features.ts` or via `.env` variables (`FEATURE_AI=true`). See `config/profiles/` for presets (Minimal, AI, Voice, Full).

### Generating Boilerplate

Avoid repetitive setup by generating scaffolding automatically:

```bash
npm run generate
```

- **module**: Creates a full module folder (actions, queries, schema, types, components)
- **crud**: Creates a module with generic CRUD scaffolding
- **tool**: Creates an AI Tool and registers it
- **agent**: Creates a LangGraph AI Agent skeleton
- **api**: Generates a standard Next.js Route Handler

### Development Tools

- `npm run infra:up` - Start Docker infrastructure
- `npm run db:studio` - Open Prisma Studio
- `npm run audit:project` - Run typecheck, lint, and all tests
- `npm run demo` - Seed generic testing data and switch to demo profile

### Recipes

Need to build a specific feature quickly? Check out the [Recipes Directory](../recipes/) for copy-paste implementations of auth, AI chat, RAG workflows, billing logic, and more.

### Documentation

- [AI Documentation](../ai/)
- [Voice Integration](../voice/)
- [Providers](../providers/)
