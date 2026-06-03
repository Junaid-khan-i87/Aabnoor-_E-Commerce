import type { SiteSettings } from '../SiteContext';
import type { Order, OrderItem, Product } from '../types';

type DocumentKind = 'shipping-label' | 'invoice' | 'packing-slip';

interface OrderDocumentContext {
  order: Order;
  products: Product[];
  settings: SiteSettings;
  siteName: string;
}

interface PreparedItem {
  item: OrderItem;
  product?: Product;
  sku: string;
  variant: string;
  discount: number;
  lineTotal: number;
}

const money = (amount: number | undefined) => `Rs. ${Number(amount || 0).toFixed(2)}`;

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/[<>&"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char] || char))
    .trim();

const nl2br = (value: unknown) => clean(value).replace(/\n/g, '<br />');

const labelize = (value: string) =>
  value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const isCodPayment = (method?: string) => /cash|cod/i.test(method || '');

const storeName = (context: OrderDocumentContext) =>
  context.settings.storeName || context.siteName || 'Aabnoor Beauty';

const websiteUrl = (settings: SiteSettings) => settings.websiteUrl || 'https://aabnoor.shop';

const supportPhone = (settings: SiteSettings) => settings.supportPhone || settings.storePhone || '';

const supportEmail = (settings: SiteSettings) => settings.supportEmail || settings.storeEmail || '';

const businessAddress = (settings: SiteSettings) => settings.businessAddress || settings.storeAddress || '';

const returnAddress = (settings: SiteSettings) => settings.returnAddress || settings.storeAddress || '';

const orderDate = (order: Order) => {
  const parsed = Date.parse(order.date || '');
  return Number.isNaN(parsed) ? new Date().toLocaleDateString() : new Date(parsed).toLocaleDateString();
};

const invoiceNumber = (order: Order) =>
  order.invoiceNumber || `INV-${order.id.replace(/^ORD-/i, '').slice(0, 10).toUpperCase()}`;

const trackingNumber = (order: Order) => order.trackingNumber || order.tracking_number || order.id.toUpperCase();

const parseShippingContact = (order: Order) => {
  const rawAddress = order.shippingAddress || order.shipping_address || '';
  const phoneMatch = rawAddress.match(/Phone:\s*([^\n]+)/i);
  const emailMatch = rawAddress.match(/Email:\s*([^\n]+)/i);
  const lines = rawAddress
    .replace(/Phone:\s*[^\n]+/i, '')
    .replace(/Email:\s*[^\n]+/i, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const locationLine = lines.find(line => line.includes(',')) || '';
  const locationParts = locationLine.split(',').map(part => part.trim()).filter(Boolean);

  return {
    name: order.customerName || order.customer_name || order.userName || 'Customer',
    phone: order.customerPhone || order.customer_phone || phoneMatch?.[1]?.trim() || '',
    email: emailMatch?.[1]?.trim() || order.userEmail || '',
    address: order.shippingAddress || order.shipping_address || lines.join('\n') || 'No shipping address provided.',
    city: order.city || locationParts[0] || '',
    province: order.province || locationParts[1] || '',
    postalCode: order.postalCode || order.postal_code || '',
  };
};

const findProductForItem = (item: OrderItem, products: Product[]) =>
  products.find(product => item.productId === product.id || item.productId.startsWith(`${product.id}-`));

const itemVariant = (item: OrderItem, product?: Product) => {
  if (item.variant) return item.variant;
  if (!product || item.productId === product.id) return '';
  const variantKey = item.productId.slice(product.id.length + 1);
  const variant = product.variants?.find(entry => entry.name === variantKey || entry.label === variantKey);
  return variant?.label || variant?.name || labelize(variantKey);
};

const prepareItems = (order: Order, products: Product[]): PreparedItem[] =>
  order.items.map(item => {
    const product = findProductForItem(item, products);
    const discount = Number(item.discount || 0);
    const lineTotal = Math.max(0, item.price * item.quantity - discount);
    return {
      item,
      product,
      sku: item.sku || product?.sku || item.productId,
      variant: itemVariant(item, product),
      discount,
      lineTotal,
    };
  });

const totals = (order: Order) => {
  const rawSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = Number(order.subtotal ?? rawSubtotal);
  const delivery = Number(order.deliveryCharges ?? order.delivery_charges ?? order.deliveryFee ?? 0);
  const discount = Number(order.discountAmount ?? order.discount_amount ?? order.coinDiscount ?? 0);
  const tax = Number(order.taxAmount ?? order.tax_amount ?? 0);
  const grandTotal = Number(order.grandTotal ?? order.grand_total ?? order.total ?? subtotal + delivery + tax - discount);
  const paid = Number(order.amountPaid ?? order.amount_paid ?? (isCodPayment(order.paymentMethod) ? 0 : grandTotal));
  const codDue = Number(order.codAmount ?? order.cod_amount ?? (isCodPayment(order.paymentMethod) ? grandTotal - paid : 0));

  return {
    subtotal,
    delivery,
    discount,
    tax,
    grandTotal,
    paid,
    codDue: Math.max(0, codDue),
  };
};

const parcelWeight = (order: Order, items: PreparedItem[]) => {
  if (order.parcelWeight || order.parcel_weight) return String(order.parcelWeight || order.parcel_weight);
  const kg = items.reduce((sum, entry) => sum + Number(entry.product?.shipping_weight || 0) * entry.item.quantity, 0);
  return `${(kg > 0 ? kg : 0.5).toFixed(2)} kg`;
};

const categorySummary = (items: PreparedItem[]) => {
  const categories = Array.from(new Set(items.map(entry => entry.product?.category).filter(Boolean)));
  if (categories.length === 0) return 'Beauty Product / Cosmetics';
  if (categories.length > 2) return 'Beauty Product / Cosmetics';
  return categories.join(' / ');
};

const barcode = (value: string) => {
  const seed = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: 42 }, (_, index) => {
    const width = [1, 2, 3][(seed + index) % 3];
    const visible = (seed + index) % 4 !== 0;
    return `<span style="display:inline-block;width:${width}px;height:42px;margin-right:1px;background:${visible ? '#111' : 'transparent'}"></span>`;
  }).join('');
};

const basePrintStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f4f4; color: #111; font-family: Arial, Helvetica, sans-serif; }
  .sheet { background: #fff; margin: 18px auto; box-shadow: 0 8px 30px rgba(0,0,0,.12); }
  .muted { color: #555; }
  .tiny { font-size: 8px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
  .row { display: flex; gap: 12px; }
  .box { border: 1px solid #111; padding: 10px; }
  .soft { border: 1px solid #d8d8d8; padding: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #111; color: #fff; font-size: 10px; text-align: left; padding: 7px; }
  td { border-bottom: 1px solid #ddd; font-size: 10px; padding: 7px; vertical-align: top; }
  .right { text-align: right; }
  .badge { display: inline-block; border: 1px solid #111; padding: 4px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
  .qr { border: 2px solid #111; width: 76px; height: 76px; display: grid; place-items: center; text-align: center; font-size: 8px; font-weight: 700; line-height: 1.2; }
  .doc-actions { position: sticky; top: 0; display: flex; justify-content: center; gap: 8px; padding: 10px; background: #111; z-index: 3; }
  .doc-actions button { border: 1px solid #fff; background: #fff; color: #111; padding: 9px 14px; font-weight: 700; cursor: pointer; }
  @media print {
    body { background: #fff; }
    nav, aside, header, footer, .doc-actions, .no-print { display: none !important; }
    .sheet { margin: 0 !important; box-shadow: none !important; break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .page-break { break-before: page; page-break-before: always; }
  }
`;

const shippingLabelHtml = (context: OrderDocumentContext) => {
  const { order, settings } = context;
  const contact = parseShippingContact(order);
  const items = prepareItems(order, context.products);
  const orderTotals = totals(order);
  const track = trackingNumber(order);
  const payment = isCodPayment(order.paymentMethod) ? 'COD' : (order.paymentMethod || 'Paid');

  return `
    <style>
      ${basePrintStyles}
      @page { size: 4in 6in; margin: 0; }
      .label-sheet { width: 4in; min-height: 6in; padding: .18in; }
      .label-title { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111; padding-bottom:8px; }
      .brand { font-size: 20px; font-weight: 800; letter-spacing: .08em; }
      .ship-name { font-size: 22px; font-weight: 900; margin: 8px 0 4px; text-transform: uppercase; }
      .ship-address { font-size: 13px; line-height: 1.35; white-space: pre-line; }
      .label-grid { display:grid; grid-template-columns: 1fr 1fr; gap:7px; margin-top:8px; }
      .label-box strong { display:block; font-size:8px; text-transform:uppercase; letter-spacing:.08em; margin-bottom:3px; }
      .label-box { border:1px solid #111; padding:6px; min-height:36px; font-size:11px; }
      .barcode { height: 46px; overflow: hidden; white-space: nowrap; border: 1px solid #111; padding: 2px 4px; margin-top: 8px; }
    </style>
    <main class="sheet label-sheet">
      <section class="label-title">
        <div>
          <div class="brand">${clean(storeName(context))}</div>
          <div class="tiny">Courier Parcel Shipping Label</div>
        </div>
        <div class="qr">QR /<br />ORDER<br />VERIFY</div>
      </section>

      <div class="label-grid">
        <div class="label-box"><strong>Order #</strong>${clean(order.id)}</div>
        <div class="label-box"><strong>Tracking / CN</strong>${clean(track)}</div>
        <div class="label-box"><strong>Payment</strong>${clean(payment)}</div>
        <div class="label-box"><strong>COD Amount</strong>${isCodPayment(order.paymentMethod) ? money(orderTotals.codDue || orderTotals.grandTotal) : 'Paid / N/A'}</div>
      </div>

      <section class="box" style="margin-top:8px;">
        <div class="tiny">Ship To</div>
        <div class="ship-name">${clean(contact.name)}</div>
        <div class="ship-address">${nl2br(contact.address)}</div>
        <div style="margin-top:6px;font-size:12px;"><strong>Phone:</strong> ${clean(contact.phone || 'N/A')}</div>
        <div style="font-size:12px;"><strong>City:</strong> ${clean(contact.city || 'N/A')} &nbsp; <strong>Province:</strong> ${clean(contact.province || 'N/A')} &nbsp; <strong>Postal:</strong> ${clean(contact.postalCode || 'N/A')}</div>
      </section>

      <div class="label-grid">
        <div class="label-box"><strong>Sender</strong>${clean(storeName(context))}<br />${clean(supportPhone(settings))}</div>
        <div class="label-box"><strong>Return Address</strong>${nl2br(returnAddress(settings) || businessAddress(settings))}</div>
        <div class="label-box"><strong>Weight</strong>${clean(parcelWeight(order, items))}</div>
        <div class="label-box"><strong>Category</strong>${clean(categorySummary(items))}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span class="badge">Handle with Care</span>
        <span class="tiny">${clean(order.courierName || order.courier_name || 'Courier: assign')}</span>
      </div>
      <div class="barcode">${barcode(track)}</div>
      <div class="tiny" style="text-align:center;margin-top:4px;">${clean(track)}</div>
    </main>
  `;
};

const invoiceHtml = (context: OrderDocumentContext) => {
  const { order, settings } = context;
  const contact = parseShippingContact(order);
  const items = prepareItems(order, context.products);
  const orderTotals = totals(order);
  const showTax = Boolean(settings.taxEnabled) && orderTotals.tax > 0;
  const policy = settings.defaultReturnPolicy || 'Beauty and personal care items can be returned only when unopened, unused, and reported within 7 days of delivery.';

  return `
    <style>
      ${basePrintStyles}
      @page { size: A4; margin: 12mm; }
      .invoice-sheet { width: 210mm; min-height: 297mm; padding: 15mm; }
      .invoice-head { display:flex; justify-content:space-between; gap:20px; border-bottom:3px solid #111; padding-bottom:14px; }
      .invoice-brand { font-size:26px; letter-spacing:.12em; font-weight:800; }
      .meta-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin:14px 0; }
      .two-col { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:14px; }
      .totals { width: 270px; margin-left:auto; margin-top:12px; }
      .totals div { display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:5px 0; font-size:11px; }
      .grand { font-size:15px !important; font-weight:900; border-bottom:3px solid #111 !important; }
    </style>
    <main class="sheet invoice-sheet">
      <section class="invoice-head">
        <div>
          ${settings.logoUrl ? `<img src="${clean(settings.logoUrl)}" alt="" style="max-width:90px;max-height:50px;object-fit:contain;margin-bottom:6px;" />` : ''}
          <div class="invoice-brand">${clean(storeName(context))}</div>
          <div class="muted" style="font-size:11px;line-height:1.5;">
            ${clean(websiteUrl(settings))}<br />
            ${clean(supportEmail(settings))} | ${clean(supportPhone(settings))}<br />
            ${nl2br(businessAddress(settings))}
          </div>
          ${(settings.ntn || settings.strn) ? `<div class="tiny" style="margin-top:6px;">${settings.ntn ? `NTN: ${clean(settings.ntn)}` : ''}${settings.ntn && settings.strn ? ' | ' : ''}${settings.strn ? `STRN: ${clean(settings.strn)}` : ''}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:30px;font-weight:900;">INVOICE</div>
          <div class="qr" style="margin-left:auto;margin-top:8px;">QR /<br />ORDER<br />VERIFY</div>
        </div>
      </section>

      <section class="meta-grid">
        <div class="soft"><div class="tiny">Invoice #</div><strong>${clean(invoiceNumber(order))}</strong></div>
        <div class="soft"><div class="tiny">Order #</div><strong>${clean(order.id)}</strong></div>
        <div class="soft"><div class="tiny">Invoice Date</div><strong>${clean(orderDate(order))}</strong></div>
        <div class="soft"><div class="tiny">Payment Method</div><strong>${clean(order.paymentMethod || 'N/A')}</strong></div>
        <div class="soft"><div class="tiny">Payment Status</div><strong>${clean(order.paymentStatus || order.payment_status || (isCodPayment(order.paymentMethod) ? 'COD Due' : 'Paid'))}</strong></div>
        <div class="soft"><div class="tiny">Tracking / CN</div><strong>${clean(trackingNumber(order))}</strong></div>
      </section>

      <section class="two-col">
        <div class="box">
          <div class="tiny">Bill / Ship To</div>
          <h3 style="margin:7px 0 5px;">${clean(contact.name)}</h3>
          <div style="font-size:12px;line-height:1.45;">${nl2br(contact.address)}</div>
          <div style="font-size:12px;margin-top:6px;">Phone: ${clean(contact.phone || 'N/A')}</div>
        </div>
        <div class="box">
          <div class="tiny">Store</div>
          <h3 style="margin:7px 0 5px;">${clean(storeName(context))}</h3>
          <div style="font-size:12px;line-height:1.45;">${nl2br(businessAddress(settings))}</div>
          <div style="font-size:12px;margin-top:6px;">Support: ${clean(supportPhone(settings) || supportEmail(settings))}</div>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Variant</th>
            <th class="right">Qty</th>
            <th class="right">Unit</th>
            <th class="right">Discount</th>
            <th class="right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(entry => `
            <tr>
              <td>
                <div style="display:flex;gap:8px;align-items:center;">
                  ${entry.product?.imageUrl ? `<img src="${clean(entry.product.imageUrl)}" alt="" style="width:28px;height:34px;object-fit:cover;border:1px solid #ddd;" />` : ''}
                  <span>${clean(entry.item.name)}</span>
                </div>
              </td>
              <td>${clean(entry.sku)}</td>
              <td>${clean(entry.variant || '-')}</td>
              <td class="right">${entry.item.quantity}</td>
              <td class="right">${money(entry.item.price)}</td>
              <td class="right">${entry.discount ? money(entry.discount) : '-'}</td>
              <td class="right">${money(entry.lineTotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <section class="totals">
        <div><span>Subtotal</span><strong>${money(orderTotals.subtotal)}</strong></div>
        <div><span>Delivery charges</span><strong>${money(orderTotals.delivery)}</strong></div>
        <div><span>Discount</span><strong>${money(orderTotals.discount)}</strong></div>
        ${showTax ? `<div><span>Tax / GST</span><strong>${money(orderTotals.tax)}</strong></div>` : ''}
        <div class="grand"><span>Grand total</span><strong>${money(orderTotals.grandTotal)}</strong></div>
        <div><span>Amount paid</span><strong>${money(orderTotals.paid)}</strong></div>
        <div><span>COD due amount</span><strong>${money(orderTotals.codDue)}</strong></div>
      </section>

      <section class="soft" style="margin-top:18px;font-size:11px;line-height:1.5;">
        <strong>Return / exchange policy:</strong> ${clean(policy)}
        <br /><strong>Note:</strong> Thank you for shopping with Aabnoor Beauty. Keep this invoice for order support and returns.
        ${!settings.taxEnabled ? '<br /><strong>Tax note:</strong> Sales tax/GST is not charged on this invoice.' : ''}
      </section>
    </main>
  `;
};

const packingSlipHtml = (context: OrderDocumentContext) => {
  const { order } = context;
  const contact = parseShippingContact(order);
  const items = prepareItems(order, context.products);
  const orderTotals = totals(order);
  const checks = ['Product checked', 'Expiry checked', 'Seal checked', 'Bubble wrap added', 'Invoice added', 'Shipping label pasted', 'Parcel handed to courier'];

  return `
    <style>
      ${basePrintStyles}
      @page { size: A5; margin: 10mm; }
      .packing-sheet { width: 148mm; min-height: 210mm; padding: 10mm; }
      .packing-head { border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 10px; }
      .check-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:10px; }
      .check { border:1px solid #111; padding:8px; font-size:11px; }
      .square { display:inline-block; width:13px; height:13px; border:1px solid #111; margin-right:7px; vertical-align:middle; }
    </style>
    <main class="sheet packing-sheet">
      <section class="packing-head">
        <div class="tiny">Internal Packing Slip</div>
        <h1 style="margin:5px 0 0;font-size:24px;">${clean(order.id)}</h1>
      </section>
      <div class="meta-grid" style="grid-template-columns:1fr 1fr;">
        <div class="soft"><div class="tiny">Customer</div><strong>${clean(contact.name)}</strong></div>
        <div class="soft"><div class="tiny">City</div><strong>${clean(contact.city || 'N/A')}</strong></div>
        <div class="soft"><div class="tiny">Payment</div><strong>${clean(order.paymentMethod || 'N/A')}</strong></div>
        <div class="soft"><div class="tiny">COD Amount</div><strong>${money(orderTotals.codDue)}</strong></div>
      </div>
      <table style="margin-top:10px;">
        <thead><tr><th>Item Checklist</th><th>SKU</th><th>Variant</th><th class="right">Qty</th></tr></thead>
        <tbody>
          ${items.map(entry => `
            <tr>
              <td><span class="square"></span>${clean(entry.item.name)}</td>
              <td>${clean(entry.sku)}</td>
              <td>${clean(entry.variant || '-')}</td>
              <td class="right">${entry.item.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <section class="check-grid">
        ${checks.map(check => `<div class="check"><span class="square"></span>${check}</div>`).join('')}
      </section>
      <section class="soft" style="margin-top:10px;min-height:46px;">
        <div class="tiny">Internal Notes</div>
        <div style="margin-top:6px;font-size:12px;white-space:pre-line;">${nl2br(order.internalNotes || order.internal_notes || '')}</div>
      </section>
    </main>
  `;
};

const documentHtml = (kind: DocumentKind, context: OrderDocumentContext) => {
  if (kind === 'shipping-label') return shippingLabelHtml(context);
  if (kind === 'packing-slip') return packingSlipHtml(context);
  return invoiceHtml(context);
};

export const printOrderDocument = (kind: DocumentKind, context: OrderDocumentContext) => {
  const popup = window.open('', '_blank', 'width=900,height=900');
  if (!popup) return false;
  popup.opener = null;

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${clean(kind)} - ${clean(context.order.id)}</title>
      </head>
      <body>
        <div class="doc-actions no-print">
          <button type="button" onclick="window.print()">Print</button>
          <button type="button" onclick="window.close()">Close</button>
        </div>
        ${documentHtml(kind, context)}
        <script>
          window.addEventListener('load', () => setTimeout(() => window.print(), 350));
        </script>
      </body>
    </html>
  `);
  popup.document.close();
  return true;
};

const drawPdfBarcode = (doc: any, value: string, x: number, y: number, width: number, height: number) => {
  const seed = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  let cursor = x;
  let index = 0;
  doc.setFillColor(17, 17, 17);
  while (cursor < x + width) {
    const barWidth = [0.7, 1.2, 1.8, 2.4][(seed + index) % 4];
    if ((seed + index) % 4 !== 0) doc.rect(cursor, y, Math.min(barWidth, x + width - cursor), height, 'F');
    cursor += barWidth + 0.9;
    index += 1;
  }
};

export const downloadShippingLabelPdf = async (context: OrderDocumentContext) => {
  const { default: jsPDF } = await import('jspdf');
  const { order, settings } = context;
  const doc = new jsPDF({ unit: 'mm', format: [101.6, 152.4] });
  const contact = parseShippingContact(order);
  const items = prepareItems(order, context.products);
  const orderTotals = totals(order);
  const track = trackingNumber(order);
  const margin = 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.7);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
  doc.setFillColor(17, 17, 17);
  doc.rect(margin, margin, pageWidth - margin * 2, 17, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(storeName(context).toUpperCase(), margin + 4, margin + 7);
  doc.setFontSize(7);
  doc.text('4x6 SHIPPING LABEL', margin + 4, margin + 13);
  doc.text(isCodPayment(order.paymentMethod) ? `COD ${money(orderTotals.codDue || orderTotals.grandTotal)}` : 'PAID', pageWidth - margin - 4, margin + 13, { align: 'right' });

  let y = margin + 25;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(7);
  doc.text('ORDER', margin + 4, y);
  doc.text('TRACKING / CN', pageWidth / 2, y);
  doc.setFontSize(9);
  doc.text(order.id, margin + 4, y + 5);
  doc.text(track, pageWidth / 2, y + 5);

  y += 15;
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SHIP TO', margin + 4, y);
  y += 8;
  doc.setFontSize(16);
  doc.text(contact.name.toUpperCase(), margin + 4, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(contact.address, pageWidth - margin * 2 - 8).slice(0, 6), margin + 4, y);
  y += 33;
  doc.setFont('helvetica', 'bold');
  doc.text(`PHONE: ${contact.phone || 'N/A'}`, margin + 4, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`CITY: ${contact.city || 'N/A'}   PROVINCE: ${contact.province || 'N/A'}   POSTAL: ${contact.postalCode || 'N/A'}`, margin + 4, y);

  const detailY = pageHeight - 61;
  doc.rect(margin, detailY, pageWidth - margin * 2, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('SENDER', margin + 4, detailY + 5);
  doc.text('WEIGHT', pageWidth / 2 - 3, detailY + 5);
  doc.text('CATEGORY', pageWidth - margin - 28, detailY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${storeName(context)} ${supportPhone(settings)}`, margin + 4, detailY + 11);
  doc.text(parcelWeight(order, items), pageWidth / 2 - 3, detailY + 11);
  doc.text(categorySummary(items), pageWidth - margin - 28, detailY + 11);
  doc.setFont('helvetica', 'bold');
  doc.text('HANDLE WITH CARE', margin + 4, detailY + 17);

  const barcodeY = pageHeight - 34;
  drawPdfBarcode(doc, track, margin + 6, barcodeY, pageWidth - margin * 2 - 12, 16);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text(track, pageWidth / 2, barcodeY + 24, { align: 'center' });

  doc.save(`Shipping-Label-${order.id.slice(0, 10)}.pdf`);
};

export const downloadInvoicePdf = async (context: OrderDocumentContext) => {
  const { default: jsPDF } = await import('jspdf');
  const { order, settings } = context;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contact = parseShippingContact(order);
  const items = prepareItems(order, context.products);
  const orderTotals = totals(order);
  const showTax = Boolean(settings.taxEnabled) && orderTotals.tax > 0;
  let y = 18;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) return;
    doc.addPage();
    y = 18;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(storeName(context), margin, y);
  doc.setFontSize(24);
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${websiteUrl(settings)} | ${supportEmail(settings)} | ${supportPhone(settings)}`, margin, y);
  y += 5;
  doc.text(doc.splitTextToSize(businessAddress(settings), 105), margin, y);
  if (settings.ntn || settings.strn) {
    doc.text(`${settings.ntn ? `NTN: ${settings.ntn}` : ''}${settings.ntn && settings.strn ? ' | ' : ''}${settings.strn ? `STRN: ${settings.strn}` : ''}`, pageWidth - margin, y, { align: 'right' });
  }
  y += 13;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Invoice #: ${invoiceNumber(order)}`, margin, y);
  doc.text(`Order #: ${order.id}`, margin + 68, y);
  doc.text(`Date: ${orderDate(order)}`, margin + 132, y);
  y += 6;
  doc.text(`Payment: ${order.paymentMethod || 'N/A'}`, margin, y);
  doc.text(`Status: ${order.paymentStatus || order.payment_status || (isCodPayment(order.paymentMethod) ? 'COD Due' : 'Paid')}`, margin + 68, y);
  doc.text(`Tracking: ${trackingNumber(order)}`, margin + 132, y);
  y += 10;

  doc.rect(margin, y, 86, 34);
  doc.rect(margin + 92, y, pageWidth - margin * 2 - 92, 34);
  doc.text('CUSTOMER', margin + 4, y + 6);
  doc.text('STORE', margin + 96, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text([contact.name, ...doc.splitTextToSize(contact.address, 74), `Phone: ${contact.phone || 'N/A'}`].slice(0, 5), margin + 4, y + 12);
  doc.text([storeName(context), ...doc.splitTextToSize(businessAddress(settings), 74), supportPhone(settings)].slice(0, 5), margin + 96, y + 12);
  y += 44;

  doc.setFillColor(17, 17, 17);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PRODUCT', margin + 3, y + 5.5);
  doc.text('SKU', margin + 73, y + 5.5);
  doc.text('VARIANT', margin + 102, y + 5.5);
  doc.text('QTY', pageWidth - margin - 49, y + 5.5, { align: 'right' });
  doc.text('UNIT', pageWidth - margin - 31, y + 5.5, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 3, y + 5.5, { align: 'right' });
  y += 12;
  doc.setTextColor(17, 17, 17);

  items.forEach(entry => {
    const nameLines = doc.splitTextToSize(entry.item.name, 66);
    const rowHeight = Math.max(11, nameLines.length * 4 + 5);
    ensureSpace(rowHeight + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(nameLines, margin + 3, y);
    doc.text(doc.splitTextToSize(entry.sku, 26), margin + 73, y);
    doc.text(doc.splitTextToSize(entry.variant || '-', 27), margin + 102, y);
    doc.text(String(entry.item.quantity), pageWidth - margin - 49, y, { align: 'right' });
    doc.text(money(entry.item.price), pageWidth - margin - 31, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(money(entry.lineTotal), pageWidth - margin - 3, y, { align: 'right' });
    y += rowHeight;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
  });

  ensureSpace(62);
  y += 3;
  const totalsX = pageWidth - margin - 70;
  const drawTotal = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8);
    doc.text(label, totalsX, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += bold ? 7 : 5.5;
  };
  drawTotal('Subtotal', money(orderTotals.subtotal));
  drawTotal('Delivery charges', money(orderTotals.delivery));
  drawTotal('Discount', money(orderTotals.discount));
  if (showTax) drawTotal('Tax / GST', money(orderTotals.tax));
  drawTotal('Grand total', money(orderTotals.grandTotal), true);
  drawTotal('Amount paid', money(orderTotals.paid));
  drawTotal('COD due amount', money(orderTotals.codDue));

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const policy = settings.defaultReturnPolicy || 'Beauty and personal care items can be returned only when unopened, unused, and reported within 7 days of delivery.';
  doc.text(doc.splitTextToSize(`Return / exchange policy: ${policy}`, pageWidth - margin * 2), margin, y);
  y += 10;
  doc.text('Thank you for shopping with Aabnoor Beauty. Keep this invoice for support and returns.', margin, y);
  if (!settings.taxEnabled) {
    y += 5;
    doc.text('Tax note: Sales tax/GST is not charged on this invoice.', margin, y);
  }

  doc.save(`Invoice-${order.id.slice(0, 10)}.pdf`);
};
