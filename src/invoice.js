const PDFDocument = require('pdfkit');

function generateInvoiceId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `INV-${datePart}-${rand}`;
}

function generateInvoicePDF(lineItems, clientName, clientEmail, invoiceId, total) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('INVOICE', { align: 'right' });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice ID: ${invoiceId}`, { align: 'right' })
      .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });

    doc.moveDown(1.5);

    // Bill To
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Bill To:');

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(clientName)
      .text(clientEmail);

    doc.moveDown(1.5);

    // Line items table header
    const tableTop = doc.y;
    const colX = { desc: 50, qty: 300, rate: 370, amount: 450 };

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333');

    doc.text('Description', colX.desc, tableTop);
    doc.text('Qty', colX.qty, tableTop, { width: 60, align: 'right' });
    doc.text('Rate', colX.rate, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', colX.amount, tableTop, { width: 80, align: 'right' });

    doc
      .moveTo(50, tableTop + 16)
      .lineTo(550, tableTop + 16)
      .strokeColor('#cccccc')
      .stroke();

    // Line items
    let rowY = tableTop + 24;
    doc.font('Helvetica').fillColor('#000000').fontSize(10);

    lineItems.forEach((item) => {
      const amount = item.quantity * item.rate;

      doc.text(item.description, colX.desc, rowY, { width: 240 });
      doc.text(String(item.quantity), colX.qty, rowY, { width: 60, align: 'right' });
      doc.text(`$${item.rate.toFixed(2)}`, colX.rate, rowY, { width: 70, align: 'right' });
      doc.text(`$${amount.toFixed(2)}`, colX.amount, rowY, { width: 80, align: 'right' });

      rowY += 20;
    });

    doc
      .moveTo(50, rowY + 4)
      .lineTo(550, rowY + 4)
      .strokeColor('#cccccc')
      .stroke();

    rowY += 16;

    // Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Total Due:', colX.rate - 80, rowY, { width: 150, align: 'right' })
      .text(`$${total.toFixed(2)}`, colX.amount, rowY, { width: 80, align: 'right' });

    doc.moveDown(3);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#888888')
      .text('Thank you for your business.', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoiceId, generateInvoicePDF };
