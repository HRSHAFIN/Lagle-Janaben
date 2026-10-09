-- Size / Color / Variant product options. Each is an independent,
-- admin-managed list of { label, available, hex? } — not a combinatorial
-- SKU matrix. A product can have any subset of the three groups; when a
-- group is present the customer must pick one of its *available* entries,
-- validated again server-side (never trusted from the client).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sizes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS colors   JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options JSONB;

-- ---------------------------------------------------------------------
-- price_cart — now validates + carries the selected size/color/variant
-- for each line, alongside the existing server-side price/stock recompute.
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
  v_selected_options JSONB;
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

    -- Size / Color / Variant: required + validated only when the product
    -- actually defines that option group.
    IF jsonb_array_length(v_product.sizes) > 0 THEN
      IF v_item->>'size' IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_product.sizes) opt
        WHERE opt->>'label' = v_item->>'size' AND coalesce((opt->>'available')::boolean, false)
      ) THEN
        RAISE EXCEPTION 'Please select an available size for %', v_product.name;
      END IF;
    END IF;

    IF jsonb_array_length(v_product.colors) > 0 THEN
      IF v_item->>'color' IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_product.colors) opt
        WHERE opt->>'label' = v_item->>'color' AND coalesce((opt->>'available')::boolean, false)
      ) THEN
        RAISE EXCEPTION 'Please select an available color for %', v_product.name;
      END IF;
    END IF;

    IF jsonb_array_length(v_product.variants) > 0 THEN
      IF v_item->>'variant' IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_product.variants) opt
        WHERE opt->>'label' = v_item->>'variant' AND coalesce((opt->>'available')::boolean, false)
      ) THEN
        RAISE EXCEPTION 'Please select an available option for %', v_product.name;
      END IF;
    END IF;

    v_selected_options := jsonb_strip_nulls(jsonb_build_object(
      'size', v_item->>'size',
      'color', v_item->>'color',
      'variant', v_item->>'variant'
    ));

    v_subtotal := v_subtotal + (v_product.price * v_quantity);

    v_line := jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'quantity', v_quantity,
      'image', v_product.image,
      'selected_options', CASE WHEN v_selected_options = '{}'::jsonb THEN NULL ELSE v_selected_options END
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

REVOKE EXECUTE ON FUNCTION public.price_cart(JSONB, TEXT) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- place_order — now persists selected_options per line.
-- ---------------------------------------------------------------------

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

GRANT EXECUTE ON FUNCTION public.place_order(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- create_pending_gateway_order — same, for the SSLCommerz path.
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

GRANT EXECUTE ON FUNCTION public.create_pending_gateway_order(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- get_order_by_id — now projects selectedOptions per item.
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
        'quantity', oi.quantity, 'image', oi.image,
        'selectedOptions', oi.selected_options
      ))
      FROM public.order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  ) END
  FROM public.orders o WHERE o.id = p_order_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_id(UUID) TO anon, authenticated;
