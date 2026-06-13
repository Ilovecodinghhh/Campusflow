# CampusFlow V1.1 Review Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade CampusFlow from V1.0 MVP to a V1.1 review edition with pilot simulation data, an admin metric dashboard, and an automatically generated acceptance summary.

**Architecture:** Keep the current local backend and static frontend. Add a focused pilot review service and `GET /api/pilot/summary` endpoint, then let the admin view combine this endpoint with the existing operations summary. Store V1.1 review assets under `deliverables/v1.1/`.

**Tech Stack:** Python `http.server`, SQLite, vanilla JavaScript, CSS, `unittest`, UTF-8 Markdown.

---

### Task 1: Pilot Summary API Contract

**Files:**
- Modify: `apps/api/tests/test_server.py`
- Modify: `apps/api/tests/test_service.py`
- Modify: `apps/api/campusflow/service.py`
- Modify: `apps/api/campusflow/server.py`

- [ ] **Step 1: Write failing API and service tests**

Add assertions that `GET /api/pilot/summary?role=管理员` returns `period`, `baseline`, `current`, `improvements`, `acceptance`, `scenarios`, and `weekly_report`, and that the service writes `pilot_summary` to the audit log.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server apps.api.tests.test_service -v
```

Expected: tests fail because `summarize_pilot_review` and `/api/pilot/summary` do not exist yet.

- [ ] **Step 3: Implement minimal service and route**

Add `summarize_pilot_review(conn, user_context)` in `service.py`. It returns deterministic six-week simulated pilot data, acceptance gates, weekly report text, and derived improvement fields. Import it in `server.py` and route `GET /api/pilot/summary`.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server apps.api.tests.test_service -v
```

Expected: tests pass.

### Task 2: Admin Dashboard Frontend

**Files:**
- Modify: `apps/api/tests/test_server.py`
- Modify: `apps/web/app.js`
- Modify: `apps/web/index.html`
- Modify: `apps/web/styles.css`

- [ ] **Step 1: Add frontend static contract assertions**

Update the static asset test to require V1.1 labels and JavaScript hooks: `CampusFlow V1.1 评审版`, `试点验收摘要`, `/api/pilot/summary`, and `renderPilotSummary`.

- [ ] **Step 2: Run static test to verify RED**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server.ServerIntegrationTest.test_static_frontend_assets_are_served -v
```

Expected: fail because the old frontend does not contain V1.1 labels or hooks.

- [ ] **Step 3: Implement admin review dashboard**

Update admin rendering to fetch both `/api/operations/summary` and `/api/pilot/summary`. Add concise baseline/current metrics, acceptance gates, scenario coverage, automatic weekly report, and next actions. Update side metrics to include V1.1 pilot indicators.

- [ ] **Step 4: Run static and integration tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server -v
```

Expected: all server integration tests pass.

### Task 3: V1.1 Review Deliverables

**Files:**
- Create: `deliverables/v1.1/00_V1.1评审版总览.md`
- Create: `deliverables/v1.1/01_试点仿真数据说明.md`
- Create: `deliverables/v1.1/02_指标看板与自动验收摘要.md`
- Create: `deliverables/v1.1/03_V1.1提交前验收清单.md`
- Modify: `apps/README.md`

- [ ] **Step 1: Create review package docs**

Write concise, visual Markdown using tables and Mermaid diagrams. Cover simulation assumptions, indicators, acceptance gates, dashboard interpretation, and trial readiness.

- [ ] **Step 2: Update README**

Add V1.1 run notes, endpoint list, and deliverable index.

- [ ] **Step 3: Verify docs exist and are readable**

Run:

```bash
find deliverables/v1.1 -maxdepth 1 -type f | sort
```

Expected: all four V1.1 Markdown files are present.

### Task 4: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run complete automated tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest discover -s apps/api/tests -v
```

Expected: full test suite passes.

- [ ] **Step 2: Restart local server if necessary**

Check port `8765`, stop stale process if needed, and run:

```bash
PYTHONPATH=apps/api nohup python -m campusflow.server > apps/server.log 2>&1 &
```

- [ ] **Step 3: Verify live endpoints**

Run:

```bash
curl -s http://127.0.0.1:8765/api/health
curl -s "http://127.0.0.1:8765/api/pilot/summary?role=%E7%AE%A1%E7%90%86%E5%91%98"
curl -s "http://127.0.0.1:8765/api/operations/summary?role=%E7%AE%A1%E7%90%86%E5%91%98"
```

Expected: health is ok, pilot summary includes `acceptance.status`, and operations summary still returns metrics.
