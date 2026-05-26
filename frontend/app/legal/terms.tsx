import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { logoB64 } from '../../src/logoImage';

const EFFECTIVE_DATE = 'May 25, 2026';

export default function Terms() {
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
        <Text style={styles.h1}>Terms & Conditions</Text>
        <Text style={styles.effective}>Effective: {EFFECTIVE_DATE}</Text>

        <Para>
          Welcome to Alee Club. By creating an account or using the Alee
          Club Talent App (the "App") and our pageant services you agree
          to these Terms & Conditions. Please read them carefully.
        </Para>

        <Section title="1. Eligibility">
          <Bullet>
            You must be at least 13 years old to use the App. Participants
            under 18 must register with the consent of a parent or legal
            guardian.
          </Bullet>
          <Bullet>
            You must provide accurate, current and complete information at
            registration and keep your account information updated.
          </Bullet>
        </Section>

        <Section title="2. Account & Security">
          <Bullet>You are responsible for activity that happens under your account.</Bullet>
          <Bullet>Do not share your OTP, password or login link with anyone.</Bullet>
          <Bullet>Notify us immediately at <B>aleetrust9@gmail.com</B> if you suspect unauthorised access.</Bullet>
        </Section>

        <Section title="3. Pageant Participation">
          <Bullet>
            Submitting an application does not guarantee selection or shortlisting.
            All decisions of the Alee Club organizers and judges are final and binding.
          </Bullet>
          <Bullet>
            By participating you grant Alee Club a worldwide, royalty-free
            licence to use your photos, videos and pageant footage for the
            purposes of promotion, marketing, broadcast and archival —
            both online and offline.
          </Bullet>
          <Bullet>
            You must not impersonate another person, submit content you
            don't own, or upload anything obscene, defamatory, infringing
            or unlawful.
          </Bullet>
          <Bullet>
            Participants are expected to behave with dignity and respect
            towards organizers, judges, sponsors and fellow contestants.
          </Bullet>
        </Section>

        <Section title="4. Fees & Payments">
          <Bullet>
            Registration fees are listed on each event page. Early-bird
            pricing is available until the early-bird deadline shown on
            the event card.
          </Bullet>
          <Bullet>
            Payments are processed by <B>Razorpay</B>. By paying you
            additionally agree to Razorpay's terms.
          </Bullet>
          <Bullet>
            All amounts are in Indian Rupees (INR) and include any
            applicable taxes unless stated otherwise.
          </Bullet>
        </Section>

        <Section title="5. Refunds & Cancellation">
          <Bullet>
            Registration fees are <B>non-refundable</B> once an application
            is submitted, except where required by applicable law.
          </Bullet>
          <Bullet>
            If Alee Club cancels or postpones an event for reasons in our
            control we will either reschedule your participation or offer
            a refund at our discretion.
          </Bullet>
          <Bullet>
            For any refund request please write to
            <B> aleetrust9@gmail.com</B> within 7 days of payment.
          </Bullet>
        </Section>

        <Section title="6. Content & Conduct">
          <Bullet>
            You retain ownership of content you upload but grant Alee Club
            the licence described in Section 3 above.
          </Bullet>
          <Bullet>
            We may remove content or suspend accounts that violate these
            Terms or applicable law, without prior notice.
          </Bullet>
        </Section>

        <Section title="7. Intellectual Property">
          <Para>
            The Alee Club name, logo, designs, photographs of past winners,
            event branding and the App's interface are the intellectual
            property of Alee Club and may not be used without our prior
            written permission.
          </Para>
        </Section>

        <Section title="8. Third-Party Services">
          <Para>
            The App integrates Google sign-in, Razorpay payments and YouTube
            video links. Use of these services is also subject to their own
            terms. Alee Club is not responsible for third-party content or
            services.
          </Para>
        </Section>

        <Section title="9. Disclaimers">
          <Bullet>
            The App is provided "as is" without warranties of any kind.
          </Bullet>
          <Bullet>
            We do not guarantee that the App will be uninterrupted, error-free
            or available at all times.
          </Bullet>
        </Section>

        <Section title="10. Limitation of Liability">
          <Para>
            To the maximum extent permitted by law, Alee Club's total
            liability arising out of or relating to the App or any pageant
            shall not exceed the fees you paid to us in the 12 months prior
            to the claim. We are not liable for any indirect, incidental
            or consequential losses.
          </Para>
        </Section>

        <Section title="11. Termination">
          <Para>
            We may suspend or terminate your account for breach of these
            Terms or for any conduct we reasonably consider harmful to
            other users or the pageant. You may delete your account at
            any time by writing to us.
          </Para>
        </Section>

        <Section title="12. Governing Law">
          <Para>
            These Terms are governed by the laws of India. Any dispute will
            be subject to the exclusive jurisdiction of the courts in
            Bhubaneswar, Odisha.
          </Para>
        </Section>

        <Section title="13. Changes to These Terms">
          <Para>
            We may update these Terms from time to time. Material changes
            will be highlighted in the App. Continued use after an update
            constitutes acceptance of the revised Terms.
          </Para>
        </Section>

        <Section title="14. Contact">
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
