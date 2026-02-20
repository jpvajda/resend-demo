# Talking Points — Resend Invoice Demo
> Rehearsal guide: 9 slides · ~15–20 min total · aim for ~90 seconds per slide

---

## Slide 1 — Title

- "I built a Node.js service that sends invoice emails using Resend — and I want to walk you through what I built, how it works, and what I learned."
- "The through-line here is that this was an *agentic* build — I used AI agents to structure and execute the work, which I'll get into on slide 3."
- "By the end I want you to see the full Resend feature surface in action: transactional email, PDF attachments, scheduling, and webhooks."

---

## Slide 2 — What I Built

- "The core is a single Express endpoint — `POST /invoice` — that does four things in sequence: validates the input, generates a PDF in memory, sends it as an email attachment through Resend, and optionally schedules a follow-up receipt."
- "There's also a webhook listener at `POST /webhooks/resend` that handles every delivery event Resend emits."
- "Together these cover what I'd call Resend's four first-class features — and the project is intentionally scoped to demonstrate all of them, not just basic send."
- "It's three source files. Not a toy, but not overengineered — the simplicity was deliberate."

---

## Slide 3 — How I Built It — The Agentic Approach

- "I treated this project like a small engineering engagement and broke it into 7 phases with 14 discrete tasks."
- "Each task had a structured prompt with a clear input, expected output, and a success criterion — so the agent knew exactly when it was done."
- "I used three specialized sub-agents: one focused on Resend SDK implementation, one on verification and testing, and one on the webhook plumbing — which has its own gotchas."
- "Phases had hard dependencies — the webhook agent didn't start until the email agent had a verified send working. That constraint kept the agents from building on broken assumptions."
- "The honest result: full working service with *some* manual coding — mostly wiring and a few decisions the agents surfaced but didn't make for me. The agentic approach handled the repetitive, well-specified work really well."

---

## Slide 4 — Architecture

- "Walk through the flow top to bottom: a `POST /invoice` request comes in with line items, client info, and optional scheduling flags."
- "`generateInvoicePDF()` uses PDFKit to create the PDF entirely in memory — it returns a Buffer, never touches disk."
- "`sendInvoiceEmail()` hands that Buffer to the Resend SDK as a Base64-encoded attachment."
- "If `schedule_receipt: true` is in the payload, `scheduleReceiptEmail()` fires a second Resend call with a `scheduled_at` timestamp."
- "The webhook side is intentionally isolated — `express.raw()` is scoped *only* to the webhook route. That's not optional; Svix HMAC verification requires the raw, unparsed request body. If your JSON middleware runs first, verification will always fail."
- "Three files keep the concerns clean: routing in `index.js`, PDF logic in `invoice.js`, Resend calls in `email.js`."

---

## Slide 5 — Transactional Email + PDF Attachment

- "PDFKit generates the invoice in memory — no temp files, no cleanup, no disk I/O. It streams into a Buffer and that's what we hand off."
- "Resend's attachment format is straightforward: an array of objects with `filename` and `content` — where `content` is just a Base64 string. `pdfBuffer.toString('base64')` is literally all the conversion you need."
- "The email body uses HTML with inline styles — Resend handles the delivery; you own the template."
- "Invoice IDs are generated per request in the format `INV-YYYYMMDD-XXXX` — unique, human-readable, good for support lookups."
- "One thing I appreciated: there's no SDK-specific attachment wrapper or proprietary format. It's just a standard object. That makes it easy to reason about."

---

## Slide 6 — Scheduled Email

- "After the invoice sends, the service can fire a receipt email at a configurable delay — the caller just passes `schedule_receipt: true` and `delay_minutes`."
- "Resend's `scheduled_at` field takes an ISO 8601 datetime. The calculation is one line: `new Date(Date.now() + delayMinutes * 60000).toISOString()`."
- "What I find notable here is what you *don't* need: no job queue, no cron, no Redis, no separate worker. For simple delays, `scheduled_at` handles it entirely at the API layer."
- "The response includes the scheduled email's ID, so the caller can track or cancel it if needed."
- "This is genuinely useful for invoice workflows — a 'receipt sent' confirmation a few minutes after delivery is a real UX pattern, and this makes it trivially easy."

---

## Slide 7 — Webhooks

- "The webhook endpoint is `POST /webhooks/resend` — it handles everything Resend emits: sent, delivered, bounced, complained, and about seven more event types."
- "Verification uses `resend.webhooks.verify()` — which is Svix under the hood. It validates the HMAC signature against the raw request body and the webhook secret."
- "The critical implementation detail — and this is the one that's easy to get wrong — is that `express.raw()` has to be scoped to this route only. If you apply `express.json()` globally before the webhook route, the body gets parsed and the signature check will fail every time. You get a 401 with no obvious reason why."
- "I handled this by registering the webhook route *before* the JSON middleware, using `express.raw({ type: 'application/json' })` as route-level middleware."
- "On the happy path: any valid event returns 200. Invalid signature returns 401. The switch statement logs and handles each event type — extensible for things like retry logic on bounce."

---

## Slide 8 — Sample Request & Response

- "Here's the full round-trip. The request sends two line items — consulting at $150/hr for 5 hours, design review at $200/hr for 2 hours."
- "It also sets `schedule_receipt: true` with a 1-minute delay — so we'll get the invoice email immediately and a receipt a minute later."
- "The response confirms success, echoes the invoice ID, the total ($1,150), who it's from, who it's to, and the ID of the scheduled receipt email."
- "That `scheduledEmailId` is useful — you could store it and cancel the receipt if the client responds before the delay is up."
- "This is the complete feature set in one request: transactional email, PDF attachment, and scheduled follow-up — three Resend capabilities in a single API call."

---

## Slide 9 — Takeaways & What's Next

- "The Resend SDK is well-designed — the surface area is small and each feature is predictable. Attachments, scheduling, and webhook verification all work the way you'd expect once you read the docs once."
- "`scheduled_at` is the standout feature for me. Replacing a job queue with a single field in a send call is a meaningful DX improvement for common patterns."
- "The webhook gotcha — raw body discipline — is the one thing I'd document prominently for any team adopting this. It's not hard, but it's invisible when it breaks."
- "The agentic workflow was a real accelerator for well-scoped, spec-driven work. The more precise the task definition, the better the output. Ambiguous tasks still need a human."
- "Natural next steps: persist invoice records to a DB, add retry logic triggered by `email.bounced` webhook events, build out branded PDF templates, and use Resend Broadcasts if this were to scale to bulk invoicing."
- "Happy to go deeper on any of the implementation details — the webhook plumbing and the PDF attachment path are the two places with the most interesting edge cases."

---

*Timing guide: ~90 sec/slide × 9 slides = ~13 min. Leave ~5 min for Q&A.*
