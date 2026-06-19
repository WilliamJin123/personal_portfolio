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

// Parse a dateLabel's START month: the FIRST "Mon YYYY" token — the start of a
// range ("Jan 2026 - May 2026" -> Jan 2026) or the only date. Same spelling
// tolerance as parseEndDate. The start month is what fixes a co-op term: a job
// is named by the term it BEGINS in, so a "Jan 2026 - May 2026" term is Winter
// 2026 (it just overran into May), not Spring.
export function parseStartDate(label: string): EndDate | null {
  const m = label.match(/([A-Za-z]{3,})\s+(\d{4})/);
  if (!m) return null;
  const monthIndex = MONTHS[m[1].slice(0, 3).toLowerCase()];
  const year = Number(m[2]);
  if (monthIndex === undefined || !Number.isFinite(year)) return null;
  return { year, monthIndex, monthLabel: MONTH_LABELS[monthIndex] };
}

// UWaterloo academic terms — 4-month blocks named by their START month:
// Winter = Jan–Apr, Spring = May–Aug, Fall = Sep–Dec. `key` (year*3 + index)
// sorts terms chronologically; group the timeline on `key` so each term header
// appears once and in order.
const TERM_LABELS = ['Winter', 'Spring', 'Fall'] as const;
export interface Term {
  year: number;
  index: number; // 0 = Winter, 1 = Spring, 2 = Fall
  label: string; // "Winter"
  key: number;   // year*3 + index, ascending in time
}

export function termOf(label: string): Term | null {
  const d = parseStartDate(label);
  if (!d) return null;
  const index = Math.floor(d.monthIndex / 4); // 0..2
  return { year: d.year, index, label: TERM_LABELS[index], key: d.year * 3 + index };
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
