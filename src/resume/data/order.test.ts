import { describe, it, expect } from 'vitest';
import { dateSortKey, byDateDesc, parseStartDate, termOf } from './order';

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

describe('parseStartDate', () => {
  it('uses the START of a range (not the end)', () => {
    expect(parseStartDate('Jan 2026 - May 2026')).toEqual({
      year: 2026,
      monthIndex: 0,
      monthLabel: 'Jan',
    });
  });

  it('falls back to the only date when there is no range', () => {
    expect(parseStartDate('June 2026')?.monthLabel).toBe('Jun');
  });

  it('returns null for an unparseable label', () => {
    expect(parseStartDate('someday')).toBeNull();
  });
});

describe('termOf (UWaterloo terms, start-based)', () => {
  it('buckets by the START month so a co-op term reads correctly', () => {
    // Jan–May co-op is a Winter term that overran into May, NOT Spring.
    expect(termOf('Jan 2026 - May 2026')).toMatchObject({ label: 'Winter', year: 2026 });
    // Jul–Sep is a Spring term that ran into September, NOT Fall.
    expect(termOf('July 2025 - Sept 2025')).toMatchObject({ label: 'Spring', year: 2025 });
    // Dec–Feb begins in the Fall term.
    expect(termOf('Dec 2025 - Feb 2026')).toMatchObject({ label: 'Fall', year: 2025 });
  });

  it('maps each 4-month block: Winter=Jan–Apr, Spring=May–Aug, Fall=Sep–Dec', () => {
    expect(termOf('Feb 2026')?.label).toBe('Winter');
    expect(termOf('June 2026')?.label).toBe('Spring');
    expect(termOf('Sept 2025')?.label).toBe('Fall');
    expect(termOf('Dec 2025')?.label).toBe('Fall');
  });

  it('keys ascend in time so newer terms sort first under descending order', () => {
    const spring26 = termOf('June 2026')!.key;
    const winter26 = termOf('Jan 2026')!.key;
    const fall25 = termOf('Oct 2025')!.key;
    expect(spring26).toBeGreaterThan(winter26);
    expect(winter26).toBeGreaterThan(fall25);
  });

  it('returns null for an unparseable label', () => {
    expect(termOf('someday')).toBeNull();
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
