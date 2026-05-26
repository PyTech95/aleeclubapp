import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { logoB64 } from '../../src/logoImage';

const EFFECTIVE_DATE = 'May 25, 2026';

export default function PrivacyPolicy() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Image source={{ uri: logoB64 }} style={styles.logo} resizeMode="contain" />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
        <Text style={styles.eyebrow}>LEGAL</Text>
        <Text style={styles.h1}>Privacy Policy</Text>
        <Text style={styles.effective}>Effective: {EFFECTIVE_DATE}</Text>

        <Para>
          Alee Club ("we", "us", "our") operates the Alee Club Talent App (the
          "App") which connects participants with beauty pageants, auditions
          and talent showcases. This Privacy Policy explains what information
          we collect, how we use it and the choices you have.
        </Para>

        <Section title="1. Information We Collect">
          <Bullet>
            <B>Account details:</B> name, phone number, email address, city,
            age and (optionally) gender — collected when you sign up by
            phone OTP, Google or email.
          </Bullet>
          <Bullet>
            <B>Profile details:</B> bio, achievements, height, category and
            social-media handles you choose to add.
          </Bullet>
          <Bullet>
            <B>Portfolio media:</B> photos and videos you upload as part of
            your audition profile.
          </Bullet>
          <Bullet>
            <B>Application data:</B> events you apply to, application status,
            judge feedback and certificates issued to you.
          </Bullet>
          <Bullet>
            <B>Payment data:</B> we use Razorpay to process payments. We
            store only the payment reference (order id, status, amount) — we
            do <B>not</B> store your card number, UPI PIN or banking
            credentials.
          </Bullet>
          <Bullet>
            <B>Device data:</B> basic technical information (device type, OS
            version, app version) to keep the App reliable.
          </Bullet>
        </Section>

        <Section title="2. How We Use Your Data">
          <Bullet>To create and manage your account.</Bullet>
          <Bullet>To process pageant applications, payments and award certificates.</Bullet>
          <Bullet>To allow judges and admins to evaluate your audition.</Bullet>
          <Bullet>To send you status updates, announcements and important notices about events you registered for.</Bullet>
          <Bullet>To improve the App, prevent fraud and comply with applicable law.</Bullet>
        </Section>

        <Section title="3. Sharing of Information">
          <Para>We do not sell your personal data. We share information only with:</Para>
          <Bullet><B>Judges and admins</B> of the Alee Club pageant, strictly for evaluation.</Bullet>
          <Bullet><B>Service providers</B> like Razorpay (payments), Google (OAuth sign-in) and our cloud hosting partners — bound by confidentiality.</Bullet>
          <Bullet><B>Government or legal authorities</B> if required by law or to protect the safety of our users.</Bullet>
        </Section>

        <Section title="4. Minors">
          <Para>
            Many of our events are for children and teens. For participants
            under 18 years of age, a parent or legal guardian must register
            and consent on the participant's behalf. We will remove a minor's
            account on request from the parent or guardian.
          </Para>
        </Section>

        <Section title="5. Data Retention">
          <Para>
            We keep your account and application data while your account is
            active. After deletion we retain payment receipts for up to 7
            years to comply with Indian tax & accounting law. Portfolio
            media is deleted within 30 days of account deletion.
          </Para>
        </Section>

        <Section title="6. Your Rights">
          <Bullet>Access — view your data in the Profile section of the App.</Bullet>
          <Bullet>Correction — update your details any time from your profile.</Bullet>
          <Bullet>Deletion — write to us at <B>privacy@aleeclub.net</B> and we will delete your account within 30 days.</Bullet>
          <Bullet>Withdraw consent — sign out and uninstall the App at any time.</Bullet>
        </Section>

        <Section title="7. Security">
          <Para>
            We use industry-standard safeguards — encrypted transport (HTTPS),
            JWT-based authentication, bcrypt-hashed passwords and access
            controls. No method of transmission over the internet is 100%
            secure, but we work hard to protect your data.
          </Para>
        </Section>

        <Section title="8. Cookies & Analytics">
          <Para>
            On the web version, we use first-party local storage to keep
            you signed in. We do not currently use third-party advertising
            cookies.
          </Para>
        </Section>

        <Section title="9. Changes to This Policy">
          <Para>
            We may update this policy from time to time. Material changes
            will be highlighted in the App. Continued use of the App after
            an update means you accept the revised policy.
          </Para>
        </Section>

        <Section title="10. Contact Us">
          <Para>
            For any privacy questions or requests please contact:
          </Para>
          <Para><B>Email:</B> aleetrust9@gmail.com</Para>
          <Para><B>Address:</B> Alee Club, India</Para>
        </Section>

        <Text style={styles.footer}>© {new Date().getFullYear()} Alee Club. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 110, height: 44 },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 32, fontFamily: 'Georgia', marginTop: 6 },
  effective: { color: theme.textMuted, fontSize: 12, marginTop: 6, marginBottom: 18 },
  h2: { color: theme.gold, fontSize: 16, fontFamily: 'Georgia', marginBottom: 8 },
  para: { color: theme.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 6 },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  bulletDot: { color: theme.gold, fontSize: 9, marginTop: 6 },
  bulletTxt: { flex: 1, color: theme.textSecondary, fontSize: 14, lineHeight: 21 },
  bold: { color: theme.white, fontWeight: '700' },
  footer: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 36, letterSpacing: 1 },
});
