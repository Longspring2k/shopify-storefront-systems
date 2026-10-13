import { normalizeState, parseQuery, serializeQuery, transitionApplied } from './query-state.mjs';

const PER_PAGE = 6;
const MAX_PAGE = 999;
const clone = value => structuredClone(value);
const invalidResponse = () => { throw new TypeError('invalid response shape'); };

export function validateResponse(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.items)) invalidResponse();
  if (!Number.isSafeInteger(value.total) || value.total < 0 || !Number.isInteger(value.page) || value.page < 1 || value.page > MAX_PAGE || !Number.isInteger(value.pages) || value.pages < 1 || value.pages > MAX_PAGE || value.page > value.pages) invalidResponse();
  if (value.items.length > PER_PAGE) invalidResponse();

  const ids = new Set();
  for (const item of value.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'color,id,name,price,size') invalidResponse();
    if (typeof item.id !== 'string' || item.id.length === 0 || ids.has(item.id) || typeof item.name !== 'string' || item.name.length === 0 || typeof item.color !== 'string' || typeof item.size !== 'string' || !Number.isFinite(item.price) || item.price < 0) invalidResponse();
    ids.add(item.id);
  }

  const expectedPages = Math.max(1, Math.ceil(value.total / PER_PAGE));
  if (value.pages !== expectedPages) invalidResponse();
  const expectedItems = value.page < value.pages ? PER_PAGE : value.total - PER_PAGE * (value.pages - 1);
  if (value.items.length !== expectedItems) invalidResponse();
  return value;
}

export class CollectionController {
  #request; #render; #writeHistory; #sequence = 0; #abort = null; #disposed = false;
  constructor({ initial, request, render, writeHistory }) {
    this.applied = normalizeState(initial);
    this.draft = clone(this.applied);
    this.#request = request;
    this.#render = render;
    this.#writeHistory = writeHistory;
  }
  updateDraft(next) { if (!this.#disposed) this.draft = normalizeState(next); }
  cancelDraft() { if (!this.#disposed) this.draft = clone(this.applied); }
  async applyDraft() {
    if (this.#disposed) return;
    this.applied = transitionApplied(this.applied, this.draft);
    this.draft = clone(this.applied);
    this.#writeHistory(`?${serializeQuery(this.applied)}`, 'push');
    return this.load();
  }
  async restoreFromUrl(search) {
    if (this.#disposed) return;
    this.applied = parseQuery(search);
    this.draft = clone(this.applied);
    return this.load();
  }
  async retry() { if (!this.#disposed) return this.load(); }
  async load() {
    if (this.#disposed) return;
    const id = ++this.#sequence;
    this.#abort?.abort();
    this.#abort = new AbortController();
    const requested = clone(this.applied);
    this.#render({ type: 'loading', state: requested });
    try {
      const data = validateResponse(await this.#request(requested, this.#abort.signal));
      if (this.#disposed || id !== this.#sequence) return;
      if (data.page !== this.applied.page) {
        this.applied = { ...this.applied, page: data.page };
        this.draft = { ...this.draft, page: data.page };
        this.#writeHistory(`?${serializeQuery(this.applied)}`, 'replace');
      }
      this.#render({ type: data.items.length ? 'success' : 'empty', data, state: clone(this.applied) });
    } catch (error) {
      if (this.#disposed || id !== this.#sequence) return;
      this.#render({ type: 'error', message: error instanceof TypeError ? error.message : 'Network request failed', state: clone(this.applied) });
    }
  }
  dispose() { this.#disposed = true; this.#sequence++; this.#abort?.abort(); }
}