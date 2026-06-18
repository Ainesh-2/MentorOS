# MentorOS Contributing Guidelines — 3-Team Monorepo Build

Welcome to MentorOS! This repository is organized as a monorepo so that three pairs of engineers can collaborate and ship features in parallel without stepping on each other's files.

---

## 1. Monorepo Structure

We maintain frontend, backend, and documentation under a single repository. The directory structure is organized by feature rather than layer:

```text
mentoros/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/          # Login, Landing page
│   │   │   ├── student/       # Student dashboard
│   │   │   ├── mentor/        # Mentor dashboard
│   │   │   └── admin/         # HOD and Admin dashboards
│   │   ├── components/        # Reusable UI primitives and layouts
│   │   └── lib/               # API client and auth helpers
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── core/              # DB session, JWT, config (Shared, careful edits!)
│   │   ├── models/            # SQLAlchemy models (Shared, careful edits!)
│   │   ├── auth/              # Login, RBAC, password reset (Team A)
│   │   ├── students/          # Profiles, CSV import, consent log (Team A)
│   │   ├── scoring/           # Student Success Score batch recalculations (Team B)
│   │   ├── mentoring/         # Mentor roster, allocation, and dashboard (Team B)
│   │   └── admin/             # Admin/HOD controls and exports (Team C)
│   ├── alembic/               # Linear database migrations
│   └── tests/                 # Backend tests (pytest)
├── docs/                      # Schema, scoring formulas, and API contracts
├── docker-compose.yml         # Local multi-container Docker config
├── .env.example               # Environment variables example template
└── CONTRIBUTING.md            # Contributing guidelines (This file)
```

### Team Splits & Boundaries
- **Team A — Identity & Data**: `auth/` and `students/`. Configures login sessions, password resets, profiles, CSV data parsing, and user data consent.
- **Team B — Signal & Mentoring**: `scoring/` and `mentoring/`. Controls success score calculations, batch recalculations, rosters, allocations, and session scheduler logs.
- **Team C — Administrative Actions**: `admin/`. Handles user state actions (activate/deactivate), HOD reporting heatmaps, and accreditation (NAAC/NBA) data exports.

---

## 2. Branching & Pull Requests

- **Main Branch**: The `main` branch must always be functional and demo-ready. Direct pushes to `main` are strictly blocked.
- **Feature Branches**: Branch directly off `main` for all features (e.g. `feature/scoring-engine`, `feature/companion-tools`). Avoid intermediate branch complexities.
- **PR Requirements**: Every pull request merging into `main` requires:
  1. Passing CI tests (frontend build/lint, backend pytest).
  2. At least one approval from a team peer.

---

## 3. Database Migrations (Alembic)

Database schema revisions in Alembic must be **strictly linear**. Independent parallel branches generating migrations causes head conflicts.
- **Rule**: Run and regenerate your database migration against the latest version of `main` **right before opening your pull request**, rather than at the beginning of a multi-day task branch.
- If another migration is merged before yours, you must rebase your migration sequence on top of the newly updated head.

---

## 4. API Contracts

- FastAPI generates dynamic OpenAPI specifications at `/docs`. Treat this `/docs` page as the living contract between frontend and backend.
- For non-obvious endpoint parameters or returned data (such as companion tool callbacks), update [docs/api-contracts.md](file:///d:/MENTOROS/docs/api-contracts.md) as part of the PR that implements that endpoint.

---

## 5. Code Review Boundaries

- **Local Feature Edits**: Changes inside your team's designated directory require a review only from your pair.
- **Shared Files**: Any edits targeting `/backend/app/core/`, `/backend/app/models/`, or Alembic migrations require a code review and signoff from at least one engineer on a **different** team.

---

## 6. Commit Guidelines & Hygiene

- Use conventional commit prefixes to keep the git log scannable:
  - `feat: ...` for new features
  - `fix: ...` for bug fixes
  - `docs: ...` for documentation modifications
  - `chore: ...` for config or routine dependency updates
- Never stage or commit `.env` or other localized API secrets. Keep placeholder values documented inside `.env.example`.
