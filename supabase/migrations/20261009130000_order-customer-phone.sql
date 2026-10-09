-- Save the customer's phone number on each order (checkout already asks for
-- it, but it was only passed to SSLCommerz, never stored), so the admin order
-- list and invoices can show it.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Backfill older orders from the customer's account profile where possible.
UPDATE public.orders o
SET customer_phone = p.phone
FROM public.profiles p
WHERE o.customer_phone IS NULL
  AND p.phone IS NOT NULL
  AND (p.id = o.user_id OR lower(p.email) = lower(o.customer_email));

-- New signatures add p_customer_phone. It defaults to NULL so a browser still
-- running the previous build keeps working; when sent, it must be a valid
-- Bangladeshi number.
DROP FUNCTION IF EXISTS public.place_order(JSONB, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_pending_gateway_order(JSONB, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_promo_code TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL
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
  IF p_customer_phone IS NOT NULL AND p_customer_phone !~ '^01[3-9][0-9]{8}$' THEN
    RAISE EXCEPTION 'A valid Bangladeshi phone number is required (e.g. 017XXXXXXXX)';
  END IF;

  v_priced := public.price_cart(p_items, p_promo_code);

  INSERT INTO public.orders (
    user_id, customer_name, customer_email, customer_phone, shipping_address,
    subtotal, discount, total, status, payment_method, payment_status, promo_code
  ) VALUES (
    auth.uid(), p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    (v_priced->>'subtotal')::NUMERIC, (v_priced->>'discount')::NUMERIC, (v_priced->>'total')::NUMERIC,
    'Pending', 'Cash on Delivery', 'unpaid', v_priced->>'promo_code'
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_priced->'items')
  LOOP
    INSERT INTO public.order_items (order_id, user_id, product_id, name, price, quantity, image, selected_options)
    VALUES (
      v_order_id, auth.uid(), (v_line->>'product_id')::UUID, v_line->>'name',
      (v_line->>'price')::NUMERIC, (v_line->>'quantity')::INTEGER, v_line->>'image',
      v_line->'selected_options'
    );
  END LOOP;

  PERFORM public.apply_order_fulfillment(v_order_id);

  RETURN public.get_order_by_id(v_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_pending_gateway_order(
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_promo_code TEXT,
  p_customer_phone TEXT DEFAULT NULL
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
  IF p_customer_phone IS NOT NULL AND p_customer_phone !~ '^01[3-9][0-9]{8}$' THEN
    RAISE EXCEPTION 'A valid Bangladeshi phone number is required (e.g. 017XXXXXXXX)';
  END IF;

  v_priced := public.price_cart(p_items, p_promo_code);

  INSERT INTO public.orders (
    user_id, customer_name, customer_email, customer_phone, shipping_address,
    subtotal, discount, total, status, payment_method, payment_status, promo_code
  ) VALUES (
    auth.uid(), p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    (v_priced->>'subtotal')::NUMERIC, (v_priced->>'discount')::NUMERIC, (v_priced->>'total')::NUMERIC,
    'Pending', 'SSLCommerz', 'unpaid', v_priced->>'promo_code'
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_priced->'items')
  LOOP
    INSERT INTO public.order_items (order_id, user_id, product_id, name, price, quantity, image, selected_options)
    VALUES (
      v_order_id, auth.uid(), (v_line->>'product_id')::UUID, v_line->>'name',
      (v_line->>'price')::NUMERIC, (v_line->>'quantity')::INTEGER, v_line->>'image',
      v_line->'selected_options'
    );
  END LOOP;

  RETURN public.get_order_by_id(v_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_gateway_order(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- get_order_by_id — now includes customerPhone.
CREATE OR REPLACE FUNCTION public.get_order_by_id(p_order_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', o.id,
    'customerName', o.customer_name,
    'customerEmail', o.customer_email,
    'customerPhone', o.customer_phone,
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
        'quantity', oi.quantity, 'image', oi.image,
        'selectedOptions', oi.selected_options
      ))
      FROM public.order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  ) END
  FROM public.orders o WHERE o.id = p_order_id;
$$;
