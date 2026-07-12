import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Percent } from 'lucide-react';
import { CartItem, PromoCode, ShippingSettings } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  appliedPromo: string;
  onApplyPromo: (code: string) => void;
  promoCodes: PromoCode[];
  shippingSettings: ShippingSettings;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  appliedPromo,
  onApplyPromo,
  promoCodes,
  shippingSettings,
}: CartDrawerProps) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  // Calculate promo discount
  let discount = 0;
  if (appliedPromo) {
    const promo = promoCodes.find(p => p.code === appliedPromo && p.is_active);
    if (promo) {
      discount = promo.type === 'percentage' ? subtotal * (promo.value / 100) : promo.value;
    }
  }

  const finalTotal = subtotal - discount;
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const freeShippingThreshold = shippingSettings.free_shipping_threshold;
  const shippingLeft = Math.max(freeShippingThreshold - subtotal, 0);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccessMsg('');
    
    const formattedCode = promoInput.trim().toUpperCase();
    if (!formattedCode) {
      setPromoError('Please enter a promo code');
      return;
    }

    const promo = promoCodes.find(p => p.code === formattedCode && p.is_active);
    if (promo) {
      onApplyPromo(formattedCode);
      const discountText = promo.type === 'percentage' ? `${promo.value}%` : `৳${promo.value.toFixed(2)}`;
      setPromoSuccessMsg(`Promo code applied successfully! Saved ${discountText}`);
      setPromoInput('');
    } else {
      setPromoError('Invalid promo code');
    }
  };

  const handleRemovePromo = () => {
    onApplyPromo('');
    setPromoSuccessMsg('');
    setPromoError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity animate-in fade-in-50 duration-200" 
        onClick={onClose} 
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full" id="cart-drawer-container">
        {/* Sliding Panel */}
        <div className="w-screen max-w-[calc(100vw-24px)] sm:max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-5 sm:px-6 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-gray-900" />
              <h2 className="font-sans text-lg font-bold text-gray-900">Your Cart</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-gray-700">
                {itemsCount}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500"
              id="close-cart-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Contents */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Shipping Progress */}
            {subtotal > 0 && (
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100" id="shipping-progress">
                {shippingLeft > 0 ? (
                  <div>
                    <p className="font-sans text-xs font-medium text-gray-600 text-left">
                      You are <span className="font-bold text-gray-900">৳{shippingLeft.toFixed(2)}</span> away from <span className="font-semibold text-gray-900">Free Shipping</span>.
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div 
                        className="h-full bg-gray-900 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="inline-block rounded-full bg-emerald-100 p-1 text-emerald-800">
                      <Percent className="h-3 w-3" />
                    </span>
                    <p className="font-sans text-xs font-semibold text-emerald-800 text-left">
                      Congratulations! Your order qualifies for Free Shipping.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center h-full space-y-4" id="empty-cart-view">
                <div className="rounded-full bg-gray-50 p-4">
                  <ShoppingBag className="h-10 w-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-gray-900">Cart is empty</h3>
                  <p className="mt-1 font-sans text-sm text-gray-500 max-w-xs">
                    Explore our high-quality catalog to add designer essentials to your order.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-900 px-6 py-2.5 font-sans text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              // Items List
              <div className="divide-y divide-gray-100" id="cart-items-list">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex py-4 first:pt-0 last:pb-0" id={`cart-item-${item.product.id}`}>
                    {/* Item Image */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover object-center"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="ml-4 flex flex-1 flex-col text-left">
                      <div>
                        <div className="flex justify-between text-sm font-semibold text-gray-900">
                          <h4 className="line-clamp-1 pr-4">{item.product.name}</h4>
                          <p className="font-mono ml-4">৳{(item.product.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <p className="mt-0.5 font-sans text-xs text-gray-400 font-medium">
                          {item.product.category}
                        </p>
                      </div>

                      {/* Quantity & Delete Actions */}
                      <div className="flex flex-1 items-end justify-between text-xs">
                        {/* Selector */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-1 py-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 rounded text-gray-500 hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-50"
                            aria-label="Decrease quantity"
                            id={`dec-qty-${item.product.id}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 font-mono text-center font-medium text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.inventory}
                            className="p-1 rounded text-gray-500 hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-50"
                            aria-label="Increase quantity"
                            id={`inc-qty-${item.product.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id)}
                          className="flex items-center space-x-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                          id={`remove-item-${item.product.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Calculations */}
          {cart.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-5 sm:px-6 space-y-4">
              
              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="flex space-x-2" id="promo-code-form">
                <input
                  type="text"
                  placeholder={appliedPromo ? `Promo: ${appliedPromo}` : "Promo code (WELCOME10, AURA20)"}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  disabled={!!appliedPromo}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  id="promo-input"
                />
                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 font-sans text-xs font-semibold text-red-600 hover:bg-red-100"
                    id="promo-remove-btn"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="rounded-lg bg-gray-900 px-4 py-2 font-sans text-xs font-semibold text-white hover:bg-gray-800"
                    id="promo-apply-btn"
                  >
                    Apply
                  </button>
                )}
              </form>

              {/* Status/Error Messaging */}
              {promoError && (
                <p className="text-[11px] font-medium text-red-500 text-left" id="promo-error">{promoError}</p>
              )}
              {promoSuccessMsg && (
                <p className="text-[11px] font-medium text-emerald-600 text-left" id="promo-success">{promoSuccessMsg}</p>
              )}

              {/* Detailed Breakdown */}
              <div className="space-y-1.5 font-sans text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-mono">৳{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center">
                      Discount ({appliedPromo})
                    </span>
                    <span className="font-mono">-৳{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className="font-sans text-xs uppercase font-semibold text-gray-800">
                    {subtotal >= freeShippingThreshold ? 'Free' : `৳${shippingSettings.shipping_fee.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-gray-200 my-2" />
                <div className="flex justify-between font-bold text-gray-900 text-base">
                  <span>Total Due</span>
                  <span className="font-mono">
                    ৳{(finalTotal + (subtotal >= freeShippingThreshold ? 0 : shippingSettings.shipping_fee)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={onProceedToCheckout}
                className="group flex w-full items-center justify-center space-x-2 rounded-xl bg-gray-900 py-3 font-sans text-sm font-semibold text-white shadow-md hover:bg-gray-800 transition-all active:scale-[0.98]"
                id="checkout-btn"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
