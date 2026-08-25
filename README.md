# QuoteAgent

A configurable quote and lead-qualification agent for small service
businesses — cleaners, gardeners, movers, mobile mechanics, photographers.
Each business defines its own services, service area, pricing rules,
minimum job value, and conditions that require a human before anything is
booked. The agent never invents a price, a service area, or a business rule:
every figure it gives a customer comes from configuration, not from the
model.

This prototype demonstrates it for one example business, **QuickFix Mobile
Mechanics**, but nothing in the agent or its tools is specific to mobile
mechanics — swap the business config to run it for a different trade.

Built on [eve](https://eve.dev), the [AI SDK](https://ai-sdk.dev), and
[Next.js](https://nextjs.org), with a UI assembled from
[AI Elements](https://elements.ai-sdk.dev).

## How it works

An enquiry runs through a fixed, deterministic pipeline. The order is
enforced in code, not by prompting — each tool checks the enquiry's durable
session state and refuses to run out of turn:

1. **`lookup_postcode`** — resolves the customer's postcode and checks it
   against the business's configured service area (a radius from a base
   postcode, via [postcodes.io](https://postcodes.io)). Out-of-area jobs are
   declined here, before anything is priced.
2. **`calculate_quote`** — applies the business's configured pricing rules
   (call-out fee, flat or time-based labour, parts estimates, distance
   surcharge). It deliberately returns **no figures** — only whether the
   quote is ready or what information is still missing — so nothing
   downstream can state a price before the next step has run.
3. **`check_job_eligibility`** — evaluates the quote against the business's
   review rules (job value thresholds, safety-critical services, borderline
   service area) and is the *only* tool that returns the actual itemised
   quote. A job is either accepted or flagged for a human to confirm.
4. **`request_booking`** — records the customer's booking request, gated on
   human approval via eve's [human-in-the-loop](https://eve.dev/docs/human-in-the-loop)
   model, so nothing is committed without a person signing off.

The business's own configuration — services, prices, service area, review
rules — lives entirely as data in
[`agent/lib/quote-agent/`](agent/lib/quote-agent), independent of the eve
tools and instructions that drive the conversation.

## Getting started

Requires **Node.js 24+**.

```bash
npm install
```

Set a Google Generative AI API key in `.env.local`:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Then run the dev server, which boots the Next.js app and the eve agent
together:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the business landing
page, or go straight to [http://localhost:3000/s](http://localhost:3000/s)
to start an enquiry.

## Project layout

```
agent/
├── agent.ts                  # model config (Gemini via @ai-sdk/google)
├── instructions.md           # system prompt: identity, hard rules, pipeline order
├── channels/eve.ts           # HTTP session auth
├── lib/
│   ├── state.ts              # durable per-session enquiry state
│   └── quote-agent/          # framework-agnostic domain logic
│       ├── types.ts
│       ├── pricing.ts
│       ├── eligibility.ts
│       ├── postcode.ts
│       └── businesses/quickfix-mobile-mechanics.ts
└── tools/
    ├── lookup_postcode.ts
    ├── calculate_quote.ts
    ├── check_job_eligibility.ts
    └── request_booking.ts

app/
├── page.tsx                  # business landing page
├── s/                        # eve's generated chat UI (durable sessions)
└── _components/
    ├── agent-chat.tsx        # eve chat scaffold
    ├── agent-message.tsx     # tool-call rendering, incl. the quote card
    └── quote-card.tsx        # itemised quote / review-status UI

evals/                        # deterministic checks on the pipeline's guarantees
```

## Evals

```bash
npx eve eval
```

Checks the properties that matter most: the pipeline runs in order, an
out-of-area or unsupported job is declined without ever being priced, a
diagnostic job with no fault description is not quoted, and a booking parks
for human approval before it's recorded.

## Configuring a different business

Point [`agent/lib/quote-agent/config.ts`](agent/lib/quote-agent/config.ts) at
a new `BusinessConfig` object — no tool, pipeline, or UI code is specific to
the demo business.
