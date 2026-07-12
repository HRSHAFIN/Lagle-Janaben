import { useState, useEffect } from 'react';
import { Product, Order, Customer, CartItem, ViewType, PromoCode, ShippingSettings, User } from './types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_ORDERS } from './data';
import Navbar from './components/Navbar';
import CatalogView from './components/CatalogView';
import CartDrawer from './components/CartDrawer';
import CheckoutView from './components/CheckoutView';
import AdminDashboard from './components/AdminDashboard';
import ProductDetailView from './components/ProductDetailView';
import Login from './components/Login';
import Register from './components/Register';
import Logo from './components/Logo';
import { Mail, Phone, MapPin, Heart, ShieldCheck } from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  // --------------------------------------------------------
  // CENTRAL PERSISTENCE (PHP API BACKED STATE)
  // --------------------------------------------------------
  const [products, setProducts] = useState<Product[]>(() => {
    const local = localStorage.getItem('aura_products');
    return local ? JSON.parse(local) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const local = localStorage.getItem('aura_orders');
    return local ? JSON.parse(local) : INITIAL_ORDERS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const local = localStorage.getItem('aura_customers');
    return local ? JSON.parse(local) : INITIAL_CUSTOMERS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const local = localStorage.getItem('aura_cart');
    return local ? JSON.parse(local) : [];
  });

  const [currentView, setCurrentView] = useState<ViewType>('catalog');
  const [cartOpen, setCartOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState('');
  const [sslCompletedOrder, setSslCompletedOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>({ shipping_fee: 10, free_shipping_threshold: 150 });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --------------------------------------------------------
  // FETCH INITIAL DATA FROM PHP API
  // --------------------------------------------------------
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/products.php`).then(r => r.ok ? r.json() : Promise.resolve(null)),
      fetch(`${API_BASE}/orders.php`).then(r => r.ok ? r.json() : Promise.resolve(null)),
      fetch(`${API_BASE}/customers.php`).then(r => r.ok ? r.json() : Promise.resolve(null)),
      fetch(`${API_BASE}/promo_codes.php`).then(r => r.ok ? r.json() : Promise.resolve(null)),
      fetch(`${API_BASE}/shipping_settings.php`).then(r => r.ok ? r.json() : Promise.resolve(null)),
    ])
      .then(([apiProducts, apiOrders, apiCustomers, apiPromos, apiShipping]) => {
        if (apiProducts) setProducts(apiProducts);
        if (apiOrders) setOrders(apiOrders);
        if (apiCustomers) setCustomers(apiCustomers);
        if (apiPromos) setPromoCodes(apiPromos);
        if (apiShipping) setShippingSettings(apiShipping);
      })
      .catch(err => console.warn('Could not fetch from PHP API, using local data:', err));
  }, []);

  // --------------------------------------------------------
  // RESTORE AUTH SESSION
  // --------------------------------------------------------
  useEffect(() => {
    fetch(`${API_BASE}/auth.php?action=me`)
      .then(r => r.ok ? r.json() : Promise.resolve(null))
      .then(data => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(err => console.warn('Could not restore auth session:', err));
  }, []);

  // --------------------------------------------------------
  // AUTH CONTROLLERS
  // --------------------------------------------------------
  const handleLogin = async (identifier: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Could not sign in. Please try again.';
      setCurrentUser(data.user);
      setCurrentView('catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    } catch {
      return 'Connection failed. Please check your network and try again.';
    }
  };

  const handleRegister = async (formData: { name: string; email: string; phone: string; password: string }): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Could not create your account. Please try again.';
      setCurrentUser(data.user);
      setCurrentView('catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    } catch {
      return 'Connection failed. Please check your network and try again.';
    }
  };

  const handleGoogleLogin = async (credential: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Google sign-in failed. Please try again.';
      setCurrentUser(data.user);
      setCurrentView('catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    } catch {
      return 'Connection failed. Please check your network and try again.';
    }
  };

  const handleLogout = () => {
    fetch(`${API_BASE}/auth.php?action=logout`, { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
    setCurrentView('catalog');
  };

  // SSLCommerz payment callback detection & local state synchronization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sslStatus = params.get('ssl_status');
    const tranId = params.get('tran_id');

    if (sslStatus === 'success' && tranId) {
      console.log(`Successful SSLCommerz transaction detected: ${tranId}. Synchronizing state...`);
      
      fetch(`${API_BASE}/sslcommerz/order.php?tran_id=${tranId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Order details not found on server');
          return res.json();
        })
        .then((serverOrder: Order) => {
          // Check if this order has already been added to client state
          setOrders((prevOrders) => {
            const alreadyProcessed = prevOrders.some((o) => o.id === serverOrder.id);
            if (alreadyProcessed) return prevOrders;
            return [serverOrder, ...prevOrders];
          });

          // Decrement products inventory stock
          setProducts((prevProducts) =>
            prevProducts.map((p) => {
              const boughtItem = serverOrder.items.find((item) => item.productId === p.id);
              if (boughtItem) {
                const nextStock = Math.max(p.inventory - boughtItem.quantity, 0);
                return {
                  ...p,
                  inventory: nextStock,
                  status: nextStock === 0 ? 'Out of Stock' : p.status,
                };
              }
              return p;
            })
          );

          // Update customers list CRM metric
          setCustomers((prevCustomers) => {
            const match = prevCustomers.find(
              (c) => c.email.toLowerCase() === serverOrder.customerEmail.toLowerCase()
            );

            if (match) {
              return prevCustomers.map((c) =>
                c.email.toLowerCase() === serverOrder.customerEmail.toLowerCase()
                  ? {
                      ...c,
                      totalOrders: c.totalOrders + 1,
                      totalSpent: c.totalSpent + serverOrder.total,
                    }
                  : c
              );
            } else {
              const newCustID = `cust-${prevCustomers.length + 1}`;
              const newCust: Customer = {
                id: newCustID,
                name: serverOrder.customerName,
                email: serverOrder.customerEmail,
                joinDate: new Date().toISOString().split('T')[0],
                totalOrders: 1,
                totalSpent: serverOrder.total,
                status: 'Active',
              };
              return [...prevCustomers, newCust];
            }
          });

          // Purge shopping cart and promo code
          setCart([]);
          setAppliedPromo('');

          // Show the order receipt screen by setting view to checkout and storing order details
          setSslCompletedOrder(serverOrder);
          setCurrentView('checkout');

          // Clean up the URL query parameters so reloading doesn't execute synchronization again
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          console.error('Error fetching SSLCommerz completed order:', err);
        });
    } else if ((sslStatus === 'fail' || sslStatus === 'cancel') && tranId) {
      console.warn(`SSLCommerz payment failed or cancelled. Status: ${sslStatus}, Tran ID: ${tranId}`);
      setCurrentView('checkout');
      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`SSLCommerz payment was ${sslStatus === 'fail' ? 'failed' : 'cancelled'}. Please try again.`);
    }
  }, []);

  // Sync state to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('aura_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('aura_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('aura_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
  }, [cart]);

  // --------------------------------------------------------
  // SHOPPING CART CONTROLLERS
  // --------------------------------------------------------
  const handleAddToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    
    // Check stock limit
    const currentQtyInCart = existing ? existing.quantity : 0;
    if (currentQtyInCart >= product.inventory) {
      alert(`Cannot add more. We only have ${product.inventory} units of ${product.name} in stock.`);
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    // Auto-open drawer for premium feedback loop
    setCartOpen(true);
  };

  const handleAddToCartWithQty = (product: Product, quantity: number) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    
    if (currentQtyInCart + quantity > product.inventory) {
      alert(`Cannot add more. We only have ${product.inventory} units of ${product.name} in stock, and you already have ${currentQtyInCart} in your cart.`);
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity }]);
    }
    setCartOpen(true);
  };

  const handleInstantCheckout = (product: Product, quantity: number) => {
    if (quantity > product.inventory) {
      alert(`Cannot purchase this amount. We only have ${product.inventory} units in stock.`);
      return;
    }

    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: quantity }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity }]);
    }
    
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (prod && quantity > prod.inventory) {
      alert(`Sorry, only ${prod.inventory} units are available.`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleApplyPromo = (code: string) => {
    setAppliedPromo(code);
  };

  // --------------------------------------------------------
  // SECURE CHECKOUT FLOW (ORDER PLACEMENT)
  // --------------------------------------------------------
  const handlePlaceOrder = (checkoutData: {
    customerName: string;
    customerEmail: string;
    shippingAddress: string;
    paymentMethod: string;
  }): Order => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    
    // Compute discount from applied promo
    let discount = 0;
    if (appliedPromo) {
      const promo = promoCodes.find(p => p.code === appliedPromo && p.is_active);
      if (promo) {
        if (promo.type === 'percentage') {
          discount = subtotal * (promo.value / 100);
        } else {
          discount = promo.value;
        }
      }
    }

    const { free_shipping_threshold, shipping_fee } = shippingSettings;
    const isFreeShipping = subtotal >= free_shipping_threshold;
    const shippingFee = isFreeShipping ? 0 : shipping_fee;
    const total = subtotal - discount + shippingFee;

    // 1. Create a beautiful random Order ID
    const randomID = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: randomID,
      customerName: checkoutData.customerName,
      customerEmail: checkoutData.customerEmail,
      shippingAddress: checkoutData.shippingAddress,
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
      })),
      subtotal,
      discount,
      total,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      paymentMethod: checkoutData.paymentMethod,
    };

    // 2. Decrement inventory stock on products
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const boughtItem = cart.find((item) => item.product.id === p.id);
        if (boughtItem) {
          const nextStock = Math.max(p.inventory - boughtItem.quantity, 0);
          return {
            ...p,
            inventory: nextStock,
            status: nextStock === 0 ? 'Out of Stock' : p.status,
          };
        }
        return p;
      })
    );

    // 3. Update customer CRM metrics or create a new one
    setCustomers((prevCustomers) => {
      const match = prevCustomers.find(
        (c) => c.email.toLowerCase() === checkoutData.customerEmail.toLowerCase()
      );

      if (match) {
        return prevCustomers.map((c) =>
          c.email.toLowerCase() === checkoutData.customerEmail.toLowerCase()
            ? {
                ...c,
                totalOrders: c.totalOrders + 1,
                totalSpent: c.totalSpent + total,
              }
            : c
        );
      } else {
        const newCustID = `cust-${prevCustomers.length + 1}`;
        const newCust: Customer = {
          id: newCustID,
          name: checkoutData.customerName,
          email: checkoutData.customerEmail,
          joinDate: new Date().toISOString().split('T')[0],
          totalOrders: 1,
          totalSpent: total,
          status: 'Active',
        };
        return [...prevCustomers, newCust];
      }
    });

    // 4. Save order to main orders feed
    setOrders((prevOrders) => [newOrder, ...prevOrders]);

    // 5. Persist order to PHP API
    fetch(`${API_BASE}/orders.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newOrder,
        items: newOrder.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
      }),
    }).catch(err => console.warn('Failed to persist order to API:', err));

    // 6. Purge shopping cart and promo code
    setCart([]);
    setAppliedPromo('');

    return newOrder;
  };

  // --------------------------------------------------------
  // ADMIN BOARD CONTROLLERS (CRUD LOGIC)
  // --------------------------------------------------------
  const handleAddProduct = (newProdData: Omit<Product, 'id'>) => {
    const nextId = `prod-${products.length + 1}`;
    const product: Product = {
      ...newProdData,
      id: nextId,
    };
    setProducts([...products, product]);
    fetch(`${API_BASE}/products.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    }).catch(err => console.warn('Failed to sync product to API:', err));
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts(products.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    fetch(`${API_BASE}/products.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProd),
    }).catch(err => console.warn('Failed to sync product update to API:', err));
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter((p) => p.id !== productId));
    fetch(`${API_BASE}/products.php?id=${productId}`, {
      method: 'DELETE',
    }).catch(err => console.warn('Failed to sync product delete to API:', err));
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    fetch(`${API_BASE}/orders.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    }).catch(err => console.warn('Failed to sync order status to API:', err));
  };

  const handleUpdateCustomerStatus = (customerId: string, status: Customer['status']) => {
    setCustomers(
      customers.map((c) => (c.id === customerId ? { ...c, status } : c))
    );
    fetch(`${API_BASE}/customers.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: customerId, status }),
    }).catch(err => console.warn('Failed to sync customer status to API:', err));
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
            promoCodes={promoCodes}
            shippingSettings={shippingSettings}
            onPlaceOrder={handlePlaceOrder}
            onBackToCatalog={() => setCurrentView('catalog')}
            onClearCart={() => setCart([])}
            initialOrder={sslCompletedOrder}
          />
        )}

        {currentView === 'login' && (
          <Login
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onNavigateRegister={() => setCurrentView('register')}
            onBackToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'register' && (
          <Register
            onRegister={handleRegister}
            onGoogleLogin={handleGoogleLogin}
            onNavigateLogin={() => setCurrentView('login')}
            onBackToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            products={products}
            orders={orders}
            customers={customers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateCustomerStatus={handleUpdateCustomerStatus}
            onShippingSettingsChange={setShippingSettings}
            onPromoCodesChange={setPromoCodes}
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
              <span className="hover:text-gray-600 transition-colors cursor-pointer">Terms of Service</span>git 
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
        onApplyPromo={handleApplyPromo}
        promoCodes={promoCodes}
        shippingSettings={shippingSettings}
      />
    </div>
  );
}
