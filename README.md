# Collection filter state system

This repository contains an original, dependency-free demonstration of one narrow storefront concern: **schema-bound collection URLs, explicit draft/apply controls, and race-safe asynchronous rendering**.

It is a synthetic engineering sample, not a Shopify theme export, Liquid rendering test, merchant catalog, or claim about Shopify API guarantees.

## Run

Requires Node.js 20 or newer.

```sh
node --test
node demo/run.mjs
node demo/server.mjs
```

`demo/server.mjs` listens on `127.0.0.1:4176`. Override with `PORT=4180 node demo/server.mjs`, then open the printed loopback URL.

## What is demonstrated

- Repeatable, allowlisted facets with deduplication and canonical ordering.
- Allowlisted sort values, bounded pagination, and preservation of only `utm_source`.
- Explicit draft Apply/Cancel for facets and sort, a visible pending-draft notice, page reset on filter change, sort-preserving Clear, and one-value chips.
- Back/forward restoration without creating history loops.
- Abort plus request sequence checks, bounded response validation, retry, empty and error states, and canonical server-page reconciliation via `replaceState`.
- Text-only synthetic product cards; no links, cart, checkout, external assets, or purchase flow.

## File map

- `src/query-state.mjs` — exact URL schema, parse/serialize, and transitions.
- `src/controller.mjs` — draft/applied ownership, history, cancellation and latest-request-wins.
- `src/catalog.mjs` — server-only synthetic catalog.
- `demo/` — loopback server and responsive browser UI.
- `test/` — deterministic Node tests, including deferred promise races.
- `docs/engineering.md` — state transitions, race model, errors, and alternatives.
- `docs/scope.md` — demonstration versus Shopify adapter boundary.

No dependencies, CI workflow, license grant, original theme source, original assets, or client identity are included.