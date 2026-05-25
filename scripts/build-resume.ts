import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { library } from '../src/resume/data/index';
import { defaultSelection, generateResume } from '../src/resume/generate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shell = readFileSync(resolve(root, 'src/resume/shell.tex'), 'utf8');
const tex = generateResume(library, defaultSelection(library), shell);

mkdirSync(resolve(root, 'out'), { recursive: true });
writeFileSync(resolve(root, 'out/resume.tex'), tex);
console.log('Wrote out/resume.tex');
