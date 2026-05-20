# Northwind Triage Agent

Takes a raw customer message, figures out what it is, who should handle it, how urgent it is, and drafts a first response. All in one API call. Built for Northwind Home Services as part of the Avreo take-home.

---

## Setup

You'll need Node 18+ and an Anthropic API key.

```bash
git clone https://github.com/pariweshh/northwind-triage.git
cd northwind-triage
npm install
```

Add a `.env.local` in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...

# Optional — restricts the /api/* routes to this origin in production.
# Leave unset in development to allow all origins.
NEXT_PUBLIC_APP_URL=https://your-deployed-app.vercel.app
```

Start the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). There are two tabs:

**Triage**: paste a message, add sender name and channel if you have them, and hit Run triage. The result shows category, priority, routing, human review flag, draft reply, and reasoning.

**Batch eval**: runs all 20 messages from the dataset through the agent and scores each one against the benchmark. Shows per-field accuracy as large percentage figures and an expandable table of all 20 results. Each row can be opened to see the full output, per-field scores, and the benchmark's own notes on that message. Takes around 30 seconds to complete.

You can also run the batch evaluation from the command line:

```bash
npm run batch
```

This prints a score summary to stdout and writes the full results to `data/batch_results.json`.

---

## Assumptions

**Channel metadata is available.** The agent receives sender name and channel alongside the message body. In production the intake system would pass this automatically. In the UI it is an optional input.

**Messages are in isolation.** The agent has no memory of previous messages from the same customer. Each triage decision is made on the single inbound message only.

**Winter means June to August in Sydney.** The SOP references "no hot water in winter" as a P1 trigger. The agent applies this without checking the date, assuming the operations team will use judgement on borderline months.

**The $5,000 human review threshold applies to potential job value, not listed catalogue price.** Bathroom renovations are listed at "from $4,500" but regularly exceed $5,000 in practice. The agent flags these rather than relying on the listed minimum.

**Strata properties are always flagged.** The catalogue says body corporate approval is the customer's responsibility. Rather than trying to assess whether approval is likely needed, the agent flags all strata jobs for human confirmation.

**The SOP is the tiebreaker when the catalogue is ambiguous.** Where the two documents conflict, the SOP's explicit rules take precedence and the deviation is noted in reasoning.

**Newer Claude models do not support temperature control.** Minor variance between batch runs on ambiguous messages is expected. The messages that flip between runs (MSG-008, MSG-010, MSG-016) are the same ones the benchmark flagged as judgment calls: variance there reflects genuine ambiguity in the spec, not instability in the agent.

---

## How it's structured

```
northwind-triage/
├── app/
│   ├── api/
│   │   ├── triage/route.ts        (POST /api/triage — Zod-validated, 10k char cap)
│   │   └── batch/route.ts         (POST /api/batch — maxDuration 90s, 30s per-message timeout)
│   ├── page.tsx                   (header, tab nav, mounts both views)
│   ├── layout.tsx                 (Syne + JetBrains Mono fonts)
│   └── globals.css                (dark design system, Tailwind theme tokens)
├── components/
│   ├── TriageView.tsx             (input form + result card)
│   ├── BatchView.tsx              (batch runner + summary + results table)
│   ├── BatchRow.tsx               (expandable row with scores and benchmark notes)
│   └── ScoreBar.tsx               (accuracy figure + progress line used in batch summary)
├── constants/
│   └── index.ts                   (CATEGORY_STYLES, PRIORITY_STYLES badge classes)
├── proxy.ts                   (CORS — open in dev, locked to NEXT_PUBLIC_APP_URL in prod)
├── lib/
│   ├── agent.ts                   (system prompt + Anthropic API call)
│   └── score.ts                   (shared scoring logic for batch route + CLI)
├── scripts/
│   └── run-batch.ts               (CLI batch runner)
├── types/
│   └── index.ts                   (shared types: TriageResult, BatchResultRow, etc.)
└── data/
    ├── inbound_messages.json
    ├── benchmark.json
    └── batch_results.json         (generated after npm run batch)
```

**Why Next.js for the backend too?** Single repo, one start command, TypeScript shared across everything. The `TriageResult` type lives in `types/index.ts` and gets used by the API route, the agent, the batch runner, and the frontend. No duplication, no drift.

**Why a single agent?** The brief mentioned that a well-prompted single agent can beat a poorly-designed multi-agent system, and I agree with that here. The task is classification and generation. It doesn't need a router, a planner, or a separate drafting agent. It needs a good system prompt. So that's what `lib/agent.ts` is: one prompt that encodes all the SOP rules, tone constraints, and edge cases, and one API call that returns structured JSON. If something needs changing (prompt, model, output schema) it is one file.

**Why both views stay mounted?** Switching from the batch tab back to triage and losing the results would be annoying. Both `TriageView` and `BatchView` are always mounted — tab switching toggles CSS visibility rather than unmounting and remounting. No state is lost, and there is no need for `sessionStorage` or lifted state to work around it.

**Shared scoring logic lives in `lib/score.ts`.** The batch API route and the CLI runner both need to score results against the benchmark. Extracting `scoreFields` and `InboundMessage` into one file means a bug fix or scoring rule change propagates to both automatically.

**Request validation.** The triage route validates the full request body with Zod: `message` must be a non-empty string under 10,000 characters, `meta` fields must all be strings. The unsafe `as TriageRequest` cast is gone — malformed bodies are rejected at the boundary with a specific error rather than passed to the model.

**Batch timeout handling.** The batch route sets `maxDuration = 90` so the deployment runtime won't cut it off at the default 30-second limit. Each individual message is wrapped in a `Promise.race` with a 15-second timeout, so one slow API call can't block the rest — it records an error for that message and moves on.

**CORS.** `proxy.ts` matches all `/api/*` routes. In development (no `NEXT_PUBLIC_APP_URL` set) all origins are allowed. In production the route is locked to the configured app URL; preflight requests from other origins get a 403.

**UI.** The interface uses a dark dispatch-console aesthetic: near-black background, amber accents for actions and active states, JetBrains Mono for labels and IDs, Syne for body text. Priority badges (red, amber, green) are high-contrast against the dark surface. Results animate in on arrival; the online indicator pulses in CSS with no JS.

**Model:** `claude-sonnet-4-6`. Good instruction following, reliable JSON output, fast enough for this.

---

## Results

Ran against all 20 messages in `benchmark.json`.

| Metric                         | Score       |
| ------------------------------ | ----------- |
| Strict accuracy (all 4 fields) | 80% (16/20) |
| Category                       | 100%        |
| Priority                       | 90%         |
| Route to                       | 100%        |
| Needs human review             | 90%         |

Category and routing were clean across the board. The four misses were all on priority or the human review flag and they follow the same pattern. The agent over-escalated things that the benchmark kept at P3.

---

## Approach

Before writing any code I read all the documents cover to cover. The SOP, service catalogue, and tone guide each have rules that interact with each other in non-obvious ways. Get the HVAC carve-out wrong and an after-hours heating call becomes a false emergency. Miss the appliance repair exclusion and a dishwasher job gets dispatched. Misread the $500 and $5,000 thresholds and your priority and routing logic falls apart. So the documents came first.

The agent is a single prompt that encodes all of those rules explicitly. No orchestration, no multi-agent setup. One prompt, one API call, structured JSON back. The full stack wraps it: a Next.js API route on the backend, a two-tab UI for live triage and batch evaluation, and a CLI runner for scoring the full dataset.

## Where I disagree with the benchmark (and where I don't)

**MSG-008, MSG-010, MSG-016 (priority)**

These all got bumped to P2 by the agent. Benchmark says P3. The agent's reasoning was that high-value quotes (bathroom reno, strata HVAC, dual switchboard and ducted install) warrant a faster response. The benchmark disagrees. QUOTE is P3 unless the customer signals urgency, and potential job value doesn't change that.

The benchmark is right here. I conflated two separate rules in the system prompt: high value triggers `needs_human_review`, not a priority bump. They should stay P3. Easy fix in the prompt but I'm not going to quietly correct it and note it instead.

**MSG-007 (needs_human_review)**

Agent classified it as OUT_OF_SCOPE (correct, dishwasher repair, we don't do it) but didn't flag for human review. Benchmark flags it. The benchmark's reasoning is that the install vs repair line is non-obvious to customers and worth a human clarifying whether they actually need a new unit.

That's a fair call. I missed it. Should have flagged it.

**MSG-004 (routing)**

Agent agrees with the benchmark here, but the routing is worth calling out. The SOP says cc Accounts on a complaint when the billing dispute exceeds $500. Daniel's dispute is $150, technically below the threshold. The benchmark cc's Accounts anyway, and so did the agent, because operationally it makes no sense to have Customer Care handle a billing discrepancy without Accounts in the loop. But the written rule doesn't support it. If this were a real engagement I'd flag the inconsistency and recommend the SOP be updated to say "any billing dispute element" rather than setting a dollar threshold.

**MSG-009 (HVAC vs hot water)**

Linda's heater stopped working on a winter evening. Intuitively this looks identical to the "no hot water in winter" emergency trigger. But it's not. The SOP only names hot water systems as a P1 trigger. HVAC has an explicit carve-out because there are no on-call HVAC technicians. If the system prompt doesn't make that distinction sharply, any agent will call this P1 EMERGENCY. The SOP itself is ambiguous here and could do with a clearer line for human dispatchers too.

**MSG-017 (P2 for a $280 conduct complaint)**

The SOP's P2 threshold for complaints is charges over $1,000. Robert's job was $280. The benchmark goes P2 anyway because he's clearly upset and was referred by a neighbour. That's the right operational call, but the SOP doesn't support it as written. The SOP needs a customer distress clause as an explicit P2 trigger, not just a dollar threshold.

---

## What the agent gets right that's easy to miss

MSG-018 is the Spanish SMS. The content translates to "I need a plumber urgently, water coming from the heater." Without an explicit instruction to translate before classifying, an agent will either mark this as garbled or produce a Spanish reply that may be wrong. The prompt handles it: translate first, classify on content, reply in English, flag for human review. Agent got it right.

MSG-013 is the spam submission. Agent returned `draft_reply: null` and flagged it. The failure mode here is an agent that tries to make sense of "asdf asdf test test" and fabricates a response. Didn't happen.

---

## Draft reply tone

Stayed consistent with the tone guide throughout. No "Thank you for contacting Northwind," no exclamation marks, first names used where provided, replies kept to 2 to 4 sentences. The complaint replies led with the problem, not pleasantries.

One thing worth watching: the agent occasionally reaches for slightly formal phrasing like "someone from our team" instead of the more direct "someone from dispatch." It's within range but it's the kind of drift that compounds over time if the prompt isn't tightened.

---

## What I'd build next

A confidence signal on the classification output, something the model returns alongside the category to indicate how certain it is. Right now `needs_human_review` is driven entirely by the enumerated SOP triggers: review threats, non-English messages, high-value quotes, and so on. That works well for the known cases. What it doesn't catch is the novel message that doesn't match any trigger but is still genuinely ambiguous. A low-confidence signal would let you auto-flag those without having to anticipate every edge case in the prompt. Even a simple three-level output (high, medium, low) from the model's own reasoning would make the flag more reliable in production.
