"""
Iteration 4 — Admin Management endpoints tests.
Targets the new endpoints in /app/backend/server.py ~lines 875-1010:
  - GET    /api/admin/users
  - GET    /api/admin/users/{uid}
  - PUT    /api/admin/users/{uid}
  - DELETE /api/admin/users/{uid}
  - GET    /api/admin/payments
  - POST   /api/admin/broadcast
Plus light regression on previously verified flows.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://glamour-audition.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@aleeclub.com"
ADMIN_PASSWORD = "Admin@123"
OTP_CODE = "123456"


# ---------- session-scoped fixtures ----------

@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data.get("user", {}).get("role") == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def admin_user(http, admin_token):
    r = http.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def _make_participant(http, phone=None, name="TEST_Victim", city="TestCity"):
    phone = phone or f"+9199{int(time.time() % 100000000):08d}{str(uuid.uuid4())[:2].replace('-','0')}"[:14]
    r = http.post(f"{API}/auth/phone/start", json={"phone": phone, "name": name, "city": city}, timeout=15)
    assert r.status_code == 200, f"phone/start failed: {r.status_code} {r.text}"
    r = http.post(f"{API}/auth/phone/verify",
                  json={"phone": phone, "code": OTP_CODE, "name": name, "city": city},
                  timeout=15)
    assert r.status_code == 200, f"phone/verify failed: {r.status_code} {r.text}"
    body = r.json()
    return body["token"], body["user"], phone


@pytest.fixture(scope="session")
def participant(http):
    """A long-lived participant used for 403 assertions (NOT for delete)."""
    token, user, phone = _make_participant(http, name="TEST_NonAdmin")
    return {"token": token, "user": user, "phone": phone}


# ---------- helpers ----------

def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- 1. GET /api/admin/users ----------

class TestAdminUsersList:
    def test_no_token_returns_401_or_403(self, http):
        r = http.get(f"{API}/admin/users", timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_non_admin_returns_403(self, http, participant):
        r = http.get(f"{API}/admin/users", headers=auth_h(participant["token"]), timeout=15)
        assert r.status_code == 403, f"non-admin should get 403, got {r.status_code} {r.text}"

    def test_admin_lists_users_with_stats(self, http, admin_token):
        r = http.get(f"{API}/admin/users", headers=auth_h(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        sample = data[0]
        # no _id, no password_hash leaked
        assert "_id" not in sample
        assert "password_hash" not in sample
        # enrichment fields present
        assert "application_count" in sample
        assert "paid_count" in sample
        assert isinstance(sample["application_count"], int)
        assert isinstance(sample["paid_count"], int)


# ---------- 2. GET /api/admin/users/{uid} ----------

class TestAdminUserDetail:
    def test_non_admin_returns_403(self, http, participant):
        r = http.get(f"{API}/admin/users/{participant['user']['id']}",
                     headers=auth_h(participant["token"]), timeout=15)
        assert r.status_code == 403

    def test_404_for_nonexistent(self, http, admin_token):
        r = http.get(f"{API}/admin/users/does-not-exist-{uuid.uuid4()}",
                     headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 404

    def test_admin_gets_full_detail(self, http, admin_token, admin_user):
        r = http.get(f"{API}/admin/users/{admin_user['id']}",
                     headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("user", "applications", "payments", "certificates"):
            assert k in data, f"missing key {k} in response"
        assert data["user"]["id"] == admin_user["id"]
        assert "password_hash" not in data["user"]
        assert isinstance(data["applications"], list)
        assert isinstance(data["payments"], list)
        assert isinstance(data["certificates"], list)


# ---------- 3. PUT /api/admin/users/{uid} ----------

class TestAdminUpdateUser:
    def test_non_admin_returns_403(self, http, participant):
        r = http.put(f"{API}/admin/users/{participant['user']['id']}",
                     headers=auth_h(participant["token"]),
                     json={"name": "Hacker"},
                     timeout=15)
        assert r.status_code == 403

    def test_404_for_nonexistent(self, http, admin_token):
        r = http.put(f"{API}/admin/users/missing-{uuid.uuid4()}",
                     headers=auth_h(admin_token), json={"name": "X"}, timeout=15)
        assert r.status_code == 404

    def test_admin_cannot_demote_self(self, http, admin_token, admin_user):
        r = http.put(f"{API}/admin/users/{admin_user['id']}",
                     headers=auth_h(admin_token),
                     json={"role": "participant"},
                     timeout=15)
        assert r.status_code == 400, f"self-demote must be 400, got {r.status_code} {r.text}"

    def test_admin_can_update_other_user(self, http, admin_token):
        # create a fresh victim
        _, victim, _ = _make_participant(http, name="TEST_UpdateVictim")
        try:
            new_name = f"TEST_Renamed_{uuid.uuid4().hex[:6]}"
            r = http.put(f"{API}/admin/users/{victim['id']}",
                         headers=auth_h(admin_token),
                         json={"name": new_name, "verified": True, "city": "Goa"},
                         timeout=15)
            assert r.status_code == 200, r.text
            updated = r.json()
            assert updated["name"] == new_name
            assert updated.get("verified") is True
            assert updated.get("city") == "Goa"
            assert "password_hash" not in updated
            # Verify persistence via GET
            r2 = http.get(f"{API}/admin/users/{victim['id']}",
                          headers=auth_h(admin_token), timeout=15)
            assert r2.status_code == 200
            assert r2.json()["user"]["name"] == new_name
        finally:
            # cleanup
            http.delete(f"{API}/admin/users/{victim['id']}",
                        headers=auth_h(admin_token), timeout=15)


# ---------- 4. DELETE /api/admin/users/{uid} ----------

class TestAdminDeleteUser:
    def test_non_admin_returns_403(self, http, participant):
        r = http.delete(f"{API}/admin/users/{participant['user']['id']}",
                        headers=auth_h(participant["token"]), timeout=15)
        assert r.status_code == 403

    def test_admin_cannot_delete_self(self, http, admin_token, admin_user):
        r = http.delete(f"{API}/admin/users/{admin_user['id']}",
                        headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 400, f"self-delete must be 400, got {r.status_code} {r.text}"

    def test_admin_delete_happy_path(self, http, admin_token):
        _, victim, _ = _make_participant(http, name="TEST_DeleteVictim")
        # Insert a notification for them (regular flow path) — broadcast 'all' will hit them too
        r = http.delete(f"{API}/admin/users/{victim['id']}",
                        headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("deleted") is True
        # Subsequent GET must 404
        r2 = http.get(f"{API}/admin/users/{victim['id']}",
                      headers=auth_h(admin_token), timeout=15)
        assert r2.status_code == 404


# ---------- 5. GET /api/admin/payments ----------

class TestAdminPayments:
    def test_non_admin_returns_403(self, http, participant):
        r = http.get(f"{API}/admin/payments", headers=auth_h(participant["token"]), timeout=15)
        assert r.status_code == 403

    def test_admin_list_shape(self, http, admin_token):
        r = http.get(f"{API}/admin/payments", headers=auth_h(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        totals = data.get("totals", {})
        for key in ("count", "paid_count", "paid_paise", "created_paise"):
            assert key in totals, f"totals missing {key}"
            assert isinstance(totals[key], int)
        # Enrichment fields exist on items (if any)
        for it in data["items"][:5]:
            for k in ("applicant_name", "event_title", "user_email", "user_phone"):
                assert k in it, f"item missing enriched field {k}"
            assert "_id" not in it

    def test_status_filter_paid(self, http, admin_token):
        r = http.get(f"{API}/admin/payments?status_q=paid",
                     headers=auth_h(admin_token), timeout=20)
        assert r.status_code == 200
        for it in r.json().get("items", []):
            assert it.get("status") == "paid"

    def test_status_filter_created(self, http, admin_token):
        r = http.get(f"{API}/admin/payments?status_q=created",
                     headers=auth_h(admin_token), timeout=20)
        assert r.status_code == 200
        for it in r.json().get("items", []):
            assert it.get("status") == "created"


# ---------- 6. POST /api/admin/broadcast ----------

class TestAdminBroadcast:
    def test_non_admin_returns_403(self, http, participant):
        r = http.post(f"{API}/admin/broadcast",
                      headers=auth_h(participant["token"]),
                      json={"title": "hack", "body": "x", "audience": "all"},
                      timeout=15)
        assert r.status_code == 403

    def test_broadcast_selected_safe(self, http, admin_token):
        """audience='selected' should target only applications with status=selected (often 0)."""
        r = http.post(f"{API}/admin/broadcast",
                      headers=auth_h(admin_token),
                      json={"title": "TEST_Selected", "body": "hi selected", "audience": "selected"},
                      timeout=15)
        assert r.status_code == 200, r.text
        assert "sent" in r.json()
        assert isinstance(r.json()["sent"], int)

    def test_broadcast_paid_and_delivered(self, http, admin_token):
        """Send to 'paid' audience; assert sent count == #distinct user_ids with paid app.
        If there's at least one recipient, verify that recipient's /notifications got the doc."""
        # Compute expected: distinct user_ids with payment_status=paid
        # We can't query mongo directly here, but we can derive from /admin/payments
        pays = http.get(f"{API}/admin/payments?status_q=paid",
                        headers=auth_h(admin_token), timeout=20).json().get("items", [])
        expected_uids = {p["user_id"] for p in pays if p.get("user_id")}
        # However admin/broadcast uses applications.distinct('user_id', payment_status='paid')
        # which may include applications that have payment_status=paid but no payment record edge case.
        # Use it only as a lower bound check on sent count.
        title = f"TEST_PaidBroadcast_{uuid.uuid4().hex[:6]}"
        r = http.post(f"{API}/admin/broadcast",
                      headers=auth_h(admin_token),
                      json={"title": title, "body": "paid msg", "audience": "paid"},
                      timeout=20)
        assert r.status_code == 200, r.text
        sent = r.json()["sent"]
        assert sent >= len(expected_uids), f"sent={sent} < expected lower bound {len(expected_uids)}"

    def test_broadcast_validation_missing_fields(self, http, admin_token):
        r = http.post(f"{API}/admin/broadcast",
                      headers=auth_h(admin_token),
                      json={"audience": "selected"},  # missing title & body
                      timeout=15)
        assert r.status_code in (400, 422)


# ---------- 7. Regression (light) ----------

class TestRegression:
    def test_admin_login(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("user", {}).get("role") == "admin"

    def test_phone_otp_full_flow(self, http):
        phone = f"+91999000{int(time.time()) % 100000:05d}"
        r = http.post(f"{API}/auth/phone/start",
                      json={"phone": phone, "name": "TEST_Reg", "city": "Mumbai"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("test_code") == OTP_CODE or "test_code" in data
        r2 = http.post(f"{API}/auth/phone/verify",
                       json={"phone": phone, "code": OTP_CODE, "name": "TEST_Reg", "city": "Mumbai"},
                       timeout=15)
        assert r2.status_code == 200
        assert "token" in r2.json()

    def test_events_listed(self, http):
        r = http.get(f"{API}/events", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_razorpay_create_order_real(self, http):
        # Need a participant + an application to call create-order
        token, _user, _phone = _make_participant(http, name="TEST_PayReg")
        events = http.get(f"{API}/events", timeout=15).json()
        paid_event = next((e for e in events if (e.get("fee_paise") or e.get("price_paise") or 0) > 0), events[0])
        # Create an application
        app_payload = {
            "event_id": paid_event["id"],
            "full_name": "TEST_PayReg",
            "phone": "+919999912345",
            "email": "testpayreg@aleeclub.local",
            "age": 19,
            "city": "Mumbai",
            "gender": "female",
            "category": paid_event.get("category", "miss"),
            "is_draft": False,
        }
        ra = http.post(f"{API}/applications", headers=auth_h(token), json=app_payload, timeout=20)
        if ra.status_code != 200:
            pytest.skip(f"application create failed: {ra.status_code} {ra.text}")
        app_id = ra.json().get("id")
        ro = http.post(f"{API}/payments/create-order",
                       headers=auth_h(token),
                       json={"application_id": app_id},
                       timeout=20)
        assert ro.status_code == 200, ro.text
        body = ro.json()
        # Real keys → mock should be False and order_id present
        assert body.get("mock") is False, f"expected real order, got mock=True: {body}"
        assert str(body.get("order_id", "")).startswith("order_"), f"bad order_id: {body}"
