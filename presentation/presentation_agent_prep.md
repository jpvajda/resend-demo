# Presentation: Resend Invoice Demo
Audience: Resend Engineering / Interview Panel | Tone: Technical, confident, concise | Vibe: Dark mode-first, minimal, premium — match Resend's own brand aesthetic | Slides: 9

## Design System (Resend Brand — July 2025 Rebrand)
Colors:
- Background (Iron/Black): #0C0C0E
- Surface/card: #111113
- Border/subtle: #2E2F37
- Body text (Eggshell): #EDEEF0
- Secondary text (Stone): #8B8D98
- Accent/highlight: #FFFFFF (pure white for key callouts)
- Code block bg: #18191B

Typography:
- Display/H1: Domaine Display (serif) — Klim Type Foundry
- Subheadings: ABC Favorit (Dinamo)
- Body + code: Inter

Notes for renderer:
- No bright accent colors — Resend's brand is grayscale-first post-rebrand
- Use subtle gradients (dark slate tones) for slide backgrounds, not flat black
- Code blocks should use monospace (Inter Mono or JetBrains Mono), dark background, light text
- Wordmark: use "Resend" with capital R only; logo available at https://cdn.resend.com/brand/resend-wordmark-white.svg

---

## Slide 1: Title Slide
- Resend Invoice Demo
- An agentic approach to a transactional email service
- Built by: [Your Name] | February 2026

---

## Slide 2: What I Built
- A Node.js + Express service that sends invoice emails via Resend
- Single `POST /invoice` endpoint orchestrates the full flow:
  - Validate input → Generate PDF → Send email with attachment → Optionally schedule a receipt
- Webhook listener at `POST /webhooks/resend` handles all Resend delivery events
- Covers four core Resend capabilities: transactional email, attachments, scheduling, webhooks

---

## Slide 3: How I Built It — The Agentic Approach
- Used AI agents (via Cursor) to implement all 7 phases of the project
- Broke the project into 14 discrete agent tasks across phases 1–7
- Used 3 sub-agents: with unique skills: resend-implementer, verifier, webhook-specialist
- Each task had a structured prompt, clear inputs, and defined outputs
- Agents operated with dependencies — Phase N only started after Phase N-1 completed
- Result: full working service built with some manual coding

---

## Slide 4: Architecture
```
POST /invoice
  { lineItems, clientName, clientEmail, schedule_receipt, delay_minutes }
       │
       ├── Validate inputs (400 on failure)
       ├── generateInvoicePDF()   →  PDFKit → Buffer
       ├── sendInvoiceEmail()     →  Resend SDK (with Base64 PDF attachment)
       └── scheduleReceiptEmail() →  Resend scheduled_at (ISO 8601)

POST /webhooks/resend
  → express.raw() (unparsed body required for Svix HMAC verification)
  → resend.webhooks.verify()
  → switch on event type (sent, delivered, bounced, complained, ...)
```
- Three source files: `src/index.js`, `src/invoice.js`, `src/email.js`

---

## Slide 5: Resend Feature — Transactional Email + PDF Attachment
- Invoice email sent via Resend Node SDK with HTML body and inline styles
- PDF generated in-memory with PDFKit — no temp files written to disk
- Attachment passed as Base64 string: `pdfBuffer.toString('base64')`
- Resend attachment format: `[{ filename: 'invoice.pdf', content: base64String }]`
- Unique invoice IDs generated per request: `INV-YYYYMMDD-XXXX`

---

## Slide 6: Resend Feature — Scheduled Email
- Optional receipt email sent after a configurable delay (in minutes)
- Uses Resend's `scheduled_at` field — ISO 8601 datetime
- Calculated as: `new Date(Date.now() + delayMinutes * 60000).toISOString()`
- Triggered by `schedule_receipt: true` in the request payload
- Receipt email ID returned in API response for tracking

---

## Slide 7: Resend Feature — Webhooks
- Endpoint: `POST /webhooks/resend`
- Signature verified via Resend SDK's `resend.webhooks.verify()` (Svix under the hood)
- Critical implementation detail: `express.raw()` scoped to webhook route only — unparsed body required for HMAC verification
- Handles 11 event types: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, and more
- Returns `401` on invalid signature, `200` on all valid events

---

## Slide 8: Sample Request & Response
**Request:**
```bash
curl -X POST http://localhost:3000/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [
      { "description": "Consulting", "quantity": 5, "rate": 150 },
      { "description": "Design review", "quantity": 2, "rate": 200 }
    ],
    "clientName": "Acme Corp",
    "clientEmail": "billing@acme.com",
    "schedule_receipt": true,
    "delay_minutes": 1
  }'
```
**Response:**
```json
{
  "success": true,
  "invoiceId": "INV-20260220-4823",
  "invoice_total": 1150,
  "from": "Resend <onboarding@resend.dev>",
  "to": "billing@acme.com",
  "scheduledEmailId": "re_abc123..."
}
```

---

## Slide 9: Takeaways & What's Next
- Resend's SDK is clean and predictable — attachment, scheduling, and webhook verify are first-class
- The `scheduled_at` API is a standout feature — no job queue needed for simple delays
- Svix signature verification requires raw body discipline — easy to get wrong, easy to document
- Agentic development with structured tasks dramatically accelerated delivery
- **Possible extensions:** store invoice records in a DB, retry on bounce, PDF templates with branding, Resend Broadcasts for bulk invoicing
