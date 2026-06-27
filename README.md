# MentorOS

MentorOS is a front-end MVP for student mentoring and early risk detection. It turns attendance, marks, engagement, and placement readiness into one transparent signal so mentors, HODs, admins, and students can act on the same data instead of scattered spreadsheets.

This repository is a standalone demo. It runs entirely on deterministic mock data, requires no backend, and exposes the exact hand-off points for a future API-first implementation.

## Highlights

- Public landing page with a product narrative and score explanation.
- Role-based dashboards for Student, Mentor, HOD, and Admin views.
- Explainable Student Success Score with a live breakdown and risk bands.
- Mentor roster tools for scheduling and logging meetings.
- Department analytics for risk, workload, and trend monitoring.
- Admin tools for user management, CSV import, and accreditation exports.
- AI Companion mock with a single swap point for a real model integration.

## Quick Start

```bash
npm install
npm run dev
```

Development server: http://localhost:5173

Production checks:

```bash
npm run typecheck
npm run build
npm run preview
```

## Environment Setup

This project uses separate environment files for the backend and frontend. Create or update these files with your Supabase project values.

### Backend `.env`

```dotenv
DATABASE_URL=postgresql://postgres.your_project_ref:your_db_password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://your_project_ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
SUPABASE_ANON_KEY=your_anon_key_here
```

### Frontend `.env`

```dotenv
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> Do not commit `.env` files to version control. Keep secrets and project-specific values local.

## Project Structure

```text
src/
  api/        mock-backed data access layer and future backend boundary
  mock/       deterministic dataset, fixtures, and demo generators
  lib/        score formula, hooks, and shared utilities
  components/ reusable UI primitives and shared composites
  features/   domain-specific UI for student, mentor, HOD, admin, companion
  pages/      route-level screens
  store/      global client state
  types/      shared TypeScript types
```

The intended architecture is deliberate: UI code only talks to `src/api`, and `src/api` is the only layer that knows the data is mocked. Swapping to a real backend should be a matter of replacing the implementations in that folder, not rewriting the screens.

## Core Product Logic

The Student Success Score is the product’s primary signal. It is defined once in [`src/lib/score.ts`](src/lib/score.ts) and reused by both the dataset generator and the UI.

```text
score = 0.35 attendance
      + 0.35 academic
      + 0.15 engagement
      + 0.15 placement
```

Risk bands:

- Green: 70 and above
- Amber: 50 to 69
- Coral: below 50

The score is visualized with the Signal Disc in [`src/components/SignalDisc.tsx`](src/components/SignalDisc.tsx), while supporting breakdowns are rendered across the dashboards.

## Routes And Roles

| Route | Role | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/app/student` | Student | Score breakdown, meeting history, consent controls, AI Companion |
| `/app/mentor` | Mentor | Mentee roster, scheduling, meeting logs |
| `/app/hod` | HOD | Risk heatmap, mentor workload, semester trends |
| `/app/admin` | Admin | Users, mock CSV import, accreditation exports |

Role switching is demo-only. There is no authentication or authorization layer in this repository yet.

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, React Router, Zustand, and lucide-react.

## Security And Commit Hygiene

This repo is designed to stay safe for a first public commit:

- No `.env` files or API keys are committed.
- No backend credentials are required to run the demo.
- Build outputs, caches, and local editor files are ignored.
- The mock AI Companion is local-only and does not call external services yet.

## Production Handoff Notes

- Replace the `src/api` implementations with real network calls when a backend is ready.
- Keep the score formula centralized in `src/lib/score.ts` so the server and client stay aligned.
- Preserve the `src/mock` layer for deterministic demo data and local development.

## Suggested First Commit Message

```text
feat: initialize MentorOS MVP
```

## Suggested PR Description

MentorOS is an explainable student-mentoring MVP built as a single-page React application. It ships a public landing page plus four role-based dashboards for students, mentors, HODs, and admins.

The architecture is intentionally split so all data access flows through `src/api`, while deterministic demo data lives in `src/mock` and shared business logic lives in `src/lib`. The Student Success Score is computed once and reused across the product, keeping the UI and data layer aligned.

Included in this first commit:

- Role-based dashboard navigation and route structure.
- Explainable score visualization and risk banding.
- Mentor scheduling and logging workflows.
- Department analytics for workload, risk, and trends.
- Admin tooling for users, import, and export flows.
- A mock AI companion with a clear future integration point.

## Notes For The Initial Push

Before committing, make sure the repository is not staging any of the following:

- `.env` or `.env.local`
- `node_modules/`
- `dist/`
- `build/`
- `.next/`
- `coverage/`

The updated `.gitignore` covers those paths along with TypeScript build metadata and common local editor artifacts.
