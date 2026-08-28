import { useEffect, useState } from 'react';
import { ArrowLeft, Package, ShoppingBag, AlertTriangle, Timer } from 'lucide-react';
import { Order } from '../types';

const CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;

function remainingCancelMs(order: Order, now: number): number {
  if (!['Pending', 'Processing'].includes(order.status)) return 0;
  const deadline = new Date(order.createdAt).getTime() + CANCEL_WINDOW_MS;
  return Math.max(deadline - now, 0);
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const STATUS_STYLES: Record<Order['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Processing: 'bg-indigo-50 text-indigo-700',
  Shipped: 'bg-blue-50 text-blue-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

interface MyOrdersViewProps {
  orders: Order[];
  loading: boolean;
  onCancelOrder: (orderId: string) => Promise<void>;
  onBackToCatalog: () => void;
}

export default function MyOrdersView({ orders, loading, onCancelOrder, onBackToCatalog }: MyOrdersViewProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Ticks every second so the cancel-window countdown is genuinely live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    setError('');
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this order.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" id="my-orders-container">
      <button
        onClick={onBackToCatalog}
        className="flex items-center space-x-1.5 font-sans text-sm font-medium text-gray-500 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Shop</span>
      </button>

      <h1 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl mb-1">My Orders</h1>
      <p className="font-sans text-sm text-gray-500 mb-8">Your order history and status. Orders can be cancelled within 2 hours of placing them.</p>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-gray-100 bg-gray-50/50">
          <div className="rounded-full bg-white p-4 border border-gray-100">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 font-sans text-base font-semibold text-gray-900">No orders yet</h3>
          <p className="mt-1 font-sans text-sm text-gray-500 max-w-xs">Orders you place while signed in will show up here.</p>
          <button
            onClick={onBackToCatalog}
            className="mt-6 rounded-lg bg-gray-900 px-5 py-2.5 font-sans text-sm font-medium text-white shadow hover:bg-gray-800"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const remaining = remainingCancelMs(order, now);
            return (
            <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm text-left" id={`my-order-${order.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="rounded-full bg-gray-50 p-2">
                    <Package className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-900" title={order.id}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-sans text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 font-sans text-xs font-semibold ${STATUS_STYLES[order.status]}`}>{order.status}</span>
              </div>

              <div className="py-4 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={`${item.productId ?? 'item'}-${idx}`} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.name} <span className="text-gray-400">× {item.quantity}</span>
                    </span>
                    <span className="font-mono text-gray-800">৳{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="font-sans text-sm">
                  <span className="text-gray-500">Total: </span>
                  <span className="font-mono font-bold text-gray-900">৳{order.total.toFixed(2)}</span>
                  <span className="ml-2 text-xs text-gray-400">({order.paymentMethod}, {order.paymentStatus})</span>
                </div>
                {remaining > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-mono text-xs text-gray-500" title="Time left to cancel this order">
                      <Timer className="h-3.5 w-3.5 text-gray-400" />
                      {formatCountdown(remaining)} left to cancel
                    </span>
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancellingId === order.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-sans text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      {cancellingId === order.id ? 'Cancelling…' : 'Cancel Order'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
