# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-06

### Added
- **Core Architecture:** Next.js App Router foundation with route groups.
- **Styling:** Tailwind CSS v4, shadcn/ui components, custom CSS variables.
- **Database:** PostgreSQL integration via Prisma and pgvector for AI memory.
- **Authentication:** Clerk integration supporting both web and mobile Bearer tokens.
- **Realtime:** Server-Sent Events (SSE) system for notifications and AI streaming.
- **Jobs:** Persistent PostgreSQL-backed job queue with `DatabaseJobWorker`.
- **Scheduler:** Distributed cron-based scheduler.
- **Notifications:** Generic NotificationService supporting in-app, email, and push (FCM) channels.
- **Integrations:** Generic HTTP Integration Engine with retries and abort controllers.
- **Location:** Geocoding abstraction using Google Maps API with fallback mocking.
- **Import/Export:** Generic JSON and CSV parsing with Zod schema validation.
- **AI Core:** Multimodal RAG pipeline, Agent workflows (LangGraph), Tool registry, and MCP.
- **Voice Core:** Vapi bridge for voice AI interactions.
- **Mobile Support:** Client-agnostic strict JSON API contracts for Flutter compatibility.
- **Security:** In-memory rate limiting and request idempotency.
- **DX & Tooling:** Docker compose setup, Mailpit, generic seed scripts, Vitest infrastructure.

### Changed
- Transitioned all Phase 7 Mock Providers to fully functional Runtime abstractions.
- Hardened all `/api/v1` routes with strict `createApiRoute` wrapper enforcing auth and Zod schemas.

### Removed
- Removed tightly-coupled domain logic to maintain absolute repository neutrality.
