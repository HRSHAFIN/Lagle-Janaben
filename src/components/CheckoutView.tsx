import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CreditCard, MapPin, User, CheckCircle2, ShoppingBag, ExternalLink, AlertTriangle } from 'lucide-react';
import { CartItem, Order, ShippingSettings } from '../types';
import { SslcommerzDeliveryDetails } from '../lib/api/orders';
import { computeOrderTotals } from '../lib/pricing';
import { isValidEmail, isValidBdPhone } from '../lib/validation';
import { cartItemKey, formatSelectedOptions } from '../lib/cart';

interface AppliedPromo {
  code: string;
  discount: number;
}

interface CheckoutViewProps {
  cart: CartItem[];
  appliedPromo: AppliedPromo | null;
  shippingSettings: ShippingSettings;
  isAdmin: boolean;
  onPlaceCodOrder: (data: { customerName: string; customerEmail: string; shippingAddress: string }) => Promise<Order>;
  onInitiateGatewayOrder: (data: {
    customerName: string;
    customerEmail: string;
    shippingAddress: string;
    delivery: SslcommerzDeliveryDetails;
  }) => Promise<{ order: Order; redirectUrl: string }>;
  onGetOrderStatus: (orderId: string) => Promise<Order | null>;
  onBackToCatalog: () => void;
  onClearCart: () => void;
  onNavigateAdminOrders: () => void;
  initialOrder?: Order | null;
}

const MAX_POLL_ATTEMPTS = 120; // ~5 minutes at 2.5s intervals

// Flip once real SSLCommerz merchant credentials are configured.
const ONLINE_PAYMENT_ENABLED = false;

export default function CheckoutView({
  cart,
  appliedPromo,
  shippingSettings,
  isAdmin,
  onPlaceCodOrder,
  onInitiateGatewayOrder,
  onGetOrderStatus,
  onBackToCatalog,
  onClearCart,
  onNavigateAdminOrders,
  initialOrder,
}: CheckoutViewProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    upazila: '',
    postalCode: '',
    paymentMethod: 'Cash on Delivery' as 'Cash on Delivery' | 'SSLCommerz',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [createdOrder, setCreatedOrder] = useState<Order | null>(initialOrder || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (initialOrder) setCreatedOrder(initialOrder);
  }, [initialOrder]);

  // Gateway payment: single order id created up-front by the server, then
  // polled read-only until payment is confirmed or fails.
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollAttempts = useRef(0);

  useEffect(() => {
    if (!isWaitingForPayment || !pendingOrderId) return;

    let cancelled = false;
    pollAttempts.current = 0;

    const pollPaymentStatus = async () => {
      pollAttempts.current += 1;
      try {
        const order = await onGetOrderStatus(pendingOrderId);
        if (cancelled) return;

        if (order?.paymentStatus === 'paid') {
          setIsWaitingForPayment(false);
          setPaymentUrl('');
          setCreatedOrder(order);
          onClearCart();
          return;
        }
        if (order?.paymentStatus === 'failed') {
          setIsWaitingForPayment(false);
          setPaymentUrl('');
          setPaymentError('Your payment could not be completed. Please try again or choose Cash on Delivery.');
          return;
        }
        if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
          setPollTimedOut(true);
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    };

    const interval = setInterval(pollPaymentStatus, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isWaitingForPayment, pendingOrderId, onGetOrderStatus, onClearCart]);

  const { subtotal, discount, shippingFee, total } = computeOrderTotals(
    cart,
    appliedPromo?.discount ?? 0,
    shippingSettings
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: '' });
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim() || !isValidEmail(formData.email)) errors.email = 'Valid email is required';
    if (!formData.phone.trim() || !isValidBdPhone(formData.phone.trim())) {
      errors.phone = 'Enter a valid Bangladeshi number, e.g. 017XXXXXXXX';
    }
    if (!formData.address.trim()) errors.address = 'Street address is required';
    if (!formData.district.trim()) errors.district = 'District is required';
    if (!formData.upazila.trim()) errors.upazila = 'Thana / Upazila is required';
    if (!formData.postalCode.trim()) errors.postalCode = 'Postal code is required';
    return errors;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.keys(errors)[0];
      const element = document.getElementsByName(firstError)[0];
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const fullShippingAddress = `${formData.address}, ${formData.upazila}, ${formData.district} ${formData.postalCode}`;

    if (formData.paymentMethod === 'SSLCommerz') {
      setIsSubmitting(true);
      setPopupBlocked(false);
      setPollTimedOut(false);
      try {
        const { order, redirectUrl } = await onInitiateGatewayOrder({
          customerName: formData.name,
          customerEmail: formData.email,
          shippingAddress: fullShippingAddress,
          delivery: {
            cusPhone: formData.phone,
            cusAddress: formData.address,
            cusCity: formData.district,
            cusState: formData.upazila,
            cusZip: formData.postalCode,
          },
        });

        setPendingOrderId(order.id);
        setPaymentUrl(redirectUrl);
        setIsWaitingForPayment(true);

        const payWindow = window.open(redirectUrl, '_blank');
        if (!payWindow) setPopupBlocked(true);
      } catch (error) {
        setPaymentError(error instanceof Error ? error.message : 'Could not start payment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await onPlaceCodOrder({
        customerName: formData.name,
        customerEmail: formData.email,
        shippingAddress: fullShippingAddress,
      });
      setCreatedOrder(order);
      onClearCart();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Could not place your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order was successfully created, show Receipt Screen
  if (createdOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8 text-center" id="success-screen">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Thank you for your order!
          </h1>
          <p className="mt-3 font-sans text-sm text-gray-500">
            Your order has been placed successfully for{' '}
            <span className="font-semibold text-gray-800">{createdOrder.customerEmail}</span>.
          </p>

          {/* Receipt Summary Card */}
          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-6 text-left" id="order-receipt">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-gray-200 gap-2">
              <div>
                <span className="font-sans text-xs uppercase tracking-wider text-gray-400 font-semibold">Order ID</span>
                <p className="font-mono text-sm font-bold text-gray-900">#{createdOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="sm:text-right">
                <span className="font-sans text-xs uppercase tracking-wider text-gray-400 font-semibold">Date Placed</span>
                <p className="font-sans text-sm text-gray-800">
                  {new Date(createdOrder.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Receipt Items */}
            <div className="py-4 border-b border-gray-200 max-h-48 overflow-y-auto space-y-3">
              {createdOrder.items.map((item, idx) => (
                <div key={`${item.productId ?? 'item'}-${idx}`} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded object-cover border border-gray-100"
                      />
                    )}
                    <div>
                      <h4 className="font-sans font-medium text-gray-900">{item.name}</h4>
                      <p className="font-sans text-xs text-gray-400">Qty: {item.quantity}</p>
                      {formatSelectedOptions(item) && (
                        <p className="font-sans text-xs text-[#B88E4C] font-medium">{formatSelectedOptions(item)}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-gray-800 font-medium">
                    ৳{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 space-y-1.5 text-sm font-sans">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-mono">৳{createdOrder.subtotal.toFixed(2)}</span>
              </div>
              {createdOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo discount</span>
                  <span className="font-mono">-৳{createdOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span className="font-mono">
                  {createdOrder.subtotal >= shippingSettings.free_shipping_threshold
                    ? 'Free'
                    : `৳${shippingSettings.shipping_fee.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total {createdOrder.paymentStatus === 'paid' ? 'Paid' : 'Due'}</span>
                <span className="font-mono">৳{createdOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Logistics details */}
            <div className="mt-5 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1.5 font-sans">
              <p>
                <span className="font-bold text-gray-700">Shipping to:</span> {createdOrder.shippingAddress}
              </p>
              <p>
                <span className="font-bold text-gray-700">Paid with:</span> {createdOrder.paymentMethod}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onBackToCatalog}
              className="rounded-xl bg-gray-900 px-6 py-3 font-sans text-sm font-semibold text-white shadow hover:bg-gray-800"
            >
              Continue Shopping
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  onBackToCatalog();
                  onNavigateAdminOrders();
                }}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-sans text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Track in Admin Portal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback if someone ends up on checkout screen with an empty cart
  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center" id="empty-checkout">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-gray-50 p-4 animate-bounce">
            <ShoppingBag className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="font-sans text-lg font-bold text-gray-900">Your cart is empty</h2>
          <p className="font-sans text-sm text-gray-500 max-w-xs">
            Add items to your shopping cart from our product catalog before proceeding to checkout.
          </p>
          <button
            onClick={onBackToCatalog}
            className="rounded-lg bg-gray-900 px-6 py-2.5 font-sans text-sm font-semibold text-white hover:bg-gray-800"
          >
            Back to Products Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="checkout-view-container">
      {/* Dynamic SSLCommerz Redirection Overlay */}
      {isSubmitting && formData.paymentMethod === 'SSLCommerz' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 mb-4" />
          <h3 className="font-sans text-lg font-bold text-gray-900">Connecting SSLCommerz Secure Gateway...</h3>
          <p className="font-sans text-sm text-gray-500 mt-1">Please do not close this window or press back.</p>
        </div>
      )}

      {/* Secure Payment Waiting / Polling Overlay */}
      {isWaitingForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="mx-4 max-w-md w-full rounded-2xl bg-white p-8 border border-gray-100 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-gray-900 animate-spin mb-5" />

            <h3 className="font-sans text-lg font-bold text-gray-900 mb-2">Awaiting Secure Payment...</h3>
            <p className="font-sans text-sm text-gray-500 mb-6 leading-relaxed">
              We have opened the secure SSLCommerz payment portal in a new tab. Please complete your transaction there. Once validated, this page will instantly refresh with your receipt.
            </p>

            {popupBlocked && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="font-sans text-xs text-amber-800">
                  Your browser blocked the payment popup. Use the button below to open it manually.
                </p>
              </div>
            )}
            {pollTimedOut && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left">
                <AlertTriangle className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="font-sans text-xs text-gray-600">
                  This is taking longer than usual. If you've completed payment, keep this tab open — we'll pick it up automatically once confirmed.
                </p>
              </div>
            )}

            <div className="w-full space-y-3">
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-all shadow-sm"
              >
                <span>Reopen Payment Portal</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsWaitingForPayment(false);
                  setPendingOrderId('');
                  setPaymentUrl('');
                }}
                className="w-full text-xs font-semibold text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                Cancel and Choose Another Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb / Back Navigation */}
      <button
        onClick={onBackToCatalog}
        className="flex items-center space-x-1.5 font-sans text-sm font-medium text-gray-500 hover:text-gray-900 mb-8"
        id="back-to-shop-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Shop</span>
      </button>

      {paymentError && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 font-sans text-left animate-in fade-in duration-200">
          <p className="font-semibold mb-1">Checkout Error</p>
          <p>{paymentError}</p>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
        {/* Left: Checkout Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handlePlaceOrder} className="space-y-8" id="checkout-form">
            {/* Contact Information */}
            <div className="text-left">
              <h2 className="font-sans text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
                <User className="h-5 w-5 text-gray-500" />
                <span>Contact Information</span>
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
                <div>
                  <label htmlFor="name" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                      formErrors.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Sarah Jenkins"
                  />
                  {formErrors.name && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                      formErrors.email ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="sarah.j@example.com"
                  />
                  {formErrors.email && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
                      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="017XXXXXXXX"
                    inputMode="numeric"
                  />
                  {formErrors.phone && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="text-left">
              <h2 className="font-sans text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <span>Shipping Address</span>
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="address" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    House / Road / Area
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                      formErrors.address ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="House 12, Road 5, Block C"
                  />
                  {formErrors.address && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.address}</p>}
                </div>

                <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
                  <div>
                    <label htmlFor="district" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      District
                    </label>
                    <input
                      type="text"
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                        formErrors.district ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Dhaka"
                    />
                    {formErrors.district && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.district}</p>}
                  </div>

                  <div>
                    <label htmlFor="upazila" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Thana / Upazila
                    </label>
                    <input
                      type="text"
                      id="upazila"
                      name="upazila"
                      value={formData.upazila}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                        formErrors.upazila ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Gulshan"
                    />
                    {formErrors.upazila && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.upazila}</p>}
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                        formErrors.postalCode ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="1212"
                      inputMode="numeric"
                    />
                    {formErrors.postalCode && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.postalCode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="text-left">
              <h2 className="font-sans text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <span>Payment Method</span>
              </h2>

              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                      formData.paymentMethod === 'Cash on Delivery' ? 'border-gray-900 bg-gray-50/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-sans text-sm font-semibold text-gray-900">Cash on Delivery</span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash on Delivery"
                      checked={formData.paymentMethod === 'Cash on Delivery'}
                      onChange={handleInputChange}
                      className="accent-gray-900"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                      ONLINE_PAYMENT_ENABLED
                        ? `cursor-pointer ${formData.paymentMethod === 'SSLCommerz' ? 'border-gray-900 bg-gray-50/50' : 'border-gray-200 hover:bg-gray-50'}`
                        : 'cursor-not-allowed border-gray-100 bg-gray-50/60 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="flex items-center gap-2 font-sans text-sm font-semibold text-gray-900">
                        Online Payment
                        {!ONLINE_PAYMENT_ENABLED && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide text-amber-700">
                            Coming Soon
                          </span>
                        )}
                      </span>
                      <span className="font-sans text-[10px] text-gray-400">
                        {ONLINE_PAYMENT_ENABLED ? 'Cards, bKash, Nagad, etc.' : 'Currently unavailable — cards, bKash, Nagad soon'}
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="SSLCommerz"
                      checked={formData.paymentMethod === 'SSLCommerz'}
                      onChange={handleInputChange}
                      disabled={!ONLINE_PAYMENT_ENABLED}
                      className="accent-gray-900"
                    />
                  </label>
                </div>

                {ONLINE_PAYMENT_ENABLED && formData.paymentMethod === 'SSLCommerz' && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2 animate-in fade-in duration-200 text-sm mb-4">
                    <p className="font-sans font-semibold text-amber-900 flex items-center gap-1.5">
                      💳 Secure Online Payment Active
                    </p>
                    <p className="font-sans text-amber-800 leading-relaxed text-xs text-left">
                      Upon clicking "Place Secure Order", you will be safely redirected to the secure SSLCommerz checkout gateway.
                      You can pay using credit cards, debit cards, or local mobile wallets (bKash, Nagad, Rocket, etc.) to complete your transaction.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Submission Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gray-900 py-4 font-sans text-sm font-semibold text-white shadow-md hover:bg-gray-800 transition-all active:scale-[0.99] disabled:opacity-60"
                id="place-order-btn"
              >
                {isSubmitting ? 'Processing…' : `Place Secure Order (৳${total.toFixed(2)})`}
              </button>
              <p className="mt-3 text-center font-sans text-xs text-gray-400">
                🔒 Your transaction is secure. This is a fully functional check-out experience.
              </p>
            </div>
          </form>
        </div>

        {/* Right Column: Order Summary */}
        <div className="mt-10 lg:col-span-5 lg:mt-0" id="order-summary-sidebar">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-left">
            <h2 className="font-sans text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Order Summary
            </h2>

            {/* List of checkout items */}
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto mb-6 pr-1">
              {cart.map((item) => {
                const key = cartItemKey(item);
                const optionsLabel = formatSelectedOptions(item);
                return (
                <div key={key} className="flex py-4 first:pt-0" id={`summary-item-${key}`}>
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col justify-center">
                    <div className="flex justify-between font-sans text-sm font-semibold text-gray-900">
                      <h4 className="line-clamp-1 pr-2">{item.product.name}</h4>
                      <p className="font-mono ml-2">৳{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                    {optionsLabel && <p className="font-sans text-xs text-[#B88E4C] font-medium mt-0.5">{optionsLabel}</p>}
                    <div className="flex justify-between font-sans text-xs text-gray-400 mt-1">
                      <span>Category: {item.product.category}</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Prices Calculation Block */}
            <div className="space-y-2 font-sans text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-mono">৳{subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo Discount ({appliedPromo?.code})</span>
                  <span className="font-mono">-৳{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? 'Free Shipping' : `৳${shippingFee.toFixed(2)}`}</span>
              </div>

              <div className="border-t border-gray-200 my-4" />

              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Order Total</span>
                <span className="font-mono text-lg">৳{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Benefits Trust Badge */}
            <div className="mt-6 rounded-xl bg-gray-50 p-4 border border-gray-100 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>30-Day Hassle-Free Returns Guarantee</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Free Insured Delivery on orders &gt; ৳{shippingSettings.free_shipping_threshold}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
