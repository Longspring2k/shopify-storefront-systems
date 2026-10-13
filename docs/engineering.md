# Engineering decisions

## URL ownership and exact schema

Only applied state is serialized. `color` and `size` are repeated allowlisted enums, deduplicated and sorted, with at most six values. `sort` is one of `featured`, `price-asc`, `price-desc`, or `name-asc`. `page` is 1–999 and omitted at 1. `utm_source` is the only unrelated parameter preserved.

The query is capped at 2,000 characters. Values are capped, token-shaped, and rejected if they contain control characters. Unknown keys and malformed or unknown external values are ignored. Internal state boundaries are stricter: constructor, draft updates, transitions, and serialization require the exact state shape and valid bounded values, then canonicalize facet sets before comparison or output.

## Draft and applied transitions

```text
URL -> applied -> cloned draft
facet or sort edit -> draft only; show pending notice
Cancel -> draft = applied
Apply -> reset page if facets changed -> pushState -> request
popstate -> parse into applied + draft -> request, no pushState
Clear -> empty facets, preserve sort
Chip -> remove exactly one value
server clamps page -> replaceState canonical page, preserve other draft edits
```

Sort and facets are one draft and wait for Apply. Cancel restores both. Pagination, chips, and Clear are immediate applied actions that first reset the draft coherently. User application actions write one history entry. Initial load and popstate do not push; a server-clamped page replaces the current entry.

## Race and cancellation model

```text
request A: sequence 1
request B: sequence 2, abort A
B resolves -> validate -> render
A resolves despite abort -> sequence mismatch -> discard
```

Abort is an optimization, not the correctness mechanism. Sequence and disposal guards suppress only superseded or disposed work; an unsolicited `AbortError` from the current request is rendered as retryable failure. Loading clears cards, so old products never remain under new controls. Disposal invalidates the sequence and aborts the active request.

## Errors and retry

Responses require at most six exact product items with unique IDs and finite nonnegative prices. Total, page, and page count must be bounded nonnegative/positive integers, page cannot exceed pages, and item count/pages must agree with the six-item catalog pagination contract. Malformed shapes and network failures show an error with no cards. Retry reuses current applied state and writes no history. Superseded requests cannot render success or error.

## Server boundary

The server binds to loopback, uses an exact method/path allowlist, maps fixed public paths rather than filesystem input, and sends `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

## Alternatives

- Immediate facets were rejected to avoid noisy requests and history.
- Abort-only correctness was rejected because cancellation can be ignored.
- Arbitrary query preservation was rejected because it expands application ownership.
- Stale cards were cleared rather than ambiguously shown; a production design could explicitly label them.
- A responsive inline panel avoids modal focus lifecycle complexity.