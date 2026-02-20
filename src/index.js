require('dotenv').config();

const express = require('express');
const { generateInvoiceId, generateInvoicePDF } = require('./invoice');
const { sendInvoiceEmail, scheduleReceiptEmail, getResend } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;

// Webhook route: raw body required for signature verification.
// express.raw() is scoped to this route only—express.json() is registered below for all other routes.
app.post('/webhooks/resend', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = (process.env.WEBHOOK_SECRET || '').trim();
  if (!secret || secret === 'whsec_your_signing_secret_here') {
    console.error('[Webhook] WEBHOOK_SECRET is missing.');
    return res.status(401).json({ error: 'Webhook secret not configured' });
  }

  const payloadString = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;

  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
    console.error('[Webhook] Missing Svix headers');
    return res.status(401).json({ error: 'Missing webhook headers' });
  }

  let payload;
  try {
    const resend = getResend();
    payload = resend.webhooks.verify({
      payload: payloadString,
      headers: {
        id: headers['svix-id'],
        timestamp: headers['svix-timestamp'],
        signature: headers['svix-signature'],
      },
      webhookSecret: secret,
    });
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const eventType = payload.type;

  // events to capture via the webhook
  switch (eventType) {
    case 'email.sent':
      console.log(`[Webhook] Email sent: ${payload.data?.email_id}`);
      break;
    case 'email.delivered':
      console.log(`[Webhook] Email delivered: ${payload.data?.email_id}`);
      break;
    case 'email.delivery_delayed':
      console.warn(`[Webhook] Email delivery delayed: ${payload.data?.email_id}`);
      break;
    case 'email.failed':
      console.error(`[Webhook] Email failed: ${payload.data?.email_id}`, payload.data?.last_error);
      break;
    case 'email.bounced':
      console.error(`[Webhook] Email bounced: ${payload.data?.email_id}`);
      break;
    case 'email.complained':
      console.warn(`[Webhook] Email complained: ${payload.data?.email_id}`);
      break;
    case 'email.clicked':
      console.log(`[Webhook] Email clicked: ${payload.data?.email_id}`);
      break;
    case 'email.scheduled':
      console.log(`[Webhook] Email scheduled: ${payload.data?.email_id}`);
      break;
    case 'email.suppressed':
      console.warn(`[Webhook] Email suppressed: ${payload.data?.email_id}`);
      break;
    case 'email.opened':
      console.log(`[Webhook] Email opened: ${payload.data?.email_id}`);
      break;
    case 'email.received':
      console.log(`[Webhook] Email received: ${payload.data?.email_id}`);
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
