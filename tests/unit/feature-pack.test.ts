import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTask, filterBusinesses, toCsv, renderAiSections, buildFallback, hasAiKey } from '../../src/lib/feature-pack';
import { createTask, listTasks, updateTask } from '../../src/lib/feature-pack-tasks';

test('validateTask requires title and defaults status', () => {
  assert.throws(() => validateTask({}), /title is required/);
  assert.equal(validateTask({ title: ' Call supplier ' }).title, 'Call supplier');
  assert.equal(validateTask({ title: 'X', status: 'bogus' }).status, 'open');
});

test('filterBusinesses and CSV export preserve false/0', () => {
  const rows = [
    { name: 'Alpha Plumbing', city: 'Austin', verified: true, avgRating: 0 },
    { name: 'Beta Electric', city: 'Dallas', verified: false, avgRating: 5 },
  ];
  assert.equal(filterBusinesses(rows, { search: 'alpha' }).length, 1);
  assert.equal(filterBusinesses(rows, { verified: 'true' }).length, 1);
  assert.match(toCsv(rows, ['name', 'avgRating']), /Alpha Plumbing,0/);
});

test('fallback AI is labelled and sections preserve false/0/empty', () => {
  const r = buildFallback('listing-quality-check', [{ id: '1', name: 'A' }]);
  assert.equal(r.source, 'fallback');
  assert.equal(r.aiGenerated, false);
  assert.deepEqual(renderAiSections({ ok: false, count: 0, note: '' }).map((s) => s.value), ['false', '0', '']);
  assert.equal(hasAiKey({}), false);
  assert.equal(hasAiKey({ OPENAI_API_KEY: 'x' }), true);
});

test('feature-pack tasks are owner-scoped on update', () => {
  const mine = createTask({ title: 'Mine', status: 'open', assignee: null, businessId: null, dueDate: null, notes: null, createdBy: 'owner-15b' });
  assert.equal(updateTask(mine.id, { status: 'done' }, 'someone-else'), null);
  assert.equal(updateTask(mine.id, { status: 'done' }, 'owner-15b')?.status, 'done');
  assert.equal(listTasks('owner-15b').some((t) => t.id === mine.id), true);
});
