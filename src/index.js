require('dotenv').config();

const express = require('express');
const { Webhook } = require('svix');
const { generateInvoiceId, generateInvoicePDF } = require('./invoice');
const { sendInvoiceEmail, scheduleReceiptEmail } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;

// Webhook route must be registered BEFORE express.json() so the body stays raw (unparsed).
// Svix signature verification requires the original raw bytes.
app.post('/webhooks/resend', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error('[Webhook] WEBHOOK_SIGNING_SECRET is not set');
    return res.status(401).json({ error: 'Webhook secret not configured' });
  }

  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  let payload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(req.body, req.headers);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const eventType = payload.type;

  switch (eventType) {
    case 'email.delivered':
      console.log(`[Webhook] Email delivered: ${payload.data?.email_id}`);
      break;
    case 'email.bounced':
      console.error(`[Webhook] Email bounced: ${payload.data?.email_id}`);
      break;
    case 'email.complained':
      console.warn(`[Webhook] Email complained: ${payload.data?.email_id}`);
      break;
    default:
      console.log(`[Webhook] Unhandled event: ${eventType}`);
  }

  return res.status(200).json({ received: true, type: eventType });
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/invoice', async (req, res) => {
  const { lineItems, clientName, clientEmail, schedule_receipt, delay_minutes } = req.body;

  const missing = [];
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) missing.push('lineItems');
  if (!clientName) missing.push('clientName');
  if (!clientEmail) missing.push('clientEmail');

  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  try {
    const total = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const invoiceId = generateInvoiceId();
    const pdfBuffer = await generateInvoicePDF(lineItems, clientName, clientEmail, invoiceId, total);

    await sendInvoiceEmail(pdfBuffer, clientEmail, clientName, invoiceId, total);

    const response = {
      success: true,
      invoiceId,
      invoice_total: total,
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: clientEmail,
    };

    if (schedule_receipt) {
      const delayMinutes = typeof delay_minutes === 'number' ? delay_minutes : 1; // set to a different value if desired
      const scheduled = await scheduleReceiptEmail(clientEmail, clientName, invoiceId, total, delayMinutes);
      response.scheduledEmailId = scheduled?.data?.id ?? null;
    }

    return res.json(response);
  } catch (err) {
    console.error('Invoice handler error:', err);
    return res.status(500).json({ error: 'Failed to send invoice', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
