export const SCHEMA = Object.freeze({
  facets: Object.freeze({ color: ['black', 'blue', 'green', 'navy', 'red', 'white'], size: ['s', 'm', 'l', 'xl'] }),
  sorts: Object.freeze(['featured', 'price-asc', 'price-desc', 'name-asc']),
  preserved: Object.freeze(['utm_source']), maxQuery: 2000, maxValue: 80, maxFacetValues: 6, maxPage: 999
});

const empty = () => ({ facets: { color: [], size: [] }, sort: 'featured', page: 1, preserved: {} });
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value, keys) => isPlainObject(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
const safeValue = value => typeof value === 'string' && value.length > 0 && value.length <= SCHEMA.maxValue && !/[\u0000-\u001f\u007f]/.test(value) && /^[a-z0-9-]+$/i.test(value);
const invalidState = () => { throw new TypeError('invalid state'); };

export function normalizeState(value) {
  if (!hasExactKeys(value, ['facets', 'sort', 'page', 'preserved'])) invalidState();
  if (!hasExactKeys(value.facets, Object.keys(SCHEMA.facets))) invalidState();
  if (!SCHEMA.sorts.includes(value.sort) || !Number.isInteger(value.page) || value.page < 1 || value.page > SCHEMA.maxPage) invalidState();
  if (!isPlainObject(value.preserved) || Object.keys(value.preserved).some(key => !SCHEMA.preserved.includes(key))) invalidState();

  const facets = {};
  for (const [key, allowed] of Object.entries(SCHEMA.facets)) {
    const values = value.facets[key];
    if (!Array.isArray(values) || values.length > SCHEMA.maxFacetValues || values.some(item => typeof item !== 'string' || !allowed.includes(item))) invalidState();
    facets[key] = [...new Set(values)].sort();
  }

  const preserved = {};
  for (const key of SCHEMA.preserved) {
    if (!(key in value.preserved)) continue;
    const item = value.preserved[key];
    if (!safeValue(item) || item.length > 64) invalidState();
    preserved[key] = item;
  }
  return { facets, sort: value.sort, page: value.page, preserved };
}

export function parseQuery(input = '') {
  const raw = input.startsWith('?') ? input.slice(1) : input;
  if (raw.length > SCHEMA.maxQuery) throw new RangeError('query exceeds 2000 characters');
  const state = empty(), params = new URLSearchParams(raw);
  for (const [key, allowed] of Object.entries(SCHEMA.facets)) {
    state.facets[key] = [...new Set(params.getAll(key).filter(value => safeValue(value) && allowed.includes(value)))].sort().slice(0, SCHEMA.maxFacetValues);
  }
  const sort = params.get('sort');
  if (SCHEMA.sorts.includes(sort)) state.sort = sort;
  const page = params.get('page');
  if (/^[1-9]\d{0,2}$/.test(page || '')) state.page = Number(page);
  for (const key of SCHEMA.preserved) {
    const value = params.get(key);
    if (safeValue(value) && value.length <= 64) state.preserved[key] = value;
  }
  return state;
}

export function serializeQuery(value) {
  const state = normalizeState(value);
  const params = new URLSearchParams();
  for (const key of Object.keys(SCHEMA.facets).sort()) for (const item of state.facets[key]) params.append(key, item);
  if (state.sort !== 'featured') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  for (const key of SCHEMA.preserved) if (key in state.preserved) params.set(key, state.preserved[key]);
  return params.toString();
}

const filtersEqual = (a, b) => Object.keys(SCHEMA.facets).every(key => a.facets[key].length === b.facets[key].length && a.facets[key].every((value, index) => value === b.facets[key][index]));
export function transitionApplied(currentValue, nextValue) {
  const current = normalizeState(currentValue), next = normalizeState(nextValue);
  return { ...next, page: filtersEqual(current, next) ? next.page : 1 };
}
export function removeChip(stateValue, facet, value) {
  const state = normalizeState(stateValue);
  if (!(facet in SCHEMA.facets) || !SCHEMA.facets[facet].includes(value)) invalidState();
  return transitionApplied(state, { ...state, facets: { ...state.facets, [facet]: state.facets[facet].filter(item => item !== value) } });
}
export function clearFilters(stateValue) {
  const state = normalizeState(stateValue);
  return transitionApplied(state, { ...state, facets: Object.fromEntries(Object.keys(SCHEMA.facets).map(key => [key, []])) });
}