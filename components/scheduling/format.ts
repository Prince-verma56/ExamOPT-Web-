export function clock(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "—";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function shortDate(iso: string | null | undefined, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ms(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 1000) return `${value.toFixed(value < 10 ? 1 : 0)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

export const num = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const ALGORITHM_LABEL: Record<string, string> = {
  FIRST_FIT: "First-Fit",
  WELSH_POWELL: "Welsh-Powell",
  BACKTRACKING: "Backtracking",
};
