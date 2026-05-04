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
    role: Literal["participant", "admin", "judge"] = "participant"


class LoginReq(BaseModel):
    email: EmailStr
    password: str


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


# ---------------- Auth ----------------
@api.post("/auth/register")
async def register(body: RegisterReq):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")
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
        "city": "",
        "category": "",
        "bio": "",
        "achievements": "",
        "profile_photo": "",
        "cover_photo": "",
        "portfolio_photos": [],
        "portfolio_videos": [],
        "social_instagram": "",
        "social_youtube": "",
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
    items = await db.users.find({}, {"_id": 0, "password_hash": 0, "portfolio_photos": 0, "portfolio_videos": 0, "profile_photo": 0, "cover_photo": 0}).to_list(500)
    return items


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

    # migration: ensure all existing events have early-bird fields
    await db.events.update_many(
        {"early_bird_fee": {"$exists": False}},
        {"$set": {"early_bird_fee": 90000, "early_bird_deadline": "2026-03-31", "fee": 120000}}
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
