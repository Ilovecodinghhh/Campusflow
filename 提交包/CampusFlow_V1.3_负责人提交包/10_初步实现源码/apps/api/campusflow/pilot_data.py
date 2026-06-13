from copy import deepcopy


FORBIDDEN_PRIVACY_FIELDS = {
    "name",
    "real_name",
    "student_id",
    "employee_id",
    "phone",
    "mobile",
    "email",
    "id_card",
    "identity_number",
    "address",
}


SIMULATED_PILOT_DATA = {
    "pilot_config": {
        "organization": "模拟信息学院",
        "campus": "模拟东校区",
        "period": "2 周受控真实试点准备",
        "spaces_in_scope": 8,
        "roles": ["学生", "社团负责人", "老师", "管理员"],
        "success_gates": [
            "模拟数据质量检查通过率 80%+",
            "关键数据集覆盖空间、课表、预约、设备和审批规则",
            "不包含客户真实隐私字段",
            "试点范围、角色和验收指标可说明",
        ],
    },
    "spaces": [
        {"space_id": "SIM-SPACE-001", "space_label": "模拟东区讨论室 101", "building": "模拟教学楼 A", "capacity": 8, "type": "discussion", "equipment": ["power_socket", "whiteboard"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-002", "space_label": "模拟东区讨论室 205", "building": "模拟教学楼 A", "capacity": 12, "type": "discussion", "equipment": ["power_socket", "screen"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-003", "space_label": "模拟活动室 301", "building": "模拟综合楼", "capacity": 60, "type": "activity_room", "equipment": ["projector", "microphone"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-004", "space_label": "模拟报告厅 201", "building": "模拟学生活动中心", "capacity": 120, "type": "auditorium", "equipment": ["projector", "microphone", "speaker"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-005", "space_label": "模拟研讨室 L2", "building": "模拟图书馆", "capacity": 6, "type": "study_room", "equipment": ["power_socket"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-006", "space_label": "模拟创客空间 C1", "building": "模拟创新中心", "capacity": 20, "type": "maker_space", "equipment": ["projector", "power_socket"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-007", "space_label": "模拟阶梯教室 B102", "building": "模拟教学楼 B", "capacity": 90, "type": "lecture_hall", "equipment": ["projector", "microphone"], "permission_scope": "pilot_east"},
        {"space_id": "SIM-SPACE-008", "space_label": "模拟多功能室 Z1", "building": "模拟综合楼", "capacity": 45, "type": "activity_room", "equipment": ["whiteboard", "screen"], "permission_scope": "pilot_east"},
    ],
    "schedules": [
        {"schedule_id": "SIM-SCH-001", "space_id": "SIM-SPACE-001", "date_key": "monday", "start": "09:00", "end": "10:30", "label": "模拟课程占用"},
        {"schedule_id": "SIM-SCH-002", "space_id": "SIM-SPACE-004", "date_key": "wednesday", "start": "14:00", "end": "16:00", "label": "模拟学院讲座"},
        {"schedule_id": "SIM-SCH-003", "space_id": "SIM-SPACE-007", "date_key": "friday", "start": "18:30", "end": "20:30", "label": "模拟公开课"},
    ],
    "reservations": [
        {"reservation_id": "SIM-RES-001", "space_id": "SIM-SPACE-002", "date_key": "monday", "start": "18:30", "end": "20:00", "capacity": 10, "event_type": "study"},
        {"reservation_id": "SIM-RES-002", "space_id": "SIM-SPACE-003", "date_key": "friday", "start": "19:00", "end": "21:00", "capacity": 56, "event_type": "club_event"},
        {"reservation_id": "SIM-RES-003", "space_id": "SIM-SPACE-008", "date_key": "thursday", "start": "17:30", "end": "19:00", "capacity": 38, "event_type": "workshop"},
    ],
    "equipment_status": [
        {"ticket_id": "SIM-EQ-001", "space_id": "SIM-SPACE-003", "equipment": "microphone", "status": "warning", "impact": "需试点前复核"},
        {"ticket_id": "SIM-EQ-002", "space_id": "SIM-SPACE-004", "equipment": "speaker", "status": "ok", "impact": "无"},
        {"ticket_id": "SIM-EQ-003", "space_id": "SIM-SPACE-008", "equipment": "screen", "status": "ok", "impact": "无"},
    ],
    "approval_rules": [
        {"rule_id": "SIM-RULE-001", "condition": "capacity >= 50", "required_approver": "辅导员", "manual_review": True},
        {"rule_id": "SIM-RULE-002", "condition": "external_guests == true", "required_approver": "团委老师", "manual_review": True},
        {"rule_id": "SIM-RULE-003", "condition": "end_time > 21:30", "required_approver": "场地管理员", "manual_review": True},
        {"rule_id": "SIM-RULE-004", "condition": "equipment contains microphone", "required_approver": "设备管理员", "manual_review": False},
    ],
}


def get_simulated_pilot_data():
    return deepcopy(SIMULATED_PILOT_DATA)


def build_readiness_report():
    data = get_simulated_pilot_data()
    quality_checks = [
        check_required_fields(data),
        check_privacy_boundary(data),
        check_time_conflicts(data),
        check_capacity_fit(data),
        check_equipment_status(data),
        check_permission_scope(data),
    ]
    passed = sum(1 for item in quality_checks if item["status"] == "pass")
    warnings = sum(1 for item in quality_checks if item["status"] == "warn")
    score = max(0, min(100, round((passed / len(quality_checks)) * 100 - warnings * 3)))
    decision = "ready_for_controlled_pilot" if score >= 80 and not check_privacy_boundary(data)["forbidden_fields_found"] else "hold"
    return {
        "version": "V1.2",
        "title": "CampusFlow V1.2 试点准备度报告",
        "privacy": {
            "data_mode": "independent_simulation",
            "contains_customer_data": False,
            "statement": "开发阶段仅使用独立模拟数据，不导入客户真实姓名、学号、手机号、邮箱、证件号或地址。",
            "forbidden_fields_found": check_privacy_boundary(data)["forbidden_fields_found"],
        },
        "datasets": summarize_datasets(data),
        "quality_checks": quality_checks,
        "pilot_config": data["pilot_config"],
        "readiness_score": score,
        "readiness_report": {
            "decision": decision,
            "summary": "模拟数据覆盖空间、课表、预约、设备和审批规则，隐私边界通过，可进入受控真实试点准备。",
            "risks": [
                "模拟活动室 301 的麦克风需在真实试点前复核。",
                "真实试点前仍需由学校确认只读数据同步方式。",
            ],
            "next_actions": [
                "确认试点学院、空间范围和 2 周灰度周期。",
                "用同一质量检查口径校验学校提供的脱敏或只读数据。",
                "将准备度报告作为信息办和业务方评审材料。",
            ],
        },
    }


def build_delivery_package():
    readiness = build_readiness_report()
    config_center = build_config_center(readiness)
    simulated_import = build_simulated_import(readiness)
    report_export = build_markdown_report(config_center, simulated_import, readiness)
    return {
        "version": "V1.3",
        "title": "CampusFlow V1.3 试点交付包",
        "config_center": config_center,
        "simulated_import": simulated_import,
        "report_export": report_export,
        "delivery_status": "ready_to_submit",
        "next_actions": [
            "将 Markdown 报告提交给业务负责人、信息办和审批老师确认。",
            "用同一模拟导入校验口径处理学校授权的脱敏或只读数据。",
            "在真实试点前冻结试点配置版本，避免演示口径和试点口径不一致。",
        ],
    }


def build_config_center(readiness):
    pilot_config = readiness["pilot_config"]
    return {
        "status": "configured",
        "config_id": "CFG-V13-SIM-001",
        "organization": pilot_config["organization"],
        "campus": pilot_config["campus"],
        "period": pilot_config["period"],
        "roles": pilot_config["roles"],
        "space_scope": {
            "mode": "simulated_scope",
            "spaces_in_scope": pilot_config["spaces_in_scope"],
            "permission_scope": "pilot_east",
        },
        "acceptance_thresholds": {
            "readiness_score_min": 80,
            "required_dataset_status": "ready_or_warning",
            "privacy_forbidden_fields_max": 0,
            "report_sections_min": 5,
        },
        "required_datasets": ["spaces", "schedules", "reservations", "equipment_status", "approval_rules"],
        "success_gates": pilot_config["success_gates"],
    }


def build_simulated_import(readiness):
    data = get_simulated_pilot_data()
    batches = [
        {"name": "spaces_simulated.csv", "dataset": "spaces", "rows": len(data["spaces"]), "status": "validated"},
        {"name": "schedules_simulated.csv", "dataset": "schedules", "rows": len(data["schedules"]), "status": "validated"},
        {"name": "reservations_simulated.csv", "dataset": "reservations", "rows": len(data["reservations"]), "status": "validated"},
        {"name": "equipment_simulated.csv", "dataset": "equipment_status", "rows": len(data["equipment_status"]), "status": "validated_with_warning"},
        {"name": "approval_rules_simulated.csv", "dataset": "approval_rules", "rows": len(data["approval_rules"]), "status": "validated"},
    ]
    checks = readiness["quality_checks"]
    failed = [item for item in checks if item["status"] == "fail"]
    passed = [item for item in checks if item["status"] == "pass"]
    warnings = [item for item in checks if item["status"] == "warn"]
    return {
        "source": "independent_simulated_csv",
        "privacy": readiness["privacy"],
        "batches": batches,
        "validation": {
            "status": "pass" if not failed and not readiness["privacy"]["contains_customer_data"] else "fail",
            "passed": len(passed),
            "warnings": len(warnings),
            "failed": len(failed),
            "checks": checks,
            "summary": "模拟导入校验通过；设备状态 WARN 已进入试点前复核清单。",
        },
    }


def build_markdown_report(config_center, simulated_import, readiness):
    sections = ["版本结论", "试点配置", "模拟导入校验", "隐私边界", "质量检查", "下一步动作"]
    next_actions = [
        "将 Markdown 交付报告提交给业务负责人、信息办和审批老师确认。",
        "用同一模拟导入校验口径处理学校授权的脱敏或只读数据。",
        "在真实试点前冻结试点配置版本，避免演示口径和试点口径不一致。",
    ]
    markdown = "\n".join(
        [
            "# CampusFlow V1.3 试点交付报告",
            "",
            "## 版本结论",
            "",
            f"- 交付状态：ready_to_submit",
            f"- 准备度评分：{readiness['readiness_score']}",
            f"- 决策建议：{readiness['readiness_report']['decision']}",
            "",
            "## 试点配置",
            "",
            f"- 配置编号：{config_center['config_id']}",
            f"- 组织范围：{config_center['organization']}",
            f"- 校区范围：{config_center['campus']}",
            f"- 试点周期：{config_center['period']}",
            f"- 参与角色：{'、'.join(config_center['roles'])}",
            "",
            "## 模拟导入校验",
            "",
            f"- 数据来源：{simulated_import['source']}",
            f"- 校验状态：{simulated_import['validation']['status']}",
            f"- 通过/警告/失败：{simulated_import['validation']['passed']}/{simulated_import['validation']['warnings']}/{simulated_import['validation']['failed']}",
            "",
            "## 隐私边界",
            "",
            f"- 数据模式：{simulated_import['privacy']['data_mode']}",
            f"- 包含客户真实数据：{str(simulated_import['privacy']['contains_customer_data']).lower()}",
            f"- 禁止字段命中：{len(simulated_import['privacy']['forbidden_fields_found'])}",
            "",
            "## 质量检查",
            "",
            *[f"- {item['name']}：{item['status']}，{item['detail']}" for item in simulated_import["validation"]["checks"]],
            "",
            "## 下一步动作",
            "",
            *[f"- {item}" for item in next_actions],
        ]
    )
    return {
        "format": "markdown",
        "filename": "campusflow-v1.3-pilot-delivery-report.md",
        "sections": sections,
        "markdown": markdown,
    }


def summarize_datasets(data):
    return {
        "spaces": {"count": len(data["spaces"]), "status": "ready"},
        "schedules": {"count": len(data["schedules"]), "status": "ready"},
        "reservations": {"count": len(data["reservations"]), "status": "ready"},
        "equipment_status": {"count": len(data["equipment_status"]), "status": "warning"},
        "approval_rules": {"count": len(data["approval_rules"]), "status": "ready"},
    }


def check_required_fields(data):
    requirements = {
        "spaces": ["space_id", "space_label", "capacity", "equipment", "permission_scope"],
        "schedules": ["schedule_id", "space_id", "date_key", "start", "end"],
        "reservations": ["reservation_id", "space_id", "date_key", "start", "end", "capacity"],
        "equipment_status": ["ticket_id", "space_id", "equipment", "status"],
        "approval_rules": ["rule_id", "condition", "required_approver", "manual_review"],
    }
    missing = []
    for dataset, fields in requirements.items():
        for index, item in enumerate(data[dataset], start=1):
            for field in fields:
                if field not in item or item[field] in ("", None):
                    missing.append(f"{dataset}[{index}].{field}")
    return {
        "name": "必填字段完整性",
        "status": "pass" if not missing else "fail",
        "detail": "模拟导入数据必填字段完整。" if not missing else "存在缺失字段。",
        "issues": missing,
    }


def check_privacy_boundary(data):
    found = []
    scan_forbidden_fields(data, found)
    return {
        "name": "客户隐私字段检查",
        "status": "pass" if not found else "fail",
        "detail": "未发现姓名、学号、手机号、邮箱、证件号等客户隐私字段。" if not found else "发现禁止字段。",
        "forbidden_fields_found": found,
        "issues": found,
    }


def scan_forbidden_fields(value, found):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in FORBIDDEN_PRIVACY_FIELDS:
                found.append(key)
            scan_forbidden_fields(child, found)
    elif isinstance(value, list):
        for child in value:
            scan_forbidden_fields(child, found)


def check_time_conflicts(data):
    conflicts = []
    schedules = data["schedules"]
    reservations = data["reservations"]
    for schedule in schedules:
        for reservation in reservations:
            if schedule["space_id"] != reservation["space_id"] or schedule["date_key"] != reservation["date_key"]:
                continue
            if times_overlap(schedule["start"], schedule["end"], reservation["start"], reservation["end"]):
                conflicts.append(f"{schedule['space_id']} {schedule['date_key']} {reservation['reservation_id']}")
    return {
        "name": "课表与预约冲突检查",
        "status": "pass" if not conflicts else "warn",
        "detail": "模拟课表和预约未发现时间重叠。" if not conflicts else "存在需要人工确认的时间重叠。",
        "issues": conflicts,
    }


def check_capacity_fit(data):
    space_capacity = {space["space_id"]: space["capacity"] for space in data["spaces"]}
    overflow = [
        f"{item['reservation_id']} 超出 {item['space_id']} 容量"
        for item in data["reservations"]
        if item["capacity"] > space_capacity.get(item["space_id"], 0)
    ]
    return {
        "name": "容量匹配检查",
        "status": "pass" if not overflow else "fail",
        "detail": "模拟预约人数均未超过空间容量。" if not overflow else "存在容量超限。",
        "issues": overflow,
    }


def check_equipment_status(data):
    warnings = [
        f"{item['space_id']} {item['equipment']} {item['impact']}"
        for item in data["equipment_status"]
        if item["status"] != "ok"
    ]
    return {
        "name": "设备状态检查",
        "status": "warn" if warnings else "pass",
        "detail": "存在试点前需要复核的模拟设备项。" if warnings else "模拟设备状态正常。",
        "issues": warnings,
    }


def check_permission_scope(data):
    invalid = [
        space["space_id"]
        for space in data["spaces"]
        if not space.get("permission_scope", "").startswith("pilot_")
    ]
    return {
        "name": "权限范围检查",
        "status": "pass" if not invalid else "fail",
        "detail": "所有模拟空间均限定在试点权限范围内。" if not invalid else "存在未限定试点权限的空间。",
        "issues": invalid,
    }


def times_overlap(start_a, end_a, start_b, end_b):
    return time_to_minutes(start_a) < time_to_minutes(end_b) and time_to_minutes(start_b) < time_to_minutes(end_a)


def time_to_minutes(value):
    hour, minute = value.split(":")
    return int(hour) * 60 + int(minute)
