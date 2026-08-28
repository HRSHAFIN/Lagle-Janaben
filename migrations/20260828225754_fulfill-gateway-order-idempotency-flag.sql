-- fulfill_gateway_order now reports whether this call was the one that
-- actually transitioned the order (vs. a repeat call for an already-paid
-- order — the browser redirect and the async IPN both hit the same
-- callback for one transaction). Only ever called from the
-- sslcommerz-callback edge function, so it's safe to change the return
-- shape here without touching any other caller.

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
    RETURN jsonb_build_object('order', public.get_order_by_id(p_order_id), 'justFulfilled', false);
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'Processing',
      bank_tran_id = p_bank_tran_id,
      card_type = p_card_type,
      validated_at = now()
  WHERE id = p_order_id;

  PERFORM public.apply_order_fulfillment(p_order_id);

  RETURN jsonb_build_object('order', public.get_order_by_id(p_order_id), 'justFulfilled', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_gateway_order(UUID, TEXT, TEXT) FROM PUBLIC;
