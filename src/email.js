const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

async function sendInvoiceEmail(pdfBuffer, clientEmail, clientName, invoiceId, total) {
  const from = `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color:#0f172a;padding:32px 40px;">
                  <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${process.env.FROM_NAME}</p>
                  <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Invoice Notification</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#1e293b;font-size:16px;">Hi ${clientName},</p>
                  <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                    Please find your invoice attached to this email. Here's a summary:
                  </p>

                  <!-- Invoice summary card -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:32px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:4px;">Invoice Number</td>
                            <td style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:4px;text-align:right;">Amount Due</td>
                          </tr>
                          <tr>
                            <td style="color:#0f172a;font-size:18px;font-weight:700;">${invoiceId}</td>
                            <td style="color:#0f172a;font-size:18px;font-weight:700;text-align:right;">${formatCurrency(total)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 8px;color:#475569;font-size:14px;line-height:1.6;">
                    The full invoice PDF is attached to this email for your records.
                  </p>
                  <p style="margin:0 0 32px;color:#475569;font-size:14px;line-height:1.6;">
                    If you have any questions, please don't hesitate to reach out.
                  </p>
                  <p style="margin:0;color:#1e293b;font-size:14px;">
                    Best regards,<br>
                    <strong>${process.env.FROM_NAME}</strong>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated invoice email. Please do not reply directly to this message.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const response = await getResend().emails.send({
    from,
    to: clientEmail,
    subject: `Invoice ${invoiceId} from ${process.env.FROM_NAME}`,
    html,
    attachments: [
      {
        filename: `invoice-${invoiceId}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  return response;
}

async function scheduleReceiptEmail(clientEmail, clientName, invoiceId, total, delayMinutes) {
  const from = `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`;
  const scheduledAt = new Date(Date.now() + delayMinutes * 60000).toISOString();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color:#0f172a;padding:32px 40px;">
                  <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${process.env.FROM_NAME}</p>
                  <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Payment Receipt</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#1e293b;font-size:16px;">Hi ${clientName},</p>
                  <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                    Thank you! Your payment receipt for invoice <strong>${invoiceId}</strong> totaling
                    <strong>${formatCurrency(total)}</strong> has been processed.
                  </p>
                  <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
                    We appreciate your prompt payment and look forward to working with you again.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated receipt. Please do not reply directly to this message.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const response = await getResend().emails.send({
    from,
    to: clientEmail,
    subject: `Receipt for Invoice ${invoiceId}`,
    html,
    scheduled_at: scheduledAt,
  });

  return response;
}

module.exports = { getResend, sendInvoiceEmail, scheduleReceiptEmail };
