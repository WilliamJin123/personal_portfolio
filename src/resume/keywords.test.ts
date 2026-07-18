import { describe, expect, it } from 'vitest';
import { analyzeJd, libraryTerms, searchableChunks } from './keywords';
import type { ResumeLibrary, Selection } from './types';

// Fixture, not the real library: tests must pass without the gitignored data/.
const lib: ResumeLibrary = {
  skills: [
    { category: 'Languages', items: ['Java', 'Python'] },
    { category: 'AI/ML', items: ['LLM APIs (Anthropic Claude, OpenAI, etc.)'] },
  ],
  entries: [
    {
      id: 'job',
      section: 'experience',
      title: 'Acme',
      role: 'Intern',
      bullets: [
        { id: 'on', text: 'Shipped a **React** dashboard' },
        { id: 'off', text: 'Wrote **JMockit** unit tests', default: false },
      ],
    },
  ],
} as ResumeLibrary;

const sel: Selection = { entryIds: ['job'], bulletIds: { job: ['on'] } };

describe('libraryTerms', () => {
  it('explodes parenthesized skill items into their own terms', () => {
    const names = libraryTerms(lib).map((t) => t.name);
    expect(names).toContain('LLM APIs');
    expect(names).toContain('Anthropic Claude');
    expect(names).toContain('OpenAI');
    expect(names).not.toContain('etc.');
  });
});

describe('searchableChunks', () => {
  it('marks default bullets on-page and non-default bullets off', () => {
    const chunks = searchableChunks(lib, [sel]);
    expect(chunks.find((c) => c.where === 'bullet:job/on')?.onPage).toBe(true);
    expect(chunks.find((c) => c.where === 'bullet:job/off (off)')?.onPage).toBe(false);
  });

  it('strips bold markers from bullet text', () => {
    const chunks = searchableChunks(lib, [sel]);
    expect(chunks.find((c) => c.where === 'bullet:job/on')?.text).toBe('Shipped a React dashboard');
  });
});

describe('analyzeJd', () => {
  it('buckets terms by where they live', () => {
    const jd = 'Looking for React and unit testing experience, Kubernetes a plus. React required.';
    const byTerm = Object.fromEntries(analyzeJd(jd, lib, [sel]).map((r) => [r.term, r]));
    // React sits in a bullet but not in the fixture's lexicon → never reported.
    expect(byTerm['React']).toBeUndefined();
    expect(byTerm['Unit Testing'].status).toBe('in-library');
    expect(byTerm['Unit Testing'].where).toContain('bullet:job/off (off)');
    expect(byTerm['Kubernetes'].status).toBe('missing');
  });

  it('counts all mentions and sorts most-mentioned first', () => {
    const jd = 'Python, Python, and Java.';
    const reports = analyzeJd(jd, lib, [sel]);
    expect(reports[0]).toMatchObject({ term: 'Python', count: 2, status: 'on-page' });
  });

  it('respects word boundaries: Java does not match JavaScript', () => {
    const reports = analyzeJd('JavaScript only, no J-a-v-a here.', lib, [sel]);
    expect(reports.find((r) => r.term === 'Java')).toBeUndefined();
  });

  it('matches acronym aliases, e.g. spelled-out CI/CD forms', () => {
    const reports = analyzeJd('We value continuous integration and GitHub Actions.', lib, [sel]);
    expect(reports.find((r) => r.term === 'CI/CD')?.count).toBe(2);
  });
});
