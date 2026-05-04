import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const STEPS: { key: string; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Screening' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'selected', label: 'Final Round' },
];

export default function StatusTimeline({ status, timeline }: { status: string; timeline?: { step: string; at: string; note?: string }[] }) {
  const order = ['applied', 'under_review', 'shortlisted', 'selected'];
  let currentIdx = order.indexOf(status);
  if (status === 'rejected') currentIdx = -1;

  return (
    <View style={styles.wrap}>
      {STEPS.map((s, i) => {
        const done = currentIdx >= i && status !== 'rejected';
        const active = currentIdx === i;
        const last = i === STEPS.length - 1;
        const entry = timeline?.find((t) => t.step === s.key);
        return (
          <View key={s.key} style={styles.row}>
            <View style={styles.lineCol}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done && <Ionicons name="checkmark" size={14} color="#000" />}
              </View>
              {!last && <View style={[styles.line, done && styles.lineDone]} />}
            </View>
            <View style={styles.content}>
              <Text style={[styles.label, done && styles.labelDone]}>{s.label}</Text>
              {entry ? (
                <Text style={styles.note}>{entry.note || new Date(entry.at).toLocaleDateString()}</Text>
              ) : (
                <Text style={styles.noteMuted}>{done ? 'Completed' : active ? 'In progress' : 'Pending'}</Text>
              )}
            </View>
          </View>
        );
      })}
      {status === 'rejected' && (
        <View style={styles.rejectedBanner}>
          <Ionicons name="close-circle" size={18} color={theme.danger} />
          <Text style={styles.rejectedTxt}>Not selected this time. Keep growing.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  lineCol: { alignItems: 'center', width: 40 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: theme.gold, borderColor: theme.gold, shadowColor: theme.gold, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  dotActive: { borderColor: theme.gold, borderWidth: 2 },
  line: { width: 2, flex: 1, minHeight: 36, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  lineDone: { backgroundColor: theme.goldDark },
  content: { flex: 1, paddingBottom: 28, paddingTop: 3, marginLeft: 6 },
  label: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  labelDone: { color: theme.white },
  note: { color: theme.gold, fontSize: 12, marginTop: 2 },
  noteMuted: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  rejectedBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1,
    borderRadius: 12, padding: 12, marginTop: 8,
  },
  rejectedTxt: { color: theme.danger, fontSize: 13 },
});
