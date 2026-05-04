# Alee Club Talent App — PRD

## Overview
Premium mobile + web app for discovering and applying to beauty pageants, auditions, and talent events. Built with React Native (Expo Router) + FastAPI + MongoDB.

## Users & Roles
- **Participant** (default) — browse events, apply, track journey, download certificates
- **Admin** — manage events (CRUD), review applications (approve/shortlist/select/reject), view analytics
- Judge role deferred to v2

## Feature Set (MVP Delivered)
1. Email + password auth (JWT Bearer)
2. User profile & portfolio (photos stored as base64 in MongoDB)
3. Events listing with city/category filters + detailed event page
4. Multi-step application flow (Personal → About → Portfolio → Review)
5. Save as Draft
6. Live application journey tracker (timeline: Applied → Screening → Shortlist → Final)
7. Razorpay payment integration (MOCKED mode when keys unset; real mode activates automatically when RAZORPAY_KEY_ID/SECRET env vars are set)
8. PDF certificate generation (reportlab) with verification ID, downloadable/shareable
9. In-app notifications (status change, payment received)
10. **AI Profile Scoring** using Claude Sonnet 4.5 via Emergent LLM key
11. Admin analytics dashboard (users, events, applications funnel, revenue)
12. Admin event CRUD + application status workflow

## Design System
- Theme: Black (#050505) + Gold (#D4AF37)
- Typography: Georgia serif for headings + System sans-serif for body
- Glassmorphism bottom tabs, large hero banners, timeline stepper with gold filled states

## Tech Stack
- **Frontend**: Expo SDK 54, Expo Router (file-based), React 19, axios, AsyncStorage, expo-image-picker, expo-linear-gradient, expo-print, expo-sharing
- **Backend**: FastAPI, Motor (MongoDB), bcrypt, PyJWT, reportlab, razorpay, emergentintegrations
- **DB**: MongoDB collections — users, events, applications, payments, notifications

## API (all prefixed /api)
- Auth: /auth/register, /auth/login, /auth/me
- Users: /users/me (PUT)
- Events: /events (GET/POST), /events/{id} (GET/PUT/DELETE)
- Applications: /applications (POST, GET admin), /applications/mine, /applications/{id} (GET), /applications/{id}/status (PUT admin)
- Payments: /payments/create-order, /payments/verify, /payments/mine
- Certificates: /certificates/mine, /certificates/{id}/pdf
- Notifications: /notifications, /notifications/{id}/read
- AI: /ai/score-profile
- Admin: /admin/analytics, /admin/users

## Seed Data
On first startup backend seeds: 1 admin user + 4 sample events (Miss Teen India, Mr India Supermodel, Kids Style Icon, Mrs Elegance).

## MOCKED / NOTES
- **Razorpay**: Running in MOCK mode since user-provided keys not configured. Payment flow creates a mock order and "Complete Payment" verifies with `mock: true` on backend. Real Razorpay order + signature verification auto-activates when `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` are added to `/app/backend/.env`.
- Video uploads are scaffolded in backend schema but not wired in UI (too heavy for base64 MVP).
- Certificate "blockchain verification ID" is a deterministic string derived from application id (not actual on-chain).

## Deferred (v2)
Judge role, WhatsApp chat support, referral system, push notifications, phone OTP, social (Google) login, advanced analytics export (Excel).
