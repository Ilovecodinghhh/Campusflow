import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.parse import quote
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from campusflow.server import CampusFlowHandler


class ServerIntegrationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), CampusFlowHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def get_json(self, path):
        with urlopen(self.base_url + path, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))

    def post_json(self, path, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request = Request(
            self.base_url + path,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))

    def get_text(self, path):
        with urlopen(self.base_url + path, timeout=5) as response:
            return response.headers.get("Content-Type", ""), response.read().decode("utf-8")

    def test_static_frontend_assets_are_served(self):
        html_type, html = self.get_text("/")
        js_type, js = self.get_text("/app.js")
        css_type, css = self.get_text("/styles.css")

        self.assertIn("text/html", html_type)
        self.assertIn("CampusFlow V1.3 试点交付版", html)
        self.assertIn("V1.3 试点交付", html)
        self.assertIn("重置演示", html)
        self.assertIn("javascript", js_type)
        self.assertIn("renderRecommendations", js)
        self.assertIn("renderPilotSummary", js)
        self.assertIn("renderPilotReadiness", js)
        self.assertIn("renderPilotDelivery", js)
        self.assertIn("/api/pilot/summary", js)
        self.assertIn("/api/pilot/readiness", js)
        self.assertIn("/api/pilot/delivery", js)
        self.assertIn("resetDemo", js)
        self.assertIn("text/css", css_type)
        self.assertIn("--accent", css)

    def test_main_api_chain_supports_local_mvp(self):
        health = self.get_json("/api/health")
        self.assertEqual(health["status"], "ok")

        recommended = self.post_json(
            "/api/spaces/recommend",
            {"role": "学生", "input": "今晚 7 点后，找东门附近 4 人讨论空间，要插座。"},
        )
        self.assertGreaterEqual(len(recommended["recommendations"]), 1)
        self.assertEqual(recommended["parsed"]["intent"], "space_search")

        submitted = self.post_json(
            "/api/applications/submit",
            {"role": "社团负责人", "input": "周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。"},
        )
        application_id = submitted["application"]["application_id"]
        self.assertEqual(submitted["application"]["status"], "pending_review")

        review = self.post_json(
            f"/api/reviews/{application_id}/decision",
            {"role": "老师", "decision": "approved", "note": "材料完整，设备已确认"},
        )
        self.assertEqual(review["application"]["status"], "approved")

        summary = self.get_json("/api/operations/summary?role=" + quote("管理员"))
        self.assertIn("metrics", summary)
        self.assertIn("weekly_brief", summary)

        pilot = self.get_json("/api/pilot/summary?role=" + quote("管理员"))
        self.assertEqual(pilot["period"], "V1.1 试点仿真 · 6 周")
        self.assertEqual(pilot["acceptance"]["status"], "go")
        self.assertIn("weekly_report", pilot)

        readiness = self.get_json("/api/pilot/readiness?role=" + quote("管理员"))
        self.assertEqual(readiness["version"], "V1.2")
        self.assertEqual(readiness["privacy"]["data_mode"], "independent_simulation")
        self.assertFalse(readiness["privacy"]["contains_customer_data"])
        self.assertGreaterEqual(readiness["readiness_score"], 80)

        delivery = self.get_json("/api/pilot/delivery?role=" + quote("管理员"))
        self.assertEqual(delivery["version"], "V1.3")
        self.assertEqual(delivery["config_center"]["status"], "configured")
        self.assertEqual(delivery["simulated_import"]["validation"]["status"], "pass")
        self.assertIn("CampusFlow V1.3 试点交付报告", delivery["report_export"]["markdown"])

        with self.assertRaises(HTTPError) as denied:
            self.post_json(
                "/api/applications/submit",
                {"role": "学生", "input": "周五 19:00 办 80 人 AI 分享会，要投影、麦克风。"},
            )
        self.assertEqual(denied.exception.code, 403)

    def test_demo_reset_clears_mutable_records(self):
        submitted = self.post_json(
            "/api/applications/submit",
            {"role": "社团负责人", "input": "周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。"},
        )
        self.post_json(
            "/api/feedback",
            {"role": "学生", "application_id": submitted["application"]["application_id"], "action": "submitted", "rating": 5},
        )

        reset = self.post_json("/api/demo/reset", {"role": "管理员"})
        applications = self.get_json("/api/applications?role=" + quote("老师"))
        audit = self.get_json("/api/audit")

        self.assertEqual(reset["status"], "reset")
        self.assertGreaterEqual(reset["cleared"]["applications"], 1)
        self.assertEqual(applications["applications"], [])
        self.assertEqual(audit["items"], [])


if __name__ == "__main__":
    unittest.main()
