-- =====================================================================
-- Lagle Janaben — initial schema, RLS, and order-fulfillment RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  category    TEXT NOT NULL DEFAULT 'General',
  image       TEXT,
  images      JSONB,
  material    TEXT,
  dimensions  TEXT,
  inventory   INTEGER NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  rating      NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  featured    BOOLEAN NOT NULL DEFAULT false,
  status      TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Draft','Out of Stock')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,
  type              TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage','flat')),
  value             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_order_amount  NUMERIC(10,2) CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
  usage_limit       INTEGER CHECK (usage_limit IS NULL OR usage_limit >= 0),
  used_count        INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  expires_at        DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_fee              NUMERIC(10,2) NOT NULL DEFAULT 10 CHECK (shipping_fee >= 0),
  free_shipping_threshold   NUMERIC(10,2) NOT NULL DEFAULT 150 CHECK (free_shipping_threshold >= 0),
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT NOT NULL,
  image_key   TEXT,
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom fields beyond InsForge's built-in auth.users — just the admin flag.
-- Regular customers never get a row here; absence of a row means role = 'customer'.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_email   TEXT NOT NULL,
  shipping_address TEXT,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Shipped','Delivered','Cancelled')),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('Cash on Delivery','SSLCommerz')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','failed')),
  card_type        TEXT,
  bank_tran_id     TEXT,
  promo_code       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id     UUID,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  image       TEXT
);

-- CRM summary, entirely server-maintained (place_order / fulfill_gateway_order).
-- Never written to directly by client code.
CREATE TABLE IF NOT EXISTS public.customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  join_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  total_orders  INTEGER NOT NULL DEFAULT 0,
  total_spent   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_user_id ON public.order_items(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER shipping_settings_updated_at BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- ---------------------------------------------------------------------
-- Helper: is_admin()
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- products: public read (drafts hidden from non-admins), admin write
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (status <> 'Draft' OR public.is_admin());

CREATE POLICY products_admin_write ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- promo_codes: no public listing at all — validate_promo() RPC is the public surface
CREATE POLICY promo_codes_admin_all ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;

-- shipping_settings: public read, admin write
CREATE POLICY shipping_settings_public_read ON public.shipping_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY shipping_settings_admin_write ON public.shipping_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.shipping_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_settings TO authenticated;

-- hero_slides: public sees only active slides, admin sees + manages all
CREATE POLICY hero_slides_public_read ON public.hero_slides
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

CREATE POLICY hero_slides_admin_write ON public.hero_slides
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;

-- profiles: a user can see their own row (to know their own role), admin sees all.
-- No client write grants — role changes are an admin/CLI-only operation.
CREATE POLICY profiles_self_or_admin_read ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_admin());

GRANT SELECT ON public.profiles TO authenticated;

-- orders: owner or admin can read; only admin can update (status changes);
-- no direct INSERT policy for anyone — creation only happens inside the
-- SECURITY DEFINER order-fulfillment RPCs below. Guest order lookup (no
-- session) goes through get_order_by_id(), not a table policy, so an
-- unauthenticated caller can never list/enumerate the orders table.
CREATE POLICY orders_owner_or_admin_read ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY orders_admin_update ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
REVOKE INSERT, DELETE ON public.orders FROM anon, authenticated;

CREATE POLICY order_items_owner_or_admin_read ON public.order_items
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

GRANT SELECT ON public.order_items TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;

-- customers: admin-only CRM view; never written to directly by client code
CREATE POLICY customers_admin_read ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.customers TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.customers FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- validate_promo — public, read-only promo preview (no full-table access)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_promo(p_code TEXT, p_subtotal NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_discount NUMERIC := 0;
BEGIN
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Enter a promo code');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes WHERE code = upper(btrim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code not found');
  END IF;
  IF NOT v_promo.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code is no longer active');
  END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < CURRENT_DATE THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code has expired');
  END IF;
  IF v_promo.usage_limit IS NOT NULL AND v_promo.used_count >= v_promo.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code has reached its usage limit');
  END IF;
  IF v_promo.min_order_amount IS NOT NULL AND p_subtotal < v_promo.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error',
      format('Add %s more to use this promo code', to_char(v_promo.min_order_amount - p_subtotal, 'FM999999990.00')));
  END IF;

  IF v_promo.type = 'percentage' THEN
    v_discount := round(p_subtotal * (v_promo.value / 100), 2);
  ELSE
    v_discount := LEAST(v_promo.value, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_promo.code,
    'type', v_promo.type,
    'value', v_promo.value,
    'discount', v_discount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo(TEXT, NUMERIC) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Shared internal helper: recompute cart lines + totals from the DB,
-- never trusting client-sent prices. Raises on any invalid line.
-- Returns jsonb: { items: [...], subtotal, discount, shipping_fee, total, promo_code }
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.price_cart(p_items JSONB, p_promo_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_quantity INTEGER;
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC := 0;
  v_promo_result JSONB;
  v_shipping public.shipping_settings%ROWTYPE;
  v_shipping_fee NUMERIC := 0;
  v_line JSONB;
  v_lines JSONB := '[]'::jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for an item in your cart';
    END IF;

    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::UUID
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the items in your cart is no longer available';
    END IF;
    IF v_product.status = 'Draft' THEN
      RAISE EXCEPTION '% is not available for purchase', v_product.name;
    END IF;
    IF v_product.inventory < v_quantity THEN
      RAISE EXCEPTION 'Only %s units of %s are in stock', v_product.inventory, v_product.name;
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);

    v_line := jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'quantity', v_quantity,
      'image', v_product.image
    );
    v_lines := v_lines || jsonb_build_array(v_line);
  END LOOP;

  IF p_promo_code IS NOT NULL AND btrim(p_promo_code) <> '' THEN
    v_promo_result := public.validate_promo(p_promo_code, v_subtotal);
    IF (v_promo_result->>'valid')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION '%', (v_promo_result->>'error');
    END IF;
    v_discount := (v_promo_result->>'discount')::NUMERIC;
  END IF;

  SELECT * INTO v_shipping FROM public.shipping_settings WHERE is_active LIMIT 1;
  IF FOUND THEN
    v_shipping_fee := CASE WHEN v_subtotal >= v_shipping.free_shipping_threshold THEN 0 ELSE v_shipping.shipping_fee END;
  END IF;

  RETURN jsonb_build_object(
    'items', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping_fee', v_shipping_fee,
    'total', v_subtotal - v_discount + v_shipping_fee,
    'promo_code', CASE WHEN v_discount > 0 THEN upper(btrim(p_promo_code)) ELSE NULL END
  );
END;
$$;

-- Not exposed to PostgREST directly (only called from the RPCs below), but
-- lock down execute anyway since it holds row locks and writes no audit trail.
REVOKE EXECUTE ON FUNCTION public.price_cart(JSONB, TEXT) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- Shared internal helper: apply order fulfillment side effects
-- (inventory decrement, promo redemption, customer CRM upsert).
-- Called once per order — by place_order() immediately, or by
-- fulfill_gateway_order() after payment is confirmed.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_order_fulfillment(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET inventory = GREATEST(inventory - v_item.quantity, 0),
          status = CASE WHEN inventory - v_item.quantity <= 0 THEN 'Out of Stock' ELSE status END
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  IF v_order.promo_code IS NOT NULL THEN
    UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = v_order.promo_code;
  END IF;

  INSERT INTO public.customers (name, email, total_orders, total_spent)
  VALUES (v_order.customer_name, v_order.customer_email, 1, v_order.total)
  ON CONFLICT (email) DO UPDATE
    SET total_orders = public.customers.total_orders + 1,
        total_spent = public.customers.total_spent + v_order.total,
        name = EXCLUDED.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_order_fulfillment(UUID) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- place_order — Cash on Delivery (and any future non-gateway) checkout.
-- Recomputes everything server-side; fulfills immediately and atomically.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_priced JSONB;
  v_order_id UUID;
  v_line JSONB;
BEGIN
  IF btrim(coalesce(p_customer_name, '')) = '' OR btrim(coalesce(p_customer_email, '')) = '' THEN
    RAISE EXCEPTION 'Name and email are required';
  END IF;

  v_priced := public.price_cart(p_items, NULL);

  INSERT INTO public.orders (
    user_id, customer_name, customer_email, shipping_address,
    subtotal, discount, total, status, payment_method, payment_status
  ) VALUES (
    auth.uid(), p_customer_name, p_customer_email, p_shipping_address,
    (v_priced->>'subtotal')::NUMERIC, (v_priced->>'discount')::NUMERIC, (v_priced->>'total')::NUMERIC,
    'Pending', 'Cash on Delivery', 'unpaid'
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_priced->'items')
  LOOP
    INSERT INTO public.order_items (order_id, user_id, product_id, name, price, quantity, image)
    VALUES (
      v_order_id, auth.uid(), (v_line->>'product_id')::UUID, v_line->>'name',
      (v_line->>'price')::NUMERIC, (v_line->>'quantity')::INTEGER, v_line->>'image'
    );
  END LOOP;

  PERFORM public.apply_order_fulfillment(v_order_id);

  RETURN public.get_order_by_id(v_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(JSONB, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- create_pending_gateway_order — SSLCommerz checkout, step 1.
-- Recomputes and reserves nothing yet (no inventory/promo/CRM writes) —
-- those only happen once fulfill_gateway_order() confirms payment.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_pending_gateway_order(
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_promo_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_priced JSONB;
  v_order_id UUID;
  v_line JSONB;
BEGIN
  IF btrim(coalesce(p_customer_name, '')) = '' OR btrim(coalesce(p_customer_email, '')) = '' THEN
    RAISE EXCEPTION 'Name and email are required';
  END IF;

  v_priced := public.price_cart(p_items, p_promo_code);

  INSERT INTO public.orders (
    user_id, customer_name, customer_email, shipping_address,
    subtotal, discount, total, status, payment_method, payment_status, promo_code
  ) VALUES (
    auth.uid(), p_customer_name, p_customer_email, p_shipping_address,
    (v_priced->>'subtotal')::NUMERIC, (v_priced->>'discount')::NUMERIC, (v_priced->>'total')::NUMERIC,
    'Pending', 'SSLCommerz', 'unpaid', v_priced->>'promo_code'
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_priced->'items')
  LOOP
    INSERT INTO public.order_items (order_id, user_id, product_id, name, price, quantity, image)
    VALUES (
      v_order_id, auth.uid(), (v_line->>'product_id')::UUID, v_line->>'name',
      (v_line->>'price')::NUMERIC, (v_line->>'quantity')::INTEGER, v_line->>'image'
    );
  END LOOP;

  RETURN public.get_order_by_id(v_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_gateway_order(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- fulfill_gateway_order — SSLCommerz checkout, step 2.
-- Called only from the sslcommerz-callback edge function (admin client),
-- after SSLCommerz's server-to-server validation has confirmed the
-- amount/tran_id match. Idempotent: a second call for an already-paid
-- order is a safe no-op, closing the double-processing bug.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fulfill_gateway_order(
  p_order_id UUID,
  p_bank_tran_id TEXT,
  p_card_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN public.get_order_by_id(p_order_id);
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'Processing',
      bank_tran_id = p_bank_tran_id,
      card_type = p_card_type,
      validated_at = now()
  WHERE id = p_order_id;

  PERFORM public.apply_order_fulfillment(p_order_id);

  RETURN public.get_order_by_id(p_order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_gateway_order(UUID, TEXT, TEXT) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- mark_gateway_order_failed — SSLCommerz fail/cancel callback.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_gateway_order_failed(p_order_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  UPDATE public.orders SET payment_status = 'failed'
  WHERE id = p_order_id AND payment_status = 'unpaid';
$$;

REVOKE EXECUTE ON FUNCTION public.mark_gateway_order_failed(UUID) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- get_order_by_id — the order's own id acts as an unguessable receipt
-- token, so this is safe to expose publicly: it returns exactly one row
-- when the caller already has the id, and never lists/enumerates orders.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_order_by_id(p_order_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', o.id,
    'customerName', o.customer_name,
    'customerEmail', o.customer_email,
    'shippingAddress', o.shipping_address,
    'subtotal', o.subtotal,
    'discount', o.discount,
    'total', o.total,
    'status', o.status,
    'paymentMethod', o.payment_method,
    'paymentStatus', o.payment_status,
    'cardType', o.card_type,
    'bankTranId', o.bank_tran_id,
    'createdAt', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'productId', oi.product_id, 'name', oi.name, 'price', oi.price,
        'quantity', oi.quantity, 'image', oi.image
      ))
      FROM public.order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  ) END
  FROM public.orders o WHERE o.id = p_order_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_id(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------

INSERT INTO public.products (name, description, price, category, image, images, inventory, rating, featured, status) VALUES
('Aero Wireless Headphones', 'Experience pure sonic bliss with active noise cancellation, custom-tuned high-fidelity audio, and up to 45 hours of comfortable playback.', 249.00, 'Technology', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', '["https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80"]', 15, 4.8, true, 'Active'),
('Vanguard Leather Backpack', 'Handcrafted from full-grain vegetable-tanned leather. Features a protective 16-inch laptop compartment and hidden quick-access travel pockets.', 189.00, 'Accessories', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80', '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=600&q=80"]', 8, 4.9, true, 'Active'),
('Horology Minimalist Watch', 'A masterpiece of understatement. Features a Swiss quartz movement, surgical-grade stainless steel case, and an interchangeable genuine leather strap.', 145.00, 'Accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', '["https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80"]', 22, 4.7, true, 'Active'),
('Tactile Mechanical Keyboard', 'A 75% layout keyboard with hot-swappable brown switches, dual-shot PBT keycaps, and a solid aluminum chassis for the ultimate typing feel.', 120.00, 'Technology', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', NULL, 12, 4.6, false, 'Active'),
('Ceramic Coffee Dripper Set', 'A premium V60 ceramic dripper paired with a matching double-walled glass server. Engineered for steady thermal insulation and precise extraction.', 48.00, 'Lifestyle', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', NULL, 30, 4.5, false, 'Active'),
('Solid Brass Desk Organizer', 'Hefty, beautiful, and functional. Holds pens, stationery, and cards while adding a timeless architectural accent to your workspace.', 65.00, 'Lifestyle', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80', NULL, 5, 4.4, false, 'Active'),
('Merino Wool Beanie', 'Knit from ultra-soft, ethically-sourced extrafine merino wool. Offers incredible warmth, natural breathability, and an adaptable cuffed fit.', 35.00, 'Apparel', 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=600&q=80', NULL, 40, 4.8, false, 'Active'),
('Saddle Leather Wallet', 'A slim, front-pocket cardholder with 4 slots and a central cash pocket. Ages beautifully, developing a deep, unique patina over time.', 55.00, 'Accessories', 'https://images.unsplash.com/photo-1627124118123-24d4b78b004c?auto=format&fit=crop&w=600&q=80', NULL, 18, 4.7, false, 'Active'),
('Heritage Cotton Overshirt', 'Tailored from heavy 100% organic cotton twill. Designed to work as a versatile layer between seasons with double chest patch utility pockets.', 85.00, 'Apparel', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80', NULL, 14, 4.6, true, 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.promo_codes (code, type, value, min_order_amount, usage_limit, is_active) VALUES
('WELCOME10', 'percentage', 10.00, NULL, 100, true),
('AURA20',    'percentage', 20.00, NULL, 50,  true),
('FREESHIP',  'flat',       5.00,  NULL, NULL, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.shipping_settings (shipping_fee, free_shipping_threshold, is_active)
SELECT 10.00, 150.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_settings);

INSERT INTO public.hero_slides (image_url, alt_text, sort_order, is_active) VALUES
('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&q=80', 'Gift Collection', 0, true),
('https://images.unsplash.com/photo-1513207565459-d7f36bfa1222?w=1200&q=80', 'Luxury Gifts', 1, true),
('https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=1200&q=80', 'Special Offers', 2, true)
ON CONFLICT DO NOTHING;
