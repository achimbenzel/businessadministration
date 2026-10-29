// Dates, numbers and sizes — German format.
const dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const stampFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const rtf = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });

export const fmtDate = (ts) => (ts ? dateFmt.format(new Date(ts)) : '');
export const fmtDateTime = (ts) => (ts ? dateTimeFmt.format(new Date(ts)) : '');

/** "gerade eben", "vor 5 Minuten", "gestern" … — older than a week: the date. */
export function fmtRelative(ts, now = Date.now()) {
  if (!ts) return '';
  const s = Math.round((ts - now) / 1000);
  const a = Math.abs(s);
  if (a < 45) return 'gerade eben';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), 'day');
  return fmtDate(ts);
}

/** "29.10.2026, 14:32 Uhr" — within a week with the relative time in front: "vor 3 Tagen · 26.10.2026, 09:05 Uhr". */
export function fmtUpdated(ts, now = Date.now()) {
  if (!ts) return '';
  const stamp = `${stampFmt.format(new Date(ts))} Uhr`;
  return Math.abs(now - ts) < 7 * 86400 * 1000 ? `${fmtRelative(ts, now)} · ${stamp}` : stamp;
}

export function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toLocaleString('de-DE', { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`;
}

/** "1 Kapitel" / "3 Kapitel", "1 Karte" / "2 Karten". */
export const plural = (n, one, many) => `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;
