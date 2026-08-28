import { insforge } from '../insforge';
import { CartItem, Order, OrderItem } from '../../types';

interface OrderJson {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  subtotal: number;
  discount: number;
  total: number;
  status: Order['status'];
  paymentMethod: Order['paymentMethod'];
  paymentStatus: Order['paymentStatus'];
  createdAt: string;
  items: OrderItem[];
}

function mapOrderJson(json: OrderJson): Order {
  return {
    id: json.id,
    customerName: json.customerName,
    customerEmail: json.customerEmail,
    shippingAddress: json.shippingAddress,
    items: json.items ?? [],
    subtotal: Number(json.subtotal),
    discount: Number(json.discount),
    total: Number(json.total),
    status: json.status,
    paymentStatus: json.paymentStatus,
    paymentMethod: json.paymentMethod,
    createdAt: json.createdAt,
  };
}

function cartToItems(cart: CartItem[]) {
  return cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity }));
}

/** Cash on Delivery — recomputed, validated, and fulfilled atomically server-side. */
export async function placeCodOrder(
  cart: CartItem[],
  customerName: string,
  customerEmail: string,
  shippingAddress: string,
  promoCode: string | null
): Promise<Order> {
  const { data, error } = await insforge.database.rpc('place_order', {
    p_items: cartToItems(cart),
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_shipping_address: shippingAddress,
    p_promo_code: promoCode,
  });
  if (error) throw new Error(error.message);
  return mapOrderJson(data as OrderJson);
}

/** SSLCommerz — creates the Pending order; inventory/promo/CRM only apply on confirmed payment. */
export async function createGatewayOrder(
  cart: CartItem[],
  customerName: string,
  customerEmail: string,
  shippingAddress: string,
  promoCode: string | null
): Promise<Order> {
  const { data, error } = await insforge.database.rpc('create_pending_gateway_order', {
    p_items: cartToItems(cart),
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_shipping_address: shippingAddress,
    p_promo_code: promoCode,
  });
  if (error) throw new Error(error.message);
  return mapOrderJson(data as OrderJson);
}

export interface SslcommerzDeliveryDetails {
  cusPhone: string;
  cusAddress: string;
  cusCity: string;
  cusState: string;
  cusZip: string;
}

export async function initiateSslcommerzPayment(
  orderId: string,
  details: SslcommerzDeliveryDetails
): Promise<string> {
  const { data, error } = await insforge.functions.invoke('sslcommerz-initiate', {
    body: { orderId, ...details },
  });
  if (error) throw new Error(error.message);
  const result = data as { redirectUrl?: string; error?: string };
  if (!result?.redirectUrl) throw new Error(result?.error || 'Could not start payment. Please try again.');
  return result.redirectUrl;
}

/** Guest-safe lookup — the order id itself is the unguessable receipt token. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await insforge.database.rpc('get_order_by_id', { p_order_id: orderId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapOrderJson(data as OrderJson);
}

interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  status: Order['status'];
  payment_method: Order['paymentMethod'];
  payment_status: Order['paymentStatus'];
  created_at: string;
  order_items: { product_id: string | null; name: string; price: number | string; quantity: number; image: string | null }[];
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    shippingAddress: row.shipping_address,
    items: (row.order_items ?? []).map((it) => ({
      productId: it.product_id,
      name: it.name,
      price: Number(it.price),
      quantity: it.quantity,
      image: it.image ?? undefined,
    })),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
  };
}

/** Admin-only order log. RLS scopes this automatically: admins see every order, everyone else sees only their own. */
export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await insforge.database
    .from('orders')
    .select('*, order_items(product_id, name, price, quantity, image)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as OrderRow[]).map(mapOrderRow);
}

/**
 * A signed-in customer's own order history. Always explicitly filtered by
 * user_id — deliberately does NOT rely on the admin RLS bypass, so an
 * admin's "My Orders" page shows only orders *they* placed, not everyone's.
 */
export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await insforge.database
    .from('orders')
    .select('*, order_items(product_id, name, price, quantity, image)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as OrderRow[]).map(mapOrderRow);
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const { error } = await insforge.database.from('orders').update({ status }).eq('id', orderId);
  if (error) throw new Error(error.message);
}

/** Self-service cancellation — server enforces ownership and the 2-hour window. */
export async function cancelOwnOrder(orderId: string): Promise<Order> {
  const { data, error } = await insforge.database.rpc('cancel_own_order', { p_order_id: orderId });
  if (error) throw new Error(error.message);
  return mapOrderJson(data as OrderJson);
}

/** Admin-only — RLS also enforces that only an already-Cancelled order can be deleted. */
export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await insforge.database.from('orders').delete().eq('id', orderId);
  if (error) throw new Error(error.message);
}
