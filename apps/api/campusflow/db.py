import json
import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[2] / "campusflow.sqlite3"


def connect(path=DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys = on")
    return conn


def dumps(value):
    return json.dumps(value, ensure_ascii=False)


def loads(value, fallback=None):
    if value is None:
        return fallback
    return json.loads(value)


def initialize_database(conn):
    create_schema(conn)
    seed_data(conn)


def reset_demo_data(conn):
    counts = {
        "applications": conn.execute("select count(*) from applications").fetchone()[0],
        "feedback_log": conn.execute("select count(*) from feedback_log").fetchone()[0],
        "audit_log": conn.execute("select count(*) from audit_log").fetchone()[0],
    }
    conn.execute("delete from feedback_log")
    conn.execute("delete from applications")
    conn.execute("delete from audit_log")
    conn.commit()
    seed_data(conn)
    return counts


def create_schema(conn):
    conn.executescript(
        """
        create table if not exists spaces (
            space_id text primary key,
            building text not null,
            name text not null,
            short_name text not null,
            type text not null,
            type_name text not null,
            capacity integer not null,
            equipment text not null,
            location_tag text not null,
            open_start text not null,
            open_end text not null,
            occupancy_rate integer not null,
            satisfaction integer not null,
            permission_scope text not null
        );

        create table if not exists course_schedule (
            schedule_id integer primary key autoincrement,
            space_id text not null,
            date_key text not null,
            start_time text not null,
            end_time text not null,
            label text not null,
            foreign key(space_id) references spaces(space_id)
        );

        create table if not exists reservations (
            reservation_id text primary key,
            space_id text not null,
            applicant_id text not null,
            label text not null,
            event_type text not null,
            status text not null,
            capacity integer not null,
            date_key text not null,
            start_time text not null,
            end_time text not null,
            foreign key(space_id) references spaces(space_id)
        );

        create table if not exists maintenance_ticket (
            ticket_id text primary key,
            space_id text not null,
            equipment_name text not null,
            status text not null,
            impact_level text not null,
            foreign key(space_id) references spaces(space_id)
        );

        create table if not exists applications (
            application_id text primary key,
            applicant_id text not null,
            applicant_role text not null,
            applicant_department text not null,
            event_name text not null,
            event_type text not null,
            selected_space_id text,
            date_key text not null,
            start_time text not null,
            end_time text not null,
            capacity integer not null,
            equipment text not null,
            external_guests integer not null,
            external_guest_count integer not null,
            risk_level text not null,
            risk_items text not null,
            approvers text not null,
            status text not null,
            created_at text not null,
            updated_at text not null,
            foreign key(selected_space_id) references spaces(space_id)
        );

        create table if not exists feedback_log (
            feedback_id text primary key,
            user_id text not null,
            role text not null,
            space_id text,
            application_id text,
            action text not null,
            rating integer,
            created_at text not null
        );

        create table if not exists audit_log (
            audit_id text primary key,
            request_id text not null,
            user_id text not null,
            role text not null,
            action text not null,
            input_summary text not null,
            output_summary text not null,
            data_sources text not null,
            created_at text not null
        );
        """
    )
    conn.commit()


def seed_data(conn):
    existing = conn.execute("select count(*) from spaces").fetchone()[0]
    if existing:
        return

    spaces = [
        ("B203", "教学楼 B", "教学楼 B203", "B203", "discussion", "讨论教室", 12, ["power_socket", "whiteboard"], "east_gate", "08:00", "22:00", 35, 92, "east_campus"),
        ("L305", "图书馆", "图书馆 L305 研讨室", "L305", "study_room", "研讨室", 6, ["power_socket", "screen"], "library", "09:00", "21:30", 45, 86, "east_campus"),
        ("C102", "创新中心", "创新中心 C102", "C102", "maker_space", "创客空间", 8, ["projector", "power_socket"], "innovation_center", "10:00", "22:00", 40, 83, "east_campus"),
        ("A102", "教学楼 A", "教学楼 A102 阶梯教室", "A102", "lecture_hall", "阶梯教室", 120, ["projector", "microphone"], "main_teaching", "08:00", "22:00", 70, 78, "east_campus"),
        ("S201", "学生活动中心", "学生活动中心 201 报告厅", "S201", "auditorium", "报告厅", 100, ["projector", "microphone", "speaker"], "activity_center", "09:00", "21:30", 62, 88, "east_campus"),
        ("Z301", "综合楼", "综合楼 301 多功能室", "Z301", "activity_room", "活动室", 90, ["projector", "whiteboard"], "central_building", "08:00", "22:00", 52, 81, "east_campus"),
    ]
    conn.executemany(
        """
        insert into spaces values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(space_id, building, name, short_name, type_, type_name, capacity, dumps(equipment), location, open_start, open_end, occupancy, satisfaction, scope)
         for space_id, building, name, short_name, type_, type_name, capacity, equipment, location, open_start, open_end, occupancy, satisfaction, scope in spaces],
    )

    conn.execute(
        """
        insert into course_schedule(space_id, date_key, start_time, end_time, label)
        values (?, ?, ?, ?, ?)
        """,
        ("A102", "friday", "19:00", "21:00", "大学英语课程"),
    )
    conn.execute(
        """
        insert into reservations values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("RES-001", "L305", "stu_002", "考研学习小组", "study", "approved", 6, "today", "18:00", "19:30"),
    )
    conn.execute(
        """
        insert into maintenance_ticket values (?, ?, ?, ?, ?)
        """,
        ("TICK-001", "Z301", "移动麦克风", "open", "warning"),
    )
    conn.commit()


def row_to_space(row):
    item = dict(row)
    item["equipment"] = loads(item["equipment"], [])
    return item
