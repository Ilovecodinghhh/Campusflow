import json
import mimetypes
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from campusflow.db import connect, initialize_database, reset_demo_data
from campusflow.engine import build_workflow_steps, parse_intent
from campusflow.service import (
    decide_review,
    draft_application,
    list_applications,
    list_audit,
    recommend_request,
    record_feedback,
    submit_application,
    summarize_operations,
    summarize_pilot_delivery,
    summarize_pilot_readiness,
    summarize_pilot_review,
)


ROOT = Path(__file__).resolve().parents[3]
WEB_ROOT = ROOT / "apps" / "web"


ROLE_CONTEXT = {
    "学生": {"role": "student", "user_id": "stu_001", "department": "学生", "permission_scope": ["east_campus"]},
    "社团负责人": {"role": "club_leader", "user_id": "club_ai", "department": "人工智能协会", "permission_scope": ["east_campus"]},
    "老师": {"role": "teacher", "user_id": "teacher_001", "department": "团委", "permission_scope": ["east_campus"]},
    "管理员": {"role": "admin", "user_id": "admin_001", "department": "场地管理中心", "permission_scope": ["east_campus"]},
}


def response(status, payload):
    return status, payload


def get_user(payload=None, query=None):
    payload = payload or {}
    query = query or {}
    role_name = payload.get("role") or query.get("role", ["学生"])[0]
    return ROLE_CONTEXT.get(role_name, ROLE_CONTEXT["学生"])


class CampusFlowHandler(BaseHTTPRequestHandler):
    server_version = "CampusFlowLocal/0.1"

    def do_OPTIONS(self):
        self.send_response(204)
        self.add_common_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            status, payload = self.handle_api_get(parsed.path, parse_qs(parsed.query))
            self.write_json(status, payload)
            return
        self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.write_json(404, {"error": "NOT_FOUND"})
            return
        payload = self.read_json()
        try:
            status, body = self.handle_api_post(parsed.path, payload)
        except PermissionError as exc:
            status, body = response(403, {"error": "PERMISSION_DENIED", "message": str(exc)})
        except ValueError as exc:
            status, body = response(400, {"error": "BAD_REQUEST", "message": str(exc)})
        except KeyError as exc:
            status, body = response(404, {"error": "NOT_FOUND", "message": str(exc)})
        self.write_json(status, body)

    def handle_api_get(self, path, query):
        with closing(connect()) as conn:
            initialize_database(conn)
            user = get_user(query=query)
            if path == "/api/health":
                return response(200, {"status": "ok", "product": "CampusFlow", "mode": "local"})
            if path == "/api/roles":
                return response(200, {"roles": list(ROLE_CONTEXT.keys())})
            if path == "/api/applications":
                return response(200, {"applications": list_applications(conn, user)})
            if path == "/api/operations/summary":
                return response(200, summarize_operations(conn, user))
            if path == "/api/pilot/summary":
                return response(200, summarize_pilot_review(conn, user))
            if path == "/api/pilot/readiness":
                return response(200, summarize_pilot_readiness(conn, user))
            if path == "/api/pilot/delivery":
                return response(200, summarize_pilot_delivery(conn, user))
            if path == "/api/audit":
                return response(200, {"items": list_audit(conn)})
        return response(404, {"error": "NOT_FOUND"})

    def handle_api_post(self, path, payload):
        with closing(connect()) as conn:
            initialize_database(conn)
            user = get_user(payload=payload)
            input_text = payload.get("input", "")
            if path == "/api/intent/parse":
                parsed = parse_intent(input_text)
                return response(200, {"parsed": parsed, "workflow_steps": build_workflow_steps(parsed)})
            if path == "/api/spaces/recommend":
                return response(200, recommend_request(conn, user, input_text=input_text))
            if path == "/api/applications/draft":
                return response(200, draft_application(conn, user, input_text))
            if path == "/api/applications/submit":
                return response(200, submit_application(conn, user, input_text))
            if path == "/api/feedback":
                return response(200, record_feedback(conn, user, payload))
            if path == "/api/demo/reset":
                if user["role"] != "admin":
                    raise PermissionError("只有管理员可以重置演示数据")
                return response(200, {"status": "reset", "cleared": reset_demo_data(conn)})
            if path.startswith("/api/reviews/") and path.endswith("/decision"):
                parts = path.split("/")
                application_id = parts[3]
                return response(200, {"application": decide_review(conn, user, application_id, payload.get("decision", ""), payload.get("note", ""))})
        return response(404, {"error": "NOT_FOUND"})

    def serve_static(self, path):
        relative = path.lstrip("/") or "index.html"
        target = (WEB_ROOT / relative).resolve()
        if not str(target).startswith(str(WEB_ROOT.resolve())) or not target.exists() or target.is_dir():
            target = WEB_ROOT / "index.html"
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.add_common_headers()
        self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith("text/") or content_type == "application/javascript" else content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def write_json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.add_common_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def add_common_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        print(f"[CampusFlow] {self.address_string()} - {format % args}")


def run(host="127.0.0.1", port=8765):
    with closing(connect()) as conn:
        initialize_database(conn)
    server = ThreadingHTTPServer((host, port), CampusFlowHandler)
    print(f"CampusFlow local MVP running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
