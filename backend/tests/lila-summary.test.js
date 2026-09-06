import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLilaSummary } from '../services/lilaCompletion.js';

const quote = 'Утром раздражён, после сигареты спокойнее';
const check = { currentEvidence: [quote], contradictionsReviewed: true, hasBlockingUnknowns: false };

test('summary requires evidence from the person and a completed readiness assessment', () => {
  assert.equal(validateLilaSummary('Итог', check, [quote]), 'Итог');
  assert.equal(validateLilaSummary('Итог', undefined, [quote]), null);
  assert.equal(validateLilaSummary('Итог', check, ['На празднике снова закурил']), null);
  assert.equal(validateLilaSummary('Итог', { ...check, currentEvidence: [] }, [quote]), null);
  assert.equal(validateLilaSummary('Итог', { ...check, hasBlockingUnknowns: true }, [quote]), null);
  assert.equal(validateLilaSummary('Итог', { ...check, contradictionsReviewed: false }, [quote]), null);
  assert.equal(validateLilaSummary(null, check, [quote]), null);
});
