# CampusFlow V1.3 Pilot Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade CampusFlow V1.2 to a V1.3 pilot delivery edition with a pilot configuration center, simulated import validation, and automatic Markdown report export.

**Architecture:** Extend the existing V1.2 `pilot_data.py` module with configurable pilot settings, simulated import samples, validation checks, and report rendering. Expose the delivery bundle through `summarize_pilot_delivery` and `GET /api/pilot/delivery`. The admin frontend adds a compact V1.3 delivery panel and the documents live in `deliverables/v1.3/`.

**Tech Stack:** Python `http.server`, SQLite audit log, vanilla JavaScript, CSS, `unittest`, UTF-8 Markdown.

---

### Task 1: V1.3 Delivery API

**Files:**
- Modify: `apps/api/campusflow/pilot_data.py`
- Modify: `apps/api/campusflow/service.py`
- Modify: `apps/api/campusflow/server.py`
- Modify: `apps/api/tests/test_service.py`
- Modify: `apps/api/tests/test_server.py`

- [ ] **Step 1: Write failing tests**

Add service and HTTP tests for `summarize_pilot_delivery` and `/api/pilot/delivery?role=管理员`. Assert:

```python
self.assertEqual(delivery["version"], "V1.3")
self.assertEqual(delivery["config_center"]["status"], "configured")
self.assertEqual(delivery["simulated_import"]["privacy"]["contains_customer_data"], False)
self.assertEqual(delivery["simulated_import"]["validation"]["status"], "pass")
self.assertIn("markdown", delivery["report_export"])
self.assertIn("CampusFlow V1.3 试点交付报告", delivery["report_export"]["markdown"])
self.assertEqual(delivery["delivery_status"], "ready_to_submit")
```

Also assert the audit log contains `pilot_delivery`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_service apps.api.tests.test_server -v
```

Expected: fail because V1.3 service and route do not exist yet.

- [ ] **Step 3: Implement V1.3 data helpers**

In `pilot_data.py`, add:

```python
def build_delivery_package():
    ...
```

Return a deterministic delivery package containing:

- `config_center`: editable-looking pilot settings, acceptance thresholds, required datasets.
- `simulated_import`: CSV-like import batches and validation result.
- `report_export`: Markdown report text and section list.
- `delivery_status`: `ready_to_submit`.

- [ ] **Step 4: Add service and route**

In `service.py`, add `summarize_pilot_delivery(conn, user_context)` and write `pilot_delivery` audit. In `server.py`, route `GET /api/pilot/delivery`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_service apps.api.tests.test_server -v
```

Expected: focused tests pass except possible frontend static checks until Task 2.

### Task 2: Admin V1.3 Delivery Dashboard

**Files:**
- Modify: `apps/api/tests/test_server.py`
- Modify: `apps/web/index.html`
- Modify: `apps/web/app.js`
- Modify: `apps/web/styles.css`

- [ ] **Step 1: Add static frontend contract assertions**

Assert frontend assets include:

```python
self.assertIn("CampusFlow V1.3 试点交付版", html)
self.assertIn("V1.3 试点交付", html)
self.assertIn("renderPilotDelivery", js)
self.assertIn("/api/pilot/delivery", js)
```

- [ ] **Step 2: Run static test to verify RED**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server.ServerIntegrationTest.test_static_frontend_assets_are_served -v
```

Expected: fail until frontend V1.3 strings and hooks are added.

- [ ] **Step 3: Implement V1.3 admin panel**

Fetch `/api/pilot/delivery` with existing admin summaries. Render configuration status, simulated import validation, report sections, Markdown export preview, and delivery status.

- [ ] **Step 4: Run server tests**

Run:

```bash
PYTHONPATH=apps/api python -m unittest apps.api.tests.test_server -v
```

Expected: server integration tests pass.

### Task 3: V1.3 Delivery Documents

**Files:**
- Create: `deliverables/v1.3/00_V1.3试点交付版总览.md`
- Create: `deliverables/v1.3/01_试点配置中心说明.md`
- Create: `deliverables/v1.3/02_模拟导入校验与报告导出说明.md`
- Create: `deliverables/v1.3/03_V1.3验收清单.md`
- Modify: `apps/README.md`

- [ ] **Step 1: Create V1.3 docs**

Write concise Markdown with tables and Mermaid diagrams. Emphasize V1.3 still uses simulated data only.

- [ ] **Step 2: Update README**

Add `/api/pilot/delivery`, V1.3 positioning, and V1.3 document index.

- [ ] **Step 3: Verify docs exist**

Run:

```bash
find deliverables/v1.3 -maxdepth 1 -type f | sort
```

Expected: four V1.3 Markdown files are present.

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

Restart `127.0.0.1:8765` so live routes load V1.3 code.

- [ ] **Step 3: Verify live endpoints**

Run:

```bash
curl -s http://127.0.0.1:8765/api/health
curl -s "http://127.0.0.1:8765/api/pilot/delivery?role=%E7%AE%A1%E7%90%86%E5%91%98"
curl -s "http://127.0.0.1:8765/api/pilot/readiness?role=%E7%AE%A1%E7%90%86%E5%91%98"
```

Expected: delivery response includes `version = V1.3`, `delivery_status = ready_to_submit`, and Markdown report content.
