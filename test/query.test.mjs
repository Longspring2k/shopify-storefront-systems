import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, parseQuery, serializeQuery, transitionApplied, removeChip, clearFilters } from '../src/query-state.mjs';

const base = { facets: { color: [], size: [] }, sort: 'featured', page: 1, preserved: {} };

test('query parser deduplicates facets and serializer emits stable canonical order', () => {
  const parsed = parseQuery('?size=m&color=blue&color=red&color=blue&sort=price-desc&page=2&utm_source=mail');
  assert.deepEqual(parsed, { facets: { color: ['blue', 'red'], size: ['m'] }, sort: 'price-desc', page: 2, preserved: { utm_source: 'mail' } });
  assert.equal(serializeQuery(parsed), 'color=blue&color=red&size=m&sort=price-desc&page=2&utm_source=mail');
  assert.deepEqual(parseQuery(`?${serializeQuery(parsed)}`), parsed);
});

test('malformed, unknown, oversized, and dangerous values are ignored or bounded', () => {
  const long = 'x'.repeat(81);
  assert.deepEqual(parseQuery(`?color=%3Cscript%3E&size=${long}&sort=evil&page=-2&admin=true&utm_source=${'y'.repeat(65)}`), base);
  assert.deepEqual(parseQuery('?color=blue&color=red&color=green&color=black&color=white&color=navy&color=teal'), { ...base, facets: { color: ['black', 'blue', 'green', 'navy', 'red', 'white'], size: [] } });
  assert.deepEqual(parseQuery('?page=2%0A&utm_source=mail%0A'), base);
  assert.deepEqual(parseQuery('?utm_source=mail%00evil'), base);
  assert.throws(() => parseQuery(`?q=${'a'.repeat(2001)}`), /query exceeds/);
});

test('internal state boundaries require exact valid shapes and canonicalize facet sets', () => {
  const reordered = { facets: { color: ['red', 'blue', 'red'], size: ['m'] }, sort: 'price-asc', page: 3, preserved: { utm_source: 'mail' } };
  assert.deepEqual(normalizeState(reordered), { facets: { color: ['blue', 'red'], size: ['m'] }, sort: 'price-asc', page: 3, preserved: { utm_source: 'mail' } });
  assert.equal(serializeQuery(reordered), 'color=blue&color=red&size=m&sort=price-asc&page=3&utm_source=mail');

  for (const invalid of [
    null,
    { ...base, extra: true },
    { ...base, facets: { color: [] } },
    { ...base, facets: { color: ['teal'], size: [] } },
    { ...base, facets: { color: [], size: [] }, sort: 'unknown' },
    { ...base, page: 0 },
    { ...base, page: 1000 },
    { ...base, preserved: { utm_source: 'mail', campaign: 'x' } },
    { ...base, preserved: { utm_source: 'mail\n' } }
  ]) assert.throws(() => normalizeState(invalid), /invalid state/);
});

test('applying filter changes resets pagination but set-equivalent facets do not', () => {
  const current = { ...base, facets: { color: ['blue', 'red'], size: ['m'] }, page: 3 };
  assert.equal(transitionApplied(current, { ...current, facets: { color: ['red'], size: ['m'] } }).page, 1);
  assert.equal(transitionApplied(current, { ...current, facets: { color: ['red', 'blue', 'red'], size: ['m'] }, sort: 'price-asc' }).page, 3);
});

test('a newline-suffixed page is invalid rather than silently canonicalized', () => {
  assert.equal(parseQuery('?page=2%0A').page, 1);
  assert.equal(parseQuery('?page=2%0D').page, 1);
});

test('chip removal removes one facet value and clear preserves sort', () => {
  const state = { facets: { color: ['blue', 'red'], size: ['m'] }, sort: 'price-desc', page: 4, preserved: {} };
  assert.deepEqual(removeChip(state, 'color', 'blue'), { ...state, facets: { color: ['red'], size: ['m'] }, page: 1 });
  assert.deepEqual(clearFilters(state), { ...state, facets: { color: [], size: [] }, page: 1 });
});