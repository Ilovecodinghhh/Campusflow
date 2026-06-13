import unittest

from campusflow.db import connect, initialize_database
from campusflow.engine import (
    assess_event_risk,
    build_workflow_steps,
    parse_intent,
    recommend_spaces,
)


class EngineTest(unittest.TestCase):
    def setUp(self):
        self.conn = connect(":memory:")
        initialize_database(self.conn)

    def tearDown(self):
        self.conn.close()

    def test_parse_space_search_intent(self):
        parsed = parse_intent("今晚 7 点后，找东门附近 4 人讨论空间，要插座。")

        self.assertEqual(parsed["intent"], "space_search")
        self.assertEqual(parsed["parameters"]["capacity"], 4)
        self.assertEqual(parsed["parameters"]["start"], "19:00")
        self.assertEqual(parsed["parameters"]["equipment"], ["power_socket"])
        self.assertEqual(parsed["parameters"]["location_preference"], "east_gate")

    def test_recommend_spaces_filters_course_conflict(self):
        query = {
            "intent": "event_application",
            "date": "friday",
            "start": "19:00",
            "end": "21:30",
            "capacity": 80,
            "equipment": ["projector", "microphone"],
            "preferred_types": ["auditorium", "lecture_hall"],
        }

        result = recommend_spaces(self.conn, query, {"role": "club_leader", "permission_scope": ["east_campus"]})

        self.assertEqual(result["recommendations"][0]["space_id"], "S201")
        self.assertEqual(result["unavailable"][0]["space_id"], "A102")
        self.assertIn("课程冲突", " ".join(result["unavailable"][0]["reasons"]))
        self.assertIn("space_basic", result["recommendations"][0]["data_sources"])

    def test_assess_event_risk_requires_manual_review(self):
        risk = assess_event_risk(
            {
                "capacity": 80,
                "external_guests": True,
                "end": "21:30",
                "equipment": ["projector", "microphone"],
                "selected_space_type": "auditorium",
            }
        )

        self.assertEqual(risk["level"], "medium")
        self.assertTrue(risk["must_manual_review"])
        self.assertIn("辅导员", risk["approvers"])

    def test_build_workflow_steps_hides_raw_json_first(self):
        steps = build_workflow_steps(
            {
                "intent": "event_application",
                "parameters": {
                    "capacity": 80,
                    "equipment": ["projector", "microphone"],
                    "external_guests": True,
                },
            }
        )

        self.assertEqual([step["title"] for step in steps], ["理解需求", "查询数据", "规则过滤", "人工确认"])
        self.assertIn("80 人", steps[0]["detail"])
        self.assertIn("空间表", steps[1]["detail"])


if __name__ == "__main__":
    unittest.main()
