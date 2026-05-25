import { test, expect } from 'vitest';
import { tokenize } from './tokenize';

test('plain text is one text token', () => {
  expect(tokenize('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
});

test('bold span', () => {
  expect(tokenize('**Python**')).toEqual([{ type: 'bold', value: 'Python' }]);
});

test('text around bold', () => {
  expect(tokenize('used **Java** daily')).toEqual([
    { type: 'text', value: 'used ' },
    { type: 'bold', value: 'Java' },
    { type: 'text', value: ' daily' },
  ]);
});

test('two bold spans', () => {
  expect(tokenize('**Firebase** and **Firestore**')).toEqual([
    { type: 'bold', value: 'Firebase' },
    { type: 'text', value: ' and ' },
    { type: 'bold', value: 'Firestore' },
  ]);
});

test('link span', () => {
  expect(tokenize('[GH](https://github.com/x)')).toEqual([
    { type: 'link', label: 'GH', href: 'https://github.com/x' },
  ]);
});

test('unclosed markup stays literal text', () => {
  expect(tokenize('**oops')).toEqual([{ type: 'text', value: '**oops' }]);
});
