(function () {
  const spaces = [
    { id: 'B203', building: '教学楼 B', name: '教学楼 B203', shortName: 'B203', type: 'discussion', typeName: '讨论教室', capacity: 12, equipment: ['power_socket', 'whiteboard'], locationTag: 'east_gate', openStart: '08:00', openEnd: '22:00', occupancyRate: 35, satisfaction: 92 },
    { id: 'L305', building: '图书馆', name: '图书馆 L305 研讨室', shortName: 'L305', type: 'study_room', typeName: '研讨室', capacity: 6, equipment: ['power_socket', 'screen'], locationTag: 'library', openStart: '09:00', openEnd: '21:30', occupancyRate: 45, satisfaction: 86 },
    { id: 'C102', building: '创新中心', name: '创新中心 C102', shortName: 'C102', type: 'maker_space', typeName: '创客空间', capacity: 8, equipment: ['projector', 'power_socket'], locationTag: 'innovation_center', openStart: '10:00', openEnd: '22:00', occupancyRate: 40, satisfaction: 83 },
    { id: 'A102', building: '教学楼 A', name: '教学楼 A102 阶梯教室', shortName: 'A102', type: 'lecture_hall', typeName: '阶梯教室', capacity: 120, equipment: ['projector', 'microphone'], locationTag: 'main_teaching', openStart: '08:00', openEnd: '22:00', occupancyRate: 70, satisfaction: 78 },
    { id: 'S201', building: '学生活动中心', name: '学生活动中心 201 报告厅', shortName: 'S201', type: 'auditorium', typeName: '报告厅', capacity: 100, equipment: ['projector', 'microphone', 'speaker'], locationTag: 'activity_center', openStart: '09:00', openEnd: '21:30', occupancyRate: 62, satisfaction: 88 },
    { id: 'Z301', building: '综合楼', name: '综合楼 301 多功能室', shortName: 'Z301', type: 'activity_room', typeName: '活动室', capacity: 90, equipment: ['projector', 'whiteboard'], locationTag: 'central_building', openStart: '08:00', openEnd: '22:00', occupancyRate: 52, satisfaction: 81 }
  ];

  const schedules = [
    { spaceId: 'A102', date: 'friday', start: '19:00', end: '21:00', label: '大学英语课程' }
  ];

  const reservations = [
    { spaceId: 'L305', date: 'today', start: '18:00', end: '19:30', status: 'approved', label: '考研学习小组' }
  ];

  const tickets = [
    { spaceId: 'Z301', status: 'open', impact: 'warning', equipmentName: '移动麦克风' }
  ];

  const examplePrompts = [
    { label: '找空间', text: '今晚 7 点后，找东门附近 4 人讨论空间，要插座。' },
    { label: '办活动', text: '周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。' },
    { label: '看冲突', text: '本周哪些空间冲突最多？给出下周建议。' }
  ];

  const equipmentNames = {
    power_socket: '插座',
    whiteboard: '白板',
    projector: '投影',
    microphone: '麦克风',
    speaker: '音响',
    screen: '电子屏'
  };

  const locationNames = {
    east_gate: '东门近',
    library: '图书馆',
    innovation_center: '东区中部',
    main_teaching: '主教学区',
    activity_center: '活动中心',
    central_building: '综合楼'
  };

  const roleViews = {
    学生: {
      role: '学生',
      mode: 'space_search',
      title: '学生找空间',
      subtitle: '快速找到可用空间',
      defaultPrompt: '今晚 7 点后，找东门附近 4 人讨论空间，要插座。',
      tips: ['公开空间', '可解释推荐', '不展示他人隐私'],
      sideMode: 'student'
    },
    社团负责人: {
      role: '社团负责人',
      mode: 'event_application',
      title: '社团活动申请',
      subtitle: '匹配场地并预审风险',
      defaultPrompt: '周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。',
      tips: ['自动生成申请单', '风险预审', '人工确认后提交'],
      sideMode: 'club'
    },
    老师: {
      role: '老师',
      mode: 'teacher_review',
      title: '老师审批工作台',
      subtitle: '看风险、审申请',
      defaultPrompt: '查看待审批的 AI 分享会，检查嘉宾、设备、冲突。',
      tips: ['AI 不自动批准', '风险集中展示', '可退回或调场'],
      sideMode: 'teacher'
    },
    管理员: {
      role: '管理员',
      mode: 'admin_operations',
      title: '管理员调度看板',
      subtitle: '看冲突、调资源',
      defaultPrompt: '本周哪些空间冲突最多？给出下周建议。',
      tips: ['冲突排行', '替代空间', '运营建议'],
      sideMode: 'admin'
    }
  };

  roleViews.审批老师 = roleViews.老师;

  const presentationModes = {
    '3min': {
      id: '3min',
      label: '3 分钟演示',
      subtitle: '按答辩主线快速跑完四个角色',
      steps: [
        { role: '学生', title: '一句话找空间', prompt: roleViews.学生.defaultPrompt, talkingPoint: '先展示自然语言入口和可解释推荐。' },
        { role: '社团负责人', title: '生成活动申请', prompt: roleViews.社团负责人.defaultPrompt, talkingPoint: '再展示场地匹配、字段生成和风险预审。' },
        { role: '老师', title: '人工审批兜底', prompt: roleViews.老师.defaultPrompt, talkingPoint: '强调 AI 不自动批准高风险活动。' },
        { role: '管理员', title: '运营复盘', prompt: roleViews.管理员.defaultPrompt, talkingPoint: '最后用指标和周报说明 ToB 价值。' }
      ]
    },
    '10min': {
      id: '10min',
      label: '10 分钟演示',
      subtitle: '适合完整路演，保留更多解释空间',
      steps: [
        { role: '学生', title: '痛点切入', prompt: roleViews.学生.defaultPrompt, talkingPoint: '从学生找不到合适空间的日常场景切入。' },
        { role: '社团负责人', title: '申请预审', prompt: roleViews.社团负责人.defaultPrompt, talkingPoint: '展示申请字段、推荐依据、风险项和材料要求。' },
        { role: '老师', title: '审批工作台', prompt: roleViews.老师.defaultPrompt, talkingPoint: '说明老师看到的是可追溯摘要，不是黑盒结论。' },
        { role: '管理员', title: '调度看板', prompt: roleViews.管理员.defaultPrompt, talkingPoint: '展示冲突排行、备选空间和设备维护建议。' },
        { role: '管理员', title: '试点验收', prompt: roleViews.管理员.defaultPrompt, talkingPoint: '收口到 4-6 周试点和基线对比指标。' }
      ]
    }
  };

  const teacherQueue = [
    {
      id: 'APP-20260531-001',
      title: 'AI 分享会',
      applicant: '人工智能协会',
      time: '周五 19:00-21:30',
      space: '学生活动中心 201 报告厅',
      status: '待审',
      risk: '中风险'
    },
    {
      id: 'APP-20260531-002',
      title: '毕业季摄影分享',
      applicant: '摄影社',
      time: '周三 18:30-20:00',
      space: '综合楼 301 多功能室',
      status: '需补材料',
      risk: '低风险'
    }
  ];

  const state = {
    role: '学生',
    query: roleViews.学生.defaultPrompt,
    parsed: null,
    presentationMode: '3min',
    presentationStep: 0,
    focusMode: false,
    metrics: {
      pendingApprovals: 7,
      firstPassRate: 74,
      recommendationAdoption: 63,
      conflictCount: 23
    },
    lastAction: '等待现场操作'
  };

  const els = {
    roleTabs: document.querySelector('#roleTabs'),
    promptButtons: document.querySelector('#promptButtons'),
    queryInput: document.querySelector('#queryInput'),
    runButton: document.querySelector('#runButton'),
    parsedOutput: document.querySelector('#parsedOutput'),
    workflowSteps: document.querySelector('#workflowSteps'),
    resultPanel: document.querySelector('#resultPanel'),
    metricsGrid: document.querySelector('#metricsGrid'),
    conflictList: document.querySelector('#conflictList'),
    weeklyBrief: document.querySelector('#weeklyBrief'),
    actionList: document.querySelector('#actionList'),
    presentationModes: document.querySelector('#presentationModes'),
    presentationSteps: document.querySelector('#presentationSteps'),
    presentationTitle: document.querySelector('#presentationTitle'),
    presentationPoint: document.querySelector('#presentationPoint'),
    prevStep: document.querySelector('#prevStep'),
    nextStep: document.querySelector('#nextStep'),
    focusToggle: document.querySelector('#focusToggle'),
    liveFeedback: document.querySelector('#liveFeedback')
  };

  function getRoleView(role) {
    return roleViews[role] || roleViews.学生;
  }

  function getPresentationMode(mode) {
    return presentationModes[mode] || presentationModes['3min'];
  }

  function timeToMinutes(value) {
    const parts = value.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
    return timeToMinutes(leftStart) < timeToMinutes(rightEnd) && timeToMinutes(rightStart) < timeToMinutes(leftEnd);
  }

  function displayEquipment(items) {
    return items.map((item) => equipmentNames[item] || item).join('、');
  }

  function displayLocation(value) {
    return locationNames[value] || value;
  }

  function parseDemoIntent(input) {
    if (/冲突|周报|运营|利用率/.test(input)) {
      return { intent: 'operations_summary', question: input };
    }

    if (/分享会|讲座|活动|社团|外校|嘉宾/.test(input)) {
      return {
        intent: 'event_application',
        eventName: /AI/.test(input) ? 'AI 分享会' : '社团活动',
        eventType: /讲座|分享会/.test(input) ? 'lecture' : 'activity',
        date: /周五/.test(input) ? 'friday' : 'today',
        start: /7 点|19/.test(input) ? '19:00' : '18:00',
        end: /21:30|九点半/.test(input) ? '21:30' : '21:30',
        capacity: extractCapacity(input, 80),
        equipment: extractEquipment(input),
        externalGuests: /外校|嘉宾/.test(input),
        externalGuestCount: /5/.test(input) ? 5 : 0,
        preferredTypes: ['auditorium', 'lecture_hall', 'activity_room']
      };
    }

    return {
      intent: 'space_search',
      date: /周五/.test(input) ? 'friday' : 'today',
      start: /7 点|19/.test(input) ? '19:00' : '18:00',
      end: /22|十点/.test(input) ? '22:00' : '22:00',
      capacity: extractCapacity(input, 4),
      spaceType: /讨论|小组/.test(input) ? 'discussion' : 'study',
      equipment: extractEquipment(input),
      locationPreference: /东门/.test(input) ? 'east_gate' : '',
      quietPreference: /安静/.test(input) ? 'quiet' : 'normal',
      preferredTypes: ['discussion', 'study_room', 'maker_space']
    };
  }

  function buildWorkflowSteps(parsed) {
    const intentName = {
      space_search: '空间查询',
      event_application: '活动申请',
      operations_summary: '运营问数'
    }[parsed.intent] || '空间查询';
    const capacityText = parsed.capacity ? `${parsed.capacity} 人` : '当前问题';
    const equipmentText = parsed.equipment && parsed.equipment.length ? displayEquipment(parsed.equipment) : '基础条件';
    const riskText = parsed.externalGuests || (parsed.capacity || 0) > 50 ? '中高风险动作进入人工确认' : '低风险动作仍保留人工确认入口';

    return [
      { title: '理解需求', detail: `${intentName} · ${capacityText} · ${equipmentText}` },
      { title: '查询数据', detail: '读取空间表、课表、预约表、设备状态和审批规则' },
      { title: '规则过滤', detail: '按容量、时间、设备、冲突和权限过滤候选空间' },
      { title: '人工确认', detail: `${riskText}，AI 只生成建议和依据` }
    ];
  }

  function applyDemoAction(action) {
    if (!action) return;

    if (action === 'approved') {
      state.metrics.pendingApprovals = Math.max(0, state.metrics.pendingApprovals - 1);
      state.metrics.firstPassRate = Math.min(99, state.metrics.firstPassRate + 1);
      state.metrics.recommendationAdoption = Math.min(99, state.metrics.recommendationAdoption + 2);
      state.metrics.conflictCount = Math.max(0, state.metrics.conflictCount - 1);
      state.lastAction = '已通过申请：待审批 -1，采纳率 +2%';
    }

    if (action === 'returned') {
      state.metrics.firstPassRate = Math.max(0, state.metrics.firstPassRate - 1);
      state.lastAction = '已退回补材料：一次通过率 -1%';
    }

    if (action === 'rescheduled') {
      state.metrics.conflictCount = Math.max(0, state.metrics.conflictCount - 2);
      state.metrics.recommendationAdoption = Math.min(99, state.metrics.recommendationAdoption + 1);
      state.lastAction = '已转为调场：冲突数 -2';
    }

    if (action === 'reserved') {
      state.metrics.recommendationAdoption = Math.min(99, state.metrics.recommendationAdoption + 1);
      state.lastAction = '已预约推荐空间：采纳率 +1%';
    }

    if (action === 'feedback') {
      state.lastAction = '已记录反馈：进入下周规则复盘';
    }

    renderDashboard(getRoleView(state.role).sideMode);
  }

  function extractCapacity(input, fallback) {
    const match = input.match(/(\d+)\s*人/);
    return match ? Number(match[1]) : fallback;
  }

  function extractEquipment(input) {
    const equipment = [];
    if (/插座|电源/.test(input)) equipment.push('power_socket');
    if (/白板/.test(input)) equipment.push('whiteboard');
    if (/投影/.test(input)) equipment.push('projector');
    if (/麦克风|话筒/.test(input)) equipment.push('microphone');
    if (/音响/.test(input)) equipment.push('speaker');
    return equipment;
  }

  function recommendSpaces(query) {
    const recommendations = [];
    const unavailable = [];

    spaces.forEach((space) => {
      const unavailableReasons = getUnavailableReasons(space, query);
      const item = {
        ...space,
        availability: unavailableReasons.length ? 'unavailable' : 'available',
        unavailableReasons,
        unavailableRank: rankUnavailable(space, query, unavailableReasons)
      };

      if (unavailableReasons.length) {
        unavailable.push(item);
        return;
      }

      recommendations.push({
        ...item,
        score: scoreSpace(space, query),
        reasons: explainSpace(space, query),
        dataSources: ['space_basic', 'course_schedule', 'reservations', 'maintenance_ticket']
      });
    });

    recommendations.sort((left, right) => right.score - left.score);
    unavailable.sort((left, right) => right.unavailableRank - left.unavailableRank);
    return { recommendations: recommendations.slice(0, 3), unavailable };
  }

  function rankUnavailable(space, query, reasons) {
    let rank = 0;
    if (query.preferredTypes && query.preferredTypes.includes(space.type)) rank += 30;
    if (space.capacity >= query.capacity) rank += 20;
    if (query.equipment.every((item) => space.equipment.includes(item))) rank += 20;
    if (reasons.some((reason) => reason.includes('课程冲突'))) rank += 25;
    if (reasons.some((reason) => reason.includes('预约冲突'))) rank += 15;
    return rank;
  }

  function getUnavailableReasons(space, query) {
    const reasons = [];

    if (timeToMinutes(query.start) < timeToMinutes(space.openStart) || timeToMinutes(query.end) > timeToMinutes(space.openEnd)) {
      reasons.push(`开放时间为 ${space.openStart}-${space.openEnd}`);
    }

    if (space.capacity < query.capacity) {
      reasons.push(`容量 ${space.capacity} 人，不足 ${query.capacity} 人`);
    }

    const missingEquipment = query.equipment.filter((item) => !space.equipment.includes(item));
    if (missingEquipment.length) {
      reasons.push(`缺少${displayEquipment(missingEquipment)}`);
    }

    const courseConflict = schedules.find((schedule) =>
      schedule.spaceId === space.id &&
      schedule.date === query.date &&
      overlaps(schedule.start, schedule.end, query.start, query.end)
    );
    if (courseConflict) {
      reasons.push(`课程冲突：${courseConflict.label} ${courseConflict.start}-${courseConflict.end}`);
    }

    const reservationConflict = reservations.find((reservation) =>
      reservation.spaceId === space.id &&
      reservation.date === query.date &&
      reservation.status === 'approved' &&
      overlaps(reservation.start, reservation.end, query.start, query.end)
    );
    if (reservationConflict) {
      reasons.push(`预约冲突：${reservationConflict.label} ${reservationConflict.start}-${reservationConflict.end}`);
    }

    const blockingTicket = tickets.find((ticket) => ticket.spaceId === space.id && ticket.status !== 'resolved' && ticket.impact === 'blocking');
    if (blockingTicket) {
      reasons.push(`设备不可用：${blockingTicket.equipmentName}`);
    }

    return reasons;
  }

  function scoreSpace(space, query) {
    let score = 40;
    const capacityRatio = query.capacity / space.capacity;

    if (capacityRatio > 0.65 && capacityRatio <= 1) {
      score += 20;
    } else if (capacityRatio > 0.25) {
      score += 16;
    } else {
      score += 10;
    }

    const equipmentScore = query.equipment.length
      ? query.equipment.filter((item) => space.equipment.includes(item)).length / query.equipment.length
      : 1;
    score += Math.round(equipmentScore * 15);

    if (query.locationPreference && space.locationTag === query.locationPreference) {
      score += 10;
    } else if (query.preferredTypes && query.preferredTypes.includes(space.type)) {
      score += 6;
    }

    score += Math.max(0, Math.round((100 - space.occupancyRate) * 0.1));
    score += Math.round((space.satisfaction || 80) * 0.05);
    return Math.min(100, score);
  }

  function explainSpace(space, query) {
    const reasons = ['当前时段无课程和已通过预约冲突', `容量 ${space.capacity} 人，满足 ${query.capacity} 人需求`];
    if (query.equipment.length) reasons.push(`设备匹配：${displayEquipment(query.equipment)}`);
    reasons.push(`位置标签：${displayLocation(space.locationTag)}`);
    reasons.push(`预计占用率 ${space.occupancyRate}%`);
    return reasons;
  }

  function assessEventRisk(application) {
    const items = [];
    const approvers = new Set(['场地管理员']);

    if (application.capacity > 50) {
      items.push({ level: 'medium', item: '人数超过 50', action: '需要辅导员审批' });
      approvers.add('辅导员');
    }

    if (application.externalGuests) {
      items.push({ level: 'medium', item: '存在外校嘉宾', action: '上传外校嘉宾名单' });
      approvers.add('辅导员');
    }

    if (application.equipment && application.equipment.some((item) => item === 'microphone' || item === 'speaker')) {
      items.push({ level: 'low', item: '使用扩音设备', action: '提前确认设备状态' });
    }

    if (application.selectedSpaceType === 'auditorium') {
      items.push({ level: 'low', item: '使用报告厅', action: '需要场地管理员确认' });
    }

    if (application.end && timeToMinutes(application.end) > timeToMinutes('21:30')) {
      items.push({ level: 'high', item: '活动结束晚于 21:30', action: '确认安保或延时开放' });
      approvers.add('安保负责人');
    }

    const level = items.some((item) => item.level === 'high')
      ? 'high'
      : items.some((item) => item.level === 'medium')
        ? 'medium'
        : 'low';

    return { level, items, approvers: Array.from(approvers) };
  }

  function summarizeOperations() {
    const conflicts = [
      { spaceName: '学生活动中心 201', count: 8, reason: '周三、周五晚间社团活动集中' },
      { spaceName: '教学楼 A102', count: 6, reason: '容量适合中型讲座，但课程占用多' },
      { spaceName: '教学楼 B203', count: 4, reason: '小组讨论需求高，晚间预约集中' },
      { spaceName: '图书馆 L305', count: 3, reason: '研讨室数量不足' },
      { spaceName: '综合楼 301', count: 2, reason: '设备条件不稳定' }
    ];

    return {
      metrics: [
        { label: '今日空间利用率', value: '68%' },
        { label: '申请一次通过率', value: '74%' },
        { label: '平均审批时长', value: '18 小时' },
        { label: '推荐采纳率', value: '63%' }
      ],
      conflicts,
      weeklyBrief: '本周试点空间整体利用率为 68%，较上周提升 6 个百分点。冲突主要集中在周三和周五 19:00-21:00，中型活动空间供给不足。建议下周将综合楼 301 设置为中型活动备选空间，并优先确认投影和移动麦克风设备状态。',
      actions: [
        '周三、周五 19:00-21:00 开放综合楼 301 作为中型活动备选。',
        '将外校嘉宾名单设置为活动申请必填材料。',
        '对 50 人以上讲座自动提示辅导员审批。',
        '优先检查学生活动中心 201 和综合楼 301 的麦克风设备。'
      ]
    };
  }

  function init() {
    renderRoleTabs();
    renderPresentationModes();
    renderPresentationSteps();
    renderPromptButtons();
    applyRoleView(state.role);
    els.runButton.addEventListener('click', runQuery);
    els.queryInput.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runQuery();
    });
  }

  function renderRoleTabs() {
    const roles = ['学生', '老师', '社团负责人', '管理员'];
    els.roleTabs.innerHTML = roles.map((role) => `
      <button class="segmented-button ${role === state.role ? 'is-active' : ''}" type="button" data-role="${role}">
        ${role}
      </button>
    `).join('');
  }

  function renderPresentationModes() {
    els.presentationModes.innerHTML = Object.values(presentationModes).map((mode) => `
      <button class="segmented-button ${mode.id === state.presentationMode ? 'is-active' : ''}" type="button" data-mode="${mode.id}">
        ${mode.label}
      </button>
    `).join('');
  }

  function renderPresentationSteps() {
    const mode = getPresentationMode(state.presentationMode);
    const active = mode.steps[state.presentationStep] || mode.steps[0];

    els.presentationTitle.textContent = `${mode.label} · ${active.title}`;
    els.presentationPoint.textContent = active.talkingPoint;
    els.presentationSteps.innerHTML = mode.steps.map((step, index) => `
      <button class="step-chip ${index === state.presentationStep ? 'is-active' : ''}" type="button" data-step="${index}">
        <span>${index + 1}</span>
        <strong>${step.role}</strong>
        <em>${step.title}</em>
      </button>
    `).join('');

    els.prevStep.disabled = state.presentationStep === 0;
    els.nextStep.textContent = state.presentationStep === mode.steps.length - 1 ? '回到开头' : '下一步';
    els.focusToggle.textContent = state.focusMode ? '退出演示视图' : '演示视图';
  }

  function goPresentationStep(index) {
    const mode = getPresentationMode(state.presentationMode);
    const normalized = (index + mode.steps.length) % mode.steps.length;
    const step = mode.steps[normalized];

    state.presentationStep = normalized;
    applyRoleView(step.role, step.prompt);
    renderPresentationSteps();
  }

  function renderPromptButtons() {
    const roleView = getRoleView(state.role);
    const prompts = [
      { label: '当前角色默认', text: roleView.defaultPrompt },
      ...examplePrompts.filter((prompt) => prompt.text !== roleView.defaultPrompt)
    ];

    els.promptButtons.innerHTML = prompts.map((prompt) => `
      <button class="prompt-button" type="button" data-prompt="${escapeHtml(prompt.text)}">
        <span>${prompt.label}</span>
        <strong>${shortPrompt(prompt.text)}</strong>
      </button>
    `).join('');
  }

  function runQuery() {
    state.query = els.queryInput.value.trim() || getRoleView(state.role).defaultPrompt;
    state.parsed = parseDemoIntent(state.query);
    els.parsedOutput.textContent = JSON.stringify(state.parsed, null, 2);
    renderWorkflowSteps(state.parsed);

    const roleView = getRoleView(state.role);
    if (roleView.mode === 'teacher_review') {
      renderTeacherReview();
    } else if (roleView.mode === 'admin_operations') {
      renderAdminOperations();
    } else if (state.parsed.intent === 'event_application') {
      renderEventApplication(state.parsed);
    } else if (state.parsed.intent === 'operations_summary') {
      renderOperationsAnswer();
    } else {
      renderSpaceSearch(state.parsed);
    }
  }

  function renderWorkflowSteps(parsed) {
    const steps = buildWorkflowSteps(parsed);
    els.workflowSteps.innerHTML = steps.map((step, index) => `
      <li>
        <span>${index + 1}</span>
        <div>
          <strong>${step.title}</strong>
          <p>${step.detail}</p>
        </div>
      </li>
    `).join('');
  }

  function applyRoleView(role, promptOverride) {
    const roleView = getRoleView(role);
    state.role = roleView.role;
    state.query = promptOverride || roleView.defaultPrompt;
    els.queryInput.value = state.query;
    renderRoleTabs();
    renderPromptButtons();
    renderDashboard(roleView.sideMode);
    runQuery();
  }

  function renderSpaceSearch(query) {
    const result = recommendSpaces(query);
    els.resultPanel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">找空间</p>
          <h2>${result.recommendations[0]?.name || '暂无可用空间'}</h2>
        </div>
        <span class="status-pill">Top ${result.recommendations[0]?.score || 0}</span>
      </div>
      <div class="card-list">
        ${result.recommendations.map((space, index) => renderSpaceCard(space, index)).join('')}
      </div>
      ${renderGovernancePanel()}
      <section class="subsection">
        <h3>冲突</h3>
        <div class="unavailable-list">
          ${result.unavailable.slice(0, 2).map((space) => `
            <article class="unavailable-item">
              <strong>${space.name}</strong>
              <span>${space.unavailableReasons.join('；')}</span>
            </article>
          `).join('') || '<p class="muted">当前查询没有硬性冲突。</p>'}
        </div>
      </section>
    `;
  }

  function renderEventApplication(query) {
    const recommendation = recommendSpaces(query);
    const selected = recommendation.recommendations[0];
    const risk = assessEventRisk({ ...query, selectedSpaceType: selected && selected.type });

    els.resultPanel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">申请</p>
          <h2>${query.eventName} 申请单</h2>
        </div>
        <span class="status-pill ${risk.level === 'high' ? 'is-danger' : 'is-warning'}">${riskLabel(risk.level)}</span>
      </div>
      <div class="application-layout">
        <article class="recommendation-card is-featured">
          <div class="rank">主推</div>
          <h3>${selected.name}</h3>
          <p>${selected.typeName} · 容量 ${selected.capacity} 人 · ${displayEquipment(selected.equipment)}</p>
          <div class="score-line"><span style="width:${selected.score}%"></span></div>
          <strong>匹配度 ${selected.score}%</strong>
          <details class="inline-detail">
            <summary>推荐依据</summary>
            <ul>${selected.reasons.map((reason) => `<li>${reason}</li>`).join('')}</ul>
          </details>
        </article>
        <article class="form-card">
          <h3>申请字段</h3>
          <dl class="compact-dl">
            <div><dt>活动名称</dt><dd>${query.eventName}</dd></div>
            <div><dt>活动类型</dt><dd>${query.eventType === 'lecture' ? '讲座/分享会' : '社团活动'}</dd></div>
            <div><dt>活动时间</dt><dd>周五 ${query.start}-${query.end}</dd></div>
            <div><dt>预计人数</dt><dd>${query.capacity} 人</dd></div>
            <div><dt>所需设备</dt><dd>${displayEquipment(query.equipment)}</dd></div>
            <div><dt>外校嘉宾</dt><dd>${query.externalGuestCount} 人</dd></div>
            <div><dt>审批人</dt><dd>${risk.approvers.join('、')}</dd></div>
          </dl>
        </article>
      </div>
      <section class="subsection">
        <h3>风险</h3>
        <div class="risk-grid">
          ${risk.items.map((item) => `
            <article class="risk-item ${item.level}">
              <span>${riskLabel(item.level)}</span>
              <strong>${item.item}</strong>
              <p>${item.action}</p>
            </article>
          `).join('')}
        </div>
      </section>
      ${renderGovernancePanel('审批链路')}
      <section class="subsection">
        <h3>冲突</h3>
        <div class="unavailable-list">
          ${recommendation.unavailable.slice(0, 2).map((space) => `
            <article class="unavailable-item">
              <strong>${space.name}</strong>
              <span>${space.unavailableReasons.join('；')}</span>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderOperationsAnswer() {
    const summary = summarizeOperations();
    els.resultPanel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">运营</p>
          <h2>冲突 TOP5</h2>
        </div>
        <span class="status-pill">周报草稿</span>
      </div>
      <div class="conflict-table">
        ${summary.conflicts.map((item, index) => `
          <article>
            <span>${index + 1}</span>
            <strong>${item.spaceName}</strong>
            <em>${item.count} 次</em>
            <p>${item.reason}</p>
          </article>
        `).join('')}
      </div>
      <section class="brief-box">
        <h3>摘要</h3>
        <p>${summary.weeklyBrief}</p>
      </section>
      ${renderGovernancePanel('运营分析')}
      <section class="subsection">
        <h3>建议</h3>
        <ol class="action-list">${summary.actions.map((action) => `<li>${action}</li>`).join('')}</ol>
      </section>
    `;
  }

  function renderTeacherReview() {
    const query = parseDemoIntent(roleViews.社团负责人.defaultPrompt);
    const recommendation = recommendSpaces(query);
    const selected = recommendation.recommendations[0];
    const risk = assessEventRisk({ ...query, selectedSpaceType: selected && selected.type });

    els.parsedOutput.textContent = JSON.stringify({
      role: '老师',
      mode: 'teacher_review',
      currentApplication: teacherQueue[0].id,
      riskLevel: risk.level,
      approvers: risk.approvers,
      dataSources: ['course_schedule', 'reservations', 'approval_rules', 'maintenance_ticket']
    }, null, 2);

    els.resultPanel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">审批</p>
          <h2>${teacherQueue[0].title}</h2>
        </div>
        <span class="status-pill is-warning">${teacherQueue[0].risk}</span>
      </div>
      <div class="application-layout">
        <article class="form-card">
          <h3>申请</h3>
          <dl class="compact-dl">
            <div><dt>申请编号</dt><dd>${teacherQueue[0].id}</dd></div>
            <div><dt>申请社团</dt><dd>${teacherQueue[0].applicant}</dd></div>
            <div><dt>活动时间</dt><dd>${teacherQueue[0].time}</dd></div>
            <div><dt>推荐场地</dt><dd>${teacherQueue[0].space}</dd></div>
            <div><dt>预计人数</dt><dd>${query.capacity} 人</dd></div>
            <div><dt>外校嘉宾</dt><dd>${query.externalGuestCount} 人</dd></div>
          </dl>
        </article>
        <article class="recommendation-card is-featured">
          <div class="rank">AI 预审</div>
          <h3>${riskLabel(risk.level)}</h3>
          <p>已核对课表、预约、设备、规则。</p>
          <div class="risk-chips">
            ${risk.items.map((item) => `<button type="button" class="chip-button" data-message="${escapeHtml(item.action)}">${item.item}</button>`).join('')}
          </div>
          <p class="interaction-note" data-note>点击风险项查看处理建议</p>
        </article>
      </div>
      <section class="subsection">
        <h3>队列</h3>
        <div class="queue-list">
          ${teacherQueue.map((item) => `
            <article class="queue-item">
              <strong>${item.title}</strong>
              <span>${item.applicant} · ${item.time} · ${item.status}</span>
              <em>${item.risk}</em>
            </article>
          `).join('')}
        </div>
      </section>
      ${renderGovernancePanel('老师审批')}
      <section class="subsection">
        <h3>操作</h3>
        <div class="card-actions" data-action-group>
          <button type="button" data-action="已通过" data-metric-action="approved">通过</button>
          <button type="button" class="ghost" data-action="已退回补材料" data-metric-action="returned">退回</button>
          <button type="button" class="ghost" data-action="已转为调场" data-metric-action="rescheduled">调场</button>
        </div>
        <p class="interaction-note" data-action-note>等待审批动作</p>
      </section>
    `;
  }

  function renderAdminOperations() {
    renderOperationsAnswer();
    const summary = summarizeOperations();
    els.resultPanel.innerHTML += `
      <section class="subsection">
        <h3>调度</h3>
        <div class="admin-grid">
          <article class="admin-card">
            <strong>开放备选</strong>
            <span>综合楼 301</span>
            <p>周三/周五晚间启用。</p>
          </article>
          <article class="admin-card">
            <strong>维修优先</strong>
            <span>移动麦克风</span>
            <p>恢复备选空间可用性。</p>
          </article>
          <article class="admin-card">
            <strong>规则优化</strong>
            <span>外校嘉宾名单</span>
            <p>减少退回。</p>
          </article>
        </div>
      </section>
      <section class="subsection">
        <h3>重点</h3>
        <p class="muted">${summary.weeklyBrief}</p>
      </section>
    `;
  }

  function renderSpaceCard(space, index) {
    return `
      <article class="recommendation-card">
        <div class="rank">#${index + 1}</div>
        <h3>${space.name}</h3>
        <p>${space.typeName} · ${space.capacity} 人 · ${displayLocation(space.locationTag)}</p>
        <div class="meta-row">
          <span>${space.openStart}-${space.openEnd}</span>
          <span>${displayEquipment(space.equipment)}</span>
          <span>预计占用率 ${space.occupancyRate}%</span>
        </div>
        <div class="score-line"><span style="width:${space.score}%"></span></div>
        <strong>推荐分 ${space.score}</strong>
        <details class="inline-detail">
          <summary>依据</summary>
          <ul>${space.reasons.map((reason) => `<li>${reason}</li>`).join('')}</ul>
        </details>
        <div class="card-actions">
          <button type="button" data-action="已预约 ${space.shortName}" data-metric-action="reserved">预约</button>
          <button type="button" class="ghost" data-action="已记录反馈" data-metric-action="feedback">反馈</button>
        </div>
        <p class="interaction-note" data-note>可操作</p>
      </article>
    `;
  }

  function renderGovernancePanel(title = '数据来源') {
    return `
      <section class="governance-panel">
        <div>
          <h3>${title}</h3>
          <p>空间表、课表、预约表、设备状态、审批规则</p>
        </div>
        <div>
          <h3>安全边界</h3>
          <p>不接入个人轨迹；AI 不自动批准高风险申请；关键动作保留审计日志。</p>
        </div>
      </section>
    `;
  }

  function renderDashboard(mode = getRoleView(state.role).sideMode) {
    const summary = summarizeOperations();
    const roleView = getRoleView(state.role);
    const metricsByMode = {
      student: [
        { label: '可预约空间', value: '18 个' },
        { label: '平均推荐分', value: '86' },
        { label: '晚间拥挤度', value: '中' },
        { label: '推荐采纳率', value: `${state.metrics.recommendationAdoption}%` }
      ],
      club: [
        { label: '申请一次通过率', value: `${state.metrics.firstPassRate}%` },
        { label: '平均审批时长', value: '18 小时' },
        { label: '材料完整率', value: '86%' },
        { label: '推荐采纳率', value: `${state.metrics.recommendationAdoption}%` }
      ],
      teacher: [
        { label: '待审批申请', value: `${state.metrics.pendingApprovals} 件` },
        { label: '中高风险申请', value: '3 件' },
        { label: '平均预审耗时', value: '12 秒' },
        { label: '一次通过率', value: `${state.metrics.firstPassRate}%` }
      ],
      admin: [
        { label: '今日空间利用率', value: '68%' },
        { label: '申请一次通过率', value: `${state.metrics.firstPassRate}%` },
        { label: '待处理冲突', value: `${state.metrics.conflictCount} 个` },
        { label: '推荐采纳率', value: `${state.metrics.recommendationAdoption}%` }
      ]
    };
    const metrics = metricsByMode[mode] || summary.metrics;

    els.metricsGrid.innerHTML = metrics.map((metric) => `
      <article class="metric-card">
        <span>${metric.label}</span>
        <strong>${metric.value}</strong>
      </article>
    `).join('');

    els.conflictList.innerHTML = summary.conflicts.map((item) => `
      <li>
        <span>${item.spaceName}</span>
        <strong>${item.count}</strong>
      </li>
    `).join('');

    els.weeklyBrief.textContent = roleView.subtitle;
    els.actionList.innerHTML = roleView.tips.map((tip) => `<li>${tip}</li>`).join('');
    els.liveFeedback.textContent = state.lastAction;
  }

  function riskLabel(level) {
    return { low: '低风险', medium: '中风险', high: '高风险' }[level] || level;
  }

  function escapeHtml(value) {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  function shortPrompt(value) {
    return value.length > 22 ? `${value.slice(0, 22)}...` : value;
  }

  els.roleTabs.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-role]');
    if (!button) return;
    applyRoleView(button.dataset.role);
  });

  els.presentationModes.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode]');
    if (!button) return;
    state.presentationMode = button.dataset.mode;
    state.presentationStep = 0;
    renderPresentationModes();
    goPresentationStep(0);
  });

  els.presentationSteps.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-step]');
    if (!button) return;
    goPresentationStep(Number(button.dataset.step));
  });

  els.prevStep.addEventListener('click', () => {
    goPresentationStep(state.presentationStep - 1);
  });

  els.nextStep.addEventListener('click', () => {
    goPresentationStep(state.presentationStep + 1);
  });

  els.focusToggle.addEventListener('click', () => {
    state.focusMode = !state.focusMode;
    document.body.classList.toggle('is-focus-mode', state.focusMode);
    renderPresentationSteps();
  });

  els.promptButtons.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-prompt]');
    if (!button) return;
    els.queryInput.value = button.dataset.prompt;
    runQuery();
  });

  els.resultPanel.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (actionButton) {
      const group = actionButton.closest('[data-action-group]') || actionButton.closest('.card-actions');
      const note = group?.parentElement?.querySelector('[data-action-note]') || actionButton.closest('.recommendation-card')?.querySelector('[data-note]');
      if (note) note.textContent = actionButton.dataset.action;
      actionButton.classList.add('is-done');
      applyDemoAction(actionButton.dataset.metricAction);
      return;
    }

    const chipButton = event.target.closest('button[data-message]');
    if (chipButton) {
      const note = chipButton.closest('.recommendation-card')?.querySelector('[data-note]');
      if (note) note.textContent = chipButton.dataset.message;
      chipButton.classList.toggle('is-active');
    }
  });

  init();
}());
