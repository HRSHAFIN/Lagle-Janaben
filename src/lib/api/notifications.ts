import { insforge } from '../insforge';
import { Order } from '../../types';

const SUPPORT_EMAIL = 'support@laglejanaben.com';

function money(n: number): string {
  return `৳${n.toFixed(2)}`;
}

function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function itemRows(order: Order): string {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f7f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:20px;font-weight:800;"><span style="color:#1E2D44;">Lagle</span> <span style="color:#B88E4C;">Janaben</span></div>
        <div style="font-size:11px;color:#9ca3af;letter-spacing:.05em;text-transform:uppercase;margin-top:2px;">Gifts that connect Hearts</div>
      </div>
      <div style="background:#ffffff;border:1px solid #f0f0f0;border-radius:16px;padding:28px;">
        <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">Lagle Janaben &middot; Gulshan-2, Dhaka, Bangladesh</p>
    </div>
  </body>
</html>`;
}

/** Detailed HTML invoice, sent once an order is actually placed/fulfilled (COD immediately, gateway on confirmed payment). */
export async function sendInvoiceEmail(order: Order): Promise<void> {
  const shippingFee = order.total - order.subtotal + order.discount;
  const body = `
    <p style="font-size:14px;color:#4b5563;">Hi ${order.customerName}, thanks for your order! Here's your receipt.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #111827;">Item</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #111827;">Qty</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #111827;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows(order)}</tbody>
    </table>
    <table style="width:100%;font-size:13px;margin-top:12px;">
      <tr><td style="color:#6b7280;padding:2px 0;">Subtotal</td><td style="text-align:right;">${money(order.subtotal)}</td></tr>
      ${order.discount > 0 ? `<tr><td style="color:#059669;padding:2px 0;">Discount</td><td style="text-align:right;color:#059669;">-${money(order.discount)}</td></tr>` : ''}
      <tr><td style="color:#6b7280;padding:2px 0;">Shipping</td><td style="text-align:right;">${shippingFee === 0 ? 'Free' : money(shippingFee)}</td></tr>
      <tr><td style="font-weight:700;padding-top:8px;border-top:1px solid #e5e7eb;">Total</td><td style="text-align:right;font-weight:700;padding-top:8px;border-top:1px solid #e5e7eb;">${money(order.total)}</td></tr>
    </table>
    <p style="font-size:12px;color:#6b7280;margin-top:20px;line-height:1.6;">
      <strong>Order ID:</strong> ${shortId(order.id)}<br/>
      <strong>Payment method:</strong> ${order.paymentMethod}<br/>
      <strong>Shipping to:</strong> ${order.shippingAddress}
    </p>
  `;

  const { error } = await insforge.emails.send({
    to: order.customerEmail,
    subject: `Your Lagle Janaben order ${shortId(order.id)} is confirmed`,
    html: emailShell('Order Confirmed', body),
    from: 'Lagle Janaben',
    replyTo: SUPPORT_EMAIL,
  });
  if (error) throw new Error(error.message);
}

/** Sent whenever an order transitions to Cancelled, whether by the customer or an admin. */
export async function sendCancellationEmail(order: Order): Promise<void> {
  const body = `
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Hi ${order.customerName}, your order <strong>${shortId(order.id)}</strong> placed on
      ${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      has been cancelled.
    </p>
    <table style="width:100%;font-size:13px;margin-top:12px;">
      <tr><td style="color:#6b7280;padding:2px 0;">Order total</td><td style="text-align:right;">${money(order.total)}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280;margin-top:16px;line-height:1.6;">
      ${order.paymentStatus === 'paid' ? 'If you were charged, a refund will be processed to your original payment method.' : 'No payment was collected for this order.'}
      If this wasn't you, or you have any questions, just reply to this email.
    </p>
  `;

  const { error } = await insforge.emails.send({
    to: order.customerEmail,
    subject: `Your Lagle Janaben order ${shortId(order.id)} was cancelled`,
    html: emailShell('Order Cancelled', body),
    from: 'Lagle Janaben',
    replyTo: SUPPORT_EMAIL,
  });
  if (error) throw new Error(error.message);
}
