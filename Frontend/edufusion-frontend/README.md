# EduFusion AI: Frontend

Next.js 14 (App Router) + React + TypeScript + Tailwind CSS.

## Run
```bash
npm install
cp .env.example .env.local   # leave NEXT_PUBLIC_API_URL empty to use the mock uploader
npm run dev                  # http://localhost:3000
```

## Frontend work split (from SDS section 6 and SRS FR/NFR)
| Screen / item | SDS | Owner | Status |
|---|---|---|---|
| App shell: sidebar, top bar, Local/Cloud status (FR-05), dark/light (NFR-11) | 6.1 | **Me (30%)** | Done |
| Welcome page | 6.3 | **Me (30%)** | Done |
| Login and register, validation, login guard (FR-01, 02, 49) | 6.2 | **Me (30%)** | Done |
| Dashboard: 9 tool shortcuts, recent materials, today's focus | 6.1 | **Me (30%)** | Done |
| My materials / upload: type and size checks, progress, cancel (FR-13, 14) | 6.6 | **Me (30%)** | Done |
| AI chat: streaming, sources, route label, history, approval dialog | 6.5 | Teammate | `/chat` |
| Study planner and weak-area report | 6.8 | Teammate | `/planner` |
| Settings: privacy mode, models, online activity log | 6.9 | Teammate | `/settings` |
| Quiz, summarize, notes, analyze, visualize pages | 3.7 to 3.11 | Teammate | `/quiz` etc. |
| Code assistant (editor + bug feedback) | 3.10 | Teammate | `/code` |
| Desktop/mobile wrapper | SRS 2.8 | Teammate | |

## Conventions for teammates
- Add your page under `app/(app)/<route>/page.tsx` (it gets the shell and login guard automatically), then add the route to `READY` in `lib/routes.ts`.
- Use Tailwind tokens (`bg-surface`, `text-muted`, `border-line`, `bg-accent`) so dark mode works automatically.
- Upload calls live in `lib/api.ts`, auth calls in `lib/auth.ts`; base URL comes from `NEXT_PUBLIC_API_URL`.
