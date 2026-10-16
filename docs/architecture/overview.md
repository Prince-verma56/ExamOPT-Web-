# Architecture Overview

This project follows a modular, domain-oriented architecture designed for rapid hackathon development.

## Boundaries

| Boundary       | Location         | Purpose                                      |
|----------------|------------------|----------------------------------------------|
| APP            | `app/`           | Next.js routes, layouts, page composition    |
| UI             | `components/`    | Reusable UI primitives                       |
| DOMAIN         | `modules/`       | Business capabilities                        |
| INFRASTRUCTURE | `server/`        | Database, providers, external services       |
| AI             | `ai/`            | AI generation, tools, agents, RAG            |
| ANIMATION      | `animations/`    | GSAP, ScrollTrigger, Lenis, motion presets   |

## Dependency Rule

```
UI → DOMAIN → INFRASTRUCTURE
UI → ANIMATION
DOMAIN → AI (only when needed)
```

## Key Principles

1. Provider abstraction over vendor lock-in
2. Feature flags for optional systems
3. Domain modules are independently removable
4. Animation is isolated from business logic
5. AI is optional at every level
