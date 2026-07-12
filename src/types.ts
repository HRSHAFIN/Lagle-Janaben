export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  inventory: number;
  rating: number;
  featured: boolean;
  status: 'Active' | 'Draft' | 'Out of Stock';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: string;
  paymentMethod: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
  status: 'Active' | 'Inactive';
}

export interface FilterState {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rating';
}

export interface PromoCode {
  id: number;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  min_order_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: number;
  expires_at: string | null;
  created_at: string;
}

export interface ShippingSettings {
  shipping_fee: number;
  free_shipping_threshold: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  authProvider: 'local' | 'google';
}

export type ViewType = 'catalog' | 'checkout' | 'admin' | 'order-success' | 'product-detail' | 'login' | 'register';

export type AdminTabType = 'overview' | 'products' | 'orders' | 'customers' | 'promos' | 'shipping';
