# Take-Home Assignment: BaaS Payments & Balance Projection

## Scenario

You are joining a fintech platform that moves money on behalf of its customers through external Banking-as-a-Service (BaaS) providers. We are **not** a bank and we do **not** own the ledger — the providers are the source of truth for money. Our job is to originate payments, track their lifecycle as the providers report it, and present customers with an accurate, reconstructed view of their balances.

You will build a service that originates ACH payments through two different providers, ingests their lifecycle events, and projects per-account and per-customer balances from the payments it has seen.

The two providers integrate differently. One acknowledges receipt and reports every outcome asynchronously by webhook; the other returns an initial status synchronously and then reports the rest by webhook. Both run the same downstream lifecycle. Money-movement events arrive out of order, more than once, after long delays, and occasionally for things you don't recognize. Your service has to stay correct regardless.

> The providers below are loosely inspired by real BaaS providers, but the formats, states, and signature schemes here are **simplified and fictional**. Build against this spec, not against any real provider's docs.

---

## Architecture in one paragraph

**Origination is synchronous; ingestion is asynchronous.** `POST /payments` validates, records the payment, and calls the provider *inline*, returning once that call is made. Provider webhooks, by contrast, are signature-verified, enqueued, acknowledged quickly, and processed by a worker off a queue. We do not maintain a mutable balance — balance is a **projection** over payment states. If ingestion is correct, balances are correct.

---

## The payment lifecycle

One internal lifecycle, fed by both providers. They differ only in how the **initial status** is produced (see each provider).

```
draft       The payment is recorded but the vendor has reported nothing definitive.
            Provider A returns `draft` on a successful dispatch (outcome comes by
            webhook). For either provider, a payment whose dispatch failed at the
            transport level also rests here until resolved. Counts as in-flight.
  │
pending     Provider A: arrives via webhook.
            Provider B: returned synchronously by POST /payments.
  │
clearing    Optional, webhook-driven, either provider. Handle it if it arrives;
            do not assume it always does.
  │
sent        Settled — money moved. Counts toward posted balance. Webhook-driven, both.
  │
returned    Reachable after `sent`, both providers, via webhook (e.g. an ACH return
            days later).

rejected    Terminal pre-settlement outcome (the vendor declined the payment, e.g.
            insufficient funds — an outcome, not a transport error).
            Provider A: via webhook.
            Provider B: returned synchronously by POST /payments.
```

---

## Origination — `POST /payments` (synchronous through dispatch)

`POST /payments` does the following, inline, and returns once the provider call is made:

1. Validate the account exists and is `active` (reject otherwise).
2. Record the payment.
3. Call the provider (inline).
4. Return the payment with the resulting status.

The synchronous result depends on the provider:

### Provider A (receipt-ack, async outcome)
- On a **successful dispatch**, the vendor only acknowledges receipt. **`POST /payments` returns the payment in `draft`.** It is always `draft` on a successful dispatch.
- The real outcome (`pending → clearing → sent`, or `rejected`, or later `returned`) arrives **only by webhook**. As with Provider B, `rejected` is a payment outcome, not an error — it simply arrives asynchronously here.
- The inline dispatch can **fail at the transport level** (timeout / network error / 5xx — see test header). On failure the endpoint surfaces an error, but the payment **remains recorded in `draft`** — we don't know whether the vendor created it, so we keep the record rather than forgetting it. There is no separate "failed" status; a transport failure is simply a `draft` whose dispatch has not yet succeeded. Resolving it (re-dispatch or reconcile) is the candidate's responsibility, and retries must be idempotent (below).

### Provider B (synchronous initial status)
- On a **successful dispatch**, the vendor returns a payment *outcome* synchronously: **`POST /payments` returns the payment in `pending`**, or in **`rejected`** (e.g. insufficient funds). `rejected` is a *successful outcome*, not an error — the vendor completed the call and told us "no"; `POST /payments` returns it as a normal (non-error) response with the payment in terminal `rejected`.
- Provider B never returns `draft` as a *successful* outcome — that is unique to Provider A. (A transport failure is a different matter; see next bullet.)
- Provider B's dispatch **can still fail at the transport level** (timeout, network error, vendor 5xx). A transport failure is *not* an outcome — we have no `pending`/`rejected`, only uncertainty about whether the vendor created the payment. Exactly as with Provider A, the endpoint surfaces an error but the payment **remains recorded in `draft`** until resolved, and retries must be idempotent.
- After `pending`, the rest of the lifecycle (`clearing → sent` / `returned`) arrives by **webhook**.

### Test control header — `X-Mock-Outcome`
Used to drive deterministic outcomes in tests:

| Value | Applies to | Effect |
|---|---|---|
| *(absent)* | both | A → returns `draft`; B → returns `pending` |
| `rejected` | Provider B | `POST /payments` returns `rejected` synchronously as a normal (non-error) response — a payment outcome, e.g. insufficient funds |
| `dispatch_failure` | both | the inline vendor call fails at the transport level (timeout / error); the endpoint surfaces an error; payment recorded but indeterminate |

### Idempotency on origination
`POST /payments` must be idempotent — a retry must not create a second payment or double-send to the provider, including after a transport failure. How you achieve it is up to you; describe your approach in the README.

---

## Provider A — webhook format

`POST /webhooks/provider-a`

```json
{
  "id": "evt_a_01H8XYZ",
  "type": "payment.sent",
  "created_at": "2026-06-09T12:34:56Z",
  "data": {
    "payment_id": "pay_a_01H8ABC",
    "account_id": "acc_001",
    "amount": 5000,
    "currency": "USD",
    "direction": "credit"
  }
}
```

- `id` — unique per event (within Provider A).
- `type` — `payment.pending`, `payment.clearing`, `payment.sent`, `payment.returned`, `payment.rejected`.
- `payment_id` — the provider's payment ID, stable across the lifecycle; correlates to the payment you originated.
- `amount` — positive integer, minor units. `direction` (`credit`/`debit`) sets sign.
- Every event carries the full `data` object.

**Signature:** header `X-Signature: t=<unix>,v1=<hex>`, where `v1` = HMAC-SHA256 of `<t>.<raw_body>` using `PROVIDER_A_WEBHOOK_SECRET`. Reject if invalid or if `t` is more than 5 minutes old. Signature is over the **raw request bytes**, not re-serialized JSON.

---

## Provider B — webhook format

`POST /webhooks/provider-b`

```json
{
  "event_id": "evt_b_99001",
  "event_type": "transfer.sent",
  "occurred_at": "2026-06-09T12:34:56Z",
  "object": {
    "transfer_id": "trf_b_55501",
    "account_id": "acc_001",
    "amount_cents": 5000,
    "currency": "USD",
    "side": "credit"
  }
}
```

- `event_id` — unique per event (within Provider B). Providers do **not** coordinate ID namespaces; a Provider A `id` and a Provider B `event_id` may be the same string and are still distinct events.
- `event_type` — `transfer.clearing`, `transfer.sent`, `transfer.returned`.
- `transfer_id` — the provider's payment ID, matching the one returned by the synchronous dispatch.
- `amount_cents` positive minor units; `side` (`credit`/`debit`) sets sign.

**Signature:** header `X-TP-Signature: <hex>` — HMAC-SHA256 of the raw body using `PROVIDER_B_WEBHOOK_SECRET`. No timestamp in the scheme. Whether and how to mitigate replay for Provider B is **your call** — document the trade-offs in the README.

---

## Ingestion — asynchronous (the queue lives here)

Webhook handling is the async surface of the system:

1. **Verify the signature.** Reject invalid signatures with `4xx`.
2. **Enqueue** the verified event and **return `2xx` quickly** so the provider doesn't retry on your processing latency.
3. A **worker** consumes the queue and: dedupes (idempotency on event id), loads the payment, applies the state transition (handling out-of-order arrival), and persists.

Use BullMQ, an in-memory queue, or equivalent — your choice, justified in the README. The e2e tests drive the loop over HTTP and play the vendor by posting webhook sequences; design so that processing is observable to a test (e.g. a synchronous drain in test mode, or status reachable via `GET /payments/:id` within a bounded wait).

---

## Balance — projection only

We do not own balances; we reconstruct them from payments. You may implement this as event-sourced replay **or** a maintained current-state read-model — your choice, justified.

Definitions (minor units, per currency):

- **posted** = settled money only = signed sum of `sent` payments (incoming `credit` +, outgoing `debit` −), net of any `returned`.
- **available** = posted, minus **in-flight outgoing** payments (`draft` / `pending` / `clearing`) not yet settled — those funds are already committed.
- Incoming payments do **not** count toward available until `sent`.

**Per-account** (`GET /accounts/:accountId/balance`): scope to that account's payments. An outgoing ACH credit debits the originating account (the external payee is not one of our accounts and is not tracked). An incoming ACH credit credits the account.

**Per-customer** (`GET /customers/:customerId/balance`): aggregate across all of the customer's accounts, across both providers.

Both return `posted`, `available`, `currency`.

---

## Endpoint catalog

### Setup (mock-only; would not ship)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/mock/accounts` | **Sync.** Open an `active` account for a `customer_id` at a provider; upserts the customer if new. Returns internal `account_id`, `customer_id`, provider, provider account ID. The **only** way accounts are created. |
| `POST` | `/mock/accounts/:accountId/close` | Set the account `closed`. |

### Product API (would ship)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/payments` | Originate outgoing ACH credit. Validates account; records; dispatches inline; returns `draft` (A) or `pending`/`rejected` (B). `Idempotency-Key` header; `X-Mock-Outcome` for tests. |
| `GET` | `/payments/:paymentId` | One payment with current state. |
| `GET` | `/accounts/:accountId/balance` | Per-account `posted` + `available` + `currency`. `404` if unknown. |
| `GET` | `/accounts/:accountId/payments` | Payments for one account. |
| `GET` | `/customers/:customerId/balance` | Unified `posted` + `available` across the customer's accounts. |
| `GET` | `/customers/:customerId/payments` | Unified payment list across the customer's accounts. |

### Vendor webhooks (would ship; e2e tests drive these)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhooks/provider-a` | Provider A lifecycle events (signed, `t`+`v1`). |
| `POST` | `/webhooks/provider-b` | Provider B post-handshake lifecycle events (signed, `X-TP-Signature`). |

Webhooks **validate** that the referenced account/payment exists; they do **not** create accounts.

---

## Failure & edge cases (we will test these)

**Account validation**
- Payment against a **non-existent** account → reject.
- Payment against a **closed** account → reject.
- Webhook referencing an **unknown** account/payment → defined handling (`4xx` baseline; quarantine/dead-letter is a stronger answer — document your choice).
- Closing an account with **in-flight payments** → your judgment; document it.

**Ingestion correctness**
- **Duplicate delivery** — same event (same id, same body) twice.
- **Conflicting redelivery** — same event id, *different body*.
- **Cross-provider id collision** — a Provider A `id` equals a Provider B `event_id`; both process as distinct events.
- **Out-of-order** — `sent` before `pending`; `returned` before its `sent`. And: what happens when the late earlier-stage event finally arrives?
- **Replay** — a valid signed Provider A webhook replayed 10 minutes later.
- **Concurrent webhooks** for the same payment arriving at once.

**Origination / dispatch**
- **Dispatch failure** (`X-Mock-Outcome: dispatch_failure`, either provider) vs. a clean rejection — distinguish a transport failure (indeterminate; retry idempotently with the same `Idempotency-Key`, no double-send) from a payment that was cleanly declined.
- **`rejected` as an outcome** — Provider B can return it synchronously; Provider A delivers it by webhook. Either way the payment is terminal and `rejected` is a normal outcome, not an error.

---

## Technical requirements

- **NestJS** + **TypeScript** (strict mode).
- **PostgreSQL or MongoDB**, via **Docker Compose** (`docker compose up` brings it up).
- **A queue on the webhook/ingestion path** (BullMQ / in-memory / equivalent — justify).
- **Unit + end-to-end tests** using NestJS's built-in testing (`@nestjs/testing` + Jest + `supertest`). The e2e tests are **self-contained against a running database** and drive the whole loop over HTTP — they *are* the vendor: they originate payments and post the webhook sequences (including the nasty ones) to advance state. To post valid webhooks, your tests must produce valid signatures.
- A single service is required. You **may** optionally split out a mock-vendor process, but it is **not** required and will **not** score higher.
- A **README** covering: store choice; projection strategy (replay vs read-model) and why; idempotency (inbound webhooks *and* origination retry toward the provider); the A/B normalization; your Provider B replay decision; how each edge case is handled; and a short note on the trade-off of synchronous-through-dispatch origination (it binds `POST /payments` latency to the vendor — would you change anything at higher scale?).
- **Incremental commit history** — no squashing, no rebasing. We want to see the real progression of your work.

---

## What we're evaluating

- **Ingestion correctness** under the edge cases — the core.
- **Lifecycle modeling** — one machine, two providers, clean handling of optional `clearing`, out-of-order, and the dispatch-failure path.
- **Idempotency** — both directions.
- **Projection design** — correct `posted`/`available`; sensible replay-vs-read-model choice.
- **Test quality** — meaningful unit + e2e; real sequences, not happy-path only.
- **Operability** — useful logs; could you debug a production incident from them?
- **Commit history** and **README**.

A small, correct, well-tested solution beats a large, ambitious, partially-broken one. We are not grading lines of code or framework cleverness.

---

## Time & submission

- **Suggested time: 6–8 hours** for the core. Spend more if you like, but it's not expected. If you run short, prioritize correctness of the core loop and ingestion edge cases over breadth; note in the README what you'd do with more time.
- **Submission:** a public GitHub repo link, or a zip including the `.git` directory, replied to the email we send you. Keep your commit history intact.
- **Deadline:** as agreed with the team (expect ~5 days from receipt).
- **After submission:** we'll schedule a call to walk through your code together.

If something is ambiguous, make a reasonable assumption and document it. We'd rather see your reasoning than a blocking question — but if it's genuinely blocking, ask.

Good luck.
