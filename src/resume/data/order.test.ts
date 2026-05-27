import { describe, it, expect } from 'vitest';
import { dateSortKey, byDateDesc } from './order';

describe('dateSortKey', () => {
  it('parses a single month/year', () => {
    expect(dateSortKey('Sept 2025')).toBe(2025 * 12 + 8);
  });

  it('uses the END of a range', () => {
    expect(dateSortKey('Dec 2025 - Feb 2026')).toBe(2026 * 12 + 1);
  });

  it('handles mixed spellings (Jan, Sept, June, July)', () => {
    expect(dateSortKey('June 2025 - July 2025')).toBe(2025 * 12 + 6);
    expect(dateSortKey('Jan 2026')).toBe(2026 * 12 + 0);
  });

  it('orders an open-ended education range by its future end', () => {
    expect(dateSortKey('Sept 2024 - May 2029')).toBe(2029 * 12 + 4);
  });

  it('returns -Infinity for an unparseable label', () => {
    expect(dateSortKey('someday')).toBe(-Infinity);
  });
});

describe('byDateDesc', () => {
  it('sorts latest end date first and is stable on ties', () => {
    const input = [
      { dateLabel: 'Sept 2025', id: 'solshare' },
      { dateLabel: 'Jan 2026', id: 'stitch' },
      { dateLabel: 'Sept 2025', id: 'email' }, // ties solshare; must stay after it
      { dateLabel: 'Feb 2026 - Mar 2026', id: 'tract' },
    ];
    expect([...input].sort(byDateDesc).map((e) => e.id)).toEqual([
      'tract',
      'stitch',
      'solshare',
      'email',
    ]);
  });
});
