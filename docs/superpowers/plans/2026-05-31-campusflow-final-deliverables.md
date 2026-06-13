# CampusFlow 最终交付物 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the final CampusFlow product deliverable package as Markdown documents.

**Architecture:** This is a documentation-only deliverable. The source concept remains in `产品方案V1.md`; final documents live under `deliverables/` and separate strategy, PRD, operations, and demo concerns.

**Tech Stack:** Markdown, UTF-8 without BOM, Git Bash on Windows.

---

### Task 1: Create Deliverable Directory And Index

**Files:**
- Create: `deliverables/00_最终交付物总览.md`

- [ ] **Step 1: Create the final index document**

Write `deliverables/00_最终交付物总览.md` with:

```markdown
# CampusFlow 最终交付物总览

## 一句话定位

CampusFlow 是面向高校教务、学工和场地管理部门的校园空间预约与审批智能调度助手，帮助学校把“学生找空间、社团借场地、老师审申请、管理者看利用率”从人工查询和表格流转升级为可解释、可追踪、可验收的 AI 工作流。
```

- [ ] **Step 2: Verify file exists**

Run: `test -f deliverables/00_最终交付物总览.md && echo OK`

Expected: `OK`

### Task 2: Write Research And Requirements Analysis

**Files:**
- Create: `deliverables/01_调研与需求分析.md`

- [ ] **Step 1: Write the requirements document**

Include target users, interview table, user journeys, pain-point attribution, prioritization model, MVP scope, and evidence assumptions.

- [ ] **Step 2: Verify headings**

Run: `grep -n '^## ' deliverables/01_调研与需求分析.md`

Expected: headings for 背景、调研对象、用户旅程、痛点归因、需求优先级、MVP 边界、调研结论.

### Task 3: Write PRD

**Files:**
- Create: `deliverables/02_PRD_校园空间预约与审批智能调度助手.md`

- [ ] **Step 1: Write PRD**

Include product goal, roles, MVP features, AI workflow, data model, recommendation scoring, permission rules, fallback states, metrics, and roadmap.

- [ ] **Step 2: Verify no placeholders**

Run: `grep -RIn -e 'TO''DO' -e 'TB''D' -e '待''补' -e '占''位' deliverables docs/superpowers || true`

Expected: no output.

### Task 4: Write Operations Plan

**Files:**
- Create: `deliverables/03_运营推广方案.md`

- [ ] **Step 1: Write operations plan**

Include pilot school selection, four-stage rollout, cold start plan, stakeholder operation, success metrics, procurement entry point, and risk control.

- [ ] **Step 2: Verify metrics are present**

Run: `grep -n '验收指标\|核心指标\|采购' deliverables/03_运营推广方案.md`

Expected: multiple matching lines.

### Task 5: Write Demo Plan And Script

**Files:**
- Create: `deliverables/04_Demo方案与演示脚本.md`

- [ ] **Step 1: Write demo plan**

Include information architecture, mock dataset, three demo scripts, UI sections, technical implementation, and acceptance checklist.

- [ ] **Step 2: Verify demo scripts are present**

Run: `grep -n '演示链路' deliverables/04_Demo方案与演示脚本.md`

Expected: three demo script sections.

### Task 6: Final Review

**Files:**
- Modify: any deliverable file if review finds an issue

- [ ] **Step 1: List files**

Run: `find deliverables docs/superpowers -type f | sort`

Expected: the five deliverable files plus the spec and plan.

- [ ] **Step 2: Check UTF-8 readability and placeholder scan**

Run: `grep -RIn -e 'TO''DO' -e 'TB''D' -e '待''补' -e '占''位' deliverables docs/superpowers || true`

Expected: no output.

- [ ] **Step 3: Check git status**

Run: `git status --short`

Expected: new deliverable, spec, and plan files are visible.
