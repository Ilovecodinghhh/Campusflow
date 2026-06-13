import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyDemoAction,
  assessEventRisk,
  buildWorkflowSteps,
  getRoleView,
  getPresentationMode,
  parseDemoIntent,
  recommendSpaces,
  summarizeOperations
} from '../src/engine.js';

const spaces = [
  {
    id: 'B203',
    name: '教学楼 B203',
    type: 'discussion',
    capacity: 12,
    equipment: ['power_socket', 'whiteboard'],
    locationTag: 'east_gate',
    openStart: '08:00',
    openEnd: '22:00',
    occupancyRate: 35,
    satisfaction: 92
  },
  {
    id: 'A102',
    name: '教学楼 A102 阶梯教室',
    type: 'lecture_hall',
    capacity: 120,
    equipment: ['projector', 'microphone'],
    locationTag: 'main_teaching',
    openStart: '08:00',
    openEnd: '22:00',
    occupancyRate: 70,
    satisfaction: 78
  },
  {
    id: 'S201',
    name: '学生活动中心 201 报告厅',
    type: 'auditorium',
    capacity: 100,
    equipment: ['projector', 'microphone', 'speaker'],
    locationTag: 'activity_center',
    openStart: '09:00',
    openEnd: '21:30',
    occupancyRate: 62,
    satisfaction: 88
  }
];

const schedules = [
  {
    spaceId: 'A102',
    date: 'friday',
    start: '19:00',
    end: '21:00',
    label: '大学英语课程'
  }
];

const reservations = [];
const tickets = [];

test('parseDemoIntent extracts a space search request', () => {
  const result = parseDemoIntent('今晚 7 点后，找一个离东门近、适合 4 人讨论、有插座的地方。');

  assert.equal(result.intent, 'space_search');
  assert.equal(result.capacity, 4);
  assert.equal(result.date, 'today');
  assert.equal(result.start, '19:00');
  assert.deepEqual(result.equipment, ['power_socket']);
});

test('recommendSpaces filters conflicts and ranks matching spaces first', () => {
  const result = recommendSpaces(
    {
      intent: 'event_application',
      date: 'friday',
      start: '19:00',
      end: '21:30',
      capacity: 80,
      equipment: ['projector', 'microphone'],
      preferredTypes: ['auditorium', 'lecture_hall']
    },
    { spaces, schedules, reservations, tickets }
  );

  assert.equal(result.recommendations[0].id, 'S201');
  assert.equal(result.recommendations[0].availability, 'available');
  assert.equal(result.unavailable[0].id, 'A102');
  assert.match(result.unavailable[0].unavailableReasons.join(' '), /课程冲突/);
});

test('assessEventRisk requires approval and guest list for medium risk events', () => {
  const risk = assessEventRisk({
    capacity: 80,
    externalGuests: true,
    end: '21:30',
    equipment: ['projector', 'microphone'],
    selectedSpaceType: 'auditorium'
  });

  assert.equal(risk.level, 'medium');
  assert.ok(risk.items.some((item) => item.action === '需要辅导员审批'));
  assert.ok(risk.items.some((item) => item.action === '上传外校嘉宾名单'));
  assert.ok(risk.approvers.includes('辅导员'));
});

test('summarizeOperations returns conflict ranking and weekly advice', () => {
  const summary = summarizeOperations();

  assert.equal(summary.conflicts[0].spaceName, '学生活动中心 201');
  assert.ok(summary.weeklyBrief.includes('整体利用率'));
  assert.ok(summary.actions.length >= 3);
});

test('getRoleView maps each role to a distinct default workspace', () => {
  assert.deepEqual(
    ['学生', '老师', '社团负责人', '管理员'].map((role) => getRoleView(role).mode),
    ['space_search', 'teacher_review', 'event_application', 'admin_operations']
  );

  assert.match(getRoleView('学生').defaultPrompt, /讨论/);
  assert.match(getRoleView('社团负责人').defaultPrompt, /AI 分享会/);
  assert.match(getRoleView('老师').title, /审批/);
  assert.equal(getRoleView('审批老师').mode, 'teacher_review');
  assert.match(getRoleView('管理员').defaultPrompt, /冲突/);
});

test('getPresentationMode returns ordered steps for defense walkthroughs', () => {
  const mode = getPresentationMode('3min');

  assert.equal(mode.label, '3 分钟演示');
  assert.deepEqual(
    mode.steps.map((step) => step.role),
    ['学生', '社团负责人', '老师', '管理员']
  );
  assert.ok(mode.steps.every((step) => step.prompt.length > 0));
});

test('buildWorkflowSteps explains the AI flow without exposing raw JSON first', () => {
  const steps = buildWorkflowSteps({
    intent: 'event_application',
    capacity: 80,
    equipment: ['projector', 'microphone'],
    externalGuests: true
  });

  assert.deepEqual(
    steps.map((step) => step.title),
    ['理解需求', '查询数据', '规则过滤', '人工确认']
  );
  assert.match(steps[0].detail, /80 人/);
  assert.match(steps[1].detail, /空间表/);
  assert.match(steps[3].detail, /高风险/);
});

test('applyDemoAction updates demo metrics after visible operations', () => {
  const metrics = applyDemoAction(
    {
      pendingApprovals: 7,
      firstPassRate: 74,
      recommendationAdoption: 63,
      conflictCount: 23
    },
    'approved'
  );

  assert.equal(metrics.pendingApprovals, 6);
  assert.equal(metrics.firstPassRate, 75);
  assert.equal(metrics.recommendationAdoption, 65);
  assert.equal(metrics.conflictCount, 22);
});
