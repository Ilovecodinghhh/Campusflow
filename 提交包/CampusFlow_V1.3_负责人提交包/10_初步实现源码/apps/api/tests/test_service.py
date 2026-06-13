import unittest

from campusflow.db import connect, initialize_database
from campusflow.service import (
    decide_review,
    list_applications,
    record_feedback,
    submit_application,
    summarize_operations,
    summarize_pilot_delivery,
    summarize_pilot_readiness,
    summarize_pilot_review,
)


class ServiceTest(unittest.TestCase):
    def setUp(self):
        self.conn = connect(":memory:")
        initialize_database(self.conn)

    def tearDown(self):
        self.conn.close()

    def test_submit_application_persists_application_and_audit(self):
        result = submit_application(
            self.conn,
            {
                "role": "club_leader",
                "user_id": "club_ai",
                "department": "人工智能协会",
                "permission_scope": ["east_campus"],
            },
            "周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。",
        )

        self.assertEqual(result["application"]["status"], "pending_review")
        self.assertEqual(result["application"]["selected_space_id"], "S201")
        self.assertEqual(result["risk"]["level"], "medium")

        applications = list_applications(self.conn, {"role": "teacher", "permission_scope": ["east_campus"]})
        self.assertTrue(any(item["application_id"] == result["application"]["application_id"] for item in applications))

        audit_count = self.conn.execute("select count(*) from audit_log").fetchone()[0]
        self.assertGreaterEqual(audit_count, 1)

    def test_teacher_can_decide_review_and_student_cannot(self):
        submitted = submit_application(
            self.conn,
            {"role": "club_leader", "user_id": "club_ai", "permission_scope": ["east_campus"]},
            "周五 19:00 办 80 人 AI 分享会，要投影、麦克风，有 5 个外校嘉宾。",
        )

        with self.assertRaises(PermissionError):
            decide_review(
                self.conn,
                {"role": "student", "user_id": "stu_001", "permission_scope": ["east_campus"]},
                submitted["application"]["application_id"],
                "approved",
            )

        reviewed = decide_review(
            self.conn,
            {"role": "teacher", "user_id": "teacher_001", "permission_scope": ["east_campus"]},
            submitted["application"]["application_id"],
            "approved",
        )

        self.assertEqual(reviewed["status"], "approved")
        audit_actions = [row[0] for row in self.conn.execute("select action from audit_log").fetchall()]
        self.assertIn("review_decision", audit_actions)

    def test_feedback_and_operations_summary_update_metrics(self):
        record_feedback(
            self.conn,
            {"role": "student", "user_id": "stu_001", "permission_scope": ["east_campus"]},
            {"space_id": "B203", "action": "reserved", "rating": 5},
        )

        summary = summarize_operations(self.conn, {"role": "admin", "permission_scope": ["east_campus"]})

        self.assertIn("metrics", summary)
        self.assertGreaterEqual(summary["metrics"]["recommendation_adoption_rate"], 1)
        self.assertEqual(summary["conflicts"][0]["space_name"], "学生活动中心 201")

    def test_pilot_review_summary_exposes_acceptance_gates_and_audit(self):
        summary = summarize_pilot_review(self.conn, {"role": "admin", "permission_scope": ["east_campus"]})

        self.assertEqual(summary["period"], "V1.1 试点仿真 · 6 周")
        self.assertEqual(summary["acceptance"]["status"], "go")
        self.assertGreaterEqual(summary["acceptance"]["passed"], 5)
        self.assertEqual(summary["acceptance"]["total"], len(summary["acceptance"]["gates"]))
        self.assertEqual(summary["baseline"]["space_search_minutes"], 18)
        self.assertEqual(summary["current"]["space_search_minutes"], 9)
        self.assertEqual(summary["improvements"]["space_search_time_saved_rate"], 50)
        self.assertGreaterEqual(len(summary["scenarios"]), 4)
        self.assertIn("CampusFlow V1.1", summary["weekly_report"]["title"])
        self.assertGreaterEqual(len(summary["weekly_report"]["next_actions"]), 3)

        audit_actions = [row[0] for row in self.conn.execute("select action from audit_log").fetchall()]
        self.assertIn("pilot_summary", audit_actions)

    def test_pilot_readiness_uses_independent_simulated_data(self):
        report = summarize_pilot_readiness(self.conn, {"role": "admin", "permission_scope": ["east_campus"]})

        self.assertEqual(report["version"], "V1.2")
        self.assertEqual(report["privacy"]["data_mode"], "independent_simulation")
        self.assertFalse(report["privacy"]["contains_customer_data"])
        self.assertEqual(report["privacy"]["forbidden_fields_found"], [])
        self.assertGreaterEqual(report["readiness_score"], 80)
        self.assertEqual(report["readiness_report"]["decision"], "ready_for_controlled_pilot")
        self.assertIn("spaces", report["datasets"])
        self.assertIn("schedules", report["datasets"])
        self.assertIn("equipment_status", report["datasets"])
        self.assertIn("approval_rules", report["datasets"])
        self.assertGreaterEqual(len(report["quality_checks"]), 5)
        self.assertGreaterEqual(len(report["pilot_config"]["roles"]), 4)
        self.assertGreaterEqual(len(report["readiness_report"]["next_actions"]), 3)

        audit_actions = [row[0] for row in self.conn.execute("select action from audit_log").fetchall()]
        self.assertIn("pilot_readiness", audit_actions)

    def test_pilot_delivery_exports_configured_simulated_report(self):
        delivery = summarize_pilot_delivery(self.conn, {"role": "admin", "permission_scope": ["east_campus"]})

        self.assertEqual(delivery["version"], "V1.3")
        self.assertEqual(delivery["config_center"]["status"], "configured")
        self.assertEqual(delivery["simulated_import"]["privacy"]["data_mode"], "independent_simulation")
        self.assertFalse(delivery["simulated_import"]["privacy"]["contains_customer_data"])
        self.assertEqual(delivery["simulated_import"]["validation"]["status"], "pass")
        self.assertGreaterEqual(delivery["simulated_import"]["validation"]["passed"], 5)
        self.assertIn("markdown", delivery["report_export"])
        self.assertIn("CampusFlow V1.3 试点交付报告", delivery["report_export"]["markdown"])
        self.assertNotIn("V1.2", delivery["report_export"]["markdown"])
        self.assertGreaterEqual(len(delivery["report_export"]["sections"]), 5)
        self.assertEqual(delivery["delivery_status"], "ready_to_submit")

        audit_actions = [row[0] for row in self.conn.execute("select action from audit_log").fetchall()]
        self.assertIn("pilot_delivery", audit_actions)


if __name__ == "__main__":
    unittest.main()
