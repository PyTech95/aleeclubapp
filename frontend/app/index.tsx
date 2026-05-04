import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import GoldButton from '../src/components/GoldButton';
import { theme } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { heroB64 } from '../src/heroImage';

const { height } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.replace('/admin');
      else router.replace('/(tabs)/home');
    }
  }, [user, loading]);

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: theme.gold, letterSpacing: 4 }}>ALEE CLUB</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: heroB64 }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(5,5,5,0.05)', 'rgba(5,5,5,0.2)', 'rgba(5,5,5,0.85)', '#050505']}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Text style={styles.brand} testID="brand-title">ALEE CLUB</Text>
          <Text style={styles.tag}>TALENT · FASHION · FAME</Text>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.heroH1}>Where{'\n'}Stars{'\n'}Are Born.</Text>
          <Text style={styles.heroSub}>
            India's premier platform to discover beauty pageants, auditions, and unlock your signature journey on the global stage.
          </Text>
          <View style={styles.ctas}>
            <GoldButton
              title="Begin Your Journey"
              onPress={() => router.push('/auth/register')}
              testID="cta-register"
            />
            <GoldButton
              title="I already have an account"
              variant="ghost"
              onPress={() => router.push('/auth/login')}
              testID="cta-login"
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  bg: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
  top: { paddingTop: 24, alignItems: 'center' },
  brand: { color: theme.gold, fontSize: 16, letterSpacing: 8, fontWeight: '700' },
  tag: { color: theme.textMuted, fontSize: 10, letterSpacing: 4, marginTop: 6 },
  bottom: { paddingBottom: 24 },
  heroH1: {
    color: theme.white,
    fontSize: 68,
    lineHeight: 72,
    fontWeight: '300',
    fontFamily: 'Georgia',
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSub: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 28, paddingRight: 20 },
  ctas: { gap: 8 },
});
