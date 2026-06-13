# CampusFlow V1.0 Delivery Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the runnable CampusFlow MVP into a V1.0 package that can be submitted, defended, and piloted.

**Architecture:** Keep the runnable local MVP under `apps/` as the product proof. Add a submission-oriented package under `deliverables/v1.0/`, and add a deterministic demo reset API so the live demo can be repeated during defense.

**Tech Stack:** Markdown, Python stdlib, SQLite, unittest, static HTML/CSS/JavaScript.

---

## File Structure

- Create `deliverables/v1.0/00_V1.0提交包总览.md`: submission checklist, audience map, artifact index.
- Create `deliverables/v1.0/01_答辩演示手册.md`: 3-minute and 10-minute scripts, demo route, Q&A hooks.
- Create `deliverables/v1.0/02_试点执行与验收包.md`: pilot scope, timeline, baseline metrics, acceptance gates.
- Create `deliverables/v1.0/03_工程验收与运维包.md`: API contract, data boundary, RBAC, operations, maintenance.
- Create `deliverables/v1.0/04_提交前检查清单.md`: final submission checklist and risk handling.
- Modify `apps/api/campusflow/db.py`: add a safe `reset_demo_data` helper.
- Modify `apps/api/campusflow/server.py`: add `POST /api/demo/reset`.
- Modify `apps/api/tests/test_server.py`: cover demo reset over HTTP.
- Modify `apps/web/index.html`, `apps/web/app.js`, `apps/web/styles.css`: add a reset demo control and status feedback.
- Modify `apps/README.md`: document V1.0 run/demo reset flow.

## Tasks

### Task 1: Demo Reset API

- [ ] Add failing HTTP integration test for `POST /api/demo/reset`.
- [ ] Implement SQLite reset helper and API endpoint.
- [ ] Run `PYTHONPATH=apps/api python -m unittest discover -s apps/api/tests -v`.

### Task 2: Frontend Demo Stability

- [ ] Add a reset button to the presentation controls.
- [ ] Wire the button to `/api/demo/reset`.
- [ ] Refresh the current role view and side dashboard after reset.

### Task 3: V1.0 Submission Documents

- [ ] Add V1.0 overview and submission checklist.
- [ ] Add defense manual with scripts and demo path.
- [ ] Add pilot execution and acceptance package.
- [ ] Add engineering acceptance and operations package.

### Task 4: Verification

- [ ] Run all backend tests.
- [ ] Verify `GET /`, `/app.js`, `/styles.css`, `/api/health`.
- [ ] Verify student recommendation, club application, teacher review, admin operations, audit log, and demo reset.
