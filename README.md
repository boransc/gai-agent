# QuoteAgent

**Live demo:** [gai-agent.vercel.app](https://gai-agent.vercel.app/)

> The deployment sits behind Vercel Deployment Protection, so a visitor may
> hit a Vercel auth prompt before reaching the app — that's deliberate, since
> every enquiry spends this project's Google Gemini free-tier quota.

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

## Try it yourself

Each of these is one message to send at `/s`, and exercises a different
branch of the pipeline — start a **New chat** between them so session state
doesn't carry over.

| # | Try sending | What it checks |
|---|---|---|
| 1 | *"My battery's dead, I'm at CR0 2RF, it's a 2018 Ford Focus."* | A straightforward accepted quote: £35 call-out + £80 labour + £50–90 parts, no review flag. |
| 2 | *"My car won't start, I'm at CR0 2RF, it's a Ford Focus."* | No fault description yet — it should ask what the car is doing rather than guessing. Reply with something like *"engine turns over but won't fire"*; the £100 total lands below the configured minimum job value, so it's flagged for review with customer-safe wording, not the internal rule. |
| 3 | *"I need new brake pads on my Ford Focus, CR0 2RF."* | Brake work is always sent for review by business rule, regardless of what the customer wrote. |
| 4 | *"Battery replacement please, I'm at TN13 1AA (Sevenoaks), driving a Vauxhall Corsa."* | 14.3 miles from base — inside the 15-mile limit but past the 10-mile free radius, so it carries a distance surcharge **and** flags as borderline. |
| 5 | *"Can you fix my brakes? I'm at GU1 3AA in Guildford."* | 22.3 miles — outside the service area. Should decline politely and give no price at all. |
| 6 | *"Can you do a full clutch replacement on my Ford Focus at CR0 2RF?"* | Not a configured service — should say so rather than pricing it or sending it for review. |
| 7 | After any accepted quote: *"Yes, go ahead and book it. I'm Sam Reeve, 07700 900123."* | `request_booking` requires human approval, so the chat should **pause** with an approve/deny prompt rather than completing silently. Approving returns a reference like `QF-XXXXXX`. |
| 8 | Attach a photo instead of typing a description | The model is vision-capable and can read a dashboard warning light or a part photo into the fault description. |

Worth watching for as you go: no price ever appears before `check_job_eligibility`
has run (open a tool call to see `calculate_quote`'s output has no figures in
it), a flagged reply never names the internal rule that triggered it (no
"minimum job value" in customer-facing text), and the booking step genuinely
pauses for approval rather than completing on its own.

## Deploying

The agent runs as part of the same Next.js app — one `vercel deploy` ships
both.

```bash
npx eve link
```

Links (or creates) a Vercel project and pulls its environment variables.

**Set the model provider's API key as a Vercel project environment variable**
— `GOOGLE_GENERATIVE_AI_API_KEY`, the same one used locally. This project
calls Google directly via `@ai-sdk/google` rather than routing through the
Vercel AI Gateway, so the Gateway's project-OIDC auth doesn't apply here; the
provider key is what the deployed agent will use. It draws from the **same
Google quota** as local development, so a quota exhausted locally is
exhausted in production too — check usage at
[aistudio.google.com](https://aistudio.google.com/apikey) before relying on a
deployment for a demo.

**Turn on Vercel Deployment Protection.** The route auth in
[`agent/channels/eve.ts`](agent/channels/eve.ts) ends in `none()`, which
accepts anonymous callers — so the agent is protected *only* by whatever
gates the deployment in front of it. With protection off, anyone holding the
URL can start sessions and spend the project's model quota. Enable it under
the Vercel project's **Settings → Deployment Protection** (which options are
available depends on your plan).

For anything beyond a personal demo, replace `none()` with a real
authenticator instead — Auth.js, Clerk, your own JWT or API-key verifier, or
any custom `AuthFn`. Route auth is an ordered walk and `none()` halts it, so
it must always be the last entry.

Then deploy:

```bash
npx eve deploy
```

This installs dependencies, deploys to production, and wires up eve's Web
Runtime, Workflow (durable sessions), and Sandbox services on Vercel
automatically. Verify it landed with:

```bash
curl https://your-app.vercel.app/eve/v1/health
```

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
