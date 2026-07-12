from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

FAKE_UUID = "11111111-1111-1111-1111-111111111111"


def test_health_check_is_public():
    res = client.get("/")
    assert res.status_code == 200


def test_jobs_saved_requires_auth():
    assert client.get("/jobs/saved").status_code == 401


def test_jobs_save_requires_auth():
    res = client.post("/jobs/save", json={"job_id": FAKE_UUID})
    assert res.status_code == 401


def test_jobs_unsave_requires_auth():
    assert client.delete(f"/jobs/unsave?job_id={FAKE_UUID}").status_code == 401


def test_jobs_update_status_requires_auth():
    res = client.patch(f"/jobs/saved/{FAKE_UUID}/status", json={"status": "applied"})
    assert res.status_code == 401


def test_jobs_match_requires_auth():
    res = client.post("/jobs/match", json={"cv_id": FAKE_UUID, "limit": 5})
    assert res.status_code == 401


def test_cv_get_requires_auth():
    assert client.get(f"/api/v1/parser/cv/{FAKE_UUID}").status_code == 401


def test_cv_review_requires_auth():
    assert client.post(f"/api/v1/parser/cv/{FAKE_UUID}/review").status_code == 401


def test_skills_target_role_requires_auth():
    res = client.put(
        "/api/v1/skills/target-role",
        json={"cv_id": FAKE_UUID, "target_job_id": FAKE_UUID},
    )
    assert res.status_code == 401


def test_skills_gap_analysis_requires_auth():
    assert client.get(f"/api/v1/skills/gap-analysis/{FAKE_UUID}").status_code == 401


def test_skills_recommend_courses_requires_auth():
    res = client.post("/api/v1/skills/recommend-courses", json={"missing_skills": []})
    assert res.status_code == 401


def test_learning_plans_save_requires_auth():
    res = client.post("/api/v1/learning-plans", json={"title": "Test Plan", "plan_data": {}})
    assert res.status_code == 401


def test_learning_plans_list_requires_auth():
    assert client.get("/api/v1/learning-plans").status_code == 401


def test_learning_plans_delete_requires_auth():
    assert client.delete(f"/api/v1/learning-plans/{FAKE_UUID}").status_code == 401


def test_cover_letters_generate_requires_auth():
    res = client.post("/api/v1/cover-letters/generate", json={"cv_id": FAKE_UUID})
    assert res.status_code == 401


def test_cover_letters_list_requires_auth():
    assert client.get("/api/v1/cover-letters").status_code == 401


def test_cover_letters_delete_requires_auth():
    assert client.delete(f"/api/v1/cover-letters/{FAKE_UUID}").status_code == 401
