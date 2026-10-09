-- Phone and email are now required to place an order, server-side too.
-- The previous migration left p_customer_phone optional so browsers still on
-- the old build could check out during the deploy; the current build always
-- sends it. The parameter keeps its DEFAULT NULL so a missing phone gets a
-- clear error message instead of "function not found".

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
  IF p_customer_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;
  IF p_customer_phone IS NULL OR p_customer_phone !~ '^01[3-9][0-9]{8}$' THEN
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
  IF p_customer_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;
  IF p_customer_phone IS NULL OR p_customer_phone !~ '^01[3-9][0-9]{8}$' THEN
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
