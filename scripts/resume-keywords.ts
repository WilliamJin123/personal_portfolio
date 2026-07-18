import { readFileSync } from 'node:fs';
import { library } from '../src/resume/data/index';
import { defaultSelection } from '../src/resume/generate';
import { classicSelection } from '../src/resume/selections';
import { analyzeJd, type TermReport } from '../src/resume/keywords';

// Usage: npm run resume:keywords -- path/to/jd.txt
// Diffs a job description against both résumé variants' default content and
// reports, ATS-style: what's on the page, what's one selection tweak away,
// and what's missing outright.

const jdPath = process.argv[2];
if (!jdPath) {
  console.error('Usage: npm run resume:keywords -- <jd.txt>');
  process.exit(1);
}

const jd = readFileSync(jdPath, 'utf8');
const reports = analyzeJd(jd, library, [defaultSelection(library), classicSelection(library)]);

const fmt = (r: TermReport) =>
  `  ${r.term} ×${r.count}${r.where.length ? `  (${r.where.join(', ')})` : ''}`;

const buckets: { status: TermReport['status']; label: string }[] = [
  { status: 'on-page', label: 'ON PAGE' },
  { status: 'in-library', label: 'IN LIBRARY — off by default, enable via selection' },
  { status: 'missing', label: 'MISSING' },
];

console.log(`JD keyword diff — ${jdPath} (${reports.length} known terms mentioned)\n`);
for (const { status, label } of buckets) {
  const rows = reports.filter((r) => r.status === status);
  console.log(`${label} (${rows.length})`);
  console.log(rows.length ? rows.map(fmt).join('\n') : '  —');
  console.log('');
}
