import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { logoB64 } from '../src/logoImage';

const EFFECTIVE_DATE = 'June 18, 2026';
const SUPPORT_EMAIL = 'aleetrust9@gmail.com';
const PRIVACY_EMAIL = 'aleetrust9@gmail.com';
const COMPANY_NAME = 'Alee Club';
const APP_NAME = 'Alee Club';
const WEBSITE_URL = 'https://www.aleeclub.net';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const contentMaxWidth = isWide ? 800 : '100%';

  const openMail = () => Linking.openURL(`mailto:${PRIVACY_EMAIL}`);
  const openWebsite = () => Linking.openURL(WEBSITE_URL);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.backBtn}
            testID="back-btn"
          >
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Image source={{ uri: logoB64 }} style={styles.logo} resizeMode="contain" />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && { alignItems: 'center' },
        ]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth as any }]}>
          <Text style={styles.eyebrow}>LEGAL · ALEE CLUB</Text>
          <Text style={styles.h1}>Privacy Policy</Text>
          <Text style={styles.effective}>Effective Date: {EFFECTIVE_DATE}</Text>

          {/* Quick links */}
          <View style={styles.tocBox}>
            <Text style={styles.tocTitle}>Quick Navigation</Text>
            <Text style={styles.tocItem}>1. Introduction</Text>
            <Text style={styles.tocItem}>2. Information We Collect</Text>
            <Text style={styles.tocItem}>3. How We Use Your Information</Text>
            <Text style={styles.tocItem}>4. Account Information</Text>
            <Text style={styles.tocItem}>5. Camera Permission</Text>
            <Text style={styles.tocItem}>6. Photos & Media Access</Text>
            <Text style={styles.tocItem}>7. Storage Permission</Text>
            <Text style={styles.tocItem}>8. Notifications</Text>
            <Text style={styles.tocItem}>9. Third-Party Services</Text>
            <Text style={styles.tocItem}>10. Data Security</Text>
            <Text style={styles.tocItem}>11. Children's Privacy</Text>
            <Text style={styles.tocItem}>12. Your Rights</Text>
            <Text style={styles.tocItem}>13. Contact Information</Text>
            <Text style={styles.tocItem}>14. Changes to This Policy</Text>
          </View>

          <Section number="1" title="Introduction">
            <Para>
              {COMPANY_NAME} ("we", "us", "our", or "the Company") is committed
              to protecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, store, and protect your information when
              you use our mobile application <B>{APP_NAME}</B> (the "App"),
              available on Google Play, the Apple App Store, and our website{' '}
              <ALink onPress={openWebsite}>{WEBSITE_URL.replace('https://', '')}</ALink>.
            </Para>
            <Para>
              By creating an account or using the App, you agree to the
              collection and use of information in accordance with this Privacy
              Policy. If you do not agree with this Privacy Policy, please do
              not use the App.
            </Para>
            <Para>
              This Privacy Policy is designed to comply with Google Play User
              Data Policy, Apple App Store Review Guidelines, the Information
              Technology Act 2000 (India) and applicable data-protection
              regulations.
            </Para>
          </Section>

          <Section number="2" title="Information We Collect">
            <Para>We collect the following categories of information:</Para>

            <SubHeading>2.1 Personal Information you provide</SubHeading>
            <Bullet><B>Full Name</B> — collected during registration</Bullet>
            <Bullet><B>Phone Number</B> — for OTP-based sign-in and event-related communication</Bullet>
            <Bullet><B>Email Address</B> — for email/password sign-in and notifications</Bullet>
            <Bullet><B>City</B> — to show city-specific pageants and events</Bullet>
            <Bullet><B>Age & Date of Birth</B> — to determine pageant-category eligibility</Bullet>
            <Bullet><B>Gender</B> — to display gender-appropriate event categories</Bullet>
            <Bullet><B>Profile Information</B> — bio, achievements, height, social-media handles you choose to add</Bullet>

            <SubHeading>2.2 Content you upload</SubHeading>
            <Bullet><B>Profile photo</B> and <B>cover photo</B></Bullet>
            <Bullet><B>Audition portfolio</B> — photos and videos</Bullet>

            <SubHeading>2.3 Application & Payment data</SubHeading>
            <Bullet>Events you apply to, application status, judge feedback, certificates issued.</Bullet>
            <Bullet>Payment reference data (order id, transaction id, amount, payment status) — we do <B>NOT</B> store your card number, CVV, UPI PIN or banking credentials. All payments are processed by Razorpay.</Bullet>

            <SubHeading>2.4 Automatically collected data</SubHeading>
            <Bullet><B>Device information</B> — device model, operating system version, app version, device identifiers (used only for crash reports and security).</Bullet>
            <Bullet><B>Log data</B> — IP address, access times, app interaction events (anonymous, used to improve the App).</Bullet>
            <Bullet>We do <B>NOT</B> collect precise GPS location.</Bullet>
          </Section>

          <Section number="3" title="How We Use Your Information">
            <Para>We use the information we collect for the following purposes:</Para>
            <Bullet><B>Account management</B> — create, maintain and secure your account</Bullet>
            <Bullet><B>Event participation</B> — process your pageant applications, payments, judging and certificates</Bullet>
            <Bullet><B>Communication</B> — send important notifications about events, application status, results and announcements</Bullet>
            <Bullet><B>Customer support</B> — respond to your queries and resolve issues</Bullet>
            <Bullet><B>Personalization</B> — show events and content relevant to your city, age and category</Bullet>
            <Bullet><B>Security & fraud prevention</B> — detect and prevent fraudulent or unauthorized activity</Bullet>
            <Bullet><B>Service improvement</B> — analyze anonymized usage patterns to improve features</Bullet>
            <Bullet><B>Legal compliance</B> — comply with applicable laws, regulations and lawful requests from authorities</Bullet>
            <Para>
              We do <B>NOT</B> sell, rent or trade your personal information to
              third parties for marketing purposes.
            </Para>
          </Section>

          <Section number="4" title="Account Information">
            <Para>
              When you sign up for {APP_NAME} we create an account associated
              with your phone number and/or email address. You can sign in
              using:
            </Para>
            <Bullet><B>Phone OTP</B> — a one-time password sent to your registered phone number</Bullet>
            <Bullet><B>Email & Password</B> — with bcrypt-hashed password storage</Bullet>
            <Bullet><B>Google Sign-In</B> — via the secure Google OAuth flow</Bullet>
            <Para>
              You can update or delete your account information at any time
              from the Profile section of the App, or by writing to us at{' '}
              <ALink onPress={openMail}>{PRIVACY_EMAIL}</ALink>.
            </Para>
          </Section>

          <Section number="5" title="Camera Permission">
            <Para>
              The App requests <B>Camera</B> access for the following purposes:
            </Para>
            <Bullet>Capture profile photos for your audition portfolio</Bullet>
            <Bullet>Record audition videos directly in the App</Bullet>
            <Para>
              Camera access is <B>only used when you explicitly tap the camera
              icon</B>. We never access the camera in the background. You can
              revoke camera permission at any time through your device's
              Settings → Apps → Alee Club → Permissions.
            </Para>
          </Section>

          <Section number="6" title="Photos & Media Access">
            <Para>
              The App requests <B>Photos</B> / <B>Media Library</B> access (or
              READ_MEDIA_IMAGES / READ_MEDIA_VIDEO on Android 13+) for:
            </Para>
            <Bullet>Selecting existing photos from your gallery to upload to your portfolio</Bullet>
            <Bullet>Selecting existing videos from your gallery to upload as audition clips</Bullet>
            <Para>
              Only the media files you specifically select are uploaded. We do
              <B> NOT</B> scan your entire gallery, and we do NOT access any
              media without your explicit selection.
            </Para>
          </Section>

          <Section number="7" title="Storage Permission">
            <Para>
              On older Android versions (Android 12 and below) the App requests
              READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE permission for:
            </Para>
            <Bullet>Saving your downloaded participation certificates to your device</Bullet>
            <Bullet>Saving your Alee ID card image when you tap the "Save" button</Bullet>
            <Bullet>Caching App data for offline access</Bullet>
            <Para>
              On Android 13+ this permission is replaced by the scoped
              READ_MEDIA_IMAGES / READ_MEDIA_VIDEO permissions described in
              Section 6.
            </Para>
          </Section>

          <Section number="8" title="Notifications">
            <Para>
              We use <B>push notifications and in-app notifications</B> to keep
              you informed about:
            </Para>
            <Bullet>Application status updates (submitted, shortlisted, selected, etc.)</Bullet>
            <Bullet>Upcoming pageant deadlines and event reminders</Bullet>
            <Bullet>Announcements from organizers</Bullet>
            <Bullet>Important security or account-related alerts</Bullet>
            <Para>
              You can disable notifications at any time through your device
              settings. Doing so will not affect your ability to use the rest
              of the App, but you may miss time-sensitive updates.
            </Para>
          </Section>

          <Section number="9" title="Third-Party Services">
            <Para>
              We share limited information with the following trusted
              third-party providers, strictly to operate the App:
            </Para>
            <Bullet>
              <B>Razorpay</B> — to securely process registration-fee payments.
              Razorpay handles all card / UPI / netbanking data per its own
              PCI-DSS-compliant privacy policy.
            </Bullet>
            <Bullet>
              <B>Google (Sign-In)</B> — when you sign in with Google. Subject to{' '}
              <ALink onPress={() => Linking.openURL('https://policies.google.com/privacy')}>
                Google's Privacy Policy
              </ALink>.
            </Bullet>
            <Bullet>
              <B>YouTube</B> — embedded videos (founder, reality show, achievements)
              are served by YouTube and subject to{' '}
              <ALink onPress={() => Linking.openURL('https://policies.google.com/privacy')}>
                YouTube's privacy practices
              </ALink>.
            </Bullet>
            <Bullet>
              <B>Anthropic Claude AI</B> — used for AI-powered profile scoring.
              We send only the public portions of your profile (name, bio,
              achievements, category) and never any private credentials or
              payment data.
            </Bullet>
            <Bullet>
              <B>Cloud hosting partners</B> — our servers are hosted on
              industry-standard cloud infrastructure with end-to-end encryption.
            </Bullet>
            <Para>
              We do <B>NOT</B> share your data with advertising networks or
              data brokers.
            </Para>
          </Section>

          <Section number="10" title="Data Security">
            <Para>
              We take data security seriously and use industry-standard
              safeguards:
            </Para>
            <Bullet><B>Encryption in transit</B> — all data is transmitted over HTTPS / TLS 1.2+</Bullet>
            <Bullet><B>Password security</B> — passwords are hashed using bcrypt with per-user salts</Bullet>
            <Bullet><B>Authentication</B> — JWT bearer tokens with limited validity</Bullet>
            <Bullet><B>Access controls</B> — strict role-based access (participant / judge / admin) on the backend</Bullet>
            <Bullet><B>Payment isolation</B> — no card data is ever stored on our servers</Bullet>
            <Bullet><B>Regular audits</B> — we review our security posture periodically</Bullet>
            <Para>
              No method of transmission over the Internet or method of
              electronic storage is 100% secure. While we strive to use
              commercially acceptable means to protect your information, we
              cannot guarantee absolute security.
            </Para>
          </Section>

          <Section number="11" title="Children's Privacy">
            <Para>
              The App is intended for users aged <B>13 and above</B>. Many of
              our pageants are designed for teens and kids.
            </Para>
            <Bullet>
              Participants under 18 years of age must register with the consent
              of a parent or legal guardian, who agrees to be bound by these
              terms on the child's behalf.
            </Bullet>
            <Bullet>
              We do <B>NOT</B> knowingly collect personal information from
              children under 13 without verifiable parental consent.
            </Bullet>
            <Bullet>
              If you are a parent or guardian and believe your child under 13
              has provided us with personal information, please contact us at{' '}
              <ALink onPress={openMail}>{PRIVACY_EMAIL}</ALink> and we will
              promptly delete the account.
            </Bullet>
            <Para>
              We comply with COPPA (US Children's Online Privacy Protection Act)
              principles to the extent applicable.
            </Para>
          </Section>

          <Section number="12" title="Your Rights">
            <Para>You have the following rights regarding your personal data:</Para>
            <Bullet><B>Access</B> — view your data directly in the Profile section of the App</Bullet>
            <Bullet><B>Correction</B> — update your name, phone, email, city and profile info at any time</Bullet>
            <Bullet><B>Deletion</B> — request deletion of your account by writing to us. We will delete your account within 30 days, except for payment receipts retained for tax compliance.</Bullet>
            <Bullet><B>Portability</B> — request a copy of your data in a machine-readable format</Bullet>
            <Bullet><B>Withdraw consent</B> — sign out of the App and uninstall it at any time</Bullet>
            <Bullet><B>Object</B> — object to certain processing of your data (e.g., marketing emails — though we currently do not send marketing emails)</Bullet>
            <Bullet><B>Lodge a complaint</B> — contact your local data-protection authority if you believe your rights have been violated</Bullet>
            <Para>
              To exercise any of these rights please email us at{' '}
              <ALink onPress={openMail}>{PRIVACY_EMAIL}</ALink>. We will respond
              within 30 days.
            </Para>
          </Section>

          <Section number="13" title="Contact Information">
            <Para>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our data-handling practices, please contact us:
            </Para>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="business" size={16} color={theme.gold} />
                <Text style={styles.contactTxt}><B>{COMPANY_NAME}</B></Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={16} color={theme.gold} />
                <TouchableOpacity onPress={openMail}>
                  <Text style={[styles.contactTxt, styles.link]}>{PRIVACY_EMAIL}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="globe" size={16} color={theme.gold} />
                <TouchableOpacity onPress={openWebsite}>
                  <Text style={[styles.contactTxt, styles.link]}>{WEBSITE_URL}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="location" size={16} color={theme.gold} />
                <Text style={styles.contactTxt}>Bhubaneswar, Odisha, India</Text>
              </View>
            </View>
          </Section>

          <Section number="14" title="Changes to This Privacy Policy">
            <Para>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, legal requirements, or for
              other operational reasons.
            </Para>
            <Bullet>The updated policy will be posted in the App with a revised "Effective Date" at the top.</Bullet>
            <Bullet>For material changes, we will notify you via in-app notification, email, or a banner on the App at least 7 days before the change takes effect.</Bullet>
            <Bullet>Continued use of the App after the effective date constitutes acceptance of the updated policy.</Bullet>
            <Para>
              We encourage you to review this Privacy Policy periodically to
              stay informed about how we protect your information.
            </Para>
          </Section>

          <View style={styles.signoff}>
            <Text style={styles.signoffTxt}>
              Thank you for trusting <B>{APP_NAME}</B> with your audition
              journey. Crowns. Cameras. Confidence.
            </Text>
          </View>

          <Text style={styles.footer}>© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- Reusable inline components ---------- */
function Section({ number, title, children }: any) {
  return (
    <View style={{ marginTop: 32 }}>
      <View style={styles.secHeadRow}>
        <Text style={styles.secNum}>{number}</Text>
        <Text style={styles.h2}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
function SubHeading({ children }: any) { return <Text style={styles.subHeading}>{children}</Text>; }
function Para({ children }: any) { return <Text style={styles.para}>{children}</Text>; }
function Bullet({ children }: any) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>◆</Text>
      <Text style={styles.bulletTxt}>{children}</Text>
    </View>
  );
}
function B({ children }: any) { return <Text style={styles.bold}>{children}</Text>; }
function ALink({ children, onPress }: any) {
  return (
    <Text onPress={onPress} style={styles.link}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 110, height: 44 },
  scroll: { paddingBottom: 80 },
  content: { width: '100%', paddingHorizontal: 24 },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 36, fontFamily: 'Georgia', marginTop: 8 },
  effective: { color: theme.textMuted, fontSize: 13, marginTop: 6, marginBottom: 24 },
  tocBox: { marginTop: 8, padding: 18, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.04)' },
  tocTitle: { color: theme.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  tocItem: { color: theme.textSecondary, fontSize: 13, paddingVertical: 2, lineHeight: 20 },
  secHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  secNum: { color: theme.gold, fontSize: 14, fontFamily: 'Georgia', fontWeight: '700', width: 26 },
  h2: { color: theme.white, fontSize: 22, fontFamily: 'Georgia', flexShrink: 1 },
  subHeading: { color: theme.gold, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginTop: 16, marginBottom: 2 },
  para: { color: theme.textSecondary, fontSize: 14.5, lineHeight: 24, marginTop: 10 },
  bulletRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  bulletDot: { color: theme.gold, fontSize: 10, marginTop: 8 },
  bulletTxt: { flex: 1, color: theme.textSecondary, fontSize: 14.5, lineHeight: 23 },
  bold: { color: theme.white, fontWeight: '700' },
  link: { color: theme.gold, textDecorationLine: 'underline', fontWeight: '600' },
  contactCard: { marginTop: 14, padding: 18, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactTxt: { color: theme.white, fontSize: 14 },
  signoff: { marginTop: 40, padding: 22, borderRadius: 16, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.06)' },
  signoffTxt: { color: theme.white, fontSize: 13, lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
  footer: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 32, letterSpacing: 1 },
});
