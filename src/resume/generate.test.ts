import { test, expect } from 'vitest';
import { defaultSelection, generateBody, generateResume } from './generate';
import { fixtureLibrary as lib } from './fixtures';

test('defaultSelection includes all entries and default:true bullets in order', () => {
  const sel = defaultSelection(lib);
  expect(sel.entryIds).toEqual(['lab', 'sol', 'uw']);
  expect(sel.bulletIds.lab).toEqual(['a']); // 'b' is default:false
  expect(sel.bulletIds.sol).toEqual(['a']);
});

test('body escapes titles and bullets', () => {
  const body = generateBody(lib, defaultSelection(lib));
  expect(body).toContain('{R\\&D Lab}'); // title escaped
  expect(body).toContain('\\textbf{40\\%}'); // bold + escaped bullet
  expect(body).not.toContain('A dropped bullet'); // default:false excluded
});

test('body emits the right macros per section, in order', () => {
  const body = generateBody(lib, defaultSelection(lib));
  expect(body).toContain('\\resumeSubheading');
  expect(body).toContain('\\resumeProject');
  expect(body).toContain('\\reslink{https://github.com/x/sol}'); // project title -> repo
  expect(body.indexOf('Experience')).toBeLessThan(body.indexOf('Projects'));
  expect(body.indexOf('Projects')).toBeLessThan(body.indexOf('Education'));
});

test('generateResume injects body at the marker', () => {
  const out = generateResume(lib, defaultSelection(lib), 'PRE\n%%RESUME_BODY%%\nPOST');
  expect(out.startsWith('PRE')).toBe(true);
  expect(out.endsWith('POST')).toBe(true);
  expect(out).toContain('\\resumeSubheading');
});

test('generateResume throws if the marker is missing', () => {
  expect(() => generateResume(lib, defaultSelection(lib), 'no marker here')).toThrow(
    /RESUME_BODY/,
  );
});

test('generateResume throws if the marker appears more than once', () => {
  expect(() =>
    generateResume(lib, defaultSelection(lib), 'A %%RESUME_BODY%% B %%RESUME_BODY%% C'),
  ).toThrow(/expected exactly one/);
});
