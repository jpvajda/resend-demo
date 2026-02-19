# Resend Invoice Demo

A Node.js invoice email service that generates PDF invoices and sends them via [Resend](https://resend.com). Built as an interview demo project to showcase Resend's transactional email, scheduling, and webhook capabilities.

## Features

- PDF invoice generation with [PDFKit](https://pdfkit.org)
- Transactional email via Resend with PDF attachment
- Optional scheduled receipt email (using Resend's `scheduled_at`)
- Webhook handling for delivery events (delivered, bounced, complained)
- Svix signature verification for webhooks

## Prerequisites

1. A Resend Account. [Sign up here](https://resend.com/).
2. A Resend API Key.
3. A email to send from

## Emails to use

- `onboarding@resend.dev` can  be used for the sender email. The resend.dev domain is available for testing, but with a restriction: it can only send to your own email address.
- Resend provides test addresses like `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev`, and `suppressed@resend.dev` to simulate different delivery scenarios.

## Setup

```bash
git clone <repo>
cd resend-demo
npm install
cp .env.example .env
# Edit .env with your values
npm start
```

## Health Check

Confirm the server is working by running:

```bash
curl http://localhost:{port}/
```

A successful response will look like:

```
{"status":"ok"}
```


## API Usage

### Send an Invoice

Set the `clientEmail` to a real email address.

```bash
curl -X POST http://localhost:{port}/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [
      { "description": "Consulting", "quantity": 5, "rate": 150 },
      { "description": "Design review", "quantity": 2, "rate": 200 }
    ],
    "clientName": "Acme Corp",
    "clientEmail": "you@youremail.com",
    "schedule_receipt": true,
    "delay_minutes": 1
  }'
```

Use `delay_minutes` to control when the receipt is sent. Defaults to `1` if omitted.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `delay_minutes` | number | `1` | Minutes to wait before sending the receipt email |

**Response:**

```json
{
  "success": true,
  "invoiceId": "INV-20260217-4823",
  "invoice_total": 1150,
  "from": "Resend <onboarding@resend.dev>",
  "to": "you@youremail.com"
}
```

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/invoice` | Generate and send invoice email |
| `POST` | `/webhooks/resend` | Receive Resend delivery events |

---

## Webhooks

Resend uses [Svix](https://svix.com) to sign webhook payloads. Every request to `POST /webhooks/resend` includes `svix-id`, `svix-timestamp`, and `svix-signature` headers. The server verifies these headers against `WEBHOOK_SIGNING_SECRET` before processing any event.

### Events

| Event | Description |
|-------|-------------|
| `email.delivered` | Email successfully delivered to recipient |
| `email.bounced` | Email bounced (invalid address or server rejection) |
| `email.complained` | Recipient marked email as spam |

### Getting the Signing Secret

1. Open the [Resend Dashboard](https://resend.com/webhooks)
2. Go to **Webhooks** → **Add Endpoint**
3. Enter your endpoint URL (e.g. `https://your-domain.com/webhooks/resend`)
4. Copy the **Signing Secret** shown after creation
5. Add it to your `.env`:
   ```
   WEBHOOK_SIGNING_SECRET=whsec_...
   ```

### Testing Locally with ngrok

```bash
ngrok http 3000
# Use the HTTPS URL as your webhook endpoint in the Resend dashboard
# e.g., https://abc123.ngrok.io/webhooks/resend
```

---

## Project Structure

```
src/
  index.js      # Express app and routes
  invoice.js    # PDF generation (generateInvoicePDF, generateInvoiceId)
  email.js      # Email sending (sendInvoiceEmail, scheduleReceiptEmail)
.env.example    # Environment variable template
```
