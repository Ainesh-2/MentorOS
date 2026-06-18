# Decisions Log (Architectural Decision Records)

Record key technical decisions made over the course of building MentorOS.

---

## ADR 1: Monorepo Strategy
- **Status**: Approved
- **Context**: The build requires simultaneous contributions from 3 independent pairs of developers targeting frontend interfaces, scoring calculations, and AI companions.
- **Decision**: Consolidate frontend, backend, and documentation in a single repository.
- **Consequence**: Dramatically reduces cross-repository dependency management and simplifies CI/CD pipeline integration.

---

## ADR 2: Feature-Based backend Directory Layout
- **Status**: Approved
- **Context**: Standard layer-based packaging (e.g. all routers in one folder, all services in another) causes merge conflicts and overlapping folder concerns between teams.
- **Decision**: Structure the `/backend/app/` subdirectory by domain/feature folders (`auth/`, `students/`, `scoring/`, `mentoring/`, `companion/`, `admin/`).
- **Consequence**: Teams A, B, and C can work in parallel inside their own files, reducing merge friction.
