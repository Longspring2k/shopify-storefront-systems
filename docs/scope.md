# Scope and evidence boundaries

## Source proof

The source and Node tests demonstrate query canonicalization, state transitions, latest-request-wins, response validation, retry/disposal behavior, route restrictions, and a synthetic browser UI. The HTTP server is local demonstration infrastructure.

## Shopify adapter boundary — not implemented

A real Shopify Online Store 2.0 integration needs a separately tested adapter to derive actual facets, translate state into supported storefront or Section Rendering requests, validate returned fragments, reconcile pagination/canonical URLs/locales, handle Theme Editor section lifecycle events, preserve merchant settings, and run against a development theme.

The Node fixture is not Liquid output, the endpoint is not a Shopify endpoint, and no Liquid is included because there is no theme runtime here in which to validate it.

## Claims not made

- No live store, Theme Editor, Section Rendering API, storefront API, cart, checkout, or purchase flow was exercised.
- No original client theme, source, assets, identity, catalog, screenshot, credential, or inherited code is included.
- No accessibility certification or performance target is claimed.
- No commercial outcomes or customer endorsement are asserted.
- No external packages, CI configuration, or license grant are included.

`node --test` is executable logic/server evidence. `node demo/run.mjs` is an HTTP smoke check. `node demo/server.mjs` is a manual browser demonstration. None substitutes for validation in a real Shopify theme.