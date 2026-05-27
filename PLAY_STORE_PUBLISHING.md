# 📱 Google Play Store — Alee Club Publishing Kit

This document contains everything you need to fill out the Play Console form
and pass review. Copy-paste the values exactly into each field.

---

## 1️⃣ App Details Page (the form you are on right now)

| Field                       | Value                                                       |
| --------------------------- | ----------------------------------------------------------- |
| **App name**                | `Alee Club`                                                 |
| **Package name** ⭐         | `net.aleeclub.talent`                                       |
| **Default language**        | English (United States) — `en-US`                           |
| **App or game**             | ✅ App                                                       |
| **Free or paid**            | ✅ Free                                                      |
| **Developer Program Policies** | ✅ Tick (I confirm)                                       |
| **US export laws**          | ✅ Tick (I acknowledge)                                      |

> 💡 The package name **cannot be changed after publishing** so use exactly
> `net.aleeclub.talent`. It matches your domain `aleeclub.net`.

---

## 2️⃣ Store Listing — short content fields

### Short description (max 80 chars)
```
India's premier beauty pageant & talent platform — auditions for Miss & Mr Teen India.
```
*(79 chars)*

### Full description (max 4000 chars)
```
Welcome to Alee Club — India's most-loved beauty pageant & talent destination, home of the iconic Miss & Mr Teen India and Kids India platforms curated by Ramp Guru Sambita Bose.

🏆 WHAT YOU CAN DO ON ALEE CLUB
• Apply to live pageants, auditions and reality shows — straight from your phone
• Build a stunning audition portfolio with photos, videos, achievements and bio
• Get an AI-powered profile score with tailored improvement tips
• Track your application journey live — from submitted to selected to crowned
• Receive judge feedback, certificates and announcements right in the app
• Discover star achievers from past seasons in our Wall of Fame

✨ WHY ALEE CLUB
• Trusted by thousands of teen & kid models, dancers, singers and performers across India
• Founded by Sambita Bose — celebrated Ramp Guru and creator of Miss & Mr Teen India
• Curated, dignified competitions — every audition is a chance to shine on a national stage
• Direct contact with organizers, judges and mentors via the in-app dashboard

💎 PREMIUM EXPERIENCE
• Luxurious Black & Gold interface designed for stage-ready stars
• Single tap sign-in with phone OTP or Google
• Early-bird registration pricing on every event
• Secure payments via Razorpay — no card details ever stored on our servers
• Built-in screenshot-friendly Alee ID card to share your participation

👨‍👩‍👧 BUILT FOR FAMILIES
For participants under 18 a parent or legal guardian registers and consents on their behalf. We treat children's data with the highest care — read our Privacy Policy inside the app or at aleeclub.net.

📩 SUPPORT
Reach us at aleetrust9@gmail.com for any pageant, payment or technical question.

Crowns. Cameras. Confidence. Welcome to Alee Club.
```
*(~1,750 chars — well under 4,000)*

### App category
`Lifestyle` *(primary)* — or `Entertainment` if Lifestyle isn't accepted.

### Tags (Play console will let you pick up to 5)
`pageant`, `audition`, `model portfolio`, `talent show`, `teen india`

### Contact details (required)
| Field   | Value                                |
| ------- | ------------------------------------ |
| Email   | `aleetrust9@gmail.com`               |
| Phone   | *(optional — your support number)*   |
| Website | `https://www.aleeclub.net`           |

---

## 3️⃣ Privacy Policy URL (REQUIRED — Google rejects without this)

You **must** host the Privacy Policy on a publicly reachable HTTPS URL.
Two options:

**Option A — use the in-app page (instant, free)**
After you deploy this app to the web at any URL (e.g. `app.aleeclub.net` or
the Emergent preview URL), the privacy policy is reachable at:
```
<your-domain>/legal/privacy
```
For example: `https://app.aleeclub.net/legal/privacy`

**Option B — paste the policy onto your existing site `aleeclub.net`**
Copy the text from `/app/frontend/app/legal/privacy.tsx` into a new page
`aleeclub.net/privacy-policy.html`.

Either URL works — paste it into Play Console → **Store presence → Privacy Policy**.

---

## 4️⃣ Permissions Justification (Data safety form)

Play Console asks "Why does the app need each permission?". Use these exact
justifications:

| Permission                | Why we need it                                                    |
| ------------------------- | ----------------------------------------------------------------- |
| `CAMERA`                  | Capture audition photos & videos for the user's portfolio         |
| `READ_MEDIA_IMAGES`       | Upload existing photos from gallery to the portfolio              |
| `READ_MEDIA_VIDEO`        | Upload existing videos from gallery to the audition portfolio     |
| `RECORD_AUDIO`            | Record audio when capturing audition videos                       |
| `INTERNET`                | Connect to Alee Club's API to load events and submit applications |
| `ACCESS_NETWORK_STATE`    | Detect when the user is offline to show a friendly message        |

### Data safety — Data collected
| Data type        | Collected? | Shared? | Required? | Purpose                                                       |
| ---------------- | ---------- | ------- | --------- | ------------------------------------------------------------- |
| Name             | Yes        | No      | Required  | Account creation                                              |
| Email address    | Yes        | No      | Required  | Account creation, login                                       |
| Phone number     | Yes        | No      | Required  | OTP login, contact for selection                              |
| Address (city)   | Yes        | No      | Optional  | Show city-specific events                                     |
| Photos           | Yes        | No      | Optional  | Audition portfolio                                            |
| Videos           | Yes        | No      | Optional  | Audition portfolio                                            |
| Approximate age  | Yes        | No      | Required  | Age-bracket eligibility for pageants                          |
| Payments info    | Yes        | Yes\*   | Required  | \*Shared with Razorpay to process registration fees           |
| App interactions | Yes        | No      | Optional  | Improve the App                                               |

- **Data is encrypted in transit** ✅
- **Users can request data deletion** ✅ (via email `aleetrust9@gmail.com`)

---

## 5️⃣ Graphic Assets you'll need to upload

| Asset                  | Spec                                  | Status                          |
| ---------------------- | ------------------------------------- | ------------------------------- |
| App icon               | 512×512 PNG (32-bit, no alpha)        | `/app/frontend/assets/images/icon.png` ✅ |
| Feature graphic        | 1024×500 PNG/JPG                      | ⚠️ **Need to create** (gold Alee Club banner) |
| Phone screenshots (≥2) | 1080×1920 or 1080×2400 PNG/JPG        | Take from preview after publishing |
| Tablet (optional)      | 1200×1920 PNG                         | Skip for v1                     |
| Promo video (optional) | YouTube link                          | Use your existing reality-show video |

> 💡 I'll generate the feature graphic for you on request — just say the word.

---

## 6️⃣ Content Rating questionnaire — your answers

| Question                                                  | Answer |
| --------------------------------------------------------- | ------ |
| Does the app contain violence, sexual content, profanity? | No     |
| Does the app facilitate gambling?                         | No     |
| Does the app contain user-generated content?              | Yes (portfolio photos/videos — moderated by admins) |
| Does the app share user location?                         | No     |
| Does the app handle digital purchases?                    | Yes — registration fees via Razorpay |
| Is the app primarily for children under 13?               | No (13+ minimum, parents register for under-18) |

**Expected rating:** Everyone / PEGI 3 / India CBFC: U

---

## 7️⃣ Target audience & content

- **Target age group:** 13–17 + 18+ (mixed)
- **Appeals to children?** No (designed for teens & adults)
- **Built specifically for ages under 13?** No

---

## 8️⃣ Building the .aab file (Android App Bundle)

Once the form is filled, you need to upload a signed `.aab`. Two ways:

### Method A — EAS Build (recommended, free tier)
```
cd /app/frontend
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build -p android --profile production
```
EAS will produce a signed `.aab` you can directly upload.

### Method B — Local build with Expo prebuild
```
cd /app/frontend
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
```
The output `.aab` will be at `android/app/build/outputs/bundle/release/app-release.aab`.

---

## 9️⃣ Pre-launch checklist

- [x] `app.json` updated with `net.aleeclub.talent`, permissions, icon
- [x] Privacy policy page live at `/legal/privacy`
- [x] Terms page live at `/legal/terms`
- [x] Admin panel works
- [x] Google login works
- [x] Razorpay test keys active (switch to LIVE keys before public launch!)
- [ ] App icon polished to 512×512
- [ ] Feature graphic 1024×500 designed
- [ ] At least 2 phone screenshots (1080×1920)
- [ ] Internal testing track tested with 5+ testers
- [ ] Switch Razorpay LIVE keys + update `.env`
- [ ] Build production .aab via EAS

---

## 🔟 Quick copy-paste cheat sheet

```
App name        Alee Club
Package name    net.aleeclub.talent
Category        Lifestyle
Contact email   aleetrust9@gmail.com
Website         https://www.aleeclub.net
Privacy policy  https://<your-domain>/legal/privacy
```
