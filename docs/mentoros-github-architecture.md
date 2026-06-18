# MentorOS — GitHub Architecture for a 3-Team Build

One repo, structured so three pairs can ship in parallel without living in each other's files. This can double as your `CONTRIBUTING.md`.

---

## 1. Monorepo, not split repos

Keep frontend + backend + docs in one repo. The reason this matters more than usual here: your three "constraints" aren't actually independent — Team C's chatbot calls `get_my_score`, which depends on Team B's scoring engine; the frontend depends on whatever shape all three teams' endpoints take. Splitting into separate repos turns every cross-team dependency into a cross-repo versioning problem. At 6–7 people, a monorepo costs you nothing and saves you that entire category of pain.

---

## 2. Repo structure — organized by feature, not by layer

```
mentoros/
├── frontend/
├── backend/
│   ├── app/
│   │   ├── core/          # db session, JWT/security, config — shared, careful edits only
│   │   ├── models/        # SQLAlchemy models — shared, careful edits only
│   │   ├── auth/          ← Team A
│   │   ├── students/      ← Team A (profiles, CSV import, consent)
│   │   ├── scoring/        ← Team B (success score engine)
│   │   ├── mentoring/       ← Team B (allocation, meeting logs, mentor dashboard endpoints)
│   │   ├── companion/        ← Team C (RAG chatbot)
│   │   ├── admin/             ← Team C (export, user mgmt)
│   │   └── main.py
│   ├── alembic/            # migrations — single linear history, see §4
│   └── tests/
├── docs/                    # PRD, build prompts, this doc, decisions log
├── docker-compose.yml
└── CONTRIBUTING.md
```

Each pair gets a folder that's mostly theirs. `core/` and `models/` are the only places all three teams touch — flag those explicitly as requiring extra care (see §6).

**Suggested team split**, mapped to what's actually coupled to what:
- **Team A — Identity & Data**: auth/RBAC, student/mentor profiles, CSV import, consent toggles. Goes first — everyone else builds on this.
- **Team B — Signal & Mentoring**: Success Score engine, mentor allocation, mentor dashboard endpoints, meeting scheduler.
- **Team C — AI Companion & Admin**: RAG chatbot, admin endpoints, NAAC/NBA export.

Adjust if your actual constraints differ, but keep the principle: split along data dependencies, not arbitrarily by feature name.

---

## 3. Branching & PRs

- `main` is always demo-able, protected — no direct pushes, even for "small" fixes.
- Feature branches off `main` directly (`feature/scoring-engine`, `feature/companion-tools`). At 6–7 people on a short timeline, a long-lived `dev` integration branch adds more merge overhead than it saves — skip it.
- Every merge to `main` requires: CI passing + at least one approval. Small, frequent PRs beat big-bang merges — easier to review, easier to spot when two teams accidentally touch the same shared file.

---

## 4. The actual hard part: migrations

Alembic migrations are linear. Two teams branching off `main` and each generating a migration independently is the single most common source of "why is the database broken" in a multi-team backend. Rule: regenerate your migration against latest `main` right before opening your PR, not once at the start of a multi-day branch. If two migrations land close together, whoever merges second rebases theirs on top — don't let two migration heads both reach `main`.

---

## 5. API contracts between teams

FastAPI auto-generates OpenAPI docs at `/docs` — treat that as the living contract, not a Slack message. Since the frontend's mock layer was already built to mirror real API response shapes, this isn't extra work for them — it's just keeping the mock and the real contract honest as backend comes online. For anything not obvious from the schema alone (what does `companion` return on a tool call vs. plain text, for instance), add a short entry to `docs/api-contracts.md` as part of the PR that introduces the endpoint — not a separate documentation pass after the fact.

---

## 6. CI/CD

GitHub Actions, running on every PR: backend pytest, frontend lint/vitest, both builds. This is the highest-value thing CI does for you specifically — it catches one team's change silently breaking another team's code before it reaches `main`, which is exactly the failure mode three-teams-one-repo is prone to. Branch protection: require this to pass before merge. Optional but worth it close to a demo: auto-deploy `main` to your hosting environment on merge, so "is the live demo current" stops being a question anyone has to remember to answer manually.

---

## 7. Issue tracking

GitHub Projects (built in, no new tool to onboard six people onto). One board, columns for Todo/In Progress/Review/Done, a label per team (`team-auth`, `team-scoring`, `team-companion`, `team-frontend`) so it's filterable. Pull issues straight from the phased build plan (Phase 0–8 from the earlier build doc) rather than inventing a new task breakdown from scratch.

---

## 8. Review norms — make the implicit rule explicit

Routine changes within a team's own folder: review from your own pair is enough. Anything touching `core/`, `models/`, or a migration: requires review from someone on a *different* team before merge. Write this down somewhere visible (this doc, or `CONTRIBUTING.md`) — undefined review boundaries are exactly what causes friction once three teams are actually moving at once, not a hypothetical risk.

---

## 9. Small things that pay for themselves

- Commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`) — keeps a six-person git log scannable, costs nothing to adopt.
- Commit a `.env.example` with placeholder values so a new contributor knows what variables they need without asking in the group chat.
- Put the PRD, build prompts, and the integration/hosting/testing doc from earlier into `docs/` in the actual repo — right now they only exist in this chat, and not everyone on the team has access to that.

---

## Checklist version

Monorepo. Backend split by feature, not by layer. `main` protected, PR + CI required. Migrations regenerated against latest `main` before each PR, never two heads. OpenAPI docs as the real contract. CI runs all three teams' tests on every PR. One GitHub Project board, labeled by team. Cross-team review required only for shared files. Docs live in the repo, not in chat history.
