import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { Order } from '../types';
import Logo from './Logo';
import { formatSelectedOptions } from '../lib/cart';
import { orderShippingFee, shortId } from '../lib/format';

interface OrderInvoiceProps {
  order: Order;
  onClose: () => void;
}

function money(n: number): string {
  return `৳${n.toFixed(2)}`;
}

const STATUS_STYLES: Record<Order['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Processing: 'bg-indigo-50 text-indigo-700',
  Shipped: 'bg-blue-50 text-blue-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

/**
 * Printable invoice for one order. "Print / Save PDF" uses the browser's print
 * dialog. It renders into <body> (outside #root) so the print stylesheet in
 * index.css can hide the whole app and print only the invoice.
 */
export default function OrderInvoice({ order, onClose }: OrderInvoiceProps) {
  const placedAt = new Date(order.createdAt);
  const shippingFee = orderShippingFee(order);

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto print:static print:overflow-visible" id="order-invoice-overlay">
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm print:hidden" onClick={onClose} />

      <div className="relative mx-auto my-8 w-full max-w-3xl px-4 print:my-0 print:max-w-none print:px-0">
        {/* Toolbar (not printed) */}
        <div className="mb-3 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-[#1E2D44] px-4 py-2 font-sans text-sm font-semibold text-white shadow hover:bg-[#16233a]"
            id="invoice-print-btn"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save PDF</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-white p-2 text-gray-500 shadow hover:text-gray-900"
            aria-label="Close invoice"
            id="invoice-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div id="order-invoice" className="rounded-2xl bg-white p-8 font-sans text-gray-800 shadow-2xl sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          {/* Header */}
          <div className="flex flex-col gap-6 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100">
                <Logo className="h-8 w-8" />
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-tight text-[#1E2D44]">
                  Lagle <span className="text-[#B88E4C]">Janaben</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-gray-400">Gifts that connect Hearts</div>
                <div className="mt-1 text-xs text-gray-500">Gulshan-2, Dhaka, Bangladesh</div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-2xl font-bold tracking-tight text-gray-900">INVOICE</div>
              <div className="mt-1 font-mono text-sm font-semibold text-gray-700">{shortId(order.id)}</div>
              <div className="mt-1 text-xs text-gray-500">
                {placedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })},{' '}
                {placedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* Bill to / payment */}
          <div className="grid gap-6 border-b border-gray-100 py-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Bill To</h3>
              <p className="font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600">{order.customerPhone || 'Phone not provided'}</p>
              <p className="text-sm text-gray-600">{order.customerEmail}</p>
              <p className="mt-1 text-sm text-gray-600">{order.shippingAddress}</p>
            </div>
            <div className="sm:text-right">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Payment</h3>
              <p className="text-sm font-semibold text-gray-900">{order.paymentMethod}</p>
              <p className={`text-sm ${order.paymentStatus === 'paid' ? 'text-emerald-600' : order.paymentStatus === 'failed' ? 'text-red-600' : 'text-gray-600'}`}>
                {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'failed' ? 'Payment failed' : 'Due on delivery'}
              </p>
            </div>
          </div>

          {/* Items */}
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-900 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 text-center font-semibold">Qty</th>
                <th className="pb-2 text-right font-semibold">Unit Price</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item, idx) => {
                const options = formatSelectedOptions(item);
                return (
                  <tr key={`${item.productId ?? 'item'}-${idx}`}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {options && <div className="text-xs text-[#B88E4C]">{options}</div>}
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right font-mono">{money(item.price)}</td>
                    <td className="py-3 text-right font-mono font-medium">{money(item.price * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{money(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-mono">-{money(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-mono">{shippingFee === 0 ? 'Free' : money(shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-900 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span className="font-mono">{money(order.total)}</span>
              </div>
            </div>
          </div>

          <p className="mt-10 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
            Thank you for shopping with Lagle Janaben
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
