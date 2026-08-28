-- Fix: place_order() never accepted a promo code, so Cash on Delivery
-- orders silently ignored an applied promo (discount always 0). It now
-- takes the same promo_code parameter create_pending_gateway_order() does.

DROP FUNCTION IF EXISTS public.place_order(JSONB, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_promo_code TEXT DEFAULT NULL
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
    'Pending', 'Cash on Delivery', 'unpaid', v_priced->>'promo_code'
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

GRANT EXECUTE ON FUNCTION public.place_order(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
