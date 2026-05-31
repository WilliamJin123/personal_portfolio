// Auto-ordering for résumé/viewer entries. Entries may be authored in any
// order; both surfaces (the public viewer and the generated résumé) render them
// reverse-chronologically by the END of their dateLabel. Sorting is stable, so
// entries that share an end month keep their authored order (use that to break
// ties deliberately, e.g. put the more prominent project first in the source).

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface EndDate {
  year: number;
  monthIndex: number; // 0 = Jan
  monthLabel: string; // canonical 3-letter label ("Sept" in the data normalizes to "Sep")
}

// Parse a dateLabel's END month: the last "Mon YYYY" token — the end of a range
// ("Dec 2025 - Feb 2026" -> Feb 2026) or the only date ("Sept 2025"). Tolerates
// the mixed spellings in the data ("Jan", "Sept", "June") by matching on the
// first three letters. Returns null when nothing parses.
export function parseEndDate(label: string): EndDate | null {
  const matches = [...label.matchAll(/([A-Za-z]{3,})\s+(\d{4})/g)];
  const last = matches[matches.length - 1];
  if (!last) return null;
  const monthIndex = MONTHS[last[1].slice(0, 3).toLowerCase()];
  const year = Number(last[2]);
  if (monthIndex === undefined || !Number.isFinite(year)) return null;
  return { year, monthIndex, monthLabel: MONTH_LABELS[monthIndex] };
}

// Sortable integer (year*12 + monthIndex) from the end date. Unparseable labels
// return -Infinity so they sort last under descending order.
export function dateSortKey(label: string): number {
  const d = parseEndDate(label);
  return d ? d.year * 12 + d.monthIndex : -Infinity;
}

// Stable reverse-chronological comparator (latest end date first).
export const byDateDesc = <T extends { dateLabel: string }>(a: T, b: T): number =>
  dateSortKey(b.dateLabel) - dateSortKey(a.dateLabel);
