// Order email templates + Resend delivery, shared by send-order-email and
// sslcommerz-callback. Server-only: RESEND_API_KEY never reaches the browser.

export interface OrderJson {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: { name: string; price: number; quantity: number }[];
}

const SUPPORT_EMAIL = 'support@laglejanaben.com';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function money(n: number): string {
  return `৳${Number(n).toFixed(2)}`;
}

export function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
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

export function invoiceEmail(order: OrderJson): { subject: string; html: string } {
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const total = Number(order.total);
  const shippingFee = total - subtotal + discount;
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');
  const intro =
    order.paymentStatus === 'paid'
      ? 'your payment was received and your order is confirmed.'
      : "thanks for your order! Here's your receipt.";

  const body = `
    <p style="font-size:14px;color:#4b5563;">Hi ${escapeHtml(order.customerName)}, ${intro}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #111827;">Item</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #111827;">Qty</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #111827;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;font-size:13px;margin-top:12px;">
      <tr><td style="color:#6b7280;padding:2px 0;">Subtotal</td><td style="text-align:right;">${money(subtotal)}</td></tr>
      ${discount > 0 ? `<tr><td style="color:#059669;padding:2px 0;">Discount</td><td style="text-align:right;color:#059669;">-${money(discount)}</td></tr>` : ''}
      <tr><td style="color:#6b7280;padding:2px 0;">Shipping</td><td style="text-align:right;">${shippingFee === 0 ? 'Free' : money(shippingFee)}</td></tr>
      <tr><td style="font-weight:700;padding-top:8px;border-top:1px solid #e5e7eb;">Total</td><td style="text-align:right;font-weight:700;padding-top:8px;border-top:1px solid #e5e7eb;">${money(total)}</td></tr>
    </table>
    <p style="font-size:12px;color:#6b7280;margin-top:20px;line-height:1.6;">
      <strong>Order ID:</strong> ${shortId(order.id)}<br/>
      <strong>Payment method:</strong> ${escapeHtml(order.paymentMethod)}<br/>
      <strong>Shipping to:</strong> ${escapeHtml(order.shippingAddress ?? '')}
    </p>
  `;

  return {
    subject: `Your Lagle Janaben order ${shortId(order.id)} is confirmed`,
    html: emailShell('Order Confirmed', body),
  };
}

export function cancellationEmail(order: OrderJson): { subject: string; html: string } {
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const body = `
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Hi ${escapeHtml(order.customerName)}, your order <strong>${shortId(order.id)}</strong> placed on
      ${placedOn} has been cancelled.
    </p>
    <table style="width:100%;font-size:13px;margin-top:12px;">
      <tr><td style="color:#6b7280;padding:2px 0;">Order total</td><td style="text-align:right;">${money(order.total)}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280;margin-top:16px;line-height:1.6;">
      ${order.paymentStatus === 'paid' ? 'If you were charged, a refund will be processed to your original payment method.' : 'No payment was collected for this order.'}
      If this wasn't you, or you have any questions, just reply to this email.
    </p>
  `;

  return {
    subject: `Your Lagle Janaben order ${shortId(order.id)} was cancelled`,
    html: emailShell('Order Cancelled', body),
  };
}

export async function sendEmail(to: string, email: { subject: string; html: string }): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) throw new Error('Email is not configured (RESEND_API_KEY / EMAIL_FROM)');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: SUPPORT_EMAIL, subject: email.subject, html: email.html }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
