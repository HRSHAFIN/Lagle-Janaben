import React, { useState } from 'react';
import { 
  TrendingUp, ShoppingCart, Users, Package, Search, Plus, 
  Edit2, Trash2, X, Check, Eye, ChevronRight, CheckCircle2, 
  Clock, Ship, Ban, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Product, Order, Customer, AdminTabType } from '../types';
import { CATEGORIES } from '../data';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onUpdateCustomerStatus: (customerId: string, status: Customer['status']) => void;
}

export default function AdminDashboard({
  products,
  orders,
  customers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onUpdateCustomerStatus,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');

  // Products tab states
  const [productSearch, setProductSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Technology',
    inventory: '',
    status: 'Active' as Product['status'],
    image: '',
    images: [] as string[],
  });

  // Orders tab states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Customers tab states
  const [customerSearch, setCustomerSearch] = useState('');

  // --------------------------------------------------------
  // METRICS & ANALYTICS COMPUTATION
  // --------------------------------------------------------
  const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / nonCancelledOrders.length || 0 : 0;
  
  // Calculate category revenue for the SVG chart
  const categoryRevenue: { [key: string]: number } = {};
  nonCancelledOrders.forEach(order => {
    order.items.forEach(item => {
      // Find item category to be precise
      const prod = products.find(p => p.id === item.productId);
      const cat = prod ? prod.category : 'Technology';
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (item.price * item.quantity);
    });
  });

  const chartData = Object.keys(categoryRevenue).map(cat => ({
    category: cat,
    revenue: categoryRevenue[cat],
  }));

  // Ensure all standard categories have a bar (except 'All')
  CATEGORIES.filter(c => c !== 'All').forEach(cat => {
    if (!categoryRevenue[cat]) {
      chartData.push({ category: cat, revenue: 0 });
    }
  });

  const maxRevenueInChart = Math.max(...chartData.map(d => d.revenue), 100);

  // --------------------------------------------------------
  // CRUD HANDLERS
  // --------------------------------------------------------
  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.inventory) {
      alert('Please fill out all required fields.');
      return;
    }

    // Assign dynamic image corresponding to category if none is provided
    let finalImage = newProduct.image.trim();
    if (!finalImage) {
      if (newProduct.category === 'Technology') {
        finalImage = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
      } else if (newProduct.category === 'Accessories') {
        finalImage = 'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?auto=format&fit=crop&w=600&q=80';
      } else if (newProduct.category === 'Lifestyle') {
        finalImage = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80';
      } else {
        finalImage = 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80';
      }
    }

    onAddProduct({
      name: newProduct.name,
      description: newProduct.description || 'A brand new designer offering to complete your curated space.',
      price: parseFloat(newProduct.price),
      category: newProduct.category,
      inventory: parseInt(newProduct.inventory),
      status: newProduct.status,
      image: finalImage,
      images: newProduct.images.filter(url => url.trim() !== ''),
      rating: 5.0,
      featured: false,
    });

    // Reset Form
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: 'Technology',
      inventory: '',
      status: 'Active',
      image: '',
      images: [],
    });
    setIsAddModalOpen(false);
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="admin-panel-container">
      {/* Admin Dashboard Page Title */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between text-left gap-4">
        <div>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Store Management
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Monitor shop performance, manage product stock, update order statuses, and review customers.
          </p>
        </div>
        
        {/* Dynamic Sync Status Badge */}
        <div className="flex items-center space-x-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>REAL-TIME ENGINE ONLINE</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side Dashboard Tabs */}
        <nav className="flex lg:flex-col lg:w-64 gap-1.5 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 pr-0 lg:pr-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2.5 rounded-xl px-4 py-3 font-sans text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            id="tab-btn-overview"
          >
            <TrendingUp className="h-4.5 w-4.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center space-x-2.5 rounded-xl px-4 py-3 font-sans text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            id="tab-btn-products"
          >
            <Package className="h-4.5 w-4.5" />
            <span>Products</span>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2.5 rounded-xl px-4 py-3 font-sans text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            id="tab-btn-orders"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            <span>Orders</span>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center space-x-2.5 rounded-xl px-4 py-3 font-sans text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            id="tab-btn-customers"
          >
            <Users className="h-4.5 w-4.5" />
            <span>Customers</span>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
              {customers.length}
            </span>
          </button>
        </nav>

        {/* Right Side: Active Content Pane */}
        <div className="flex-1 min-w-0">
          
          {/* ======================================================== */}
          {/* TAB: OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-150" id="overview-pane">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Sales Revenue */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Total Revenue</span>
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-mono text-2xl font-bold text-gray-900">৳{totalRevenue.toFixed(2)}</h3>
                    <p className="mt-1 font-sans text-xs text-gray-400 font-medium">From non-cancelled sales</p>
                  </div>
                </div>

                {/* Total Orders Volume */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Total Orders</span>
                    <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                      <ShoppingCart className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-mono text-2xl font-bold text-gray-900">{totalOrdersCount}</h3>
                    <p className="mt-1 font-sans text-xs text-gray-400 font-medium">All orders in log</p>
                  </div>
                </div>

                {/* Average Basket Value */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Avg. Order Value</span>
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-mono text-2xl font-bold text-gray-900">৳{avgOrderValue.toFixed(2)}</h3>
                    <p className="mt-1 font-sans text-xs text-gray-400 font-medium">Average purchase sum</p>
                  </div>
                </div>

                {/* Products Count */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Catalog Size</span>
                    <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                      <Package className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-mono text-2xl font-bold text-gray-900">{products.length}</h3>
                    <p className="mt-1 font-sans text-xs text-gray-400 font-medium">Additions in repository</p>
                  </div>
                </div>
              </div>

              {/* Chart & Recent Activity Grid */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* SVG Revenue Chart */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-left lg:col-span-7">
                  <h3 className="font-sans text-base font-bold text-gray-900">Revenue by Category</h3>
                  <p className="font-sans text-xs text-gray-400 mb-6">Aggregate totals of items sold (৳)</p>

                  <div className="flex items-end justify-between h-56 pt-4 px-2 bg-gray-50/50 rounded-xl border border-gray-100/50">
                    {chartData.map((data, idx) => {
                      const barHeightPercent = Math.max((data.revenue / maxRevenueInChart) * 100, 3);
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group">
                          {/* Tooltip value */}
                          <div className="relative mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-0.5 font-mono text-[10px] font-medium text-white shadow-lg whitespace-nowrap">
                              ৳{data.revenue.toFixed(2)}
                            </span>
                          </div>
                          {/* Dynamic Bar */}
                          <div 
                            style={{ height: `${barHeightPercent}%` }} 
                            className="w-8 rounded-t bg-gray-900 hover:bg-gray-700 transition-all duration-500 shadow-sm"
                          />
                          <span className="mt-2 font-sans text-[10px] font-medium text-gray-500 truncate max-w-[65px] px-0.5">
                            {data.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activities Feed */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-left lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans text-base font-bold text-gray-900">Recent Sales Log</h3>
                    <p className="font-sans text-xs text-gray-400 mb-4">Latest transactions processed</p>

                    <div className="space-y-4">
                      {orders.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex items-center justify-between text-sm" id={`recent-${order.id}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`rounded-full p-2 ${
                              order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                              order.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-sans font-semibold text-gray-900">{order.customerName}</p>
                              <p className="font-mono text-xs text-gray-400">{order.id} • {order.items.length} item(s)</p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-gray-900">৳{order.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="mt-6 flex w-full items-center justify-center space-x-1 rounded-lg border border-gray-100 bg-gray-50/50 py-2 font-sans text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <span>View all orders</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: PRODUCTS */}
          {/* ======================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-150 text-left" id="products-pane">
              {/* Product Header / Search Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Search by product name..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-10 text-sm focus:border-gray-900 focus:outline-none"
                    id="product-search-input"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center justify-center space-x-1.5 self-start sm:self-auto rounded-lg bg-gray-900 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-gray-800"
                  id="open-add-product-btn"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Products Table Wrapper */}
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50/75">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Product Details</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Category</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Price</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Stock Level</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Status</th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {products
                      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50/50" id={`admin-row-${product.id}`}>
                          {/* Image & Title */}
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center">
                              <img
                                src={product.image}
                                alt={product.name}
                                referrerPolicy="no-referrer"
                                className="h-10 w-10 rounded-lg object-cover border border-gray-100 bg-gray-50"
                              />
                              <div className="ml-4 max-w-[160px]">
                                <p className="font-sans font-semibold text-gray-900 truncate">{product.name}</p>
                                <p className="font-mono text-xs text-gray-400">ID: {product.id}</p>
                              </div>
                            </div>
                          </td>
                          {/* Category */}
                          <td className="whitespace-nowrap px-6 py-4 font-sans text-gray-600">{product.category}</td>
                          {/* Price */}
                          <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-gray-900">৳{product.price.toFixed(2)}</td>
                          {/* Stock level */}
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`font-mono font-medium ${product.inventory === 0 ? 'text-red-500 font-bold' : 'text-gray-900'}`}>
                              {product.inventory} units
                            </span>
                          </td>
                          {/* Status Badge */}
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold ${
                              product.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                              product.status === 'Draft' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700'
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          {/* CRUD Actions column */}
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setEditingProduct(product)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                                title="Edit Product"
                                id={`edit-prod-${product.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                                    onDeleteProduct(product.id);
                                  }
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete Product"
                                id={`delete-prod-${product.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: ORDERS */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in duration-150 text-left" id="orders-pane">
              {/* Search / Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Search orders by customer..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-10 text-sm focus:border-gray-900 focus:outline-none"
                    id="order-search-input"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter Status:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800"
                    id="order-status-filter"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Orders Table Container */}
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50/75">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Order ID</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Customer Details</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Date</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Order Total</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Change Status</th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {orders
                      .filter((o) => {
                        const matchesSearch = o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) || o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase());
                        const matchesStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50" id={`order-row-${order.id}`}>
                          {/* Order ID */}
                          <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-gray-900">
                            {order.id}
                          </td>
                          {/* Customer */}
                          <td className="whitespace-nowrap px-6 py-4">
                            <div>
                              <p className="font-sans font-semibold text-gray-900">{order.customerName}</p>
                              <p className="font-sans text-xs text-gray-400">{order.customerEmail}</p>
                            </div>
                          </td>
                          {/* Date */}
                          <td className="whitespace-nowrap px-6 py-4 font-sans text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          {/* Total */}
                          <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-gray-900">
                            ৳{order.total.toFixed(2)}
                          </td>
                          {/* Status changer Dropdown */}
                          <td className="whitespace-nowrap px-6 py-4">
                            <select
                              value={order.status}
                              onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)}
                              className={`rounded px-2.5 py-1 text-xs font-semibold focus:outline-none ${
                                order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                order.status === 'Processing' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              } border`}
                              id={`status-dropdown-${order.id}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          {/* View details action */}
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedOrderDetail(order)}
                              className="flex items-center space-x-1 font-sans text-xs font-semibold text-gray-900 hover:text-gray-700 bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1.5 rounded-lg transition-colors"
                              id={`view-order-${order.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: CUSTOMERS */}
          {/* ======================================================== */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-in fade-in duration-150 text-left" id="customers-pane">
              {/* Search Customers */}
              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="Search customers by name/email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-10 text-sm focus:border-gray-900 focus:outline-none"
                  id="customer-search-input"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>

              {/* Customers Table Container */}
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50/75">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Customer Name</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Email Address</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Join Date</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Total Orders</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Accumulated Expenditures</th>
                      <th scope="col" className="px-6 py-3 font-sans font-semibold text-gray-500 uppercase tracking-wider text-left text-xs">Log Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.email.toLowerCase().includes(customerSearch.toLowerCase()))
                      .map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50/50" id={`cust-row-${customer.id}`}>
                          {/* Name */}
                          <td className="whitespace-nowrap px-6 py-4 font-sans font-semibold text-gray-900">
                            {customer.name}
                          </td>
                          {/* Email */}
                          <td className="whitespace-nowrap px-6 py-4 font-sans text-gray-600">
                            {customer.email}
                          </td>
                          {/* Join Date */}
                          <td className="whitespace-nowrap px-6 py-4 font-sans text-gray-500">
                            {new Date(customer.joinDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          {/* Orders Counter */}
                          <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-gray-900">
                            {customer.totalOrders} purchases
                          </td>
                          {/* Accumulated Expenditures */}
                          <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-gray-900">
                            ৳{customer.totalSpent.toFixed(2)}
                          </td>
                          {/* Status */}
                          <td className="whitespace-nowrap px-6 py-4">
                            <button
                              onClick={() => onUpdateCustomerStatus(customer.id, customer.status === 'Active' ? 'Inactive' : 'Active')}
                              className={`rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold ${
                                customer.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title="Toggle Active status"
                            >
                              {customer.status}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* DIALOG: ADD PRODUCT MODAL */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" id="add-product-modal">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl p-6 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="font-sans text-lg font-bold text-gray-900">Add New Product</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Vanguard Leather Messenger"
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Detail the materials, design, and longevity..."
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Price (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="99.00"
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Inventory *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={newProduct.inventory}
                    onChange={(e) => setNewProduct({ ...newProduct, inventory: e.target.value })}
                    placeholder="25"
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none bg-white"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Publish Status</label>
                  <select
                    value={newProduct.status}
                    onChange={(e) => setNewProduct({ ...newProduct, status: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Custom Image URL (Optional)</label>
                <input
                  type="url"
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>

              {/* Dynamic Gallery Image Input List */}
              <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Gallery Images</label>
                  <button
                    type="button"
                    onClick={() => setNewProduct({ ...newProduct, images: [...(newProduct.images || []), ''] })}
                    className="text-[10px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 uppercase tracking-wider"
                  >
                    + Add Image URL
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(newProduct.images || []).map((imgUrl, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={imgUrl}
                        onChange={(e) => {
                          const updatedImages = [...newProduct.images];
                          updatedImages[index] = e.target.value;
                          setNewProduct({ ...newProduct, images: updatedImages });
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 rounded-lg border border-gray-200 py-1.5 px-3 text-xs focus:border-gray-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedImages = newProduct.images.filter((_, i) => i !== index);
                          setNewProduct({ ...newProduct, images: updatedImages });
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(newProduct.images || []).length === 0 && (
                    <p className="text-[11px] text-gray-400 italic text-center py-1">No additional gallery images added yet.</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 rounded-xl border border-gray-200 py-2.5 font-sans text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-gray-900 py-2.5 font-sans text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: EDIT PRODUCT MODAL */}
      {/* ======================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" id="edit-product-modal">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl p-6 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="font-sans text-lg font-bold text-gray-900">Edit Product</h2>
              <button 
                onClick={() => setEditingProduct(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Price (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Stock Level</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={editingProduct.inventory}
                    onChange={(e) => setEditingProduct({ ...editingProduct, inventory: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none bg-white"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Publish Status</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Product Image URL</label>
                <input
                  type="url"
                  value={editingProduct.image}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>

              {/* Dynamic Gallery Image Input List for Editing */}
              <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Gallery Images</label>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, images: [...(editingProduct.images || []), ''] })}
                    className="text-[10px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 uppercase tracking-wider"
                  >
                    + Add Image URL
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(editingProduct.images || []).map((imgUrl, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={imgUrl}
                        onChange={(e) => {
                          const updatedImages = [...(editingProduct.images || [])];
                          updatedImages[index] = e.target.value;
                          setEditingProduct({ ...editingProduct, images: updatedImages });
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 rounded-lg border border-gray-200 py-1.5 px-3 text-xs focus:border-gray-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedImages = (editingProduct.images || []).filter((_, i) => i !== index);
                          setEditingProduct({ ...editingProduct, images: updatedImages });
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(editingProduct.images || []).length === 0 && (
                    <p className="text-[11px] text-gray-400 italic text-center py-1">No additional gallery images added yet.</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="w-1/2 rounded-xl border border-gray-200 py-2.5 font-sans text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-gray-900 py-2.5 font-sans text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: DETAILED ORDER SLIDE-OPEN */}
      {/* ======================================================== */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="order-detail-overlay">
          <div 
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedOrderDetail(null)}
          />

          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250 text-left">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-5 sm:px-6 border-b border-gray-100">
                <div>
                  <span className="font-sans text-xs uppercase tracking-wider text-gray-400 font-semibold">Order Details</span>
                  <h2 className="font-mono text-sm font-bold text-gray-900">{selectedOrderDetail.id}</h2>
                </div>
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 font-sans">
                {/* Logistics */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Customer Shipping</h3>
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50 space-y-2 text-sm text-gray-800">
                    <p><span className="font-semibold text-gray-900">Name:</span> {selectedOrderDetail.customerName}</p>
                    <p><span className="font-semibold text-gray-900">Email:</span> {selectedOrderDetail.customerEmail}</p>
                    <p><span className="font-semibold text-gray-900">Address:</span> {selectedOrderDetail.shippingAddress}</p>
                  </div>
                </div>

                {/* Status Adjuster */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fulfillment Workflow</h3>
                  <div className="flex items-center space-x-3">
                    <select
                      value={selectedOrderDetail.status}
                      onChange={(e) => {
                        onUpdateOrderStatus(selectedOrderDetail.id, e.target.value as any);
                        setSelectedOrderDetail({ ...selectedOrderDetail, status: e.target.value as any });
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none flex-1"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Items Purchased */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ordered Items ({selectedOrderDetail.items.length})</h3>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden">
                    {selectedOrderDetail.items.map((item) => (
                      <div key={item.productId} className="flex p-3 items-center text-sm">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded object-cover border border-gray-100 mr-3"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 line-clamp-1">{item.name}</h4>
                          <p className="text-xs text-gray-400">Qty: {item.quantity} • ৳{item.price.toFixed(2)}</p>
                        </div>
                        <span className="font-mono text-gray-800 font-medium ml-2">
                          ৳{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary calculation */}
                <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">৳{selectedOrderDetail.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrderDetail.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="font-mono">-৳{selectedOrderDetail.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping fee</span>
                    <span className="font-mono">
                      {selectedOrderDetail.subtotal >= 150 ? 'Free' : '৳10.00'}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total Amount</span>
                    <span className="font-mono">৳{selectedOrderDetail.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-4 text-xs text-gray-400 flex items-center space-x-1 justify-center border-t border-gray-100">
                  <span>Method of Payment:</span>
                  <span className="font-semibold text-gray-700">{selectedOrderDetail.paymentMethod}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
