import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

export default function CertificateView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appd, setAppd] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/applications/${id}`).then((r) => setAppd(r.data));
  }, [id]);

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/certificates/${id}/pdf`);
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:${data.mime};base64,${data.base64}`;
        link.download = data.filename;
        link.click();
      } else {
        const uri = `${FileSystem.cacheDirectory}${data.filename}`;
        await FileSystem.writeAsStringAsync(uri, data.base64, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: data.mime, dialogTitle: 'Save certificate' });
        } else {
          Alert.alert('Saved', `Certificate saved to ${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Download failed');
    } finally { setLoading(false); }
  };

  if (!appd) return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.gold} />
    </View>
  );

  const eligible = appd.status === 'selected' || appd.status === 'shortlisted';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.h1}>Certificate</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {!eligible ? (
          <View style={styles.locked}>
            <Ionicons name="lock-closed" size={48} color={theme.textMuted} />
            <Text style={styles.lockTxt}>Your certificate will unlock once you're shortlisted or selected.</Text>
          </View>
        ) : (
          <>
            <View style={styles.certBox}>
              <LinearGradient colors={['rgba(212,175,55,0.2)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
              <View style={styles.certBorder}>
                <Text style={styles.club}>ALEE CLUB</Text>
                <Text style={styles.clubSub}>TALENT DISCOVERY PLATFORM</Text>
                <View style={styles.divider} />
                <Text style={styles.cTitle}>Certificate of Achievement</Text>
                <Text style={styles.cPresentedTo}>This is proudly presented to</Text>
                <Text style={styles.cName}>{appd.full_name}</Text>
                <Text style={styles.cFor}>for being {appd.status === 'selected' ? 'Selected' : 'Shortlisted'} at</Text>
                <Text style={styles.cEvent}>{appd.event_title}</Text>
                <View style={styles.cFooter}>
                  <Text style={styles.cVid}>VERIFICATION ID</Text>
                  <Text style={styles.cVidVal}>ALEE-{String(appd.id).slice(0, 8).toUpperCase()}</Text>
                </View>
              </View>
            </View>
            <GoldButton title="Download PDF" onPress={downloadPDF} loading={loading} style={{ marginTop: 24 }} testID="download-cert" />
            <Text style={styles.legal}>
              This certificate is digitally signed and can be verified using the unique ID above.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia' },
  locked: { alignItems: 'center', padding: 40, gap: 14 },
  lockTxt: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  certBox: { aspectRatio: 1.4, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderGold },
  certBorder: { flex: 1, margin: 14, borderWidth: 1, borderColor: theme.gold, padding: 20, alignItems: 'center', justifyContent: 'center' },
  club: { color: theme.gold, fontSize: 13, letterSpacing: 6, fontWeight: '700' },
  clubSub: { color: theme.textSecondary, fontSize: 9, letterSpacing: 3, marginTop: 4 },
  divider: { height: 1, width: 50, backgroundColor: theme.gold, marginVertical: 14 },
  cTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia', textAlign: 'center' },
  cPresentedTo: { color: theme.textSecondary, fontSize: 10, marginTop: 14, letterSpacing: 1.5 },
  cName: { color: theme.gold, fontSize: 26, fontFamily: 'Georgia', marginTop: 4, textAlign: 'center' },
  cFor: { color: theme.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center' },
  cEvent: { color: theme.white, fontSize: 14, fontFamily: 'Georgia', marginTop: 4, textAlign: 'center' },
  cFooter: { marginTop: 20, alignItems: 'center' },
  cVid: { color: theme.textMuted, fontSize: 8, letterSpacing: 2 },
  cVidVal: { color: theme.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginTop: 2 },
  legal: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 20 },
});
