"""
Iteration 5 — Email/Password auth + forgot/reset password tests.

Targets the new/updated endpoints in /app/backend/server.py:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password
  - Apple App Review seed: appreview@aleeclub.com / AleeReview@2026
Plus a thin regression pass covering:
  - POST /api/auth/phone/start + verify (OTP 123456)
  - GET  /api/auth/me
  - Admin login + admin-only endpoints (/admin/users, /admin/payments) auth-gating
  - GET  /api/events
  - POST /api/applications + POST /api/payments/create-order (Razorpay real order)
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
APPLE_REVIEW_EMAIL = "appreview@aleeclub.com"
APPLE_REVIEW_PASSWORD = "AleeReview@2026"
OTP_CODE = "123456"


# ---------- fixtures ----------

@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def unique_email():
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture(scope="session")
def unique_phone():
    # 10-digit-ish phone that won't collide with seed/regression flows
    return f"+9198{int(time.time()) % 10000000:07d}"


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# =================================================================
# 1. POST /api/auth/register
# =================================================================
class TestRegister:
    def test_register_with_full_payload(self, http, unique_email, unique_phone):
        payload = {
            "name": "TEST_RegUser",
            "email": unique_email,
            "password": "StrongPass@123",
            "phone": unique_phone,
            "city": "Pune",
        }
        r = http.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 20
        u = body["user"]
        assert u["email"] == unique_email
        assert u["phone"] == unique_phone
        assert u["city"] == "Pune"
        assert u["name"] == "TEST_RegUser"
        assert u["auth_provider"] == "email"
        assert u["role"] == "participant"
        assert u["verified"] is False
        # no password leakage
        assert "password_hash" not in u
        assert "_id" not in u
        # save for next tests
        pytest.reg_email = unique_email
        pytest.reg_phone = unique_phone
        pytest.reg_password = "StrongPass@123"
        pytest.reg_token = body["token"]
        pytest.reg_user = u

    def test_register_duplicate_email_returns_400(self, http, unique_email, unique_phone):
        payload = {
            "name": "Dup Email",
            "email": unique_email,  # same as previous
            "password": "AnotherPass@123",
            "phone": f"+9197{int(time.time()) % 10000000:07d}",
            "city": "Delhi",
        }
        r = http.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 400, f"expected 400 dup email, got {r.status_code} {r.text}"

    def test_register_duplicate_phone_returns_400(self, http, unique_phone):
        payload = {
            "name": "Dup Phone",
            "email": f"another_{uuid.uuid4().hex[:8]}@example.com",
            "password": "AnotherPass@123",
            "phone": unique_phone,  # same as previous
            "city": "Delhi",
        }
        r = http.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 400, f"expected 400 dup phone, got {r.status_code} {r.text}"

    def test_register_without_phone_or_city_still_works(self, http):
        payload = {
            "name": "TEST_MinReg",
            "email": f"min_{uuid.uuid4().hex[:8]}@example.com",
            "password": "MinPass@123",
        }
        r = http.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 200, f"minimal register failed: {r.status_code} {r.text}"
        u = r.json()["user"]
        assert u["auth_provider"] == "email"
        assert u.get("phone", "") == ""
        assert u.get("city", "") == ""


# =================================================================
# 2. POST /api/auth/login (email/password)
# =================================================================
class TestLogin:
    def test_login_success_with_just_registered(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": pytest.reg_email, "password": pytest.reg_password},
                      timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body
        assert body["user"]["email"] == pytest.reg_email
        assert body["user"]["auth_provider"] == "email"
        assert "password_hash" not in body["user"]

    def test_login_wrong_password_401(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": pytest.reg_email, "password": "WrongPass!!"},
                      timeout=15)
        assert r.status_code == 401, f"expected 401, got {r.status_code} {r.text}"

    def test_login_unknown_email_401(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": f"nope_{uuid.uuid4().hex[:8]}@example.org",
                            "password": "whatever"},
                      timeout=15)
        assert r.status_code == 401


# =================================================================
# 3. Apple Review seed account
# =================================================================
class TestAppleReviewAccount:
    def test_apple_review_login(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": APPLE_REVIEW_EMAIL, "password": APPLE_REVIEW_PASSWORD},
                      timeout=15)
        assert r.status_code == 200, f"Apple review login failed: {r.status_code} {r.text}"
        body = r.json()
        u = body["user"]
        assert u["email"] == APPLE_REVIEW_EMAIL
        assert u["role"] == "participant", f"expected participant got {u['role']}"
        assert u["verified"] is True, "Apple review account must be pre-verified"
        assert "token" in body
        pytest.review_token = body["token"]

    def test_apple_review_me_endpoint(self, http):
        r = http.get(f"{API}/auth/me", headers=auth_h(pytest.review_token), timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["email"] == APPLE_REVIEW_EMAIL
        assert u["verified"] is True


# =================================================================
# 4. POST /api/auth/forgot-password
# =================================================================
class TestForgotPassword:
    def test_forgot_password_known_email_returns_token(self, http):
        r = http.post(f"{API}/auth/forgot-password",
                      json={"email": APPLE_REVIEW_EMAIL}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("sent") is True
        tok = body.get("reset_token")
        assert isinstance(tok, str), f"reset_token must be a string for known email, got {tok!r}"
        assert len(tok) == 8, f"expected 8-char token, got len={len(tok)}: {tok}"
        # hex uppercase: chars from 0-9 and A-F only
        assert all(c in "0123456789ABCDEF" for c in tok), f"expected hex-uppercase, got {tok}"
        assert "message" in body
        pytest.review_reset_token = tok

    def test_forgot_password_unknown_email_returns_200_with_null_token(self, http):
        r = http.post(f"{API}/auth/forgot-password",
                      json={"email": f"unknown_{uuid.uuid4().hex[:8]}@example.org"},
                      timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("sent") is True, "must always return sent:true for privacy"
        assert body.get("reset_token") is None, "unknown email must not get a reset_token"


# =================================================================
# 5. POST /api/auth/reset-password
# =================================================================
NEW_REVIEW_PASSWORD = "AleeReview@2026"  # we will reset to same to keep idempotency


class TestResetPassword:
    def test_reset_password_too_short_400(self, http):
        r = http.post(f"{API}/auth/reset-password",
                      json={"email": APPLE_REVIEW_EMAIL,
                            "reset_token": pytest.review_reset_token,
                            "new_password": "abc"},
                      timeout=15)
        assert r.status_code == 400, f"expected 400 short pw, got {r.status_code} {r.text}"

    def test_reset_password_wrong_token_400(self, http):
        r = http.post(f"{API}/auth/reset-password",
                      json={"email": APPLE_REVIEW_EMAIL,
                            "reset_token": "00000000",
                            "new_password": "ValidPass@1"},
                      timeout=15)
        assert r.status_code == 400

    def test_reset_password_success(self, http):
        # Use a temporary password, then immediately set it back to the
        # documented Apple Review password so the seeded account credentials
        # in /app/memory/test_credentials.md remain valid for other tests.
        temp_pw = f"Reset{uuid.uuid4().hex[:6]}@99"
        r = http.post(f"{API}/auth/reset-password",
                      json={"email": APPLE_REVIEW_EMAIL,
                            "reset_token": pytest.review_reset_token,
                            "new_password": temp_pw},
                      timeout=15)
        assert r.status_code == 200, r.text
        # verify login with the new password works
        r2 = http.post(f"{API}/auth/login",
                       json={"email": APPLE_REVIEW_EMAIL, "password": temp_pw}, timeout=15)
        assert r2.status_code == 200, f"login with new pw failed: {r2.text}"

        # try reusing the same reset_token — must be 400 (used)
        r3 = http.post(f"{API}/auth/reset-password",
                       json={"email": APPLE_REVIEW_EMAIL,
                             "reset_token": pytest.review_reset_token,
                             "new_password": "AnotherPass@123"},
                       timeout=15)
        assert r3.status_code == 400, f"expected 400 reused token, got {r3.status_code} {r3.text}"

        # ---- restore the documented Apple Review password ----
        r4 = http.post(f"{API}/auth/forgot-password",
                       json={"email": APPLE_REVIEW_EMAIL}, timeout=15)
        assert r4.status_code == 200
        restore_token = r4.json().get("reset_token")
        assert restore_token, "could not get fresh reset token to restore credentials"
        r5 = http.post(f"{API}/auth/reset-password",
                       json={"email": APPLE_REVIEW_EMAIL,
                             "reset_token": restore_token,
                             "new_password": APPLE_REVIEW_PASSWORD},
                       timeout=15)
        assert r5.status_code == 200, f"could not restore review pw: {r5.text}"
        r6 = http.post(f"{API}/auth/login",
                       json={"email": APPLE_REVIEW_EMAIL,
                             "password": APPLE_REVIEW_PASSWORD}, timeout=15)
        assert r6.status_code == 200, f"restored pw login failed: {r6.text}"


# =================================================================
# 6. REGRESSION — phone OTP
# =================================================================
PHONE_REG = "+919999777666"


class TestPhoneOTPRegression:
    def test_phone_start(self, http):
        r = http.post(f"{API}/auth/phone/start",
                      json={"phone": PHONE_REG, "name": "Phone User", "city": "Pune"},
                      timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("sent") is True

    def test_phone_verify(self, http):
        r = http.post(f"{API}/auth/phone/verify",
                      json={"phone": PHONE_REG, "code": OTP_CODE,
                            "name": "Phone User", "city": "Pune"},
                      timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body
        assert body["user"]["phone"] == PHONE_REG
        pytest.phone_token = body["token"]
        pytest.phone_user = body["user"]

    def test_me_with_phone_jwt(self, http):
        r = http.get(f"{API}/auth/me", headers=auth_h(pytest.phone_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["phone"] == PHONE_REG


# =================================================================
# 7. REGRESSION — admin login + admin-gated endpoints
# =================================================================
class TestAdminRegression:
    def test_admin_login(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "admin"
        pytest.admin_token = body["token"]

    def test_admin_users_admin_only(self, http):
        r = http.get(f"{API}/admin/users", headers=auth_h(pytest.admin_token), timeout=20)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_admin_users_non_admin_forbidden(self, http):
        r = http.get(f"{API}/admin/users", headers=auth_h(pytest.phone_token), timeout=20)
        assert r.status_code == 403, f"expected 403 for non-admin, got {r.status_code}"

    def test_admin_payments_admin_only(self, http):
        r = http.get(f"{API}/admin/payments", headers=auth_h(pytest.admin_token), timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        # endpoint shape: {items, count, paid_count, ...} — be permissive
        assert isinstance(body, dict) or isinstance(body, list)

    def test_admin_payments_non_admin_forbidden(self, http):
        r = http.get(f"{API}/admin/payments", headers=auth_h(pytest.phone_token), timeout=20)
        assert r.status_code == 403


# =================================================================
# 8. REGRESSION — events list
# =================================================================
class TestEventsRegression:
    def test_events_at_least_one(self, http):
        r = http.get(f"{API}/events", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        pytest.first_event = items[0]


# =================================================================
# 9. REGRESSION — phone user creates application + Razorpay order
# =================================================================
class TestPaymentsRegression:
    def test_create_application(self, http):
        # Try to reuse an existing application for the phone user (the phone
        # number is fixed and may have been used across earlier iterations,
        # so a fresh /applications POST can be rejected with "already applied").
        r0 = http.get(f"{API}/applications/mine", headers=auth_h(pytest.phone_token), timeout=20)
        existing = []
        if r0.status_code == 200:
            existing = r0.json() or []
        if existing:
            pytest.app_id = existing[0]["id"]
            return
        event = pytest.first_event
        payload = {
            "event_id": event["id"],
            "full_name": "TEST_PhoneApplicant",
            "age": 22,
            "gender": "female" if event.get("gender") in (None, "any", "female") else "male",
            "city": "Pune",
            "phone": PHONE_REG,
            "height_cm": 165,
            "bio": "regression",
            "achievements": "",
            "photos": [],
            "videos": [],
            "is_draft": False,
        }
        r = http.post(f"{API}/applications",
                      headers=auth_h(pytest.phone_token),
                      json=payload, timeout=20)
        assert r.status_code in (200, 201), f"create app failed: {r.status_code} {r.text}"
        body = r.json()
        assert "id" in body
        pytest.app_id = body["id"]

    def test_create_razorpay_order(self, http):
        r = http.post(f"{API}/payments/create-order",
                      headers=auth_h(pytest.phone_token),
                      json={"application_id": pytest.app_id}, timeout=30)
        assert r.status_code == 200, f"create-order failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("mock") is False, f"mock should be False with real Razorpay keys: {body}"
        order_id = body.get("order_id") or body.get("razorpay_order_id") or body.get("id")
        assert isinstance(order_id, str) and order_id.startswith("order_"), \
            f"expected real Razorpay order_id starting 'order_', got {body}"
