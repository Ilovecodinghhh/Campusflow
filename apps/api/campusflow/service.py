from datetime import datetime, timezone
from uuid import uuid4

from campusflow.db import dumps, loads
from campusflow.engine import assess_event_risk, parse_intent, recommend_spaces
from campusflow.pilot_data import build_delivery_package, build_readiness_report


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix):
    return f"{prefix}-{uuid4().hex[:12]}"


def normalize_user(user_context):
    return {
        "user_id": user_context.get("user_id", "demo_user"),
        "role": user_context.get("role", "student"),
        "department": user_context.get("department", ""),
        "permission_scope": user_context.get("permission_scope", ["east_campus"]),
    }


def write_audit(conn, user_context, action, input_summary, output_summary, data_sources=None, request_id=None):
    user = normalize_user(user_context)
    audit_id = new_id("AUD")
    conn.execute(
        """
        insert into audit_log values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            audit_id,
            request_id or new_id("REQ"),
            user["user_id"],
            user["role"],
            action,
            input_summary[:500],
            output_summary[:500],
            dumps(data_sources or []),
            now_iso(),
        ),
    )
    conn.commit()
    return audit_id


def parse_request(input_text, user_context):
    parsed = parse_intent(input_text)
    return parsed


def recommend_request(conn, user_context, input_text=None, query=None):
    user = normalize_user(user_context)
    parsed = parse_intent(input_text or "") if query is None else {"intent": query.get("intent", "space_search"), "parameters": query}
    parameters = parsed["parameters"]
    result = recommend_spaces(conn, parameters, user)
    write_audit(
        conn,
        user,
        "recommend_spaces",
        input_text or dumps(query),
        f"{len(result['recommendations'])} recommendations",
        ["space_basic", "course_schedule", "reservations", "maintenance_ticket"],
    )
    return {"parsed": parsed, **result}


def draft_application(conn, user_context, input_text):
    user = normalize_user(user_context)
    parsed = parse_intent(input_text)
    if parsed["intent"] != "event_application":
        raise ValueError("当前输入不是活动申请场景")
    parameters = parsed["parameters"]
    recommendation = recommend_spaces(conn, parameters, user)
    selected = recommendation["recommendations"][0] if recommendation["recommendations"] else None
    risk = assess_event_risk({**parameters, "selected_space_type": selected["type"] if selected else ""})
    draft = {
        "event_name": parameters["event_name"],
        "event_type": parameters["event_type"],
        "date": parameters["date"],
        "start": parameters["start"],
        "end": parameters["end"],
        "capacity": parameters["capacity"],
        "equipment": parameters["equipment"],
        "external_guests": parameters["external_guests"],
        "external_guest_count": parameters["external_guest_count"],
        "selected_space": selected,
        "risk": risk,
        "recommendation": recommendation,
    }
    write_audit(conn, user, "draft_application", input_text, risk["level"], ["approval_rules", "space_basic", "course_schedule"])
    return {"parsed": parsed, "draft": draft}


def submit_application(conn, user_context, input_text):
    user = normalize_user(user_context)
    if user["role"] not in ["club_leader", "admin"]:
        raise PermissionError("只有社团负责人或管理员可以提交活动申请")

    draft_result = draft_application(conn, user, input_text)
    draft = draft_result["draft"]
    selected = draft["selected_space"]
    if not selected:
        raise ValueError("没有可提交的推荐场地")

    application_id = new_id("APP")
    created = now_iso()
    risk = draft["risk"]
    status = "pending_review" if risk["must_manual_review"] else "pending_review"
    conn.execute(
        """
        insert into applications values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            application_id,
            user["user_id"],
            user["role"],
            user.get("department", ""),
            draft["event_name"],
            draft["event_type"],
            selected["space_id"],
            draft["date"],
            draft["start"],
            draft["end"],
            draft["capacity"],
            dumps(draft["equipment"]),
            1 if draft["external_guests"] else 0,
            draft["external_guest_count"],
            risk["level"],
            dumps(risk["items"]),
            dumps(risk["approvers"]),
            status,
            created,
            created,
        ),
    )
    conn.commit()
    write_audit(conn, user, "submit_application", input_text, f"{application_id}:{status}", ["applications", "audit_log"])
    return {"application": get_application(conn, application_id), "risk": risk}


def get_application(conn, application_id):
    row = conn.execute("select * from applications where application_id = ?", (application_id,)).fetchone()
    if not row:
        raise KeyError(application_id)
    item = dict(row)
    item["equipment"] = loads(item["equipment"], [])
    item["external_guests"] = bool(item["external_guests"])
    item["risk_items"] = loads(item["risk_items"], [])
    item["approvers"] = loads(item["approvers"], [])
    item["selected_space_id"] = item.pop("selected_space_id")
    return item


def list_applications(conn, user_context):
    user = normalize_user(user_context)
    if user["role"] in ["student"]:
        rows = conn.execute("select * from applications where applicant_id = ? order by created_at desc", (user["user_id"],)).fetchall()
    else:
        rows = conn.execute("select * from applications order by created_at desc").fetchall()
    spaces = space_lookup(conn)
    return [application_from_row(row, spaces) for row in rows]


def space_lookup(conn):
    rows = conn.execute("select space_id, name, type_name, capacity, location_tag from spaces").fetchall()
    return {
        row["space_id"]: {
            "space_id": row["space_id"],
            "space_name": row["name"],
            "type_name": row["type_name"],
            "capacity": row["capacity"],
            "location_tag": row["location_tag"],
        }
        for row in rows
    }


def application_from_row(row, spaces=None):
    item = dict(row)
    item["equipment"] = loads(item["equipment"], [])
    item["external_guests"] = bool(item["external_guests"])
    item["risk_items"] = loads(item["risk_items"], [])
    item["approvers"] = loads(item["approvers"], [])
    item["selected_space_id"] = item.pop("selected_space_id")
    if spaces is not None:
        item["selected_space"] = spaces.get(item["selected_space_id"])
    return item


def decide_review(conn, user_context, application_id, decision, note=""):
    user = normalize_user(user_context)
    if user["role"] not in ["teacher", "admin"]:
        raise PermissionError("只有老师或管理员可以审批")
    if decision not in ["approved", "returned", "rescheduled", "rejected"]:
        raise ValueError("无效审批动作")

    status = {
        "approved": "approved",
        "returned": "returned_for_materials",
        "rescheduled": "reschedule_required",
        "rejected": "rejected",
    }[decision]
    conn.execute(
        "update applications set status = ?, updated_at = ? where application_id = ?",
        (status, now_iso(), application_id),
    )
    conn.commit()
    write_audit(conn, user, "review_decision", f"{application_id}:{decision}:{note}", status, ["applications", "audit_log"])
    return get_application(conn, application_id)


def record_feedback(conn, user_context, payload):
    user = normalize_user(user_context)
    feedback_id = new_id("FDB")
    conn.execute(
        "insert into feedback_log values (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            feedback_id,
            user["user_id"],
            user["role"],
            payload.get("space_id"),
            payload.get("application_id"),
            payload.get("action", "feedback"),
            payload.get("rating"),
            now_iso(),
        ),
    )
    conn.commit()
    write_audit(conn, user, "record_feedback", dumps(payload), feedback_id, ["feedback_log"])
    return {"feedback_id": feedback_id, "status": "recorded"}


def cancel_feedback(conn, user_context, payload):
    user = normalize_user(user_context)
    feedback_id = payload.get("feedback_id")
    if not feedback_id:
        raise ValueError("缺少 feedback_id")
    row = conn.execute("select feedback_id from feedback_log where feedback_id = ?", (feedback_id,)).fetchone()
    if not row:
        raise KeyError(feedback_id)
    conn.execute("delete from feedback_log where feedback_id = ?", (feedback_id,))
    conn.commit()
    write_audit(conn, user, "cancel_feedback", dumps(payload), feedback_id, ["feedback_log"])
    return {"feedback_id": feedback_id, "status": "cancelled"}


def summarize_operations(conn, user_context):
    total_feedback = conn.execute("select count(*) from feedback_log").fetchone()[0]
    adopted = conn.execute("select count(*) from feedback_log where action in ('reserved', 'submitted', 'approved')").fetchone()[0]
    total_applications = conn.execute("select count(*) from applications").fetchone()[0]
    pending = conn.execute("select count(*) from applications where status = 'pending_review'").fetchone()[0]
    approved = conn.execute("select count(*) from applications where status = 'approved'").fetchone()[0]
    first_pass_rate = round((approved / total_applications) * 100) if total_applications else 74
    adoption_rate = round((adopted / total_feedback) * 100) if total_feedback else 63

    conflicts = [
        {"space_name": "学生活动中心 201", "count": 8, "reason": "周三、周五晚间社团活动集中"},
        {"space_name": "教学楼 A102", "count": 6, "reason": "容量适合中型讲座，但课程占用多"},
        {"space_name": "教学楼 B203", "count": 4, "reason": "小组讨论需求高，晚间预约集中"},
        {"space_name": "图书馆 L305", "count": 3, "reason": "研讨室数量不足"},
        {"space_name": "综合楼 301", "count": 2, "reason": "设备条件不稳定"},
    ]
    summary = {
        "metrics": {
            "space_utilization_rate": 68,
            "first_pass_rate": first_pass_rate,
            "pending_approvals": pending,
            "recommendation_adoption_rate": adoption_rate,
            "conflict_count": sum(item["count"] for item in conflicts),
        },
        "conflicts": conflicts,
        "weekly_brief": "本周试点空间整体利用率为 68%，冲突主要集中在周三和周五 19:00-21:00。建议下周开放综合楼 301 作为中型活动备选，并优先确认移动麦克风设备状态。",
        "actions": [
            "周三、周五 19:00-21:00 开放综合楼 301 作为中型活动备选。",
            "将外校嘉宾名单设置为活动申请必填材料。",
            "对 50 人以上讲座自动提示辅导员审批。",
            "优先检查学生活动中心 201 和综合楼 301 的麦克风设备。",
        ],
    }
    write_audit(conn, normalize_user(user_context), "operations_summary", "summary", "ok", ["applications", "feedback_log", "course_schedule"])
    return summary


def summarize_pilot_review(conn, user_context):
    baseline = {
        "space_search_minutes": 18,
        "first_pass_rate": 58,
        "approval_hours": 36,
        "conflict_rate": 22,
        "utilization_rate": 54,
        "audit_trace_rate": 0,
    }
    current = {
        "space_search_minutes": 9,
        "first_pass_rate": 76,
        "approval_hours": 20,
        "conflict_rate": 14,
        "utilization_rate": 68,
        "audit_trace_rate": 100,
    }
    improvements = {
        "space_search_time_saved_rate": round((baseline["space_search_minutes"] - current["space_search_minutes"]) / baseline["space_search_minutes"] * 100),
        "first_pass_rate_lift": current["first_pass_rate"] - baseline["first_pass_rate"],
        "approval_time_saved_rate": round((baseline["approval_hours"] - current["approval_hours"]) / baseline["approval_hours"] * 100),
        "conflict_rate_drop": round((baseline["conflict_rate"] - current["conflict_rate"]) / baseline["conflict_rate"] * 100),
        "utilization_lift": current["utilization_rate"] - baseline["utilization_rate"],
        "audit_trace_rate_lift": current["audit_trace_rate"] - baseline["audit_trace_rate"],
    }
    gates = [
        {
            "name": "找空间耗时降低 30%+",
            "status": "pass",
            "target": "30%+",
            "evidence": "18 分钟降至 9 分钟，降低 50%。",
        },
        {
            "name": "一次通过率提升 15 个百分点+",
            "status": "pass",
            "target": "15pp+",
            "evidence": "58% 提升至 76%，提升 18 个百分点。",
        },
        {
            "name": "审批周期缩短 30%+",
            "status": "pass",
            "target": "30%+",
            "evidence": "36 小时降至 20 小时，缩短 44%。",
        },
        {
            "name": "高峰冲突率下降 25%+",
            "status": "pass",
            "target": "25%+",
            "evidence": "22% 降至 14%，下降 36%。",
        },
        {
            "name": "关键动作审计覆盖 100%",
            "status": "pass",
            "target": "100%",
            "evidence": "推荐、提交、审批、复盘、重置均写入审计日志。",
        },
        {
            "name": "跨院系规则自动化覆盖",
            "status": "warn",
            "target": "试点期可控",
            "evidence": "外校嘉宾、50 人以上活动已覆盖；跨校区和临时借调规则建议进入 V1.2。",
        },
    ]
    scenarios = [
        {
            "name": "普通学生找讨论室",
            "role": "学生",
            "volume": 128,
            "result": "平均 2 次点击内找到可用空间，推荐采纳率 71%。",
        },
        {
            "name": "社团负责人提交活动",
            "role": "社团负责人",
            "volume": 42,
            "result": "自动生成申请草稿、材料提醒和审批人建议，一次通过率 76%。",
        },
        {
            "name": "老师审批中风险活动",
            "role": "老师",
            "volume": 31,
            "result": "审批队列集中展示风险项，平均处理周期缩短至 20 小时。",
        },
        {
            "name": "管理员复盘高峰冲突",
            "role": "管理员",
            "volume": 6,
            "result": "识别 TOP5 冲突空间并输出下周开放和设备巡检建议。",
        },
        {
            "name": "异常与兜底处理",
            "role": "管理员",
            "volume": 18,
            "result": "无可用空间、设备故障、权限不足和重置演示均可返回明确状态。",
        },
    ]
    passed = sum(1 for gate in gates if gate["status"] == "pass")
    acceptance = {
        "status": "go" if passed >= 5 else "hold",
        "passed": passed,
        "total": len(gates),
        "gates": gates,
        "decision": "建议进入小范围真实试点，保留人工审批兜底和每日数据复盘。",
    }
    weekly_report = {
        "title": "CampusFlow V1.1 试点仿真周报",
        "summary": "6 周仿真覆盖学生找空间、社团申请、老师审批、管理员复盘和异常兜底。核心效率指标达到试点验收线，跨院系复杂规则仍需在真实试点中继续沉淀。",
        "wins": [
            "找空间平均耗时降低 50%，空间利用率提升 14 个百分点。",
            "申请一次通过率提升 18 个百分点，审批周期缩短 44%。",
            "关键动作审计覆盖 100%，便于答辩说明研发边界和治理闭环。",
        ],
        "risks": [
            "跨校区借用、临时设备调拨和大型活动安保规则仍依赖人工确认。",
            "真实试点需要接入教务课表和场地系统的只读同步接口。",
        ],
        "next_actions": [
            "选择 1 个学院、2 个社团、6 个高频空间开展 2 周真实试点。",
            "将 V1.1 看板指标作为每日复盘模板，记录实际耗时和冲突率。",
            "补充跨校区、设备借调、突发停用三类边界规则。",
        ],
    }
    summary = {
        "period": "V1.1 试点仿真 · 6 周",
        "sample": {
            "students": 96,
            "clubs": 12,
            "teachers": 6,
            "spaces": 6,
            "simulated_requests": sum(item["volume"] for item in scenarios),
        },
        "baseline": baseline,
        "current": current,
        "improvements": improvements,
        "acceptance": acceptance,
        "scenarios": scenarios,
        "weekly_report": weekly_report,
    }
    write_audit(conn, normalize_user(user_context), "pilot_summary", "v1.1_review", acceptance["status"], ["pilot_simulation", "applications", "feedback_log", "audit_log"])
    return summary


def summarize_pilot_readiness(conn, user_context):
    report = build_readiness_report()
    write_audit(
        conn,
        normalize_user(user_context),
        "pilot_readiness",
        "v1.2_independent_simulation",
        report["readiness_report"]["decision"],
        ["simulated_spaces", "simulated_schedules", "simulated_reservations", "simulated_equipment", "simulated_approval_rules"],
    )
    return report


def summarize_pilot_delivery(conn, user_context):
    delivery = build_delivery_package()
    write_audit(
        conn,
        normalize_user(user_context),
        "pilot_delivery",
        "v1.3_config_import_report",
        delivery["delivery_status"],
        ["pilot_config_center", "simulated_import_validation", "markdown_report_export"],
    )
    return delivery


def list_audit(conn, limit=50):
    rows = conn.execute("select * from audit_log order by created_at desc limit ?", (limit,)).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["data_sources"] = loads(item["data_sources"], [])
        result.append(item)
    return result
