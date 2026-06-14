(function () {
  const prompts = {
    学生: '今晚 7 点后，找东门附近 4 人讨论空间，要插座。',
    社团负责人: '周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。',
    老师: '查看待审批的 AI 分享会，检查嘉宾、设备、冲突。',
    管理员: '本周哪些空间冲突最多？给出下周建议。'
  };
  const modes = {
    '3': [['学生', '一句话找空间'], ['社团负责人', '生成活动申请'], ['老师', '人工审批兜底'], ['管理员', '运营复盘']]
  };
  const state = { role: '学生', mode: '3', step: 0 };
  const $ = (id) => document.querySelector(id);
  const els = {
    status: $('#serverStatus'), activeRole: $('#activeRole'), tabs: $('#roleTabs'), prompts: $('#promptList'), input: $('#queryInput'),
    run: $('#runButton'), submit: $('#submitButton'), workflow: $('#workflowSteps'), parsed: $('#parsedOutput'), result: $('#resultPanel'),
    mode3: $('#mode3'),
    next: $('#nextStep'), focus: $('#focusMode'), reset: $('#resetDemo'), pTitle: $('#presentationTitle'), pPoint: $('#presentationPoint'), steps: $('#stepTrack')
  };

  function esc(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }
  function eq(items) {
    const names = { power_socket: '插座', whiteboard: '白板', projector: '投影', microphone: '麦克风', speaker: '音响', screen: '电子屏' };
    return (items || []).map((item) => names[item] || item).join('、') || '无特殊设备';
  }
  function risk(level) {
    return { low: '低风险', medium: '中风险', high: '高风险' }[level] || level;
  }
  function statusLabel(status) {
    return {
      pending_review: '待审批',
      approved: '已通过',
      returned_for_materials: '已退回补材料',
      reschedule_required: '已要求改期',
      rejected: '已驳回'
    }[status] || status;
  }
  function locationLabel(tag) {
    return {
      east_gate: '东门附近',
      activity_center: '活动中心',
      library: '图书馆区',
      east_campus: '东校区',
      central: '东区中部'
    }[tag] || tag;
  }
  function post(path, body) {
    return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(read);
  }
  function get(path) {
    return fetch(path).then(read);
  }
  async function read(response) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || '请求失败');
    return data;
  }

  function init() {
    els.run.addEventListener('click', runCurrent);
    els.submit.addEventListener('click', submitApplication);
    els.tabs.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-role]');
      if (button) setRole(button.dataset.role);
    });
    els.prompts.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-prompt]');
      if (!button) return;
      els.input.value = button.dataset.prompt;
      runCurrent();
    });
    els.mode3.addEventListener('click', () => setMode('3'));
    els.next.addEventListener('click', () => {
      state.step = (state.step + 1) % modes[state.mode].length;
      setRole(modes[state.mode][state.step][0]);
    });
    els.focus.addEventListener('click', () => {
      document.body.classList.toggle('is-focus');
      els.focus.textContent = document.body.classList.contains('is-focus') ? '退出演示视图' : '演示视图';
    });
    els.reset.addEventListener('click', resetDemo);
    els.steps.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-step]');
      if (!button) return;
      state.step = Number(button.dataset.step);
      setRole(modes[state.mode][state.step][0]);
    });
    els.result.addEventListener('click', onResultClick);
    renderStatic();
    setRole('学生', false);
    boot();
  }

  async function boot() {
    try {
      const health = await get('/api/health');
      els.status.textContent = health.product + ' ' + health.mode;
      els.status.className = 'is-ok';
      await runCurrent();
    } catch (error) {
      showError(error);
    }
  }
  function renderStatic() {
    els.prompts.innerHTML = Object.keys(prompts).map((role) =>
      '<button type="button" data-prompt="' + esc(prompts[role]) + '"><span>' + role + '</span><strong>' + prompts[role] + '</strong></button>'
    ).join('');
  }
  function setMode(mode) {
    state.mode = mode;
    state.step = 0;
    setRole(modes[mode][0][0]);
  }
  function setRole(role, shouldRun = true) {
    state.role = role;
    els.activeRole.textContent = role;
    els.input.value = prompts[role];
    renderTabs();
    renderPresentation();
    els.submit.disabled = role !== '社团负责人';
    if (shouldRun) runCurrent();
  }
  function renderTabs() {
    els.tabs.innerHTML = Object.keys(prompts).map((role) =>
      '<button type="button" class="' + (role === state.role ? 'is-active' : '') + '" data-role="' + role + '">' + role + '</button>'
    ).join('');
  }
  function renderPresentation() {
    const list = modes[state.mode];
    const item = list[state.step] || list[0];
    els.mode3.classList.toggle('is-active', state.mode === '3');
    els.pTitle.textContent = state.mode + ' 分钟演示 · ' + item[1];
    els.pPoint.textContent = item[0] + '视图：' + prompts[item[0]];
    els.steps.innerHTML = list.map((step, index) =>
      '<button type="button" class="' + (index === state.step ? 'is-active' : '') + '" data-step="' + index + '"><span>' + (index + 1) + '</span><strong>' + step[0] + '</strong><em>' + step[1] + '</em></button>'
    ).join('');
  }

  async function runCurrent() {
    const input = els.input.value.trim() || prompts[state.role];
    try {
      const parsed = await post('/api/intent/parse', { role: state.role, input });
      renderWorkflow(parsed.workflow_steps);
      els.parsed.textContent = JSON.stringify(parsed.parsed, null, 2);
      if (state.role === '老师') await renderTeacher();
      else if (state.role === '管理员' || parsed.parsed.intent === 'operations_summary') await renderOperations();
      else if (parsed.parsed.intent === 'event_application') renderDraft(await post('/api/applications/draft', { role: state.role, input }));
      else renderRecommendations(await post('/api/spaces/recommend', { role: state.role, input }));
      await refreshSide();
    } catch (error) {
      showError(error);
    }
  }
  function renderWorkflow(steps) {
    els.workflow.innerHTML = steps.map((step, index) =>
      '<li><span>' + (index + 1) + '</span><div><strong>' + esc(step.title) + '</strong><p>' + esc(step.detail) + '</p></div></li>'
    ).join('');
  }
  function heading(kicker, title, pill, cls) {
    return '<div class="panel-heading"><div><p class="eyebrow">' + esc(kicker) + '</p><h2>' + esc(title) + '</h2></div><span class="pill ' + (cls || '') + '">' + esc(pill) + '</span></div>';
  }
  function governance(title) {
    return '<section class="governance"><article><h3>' + esc(title) + '</h3><p>空间表、课表、预约表、设备状态、审批规则和行为日志。</p></article><article><h3>安全边界</h3><p>不接入个人轨迹；AI 不自动批准中高风险申请；所有关键动作写入审计日志。</p></article></section>';
  }

  function renderRecommendations(data) {
    const cards = data.recommendations.map(cardSpace).join('');
    const blocked = data.unavailable.slice(0, 3).map((space) =>
      '<li><strong>' + esc(space.short_name) + '</strong><span>' + esc(space.reasons.join('；')) + '</span></li>'
    ).join('');
    els.result.innerHTML =
      heading('学生视图', '空间推荐', data.recommendations.length + ' 个可选空间', 'good') +
      '<div class="cards-grid">' + cards + '</div>' +
      '<section class="mini-section"><h3>已排除候选</h3><ul class="blocked-list">' + blocked + '</ul></section>' +
      governance('推荐依据');
  }

  function cardSpace(space, index) {
    return '<article class="space-card">' +
      '<div class="card-top"><span>TOP ' + (index + 1) + '</span><strong>' + esc(space.score) + '<small>分</small></strong></div>' +
      '<h3>' + esc(space.space_name) + '</h3>' +
      '<p>' + esc(space.type_name) + ' · ' + esc(space.capacity) + ' 人 · ' + esc(eq(space.equipment)) + '</p>' +
      '<ul>' + space.reasons.map((item) => '<li>' + esc(item) + '</li>').join('') + '</ul>' +
      '<div class="card-actions">' +
      '<button type="button" class="primary small" data-action="reserved" data-space="' + esc(space.space_id) + '">采纳</button>' +
      '<button type="button" class="ghost small" data-action="feedback" data-space="' + esc(space.space_id) + '">反馈</button></div>' +
      '</article>';
  }

  function renderDraft(data) {
    const draft = data.draft;
    const selected = draft.selected_space;
    const riskInfo = draft.risk;
    els.result.innerHTML =
      heading('社团负责人视图', '活动申请草稿', risk(riskInfo.level), riskInfo.level === 'low' ? 'good' : 'warn') +
      '<section class="draft-layout">' +
      '<article class="draft-main"><h3>' + esc(draft.event_name) + '</h3>' +
      '<dl><dt>时间</dt><dd>' + esc(draft.date) + ' ' + esc(draft.start) + '-' + esc(draft.end) + '</dd>' +
      '<dt>规模</dt><dd>' + esc(draft.capacity) + ' 人</dd>' +
      '<dt>设备</dt><dd>' + esc(eq(draft.equipment)) + '</dd>' +
      '<dt>外校嘉宾</dt><dd>' + (draft.external_guests ? esc(draft.external_guest_count) + ' 人' : '无') + '</dd>' +
      '<dt>推荐空间</dt><dd>' + (selected ? esc(selected.space_name) + ' · ' + esc(selected.score) + ' 分' : '暂无可选空间') + '</dd></dl>' +
      '<button type="button" class="primary" data-action="submit-draft">提交审批</button></article>' +
      '<article class="risk-panel"><h3>风险与材料</h3><ul>' +
      riskInfo.items.map((item) => '<li><strong>' + esc(risk(item.level)) + '</strong><span>' + esc(item.item) + '：' + esc(item.action) + '</span></li>').join('') +
      '</ul><p>审批人：' + esc(riskInfo.approvers.join('、')) + '</p></article></section>' +
      '<div class="cards-grid compact">' + draft.recommendation.recommendations.map(cardSpace).join('') + '</div>' +
      governance('申请依据');
  }

  async function renderTeacher() {
    const data = await get('/api/applications?role=' + encodeURIComponent('老师'));
    const pending = data.applications.filter((item) => item.status === 'pending_review');
    const queue = data.applications.map(queueItem).join('');
    els.result.innerHTML =
      heading('老师视图', '审批工作台', pending.length + ' 个待处理', pending.length ? 'warn' : 'good') +
      '<section class="queue-list">' + (queue || '<article class="empty-state"><h3>暂无申请</h3><p>切换到社团负责人提交一次申请后，这里会出现审批队列。</p></article>') + '</section>' +
      governance('审批边界');
  }

  function queueItem(item) {
    const pending = item.status === 'pending_review';
    const space = item.selected_space;
    const venue = space
      ? esc(space.space_name) + ' · ' + esc(space.type_name) + ' · 可容纳 ' + esc(space.capacity) + ' 人 · ' + esc(locationLabel(space.location_tag))
      : '暂无匹配场地（需人工指定）';
    const guests = item.external_guests ? esc(item.external_guest_count) + ' 名外校嘉宾' : '无外校嘉宾';
    const riskRows = (item.risk_items || []).map((r) =>
      '<li><span class="pill ' + (r.level === 'low' ? 'good' : 'warn') + '">' + esc(risk(r.level)) + '</span><div><strong>' + esc(r.item) + '</strong><span>' + esc(r.action) + '</span></div></li>'
    ).join('');
    const riskCount = (item.risk_items || []).length;
    return '<article class="queue-item">' +
      '<div class="queue-main"><p class="eyebrow">' + esc(item.application_id) + '</p><h3>' + esc(item.event_name) + '</h3>' +
      '<p>' + esc(item.date_key) + ' ' + esc(item.start_time) + '-' + esc(item.end_time) + ' · ' + esc(item.capacity) + ' 人 · ' + esc(eq(item.equipment)) + '</p>' +
      '<p class="queue-venue"><span>申请场地</span>' + venue + '</p>' +
      '<p>' + guests + ' · 风险：' + esc(risk(item.risk_level)) + ' · 审批人：' + esc(item.approvers.join('、')) + '</p>' +
      (riskRows ? '<details class="queue-detail"><summary>风险与材料明细（' + riskCount + '）</summary><ul class="risk-detail-list">' + riskRows + '</ul></details>' : '') +
      '</div>' +
      '<div class="decision-actions"><span class="pill ' + (pending ? 'warn' : 'good') + '">' + esc(statusLabel(item.status)) + '</span>' +
      '<button type="button" class="primary small" data-decision="approved" data-application="' + esc(item.application_id) + '"' + (pending ? '' : ' disabled') + '>通过</button>' +
      '<button type="button" class="ghost small" data-decision="returned" data-application="' + esc(item.application_id) + '"' + (pending ? '' : ' disabled') + '>补材料</button>' +
      '<button type="button" class="ghost small" data-decision="rescheduled" data-application="' + esc(item.application_id) + '"' + (pending ? '' : ' disabled') + '>改期</button></div>' +
      '</article>';
  }

  async function renderOperations() {
    const [data, pilot, readiness, delivery] = await Promise.all([
      get('/api/operations/summary?role=' + encodeURIComponent('管理员')),
      get('/api/pilot/summary?role=' + encodeURIComponent('管理员')),
      get('/api/pilot/readiness?role=' + encodeURIComponent('管理员')),
      get('/api/pilot/delivery?role=' + encodeURIComponent('管理员'))
    ]);
    const actions = data.actions.map((item) => '<li>' + esc(item) + '</li>').join('');
    const conflicts = data.conflicts.map((item) =>
      '<article class="conflict-card"><strong>' + esc(item.count) + '</strong><div><h3>' + esc(item.space_name) + '</h3><p>' + esc(item.reason) + '</p></div></article>'
    ).join('');
    const ready = delivery.delivery_status === 'ready_to_submit';
    els.result.innerHTML =
      heading('管理员视图', '运营复盘与试点治理', ready ? '交付可提交' : '需补齐', ready ? 'good' : 'warn') +
      '<section class="role-orient"><h3>管理员在 CampusFlow 的职责</h3>' +
      '<p>管理员从全校视角复盘空间运营：发现高峰冲突、给出下周调度建议，并监督试点的数据治理与验收。' +
      '看到的是<strong>聚合统计</strong>，不接入任何个人轨迹；AI 负责生成建议，最终决策仍由管理员人工确认。</p>' +
      '<div class="role-orient-grid">' +
      '<div><span>日常运营</span><p>冲突复盘、利用率、周报建议</p></div>' +
      '<div><span>试点治理</span><p>导入校验、隐私边界、验收门槛</p></div>' +
      '<div><span>边界</span><p>聚合数据 · 无个人轨迹 · 人工兜底</p></div>' +
      '</div></section>' +
      '<section class="ops-hero"><p>' + esc(data.weekly_brief) + '</p><ul>' + actions + '</ul></section>' +
      '<section class="conflict-cards">' + conflicts + '</section>' +
      sectionBanner('试点交付材料', '以下为评审与答辩用的试点治理证据，按 V1.3 → V1.1 版本归档。') +
      renderPilotDelivery(delivery) +
      renderPilotReadiness(readiness) +
      renderPilotSummary(pilot) +
      governance('运营数据源');
  }

  function sectionBanner(title, note) {
    return '<div class="section-banner"><h3>' + esc(title) + '</h3><p>' + esc(note) + '</p></div>';
  }

  function renderPilotDelivery(delivery) {
    const config = delivery.config_center;
    const imported = delivery.simulated_import;
    const batches = imported.batches.map((item) =>
      '<article><span>' + esc(item.dataset) + '</span><strong>' + esc(item.rows) + '</strong><em>' + esc(item.status) + '</em></article>'
    ).join('');
    const thresholds = Object.keys(config.acceptance_thresholds).map((key) =>
      '<li><strong>' + esc(key) + '</strong><span>' + esc(config.acceptance_thresholds[key]) + '</span></li>'
    ).join('');
    const sections = delivery.report_export.sections.map((item) => '<li>' + esc(item) + '</li>').join('');
    const markdownPreview = delivery.report_export.markdown.split('\n').slice(0, 12).join('\n');
    return '<section class="delivery-hero">' +
      '<div><p class="eyebrow">V1.3 试点交付</p><h3>' + esc(delivery.title) + '</h3>' +
      '<p>配置中心已完成，模拟导入校验通过，Markdown 试点报告可直接用于提交沟通。</p></div>' +
      '<strong>' + esc(delivery.delivery_status) + '</strong></section>' +
      '<section class="delivery-layout"><article><h3>试点配置中心</h3>' +
      '<dl><dt>配置编号</dt><dd>' + esc(config.config_id) + '</dd><dt>组织</dt><dd>' + esc(config.organization) + '</dd><dt>校区</dt><dd>' + esc(config.campus) + '</dd><dt>周期</dt><dd>' + esc(config.period) + '</dd><dt>角色</dt><dd>' + esc(config.roles.join('、')) + '</dd></dl>' +
      '<ul class="threshold-list">' + thresholds + '</ul></article>' +
      '<article><h3>模拟导入校验</h3><div class="batch-grid">' + batches + '</div>' +
      '<p class="privacy-note">校验状态：' + esc(imported.validation.status) + ' · 通过/警告/失败：' + esc(imported.validation.passed) + '/' + esc(imported.validation.warnings) + '/' + esc(imported.validation.failed) + '</p></article></section>' +
      '<section class="report-export"><article><h3>报告章节</h3><ul>' + sections + '</ul></article>' +
      '<article><h3>Markdown 预览</h3><pre>' + esc(markdownPreview) + '</pre></article></section>';
  }

  function renderPilotReadiness(readiness) {
    const datasets = Object.keys(readiness.datasets).map((key) => {
      const item = readiness.datasets[key];
      const names = {
        spaces: '空间',
        schedules: '课表',
        reservations: '预约',
        equipment_status: '设备',
        approval_rules: '规则'
      };
      return '<article><span>' + esc(names[key] || key) + '</span><strong>' + esc(item.count) + '</strong><em>' + esc(item.status) + '</em></article>';
    }).join('');
    const checks = readiness.quality_checks.map((item) =>
      '<li class="' + esc(item.status) + '"><span>' + esc(item.status.toUpperCase()) + '</span><div><strong>' + esc(item.name) + '</strong><p>' + esc(item.detail) + '</p></div></li>'
    ).join('');
    const actions = readiness.readiness_report.next_actions.map((item) => '<li>' + esc(item) + '</li>').join('');
    return '<section class="readiness-hero">' +
      '<div><p class="eyebrow">V1.2 试点准备</p><h3>' + esc(readiness.title) + '</h3><p>' + esc(readiness.privacy.statement) + '</p></div>' +
      '<strong>' + esc(readiness.readiness_score) + '</strong></section>' +
      '<section class="readiness-layout"><article><h3>模拟数据导入状态</h3><div class="dataset-grid">' + datasets + '</div>' +
      '<p class="privacy-note">数据模式：' + esc(readiness.privacy.data_mode) + ' · 客户真实数据：' + (readiness.privacy.contains_customer_data ? '发现' : '未发现') + '</p></article>' +
      '<article><h3>数据质量检查</h3><ul class="quality-list">' + checks + '</ul></article></section>' +
      '<section class="readiness-report"><div><h3>' + esc(readiness.readiness_report.decision) + '</h3><p>' + esc(readiness.readiness_report.summary) + '</p></div>' +
      '<ul>' + actions + '</ul></section>';
  }

  function renderPilotSummary(pilot) {
    const metrics = [
      ['找空间耗时', pilot.baseline.space_search_minutes + ' 分钟', pilot.current.space_search_minutes + ' 分钟', '降低 ' + pilot.improvements.space_search_time_saved_rate + '%'],
      ['一次通过率', pilot.baseline.first_pass_rate + '%', pilot.current.first_pass_rate + '%', '+' + pilot.improvements.first_pass_rate_lift + 'pp'],
      ['审批周期', pilot.baseline.approval_hours + ' 小时', pilot.current.approval_hours + ' 小时', '缩短 ' + pilot.improvements.approval_time_saved_rate + '%'],
      ['空间利用率', pilot.baseline.utilization_rate + '%', pilot.current.utilization_rate + '%', '+' + pilot.improvements.utilization_lift + 'pp']
    ].map((item) =>
      '<article><span>' + esc(item[0]) + '</span><div><em>基线 ' + esc(item[1]) + '</em><strong>' + esc(item[2]) + '</strong><b>' + esc(item[3]) + '</b></div></article>'
    ).join('');
    const gates = pilot.acceptance.gates.map((gate) =>
      '<li class="' + esc(gate.status) + '"><span>' + (gate.status === 'pass' ? 'PASS' : 'WARN') + '</span><div><strong>' + esc(gate.name) + '</strong><p>' + esc(gate.evidence) + '</p></div></li>'
    ).join('');
    const scenarios = pilot.scenarios.map((item) =>
      '<article><span>' + esc(item.role) + '</span><strong>' + esc(item.volume) + '</strong><p>' + esc(item.name) + '</p></article>'
    ).join('');
    const wins = pilot.weekly_report.wins.map((item) => '<li>' + esc(item) + '</li>').join('');
    const risks = pilot.weekly_report.risks.map((item) => '<li>' + esc(item) + '</li>').join('');
    const next = pilot.weekly_report.next_actions.map((item) => '<li>' + esc(item) + '</li>').join('');
    return '<section class="pilot-hero">' +
      '<div><p class="eyebrow">试点验收摘要</p><h3>' + esc(pilot.period) + '</h3><p>' + esc(pilot.acceptance.decision) + '</p></div>' +
      '<strong>' + esc(pilot.acceptance.passed) + '/' + esc(pilot.acceptance.total) + '</strong></section>' +
      '<section class="pilot-metrics">' + metrics + '</section>' +
      '<section class="acceptance-grid"><article><h3>验收门槛</h3><ul>' + gates + '</ul></article>' +
      '<article><h3>场景覆盖</h3><div class="scenario-grid">' + scenarios + '</div></article></section>' +
      '<section class="weekly-report"><div><h3>' + esc(pilot.weekly_report.title) + '</h3><p>' + esc(pilot.weekly_report.summary) + '</p></div>' +
      '<div class="report-columns"><article><h4>有效进展</h4><ul>' + wins + '</ul></article><article><h4>剩余风险</h4><ul>' + risks + '</ul></article><article><h4>下一步</h4><ul>' + next + '</ul></article></div></section>';
  }

  async function submitApplication() {
    if (state.role !== '社团负责人') return;
    try {
      const result = await post('/api/applications/submit', { role: state.role, input: els.input.value.trim() || prompts[state.role] });
      els.result.innerHTML =
        heading('提交成功', '申请已进入人工审批', result.application.status, 'warn') +
        '<section class="submitted-box"><h3>' + esc(result.application.event_name) + '</h3>' +
        '<p>编号：' + esc(result.application.application_id) + '</p>' +
        '<p>空间：' + esc(result.application.selected_space_id) + ' · 风险：' + esc(risk(result.risk.level)) + '</p>' +
        '<button type="button" class="primary" data-feedback-action="submitted" data-application="' + esc(result.application.application_id) + '">记录采纳</button></section>' +
        governance('提交记录');
      await refreshSide();
    } catch (error) {
      showError(error);
    }
  }

  async function resetDemo() {
    try {
      els.reset.disabled = true;
      els.reset.textContent = '重置中';
      const result = await post('/api/demo/reset', { role: '管理员' });
      state.step = 0;
      state.mode = '3';
      setRole('学生', false);
      els.result.innerHTML =
        heading('演示已重置', '数据回到初始状态', 'ready', 'good') +
        '<section class="submitted-box"><h3>可重新演示主链路</h3>' +
        '<p>已清理申请 ' + esc(result.cleared.applications) + ' 条、反馈 ' + esc(result.cleared.feedback_log) + ' 条、审计 ' + esc(result.cleared.audit_log) + ' 条。</p>' +
        '<p>建议从学生找空间开始，再进入社团申请、老师审批和管理员复盘。</p></section>' +
        governance('演示控制');
      await refreshSide();
    } catch (error) {
      showError(error);
    } finally {
      els.reset.disabled = false;
      els.reset.textContent = '重置演示';
    }
  }

  async function onResultClick(event) {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.action === 'submit-draft') {
      await submitApplication();
      return;
    }
    if (target.dataset.action) {
      const action = target.dataset.action;
      if (target.dataset.feedbackId) {
        // already recorded → undo it
        await post('/api/feedback/cancel', { role: state.role, feedback_id: target.dataset.feedbackId });
        delete target.dataset.feedbackId;
        target.textContent = action === 'reserved' ? '采纳' : '反馈';
        target.classList.remove('is-done');
      } else {
        const result = await post('/api/feedback', { role: state.role, space_id: target.dataset.space, action, rating: action === 'reserved' ? 5 : 4 });
        target.dataset.feedbackId = result.feedback_id;
        target.textContent = action === 'reserved' ? '已采纳 · 撤回' : '已反馈 · 撤回';
        target.classList.add('is-done');
      }
      await refreshSide();
      return;
    }
    if (target.dataset.decision) {
      await post('/api/reviews/' + encodeURIComponent(target.dataset.application) + '/decision', {
        role: state.role,
        decision: target.dataset.decision,
        note: 'Demo 审批操作'
      });
      await renderTeacher();
      await refreshSide();
      return;
    }
    if (target.dataset.feedbackAction) {
      if (target.dataset.feedbackId) {
        await post('/api/feedback/cancel', { role: state.role, feedback_id: target.dataset.feedbackId });
        delete target.dataset.feedbackId;
        target.textContent = '记录采纳';
        target.classList.remove('is-done');
      } else {
        const result = await post('/api/feedback', { role: state.role, application_id: target.dataset.application, action: target.dataset.feedbackAction, rating: 5 });
        target.dataset.feedbackId = result.feedback_id;
        target.textContent = '已记录 · 撤回';
        target.classList.add('is-done');
      }
      await refreshSide();
    }
  }

  async function refreshSide() {
    // 指标与审计侧边栏已移除；管理员视图在结果区单独拉取所需数据。
  }

  function showError(error) {
    els.status.textContent = '本机服务异常';
    els.status.className = 'is-error';
    els.result.innerHTML = heading('错误', '无法完成当前操作', '请检查后端', 'danger') +
      '<section class="empty-state"><h3>' + esc(error.message || error) + '</h3><p>确认已运行 PYTHONPATH=apps/api python -m campusflow.server。</p></section>';
  }

  init();
}());
