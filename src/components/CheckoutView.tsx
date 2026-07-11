import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Mail, MapPin, User, CheckCircle2, ChevronRight, ShoppingBag, ExternalLink } from 'lucide-react';
import { CartItem, Order, OrderItem } from '../types';
import { PROMO_CODES } from '../data';

interface CheckoutViewProps {
  cart: CartItem[];
  appliedPromo: string;
  onPlaceOrder: (orderData: {
    customerName: string;
    customerEmail: string;
    shippingAddress: string;
    paymentMethod: string;
    id?: string;
  }) => Order;
  onBackToCatalog: () => void;
  onClearCart: () => void;
  initialOrder?: Order | null;
}

export default function CheckoutView({
  cart,
  appliedPromo,
  onPlaceOrder,
  onBackToCatalog,
  onClearCart,
  initialOrder,
}: CheckoutViewProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    paymentMethod: 'Cash on Delivery',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [createdOrder, setCreatedOrder] = useState<Order | null>(initialOrder || null);

  useEffect(() => {
    if (initialOrder) {
      setCreatedOrder(initialOrder);
    }
  }, [initialOrder]);

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // States for handling iframe-bypassing new tab payment & verification
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [pendingTranId, setPendingTranId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');

  // Polling hook to check if payment is completed in the other tab
  useEffect(() => {
    if (!isWaitingForPayment || !pendingTranId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/sslcommerz/order/${pendingTranId}`);
        if (!response.ok) return;

        const orderData = await response.json();
        if (orderData && (orderData.status === 'Processing' || orderData.paymentStatus === 'paid')) {
          if (isMounted) {
            setIsWaitingForPayment(false);
            setPendingTranId('');
            setPaymentUrl('');

            // Securely create the order in the client context with correct ID
            const completedOrder = onPlaceOrder({
              customerName: formData.name,
              customerEmail: formData.email,
              shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
              paymentMethod: 'SSLCommerz',
              id: pendingTranId,
            });

            setCreatedOrder(completedOrder);
            onClearCart();
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    };

    pollInterval = setInterval(pollPaymentStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isWaitingForPayment, pendingTranId, formData, onPlaceOrder, onClearCart]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  let discount = 0;
  if (appliedPromo && PROMO_CODES[appliedPromo]) {
    discount = subtotal * PROMO_CODES[appliedPromo];
  }

  const isFreeShipping = subtotal >= 150;
  const shipping = isFreeShipping ? 0 : 10;
  const total = subtotal - discount + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Valid email is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (!formData.address.trim()) errors.address = 'Street address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.zip.trim()) errors.zip = 'ZIP code is required';

    if (formData.paymentMethod === 'Credit Card') {
      if (!formData.cardNumber.trim() || formData.cardNumber.replace(/\s/g, '').length < 16) {
        errors.cardNumber = 'Valid 16-digit card number is required';
      }
      if (!formData.cardExpiry.trim()) errors.cardExpiry = 'Expiry is required';
      if (!formData.cardCvc.trim() || formData.cardCvc.length < 3) {
        errors.cardCvc = 'CVC is required';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      const element = document.getElementsByName(firstError)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (formData.paymentMethod === 'SSLCommerz') {
      setIsRedirecting(true);
      setPaymentError('');
      
      const randomID = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

      try {
        const response = await fetch('/api/sslcommerz/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            currency: 'BDT',
            tran_id: randomID,
            cus_name: formData.name,
            cus_email: formData.email,
            cus_phone: formData.phone,
            cus_address: formData.address,
            cus_city: formData.city,
            cus_state: formData.state,
            cus_zip: formData.zip,
            order_details: {
              items: cart.map((item) => ({
                productId: item.product.id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                image: item.product.image,
              })),
              subtotal,
              discount,
            }
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Could not initiate payment session. Please try again.');
        }

        const data = await response.json();
        if (data.redirectUrl) {
          setIsRedirecting(false);
          setPaymentUrl(data.redirectUrl);
          setPendingTranId(randomID);
          setIsWaitingForPayment(true);

          // Open secure gateway in a new browser tab/window to bypass iframe sandboxing and framing blocks
          const payWindow = window.open(data.redirectUrl, '_blank');
          if (!payWindow) {
            console.warn('Popup window was blocked by the browser. Showing manual click link.');
          }
        } else {
          throw new Error(data.error || 'Initiation response did not return redirectUrl.');
        }
      } catch (error: any) {
        setIsRedirecting(false);
        setPaymentError(error.message || 'Connection failed. Please check your network.');
        console.error('SSLCommerz initiation error:', error);
      }
      return;
    }

    // Input is valid, trigger Order creation
    const fullShippingAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`;
    const order = onPlaceOrder({
      customerName: formData.name,
      customerEmail: formData.email,
      shippingAddress: fullShippingAddress,
      paymentMethod: formData.paymentMethod,
    });

    setCreatedOrder(order);
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
            Your order has been placed successfully. A confirmation email has been sent to{' '}
            <span className="font-semibold text-gray-800">{createdOrder.customerEmail}</span>.
          </p>

          {/* Receipt Summary Card */}
          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-6 text-left" id="order-receipt">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-gray-200 gap-2">
              <div>
                <span className="font-sans text-xs uppercase tracking-wider text-gray-400 font-semibold">Order ID</span>
                <p className="font-mono text-sm font-bold text-gray-900">{createdOrder.id}</p>
              </div>
              <div className="sm:text-right">
                <span className="font-sans text-xs uppercase tracking-wider text-gray-400 font-semibold">Date Placed</span>
                <p className="font-sans text-sm text-gray-800">
                  {new Date(createdOrder.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Receipt Items */}
            <div className="py-4 border-b border-gray-200 max-h-48 overflow-y-auto space-y-3">
              {createdOrder.items.map((item) => (
                <div key={item.productId} className="flex justify-between items-center text-sm">
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
                  {createdOrder.subtotal >= 150 ? 'Free' : '৳10.00'}
                </span>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total Paid</span>
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
            <button
              onClick={() => {
                onBackToCatalog();
                // Trigger view to Admin -> Orders directly
                setTimeout(() => {
                  const adminBtn = document.getElementById('nav-admin-btn');
                  if (adminBtn) adminBtn.click();
                }, 50);
              }}
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-sans text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Track in Admin Portal
            </button>
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
      {isRedirecting && (
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
                  setPendingTranId('');
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
          <p className="font-semibold mb-1">Payment Connection Error</p>
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
                  {formErrors.name && (
                    <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.name}</p>
                  )}
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
                  {formErrors.email && (
                    <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.email}</p>
                  )}
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
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="01700000000"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.phone}</p>
                  )}
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
                    Street Address
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
                    placeholder="428 Oak Avenue, Apt 4B"
                  />
                  {formErrors.address && (
                    <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
                  <div>
                    <label htmlFor="city" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                        formErrors.city ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="San Francisco"
                    />
                    {formErrors.city && (
                      <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      State / Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                        formErrors.state ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="CA"
                    />
                    {formErrors.state && (
                      <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="zip" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                        formErrors.zip ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="94102"
                    />
                    {formErrors.zip && (
                      <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.zip}</p>
                    )}
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
                  <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                    formData.paymentMethod === 'Cash on Delivery' 
                      ? 'border-gray-900 bg-gray-50/50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
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

                  <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                    formData.paymentMethod === 'SSLCommerz' 
                      ? 'border-gray-900 bg-gray-50/50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex flex-col text-left">
                      <span className="font-sans text-sm font-semibold text-gray-900">Online Payment</span>
                      <span className="font-sans text-[10px] text-gray-400">Cards, bKash, Nagad, etc.</span>
                    </div>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="SSLCommerz"
                      checked={formData.paymentMethod === 'SSLCommerz'}
                      onChange={handleInputChange}
                      className="accent-gray-900"
                    />
                  </label>
                </div>

                {/* Conditional SSLCommerz Details Info */}
                {formData.paymentMethod === 'SSLCommerz' && (
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

                {/* Conditional Credit Card Details Form */}
                {formData.paymentMethod === 'Credit Card' && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-4 animate-in fade-in duration-200">
                    <div>
                      <label htmlFor="cardNumber" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => {
                          // Format number by adding spaces
                          const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                          const matches = v.match(/\d{4,16}/g);
                          const match = (matches && matches[0]) || '';
                          const parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }
                          const formatted = parts.length > 0 ? parts.join(' ') : v;
                          setFormData({ ...formData, cardNumber: formatted.slice(0, 19) });
                          if (formErrors.cardNumber) setFormErrors({ ...formErrors, cardNumber: '' });
                        }}
                        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                          formErrors.cardNumber ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="4111 2222 3333 4444"
                      />
                      {formErrors.cardNumber && (
                        <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.cardNumber}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4">
                      <div>
                        <label htmlFor="cardExpiry" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Expiration Date
                        </label>
                        <input
                          type="text"
                          id="cardExpiry"
                          name="cardExpiry"
                          value={formData.cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length >= 2) {
                              val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                            }
                            setFormData({ ...formData, cardExpiry: val.slice(0, 5) });
                            if (formErrors.cardExpiry) setFormErrors({ ...formErrors, cardExpiry: '' });
                          }}
                          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                            formErrors.cardExpiry ? 'border-red-500' : 'border-gray-200'
                          }`}
                          placeholder="MM/YY"
                        />
                        {formErrors.cardExpiry && (
                          <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.cardExpiry}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="cardCvc" className="block font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          id="cardCvc"
                          name="cardCvc"
                          value={formData.cardCvc}
                          onChange={(e) => {
                            setFormData({ ...formData, cardCvc: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) });
                            if (formErrors.cardCvc) setFormErrors({ ...formErrors, cardCvc: '' });
                          }}
                          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:border-gray-900 focus:outline-none ${
                            formErrors.cardCvc ? 'border-red-500' : 'border-gray-200'
                          }`}
                          placeholder="•••"
                        />
                        {formErrors.cardCvc && (
                          <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.cardCvc}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Submission Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full rounded-xl bg-gray-900 py-4 font-sans text-sm font-semibold text-white shadow-md hover:bg-gray-800 transition-all active:scale-[0.99]"
                id="place-order-btn"
              >
                Place Secure Order (৳{total.toFixed(2)})
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
              {cart.map((item) => (
                <div key={item.product.id} className="flex py-4 first:pt-0" id={`summary-item-${item.product.id}`}>
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
                    <div className="flex justify-between font-sans text-xs text-gray-400 mt-1">
                      <span>Category: {item.product.category}</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Prices Calculation Block */}
            <div className="space-y-2 font-sans text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-mono">৳{subtotal.toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo Discount ({appliedPromo})</span>
                  <span className="font-mono">-৳{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>{isFreeShipping ? 'Free Shipping' : '৳10.00'}</span>
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
                <span>Free Insured Delivery on orders &gt; ৳150</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
