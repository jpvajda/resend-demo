# Resend Invoice Demo — Agent Instructions

## Project
Simple invoice email service. Accepts invoice data via POST /invoice, generates PDF, sends via Resend with attachment. Optional scheduled receipt email. Webhooks for delivery status.

**Scope:** Interview demo. Resend-focused. No external data sources. ~2 days.

---

## Task Reference
See `resend-invoice-demo-agent-tasks.md` for full task list, prompts, and dependencies.

**Execution order:** Phase 1 (scaffold) → 2 (PDF) → 3 (Resend send) → 4 (API endpoint) → 5 (scheduling) → 6 (webhooks) → 7 (docs).

---

## Critical Rules
- **Webhook verification:** Signature verification requires the **raw request body** (unparsed). Use `express.raw({ type: 'application/json' })` for the webhook route only. Do not use `express.json()` for that route.
- **Attachments:** Resend expects `content` as Base64 string. Use `pdfBuffer.toString('base64')`.
- **Validation:** Validate `lineItems`, `clientName`, `clientEmail` before processing. Return 400 with clear message if missing.
- **Scheduling:** `scheduled_at` must be ISO 8601. `new Date(Date.now() + delayHours * 3600000).toISOString()`.

---

## Tech Stack
- Node.js + Express
- Resend SDK
- PDFKit
- dotenv
- svix (webhook verification)

---

## API Conventions
- **Resend:** Bearer token in `Authorization` header. Attachments: `{ filename, content }` where content is Base64.
- **POST /invoice:** `{ lineItems: [{ description, quantity, rate }], clientName, clientEmail, schedule_receipt?, receipt_delay_hours? }`
- **Total:** Calculate from lineItems: `quantity * rate` per item, sum for total. Or accept `total` in payload and validate.

---

## Expected Structure
- `src/index.js` — Express app, routes
- `src/invoice.js` — generateInvoicePDF, generateInvoiceId
- `src/email.js` — sendInvoiceEmail, scheduleReceiptEmail
- `POST /invoice` — main endpoint
- `POST /webhooks/resend` — webhook (raw body required)

---

## When Implementing a Task
1. Check `resend-invoice-demo-agent-tasks.md` for the task prompt and dependencies
2. Implement only what the task specifies; avoid scope creep
3. Preserve existing env vars and API contracts
4. Update README when adding env vars, endpoints, or webhooks

---

## Available Subagents
Project subagents in `.cursor/agents/`. Delegate to them when appropriate:

| Subagent | Use when |
|----------|----------|
| **resend-implementer** | Implementing tasks from the task file (phases 1–5, 7). Knows AGENTS.md rules and execution order. |
| **webhook-specialist** | Implementing or reviewing Phase 6 (webhooks). Svix verification, raw body, event handling. |
| **verifier** | After phases or when work is marked done. Validates implementations work — runs app, tests endpoints. |

**Invoke explicitly:** `/resend-implementer execute Phase 2` or `Use the webhook-specialist for the webhook endpoint`

---

## Subagent Handoff
If splitting work, pass the task ID (e.g., 3.2, 6.1) and the exact prompt from the task file. Subagents should complete one task before starting dependent tasks.
