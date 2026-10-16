# ExamOpt Studio homepage visual audit

## Implemented refinements

- **Scheduling challenge:** the editorial copy now precedes the gallery in normal page flow. The orbital gallery uses a substantially smaller responsive wheel, larger cards, a fuller visible arc, and one linear rotation over 210vh. This keeps the images close to the centre and gives each constraint a readable moment before the workflow begins.
- **Workflow:** the three existing stages now share a single, bordered workflow surface with a restrained top highlight and a labelled timeline. The existing GSAP rail animation still drives both the desktop and mobile progress line.
- **Capabilities:** the grid retains its honest availability labels, but each capability now includes a concise functional descriptor and a subtle blue edge reflection on hover. The cards remain compact and use the existing shared surface and border tokens.
- **Administrator and student experiences:** the two panels now form one connected product surface, separated by a hairline rather than appearing as unrelated cards. Their warm and blue tints remain deliberately distinct.
- **Transparency:** the analytical board keeps its graph and validation report as the primary moment, with a more continuous canvas-to-blue transition, lighter section spacing, and a restrained cobalt glass edge.
- **Closing CTA:** the final photo transition is more compact, so the CTA reaches the campus image and footer without the previous excess vertical space.

## Design system and content integrity

- Retained the existing Geist Sans and Instrument Serif pairing.
- Retained the warm canvas, white product surfaces, hairline borders, cobalt primary, and existing shared `glass`/`shadow-panel` utilities.
- Reused existing images and previews; no placeholder metrics or unsupported product claims were added.
- Kept all routes, CTAs, Clerk integration, Lenis provider, and GSAP/ScrollTrigger architecture intact.
- Motion remains optional: the existing reduced-motion guard bypasses the GSAP scenes and preserves visible static content.

## Files changed

- `app/sections/problem.tsx`
- `components/ui/orbital-image-wheel.tsx`
- `app/sections/how-it-works.tsx`
- `app/sections/capabilities.tsx`
- `app/sections/audiences.tsx`
- `app/sections/transparency.tsx`
- `app/sections/final-cta.tsx`
- `docs/examopt/HOMEPAGE_VISUAL_AUDIT.md`

## Verification

- `npm run typecheck` — passed.
- Targeted ESLint for each changed homepage file — passed.
- Homepage route — served successfully by the existing local Next.js development server.

## Remaining follow-up

- A production build and device-browser visual review have not been run in this pass. Existing development-console warnings about image quality settings and the Clerk development key are outside these homepage layout changes.
