# CampusFlow Local MVP / V1.3 Pilot Delivery Demo

CampusFlow uses this computer as the backend. It serves a local JSON API, a static frontend, and a persistent SQLite database. The V1.3 pilot delivery package is under `deliverables/v1.3/`, with the V1.2 readiness package, V1.1 review package, and V1.0 submission package preserved.

## Run

From the project root:

```bash
PYTHONPATH=apps/api python -m campusflow.server
```

Open:

```text
http://127.0.0.1:8765
```

The server writes and reads local data from:

```text
apps/campusflow.sqlite3
```

## Defense Demo Reset

Before a defense or review, click `重置演示` in the web app, or call:

```bash
curl -X POST http://127.0.0.1:8765/api/demo/reset \
  -H "Content-Type: application/json" \
  -d '{"role":"管理员"}'
```

This clears mutable demo records: applications, feedback, and audit logs. Seeded spaces, schedules, reservations, and maintenance data remain available.

## Test

```bash
PYTHONPATH=apps/api python -m unittest discover -s apps/api/tests -v
```

The test suite covers:

- intent parsing
- recommendation filtering
- event risk assessment
- application persistence
- role permission checks
- teacher review decisions
- feedback and operations metrics
- HTTP API smoke flow
- demo data reset
- V1.1 pilot simulation summary
- V1.2 independent simulated data readiness report
- V1.3 pilot configuration, simulated import validation, and Markdown report export
- V1.3 admin dashboard static contract
- static frontend file serving

## Main API

- `GET /api/health`
- `GET /api/roles`
- `POST /api/intent/parse`
- `POST /api/spaces/recommend`
- `POST /api/applications/draft`
- `POST /api/applications/submit`
- `GET /api/applications?role=老师`
- `POST /api/reviews/{application_id}/decision`
- `GET /api/operations/summary?role=管理员`
- `GET /api/pilot/summary?role=管理员`
- `GET /api/pilot/readiness?role=管理员`
- `GET /api/pilot/delivery?role=管理员`
- `POST /api/feedback`
- `GET /api/audit`
- `POST /api/demo/reset`

## Demo Roles

- 学生：一句话找空间，查看推荐理由，采纳或反馈。
- 社团负责人：生成活动申请草稿，检查风险与审批人，提交申请。
- 老师：查看待审批队列，执行通过、补材料、改期。
- 管理员：查看 V1.3 试点交付看板、试点配置中心、模拟导入校验、Markdown 报告预览、自动验收摘要、冲突 TOP5、周报建议和审计日志。

## V1.3 Pilot Delivery Features

V1.3 upgrades the demo from a pilot readiness package to a pilot delivery package:

- pilot configuration center with a stable config ID
- independent simulated CSV import batches for development validation
- simulated import validation with required fields, privacy, conflict, capacity, equipment, and permission checks
- automatic Markdown report export for proposal submission and defense review
- admin dashboard with delivery status, readiness score, acceptance thresholds, import batches, validation result, and report preview

The delivery endpoint is:

```bash
curl "http://127.0.0.1:8765/api/pilot/delivery?role=%E7%AE%A1%E7%90%86%E5%91%98"
```

Expected decision:

```text
version = V1.3
config_center.status = configured
simulated_import.source = independent_simulated_csv
simulated_import.privacy.contains_customer_data = false
simulated_import.validation.status = pass
report_export.format = markdown
delivery_status = ready_to_submit
```

## V1.2 Pilot Readiness Features

V1.2 upgrades the demo from a review-ready pilot package to a controlled pilot preparation package:

- independent simulated import data for development
- no customer names, student IDs, phone numbers, emails, identity numbers, or addresses
- data quality checks for required fields, time conflicts, capacity, equipment, permission scope, and privacy fields
- admin dashboard with readiness score, dataset counts, quality checks, and next actions
- automatic readiness report for business and IT review

The readiness endpoint is:

```bash
curl "http://127.0.0.1:8765/api/pilot/readiness?role=%E7%AE%A1%E7%90%86%E5%91%98"
```

Expected decision:

```text
privacy.data_mode = independent_simulation
privacy.contains_customer_data = false
readiness_report.decision = ready_for_controlled_pilot
```

## V1.1 Review Features

V1.1 upgrades the demo from a runnable MVP to a review-ready pilot package:

- deterministic six-week pilot simulation data
- baseline/current/improvement indicators
- admin dashboard with acceptance gates and scenario coverage
- automatic Go/No-Go acceptance summary
- weekly report text with wins, risks, and next actions

The review summary endpoint is:

```bash
curl "http://127.0.0.1:8765/api/pilot/summary?role=%E7%AE%A1%E7%90%86%E5%91%98"
```

Expected decision:

```text
acceptance.status = go
```

## Data Boundary

The local MVP uses seeded campus data tables and V1.3 independent simulated pilot delivery data. Development does not import customer real names, student IDs, employee IDs, phone numbers, emails, identity numbers, addresses, personal trajectory data, grades, disciplinary data, or psychological records. Medium and high risk actions require manual review.

## V1.3 Pilot Delivery Package

- `deliverables/v1.3/00_V1.3试点交付版总览.md`
- `deliverables/v1.3/01_试点配置中心说明.md`
- `deliverables/v1.3/02_模拟导入校验与报告导出说明.md`
- `deliverables/v1.3/03_V1.3验收清单.md`

## V1.0 Submission Package

- `deliverables/v1.0/00_V1.0提交包总览.md`
- `deliverables/v1.0/01_答辩演示手册.md`
- `deliverables/v1.0/02_试点执行与验收包.md`
- `deliverables/v1.0/03_工程验收与运维包.md`
- `deliverables/v1.0/04_提交前检查清单.md`

## V1.1 Review Package

- `deliverables/v1.1/00_V1.1评审版总览.md`
- `deliverables/v1.1/01_试点仿真数据说明.md`
- `deliverables/v1.1/02_指标看板与自动验收摘要.md`
- `deliverables/v1.1/03_V1.1提交前验收清单.md`

## V1.2 Pilot Readiness Package

- `deliverables/v1.2/00_V1.2试点准备版总览.md`
- `deliverables/v1.2/01_模拟数据与隐私边界说明.md`
- `deliverables/v1.2/02_数据质量检查与试点配置说明.md`
- `deliverables/v1.2/03_V1.2验收清单.md`
