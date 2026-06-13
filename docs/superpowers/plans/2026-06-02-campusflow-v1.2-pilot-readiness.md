# CampusFlow V1.2 Pilot Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade CampusFlow V1.1 to a V1.2 pilot readiness edition with independent simulated import data, data quality checks, pilot configuration summary, and an automatic readiness report.

**Architecture:** Add a focused `pilot_data.py` module that owns simulated datasets and quality checks, then expose the result through `summarize_pilot_readiness` and `GET /api/pilot/readiness`. The admin frontend extends the existing V1.1 dashboard with a compact V1.2 readiness panel. V1.2 documents live in `deliverables/v1.2/`.

**Tech Stack:** Python `http.server`, SQLite audit log, vanilla JavaScript, CSS, `unittest`, UTF-8 Markdown.

---

### Task 1: Simulated Pilot Data And Readiness API

**Files:**
- Create: `apps/api/campusflow/pilot_data.py`
- Modify: `apps/api/campusflow/service.py`
- Modify: `apps/api/campusflow/server.py`
- Modify: `apps/api/tests/test_service.py`
- Modify: `apps/api/tests/test_server.py`

- [ ] **Step 1: Write failing tests**

Add tests that import `summarize_pilot_readiness`, call `/api/pilot/readiness?role=管理员`, and assert:

```python
self.assertEqual(report["version"], "V1.2")
self.assertEqual(report["privacy"]["data_mode"], "independent_simulation")
self.assertEqual(report["privacy"]["contains_customer_data"], False)
self.assertGreaterEqual(report["readiness_score"], 80)
self.assertIn("datasets", report)
self.assertIn("quality_checks", report)
self.assertIn("pilot_config", report)
self.assertIn("readiness_report", report)
```

Also assert the audit log contains `pilot_readiness`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_service apps.api.tests.test_server -v
```

Expected: fail because `summarize_pilot_readiness` and `/api/pilot/readiness` do not exist.

- [ ] **Step 3: Implement simulated data and checks**

Create `pilot_data.py` with deterministic simulated datasets: spaces, schedules, reservations, equipment status, approval rules, and pilot scope. Include no customer names, student IDs, phone numbers, emails, or identity numbers. Provide:

```python
def get_simulated_pilot_data():
    ...

def build_readiness_report():
    ...
```

Quality checks cover required fields, time conflicts, capacity overflow, equipment warnings, permission scope, and privacy forbidden fields.

- [ ] **Step 4: Implement service and route**

Add `summarize_pilot_readiness(conn, user_context)` in `service.py`, write `pilot_readiness` audit, import it in `server.py`, and route `GET /api/pilot/readiness`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_service apps.api.tests.test_server -v
```

Expected: focused tests pass.

### Task 2: Admin V1.2 Readiness Dashboard

**Files:**
- Modify: `apps/api/tests/test_server.py`
- Modify: `apps/web/index.html`
- Modify: `apps/web/app.js`
- Modify: `apps/web/styles.css`

- [ ] **Step 1: Add static frontend contract tests**

Assert frontend assets include:

```python
self.assertIn("CampusFlow V1.2 试点准备版", html)
self.assertIn("V1.2 试点准备", html)
self.assertIn("renderPilotReadiness", js)
self.assertIn("/api/pilot/readiness", js)
```

- [ ] **Step 2: Run static test to verify RED**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server.ServerIntegrationTest.test_static_frontend_assets_are_served -v
```

Expected: fail until frontend V1.2 strings and hooks are added.

- [ ] **Step 3: Implement frontend readiness panel**

Fetch `/api/pilot/readiness` alongside V1.1 summaries in the admin view. Render readiness score, privacy badge, dataset counts, quality checks, pilot configuration, and next actions.

- [ ] **Step 4: Run server tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server -v
```

Expected: server integration tests pass.

### Task 3: V1.2 Review Documents

**Files:**
- Create: `deliverables/v1.2/00_V1.2试点准备版总览.md`
- Create: `deliverables/v1.2/01_模拟数据与隐私边界说明.md`
- Create: `deliverables/v1.2/02_数据质量检查与试点配置说明.md`
- Create: `deliverables/v1.2/03_V1.2验收清单.md`
- Modify: `apps/README.md`

- [ ] **Step 1: Create V1.2 docs**

Write concise Markdown with tables and Mermaid diagrams. Make the privacy statement explicit: development uses independent simulated data only.

- [ ] **Step 2: Update README**

Add `/api/pilot/readiness`, V1.2 demo positioning, and V1.2 document index.

- [ ] **Step 3: Verify docs exist**

Run:

```bash
find deliverables/v1.2 -maxdepth 1 -type f | sort
```

Expected: four V1.2 Markdown files are present.

### Task 4: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run full tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest discover -s apps/api/tests -v
```

Expected: full test suite passes.

- [ ] **Step 2: Restart local server**

Restart `127.0.0.1:8765` so live routes load V1.2 code.

- [ ] **Step 3: Verify live endpoints**

Run:

```bash
curl -s http://127.0.0.1:8765/api/health
curl -s "http://127.0.0.1:8765/api/pilot/readiness?role=%E7%AE%A1%E7%90%86%E5%91%98"
curl -s "http://127.0.0.1:8765/api/pilot/summary?role=%E7%AE%A1%E7%90%86%E5%91%98"
```

Expected: readiness response includes `version = V1.2`, `contains_customer_data = false`, and `readiness_score >= 80`.
