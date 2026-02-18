# Resend Invoice Demo — Agent Tasks

**Project:** Simple invoice email service. Accepts invoice data via API, generates PDF, sends via Resend with attachment. Optional receipt email (scheduled). Webhooks for delivery status.

**Scope:** Interview demo — Resend-focused. No external data sources. ~2 days.

**Tech stack:** Node.js + Express + Resend

---

## Requirements Checklist

| Requirement | How This Project Addresses |
|-------------|---------------------------|
| Transactional email | Invoice + receipt emails |
| Attachments | PDF invoice attached to email |
| Scheduling | Receipt email with `scheduled_at` (e.g., 1h delay) |
| Webhooks | Svix verification, handle delivered/bounced/complained |
| README | Setup, usage, webhooks section |

---

## Architecture Overview

```
POST /invoice { lineItems, total, clientEmail } → Generate PDF → Resend (send + attach) → Optional: schedule receipt
                                                                    ↓
                                              Webhook ← Resend events (delivered, bounced, complained)
```

| Step | Action |
|------|--------|
| 1 | POST /invoice with payload |
| 2 | Generate PDF from line items |
| 3 | Send invoice email via Resend (with PDF attachment) |
| 4 | Optional: Schedule receipt email 1h later |
| 5 | Webhook receives Resend events |

---

## API Reference (Quick)

### Resend
- **Send:** `POST https://api.resend.com/emails`
- **Auth:** `Authorization: Bearer RESEND_API_KEY`
- **Attachments:** `content` (Base64 string), `filename`
- **Schedule:** `scheduled_at` — ISO 8601 datetime

### Webhooks
- Resend uses Svix for signing. Verify `svix-signature` header with webhook signing secret from Resend dashboard.

---

## Agent Task Phases

---

### Phase 1: Environment & Scaffold

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 1.1 | Create project structure | "Create a Node.js project with Express. Include package.json, src/index.js, README skeleton. Use plain JS or TypeScript." | `package.json`, `src/index.js`, `README.md` |
| 1.2 | Add env config | "Add dotenv. Create .env.example with: RESEND_API_KEY, FROM_EMAIL, FROM_NAME, WEBHOOK_SIGNING_SECRET. Document each in README." | `.env.example`, env loading |
| 1.3 | Add dependencies | "Install: resend, pdfkit, dotenv. Add scripts for start and dev." | `package.json` with deps |

---

### Phase 2: PDF Invoice Generation

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 2.1 | Generate PDF | "Create generateInvoicePDF(lineItems, clientName, clientEmail, invoiceId, total). Use PDFKit. Line items: description, quantity, rate, amount. Include client details, grand total. Return Buffer." | `src/invoice.js` — `generateInvoicePDF()` |
| 2.2 | Invoice ID helper | "Add generateInvoiceId() — e.g., INV-YYYYMMDD-001. Simple increment or timestamp-based." | `generateInvoiceId()` |

---

### Phase 3: Resend Email (Send + Attachment)

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 3.1 | Resend client | "Create src/email.js. Use Resend SDK. Send email with from (FROM_EMAIL/NAME), to, subject, html. Use RESEND_API_KEY." | `src/email.js` |
| 3.2 | Attach PDF | "Add attachment support. Convert PDF Buffer to Base64. Resend attachments: [{ filename: 'invoice.pdf', content: base64String }]." | Attachment support in send |
| 3.3 | Invoice email template | "Create sendInvoiceEmail(pdfBuffer, clientEmail, invoiceId, total). HTML body: greeting, invoice number, total, 'PDF attached'. Inline styles for email clients." | `sendInvoiceEmail()` |

---

### Phase 4: API Endpoint & Orchestration

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 4.1 | Invoice endpoint | "Add POST /invoice. Body: { lineItems: [{ description, quantity, rate }], clientName, clientEmail }. Validate required fields. Generate PDF, send via Resend. Return { success, invoiceId } or error." | `POST /invoice` |
| 4.2 | Error handling | "Wrap in try/catch. Return 400 for validation errors, 500 for send failures. Log errors." | Robust error handling |

---

### Phase 5: Scheduling (Receipt Email)

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 5.1 | Schedule receipt | "Add optional scheduleReceiptEmail(clientEmail, invoiceId, total, delayHours). Use Resend's scheduled_at. ISO 8601: new Date(Date.now() + delayHours * 3600000).toISOString(). Simple HTML: 'Thank you, your receipt for INV-XXX ($total).'" | `scheduleReceiptEmail()` |
| 5.2 | Wire to endpoint | "Add optional schedule_receipt and receipt_delay_hours to POST /invoice body. If true, call scheduleReceiptEmail after successful send." | Updated `/invoice` |

---

### Phase 6: Webhooks

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 6.1 | Webhook endpoint | "Add POST /webhooks/resend. Use svix package to verify signature. Get raw body (express.raw or similar) — verification needs unparsed body. Check svix-signature header against WEBHOOK_SIGNING_SECRET." | `POST /webhooks/resend` |
| 6.2 | Event handlers | "Parse webhook payload. Handle email.delivered: log. email.bounced, email.complained: log and return 200. Return 401 if signature invalid." | Event handlers |
| 6.3 | Webhook docs | "Add 'Webhooks' section to README: what they are, Resend events table, how to get signing secret, how to test locally (ngrok)." | README section |

---

### Phase 7: Documentation & Polish

| Task ID | Agent Task | Prompt | Output |
|---------|------------|--------|--------|
| 7.1 | README | "Complete README: project overview, setup (npm install, .env), API usage (curl example for POST /invoice), scheduling, webhooks, .env.example." | Full README |
| 7.2 | .env.example | "Ensure all vars with placeholders. Add comment: Get webhook signing secret from Resend Dashboard > Webhooks." | Complete .env.example |

---

## Cursor Subagent Prompts (Copy-Paste)

```
**1.1** Create a Node.js + Express project. Include package.json, src/index.js, README skeleton. Use plain JS or TypeScript.
```

```
**1.2** Add dotenv. Create .env.example with RESEND_API_KEY, FROM_EMAIL, FROM_NAME, WEBHOOK_SIGNING_SECRET. Document each in README.
```

```
**1.3** Install resend, pdfkit, dotenv. Add start and dev scripts to package.json.
```

```
**2.1** Create src/invoice.js. generateInvoicePDF(lineItems, clientName, clientEmail, invoiceId, total) using PDFKit. Return Buffer. Include line items table and grand total.
```

```
**2.2** Add generateInvoiceId() — e.g., INV-YYYYMMDD-001. Timestamp or simple increment.
```

```
**3.1** Create src/email.js. Resend SDK. Send email with from, to, subject, html. Use RESEND_API_KEY from env.
```

```
**3.2** Add PDF attachment to Resend send. Convert Buffer to Base64. attachments: [{ filename: 'invoice.pdf', content: base64 }].
```

```
**3.3** Create sendInvoiceEmail(pdfBuffer, clientEmail, invoiceId, total). HTML body with greeting, invoice number, total, "PDF attached". Inline styles.
```

```
**4.1** Add POST /invoice. Body: { lineItems: [{ description, quantity, rate }], clientName, clientEmail }. Validate, generate PDF, send. Return { success, invoiceId }.
```

```
**4.2** Wrap in try/catch. 400 for validation, 500 for send failures. Log errors.
```

```
**5.1** Add scheduleReceiptEmail(clientEmail, invoiceId, total, delayHours). Use Resend scheduled_at. ISO 8601 datetime.
```

```
**5.2** Add schedule_receipt and receipt_delay_hours to POST /invoice. If true, call scheduleReceiptEmail after send.
```

```
**6.1** Add POST /webhooks/resend. Use svix to verify signature. Need raw body — use express.raw() for webhook route. Verify svix-signature with WEBHOOK_SIGNING_SECRET.
```

```
**6.2** Parse payload. Handle email.delivered, email.bounced, email.complained. Log each. Return 401 if invalid signature.
```

```
**6.3** Add Webhooks section to README: what they are, Resend events, signing secret, ngrok for local testing.
```

```
**7.1** Complete README: overview, setup, API usage with curl example, scheduling, webhooks.
```

```
**7.2** Complete .env.example with all vars. Comment: webhook secret from Resend Dashboard > Webhooks.
```

---

## Suggested Execution Order

1. **Phase 1** (1.1 → 1.3) — scaffold
2. **Phase 2** (2.1, 2.2) — PDF
3. **Phase 3** (3.1 → 3.3) — Resend send + attachment
4. **Phase 4** (4.1, 4.2) — API endpoint
5. **Phase 5** (5.1, 5.2) — scheduling
6. **Phase 6** (6.1 → 6.3) — webhooks
7. **Phase 7** (7.1, 7.2) — docs

---

## Dependencies Between Tasks

- 2.2 can run with 2.1
- 3.2 depends on 3.1
- 3.3 depends on 3.2
- 4.1 depends on 2.1, 3.3
- 5.1 depends on 3.1 (or extend email.js)
- 5.2 depends on 5.1, 4.1
- 6.2 depends on 6.1

---

## Sample Request

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
    "receipt_delay_hours": 1
  }'
```

---

## Resources

- [Resend Docs](https://resend.com/docs/introduction)
- [Resend Webhooks](https://resend.com/docs/dashboard/webhooks/introduction)
- [Resend Node SDK](https://github.com/resend/resend-node)
- [Svix Webhook Verification](https://docs.svix.com/receiving/verifying-payloads/how)
- [PDFKit](https://pdfkit.org/)
