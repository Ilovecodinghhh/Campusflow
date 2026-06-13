from campusflow.db import loads, row_to_space


EQUIPMENT_NAMES = {
    "power_socket": "插座",
    "whiteboard": "白板",
    "projector": "投影",
    "microphone": "麦克风",
    "speaker": "音响",
    "screen": "电子屏",
}

LOCATION_NAMES = {
    "east_gate": "东门近",
    "library": "图书馆",
    "innovation_center": "东区中部",
    "main_teaching": "主教学区",
    "activity_center": "活动中心",
    "central_building": "综合楼",
}


def time_to_minutes(value):
    hours, minutes = [int(part) for part in value.split(":")]
    return hours * 60 + minutes


def overlaps(left_start, left_end, right_start, right_end):
    return time_to_minutes(left_start) < time_to_minutes(right_end) and time_to_minutes(right_start) < time_to_minutes(left_end)


def display_equipment(items):
    return "、".join(EQUIPMENT_NAMES.get(item, item) for item in items)


def display_location(value):
    return LOCATION_NAMES.get(value, value)


def parse_intent(input_text):
    if any(token in input_text for token in ["冲突", "周报", "运营", "利用率"]):
        return {
            "intent": "operations_summary",
            "confidence": 0.9,
            "missing_fields": [],
            "parameters": {"question": input_text},
        }

    if any(token in input_text for token in ["分享会", "讲座", "活动", "社团", "外校", "嘉宾"]):
        return {
            "intent": "event_application",
            "confidence": 0.91,
            "missing_fields": [],
            "parameters": {
                "event_name": "AI 分享会" if "AI" in input_text else "社团活动",
                "event_type": "lecture" if ("讲座" in input_text or "分享会" in input_text) else "activity",
                "date": "friday" if "周五" in input_text else "today",
                "start": "19:00" if ("7 点" in input_text or "19" in input_text) else "18:00",
                "end": "21:30",
                "capacity": extract_capacity(input_text, 80),
                "equipment": extract_equipment(input_text),
                "external_guests": "外校" in input_text or "嘉宾" in input_text,
                "external_guest_count": 5 if "5" in input_text else 0,
                "preferred_types": ["auditorium", "lecture_hall", "activity_room"],
            },
        }

    return {
        "intent": "space_search",
        "confidence": 0.88,
        "missing_fields": [],
        "parameters": {
            "date": "friday" if "周五" in input_text else "today",
            "start": "19:00" if ("7 点" in input_text or "19" in input_text) else "18:00",
            "end": "22:00",
            "capacity": extract_capacity(input_text, 4),
            "space_type": "discussion" if ("讨论" in input_text or "小组" in input_text) else "study",
            "equipment": extract_equipment(input_text),
            "location_preference": "east_gate" if "东门" in input_text else "",
            "quiet_preference": "quiet" if "安静" in input_text else "normal",
            "preferred_types": ["discussion", "study_room", "maker_space"],
        },
    }


def extract_capacity(input_text, fallback):
    import re

    match = re.search(r"(\d+)\s*人", input_text)
    return int(match.group(1)) if match else fallback


def extract_equipment(input_text):
    equipment = []
    if "插座" in input_text or "电源" in input_text:
        equipment.append("power_socket")
    if "白板" in input_text:
        equipment.append("whiteboard")
    if "投影" in input_text:
        equipment.append("projector")
    if "麦克风" in input_text or "话筒" in input_text:
        equipment.append("microphone")
    if "音响" in input_text:
        equipment.append("speaker")
    return equipment


def recommend_spaces(conn, query, user_context):
    scope = set(user_context.get("permission_scope", []))
    spaces = [row_to_space(row) for row in conn.execute("select * from spaces").fetchall()]
    recommendations = []
    unavailable = []

    for space in spaces:
        if scope and space["permission_scope"] not in scope:
            unavailable.append(to_unavailable(space, ["用户无该空间权限"], query))
            continue

        reasons = get_unavailable_reasons(conn, space, query)
        if reasons:
            unavailable.append(to_unavailable(space, reasons, query))
            continue

        score = score_space(space, query)
        recommendations.append(
            {
                "space_id": space["space_id"],
                "space_name": space["name"],
                "short_name": space["short_name"],
                "type": space["type"],
                "type_name": space["type_name"],
                "capacity": space["capacity"],
                "equipment": space["equipment"],
                "location_tag": space["location_tag"],
                "open_start": space["open_start"],
                "open_end": space["open_end"],
                "occupancy_rate": space["occupancy_rate"],
                "score": score,
                "reasons": explain_space(space, query),
                "data_sources": ["space_basic", "course_schedule", "reservations", "maintenance_ticket"],
            }
        )

    recommendations.sort(key=lambda item: item["score"], reverse=True)
    unavailable.sort(key=lambda item: item["rank"], reverse=True)
    return {"recommendations": recommendations[:3], "unavailable": unavailable}


def to_unavailable(space, reasons, query):
    return {
        "space_id": space["space_id"],
        "space_name": space["name"],
        "short_name": space["short_name"],
        "type": space["type"],
        "capacity": space["capacity"],
        "equipment": space["equipment"],
        "reasons": reasons,
        "rank": rank_unavailable(space, query, reasons),
    }


def rank_unavailable(space, query, reasons):
    rank = 0
    if space["type"] in query.get("preferred_types", []):
        rank += 30
    if space["capacity"] >= query.get("capacity", 0):
        rank += 20
    if all(item in space["equipment"] for item in query.get("equipment", [])):
        rank += 20
    if any("课程冲突" in reason for reason in reasons):
        rank += 25
    if any("预约冲突" in reason for reason in reasons):
        rank += 15
    return rank


def get_unavailable_reasons(conn, space, query):
    reasons = []
    if time_to_minutes(query["start"]) < time_to_minutes(space["open_start"]) or time_to_minutes(query["end"]) > time_to_minutes(space["open_end"]):
        reasons.append(f"开放时间为 {space['open_start']}-{space['open_end']}")
    if space["capacity"] < query.get("capacity", 0):
        reasons.append(f"容量 {space['capacity']} 人，不足 {query.get('capacity', 0)} 人")

    missing = [item for item in query.get("equipment", []) if item not in space["equipment"]]
    if missing:
        reasons.append(f"缺少{display_equipment(missing)}")

    for row in conn.execute("select * from course_schedule where space_id = ? and date_key = ?", (space["space_id"], query["date"])):
        if overlaps(row["start_time"], row["end_time"], query["start"], query["end"]):
            reasons.append(f"课程冲突：{row['label']} {row['start_time']}-{row['end_time']}")

    for row in conn.execute("select * from reservations where space_id = ? and date_key = ? and status = 'approved'", (space["space_id"], query["date"])):
        if overlaps(row["start_time"], row["end_time"], query["start"], query["end"]):
            reasons.append(f"预约冲突：{row['label']} {row['start_time']}-{row['end_time']}")

    for row in conn.execute("select * from maintenance_ticket where space_id = ? and status != 'resolved' and impact_level = 'blocking'", (space["space_id"],)):
        reasons.append(f"设备不可用：{row['equipment_name']}")
    return reasons


def score_space(space, query):
    score = 40
    capacity_ratio = query.get("capacity", 1) / space["capacity"]
    if 0.65 < capacity_ratio <= 1:
        score += 20
    elif capacity_ratio > 0.25:
        score += 16
    else:
        score += 10

    equipment = query.get("equipment", [])
    equipment_score = len([item for item in equipment if item in space["equipment"]]) / len(equipment) if equipment else 1
    score += round(equipment_score * 15)

    if query.get("location_preference") and space["location_tag"] == query.get("location_preference"):
        score += 10
    elif space["type"] in query.get("preferred_types", []):
        score += 6

    score += max(0, round((100 - space["occupancy_rate"]) * 0.1))
    score += round((space["satisfaction"] or 80) * 0.05)
    return min(100, score)


def explain_space(space, query):
    reasons = [
        "当前时段无课程和已通过预约冲突",
        f"容量 {space['capacity']} 人，满足 {query.get('capacity', 0)} 人需求",
    ]
    if query.get("equipment"):
        reasons.append(f"设备匹配：{display_equipment(query['equipment'])}")
    reasons.append(f"位置标签：{display_location(space['location_tag'])}")
    reasons.append(f"预计占用率 {space['occupancy_rate']}%")
    return reasons


def assess_event_risk(application):
    items = []
    approvers = {"场地管理员"}

    if application.get("capacity", 0) > 50:
        items.append({"level": "medium", "item": "人数超过 50", "action": "需要辅导员审批"})
        approvers.add("辅导员")
    if application.get("external_guests"):
        items.append({"level": "medium", "item": "存在外校嘉宾", "action": "上传外校嘉宾名单"})
        approvers.add("辅导员")
    if any(item in ["microphone", "speaker"] for item in application.get("equipment", [])):
        items.append({"level": "low", "item": "使用扩音设备", "action": "提前确认设备状态"})
    if application.get("selected_space_type") == "auditorium":
        items.append({"level": "low", "item": "使用报告厅", "action": "需要场地管理员确认"})
    if application.get("end") and time_to_minutes(application["end"]) > time_to_minutes("21:30"):
        items.append({"level": "high", "item": "活动结束晚于 21:30", "action": "确认安保或延时开放"})
        approvers.add("安保负责人")

    level = "high" if any(item["level"] == "high" for item in items) else "medium" if any(item["level"] == "medium" for item in items) else "low"
    return {"level": level, "items": items, "approvers": sorted(approvers), "must_manual_review": level in ["medium", "high"]}


def build_workflow_steps(parsed):
    parameters = parsed.get("parameters", parsed)
    intent_name = {
        "space_search": "空间查询",
        "event_application": "活动申请",
        "operations_summary": "运营问数",
    }.get(parsed.get("intent"), "空间查询")
    capacity_text = f"{parameters.get('capacity')} 人" if parameters.get("capacity") else "当前问题"
    equipment_text = display_equipment(parameters.get("equipment", [])) if parameters.get("equipment") else "基础条件"
    risk_text = "中高风险动作进入人工确认" if parameters.get("external_guests") or parameters.get("capacity", 0) > 50 else "低风险动作仍保留人工确认入口"
    return [
        {"title": "理解需求", "detail": f"{intent_name} · {capacity_text} · {equipment_text}"},
        {"title": "查询数据", "detail": "读取空间表、课表、预约表、设备状态和审批规则"},
        {"title": "规则过滤", "detail": "按容量、时间、设备、冲突和权限过滤候选空间"},
        {"title": "人工确认", "detail": f"{risk_text}，AI 只生成建议和依据"},
    ]
