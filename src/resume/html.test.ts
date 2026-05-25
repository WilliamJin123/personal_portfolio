import { test, expect } from 'vitest';
import { tokenize } from './tokenize';
import { escapeHtml, tokensToHtml } from './html';

test('escapeHtml escapes & < > "', () => {
  expect(escapeHtml('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
});

test('plain text passes through', () => {
  expect(tokensToHtml(tokenize('used Java daily'))).toBe('used Java daily');
});

test('bold renders rbold span', () => {
  expect(tokensToHtml(tokenize('**Python**'))).toBe('<span class="rbold">Python</span>');
});

test('text around bold', () => {
  expect(tokensToHtml(tokenize('used **Java** daily')))
    .toBe('used <span class="rbold">Java</span> daily');
});

test('link renders rlink anchor', () => {
  expect(tokensToHtml(tokenize('[GH](https://github.com/x)')))
    .toBe('<a class="rlink" href="https://github.com/x" target="_blank" rel="noreferrer">GH</a>');
});

test('ampersand in href is escaped for attribute context', () => {
  expect(tokensToHtml(tokenize('[q](https://a.com?b=1&c=2)')))
    .toBe('<a class="rlink" href="https://a.com?b=1&amp;c=2" target="_blank" rel="noreferrer">q</a>');
});

test('HTML special chars in text and bold are escaped', () => {
  expect(tokensToHtml(tokenize('5 < 10 and **a & b**')))
    .toBe('5 &lt; 10 and <span class="rbold">a &amp; b</span>');
});

test('unclosed markup stays literal text', () => {
  expect(tokensToHtml(tokenize('**oops'))).toBe('**oops');
});
