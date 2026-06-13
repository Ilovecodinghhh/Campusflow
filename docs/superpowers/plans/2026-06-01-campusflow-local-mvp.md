# CampusFlow Local MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local runnable CampusFlow MVP that follows the existing PRD: local backend, persistent data, role workbench, recommendation, application draft/submit, teacher review, operations summary, audit log, and autonomous tests.

**Architecture:** Use a zero-dependency Python backend on this computer with SQLite for persistence and `http.server` for API/static hosting. Keep the frontend as a static web app under `apps/web` that calls backend APIs; keep the original `demo/` as the proposal demo.

**Tech Stack:** Python 3 stdlib, SQLite, unittest, static HTML/CSS/JavaScript.

---

## File Structure

- Create `apps/api/campusflow/db.py`: SQLite schema, seed data, connection helpers.
- Create `apps/api/campusflow/engine.py`: intent parsing, recommendation, risk, workflow summaries.
- Create `apps/api/campusflow/service.py`: application, review, feedback, audit, metrics services.
- Create `apps/api/campusflow/server.py`: local HTTP JSON API and static web server.
- Create `apps/api/campusflow/__init__.py`: package marker.
- Create `apps/api/tests/test_engine.py`: engine tests.
- Create `apps/api/tests/test_service.py`: persistence, permission, audit tests.
- Create `apps/web/index.html`: local MVP interface.
- Create `apps/web/styles.css`: FanRuan-style workbench styling.
- Create `apps/web/app.js`: API-driven frontend workflow.
- Create `apps/README.md`: run and test instructions.

## Implementation Tasks

### Task 1: Backend Core Tests

- [ ] Write failing tests for parsing, recommendation, risk, application submit, review permission, and audit.
- [ ] Run `python -m unittest discover -s apps/api/tests -v`; expected failure before implementation.

### Task 2: Backend Engine and SQLite Services

- [ ] Implement SQLite schema and seed data.
- [ ] Implement deterministic parser, recommendation, risk, metrics, audit, and permission behavior.
- [ ] Run backend tests and make them pass.

### Task 3: Local HTTP API

- [ ] Implement `/api/health`, `/api/roles`, `/api/intent/parse`, `/api/spaces/recommend`, `/api/applications/draft`, `/api/applications/submit`, `/api/applications`, `/api/reviews/{id}/decision`, `/api/operations/summary`, `/api/feedback`, `/api/audit`.
- [ ] Add HTTP integration coverage through service tests where practical.

### Task 4: API-Driven Frontend

- [ ] Build `apps/web` static frontend that calls the local backend.
- [ ] Support role tabs, 3/10 minute presentation mode, AI workflow, data source/safety boundary, recommendation cards, application draft/submit, teacher decisions, operations summary, and audit panel.

### Task 5: Autonomous Verification

- [ ] Run all Python tests.
- [ ] Start local server.
- [ ] Hit health and key API endpoints.
- [ ] Smoke-test frontend file serving.
- [ ] Leave local server running and report URL.

