export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  material?: string | null;
  dimensions?: string | null;
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
  productId: string | null;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export type PaymentMethod = 'Cash on Delivery' | 'SSLCommerz';

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
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  createdAt: string;
  paymentMethod: PaymentMethod;
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
  id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  min_order_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface ShippingSettings {
  shipping_fee: number;
  free_shipping_threshold: number;
}

export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type ViewType = 'catalog' | 'checkout' | 'admin' | 'order-success' | 'product-detail' | 'login' | 'register' | 'my-orders';

export type AdminTabType = 'overview' | 'products' | 'orders' | 'customers' | 'accounts' | 'promos' | 'shipping' | 'hero-slider';

export interface Account {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  image_url: string;
  image_key: string | null;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
}
