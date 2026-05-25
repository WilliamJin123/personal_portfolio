import { test, expect } from 'vitest';
import { entries } from '../resume/data/entries';
import { portfolioMedia } from './portfolio-media';

test('every projects/experience entry has a portfolio-media record', () => {
  const ids = entries
    .filter((e) => e.section === 'projects' || e.section === 'experience')
    .map((e) => e.id);
  for (const id of ids) {
    expect(portfolioMedia[id], `missing media for ${id}`).toBeDefined();
  }
});
