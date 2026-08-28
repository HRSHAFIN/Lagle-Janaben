import { useState, useEffect } from 'react';
import { Product, Order, Customer, Account, CartItem, ViewType, PromoCode, ShippingSettings, User, SelectedOptions } from './types';
import { cartItemKey, findCartItem } from './lib/cart';
import Navbar from './components/Navbar';
import CatalogView from './components/CatalogView';
import CartDrawer from './components/CartDrawer';
import CheckoutView from './components/CheckoutView';
import AdminDashboard from './components/AdminDashboard';
import ProductDetailView from './components/ProductDetailView';
import Login from './components/Login';
import Register from './components/Register';
import Logo from './components/Logo';
import MyOrdersView from './components/MyOrdersView';
import { Mail, Phone, MapPin, Heart, ShieldCheck } from 'lucide-react';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from './lib/api/products';
import { fetchOrders, fetchMyOrders, updateOrderStatus, cancelOwnOrder, deleteOrder, placeCodOrder, createGatewayOrder, initiateSslcommerzPayment, getOrderById } from './lib/api/orders';
import { SslcommerzDeliveryDetails } from './lib/api/orders';
import { fetchCustomers, updateCustomerStatus } from './lib/api/customers';
import { fetchAccounts } from './lib/api/accounts';
import { fetchPromoCodes, createPromoCode, deletePromoCode, validatePromo } from './lib/api/promoCodes';
import { fetchShippingSettings, updateShippingSettings } from './lib/api/shippingSettings';
import {
  getCurrentUser,
  signIn,
  signUp,
  verifySignUpCode,
  resendSignUpCode,
  syncMyProfile,
  signInWithGoogle,
  signOut,
} from './lib/api/auth';
import { sendInvoiceEmail, sendCancellationEmail } from './lib/api/notifications';
import { computeSubtotal } from './lib/pricing';

interface AppliedPromo {
  code: string;
  discount: number;
}

export default function App() {
  // --------------------------------------------------------
  // STOREFRONT DATA (InsForge-backed)
  // --------------------------------------------------------
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>({ shipping_fee: 10, free_shipping_threshold: 150 });

  // Cart is genuinely local, pre-checkout state — the only thing still kept in localStorage.
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const local = localStorage.getItem('aura_cart');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  const [currentView, setCurrentView] = useState<ViewType>('catalog');
  const [cartOpen, setCartOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState('');
  const [sslCompletedOrder, setSslCompletedOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  // --------------------------------------------------------
  // INITIAL STOREFRONT DATA
  // --------------------------------------------------------
  useEffect(() => {
    Promise.all([fetchProducts(), fetchShippingSettings()])
      .then(([p, s]) => {
        setProducts(p);
        setShippingSettings(s);
      })
      .catch((err) => console.warn('Could not load storefront data:', err));
  }, []);

  // --------------------------------------------------------
  // AUTH SESSION RESTORE
  // --------------------------------------------------------
  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        // Covers Google OAuth returns and any session where the directory
        // row hasn't been synced yet — cheap upsert, safe to run every load.
        if (user) syncMyProfile(user.name, user.email).catch(() => {});
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  // --------------------------------------------------------
  // ADMIN-ONLY DATA (orders, customers, promo codes) — loaded once the
  // signed-in user is confirmed as admin; RLS would deny it to anyone else.
  // --------------------------------------------------------
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchOrders(), fetchCustomers(), fetchPromoCodes(), fetchAccounts()])
      .then(([o, c, p, a]) => {
        setOrders(o);
        setCustomers(c);
        setPromoCodes(p);
        setAccounts(a);
      })
      .catch((err) => console.warn('Could not load admin data:', err));
  }, [isAdmin]);

  // --------------------------------------------------------
  // AUTH CONTROLLERS
  // --------------------------------------------------------
  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    const { user, error } = await signIn(email, password);
    if (error) return error;
    if (user) syncMyProfile(user.name, user.email).catch(() => {});
    setCurrentUser(user);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return null;
  };

  const handleRegister = async (data: { name: string; email: string; phone: string; password: string }) => {
    const result = await signUp(data.name, data.email, data.password);
    if (result.error) return { error: result.error, requiresVerification: false };
    if (result.requiresVerification) return { error: null, requiresVerification: true };
    if (result.user) {
      syncMyProfile(result.user.name, result.user.email, data.phone || null).catch(() => {});
      setCurrentUser(result.user);
      setCurrentView('catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return { error: null, requiresVerification: false };
  };

  const handleVerifyCode = async (email: string, otp: string, phone: string): Promise<string | null> => {
    const { user, error } = await verifySignUpCode(email, otp);
    if (error) return error;
    if (user) syncMyProfile(user.name, user.email, phone || null).catch(() => {});
    setCurrentUser(user);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return null;
  };

  const handleResendCode = async (email: string) => {
    await resendSignUpCode(email);
  };

  const handleGoogleLogin = () => {
    signInWithGoogle(window.location.origin + window.location.pathname).catch((err) => {
      console.error('Google sign-in failed:', err);
    });
  };

  const handleLogout = async () => {
    await signOut().catch(() => {});
    setCurrentUser(null);
    setCurrentView('catalog');
  };

  // --------------------------------------------------------
  // SSLCommerz return-URL handling (the tab the user lands back in after
  // clicking "Go Back to Store" on the gateway callback page). The order
  // itself was already created and fulfilled server-side exactly once —
  // this only reads status and reflects it locally.
  // --------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sslStatus = params.get('ssl_status');
    const tranId = params.get('tran_id');

    if (sslStatus === 'success' && tranId) {
      getOrderById(tranId)
        .then((order) => {
          if (!order) return;
          setSslCompletedOrder(order);
          setCurrentView('checkout');
          setCart([]);
          setAppliedPromo(null);
          if (order.paymentStatus === 'paid') {
            setProducts((prev) =>
              prev.map((p) => {
                const bought = order.items.find((item) => item.productId === p.id);
                if (!bought) return p;
                const nextStock = Math.max(p.inventory - bought.quantity, 0);
                return { ...p, inventory: nextStock, status: nextStock === 0 ? 'Out of Stock' : p.status };
              })
            );
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => console.error('Error fetching SSLCommerz completed order:', err));
    } else if ((sslStatus === 'fail' || sslStatus === 'cancel') && tranId) {
      setCurrentView('checkout');
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`SSLCommerz payment was ${sslStatus === 'fail' ? 'failed' : 'cancelled'}. Please try again.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist cart only
  useEffect(() => {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
  }, [cart]);

  // Keep the applied promo's discount accurate as the cart changes (min-order
  // thresholds, etc.) — the order RPCs remain the actual authority at checkout.
  useEffect(() => {
    if (!appliedPromo) return;
    const subtotal = computeSubtotal(cart);
    validatePromo(appliedPromo.code, subtotal)
      .then((result) => {
        if (!result.valid) {
          setAppliedPromo(null);
          setPromoError(result.error || 'This promo code no longer applies to your order.');
        } else if (result.discount !== appliedPromo.discount) {
          setAppliedPromo({ code: result.code || appliedPromo.code, discount: result.discount });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  // --------------------------------------------------------
  // SHOPPING CART CONTROLLERS
  // --------------------------------------------------------
  const handleAddToCart = (product: Product, options: SelectedOptions = {}) => {
    const existing = findCartItem(cart, product.id, options);
    const currentQtyInCart = existing ? existing.quantity : 0;
    if (currentQtyInCart >= product.inventory) {
      alert(`Cannot add more. We only have ${product.inventory} units of ${product.name} in stock.`);
      return;
    }

    if (existing) {
      const key = cartItemKey(existing);
      setCart(cart.map((item) => (cartItemKey(item) === key ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { product, quantity: 1, ...options }]);
    }
    setCartOpen(true);
  };

  const handleAddToCartWithQty = (product: Product, quantity: number, options: SelectedOptions = {}) => {
    const existing = findCartItem(cart, product.id, options);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + quantity > product.inventory) {
      alert(`Cannot add more. We only have ${product.inventory} units of ${product.name} in stock, and you already have ${currentQtyInCart} in your cart.`);
      return;
    }

    if (existing) {
      const key = cartItemKey(existing);
      setCart(cart.map((item) => (cartItemKey(item) === key ? { ...item, quantity: item.quantity + quantity } : item)));
    } else {
      setCart([...cart, { product, quantity, ...options }]);
    }
    setCartOpen(true);
  };

  const handleInstantCheckout = (product: Product, quantity: number, options: SelectedOptions = {}) => {
    if (quantity > product.inventory) {
      alert(`Cannot purchase this amount. We only have ${product.inventory} units in stock.`);
      return;
    }

    const existing = findCartItem(cart, product.id, options);
    if (existing) {
      const key = cartItemKey(existing);
      setCart(cart.map((item) => (cartItemKey(item) === key ? { ...item, quantity } : item)));
    } else {
      setCart([...cart, { product, quantity, ...options }]);
    }

    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(key);
      return;
    }
    const item = cart.find((i) => cartItemKey(i) === key);
    if (item && quantity > item.product.inventory) {
      alert(`Sorry, only ${item.product.inventory} units are available.`);
      return;
    }
    setCart(cart.map((i) => (cartItemKey(i) === key ? { ...i, quantity } : i)));
  };

  const handleRemoveItem = (key: string) => {
    setCart(cart.filter((item) => cartItemKey(item) !== key));
  };

  const handleApplyPromo = async (code: string) => {
    setPromoError('');
    try {
      const result = await validatePromo(code, computeSubtotal(cart));
      if (!result.valid) {
        setPromoError(result.error || 'Invalid promo code');
        return;
      }
      setAppliedPromo({ code: result.code || code.trim().toUpperCase(), discount: result.discount });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Could not validate this promo code.');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  // --------------------------------------------------------
  // CHECKOUT — server-side, atomic, price-authoritative
  // --------------------------------------------------------
  const handlePlaceCodOrder = async (data: { customerName: string; customerEmail: string; shippingAddress: string }): Promise<Order> => {
    const order = await placeCodOrder(cart, data.customerName, data.customerEmail, data.shippingAddress, appliedPromo?.code ?? null);
    applyLocalFulfillment(order);
    sendInvoiceEmail(order).catch((err) => console.warn('Could not send invoice email:', err));
    return order;
  };

  const handleInitiateGatewayOrder = async (data: {
    customerName: string;
    customerEmail: string;
    shippingAddress: string;
    delivery: SslcommerzDeliveryDetails;
  }): Promise<{ order: Order; redirectUrl: string }> => {
    const order = await createGatewayOrder(cart, data.customerName, data.customerEmail, data.shippingAddress, appliedPromo?.code ?? null);
    const redirectUrl = await initiateSslcommerzPayment(order.id, data.delivery);
    return { order, redirectUrl };
  };

  const handleGetOrderStatus = async (orderId: string): Promise<Order | null> => {
    const order = await getOrderById(orderId);
    if (order && order.paymentStatus === 'paid') {
      applyLocalFulfillment(order);
    }
    return order;
  };

  // Reflect a fulfilled order's effects (inventory, admin order log) in local
  // state without a full refetch — the server rows are already authoritative.
  const applyLocalFulfillment = (order: Order) => {
    setProducts((prev) =>
      prev.map((p) => {
        const bought = order.items.find((item) => item.productId === p.id);
        if (!bought) return p;
        const nextStock = Math.max(p.inventory - bought.quantity, 0);
        return { ...p, inventory: nextStock, status: nextStock === 0 ? 'Out of Stock' : p.status };
      })
    );
    if (isAdmin) {
      setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev]));
    }
  };

  // --------------------------------------------------------
  // MY ORDERS (account order history + self-service cancellation)
  // --------------------------------------------------------
  useEffect(() => {
    if (currentView !== 'my-orders' || !currentUser) return;
    setMyOrdersLoading(true);
    fetchMyOrders(currentUser.id)
      .then(setMyOrders)
      .catch((err) => console.warn('Could not load your orders:', err))
      .finally(() => setMyOrdersLoading(false));
  }, [currentView, currentUser]);

  const handleCancelOrder = async (orderId: string) => {
    const cancelled = await cancelOwnOrder(orderId);
    setMyOrders((prev) => prev.map((o) => (o.id === orderId ? cancelled : o)));
    // The server already restored inventory/CRM counters — reflect the
    // inventory side locally so the catalog doesn't look stale.
    setProducts((prev) =>
      prev.map((p) => {
        const returned = cancelled.items.find((item) => item.productId === p.id);
        if (!returned) return p;
        return { ...p, inventory: p.inventory + returned.quantity, status: 'Active' };
      })
    );
    if (isAdmin) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? cancelled : o)));
    }
    sendCancellationEmail(cancelled).catch((err) => console.warn('Could not send cancellation email:', err));
  };

  // --------------------------------------------------------
  // ADMIN BOARD CONTROLLERS (CRUD)
  // --------------------------------------------------------
  const handleAddProduct = async (newProdData: Omit<Product, 'id'>) => {
    const created = await createProduct(newProdData);
    setProducts((prev) => [created, ...prev]);
  };

  const handleUpdateProduct = async (updatedProd: Product) => {
    const saved = await updateProduct(updatedProd);
    setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    const previous = orders.find((o) => o.id === orderId);
    await updateOrderStatus(orderId, status);
    const updated = { ...previous, status } as Order;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    if (status === 'Cancelled' && previous && previous.status !== 'Cancelled') {
      sendCancellationEmail(updated).catch((err) => console.warn('Could not send cancellation email:', err));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrder(orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleUpdateCustomerStatus = async (customerId: string, status: Customer['status']) => {
    await updateCustomerStatus(customerId, status);
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, status } : c)));
  };

  const handleAddPromoCode = async (promo: Omit<PromoCode, 'id' | 'used_count' | 'created_at'>) => {
    const created = await createPromoCode(promo);
    setPromoCodes((prev) => [created, ...prev]);
  };

  const handleDeletePromoCode = async (id: string) => {
    await deletePromoCode(id);
    setPromoCodes((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateShippingSettings = async (settings: ShippingSettings) => {
    await updateShippingSettings(settings);
    setShippingSettings(settings);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-white text-gray-800 selection:bg-gray-900 selection:text-white flex flex-col justify-between">
      {/* Dynamic Header */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => {
          setCurrentView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        cartCount={totalCartItems}
        onCartClick={() => setCartOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Screen Router */}
      <main className="flex-grow">
        {currentView === 'catalog' && (
          <CatalogView
            products={products}
            onAddToCart={handleAddToCart}
            onSelectProduct={(p) => {
              setSelectedProduct(p);
              setCurrentView('product-detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'product-detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            allProducts={products}
            onAddToCartWithQty={handleAddToCartWithQty}
            onInstantCheckout={handleInstantCheckout}
            onBackToCatalog={() => setCurrentView('catalog')}
            onSelectProduct={(p) => {
              setSelectedProduct(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutView
            cart={cart}
            appliedPromo={appliedPromo}
            shippingSettings={shippingSettings}
            isAdmin={isAdmin}
            onPlaceCodOrder={handlePlaceCodOrder}
            onInitiateGatewayOrder={handleInitiateGatewayOrder}
            onGetOrderStatus={handleGetOrderStatus}
            onBackToCatalog={() => setCurrentView('catalog')}
            onClearCart={() => setCart([])}
            onNavigateAdminOrders={() => setCurrentView('admin')}
            initialOrder={sslCompletedOrder}
          />
        )}

        {currentView === 'login' && !authLoading && (
          <Login
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onNavigateRegister={() => setCurrentView('register')}
            onBackToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'register' && !authLoading && (
          <Register
            onRegister={handleRegister}
            onVerifyCode={handleVerifyCode}
            onResendCode={handleResendCode}
            onGoogleLogin={handleGoogleLogin}
            onNavigateLogin={() => setCurrentView('login')}
            onBackToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'my-orders' && currentUser && (
          <MyOrdersView
            orders={myOrders}
            loading={myOrdersLoading}
            onCancelOrder={handleCancelOrder}
            onBackToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'admin' && isAdmin && (
          <AdminDashboard
            products={products}
            orders={orders}
            customers={customers}
            accounts={accounts}
            promoCodes={promoCodes}
            shippingSettings={shippingSettings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onUpdateCustomerStatus={handleUpdateCustomerStatus}
            onAddPromoCode={handleAddPromoCode}
            onDeletePromoCode={handleDeletePromoCode}
            onUpdateShippingSettings={handleUpdateShippingSettings}
          />
        )}
      </main>

      {/* Persistent Footer */}
      <footer className="border-t border-gray-100 bg-white pt-10 sm:pt-16 pb-8 sm:pb-12 font-sans mt-12 sm:mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-left">
            {/* Column 1: Brand & Logo */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
                  <Logo className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="font-sans text-lg font-extrabold tracking-tight leading-none">
                    <span className="text-[#1E2D44]">Lagle</span>{" "}
                    <span className="text-[#B88E4C]">Janaben</span>
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                We design and curate premium personalized gifts and custom keepsakes that build bridges, express deep emotions, and touch souls.
              </p>
              <div className="flex items-center space-x-2 text-xs text-[#B88E4C] font-semibold">
                <Heart className="h-4 w-4 fill-[#B88E4C] text-[#B88E4C]" />
                <span>Handcrafted with love in Bangladesh</span>
              </div>
            </div>

            {/* Column 2: Shop Categories */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Shop Categories</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => { setCurrentView('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-gray-500 hover:text-[#B88E4C] transition-colors text-left">
                    All Products
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-gray-500 hover:text-[#B88E4C] transition-colors text-left">
                    Premium Desk Sets
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-gray-500 hover:text-[#B88E4C] transition-colors text-left">
                    Leather Accessories
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-gray-500 hover:text-[#B88E4C] transition-colors text-left">
                    Custom Journals & Organizers
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Care */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Customer Care</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#faq" className="text-gray-500 hover:text-[#B88E4C] transition-colors block">FAQs & Help</a>
                </li>
                <li>
                  <a href="#shipping" className="text-gray-500 hover:text-[#B88E4C] transition-colors block">Shipping & Delivery</a>
                </li>
                <li>
                  <a href="#returns" className="text-gray-500 hover:text-[#B88E4C] transition-colors block">Refunds & Return Policy</a>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">SSLCommerz Secured Checkouts</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Get in Touch</h4>
              <div className="flex items-start space-x-2.5 text-sm text-gray-500">
                <MapPin className="h-4 w-4 text-[#B88E4C] mt-0.5 flex-shrink-0" />
                <span>Gulshan-2, Dhaka, Bangladesh</span>
              </div>
              <div className="flex items-center space-x-2.5 text-sm text-gray-500">
                <Mail className="h-4 w-4 text-[#B88E4C] flex-shrink-0" />
                <a href="mailto:support@laglejanaben.com" className="hover:text-[#B88E4C] transition-colors">support@laglejanaben.com</a>
              </div>
              <div className="flex items-center space-x-2.5 text-sm text-gray-500">
                <Phone className="h-4 w-4 text-[#B88E4C] flex-shrink-0" />
                <span>+880 1700-000000</span>
              </div>
              <div className="pt-2 flex items-center space-x-2 text-xs text-emerald-700 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>SSL Secured Transaction Network</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>
              © 2026 Lagle Janaben. All rights reserved. Registered in Bangladesh.
            </p>
            <div className="flex items-center space-x-4">
              <span className="hover:text-gray-600 transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-gray-600 transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Sliding Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setCurrentView('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        appliedPromo={appliedPromo}
        promoError={promoError}
        onApplyPromo={handleApplyPromo}
        onRemovePromo={handleRemovePromo}
        shippingSettings={shippingSettings}
      />
    </div>
  );
}
