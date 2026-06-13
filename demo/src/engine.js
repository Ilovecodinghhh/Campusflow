const timeToMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const overlaps = (leftStart, leftEnd, rightStart, rightEnd) =>
  timeToMinutes(leftStart) < timeToMinutes(rightEnd) &&
  timeToMinutes(rightStart) < timeToMinutes(leftEnd);

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

export const roleViews = {
  学生: {
    role: '学生',
    mode: 'space_search',
    title: '学生找空间',
    subtitle: '面向自习、小组讨论和临时空教室查询',
    defaultPrompt: '今晚 7 点后，帮我找一个离东门近、安静、有插座、适合 4 人讨论的地方。',
    tips: ['推荐只展示公开可预约空间', '结果解释包含容量、设备、位置和占用率', '学生端不展示他人预约隐私'],
    sideMode: 'student'
  },
  社团负责人: {
    role: '社团负责人',
    mode: 'event_application',
    title: '社团活动申请',
    subtitle: '自动匹配场地、生成申请单并提示材料',
    defaultPrompt: '周五晚上 7 点，办 80 人 AI 分享会，需要投影和麦克风，可能有 5 个外校嘉宾。',
    tips: ['优先推荐容量和设备匹配的活动空间', '人数和外校嘉宾会进入风险预审', '确认后再提交给老师审批'],
    sideMode: 'club'
  },
  老师: {
    role: '老师',
    mode: 'teacher_review',
    title: '老师审批工作台',
    subtitle: '集中查看待审申请、风险项和 AI 预审依据',
    defaultPrompt: '查看待审批的 80 人 AI 分享会申请，重点检查外校嘉宾、设备和场地冲突。',
    tips: ['AI 只做预审和摘要，不自动通过高风险活动', '风险项、材料清单和数据来源集中展示', '老师可通过、退回补充或调整场地'],
    sideMode: 'teacher'
  },
  管理员: {
    role: '管理员',
    mode: 'admin_operations',
    title: '管理员调度看板',
    subtitle: '处理空间冲突、查看利用率并生成运营建议',
    defaultPrompt: '本周哪些空间冲突最多？为什么？给我一份下周优化建议。',
    tips: ['按冲突次数和影响范围排序', '展示替代空间和下周开放建议', '面向教务、场馆和学工管理复盘'],
    sideMode: 'admin'
  }
};

roleViews.审批老师 = roleViews.老师;

export function getRoleView(role) {
  return roleViews[role] || roleViews.学生;
}

export const presentationModes = {
  '3min': {
    id: '3min',
    label: '3 分钟演示',
    subtitle: '按答辩主线快速跑完四个角色',
    steps: [
      {
        role: '学生',
        title: '一句话找空间',
        prompt: roleViews.学生.defaultPrompt,
        talkingPoint: '先展示自然语言入口和可解释推荐。'
      },
      {
        role: '社团负责人',
        title: '生成活动申请',
        prompt: roleViews.社团负责人.defaultPrompt,
        talkingPoint: '再展示场地匹配、字段生成和风险预审。'
      },
      {
        role: '老师',
        title: '人工审批兜底',
        prompt: roleViews.老师.defaultPrompt,
        talkingPoint: '强调 AI 不自动批准高风险活动。'
      },
      {
        role: '管理员',
        title: '运营复盘',
        prompt: roleViews.管理员.defaultPrompt,
        talkingPoint: '最后用指标和周报说明 ToB 价值。'
      }
    ]
  },
  '10min': {
    id: '10min',
    label: '10 分钟演示',
    subtitle: '适合完整路演，保留更多解释空间',
    steps: [
      {
        role: '学生',
        title: '痛点切入',
        prompt: roleViews.学生.defaultPrompt,
        talkingPoint: '从学生找不到合适空间的日常场景切入。'
      },
      {
        role: '社团负责人',
        title: '申请预审',
        prompt: roleViews.社团负责人.defaultPrompt,
        talkingPoint: '展示申请字段、推荐依据、风险项和材料要求。'
      },
      {
        role: '老师',
        title: '审批工作台',
        prompt: roleViews.老师.defaultPrompt,
        talkingPoint: '说明老师看到的是可追溯摘要，不是黑盒结论。'
      },
      {
        role: '管理员',
        title: '调度看板',
        prompt: roleViews.管理员.defaultPrompt,
        talkingPoint: '展示冲突排行、备选空间和设备维护建议。'
      },
      {
        role: '管理员',
        title: '试点验收',
        prompt: roleViews.管理员.defaultPrompt,
        talkingPoint: '收口到 4-6 周试点和基线对比指标。'
      }
    ]
  }
};

export function getPresentationMode(mode = '3min') {
  return presentationModes[mode] || presentationModes['3min'];
}

export function buildWorkflowSteps(parsed) {
  const intentName = {
    space_search: '空间查询',
    event_application: '活动申请',
    operations_summary: '运营问数'
  }[parsed.intent] || '空间查询';
  const capacityText = parsed.capacity ? `${parsed.capacity} 人` : '当前问题';
  const equipmentText = parsed.equipment?.length ? displayEquipment(parsed.equipment) : '基础条件';
  const riskText = parsed.externalGuests || (parsed.capacity || 0) > 50 ? '中高风险动作进入人工确认' : '低风险动作仍保留人工确认入口';

  return [
    {
      title: '理解需求',
      detail: `${intentName} · ${capacityText} · ${equipmentText}`
    },
    {
      title: '查询数据',
      detail: '读取空间表、课表、预约表、设备状态和审批规则'
    },
    {
      title: '规则过滤',
      detail: '按容量、时间、设备、冲突和权限过滤候选空间'
    },
    {
      title: '人工确认',
      detail: `${riskText}，AI 只生成建议和依据`
    }
  ];
}

export function applyDemoAction(metrics, action) {
  const next = { ...metrics };

  if (action === 'approved') {
    next.pendingApprovals = Math.max(0, next.pendingApprovals - 1);
    next.firstPassRate = Math.min(99, next.firstPassRate + 1);
    next.recommendationAdoption = Math.min(99, next.recommendationAdoption + 2);
    next.conflictCount = Math.max(0, next.conflictCount - 1);
  }

  if (action === 'returned') {
    next.firstPassRate = Math.max(0, next.firstPassRate - 1);
  }

  if (action === 'rescheduled') {
    next.conflictCount = Math.max(0, next.conflictCount - 2);
    next.recommendationAdoption = Math.min(99, next.recommendationAdoption + 1);
  }

  if (action === 'reserved') {
    next.recommendationAdoption = Math.min(99, next.recommendationAdoption + 1);
  }

  return next;
}

export function displayEquipment(items) {
  return items.map((item) => equipmentNames[item] || item).join('、');
}

export function displayLocation(value) {
  return locationNames[value] || value;
}

export function parseDemoIntent(input) {
  if (/冲突|周报|运营|利用率/.test(input)) {
    return {
      intent: 'operations_summary',
      question: input
    };
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

export function recommendSpaces(query, data) {
  const recommendations = [];
  const unavailable = [];

  for (const space of data.spaces) {
    const unavailableReasons = getUnavailableReasons(space, query, data);
    const item = {
      ...space,
      availability: unavailableReasons.length ? 'unavailable' : 'available',
      unavailableReasons,
      unavailableRank: rankUnavailable(space, query, unavailableReasons)
    };

    if (unavailableReasons.length) {
      unavailable.push(item);
    } else {
      const scored = {
        ...item,
        score: scoreSpace(space, query),
        reasons: explainSpace(space, query),
        dataSources: ['space_basic', 'course_schedule', 'reservations', 'maintenance_ticket']
      };
      recommendations.push(scored);
    }
  }

  recommendations.sort((left, right) => right.score - left.score);
  unavailable.sort((left, right) => right.unavailableRank - left.unavailableRank);

  return {
    recommendations: recommendations.slice(0, 3),
    unavailable
  };
}

function rankUnavailable(space, query, reasons) {
  let rank = 0;
  if (query.preferredTypes?.includes(space.type)) rank += 30;
  if (space.capacity >= query.capacity) rank += 20;
  if (query.equipment.every((item) => space.equipment.includes(item))) rank += 20;
  if (reasons.some((reason) => reason.includes('课程冲突'))) rank += 25;
  if (reasons.some((reason) => reason.includes('预约冲突'))) rank += 15;
  return rank;
}

function getUnavailableReasons(space, query, data) {
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

  const courseConflict = data.schedules.find((schedule) =>
    schedule.spaceId === space.id &&
    schedule.date === query.date &&
    overlaps(schedule.start, schedule.end, query.start, query.end)
  );
  if (courseConflict) {
    reasons.push(`课程冲突：${courseConflict.label} ${courseConflict.start}-${courseConflict.end}`);
  }

  const reservationConflict = data.reservations.find((reservation) =>
    reservation.spaceId === space.id &&
    reservation.date === query.date &&
    reservation.status === 'approved' &&
    overlaps(reservation.start, reservation.end, query.start, query.end)
  );
  if (reservationConflict) {
    reasons.push(`预约冲突：${reservation.label} ${reservation.start}-${reservation.end}`);
  }

  const blockingTicket = data.tickets.find((ticket) =>
    ticket.spaceId === space.id && ticket.status !== 'resolved' && ticket.impact === 'blocking'
  );
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
  } else if (query.preferredTypes?.includes(space.type)) {
    score += 6;
  }

  score += Math.max(0, Math.round((100 - space.occupancyRate) * 0.1));
  score += Math.round((space.satisfaction || 80) * 0.05);

  return Math.min(100, score);
}

function explainSpace(space, query) {
  const reasons = [
    '当前时段无课程和已通过预约冲突',
    `容量 ${space.capacity} 人，满足 ${query.capacity} 人需求`
  ];

  if (query.equipment.length) {
    reasons.push(`设备匹配：${displayEquipment(query.equipment)}`);
  }

  reasons.push(`位置标签：${displayLocation(space.locationTag)}`);
  reasons.push(`预计占用率 ${space.occupancyRate}%`);
  return reasons;
}

export function assessEventRisk(application) {
  const items = [];
  const approvers = new Set(['场地管理员']);

  if (application.capacity > 50) {
    items.push({
      level: 'medium',
      item: '人数超过 50',
      action: '需要辅导员审批'
    });
    approvers.add('辅导员');
  }

  if (application.externalGuests) {
    items.push({
      level: 'medium',
      item: '存在外校嘉宾',
      action: '上传外校嘉宾名单'
    });
    approvers.add('辅导员');
  }

  if (application.equipment?.some((item) => item === 'microphone' || item === 'speaker')) {
    items.push({
      level: 'low',
      item: '使用扩音设备',
      action: '提前确认设备状态'
    });
  }

  if (application.selectedSpaceType === 'auditorium') {
    items.push({
      level: 'low',
      item: '使用报告厅',
      action: '需要场地管理员确认'
    });
  }

  if (application.end && timeToMinutes(application.end) > timeToMinutes('21:30')) {
    items.push({
      level: 'high',
      item: '活动结束晚于 21:30',
      action: '确认安保或延时开放'
    });
    approvers.add('安保负责人');
  }

  const level = items.some((item) => item.level === 'high')
    ? 'high'
    : items.some((item) => item.level === 'medium')
      ? 'medium'
      : 'low';

  return {
    level,
    items,
    approvers: Array.from(approvers)
  };
}

export function summarizeOperations() {
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
    weeklyBrief:
      '本周试点空间整体利用率为 68%，较上周提升 6 个百分点。冲突主要集中在周三和周五 19:00-21:00，中型活动空间供给不足。建议下周将综合楼 301 设置为中型活动备选空间，并优先确认投影和移动麦克风设备状态。',
    actions: [
      '周三、周五 19:00-21:00 开放综合楼 301 作为中型活动备选。',
      '将外校嘉宾名单设置为活动申请必填材料。',
      '对 50 人以上讲座自动提示辅导员审批。',
      '优先检查学生活动中心 201 和综合楼 301 的麦克风设备。'
    ]
  };
}
