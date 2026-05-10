# Align - Architecture (v0)

## Goals
- Let friends quickly propose times and pick one together.
- Persist all plans and responses in the cloud for free-tier usage.
- Keep sessions across refreshes and browser restarts.
- Keep UI minimal and clean (no gradients, no glass effects).

## Non-goals
- Calendar provider integrations in v0.
- Team roles, billing, or enterprise workflows.
- Fancy visual treatments that reduce clarity.

## Stack
- Frontend: React + TypeScript + Vite
- Cloud: Firebase Firestore
- Auth: Firebase Authentication (anonymous for low-friction collaboration)
- Hosting: Firebase Hosting (or Vercel/Netlify for static deploy)

## Data model
`plans/{planId}`
- `title: string`
- `description: string`
- `ownerUid: string`
- `shareCode: string`
- `slots: { id: string; startsAt: string }[]`
- `createdAt: timestamp`
- `updatedAt: timestamp`

`plans/{planId}/responses/{uid}`
- `name: string`
- `availability: Record<slotId, boolean>`
- `updatedAt: timestamp`

## Auth and session
- Use Firebase anonymous auth on first load.
- Firebase browser persistence keeps the same user across sessions.
- Store `align:lastPlanId` and preferred name in `localStorage` to resume quickly.

## Core flow
1. Create a plan with title + a few proposed times.
2. Share short code with friends.
3. Friends join with the code, set their name, and toggle availability.
4. Live summary shows who can make each time.

## Security rules guidance
- Only authenticated users can read/write.
- Only plan owner can edit plan metadata and slots.
- Each user can only write their own response document.
- Add basic validation for required fields and shapes.

## Deployment
- Build static bundle with `npm run build`.
- Deploy to Firebase Hosting.
- Use environment variables for Firebase config.

## Implementation phases
1. App shell + Firebase bootstrap + anonymous auth.
2. Create and join plan flows.
3. Collaborative response editor and live summary.
4. UX polish, accessibility pass, and deployment setup.
