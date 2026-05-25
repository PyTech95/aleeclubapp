"""
Iteration 3 regression + new Google OAuth endpoint tests.

Scope (from review request):
  1. POST /api/auth/google/session — failure paths only (no real Google session)
  2. Phone OTP regression: start + verify + /auth/me
  3. Admin login regression + /auth/me
  4. Events list regression
  5. Applications + payments/create-order with REAL Razorpay test keys
     (expect mock=false and order_id startswith "order_")
  6. Admin endpoints: /api/admin/applications + /api/admin/users
"""
import os
import uuid
import pytest
import requests
from pathlib import Path

FRONTEND_ENV = Path("/app/frontend/.env")
PUBLIC_URL = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
        PUBLIC_URL = line.split("=", 1)[1].strip().strip('"')

BASE_URL = (PUBLIC_URL or os.environ.get("EXPO_PUBLIC_BACKEND_URL", "")).rstrip("/")
assert BASE_URL, "BASE_URL not resolved from env"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@aleeclub.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ============================================================
# 1) NEW: POST /api/auth/google/session — failure paths
# ============================================================
class TestGoogleSessionEndpoint:
    def test_missing_session_id_returns_400(self, s):
        # Pydantic forbids missing 'session_id', so backend's runtime check
        # catches empty string. Pydantic will 422 on missing key — we test empty string.
        r = s.post(f"{API}/auth/google/session", json={"session_id": ""}, timeout=20)
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "Missing session_id" in detail or "session_id" in detail.lower()

    def test_whitespace_session_id_returns_400(self, s):
        r = s.post(f"{API}/auth/google/session", json={"session_id": "   "}, timeout=20)
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"

    def test_bogus_session_id_returns_401_not_500(self, s):
        r = s.post(f"{API}/auth/google/session",
                   json={"session_id": "invalid_test_xyz"}, timeout=30)
        # The upstream Emergent session-data API returns 404 for invalid IDs
        # which our backend must translate to 401, never 500.
        assert r.status_code == 401, (
            f"Expected 401 (Invalid or expired Google session), got "
            f"{r.status_code}: {r.text}"
        )
        detail = r.json().get("detail", "")
        assert "Invalid or expired Google session" in detail, detail

    def test_missing_body_field_returns_422(self, s):
        # Pydantic model requires session_id; missing key is a validation error
        r = s.post(f"{API}/auth/google/session", json={}, timeout=20)
        assert r.status_code in (400, 422), f"Got {r.status_code}: {r.text}"


# ============================================================
# 2) Phone OTP regression
# ============================================================
PHONE = "+919999900099"


@pytest.fixture(scope="module")
def phone_user(s):
    """Run phone start + verify, returns dict with token + user."""
    r = s.post(f"{API}/auth/phone/start",
               json={"phone": PHONE, "name": "Test", "city": "Mumbai"}, timeout=20)
    assert r.status_code == 200, f"phone/start failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("sent") is True
    assert data.get("test_code") == "123456"

    r2 = s.post(f"{API}/auth/phone/verify",
                json={"phone": PHONE, "code": "123456",
                      "name": "Test", "city": "Mumbai"}, timeout=20)
    assert r2.status_code == 200, f"phone/verify failed: {r2.status_code} {r2.text}"
    d2 = r2.json()
    assert "token" in d2 and "user" in d2
    assert d2["user"]["role"] == "participant"
    return d2


class TestPhoneOtpRegression:
    def test_phone_start_returns_test_code(self, s):
        r = s.post(f"{API}/auth/phone/start",
                   json={"phone": PHONE, "name": "Test", "city": "Mumbai"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["sent"] is True
        assert data["test_code"] == "123456"

    def test_phone_verify_returns_token_and_user(self, s, phone_user):
        assert "token" in phone_user and len(phone_user["token"]) > 20
        assert phone_user["user"]["role"] == "participant"
        assert phone_user["user"]["phone"] == PHONE

    def test_me_returns_same_user(self, s, phone_user):
        r = s.get(f"{API}/auth/me", headers=H(phone_user["token"]))
        assert r.status_code == 200
        u = r.json()
        assert u["id"] == phone_user["user"]["id"]
        assert u["role"] == "participant"
        assert u["phone"] == PHONE
        assert "password_hash" not in u

    def test_phone_verify_bad_code_rejected(self, s):
        r = s.post(f"{API}/auth/phone/verify",
                   json={"phone": PHONE, "code": "000000"}, timeout=20)
        assert r.status_code == 401


# ============================================================
# 3) Admin login regression
# ============================================================
@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


class TestAdminLoginRegression:
    def test_admin_login_returns_admin_role(self, s, admin_token):
        # fixture asserts role; explicit /auth/me check below
        r = s.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        u = r.json()
        assert u["role"] == "admin"
        assert u["email"] == ADMIN_EMAIL


# ============================================================
# 4) Events list regression
# ============================================================
class TestEventsRegression:
    def test_list_events_seeded(self, s):
        r = s.get(f"{API}/events", timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        assert "id" in items[0] and "title" in items[0]


# ============================================================
# 5) Application + Razorpay (REAL test keys) create-order
# ============================================================
@pytest.fixture(scope="module")
def first_event_id(s):
    items = s.get(f"{API}/events").json()
    # Prefer paid event so amount > 0 (so server actually calls Razorpay)
    for ev in items:
        if ev.get("fee", 0) > 0:
            return ev["id"]
    return items[0]["id"]


class TestApplicationAndRealRazorpay:
    def test_create_application_and_real_order(self, s, phone_user, first_event_id):
        body = {
            "event_id": first_event_id,
            "full_name": "TEST Phone Applicant",
            "age": 21,
            "gender": "female",
            "city": "Mumbai",
            "phone": PHONE,
            "photos": [],
            "videos": [],
            "is_draft": False,
        }
        r = s.post(f"{API}/applications",
                   headers=H(phone_user["token"]), json=body, timeout=30)
        # If user already applied previously (from earlier iterations) we get 400.
        # Retry by listing existing applications and pick one for this event.
        if r.status_code == 400:
            mine = s.get(f"{API}/applications/mine",
                         headers=H(phone_user["token"])).json()
            apps = [a for a in mine if a["event_id"] == first_event_id]
            assert apps, f"Duplicate but no existing app found: {r.text}"
            app = apps[0]
        else:
            assert r.status_code == 200, f"{r.status_code} {r.text}"
            app = r.json()
            assert app["status"] == "applied"
            assert app["payment_status"] in ("pending", "free")

        # Now create payment order — expect REAL Razorpay order (mock=False)
        r2 = s.post(f"{API}/payments/create-order",
                    headers=H(phone_user["token"]),
                    json={"application_id": app["id"]}, timeout=30)
        assert r2.status_code == 200, f"create-order failed: {r2.status_code} {r2.text}"
        data = r2.json()
        # Fee should be > 0 for the picked paid event
        assert data.get("amount", 0) > 0, f"Expected paid event; got {data}"
        assert data.get("mock") is False, (
            f"Expected mock=False (real Razorpay test keys configured), got {data}"
        )
        assert isinstance(data.get("order_id"), str)
        assert data["order_id"].startswith("order_"), (
            f"Expected real Razorpay order_id starting with 'order_', got "
            f"{data.get('order_id')}"
        )
        # IMPORTANT: do NOT call /payments/verify — fake signature would fail by design.


# ============================================================
# 6) Admin endpoints regression
# ============================================================
class TestAdminEndpoints:
    def test_admin_applications_list(self, s, admin_token):
        r = s.get(f"{API}/applications", headers=H(admin_token), timeout=20)
        # /api/applications (admin scope) returns all applications
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        assert isinstance(r.json(), list)

    def test_admin_users_list(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=H(admin_token), timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        users = r.json()
        assert isinstance(users, list)
        assert any(u.get("email") == ADMIN_EMAIL for u in users)
        # ensure no leak
        for u in users:
            assert "password_hash" not in u

    def test_admin_analytics_still_ok(self, s, admin_token):
        r = s.get(f"{API}/admin/analytics", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        for k in ("users", "events", "applications", "by_status", "revenue_paise"):
            assert k in r.json()
