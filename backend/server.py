from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
import hmac
import hashlib
import base64
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- Config ----------------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@aleeclub.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@123')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Alee Club Talent API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger("alee")


# ---------------- Helpers ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str, exp_days: int = 7) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=exp_days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# ---------------- Models ----------------
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    city: Optional[str] = None
    role: Literal["participant", "admin", "judge"] = "participant"


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordReq(BaseModel):
    email: EmailStr


class ResetPasswordReq(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[int] = None
    city: Optional[str] = None
    category: Optional[str] = None
    bio: Optional[str] = None
    achievements: Optional[str] = None
    profile_photo: Optional[str] = None  # base64
    cover_photo: Optional[str] = None  # base64
    portfolio_photos: Optional[List[str]] = None
    portfolio_videos: Optional[List[str]] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None


class EventCreate(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    description: str
    category: str  # miss-teen, mr-india, kids, etc
    city: str
    venue: str
    min_age: int = 13
    max_age: int = 30
    gender: Literal["male", "female", "any"] = "any"
    fee: int = 0  # in INR paise (regular)
    early_bird_fee: int = 0  # paise; 0 = no early bird
    early_bird_deadline: Optional[str] = ""  # ISO date; applies if today <= this date
    start_date: str  # ISO
    end_date: str
    application_deadline: str
    banner_image: Optional[str] = ""  # URL or base64
    eligibility: Optional[str] = ""
    prizes: Optional[str] = ""
    status: Literal["upcoming", "open", "closed", "completed"] = "open"


class ApplicationCreate(BaseModel):
    event_id: str
    full_name: str
    age: int
    gender: str
    city: str
    phone: str
    height_cm: Optional[int] = None
    bio: Optional[str] = ""
    achievements: Optional[str] = ""
    photos: List[str] = []  # base64
    videos: List[str] = []  # base64 (can be empty, videos are heavy)
    id_document: Optional[str] = None  # base64
    is_draft: bool = False


class ApplicationUpdateStatus(BaseModel):
    status: Literal["applied", "under_review", "shortlisted", "selected", "rejected"]
    feedback: Optional[str] = ""


class PaymentOrderReq(BaseModel):
    application_id: str


class PaymentVerifyReq(BaseModel):
    application_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    mock: bool = False


class AIScoreReq(BaseModel):
    include_profile: bool = True


class PhoneStartReq(BaseModel):
    phone: str
    name: Optional[str] = ""
    city: Optional[str] = ""


class PhoneVerifyReq(BaseModel):
    phone: str
    code: str
    name: Optional[str] = ""
    city: Optional[str] = ""


# Mock OTP storage — accepts code "123456" universally for testing
_OTP_FIXED = "123456"


class GoogleAuthReq(BaseModel):
    credential: str  # Google idToken from @react-native-google-signin/google-signin


@api.post("/auth/google")
async def google_auth(body: GoogleAuthReq):
    """
    Verify a Google idToken received from the native Google Sign-In SDK
    (@react-native-google-signin/google-signin) and issue our app JWT.

    Accepted audiences: any of our configured Google OAuth client IDs
    (Web / Android / iOS) — set in backend/.env.
    """
    token_str = (body.credential or "").strip()
    if not token_str:
        raise HTTPException(400, "Missing Google credential")

    web_cid = os.environ.get("GOOGLE_WEB_CLIENT_ID", "").strip()
    ios_cid = os.environ.get("GOOGLE_IOS_CLIENT_ID", "").strip()
    android_cid = os.environ.get("GOOGLE_ANDROID_CLIENT_ID", "").strip()
    allowed_audiences = {c for c in (web_cid, ios_cid, android_cid) if c}
    if not allowed_audiences:
        raise HTTPException(500, "Google OAuth client IDs not configured on server")

    # Verify signature + expiry using google-auth. Audience check is manual to allow multi-client.
    try:
        from google.oauth2 import id_token as g_id_token
        from google.auth.transport import requests as g_requests
        req = g_requests.Request()
        # Passing audience=None skips the aud check inside verify_oauth2_token; we check below.
        claims = g_id_token.verify_oauth2_token(token_str, req, audience=None)
    except Exception as e:
        logger.warning(f"Google idToken verify failed: {e}")
        raise HTTPException(401, "Invalid or expired Google token")

    iss = claims.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(401, "Invalid Google token issuer")
    aud = claims.get("aud", "")
    if aud not in allowed_audiences:
        logger.warning(f"Google idToken aud mismatch: {aud}")
        raise HTTPException(401, "Google token audience mismatch")

    email = (claims.get("email") or "").lower().strip()
    email_verified = bool(claims.get("email_verified"))
    name = claims.get("name") or claims.get("given_name") or "Star"
    picture = claims.get("picture") or ""
    if not email:
        raise HTTPException(400, "Google profile missing email")
    if not email_verified:
        raise HTTPException(401, "Google email not verified")

    user = await db.users.find_one({"email": email})
    if not user:
        uid = str(uuid.uuid4())
        doc = {
            "id": uid,
            "name": name,
            "email": email,
            "phone": "",
            "password_hash": hash_password(uuid.uuid4().hex),
            "role": "participant",
            "verified": True,
            "age": None, "height_cm": None,
            "city": "", "category": "", "bio": "", "achievements": "",
            "profile_photo": picture, "cover_photo": "",
            "portfolio_photos": [], "portfolio_videos": [],
            "social_instagram": "", "social_youtube": "",
            "auth_provider": "google",
            "referral_code": f"ALEE{uuid.uuid4().hex[:6].upper()}",
            "referred_by": "",
            "created_at": now_iso(),
        }
        await db.users.insert_one(doc)
        user = doc
    else:
        upd = {}
        if picture and not user.get("profile_photo"):
            upd["profile_photo"] = picture
        if name and not user.get("name"):
            upd["name"] = name
        if not user.get("auth_provider"):
            upd["auth_provider"] = "google"
        if upd:
            await db.users.update_one({"id": user["id"]}, {"$set": upd})
            user.update(upd)

    token = create_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


@api.post("/auth/phone/start")
async def phone_start(body: PhoneStartReq):
    """Mock OTP send — always returns success. Code is fixed at 123456 for test."""
    phone = body.phone.strip()
    if not phone or len(phone) < 6:
        raise HTTPException(400, "Invalid phone number")
    return {"sent": True, "test_code": _OTP_FIXED, "message": "OTP sent (test mode: use 123456)"}


@api.post("/auth/phone/verify")
async def phone_verify(body: PhoneVerifyReq):
    if body.code.strip() != _OTP_FIXED:
        raise HTTPException(401, "Invalid OTP. Use 123456 for test.")
    phone = body.phone.strip()
    # Find or create user keyed by phone (use phone@aleeclub.local as email for uniqueness)
    pseudo_email = f"{phone}@phone.aleeclub.local"
    user = await db.users.find_one({"phone": phone})
    if not user:
        uid = str(uuid.uuid4())
        doc = {
            "id": uid,
            "name": body.name or f"Star {phone[-4:]}",
            "email": pseudo_email,
            "phone": phone,
            "password_hash": hash_password(uuid.uuid4().hex),
            "role": "participant",
            "verified": True,
            "age": None, "height_cm": None,
            "city": body.city or "",
            "category": "", "bio": "", "achievements": "",
            "profile_photo": "", "cover_photo": "",
            "portfolio_photos": [], "portfolio_videos": [],
            "social_instagram": "", "social_youtube": "",
            "created_at": now_iso(),
        }
        await db.users.insert_one(doc)
        user = doc
    else:
        # update name/city if provided
        upd = {}
        if body.name and not user.get("name"): upd["name"] = body.name
        if body.city and not user.get("city"): upd["city"] = body.city
        if upd:
            await db.users.update_one({"id": user["id"]}, {"$set": upd})
            user.update(upd)
    token = create_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


# ---------------- Auth ----------------
@api.post("/auth/register")
async def register(body: RegisterReq):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")
    # Also check phone uniqueness if provided
    if body.phone:
        existing_phone = await db.users.find_one({"phone": body.phone})
        if existing_phone:
            raise HTTPException(400, "Phone number already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "name": body.name,
        "email": email,
        "phone": body.phone or "",
        "password_hash": hash_password(body.password),
        "role": body.role if body.role != "admin" else "participant",  # cannot self-register as admin
        "verified": False,
        "age": None,
        "height_cm": None,
        "city": body.city or "",
        "category": "",
        "bio": "",
        "achievements": "",
        "profile_photo": "",
        "cover_photo": "",
        "portfolio_photos": [],
        "portfolio_videos": [],
        "social_instagram": "",
        "social_youtube": "",
        "auth_provider": "email",
        "referral_code": f"ALEE{uuid.uuid4().hex[:6].upper()}",
        "referred_by": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(uid, doc["role"])
    doc.pop("password_hash")
    doc.pop("_id", None)
    return {"token": token, "user": doc}


@api.post("/auth/login")
async def login(body: LoginReq):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordReq):
    """
    Generate a password-reset token for the given email.
    For MVP we return the token directly in the response (the frontend shows it
    in a confirmation screen). In production this token should be emailed and
    the response should always return a generic success message regardless of
    whether the email exists.
    """
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    # Always behave the same way regardless of whether the user exists, to avoid
    # leaking which emails are registered — but for MVP we surface the token so
    # the user can complete the reset flow without an email server.
    if not user:
        return {"sent": True, "reset_token": None, "message": "If this email is registered, a reset code has been generated."}
    token = uuid.uuid4().hex[:8].upper()
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"email": email, "token": token, "created_at": now_iso(), "used": False}},
        upsert=True,
    )
    logger.info(f"[forgot-password] reset_token={token} for {email}")
    return {"sent": True, "reset_token": token, "message": "Reset code generated. Use it on the reset screen."}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordReq):
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    email = body.email.lower()
    rec = await db.password_resets.find_one({"email": email, "token": body.reset_token.strip().upper(), "used": False})
    if not rec:
        raise HTTPException(400, "Invalid or expired reset code")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_resets.update_one({"_id": rec["_id"]}, {"$set": {"used": True, "used_at": now_iso()}})
    return {"reset": True, "message": "Password updated. Please log in with your new password."}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.put("/users/me")
async def update_me(body: UserUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


# ---------------- Events ----------------
@api.get("/events")
async def list_events(city: Optional[str] = None, category: Optional[str] = None, gender: Optional[str] = None):
    q = {}
    if city:
        q["city"] = {"$regex": city, "$options": "i"}
    if category:
        q["category"] = category
    if gender and gender != "any":
        q["gender"] = {"$in": [gender, "any"]}
    items = await db.events.find(q, {"_id": 0}).sort("start_date", 1).to_list(500)
    return items


@api.get("/events/{event_id}")
async def get_event(event_id: str):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    return ev


@api.post("/events")
async def create_event(body: EventCreate, user: dict = Depends(require_admin)):
    eid = str(uuid.uuid4())
    doc = {"id": eid, **body.dict(), "created_at": now_iso()}
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/events/{event_id}")
async def update_event(event_id: str, body: EventCreate, user: dict = Depends(require_admin)):
    await db.events.update_one({"id": event_id}, {"$set": body.dict()})
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Event not found")
    return ev


@api.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(require_admin)):
    await db.events.delete_one({"id": event_id})
    return {"ok": True}


# ---------------- Applications ----------------
def _effective_fee(event: dict) -> tuple[int, bool]:
    """Returns (fee_paise, is_early_bird) based on early_bird_deadline vs today."""
    eb_fee = int(event.get("early_bird_fee") or 0)
    eb_deadline = (event.get("early_bird_deadline") or "").strip()
    regular = int(event.get("fee") or 0)
    if eb_fee > 0 and eb_deadline:
        try:
            deadline_d = datetime.fromisoformat(eb_deadline[:10]).date()
            today = datetime.now(timezone.utc).date()
            if today <= deadline_d:
                return eb_fee, True
        except Exception:
            pass
    return regular, False


@api.post("/applications")
async def create_application(body: ApplicationCreate, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": body.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(404, "Event not found")
    # prevent duplicate non-draft applications
    existing = await db.applications.find_one({
        "user_id": user["id"], "event_id": body.event_id, "is_draft": False
    })
    if existing and not body.is_draft:
        raise HTTPException(400, "You've already applied to this event")

    effective_fee, is_eb = _effective_fee(event)
    aid = str(uuid.uuid4())
    doc = {
        "id": aid,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "event_id": body.event_id,
        "event_title": event.get("title", ""),
        "full_name": body.full_name,
        "age": body.age,
        "gender": body.gender,
        "city": body.city,
        "phone": body.phone,
        "height_cm": body.height_cm,
        "bio": body.bio,
        "achievements": body.achievements,
        "photos": body.photos,
        "videos": body.videos,
        "id_document": body.id_document or "",
        "is_draft": body.is_draft,
        "status": "draft" if body.is_draft else "applied",
        "payment_status": "pending" if effective_fee > 0 else "free",
        "feedback": "",
        "fee": effective_fee,
        "is_early_bird": is_eb,
        "timeline": [{"step": "applied", "at": now_iso(), "note": "Application submitted"}] if not body.is_draft else [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.applications.insert_one(doc)
    # notification
    if not body.is_draft:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "title": "Application submitted",
            "body": f"Your application for {event.get('title')} is received.",
            "type": "status",
            "read": False,
            "created_at": now_iso(),
        })
    doc.pop("_id", None)
    return doc


@api.get("/applications/mine")
async def my_applications(user: dict = Depends(get_current_user)):
    items = await db.applications.find(
        {"user_id": user["id"]},
        {"_id": 0, "photos": 0, "videos": 0, "id_document": 0}
    ).sort("created_at", -1).to_list(200)
    return items


@api.get("/applications/{app_id}")
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    appd = await db.applications.find_one({"id": app_id}, {"_id": 0})
    if not appd:
        raise HTTPException(404, "Application not found")
    if appd["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    return appd


@api.get("/applications")
async def admin_list_applications(
    status: Optional[str] = None, event_id: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    q = {"is_draft": False}
    if status:
        q["status"] = status
    if event_id:
        q["event_id"] = event_id
    items = await db.applications.find(
        q, {"_id": 0, "photos": 0, "videos": 0, "id_document": 0}
    ).sort("created_at", -1).to_list(500)
    return items


@api.put("/applications/{app_id}/status")
async def update_application_status(app_id: str, body: ApplicationUpdateStatus, user: dict = Depends(require_admin)):
    appd = await db.applications.find_one({"id": app_id})
    if not appd:
        raise HTTPException(404, "Application not found")
    step_map = {
        "under_review": "Screening in progress",
        "shortlisted": "Shortlisted for next round",
        "selected": "Selected — Congratulations!",
        "rejected": "Application not selected",
        "applied": "Application received",
    }
    new_entry = {"step": body.status, "at": now_iso(), "note": body.feedback or step_map.get(body.status, "")}
    await db.applications.update_one(
        {"id": app_id},
        {"$set": {"status": body.status, "feedback": body.feedback or "", "updated_at": now_iso()},
         "$push": {"timeline": new_entry}}
    )
    # notify user
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": appd["user_id"],
        "title": f"Status update: {body.status.replace('_', ' ').title()}",
        "body": body.feedback or step_map.get(body.status, ""),
        "type": "status",
        "read": False,
        "created_at": now_iso(),
    })
    updated = await db.applications.find_one({"id": app_id}, {"_id": 0})
    return updated


# ---------------- Payments (Razorpay) ----------------
@api.post("/payments/create-order")
async def create_payment_order(body: PaymentOrderReq, user: dict = Depends(get_current_user)):
    appd = await db.applications.find_one({"id": body.application_id})
    if not appd:
        raise HTTPException(404, "Application not found")
    if appd["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    amount = int(appd.get("fee", 0))
    if amount <= 0:
        return {"mock": True, "amount": 0, "order_id": None, "key_id": None}

    # If Razorpay keys present, create real order
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        try:
            import razorpay
            rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            order = rz.order.create({
                "amount": amount,
                "currency": "INR",
                "receipt": f"app_{appd['id'][:20]}",
                "payment_capture": 1,
            })
            await db.payments.insert_one({
                "id": str(uuid.uuid4()),
                "application_id": appd["id"],
                "user_id": user["id"],
                "order_id": order["id"],
                "amount": amount,
                "status": "created",
                "created_at": now_iso(),
            })
            return {"mock": False, "amount": amount, "order_id": order["id"], "key_id": RAZORPAY_KEY_ID}
        except Exception as e:
            logger.error(f"Razorpay order failed: {e}")
            raise HTTPException(500, f"Payment gateway error: {e}")

    # Mock mode
    mock_order_id = f"order_mock_{uuid.uuid4().hex[:16]}"
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "application_id": appd["id"],
        "user_id": user["id"],
        "order_id": mock_order_id,
        "amount": amount,
        "status": "created",
        "mock": True,
        "created_at": now_iso(),
    })
    return {"mock": True, "amount": amount, "order_id": mock_order_id, "key_id": "mock"}


@api.post("/payments/verify")
async def verify_payment(body: PaymentVerifyReq, user: dict = Depends(get_current_user)):
    appd = await db.applications.find_one({"id": body.application_id})
    if not appd or appd["user_id"] != user["id"]:
        raise HTTPException(404, "Application not found")

    verified = False
    if body.mock or not (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET):
        verified = True
    else:
        try:
            msg = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
            expected = hmac.new(
                RAZORPAY_KEY_SECRET.encode(),
                msg.encode(),
                hashlib.sha256
            ).hexdigest()
            verified = hmac.compare_digest(expected, body.razorpay_signature or "")
        except Exception as e:
            logger.error(f"Signature verify failed: {e}")
            verified = False

    if not verified:
        raise HTTPException(400, "Payment signature verification failed")

    await db.applications.update_one(
        {"id": body.application_id},
        {"$set": {"payment_status": "paid", "updated_at": now_iso()},
         "$push": {"timeline": {"step": "paid", "at": now_iso(), "note": "Payment successful"}}}
    )
    await db.payments.update_one(
        {"application_id": body.application_id},
        {"$set": {"status": "paid", "payment_id": body.razorpay_payment_id or "mock", "paid_at": now_iso()}}
    )
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "Payment received",
        "body": f"Your payment of ₹{appd.get('fee', 0)/100:.0f} for {appd.get('event_title')} is confirmed.",
        "type": "payment",
        "read": False,
        "created_at": now_iso(),
    })
    return {"ok": True, "verified": True}


@api.get("/payments/mine")
async def my_payments(user: dict = Depends(get_current_user)):
    items = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


# ---------------- Certificates ----------------
@api.get("/certificates/mine")
async def my_certificates(user: dict = Depends(get_current_user)):
    apps = await db.applications.find(
        {"user_id": user["id"], "status": {"$in": ["selected", "shortlisted"]}},
        {"_id": 0, "photos": 0, "videos": 0, "id_document": 0}
    ).to_list(100)
    certs = []
    for a in apps:
        certs.append({
            "application_id": a["id"],
            "event_title": a.get("event_title"),
            "name": a.get("full_name"),
            "status": a.get("status"),
            "issued_at": a.get("updated_at"),
            "verification_id": f"ALEE-{a['id'][:8].upper()}",
        })
    return certs


@api.get("/certificates/{app_id}/pdf")
async def certificate_pdf(app_id: str, user: dict = Depends(get_current_user)):
    """Returns PDF as base64 data URI."""
    appd = await db.applications.find_one({"id": app_id})
    if not appd or appd["user_id"] != user["id"]:
        raise HTTPException(404, "Not found")
    if appd.get("status") not in ("selected", "shortlisted"):
        raise HTTPException(400, "Certificate not available yet")

    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor
    from io import BytesIO
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    W, H = landscape(A4)
    # background
    c.setFillColor(HexColor("#050505"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # gold border
    c.setStrokeColor(HexColor("#D4AF37"))
    c.setLineWidth(4)
    c.rect(30, 30, W - 60, H - 60)
    c.setLineWidth(1)
    c.rect(45, 45, W - 90, H - 90)

    c.setFillColor(HexColor("#D4AF37"))
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W / 2, H - 90, "ALEE CLUB")
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 110, "TALENT DISCOVERY PLATFORM")

    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(W / 2, H - 170, "Certificate of Achievement")

    c.setFillColor(HexColor("#A1A1AA"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(W / 2, H - 210, "This certificate is proudly presented to")

    c.setFillColor(HexColor("#D4AF37"))
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(W / 2, H - 260, appd.get("full_name", ""))

    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica", 14)
    status_text = "Selected" if appd.get("status") == "selected" else "Shortlisted"
    c.drawCentredString(W / 2, H - 300, f"for being {status_text} at")
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(W / 2, H - 325, appd.get("event_title", ""))

    c.setFillColor(HexColor("#A1A1AA"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, 90, f"Verification ID: ALEE-{appd['id'][:8].upper()}")
    c.drawCentredString(W / 2, 75, f"Issued: {appd.get('updated_at', '')[:10]}")

    c.showPage()
    c.save()
    pdf_bytes = buf.getvalue()
    b64 = base64.b64encode(pdf_bytes).decode()
    return {"filename": f"certificate_{app_id}.pdf", "base64": b64, "mime": "application/pdf"}


# ---------------- Notifications ----------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- AI Profile Scoring ----------------
@api.post("/ai/score-profile")
async def score_profile(body: AIScoreReq, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI scoring not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"LLM lib unavailable: {e}")

    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    prompt = f"""You are an expert talent scout for a luxury pageant platform. Score this profile 0-100 and give brief constructive feedback.

Profile:
- Name: {profile.get('name','')}
- Age: {profile.get('age','N/A')}
- City: {profile.get('city','N/A')}
- Category: {profile.get('category','N/A')}
- Height: {profile.get('height_cm','N/A')}cm
- Bio: {profile.get('bio','')}
- Achievements: {profile.get('achievements','')}
- Portfolio photos count: {len(profile.get('portfolio_photos') or [])}

Return STRICTLY in this format:
SCORE: <number>
STRENGTHS: <one sentence>
IMPROVE: <one sentence>
RECOMMENDED_EVENTS: <comma-separated categories like miss-teen, mr-india, kids>"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"score-{user['id']}-{uuid.uuid4().hex[:8]}",
        system_message="You are a concise, supportive talent scout."
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        resp = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"AI score failed: {e}")
        raise HTTPException(500, f"AI scoring failed: {e}")

    text = str(resp)
    # parse
    out = {"raw": text, "score": None, "strengths": "", "improve": "", "recommended": []}
    for line in text.splitlines():
        low = line.strip()
        if low.upper().startswith("SCORE:"):
            try:
                out["score"] = int(''.join(ch for ch in low.split(":", 1)[1] if ch.isdigit()))
            except Exception:
                pass
        elif low.upper().startswith("STRENGTHS:"):
            out["strengths"] = low.split(":", 1)[1].strip()
        elif low.upper().startswith("IMPROVE:"):
            out["improve"] = low.split(":", 1)[1].strip()
        elif low.upper().startswith("RECOMMENDED_EVENTS:"):
            out["recommended"] = [x.strip() for x in low.split(":", 1)[1].split(",") if x.strip()]

    # save latest score
    await db.users.update_one({"id": user["id"]}, {"$set": {"ai_score": out}})
    return out


# ---------------- Admin Analytics ----------------
@api.get("/admin/analytics")
async def admin_analytics(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_events = await db.events.count_documents({})
    total_apps = await db.applications.count_documents({"is_draft": False})
    pipeline = [
        {"$match": {"is_draft": False}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    by_status = {}
    async for doc in db.applications.aggregate(pipeline):
        by_status[doc["_id"]] = doc["count"]
    paid_pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    revenue = 0
    async for d in db.payments.aggregate(paid_pipeline):
        revenue = d["total"]
    return {
        "users": total_users,
        "events": total_events,
        "applications": total_apps,
        "by_status": by_status,
        "revenue_paise": revenue,
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_admin)):
    items = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0, "portfolio_photos": 0, "portfolio_videos": 0, "cover_photo": 0}
    ).sort("created_at", -1).to_list(500)
    # Batch-count applications per user in a single aggregation to avoid N+1
    user_ids = [it.get("id") for it in items if it.get("id")]
    counts_map: dict = {}
    if user_ids:
        pipeline = [
            {"$match": {"user_id": {"$in": user_ids}}},
            {"$group": {
                "_id": "$user_id",
                "application_count": {
                    "$sum": {"$cond": [{"$ne": ["$is_draft", True]}, 1, 0]}
                },
                "paid_count": {
                    "$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, 1, 0]}
                },
            }},
        ]
        async for row in db.applications.aggregate(pipeline):
            counts_map[row["_id"]] = {
                "application_count": row.get("application_count", 0),
                "paid_count": row.get("paid_count", 0),
            }
    for it in items:
        stats = counts_map.get(it.get("id"), {})
        it["application_count"] = stats.get("application_count", 0)
        it["paid_count"] = stats.get("paid_count", 0)
    return items


@api.get("/admin/users/{uid}")
async def admin_user_detail(uid: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(404, "User not found")
    apps = await db.applications.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    pays = await db.payments.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    certs = await db.certificates.find({"user_id": uid}, {"_id": 0}).sort("issued_at", -1).to_list(100)
    return {"user": target, "applications": apps, "payments": pays, "certificates": certs}


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["participant", "judge", "admin"]] = None
    verified: Optional[bool] = None
    city: Optional[str] = None
    phone: Optional[str] = None


@api.put("/admin/users/{uid}")
async def admin_update_user(uid: str, body: AdminUserUpdate, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nothing to update")
    # Prevent demoting yourself out of admin (safety)
    if uid == admin["id"] and upd.get("role") and upd["role"] != "admin":
        raise HTTPException(400, "Cannot change your own admin role")
    await db.users.update_one({"id": uid}, {"$set": upd})
    updated = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return updated


@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, admin: dict = Depends(require_admin)):
    if uid == admin["id"]:
        raise HTTPException(400, "Cannot delete your own account")
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")
    # Soft-cleanup: remove user + their drafts. Keep paid applications for record (mark user_deleted).
    await db.applications.update_many(
        {"user_id": uid, "payment_status": "paid"},
        {"$set": {"user_deleted": True}}
    )
    await db.applications.delete_many({"user_id": uid, "payment_status": {"$ne": "paid"}})
    await db.notifications.delete_many({"user_id": uid})
    await db.users.delete_one({"id": uid})
    return {"deleted": True}


@api.get("/admin/payments")
async def admin_payments(admin: dict = Depends(require_admin), status_q: Optional[str] = None):
    q = {}
    if status_q:
        q["status"] = status_q
    items = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # Enrich each with applicant name + event title (single batched lookup)
    app_ids = list({p.get("application_id") for p in items if p.get("application_id")})
    user_ids = list({p.get("user_id") for p in items if p.get("user_id")})
    apps_map = {a["id"]: a async for a in db.applications.find({"id": {"$in": app_ids}}, {"_id": 0, "full_name": 1, "event_title": 1, "id": 1})}
    users_map = {u["id"]: u async for u in db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "name": 1, "email": 1, "phone": 1, "id": 1})}
    for p in items:
        a = apps_map.get(p.get("application_id"))
        u = users_map.get(p.get("user_id"))
        p["applicant_name"] = (a or {}).get("full_name") or (u or {}).get("name") or "-"
        p["event_title"] = (a or {}).get("event_title") or "-"
        p["user_email"] = (u or {}).get("email", "")
        p["user_phone"] = (u or {}).get("phone", "")
    # Totals
    total_paid = sum((p.get("amount", 0) for p in items if p.get("status") == "paid"))
    total_created = sum((p.get("amount", 0) for p in items))
    return {
        "items": items,
        "totals": {
            "count": len(items),
            "paid_count": sum(1 for p in items if p.get("status") == "paid"),
            "paid_paise": total_paid,
            "created_paise": total_created,
        }
    }


class BroadcastReq(BaseModel):
    title: str
    body: str
    audience: Literal["all", "participants", "paid", "selected"] = "all"


@api.post("/admin/broadcast")
async def admin_broadcast(req: BroadcastReq, admin: dict = Depends(require_admin)):
    """Send a notification to a target audience. Stored in notifications collection."""
    if req.audience == "all":
        users = await db.users.find({}, {"_id": 0, "id": 1}).to_list(2000)
    elif req.audience == "participants":
        users = await db.users.find({"role": "participant"}, {"_id": 0, "id": 1}).to_list(2000)
    elif req.audience == "paid":
        paid_uids = await db.applications.distinct("user_id", {"payment_status": "paid"})
        users = [{"id": u} for u in paid_uids]
    else:  # selected
        sel_uids = await db.applications.distinct("user_id", {"status": "selected"})
        users = [{"id": u} for u in sel_uids]
    if not users:
        return {"sent": 0}
    docs = [{
        "id": str(uuid.uuid4()),
        "user_id": u["id"],
        "title": req.title,
        "body": req.body,
        "type": "announcement",
        "read": False,
        "created_at": now_iso(),
    } for u in users]
    if docs:
        await db.notifications.insert_many(docs)
    return {"sent": len(docs)}


# Judge: read-only candidates list + score endpoint
class JudgeScoreReq(BaseModel):
    application_id: str
    score: int  # 0-100
    notes: Optional[str] = ""


@api.get("/judge/candidates")
async def judge_candidates(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("judge", "admin"):
        raise HTTPException(403, "Judge access required")
    items = await db.applications.find(
        {"is_draft": False, "status": {"$in": ["under_review", "shortlisted", "selected"]}},
        {"_id": 0, "videos": 0, "id_document": 0}
    ).sort("created_at", -1).to_list(200)
    return items


@api.post("/judge/score")
async def judge_score(body: JudgeScoreReq, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("judge", "admin"):
        raise HTTPException(403, "Judge access required")
    score = max(0, min(100, body.score))
    await db.applications.update_one(
        {"id": body.application_id},
        {"$push": {"judge_scores": {
            "judge_id": user["id"], "judge_name": user.get("name"),
            "score": score, "notes": body.notes, "at": now_iso(),
        }}}
    )
    return {"ok": True}


# ---------------- Site Settings (Sambita / Reality Show / Star Achievements) ----------------
DEFAULT_SETTINGS = {
    "sambita_video_url": "https://www.youtube.com/results?search_query=ramp+guru+sambita+bose+alee+club",
    "sambita_photo": "https://customer-assets.emergentagent.com/job_glamour-audition/artifacts/yo98546z_hom-abt.jpg",
    "reality_show_url": "https://www.youtube.com/results?search_query=alee+club+miss+mr+teen+india+reality+show",
    "whatsapp_number": "919876543210",
    "whatsapp_message": "Hi, I want to know more about Alee Club Miss & Mr Teen India.",
    "star_achievements": [
        {"img": "https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/2661121768210797.jpeg", "name": "Mishty & Raghav", "year": "Miss & Mr Teen India 2025", "video_url": ""},
        {"img": "https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/6259601768210547.png", "name": "Fiona Wilfy Vas", "year": "Miss Teen India 2024", "video_url": ""},
        {"img": "https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/4611851768210747.png", "name": "Anshul Rawat", "year": "Mr Teen India 2024", "video_url": ""},
        {"img": "https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/6405521768210224.jpg", "name": "Mahee Sood", "year": "Miss Teen India 2023", "video_url": ""},
        {"img": "https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/8368101768210471.jpg", "name": "Aarab Sharma", "year": "Mr Teen India 2023", "video_url": ""},
        {"img": "https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/1601141768210146.jpg", "name": "Rifkah & Dheeren", "year": "Teen India 2022", "video_url": ""},
    ],
}


class SettingsUpdate(BaseModel):
    sambita_video_url: Optional[str] = None
    sambita_photo: Optional[str] = None
    reality_show_url: Optional[str] = None
    star_achievements: Optional[list] = None
    whatsapp_number: Optional[str] = None
    whatsapp_message: Optional[str] = None


@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"_id": "site"}) or {}
    out = {**DEFAULT_SETTINGS, **{k: v for k, v in s.items() if k != "_id"}}
    return out


@api.put("/settings")
async def update_settings(body: SettingsUpdate, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if upd:
        await db.settings.update_one({"_id": "site"}, {"$set": upd}, upsert=True)
    s = await db.settings.find_one({"_id": "site"}) or {}
    return {**DEFAULT_SETTINGS, **{k: v for k, v in s.items() if k != "_id"}}


@api.post("/settings/star-achievements/add")
async def add_star(item: dict, user: dict = Depends(require_admin)):
    s = await db.settings.find_one({"_id": "site"}) or {}
    arr = s.get("star_achievements") or DEFAULT_SETTINGS["star_achievements"][:]
    arr.append({
        "img": item.get("img", ""),
        "name": item.get("name", ""),
        "year": item.get("year", ""),
        "video_url": item.get("video_url", ""),
    })
    await db.settings.update_one({"_id": "site"}, {"$set": {"star_achievements": arr}}, upsert=True)
    return {"ok": True, "count": len(arr)}


@api.delete("/settings/star-achievements/{idx}")
async def remove_star(idx: int, user: dict = Depends(require_admin)):
    s = await db.settings.find_one({"_id": "site"}) or {}
    arr = s.get("star_achievements") or DEFAULT_SETTINGS["star_achievements"][:]
    if 0 <= idx < len(arr):
        arr.pop(idx)
        await db.settings.update_one({"_id": "site"}, {"$set": {"star_achievements": arr}}, upsert=True)
    return {"ok": True, "count": len(arr)}


# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"status": "ok", "service": "Alee Club API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Startup / Seeding ----------------
@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.events.create_index("id", unique=True)
        await db.applications.create_index("id", unique=True)
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    except Exception as e:
        logger.warning(f"index error: {e}")

    # seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Alee Admin",
            "email": ADMIN_EMAIL,
            "phone": "",
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "verified": True,
            "age": None, "height_cm": None, "city": "Mumbai", "category": "",
            "bio": "Platform administrator", "achievements": "",
            "profile_photo": "", "cover_photo": "",
            "portfolio_photos": [], "portfolio_videos": [],
            "social_instagram": "", "social_youtube": "",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")
    else:
        # Always refresh admin password from .env to keep predictable
        if not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "role": "admin"}}
            )

    # seed Apple App Review account (so reviewers can sign in without phone OTP)
    review_email = os.environ.get('APPLE_REVIEW_EMAIL', 'appreview@aleeclub.com')
    review_password = os.environ.get('APPLE_REVIEW_PASSWORD', 'AleeReview@2026')
    review_existing = await db.users.find_one({"email": review_email})
    if not review_existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "App Review Tester",
            "email": review_email,
            "phone": "",
            "password_hash": hash_password(review_password),
            "role": "participant",
            "verified": True,
            "age": 21, "height_cm": 170, "city": "Mumbai",
            "category": "miss-teen",
            "bio": "Demo account for app reviewers — Apple / Google Play",
            "achievements": "",
            "profile_photo": "", "cover_photo": "",
            "portfolio_photos": [], "portfolio_videos": [],
            "social_instagram": "", "social_youtube": "",
            "auth_provider": "email",
            "referral_code": "ALEEREV001",
            "referred_by": "",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded App Review account: {review_email} / {review_password}")
    else:
        # Always refresh review account password so it remains predictable
        if not verify_password(review_password, review_existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": review_email},
                {"$set": {"password_hash": hash_password(review_password), "verified": True}}
            )

    # migration: ensure all existing events have early-bird fields
    await db.events.update_many(
        {"early_bird_fee": {"$exists": False}},
        {"$set": {"early_bird_fee": 90000, "early_bird_deadline": "2026-03-31", "fee": 120000}}
    )

    # migration: backfill referral_code on existing users
    async for u in db.users.find({"referral_code": {"$exists": False}}, {"id": 1}):
        await db.users.update_one(
            {"id": u["id"]},
            {"$set": {"referral_code": f"ALEE{uuid.uuid4().hex[:6].upper()}", "referred_by": ""}}
        )

    # seed sample events if empty
    count = await db.events.count_documents({})
    if count == 0:
        samples = [
            {
                "title": "Miss Teen India 2026",
                "subtitle": "The Crown of New Generation",
                "description": "India's most prestigious pageant for teenagers — discover beauty, grace, and leadership on the grandest stage. National finals in Mumbai.",
                "category": "miss-teen",
                "city": "Mumbai",
                "venue": "Jio World Convention Centre",
                "min_age": 13, "max_age": 19, "gender": "female",
                "fee": 120000,  # ₹1200 regular
                "early_bird_fee": 90000,  # ₹900 early bird
                "early_bird_deadline": "2026-02-28",
                "start_date": "2026-04-15",
                "end_date": "2026-04-20",
                "application_deadline": "2026-03-15",
                "banner_image": "https://images.unsplash.com/photo-1761163337557-827da2d40001?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxmYXNoaW9uJTIwcnVud2F5JTIwc2hvd3xlbnwwfHx8fDE3Nzc4ODA2OTZ8MA&ixlib=rb-4.1.0&q=85",
                "eligibility": "Female • Age 13–19 • Indian national",
                "prizes": "₹10L cash, brand endorsements, international pageant entry",
                "status": "open",
            },
            {
                "title": "Mr India Supermodel 2026",
                "subtitle": "The Face of Modern India",
                "description": "Nationwide search for India's next male supermodel. Runway, print, and brand ambassadorship opportunities.",
                "category": "mr-india",
                "city": "Delhi",
                "venue": "The Leela Palace",
                "min_age": 18, "max_age": 30, "gender": "male",
                "fee": 120000,
                "early_bird_fee": 90000,
                "early_bird_deadline": "2026-03-15",
                "start_date": "2026-05-10",
                "end_date": "2026-05-15",
                "application_deadline": "2026-04-10",
                "banner_image": "https://images.unsplash.com/photo-1673830719127-db64dcf68c4f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxmYXNoaW9uJTIwbW9kZWwlMjBwb3J0cmFpdCUyMGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3Nzc4ODA2OTZ8MA&ixlib=rb-4.1.0&q=85",
                "eligibility": "Male • Age 18–30 • Height 5'10\"+",
                "prizes": "₹15L cash + brand contract worth ₹25L",
                "status": "open",
            },
            {
                "title": "Kids Style Icon 2026",
                "subtitle": "Where Little Stars Shine Bright",
                "description": "A celebration of talent, confidence and creativity for kids 6–12.",
                "category": "kids",
                "city": "Bangalore",
                "venue": "UB City Mall",
                "min_age": 6, "max_age": 12, "gender": "any",
                "fee": 120000,
                "early_bird_fee": 90000,
                "early_bird_deadline": "2026-04-10",
                "start_date": "2026-06-05",
                "end_date": "2026-06-07",
                "application_deadline": "2026-05-20",
                "banner_image": "https://images.unsplash.com/photo-1575354196644-9de51010f481?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBwb3J0cmFpdCUyMGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3Nzc4ODA2OTZ8MA&ixlib=rb-4.1.0&q=85",
                "eligibility": "Kids 6–12 • Any gender",
                "prizes": "Scholarship of ₹2L + photoshoot with Vogue Kids",
                "status": "open",
            },
            {
                "title": "Mrs Elegance 2026",
                "subtitle": "Celebrating Grace and Purpose",
                "description": "The nation's leading platform for married women to showcase elegance, leadership and social impact.",
                "category": "mrs",
                "city": "Mumbai",
                "venue": "Grand Hyatt",
                "min_age": 25, "max_age": 45, "gender": "female",
                "fee": 120000,
                "early_bird_fee": 90000,
                "early_bird_deadline": "2026-05-20",
                "start_date": "2026-07-20",
                "end_date": "2026-07-25",
                "application_deadline": "2026-06-25",
                "banner_image": "https://images.unsplash.com/photo-1761437855598-011cf89b2ad4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxibGFjayUyMGFuZCUyMGdvbGQlMjBsdXh1cnklMjB0ZXh0dXJlfGVufDB8fHx8MTc3Nzg4MDcxNXww&ixlib=rb-4.1.0&q=85",
                "eligibility": "Married women • Age 25–45",
                "prizes": "₹20L cash + luxury travel package",
                "status": "open",
            },
        ]
        for s in samples:
            s["id"] = str(uuid.uuid4())
            s["created_at"] = now_iso()
            await db.events.insert_one(s)
        logger.info(f"Seeded {len(samples)} sample events")


@app.on_event("shutdown")
async def shutdown():
    client.close()
