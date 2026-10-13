import test from 'node:test';
import assert from 'node:assert/strict';
import { CollectionController, validateResponse } from '../src/controller.mjs';

const initial = { facets: { color: [], size: [] }, sort: 'featured', page: 1, preserved: {} };
const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
const response = (names = ['Alpha'], page = 1, pages = 1, total = names.length) => ({ items: names.map((name, i) => ({ id: String(i + 1), name, color: 'blue', size: 'm', price: 20 })), total, page, pages });

function harness(request, start = initial) {
  const events = [], history = [];
  const controller = new CollectionController({ initial: start, request, render: event => events.push(event), writeHistory: (url, mode) => history.push([url, mode]) });
  return { controller, events, history };
}

test('constructor and updateDraft enforce canonical internal state', () => {
  assert.throws(() => harness(async () => response(), { ...initial, page: 0 }), /invalid state/);
  const { controller } = harness(async () => response());
  assert.throws(() => controller.updateDraft({ ...initial, sort: 'bad' }), /invalid state/);
  controller.updateDraft({ ...initial, facets: { color: ['red', 'blue', 'red'], size: [] } });
  assert.deepEqual(controller.draft.facets.color, ['blue', 'red']);
});

test('response validation enforces bounded, consistent catalog pages', () => {
  assert.deepEqual(validateResponse(response(['A'])), response(['A']));
  for (const invalid of [
    response(Array(7).fill('A'), 1, 2, 7),
    { ...response(['A']), items: 'bad' },
    { ...response(['A']), items: [{ id: '1', name: 'A', color: 'blue', size: 'm', price: Infinity }] },
    { ...response(['A']), items: [{ id: '1', name: 'A', color: 'blue', size: 'm', price: -1 }] },
    { ...response(['A', 'B']), items: [{ id: '1', name: 'A', color: 'blue', size: 'm', price: 1 }, { id: '1', name: 'B', color: 'blue', size: 'm', price: 2 }] },
    response([], 0, 1, 0), response([], 1, 0, 0), response([], 2, 1, 0),
    response(['A'], 1, 1000, 1), response(['A'], 1, 1, -1),
    response(['A'], 1, 2, 1), response([], 1, 2, 7), response(['A', 'B', 'C', 'D', 'E'], 2, 2, 7)
  ]) assert.throws(() => validateResponse(invalid), /invalid response/);
});

test('draft changes can be cancelled or explicitly applied', async () => {
  const { controller, history } = harness(async () => response());
  controller.updateDraft({ ...initial, facets: { color: ['red'], size: [] }, sort: 'name-asc' });
  controller.cancelDraft();
  assert.deepEqual(controller.draft, initial);
  controller.updateDraft({ ...initial, facets: { color: ['blue'], size: [] }, sort: 'name-asc' });
  await controller.applyDraft();
  assert.deepEqual(controller.applied.facets.color, ['blue']);
  assert.equal(controller.applied.sort, 'name-asc');
  assert.equal(history.length, 1);
});

test('latest request wins for stale successes and stale errors', async () => {
  const first = deferred(), second = deferred(); let call = 0;
  const { controller, events } = harness(() => (++call === 1 ? first.promise : second.promise));
  const a = controller.load();
  controller.updateDraft({ ...initial, sort: 'price-asc' });
  const b = controller.applyDraft();
  second.resolve(response(['New'])); await b;
  first.reject(new Error('old failure')); await a;
  assert.equal(events.filter(e => e.type === 'success').at(-1).data.items[0].name, 'New');
  assert.equal(events.some(e => e.type === 'error'), false);
});

test('a current AbortError is renderable and a retry can succeed', async () => {
  let calls = 0;
  const abortError = Object.assign(new Error('request aborted upstream'), { name: 'AbortError' });
  const { controller, events } = harness(async () => ++calls === 1 ? Promise.reject(abortError) : response(['Recovered']));
  await controller.load();
  assert.equal(events.at(-1).type, 'error');
  await controller.retry();
  assert.equal(events.at(-1).type, 'success');
  assert.equal(events.at(-1).data.items[0].name, 'Recovered');
});

test('disposing a pending request prevents later success or error renders', async () => {
  const pending = deferred();
  const { controller, events } = harness(() => pending.promise);
  const load = controller.load();
  controller.dispose();
  pending.reject(new Error('late')); await load;
  assert.deepEqual(events.map(event => event.type), ['loading']);
});

test('server page reconciliation replaces history and preserves unsaved draft edits', async () => {
  const start = { ...initial, page: 999 };
  const { controller, events, history } = harness(async () => response(['Last'], 2, 2, 7), start);
  controller.updateDraft({ ...start, facets: { color: ['red'], size: [] }, sort: 'name-asc' });
  await controller.load();
  assert.equal(controller.applied.page, 2);
  assert.deepEqual(controller.draft.facets.color, ['red']);
  assert.equal(controller.draft.sort, 'name-asc');
  assert.equal(controller.draft.page, 2);
  assert.deepEqual(history, [['?page=2', 'replace']]);
  assert.equal(events.at(-1).state.page, 2);
});

test('restore writes no history unless the server canonicalizes its page', async () => {
  const { controller, history } = harness(async state => response([], state.page, 1, 0));
  await controller.restoreFromUrl('?color=red');
  assert.equal(controller.applied.facets.color[0], 'red');
  assert.equal(history.length, 0);
});