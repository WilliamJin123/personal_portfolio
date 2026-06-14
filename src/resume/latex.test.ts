import { test, expect } from 'vitest';
import { escapeLatex, tokensToLatex } from './latex';
import { tokenize } from './tokenize';

test('escapes LaTeX specials', () => {
  expect(escapeLatex('72%')).toBe('72\\%');
  expect(escapeLatex('A & B')).toBe('A \\& B');
  expect(escapeLatex('a_b #1')).toBe('a\\_b \\#1');
});

test('backslash does not double-escape', () => {
  expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
});

test('bold token -> \\textbf with escaped content', () => {
  expect(tokensToLatex([{ type: 'bold', value: '72%' }])).toBe('\\textbf{72\\%}');
});

test('link token -> \\reslink, href left raw', () => {
  expect(tokensToLatex([{ type: 'link', label: 'GH', href: 'https://x/y' }])).toBe(
    '\\reslink{https://x/y}{GH}',
  );
});

test('end-to-end: tokenize then render', () => {
  expect(tokensToLatex(tokenize('hit **72%** with Azure & AI'))).toBe(
    'hit \\textbf{72\\%} with Azure \\& AI',
  );
});
