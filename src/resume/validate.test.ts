import { test, expect } from 'vitest';
import { fixtureLibrary } from './fixtures';
import { defaultSelection } from './generate';
import { validateLibrary, validateSelection, assertValid } from './validate';
import type { ResumeLibrary } from './types';

const clone = (): ResumeLibrary => structuredClone(fixtureLibrary);
const errors = (lib: ResumeLibrary) => validateLibrary(lib).filter((i) => i.level === 'error');
const warns = (lib: ResumeLibrary) => validateLibrary(lib).filter((i) => i.level === 'warn');

test('the fixture library is clean — no errors, no warnings', () => {
  expect(validateLibrary(fixtureLibrary)).toEqual([]);
});

test('duplicate entry id is an error', () => {
  const lib = clone();
  lib.entries[1].id = 'lab'; // collides with entries[0]
  expect(errors(lib).some((i) => /duplicate entry id/.test(i.message))).toBe(true);
});

test('duplicate bullet id within an entry is an error', () => {
  const lib = clone();
  lib.entries[0].bullets[1].id = 'a'; // collides with bullets[0]
  expect(errors(lib).some((i) => /duplicate bullet id/.test(i.message))).toBe(true);
});

test('an included entry with no bullets is an error', () => {
  const lib = clone();
  lib.entries[0].bullets = [];
  expect(errors(lib).some((i) => /at least one bullet/.test(i.message))).toBe(true);
});

test('a missing title is an error', () => {
  const lib = clone();
  lib.entries[0].title = '   ';
  expect(errors(lib).some((i) => i.path.endsWith('.title'))).toBe(true);
});

test('an unparseable dateLabel is a warning, not an error', () => {
  const lib = clone();
  lib.entries[0].dateLabel = 'sometime soon';
  expect(errors(lib)).toEqual([]);
  expect(warns(lib).some((i) => /unparseable dateLabel/.test(i.message))).toBe(true);
});

test('an unsafe link scheme is an error', () => {
  const lib = clone();
  lib.entries[1].links![0].href = 'javascript:alert(1)';
  expect(errors(lib).some((i) => /unsupported URL scheme/.test(i.message))).toBe(true);
});

test('a link with LaTeX-risky chars warns', () => {
  const lib = clone();
  lib.entries[1].links![0].href = 'https://example.com/~user';
  expect(errors(lib)).toEqual([]);
  expect(warns(lib).some((i) => /percent-encode/.test(i.message))).toBe(true);
});

test('unbalanced bold markup warns', () => {
  const lib = clone();
  lib.entries[0].bullets[0].text = 'Shipped **fast but never closed';
  expect(warns(lib).some((i) => /unbalanced/.test(i.message))).toBe(true);
});

test('selection referencing an unknown entry is an error', () => {
  const sel = defaultSelection(fixtureLibrary);
  sel.entryIds.push('ghost');
  expect(validateSelection(fixtureLibrary, sel).some((i) => /unknown entry/.test(i.message))).toBe(true);
});

test('selection referencing an unknown bullet is an error', () => {
  const sel = defaultSelection(fixtureLibrary);
  sel.bulletIds.lab = ['a', 'nope'];
  expect(validateSelection(fixtureLibrary, sel).some((i) => /unknown bullet/.test(i.message))).toBe(true);
});

test('assertValid throws on errors and returns warnings otherwise', () => {
  const bad = clone();
  bad.entries[1].id = 'lab';
  expect(() => assertValid(bad)).toThrow(/validation failed/);

  const warnOnly = clone();
  warnOnly.entries[0].dateLabel = 'whenever';
  const returned = assertValid(warnOnly, defaultSelection(warnOnly));
  expect(returned.every((i) => i.level === 'warn')).toBe(true);
  expect(returned.some((i) => /unparseable dateLabel/.test(i.message))).toBe(true);
});
