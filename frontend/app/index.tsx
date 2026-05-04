import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import GoldButton from '../src/components/GoldButton';
import { theme } from '../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoB64 } from '../src/logoImage';

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
      <LinearGradient
        colors={['#000', '#0A0A0A', '#000']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: logoB64 }} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.tag}>TALENT · FASHION · FAME</Text>

          <Text style={styles.h1} testID="hero-tagline">
            Your journey{'\n'}to <Text style={styles.h1Gold}>stardom</Text>{'\n'}begins here
          </Text>

          <Text style={styles.sub}>
            Discover. Compete. Shine on India's most prestigious pageant stage.
          </Text>
        </View>
        <View style={styles.bottom}>
          <GoldButton
            title="Start Now"
            onPress={() => router.push('/auth/login')}
            testID="cta-start"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, minHeight: height, width: '100%' },
  safe: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: 220, height: 110, marginBottom: 28, alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: '100%', height: '100%' },
  tag: { color: theme.gold, fontSize: 11, letterSpacing: 6, fontWeight: '700', marginBottom: 32 },
  h1: {
    color: theme.white,
    fontSize: 44,
    lineHeight: 52,
    fontFamily: 'Georgia',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  h1Gold: { color: theme.gold, fontFamily: 'Georgia' },
  sub: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 24, paddingHorizontal: 12, lineHeight: 20 },
  bottom: { paddingBottom: 24 },
});
