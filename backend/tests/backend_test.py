"""
Alee Club Talent App — Backend API Tests
Covers: auth, users, events, applications, payments (mock), certificates,
notifications, AI scoring, admin analytics/users, role enforcement.
"""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path

# Load backend env for default URL construction
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Frontend/public URL used by the app
FRONTEND_ENV = Path("/app/frontend/.env")
PUBLIC_URL = None
if FRONTEND_ENV.exists():
    for line in FRONTEND_ENV.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            PUBLIC_URL = line.split("=", 1)[1].strip().strip('"')

BASE_URL = (PUBLIC_URL or os.environ.get("EXPO_PUBLIC_BACKEND_URL", "")).rstrip("/")
assert BASE_URL, "BASE_URL not resolved from env"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@aleeclub.com"
ADMIN_PASSWORD = "Admin@123"


# --------------- Fixtures ---------------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def participant(s):
    """Register a fresh participant each session."""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_user_{suffix}@aleeclub.com"
    pw = "Test@1234"
    r = s.post(f"{API}/auth/register", json={
        "name": f"TEST User {suffix}", "email": email, "password": pw, "phone": "9999999999"
    }, timeout=20)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "participant"
    return {"email": email, "password": pw, "token": data["token"], "user": data["user"]}


def H(token): return {"Authorization": f"Bearer {token}"}


# --------------- Health ---------------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# --------------- Auth ---------------
class TestAuth:
    def test_register_duplicate_rejected(self, s, participant):
        r = s.post(f"{API}/auth/register", json={
            "name": "dup", "email": participant["email"], "password": "x"
        })
        assert r.status_code == 400

    def test_login_bad_password(self, s, participant):
        r = s.post(f"{API}/auth/login", json={"email": participant["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_login_good(self, s, participant):
        r = s.post(f"{API}/auth/login", json={"email": participant["email"], "password": participant["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_me_requires_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, s, participant):
        r = s.get(f"{API}/auth/me", headers=H(participant["token"]))
        assert r.status_code == 200
        # Backend lowercases emails on register (good practice)
        assert r.json()["email"] == participant["email"].lower()
        # ensure password hash not leaked
        assert "password_hash" not in r.json()

    def test_self_register_admin_downgraded(self, s):
        email = f"TEST_admin_{uuid.uuid4().hex[:6]}@aleeclub.com"
        r = s.post(f"{API}/auth/register", json={
            "name": "bad", "email": email, "password": "Admin@123", "role": "admin"
        })
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "participant"


# --------------- Users ---------------
class TestUsers:
    def test_update_profile(self, s, participant):
        r = s.put(f"{API}/users/me", headers=H(participant["token"]), json={
            "city": "Mumbai", "age": 22, "height_cm": 175, "category": "mr-india",
            "bio": "Test bio", "portfolio_photos": ["data:image/png;base64,AAA"]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["city"] == "Mumbai"
        assert data["age"] == 22
        assert data["portfolio_photos"] == ["data:image/png;base64,AAA"]

        # verify via /auth/me
        r2 = s.get(f"{API}/auth/me", headers=H(participant["token"]))
        assert r2.json()["city"] == "Mumbai"


# --------------- Events ---------------
class TestEvents:
    def test_list_events_seeded(self, s):
        r = s.get(f"{API}/events")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 4, f"Expected >=4 seeded events, got {len(items)}"
        for ev in items:
            assert "id" in ev and "title" in ev and "category" in ev

    def test_filter_by_category(self, s):
        r = s.get(f"{API}/events", params={"category": "miss-teen"})
        assert r.status_code == 200
        for ev in r.json():
            assert ev["category"] == "miss-teen"

    def test_filter_by_city(self, s):
        r = s.get(f"{API}/events", params={"city": "mumbai"})
        assert r.status_code == 200
        for ev in r.json():
            assert "mumbai" in ev["city"].lower()

    def test_get_event_by_id(self, s):
        items = s.get(f"{API}/events").json()
        eid = items[0]["id"]
        r = s.get(f"{API}/events/{eid}")
        assert r.status_code == 200
        assert r.json()["id"] == eid

    def test_get_event_not_found(self, s):
        r = s.get(f"{API}/events/nonexistent-id")
        assert r.status_code == 404

    def test_participant_cannot_create_event(self, s, participant):
        r = s.post(f"{API}/events", headers=H(participant["token"]), json={
            "title": "hack", "description": "x", "category": "x", "city": "x",
            "venue": "x", "start_date": "2026-01-01", "end_date": "2026-01-02",
            "application_deadline": "2025-12-31"
        })
        assert r.status_code == 403

    def test_admin_create_update_delete_event(self, s, admin_token):
        payload = {
            "title": "TEST_EVENT", "subtitle": "t", "description": "d",
            "category": "test-cat", "city": "TestCity", "venue": "V",
            "min_age": 18, "max_age": 30, "gender": "any", "fee": 50000,
            "start_date": "2026-09-01", "end_date": "2026-09-02",
            "application_deadline": "2026-08-15", "status": "open"
        }
        r = s.post(f"{API}/events", headers=H(admin_token), json=payload)
        assert r.status_code == 200, r.text
        ev = r.json()
        eid = ev["id"]
        assert ev["title"] == "TEST_EVENT"

        # verify GET
        r2 = s.get(f"{API}/events/{eid}")
        assert r2.status_code == 200

        # update
        payload["title"] = "TEST_EVENT_UPD"
        r3 = s.put(f"{API}/events/{eid}", headers=H(admin_token), json=payload)
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_EVENT_UPD"

        # delete
        r4 = s.delete(f"{API}/events/{eid}", headers=H(admin_token))
        assert r4.status_code == 200
        r5 = s.get(f"{API}/events/{eid}")
        assert r5.status_code == 404


# --------------- Applications & Payments ---------------
@pytest.fixture(scope="session")
def paid_event_id(s):
    items = s.get(f"{API}/events").json()
    for ev in items:
        if ev.get("fee", 0) > 0:
            return ev["id"]
    return items[0]["id"]


@pytest.fixture(scope="session")
def application(s, participant, paid_event_id):
    body = {
        "event_id": paid_event_id,
        "full_name": "TEST Applicant",
        "age": 22, "gender": "female", "city": "Mumbai", "phone": "9999999999",
        "height_cm": 170, "bio": "short bio", "achievements": "many",
        "photos": ["data:image/png;base64,AAA"], "videos": [], "is_draft": False
    }
    r = s.post(f"{API}/applications", headers=H(participant["token"]), json=body)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert data["status"] == "applied"
    assert data["payment_status"] in ("pending", "free")
    return data


class TestApplications:
    def test_duplicate_application_rejected(self, s, participant, paid_event_id, application):
        body = {
            "event_id": paid_event_id, "full_name": "dup", "age": 22,
            "gender": "female", "city": "Mumbai", "phone": "9999999999",
            "photos": [], "videos": [], "is_draft": False
        }
        r = s.post(f"{API}/applications", headers=H(participant["token"]), json=body)
        assert r.status_code == 400

    def test_my_applications(self, s, participant, application):
        r = s.get(f"{API}/applications/mine", headers=H(participant["token"]))
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert application["id"] in ids

    def test_get_application(self, s, participant, application):
        r = s.get(f"{API}/applications/{application['id']}", headers=H(participant["token"]))
        assert r.status_code == 200
        assert r.json()["id"] == application["id"]

    def test_participant_cannot_list_admin_apps(self, s, participant):
        r = s.get(f"{API}/applications", headers=H(participant["token"]))
        assert r.status_code == 403

    def test_admin_list_applications(self, s, admin_token, application):
        r = s.get(f"{API}/applications", headers=H(admin_token))
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert application["id"] in ids

    def test_admin_update_status(self, s, admin_token, application):
        r = s.put(f"{API}/applications/{application['id']}/status",
                  headers=H(admin_token), json={"status": "shortlisted", "feedback": "Great!"})
        assert r.status_code == 200
        updated = r.json()
        assert updated["status"] == "shortlisted"
        assert any(t["step"] == "shortlisted" for t in updated["timeline"])

    def test_participant_cannot_update_status(self, s, participant, application):
        r = s.put(f"{API}/applications/{application['id']}/status",
                  headers=H(participant["token"]), json={"status": "selected"})
        assert r.status_code == 403


class TestPayments:
    def test_create_order_mock(self, s, participant, application):
        r = s.post(f"{API}/payments/create-order", headers=H(participant["token"]),
                   json={"application_id": application["id"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["mock"] is True
        assert data["amount"] == application["fee"]
        assert data["order_id"] and data["order_id"].startswith("order_mock_")

    def test_verify_mock(self, s, participant, application):
        r = s.post(f"{API}/payments/verify", headers=H(participant["token"]),
                   json={"application_id": application["id"], "mock": True})
        assert r.status_code == 200
        assert r.json()["verified"] is True

        # confirm app payment_status updated
        r2 = s.get(f"{API}/applications/{application['id']}", headers=H(participant["token"]))
        assert r2.json()["payment_status"] == "paid"

    def test_my_payments(self, s, participant):
        r = s.get(f"{API}/payments/mine", headers=H(participant["token"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------- Certificates ---------------
class TestCertificates:
    def test_mine_after_shortlist(self, s, participant):
        r = s.get(f"{API}/certificates/mine", headers=H(participant["token"]))
        assert r.status_code == 200
        certs = r.json()
        assert len(certs) >= 1, "Expected cert after shortlisted status"
        assert certs[0]["verification_id"].startswith("ALEE-")

    def test_pdf_generation(self, s, participant, application):
        r = s.get(f"{API}/certificates/{application['id']}/pdf", headers=H(participant["token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["mime"] == "application/pdf"
        assert data["base64"]
        # verify it's actually a PDF
        import base64 as b64
        raw = b64.b64decode(data["base64"])
        assert raw.startswith(b"%PDF"), "Generated file is not a valid PDF"


# --------------- Notifications ---------------
class TestNotifications:
    def test_list_notifications(self, s, participant):
        r = s.get(f"{API}/notifications", headers=H(participant["token"]))
        assert r.status_code == 200
        items = r.json()
        # should have at least: application submitted + status update + payment
        assert len(items) >= 2
        types = {n["type"] for n in items}
        assert "status" in types

    def test_mark_read(self, s, participant):
        items = s.get(f"{API}/notifications", headers=H(participant["token"])).json()
        nid = items[0]["id"]
        r = s.post(f"{API}/notifications/{nid}/read", headers=H(participant["token"]))
        assert r.status_code == 200


# --------------- AI Scoring ---------------
class TestAI:
    def test_score_profile(self, s, participant):
        r = s.post(f"{API}/ai/score-profile", headers=H(participant["token"]),
                   json={"include_profile": True}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "raw" in data
        # score may be None if LLM format varies, but raw must be present
        assert isinstance(data.get("raw"), str) and len(data["raw"]) > 10


# --------------- Admin Analytics ---------------
class TestAdmin:
    def test_analytics(self, s, admin_token):
        r = s.get(f"{API}/admin/analytics", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()
        for k in ("users", "events", "applications", "by_status", "revenue_paise"):
            assert k in data
        assert data["events"] >= 4
        assert data["applications"] >= 1

    def test_admin_users(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=H(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        # ensure password hash is not leaked
        for u in users:
            assert "password_hash" not in u

    def test_participant_cannot_access_analytics(self, s, participant):
        r = s.get(f"{API}/admin/analytics", headers=H(participant["token"]))
        assert r.status_code == 403
