import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, shadow } from '../theme';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  testID?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export default function GoldButton({ title, onPress, loading, disabled, variant = 'primary', testID, style, small }: Props) {
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.wrap, small && styles.small, shadow.gold, (disabled || loading) && styles.disabled, style]}
      >
        <LinearGradient
          colors={['#F3E5AB', '#D4AF37', '#996515']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.grad, small && styles.smallGrad]}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.txt, small && styles.smallTxt]}>{title}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.wrap, styles.secondary, small && styles.small, (disabled || loading) && styles.disabled, style]}
      >
        {loading ? <ActivityIndicator color={theme.gold} /> : <Text style={[styles.txtSecondary, small && styles.smallTxt]}>{title}</Text>}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.ghost, style]}
    >
      <Text style={styles.ghostTxt}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  small: { alignSelf: 'flex-start' },
  grad: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  smallGrad: { paddingHorizontal: 20, paddingVertical: 10, minHeight: 38 },
  txt: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  smallTxt: { fontSize: 13 },
  disabled: { opacity: 0.5 },
  secondary: {
    borderWidth: 1,
    borderColor: theme.borderGold,
    backgroundColor: 'rgba(212,175,55,0.05)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  txtSecondary: { color: theme.gold, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  ghost: { paddingVertical: 10, paddingHorizontal: 12 },
  ghostTxt: { color: theme.gold, fontSize: 14, fontWeight: '500' },
});
