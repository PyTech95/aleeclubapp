import { Platform, Alert } from 'react-native';

/**
 * Convert array of plain objects to a CSV string.
 * Header row is the union of all keys across all rows.
 */
export function toCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';
  const headerSet = new Set<string>();
  for (const r of rows) Object.keys(r).forEach((k) => headerSet.add(k));
  const headers = Array.from(headerSet);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
}

/**
 * Trigger a CSV download. Web only — on native shows an alert
 * (a full mobile export would need expo-sharing + expo-file-system).
 */
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    Alert.alert('Nothing to export', 'There are no rows in the current view.');
    return;
  }
  const csv = toCsv(rows);
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = (globalThis as any).window;
    const blob = new w.Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = w.URL.createObjectURL(blob);
    const a = w.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    w.document.body.appendChild(a);
    a.click();
    w.document.body.removeChild(a);
    w.URL.revokeObjectURL(url);
  } else {
    Alert.alert('Export', `CSV download is available on the web admin only.\n\n(${rows.length} rows ready.)`);
  }
}
