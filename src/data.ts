import { Product, Order, Customer } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Aero Wireless Headphones',
    description: 'Experience pure sonic bliss with active noise cancellation, custom-tuned high-fidelity audio, and up to 45 hours of comfortable playback.',
    price: 249.00,
    category: 'Technology',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80'
    ],
    inventory: 15,
    rating: 4.8,
    featured: true,
    status: 'Active'
  },
  {
    id: 'prod-2',
    name: 'Vanguard Leather Backpack',
    description: 'Handcrafted from full-grain vegetable-tanned leather. Features a protective 16-inch laptop compartment and hidden quick-access travel pockets.',
    price: 189.00,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=600&q=80'
    ],
    inventory: 8,
    rating: 4.9,
    featured: true,
    status: 'Active'
  },
  {
    id: 'prod-3',
    name: 'Horology Minimalist Watch',
    description: 'A masterpiece of understatement. Features a Swiss quartz movement, surgical-grade stainless steel case, and an interchangeable genuine leather strap.',
    price: 145.00,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80'
    ],
    inventory: 22,
    rating: 4.7,
    featured: true,
    status: 'Active'
  },
  {
    id: 'prod-4',
    name: 'Tactile Mechanical Keyboard',
    description: 'A 75% layout keyboard with hot-swappable brown switches, dual-shot PBT keycaps, and a solid aluminum chassis for the ultimate typing feel.',
    price: 120.00,
    category: 'Technology',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    inventory: 12,
    rating: 4.6,
    featured: false,
    status: 'Active'
  },
  {
    id: 'prod-5',
    name: 'Ceramic Coffee Dripper Set',
    description: 'A premium V60 ceramic dripper paired with a matching double-walled glass server. Engineered for steady thermal insulation and precise extraction.',
    price: 48.00,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    inventory: 30,
    rating: 4.5,
    featured: false,
    status: 'Active'
  },
  {
    id: 'prod-6',
    name: 'Solid Brass Desk Organizer',
    description: 'Hefty, beautiful, and functional. Holds pens, stationery, and cards while adding a timeless architectural accent to your workspace.',
    price: 65.00,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    inventory: 5,
    rating: 4.4,
    featured: false,
    status: 'Active'
  },
  {
    id: 'prod-7',
    name: 'Merino Wool Beanie',
    description: 'Knit from ultra-soft, ethically-sourced extrafine merino wool. Offers incredible warmth, natural breathability, and an adaptable cuffed fit.',
    price: 35.00,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=600&q=80',
    inventory: 40,
    rating: 4.8,
    featured: false,
    status: 'Active'
  },
  {
    id: 'prod-8',
    name: 'Saddle Leather Wallet',
    description: 'A slim, front-pocket cardholder with 4 slots and a central cash pocket. Ages beautifully, developing a deep, unique patina over time.',
    price: 55.00,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1627124118123-24d4b78b004c?auto=format&fit=crop&w=600&q=80',
    inventory: 18,
    rating: 4.7,
    featured: false,
    status: 'Active'
  },
  {
    id: 'prod-9',
    name: 'Heritage Cotton Overshirt',
    description: 'Tailored from heavy 100% organic cotton twill. Designed to work as a versatile layer between seasons with double chest patch utility pockets.',
    price: 85.00,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    inventory: 14,
    rating: 4.6,
    featured: true,
    status: 'Active'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    joinDate: '2026-02-14',
    totalOrders: 3,
    totalSpent: 493.00,
    status: 'Active'
  },
  {
    id: 'cust-2',
    name: 'Marcus Chen',
    email: 'marcus.chen@example.com',
    joinDate: '2026-03-01',
    totalOrders: 1,
    totalSpent: 145.00,
    status: 'Active'
  },
  {
    id: 'cust-3',
    name: 'Elena Rostova',
    email: 'elena.r@example.com',
    joinDate: '2026-04-10',
    totalOrders: 2,
    totalSpent: 103.00,
    status: 'Active'
  },
  {
    id: 'cust-4',
    name: 'Devon Carter',
    email: 'devon.c@example.com',
    joinDate: '2026-05-20',
    totalOrders: 1,
    totalSpent: 189.00,
    status: 'Active'
  },
  {
    id: 'cust-5',
    name: 'Aisha Bello',
    email: 'aisha.b@example.com',
    joinDate: '2026-06-15',
    totalOrders: 0,
    totalSpent: 0.00,
    status: 'Active'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-9482',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com',
    shippingAddress: '428 Oak Avenue, Apt 4B, San Francisco, CA 94102',
    items: [
      {
        productId: 'prod-1',
        name: 'Aero Wireless Headphones',
        price: 249.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'
      },
      {
        productId: 'prod-8',
        name: 'Saddle Leather Wallet',
        price: 55.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1627124118123-24d4b78b004c?auto=format&fit=crop&w=600&q=80'
      }
    ],
    subtotal: 304.00,
    discount: 0,
    total: 304.00,
    status: 'Delivered',
    createdAt: '2026-06-28T14:32:00Z',
    paymentMethod: 'Credit Card'
  },
  {
    id: 'ORD-1049',
    customerName: 'Marcus Chen',
    customerEmail: 'marcus.chen@example.com',
    shippingAddress: '782 Pine Boulevard, Seattle, WA 98101',
    items: [
      {
        productId: 'prod-3',
        name: 'Horology Minimalist Watch',
        price: 145.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
      }
    ],
    subtotal: 145.00,
    discount: 14.50, // 10% promo
    total: 130.50,
    status: 'Shipped',
    createdAt: '2026-07-08T09:15:00Z',
    paymentMethod: 'PayPal'
  },
  {
    id: 'ORD-5839',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.r@example.com',
    shippingAddress: '129 Broadway, Fl 10, New York, NY 10003',
    items: [
      {
        productId: 'prod-5',
        name: 'Ceramic Coffee Dripper Set',
        price: 48.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'
      },
      {
        productId: 'prod-7',
        name: 'Merino Wool Beanie',
        price: 35.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=600&q=80'
      }
    ],
    subtotal: 83.00,
    discount: 0,
    total: 83.00,
    status: 'Pending',
    createdAt: '2026-07-10T04:45:00Z',
    paymentMethod: 'Apple Pay'
  },
  {
    id: 'ORD-7402',
    customerName: 'Devon Carter',
    customerEmail: 'devon.c@example.com',
    shippingAddress: '314 Elm Street, Chicago, IL 60611',
    items: [
      {
        productId: 'prod-2',
        name: 'Vanguard Leather Backpack',
        price: 189.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80'
      }
    ],
    subtotal: 189.00,
    discount: 0,
    total: 189.00,
    status: 'Processing',
    createdAt: '2026-07-09T18:22:00Z',
    paymentMethod: 'Credit Card'
  }
];

export const CATEGORIES = ['All', 'Technology', 'Accessories', 'Lifestyle', 'Apparel'];

export const PROMO_CODES: { [key: string]: number } = {
  'WELCOME10': 0.10, // 10% off
  'AURA20': 0.20,    // 20% off
  'FREESHIP': 5.00,  // Flat $5.00 off (which can be subtracted)
};
