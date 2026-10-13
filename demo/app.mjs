import { CollectionController } from '/src/controller.mjs';
import { parseQuery, serializeQuery, removeChip, clearFilters } from '/src/query-state.mjs';

const form = document.querySelector('#filters');
const sort = document.querySelector('#sort');
const grid = document.querySelector('#grid');
const status = document.querySelector('#status');
const chips = document.querySelector('#chips');
const pages = document.querySelector('#pages');
const pending = document.querySelector('#pending');
const request = async (state, signal) => {
  const res = await fetch(`/api/products?${serializeQuery(state)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const writeHistory = (url, mode) => history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url || location.pathname);
const controller = new CollectionController({ initial: parseQuery(location.search), request, writeHistory, render });

function statesEqual(a, b) { return serializeQuery(a) === serializeQuery(b); }
function syncControls(state) {
  for (const input of form.querySelectorAll('input')) input.checked = state.facets[input.name].includes(input.value);
  sort.value = state.sort;
}
function syncPending() {
  const changed = !statesEqual(controller.draft, controller.applied);
  pending.hidden = !changed;
  pending.textContent = changed ? 'Draft changes are pending. Shown results still use the applied filters and sort.' : '';
}
function readDraft() {
  const next = structuredClone(controller.draft);
  for (const key of Object.keys(next.facets)) next.facets[key] = [...form.querySelectorAll(`input[name="${key}"]:checked`)].map(el => el.value);
  next.sort = sort.value;
  return next;
}
function editDraft() {
  controller.updateDraft(readDraft());
  syncControls(controller.draft);
  syncPending();
}
function button(text, onClick, className = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.className = className;
  el.addEventListener('click', onClick);
  return el;
}
function render(event) {
  grid.replaceChildren();
  pages.replaceChildren();
  status.className = '';
  renderChips();
  syncPending();
  if (event.type === 'loading') { status.textContent = 'Loading applied filters…'; return; }
  if (event.type === 'error') {
    status.className = 'error';
    status.textContent = `${event.message}. No results are shown for the applied controls. `;
    status.append(button('Retry', () => controller.retry()));
    return;
  }
  status.textContent = event.type === 'empty' ? 'No products match the applied filters.' : `${event.data.total} products`;
  for (const item of event.data.items) {
    const card = document.createElement('article');
    card.className = 'card';
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const meta = document.createElement('span');
    meta.textContent = `${item.color} · ${item.size.toUpperCase()} · $${item.price}`;
    card.append(ph, name, meta);
    grid.append(card);
  }
  for (let page = 1; page <= event.data.pages; page++) {
    const next = { ...controller.applied, page };
    const pageButton = button(String(page), () => applyImmediate(next), `pagination ${page === event.data.page ? 'current' : ''}`);
    pageButton.setAttribute('aria-label', `Page ${page}`);
    pages.append(pageButton);
  }
}
function renderChips() {
  chips.replaceChildren();
  for (const [facet, values] of Object.entries(controller.applied.facets)) {
    for (const value of values) chips.append(button(`${facet}: ${value} ×`, () => applyImmediate(removeChip(controller.applied, facet, value)), 'chip'));
  }
}
function applyImmediate(next) {
  controller.updateDraft(next);
  controller.applyDraft();
  syncControls(controller.draft);
  syncPending();
}

form.addEventListener('change', editDraft);
sort.addEventListener('change', editDraft);
form.addEventListener('submit', event => {
  event.preventDefault();
  editDraft();
  controller.applyDraft();
  syncControls(controller.draft);
  syncPending();
});
document.querySelector('#cancel').addEventListener('click', () => {
  controller.cancelDraft();
  syncControls(controller.draft);
  syncPending();
});
document.querySelector('#clear').addEventListener('click', () => applyImmediate(clearFilters(controller.applied)));
addEventListener('popstate', () => {
  controller.restoreFromUrl(location.search);
  syncControls(controller.draft);
  syncPending();
});
addEventListener('pagehide', () => controller.dispose());
syncControls(controller.draft);
syncPending();
controller.load();