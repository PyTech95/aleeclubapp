"""
Iteration 6 — Verify /api/admin/users aggregation optimization.

Focus: the /admin/users endpoint was refactored from N+1 count_documents loop
to a single MongoDB aggregation. This test file:
  1. Logs in as admin (regression + JWT check).
  2. Creates 3 fresh TEST_ users via /auth/register.
  3. For each user, creates a mix of applications:
       * user A: 2 non-draft apps, 1 of them marked paid via /payments/verify (mock)
       * user B: 1 non-draft app (unpaid) + 1 draft (must NOT count)
       * user C: 0 apps (edge case → expect 0/0)
  4. Calls GET /api/admin/users and asserts application_count / paid_count
     are correct integers for each of the three users.
  5. Regression: /admin/users/{uid}, /admin/analytics still work.
  6. Regression: non-admin cannot hit /admin/users.
"""
import os
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@aleeclub.com"
ADMIN_PASSWORD = "Admin@123"


# ---------------- fixtures ----------------

@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data.get("user", {}).get("role") == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def any_event(http):
    r = http.get(f"{API}/events")
    assert r.status_code == 200, f"events list failed: {r.text}"
    events = r.json()
    if not events:
        pytest.skip("No events available to apply against")
    # Prefer a paid event so we can also test paid_count meaningfully
    paid = [e for e in events if int(e.get("fee") or 0) > 0 or int(e.get("early_bird_fee") or 0) > 0]
    return (paid[0] if paid else events[0])


def _register(http, tag):
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_agg_{tag}_{suffix}@example.com"
    body = {
        "name": f"TEST Agg {tag}",
        "email": email,
        "password": "Passw0rd!",
        "phone": f"+9198{uuid.uuid4().int % 100000000:08d}",
        "city": "Mumbai",
    }
    r = http.post(f"{API}/auth/register", json=body)
    assert r.status_code == 200, f"register {tag} failed: {r.status_code} {r.text}"
    d = r.json()
    return d["token"], d["user"]


def _apply(http, token, event, *, is_draft=False):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "event_id": event["id"],
        "full_name": "TEST Applicant",
        "age": 22,
        "gender": "any",
        "city": "Mumbai",
        "phone": "+919999000111",
        "height_cm": 170,
        "bio": "TEST bio",
        "achievements": "",
        "photos": [],
        "videos": [],
        "id_document": None,
        "is_draft": is_draft,
    }
    r = http.post(f"{API}/applications", json=payload, headers=headers)
    assert r.status_code == 200, f"create app failed: {r.status_code} {r.text}"
    return r.json()


def _mark_paid(http, token, application_id):
    """Mark an app as paid via mock payment verify."""
    headers = {"Authorization": f"Bearer {token}"}
    r = http.post(
        f"{API}/payments/verify",
        json={"application_id": application_id, "mock": True},
        headers=headers,
    )
    assert r.status_code == 200, f"payment verify failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("verified") is True


@pytest.fixture(scope="session")
def seeded_users(http, any_event):
    """Create three users A / B / C with different application patterns."""
    a_tok, a_user = _register(http, "A")
    b_tok, b_user = _register(http, "B")
    c_tok, c_user = _register(http, "C")

    # User A: 1 non-draft, marked paid (paid event)
    # NB: our uniqueness check blocks 2 non-draft apps on the *same* event, so we
    # only create ONE non-draft per user against a single event. That's fine —
    # the aggregation just needs correct counts, not a specific number > 1.
    a_app1 = _apply(http, a_tok, any_event, is_draft=False)
    # only mark paid if event actually has a fee > 0 (otherwise payment_status=='free')
    if int(any_event.get("fee") or 0) > 0 or int(any_event.get("early_bird_fee") or 0) > 0:
        _mark_paid(http, a_tok, a_app1["id"])
        a_expected_paid = 1
    else:
        a_expected_paid = 0
    # Add a draft for user A too — must NOT count in application_count
    _apply(http, a_tok, any_event, is_draft=True)
    a_expected_apps = 1  # drafts excluded

    # User B: 1 non-draft (unpaid) + 1 draft
    _apply(http, b_tok, any_event, is_draft=False)
    _apply(http, b_tok, any_event, is_draft=True)
    b_expected_apps = 1
    b_expected_paid = 0

    # User C: no applications at all → edge case for aggregation ($lookup miss)
    c_expected_apps = 0
    c_expected_paid = 0

    return {
        "A": {"user": a_user, "token": a_tok, "apps": a_expected_apps, "paid": a_expected_paid},
        "B": {"user": b_user, "token": b_tok, "apps": b_expected_apps, "paid": b_expected_paid},
        "C": {"user": c_user, "token": c_tok, "apps": c_expected_apps, "paid": c_expected_paid},
    }


# ---------------- tests ----------------

class TestAdminAuth:
    """Sanity: admin can log in and receives role=admin JWT."""

    def test_admin_login_returns_admin_role(self, http, admin_token):
        r = http.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        me = r.json()
        assert me.get("role") == "admin"
        assert me.get("email") == ADMIN_EMAIL


class TestAdminUsersAggregation:
    """Core: /admin/users returns correct application_count + paid_count per user."""

    def test_admin_users_returns_list_with_counts(self, http, admin_token, seeded_users):
        r = http.get(f"{API}/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list) and len(items) > 0

        # Every user must have both integer fields — this is the API contract
        # the aggregation must not break.
        for it in items:
            assert "application_count" in it, f"missing application_count for {it.get('email')}"
            assert "paid_count" in it, f"missing paid_count for {it.get('email')}"
            assert isinstance(it["application_count"], int), \
                f"application_count not int for {it.get('email')}: {type(it['application_count'])}"
            assert isinstance(it["paid_count"], int), \
                f"paid_count not int for {it.get('email')}: {type(it['paid_count'])}"
            assert it["application_count"] >= 0
            assert it["paid_count"] >= 0
            # paid_count is a subset of application_count (paid apps are non-draft)
            assert it["paid_count"] <= it["application_count"], \
                f"paid_count > application_count for {it.get('email')}"

    def test_seeded_users_have_expected_counts(self, http, admin_token, seeded_users):
        r = http.get(f"{API}/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        by_id = {u["id"]: u for u in r.json()}

        for tag, meta in seeded_users.items():
            uid = meta["user"]["id"]
            assert uid in by_id, f"seeded user {tag} ({uid}) missing from /admin/users"
            row = by_id[uid]
            assert row["application_count"] == meta["apps"], (
                f"user {tag} ({row.get('email')}): expected application_count="
                f"{meta['apps']} got {row['application_count']}"
            )
            assert row["paid_count"] == meta["paid"], (
                f"user {tag} ({row.get('email')}): expected paid_count="
                f"{meta['paid']} got {row['paid_count']}"
            )

    def test_edge_case_zero_apps_user(self, http, admin_token, seeded_users):
        """User C has no applications — aggregation must still return 0/0."""
        r = http.get(f"{API}/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        by_id = {u["id"]: u for u in r.json()}
        c_uid = seeded_users["C"]["user"]["id"]
        row = by_id[c_uid]
        assert row["application_count"] == 0
        assert row["paid_count"] == 0

    def test_no_mongo_id_leak(self, http, admin_token):
        r = http.get(f"{API}/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        for it in r.json():
            assert "_id" not in it, "MongoDB _id leaked in /admin/users response"
            # Sensitive fields must also stay excluded
            assert "password_hash" not in it


class TestAdminRegressions:
    """Adjacent admin endpoints must still function."""

    def test_admin_user_detail(self, http, admin_token, seeded_users):
        uid = seeded_users["A"]["user"]["id"]
        r = http.get(f"{API}/admin/users/{uid}", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "user" in body and body["user"]["id"] == uid
        assert isinstance(body.get("applications"), list)
        assert isinstance(body.get("payments"), list)
        assert isinstance(body.get("certificates"), list)
        # applications returned here should match aggregation count (drafts included in raw list)
        non_draft = [a for a in body["applications"] if not a.get("is_draft")]
        assert len(non_draft) == seeded_users["A"]["apps"], (
            f"detail non-draft app count {len(non_draft)} does not match aggregation "
            f"application_count {seeded_users['A']['apps']}"
        )

    def test_admin_user_detail_404(self, http, admin_token):
        r = http.get(f"{API}/admin/users/nonexistent-uid-xyz",
                     headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 404

    def test_admin_analytics(self, http, admin_token):
        # NB: review request mentioned /admin/stats but the actual endpoint is /admin/analytics
        r = http.get(f"{API}/admin/analytics", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("users", "events", "applications", "by_status", "revenue_paise"):
            assert k in data, f"missing key {k} in analytics response"
        assert isinstance(data["users"], int)
        assert isinstance(data["applications"], int)
        assert isinstance(data["revenue_paise"], int)

    def test_non_admin_cannot_list_users(self, http, seeded_users):
        # Log in as one of the participants and confirm 403
        tok = seeded_users["B"]["token"]
        r = http.get(f"{API}/admin/users", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 403, f"expected 403 for participant, got {r.status_code}"


# ---------------- teardown ----------------

@pytest.fixture(scope="session", autouse=True)
def cleanup(request, http):
    """Best-effort cleanup: after the whole session, admin deletes TEST_ users."""
    yield
    try:
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code != 200:
            return
        tok = r.json()["token"]
        headers = {"Authorization": f"Bearer {tok}"}
        users = http.get(f"{API}/admin/users", headers=headers).json()
        for u in users:
            email = (u.get("email") or "")
            if email.startswith("TEST_agg_"):
                http.delete(f"{API}/admin/users/{u['id']}", headers=headers)
    except Exception:
        pass
