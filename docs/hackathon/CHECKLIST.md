# Hackathon Survival Checklist

A tactical checklist to ensure your team moves fast, deploys safely, and survives the 24-48 hour hackathon pressure.

## Phase 1: Before the Competition (Setup)

- [ ] **Clone and Test:** Clone the template and verify it runs locally (`npm install && npm run setup && npm run dev`).
- [ ] **Environment Variables:** Set up your `.env.local` based on `.env.example`.
- [ ] **Docker:** Verify Docker Compose works (`npm run infra:up`) for local Postgres/Redis.
- [ ] **Database:** Ensure Prisma migrations run (`npx prisma migrate dev`).
- [ ] **Authentication:** Create a Clerk application and add the keys.
- [ ] **Deployment Target:** Connect the repo to Vercel/Railway/Render and confirm a successful empty build.

## Phase 2: During the Competition (Execution)

### Hour 1-4: Foundation
- [ ] **Choose Profile:** Decide if you are building a web-only app or web+mobile.
- [ ] **Database Schema:** Modify `prisma/schema.prisma` with your domain models. Run `npm run db:migrate`.
- [ ] **Core Flow:** Build the primary "Happy Path" using the provided shadcn components.

### Hour 5-12: The Differentiator
- [ ] **Add AI/Voice:** If your hack relies on AI, integrate your prompts into `ai/agents` or Vapi.
- [ ] **Background Jobs:** Offload slow tasks (like document processing or heavy AI generation) to the Job Worker (`server/jobs`).
- [ ] **Realtime:** Hook up UI state to the SSE `/api/v1/realtime` endpoint so users see live updates without refreshing.

### Hour 13-20: Polish & Integration
- [ ] **Mobile Integration:** (If applicable) Have the mobile team hit `/api/v1/health` and verify auth tokens.
- [ ] **Error Handling:** Don't ignore API errors. Use the standard `success: false` contract to show nice toast notifications.
- [ ] **Design Polish:** Tweak `globals.css` and use the built-in GSAP/Lenis animations for the "Wow" factor.

### Hour 21-24: Deployment & Demo
- [ ] **Deploy:** Push to main. Ensure `npx prisma migrate deploy` runs in your CI/CD pipeline.
- [ ] **Worker Deploy:** If using jobs, ensure your worker process (`npm run worker`) is running in production.
- [ ] **Smoke Test:** Create a fresh user account on production. Run through the entire happy path.
- [ ] **Seed Demo Data:** Use your Prisma seed script to populate a beautiful, perfect demo state for the judges.

## Phase 3: Disaster Recovery

If things go wrong during the demo or at 3 AM:
- **Database Locked/Corrupted?** `npm run db:reset && npm run db:seed`. (Local only, NEVER run on prod).
- **AI Timeout?** The template has built-in mock providers. Switch `AI_MODE=mock` in your `.env` to keep the demo alive.
- **Worker Crash?** If the background worker fails, restart the service or temporarily run it locally pointing to the prod DB to flush the queue.
- **Mobile Auth Failing?** Verify you are sending the `Authorization: Bearer <token>` header, not relying on cookies.

## Definition of Done (Ready for Judges)
- [ ] Deployed to a public URL.
- [ ] Can register a new account.
- [ ] Core differentiator (AI/Voice/Logic) functions end-to-end.
- [ ] UI looks premium (animations working, no raw unstyled HTML).
