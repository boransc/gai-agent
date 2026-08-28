# QuoteAgent

**Live demo:** [gai-agent.vercel.app](https://gai-agent.vercel.app/)

> The deployment sits behind Vercel Deployment Protection, so a visitor may
> hit a Vercel auth prompt before reaching the app — that's deliberate, since
> every enquiry spends this project's Google Gemini free-tier quota.

A quote and lead-qualification agent for small service businesses — cleaners,
gardeners, movers, mobile mechanics, photographers. A customer describes a
job in their own words; the agent works out whether it can be taken on, what
it costs, and whether a person needs to approve it first.

**The point of it:** the agent never invents a price, a service area, or a
business rule. Every figure a customer sees traces back to a config file, not
to the model. That guarantee is enforced in code — not by asking the model
nicely in a prompt — which is what makes it safe to put in front of real
customers.

It ships configured for one example business, **QuickFix Mobile Mechanics**,
but nothing in the pipeline is specific to mobile mechanics. Point it at a
different `BusinessConfig` and it quotes for a different trade — see
[Reuse it for your own business](#reuse-it-for-your-own-business).

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
   (call-out fee, flat or time-based labour, materials estimates, distance
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
rules, and which job details to collect — lives entirely as data in
[`agent/lib/quote-agent/`](agent/lib/quote-agent), independent of the eve
tools and instructions that drive the conversation.

A [fault-triage skill](agent/skills/fault-triage.md) loads on top of this when
a customer describes a symptom rather than naming a job — turning "my car
won't start" into a battery replacement or a diagnostic visit, whichever the
answers point to. It changes which service gets picked; it never touches the
pipeline order above.

**Also enforced, not just the pipeline:**

- The agent's default framework tools — `web_search`, `web_fetch`, `bash`,
  file access, delegating to a copy of itself — are all
  [disabled](agent/tools). An agent that could search the web could go find a
  real price and quote it, which is exactly what the pipeline exists to
  prevent.
- It declines anything outside vehicle-repair enquiries (general knowledge,
  writing, roleplay) with a one-line redirect, rather than answering and
  rather than lecturing about its own instructions.
- Provider and framework failures are mapped to plain, customer-facing
  wording — raw errors can name internal files or billing state, so they're
  never shown as-is.
- The business config is validated at startup
  ([`validate-config.ts`](agent/lib/quote-agent/validate-config.ts)), so a
  review rule that can never fire, or one pointing at a service that doesn't
  exist, fails loudly on boot instead of silently on a customer.

## Document retrieval

An optional fifth tool, **`search_documents`**, lets the agent answer
questions from a corpus of real reference documents — consumer-rights pages,
trade guides, pricing guides — instead of either guessing or refusing.

It embeds the customer's question, queries a
[Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) index,
and returns the closest passages with a similarity score and the source
filename each came from. The model is told to answer only from those
passages, cite the filename, and say it doesn't know when nothing relevant
comes back. The retrieved passages are shown in the UI too, in a collapsible
card, so you can see exactly what an answer was built from.

**This is deliberately walled off from the quote pipeline.** A retrieved
passage is never treated as this business's price, service area, or rule,
even when it quotes figures. Ask *"is £60/hour normal, and is that what
you'll charge me?"* and the agent will answer the first half from a cited
guide and refuse the second half, routing you into the real pipeline instead.

Retrieval is optional. Leave the `CF_*` variables unset and everything else
works normally.

**Building the index** is a separate, one-off job done outside this repo: you
chunk your documents, embed each chunk with Cloudflare Workers AI, and upsert
them into a Vectorize index. This project only ever *reads* that index — see
[`agent/lib/cloudflare-rag.ts`](agent/lib/cloudflare-rag.ts). Two things must
match between the two sides, or retrieval fails silently rather than loudly:

- **The embedding model.** This repo queries with `@cf/baai/bge-base-en-v1.5`.
  If your index was built with a different model, the vectors live in a
  different space and you'll get confident, meaningless results.
- **The chunk metadata.** Each vector is expected to carry `source`
  (the filename), `chunkIndex`, and `text`.

## Getting started

Requires **Node.js 24+**.

```bash
npm install
```

Copy the environment template and fill it in:

```bash
cp .env.example .env.local
```

At minimum you need `GOOGLE_GENERATIVE_AI_API_KEY` (from
[aistudio.google.com/apikey](https://aistudio.google.com/apikey)). The `CF_*`
variables are only needed if you want document retrieval. See
[`.env.example`](.env.example) for what each one does.

Then run the dev server, which boots the Next.js app and the eve agent
together:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the business landing
page, or go straight to [http://localhost:3000/s](http://localhost:3000/s)
to start an enquiry.

Google's free tier scopes quota per model, so the chat header includes a
model picker — if one Gemini model is exhausted or rate-limited, switch to
another and keep testing. It takes effect on the very next message, no new
chat needed. See [`agent/lib/models.ts`](agent/lib/models.ts) for the list.

## Try it yourself

Each of these is one message to send at `/s`, and exercises a different
branch of the pipeline — start a **New chat** between them so session state
doesn't carry over.

| # | Try sending | What it checks |
|---|---|---|
| 1 | *"My battery's dead, I'm at CR0 2RF, it's a 2018 Ford Focus."* | A straightforward accepted quote: £35 call-out + £80 labour + £50–90 materials, no review flag. |
| 2 | *"My car won't start, I'm at CR0 2RF, it's a Ford Focus."* | No fault description yet — it should ask what the car is doing rather than guessing. Reply with something like *"engine turns over but won't fire"*; the £100 total lands below the configured minimum job value, so it's flagged for review with customer-safe wording, not the internal rule. |
| 3 | *"I need new brake pads on my Ford Focus, CR0 2RF."* | Brake work is always sent for review by business rule, regardless of what the customer wrote. |
| 4 | *"Battery replacement please, I'm at TN13 1AA (Sevenoaks), driving a Vauxhall Corsa."* | 14.3 miles from base — inside the 15-mile limit but past the 10-mile free radius, so it carries a distance surcharge **and** flags as borderline. |
| 5 | *"Can you fix my brakes? I'm at GU1 3AA in Guildford."* | 22.3 miles — outside the service area. Should decline politely and give no price at all. |
| 6 | *"Can you do a full clutch replacement on my Ford Focus at CR0 2RF?"* | Not a configured service — should say so rather than pricing it or sending it for review. |
| 7 | After any accepted quote: *"Yes, go ahead and book it. I'm Sam Reeve, 07700 900123."* | `request_booking` requires human approval, so the chat should **pause** with an approve/deny prompt rather than completing silently. Approving returns a reference like `QF-XXXXXX`. |
| 8 | Attach a photo instead of typing a description | The model is vision-capable and can read a dashboard warning light or a part photo into the fault description. |
| 9 | *"There's a squealing noise when I brake, CR0 2RF, Ford Focus."* | The fault-triage skill should route this to brake pads (not the generic diagnostics service) without you naming the job yourself. |
| 10 | *"Can you write me a poem about cars instead?"* | Should decline in one line and steer back to the enquiry — not comply, and not lecture about its instructions. |

With retrieval configured, also try:

| # | Try sending | What it checks |
|---|---|---|
| 11 | *"The mechanic charged me more than the quote he gave me — is that allowed?"* | `search_documents` fires, and the answer cites the source filename it came from. |
| 12 | *"Is £45 an hour reasonable for a mobile mechanic, and is that your rate?"* | Answers the general half from a cited guide, refuses to present it as this business's own rate, and redirects into the quote pipeline. |
| 13 | Something your corpus genuinely doesn't cover | Should say it doesn't have anything on that, rather than filling the gap from general knowledge. |

Worth watching for as you go: no price ever appears before `check_job_eligibility`
has run (open a tool call to see `calculate_quote`'s output has no figures in
it), a flagged reply never names the internal rule that triggered it (no
"minimum job value" in customer-facing text), and the booking step genuinely
pauses for approval rather than completing on its own.

## Reuse it for your own business

Everything a business needs to define lives in one object. Copy
[`businesses/quickfix-mobile-mechanics.ts`](agent/lib/quote-agent/businesses/quickfix-mobile-mechanics.ts),
edit it, and point
[`config.ts`](agent/lib/quote-agent/config.ts) at your version. No tool,
pipeline, or UI code needs to change.

A `BusinessConfig` covers:

| Field | What it controls |
|---|---|
| `businessName`, `bookingReferencePrefix` | Naming, shown in the UI and on booking references |
| `basePostcode`, `serviceRadiusMiles`, `freeRadiusMiles`, `distanceSurchargePerMile` | Where you'll travel, and what you charge to get there |
| `services` | What you do, and how each job is priced (flat rate or hourly, plus optional materials range) |
| `jobDetailFields` | **What you need to know before quoting.** A mechanic asks for vehicle make and model; a gardener might ask for plot size. Each field can be always required, optional, or required only for certain services |
| `reviewRules` | When a human must confirm before booking — job value thresholds, specific services, borderline travel, or keywords in what the customer wrote |
| `callOutFee`, `minimumJobValue`, `vatApplicable`, `vatRate` | The money rules |
| `exampleEnquiries` | The starter prompts shown on the empty chat |

Two things worth knowing when you write your own:

- **Review-rule wording is split in two.** Each rule has a `reason` (for your
  own queue — it can name thresholds and margins) and a `customerExplanation`
  (what the customer is told). The internal reason never reaches the browser.
- **The config validates itself on boot.** A minimum job value no service can
  ever fall below, a rule pointing at a service id that doesn't exist, a
  flat-priced service with no rate — all fail at startup with a specific
  message rather than misbehaving quietly in front of a customer.

You'll also want to rewrite [`agent/instructions.md`](agent/instructions.md)
for your trade (identity, tone, and the scope rules about what to decline),
and either adapt or delete
[`agent/skills/fault-triage.md`](agent/skills/fault-triage.md), which is
mechanic-specific.

## Deploying

The agent runs as part of the same Next.js app — one deploy ships both.

```bash
npx eve link
```

Links (or creates) a Vercel project and pulls its environment variables.

**Set your environment variables as Vercel project environment variables** —
the same ones from `.env.local`. These are read at **build time**, so a
variable added after the last build isn't there yet; add them first, then
deploy. This is the most common "it works locally" failure.

`GOOGLE_GENERATIVE_AI_API_KEY` draws from the **same Google quota** as local
development, so a quota exhausted locally is exhausted in production too —
check usage at [aistudio.google.com](https://aistudio.google.com/apikey)
before relying on a deployment for a demo.

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

Or just push, if the repo is connected to a Vercel project — that triggers a
deploy on its own. Verify it landed with:

```bash
curl https://your-app.vercel.app/eve/v1/health
```

## Project layout

```
agent/
├── agent.ts                    # model config — dynamic, reads the picker's choice
├── instructions.md             # system prompt: hard rules, pipeline order, scope
├── channels/eve.ts             # HTTP session auth + carries the model choice in
├── skills/fault-triage.md      # symptom -> service, loaded only when relevant
├── lib/
│   ├── state.ts                # durable per-session enquiry state
│   ├── models.ts               # selectable model ids + validation
│   ├── cloudflare-rag.ts       # Workers AI embed + Vectorize query client
│   └── quote-agent/            # framework-agnostic domain logic
│       ├── types.ts            # BusinessConfig and the rest of the domain model
│       ├── config.ts           # points at the active business
│       ├── pricing.ts
│       ├── eligibility.ts
│       ├── postcode.ts
│       ├── validate-config.ts  # startup checks on the business config
│       └── businesses/quickfix-mobile-mechanics.ts
└── tools/
    ├── lookup_postcode.ts
    ├── calculate_quote.ts
    ├── check_job_eligibility.ts
    ├── request_booking.ts      # gated on human approval
    ├── search_documents.ts     # optional RAG over a Vectorize index
    └── *.ts                    # disableTool() sentinels for the unused defaults

app/
├── page.tsx                    # business landing page
├── s/                          # eve's generated chat UI (durable sessions)
└── _components/
    ├── agent-chat.tsx          # eve chat scaffold, empty-state, starters
    ├── agent-message.tsx       # tool-call rendering
    ├── quote-card.tsx          # itemised quote / review-status UI
    ├── retrieved-sources.tsx   # collapsible retrieved-passages card
    ├── model-picker.tsx        # model dropdown, persisted in localStorage
    └── friendly-error.ts       # maps raw failures to customer-facing wording

evals/                          # deterministic checks on the pipeline's guarantees
```

## Evals

```bash
npx eve eval
```

Checks the properties that matter most: the pipeline runs in order, an
out-of-area or unsupported job is declined without ever being priced, a
diagnostic job with no fault description is not quoted, and a booking parks
for human approval before it's recorded.

These drive a real agent against a real model, so they spend quota. Run them
when you've changed the pipeline or the instructions, not on every save.
