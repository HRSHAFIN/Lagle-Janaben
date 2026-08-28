-- Registered-account directory (name/email/phone denormalized so admins can
-- list all accounts in one query), self-service order history, and
-- customer-initiated cancellation within 2 hours of placing an order.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Self-service upsert of the caller's own directory row. role is never part
-- of the SET clause, so this can't be used to self-grant admin.
CREATE OR REPLACE FUNCTION public.sync_my_profile(p_name TEXT, p_email TEXT, p_phone TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (auth.uid(), p_name, p_email, p_phone)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_profile(TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- Reversal of apply_order_fulfillment — restores inventory and undoes
-- promo/CRM counters. Shared by the self-cancel RPC and any future
-- admin-driven cancellation, via the trigger below (single source of truth).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reverse_order_fulfillment(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

  FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET inventory = inventory + v_item.quantity,
          status = CASE WHEN status = 'Out of Stock' THEN 'Active' ELSE status END
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  IF v_order.promo_code IS NOT NULL THEN
    UPDATE public.promo_codes SET used_count = GREATEST(used_count - 1, 0) WHERE code = v_order.promo_code;
  END IF;

  UPDATE public.customers
  SET total_orders = GREATEST(total_orders - 1, 0),
      total_spent = GREATEST(total_spent - v_order.total, 0)
  WHERE email = v_order.customer_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_order_fulfillment(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_order_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Only reverse effects that actually happened: a COD order is fulfilled
  -- immediately at creation; a gateway order only once payment_status='paid'.
  IF NEW.payment_method = 'Cash on Delivery' OR NEW.payment_status = 'paid' THEN
    PERFORM public.reverse_order_fulfillment(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_handle_cancellation ON public.orders;
CREATE TRIGGER orders_handle_cancellation
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'Cancelled' AND OLD.status IS DISTINCT FROM 'Cancelled')
  EXECUTE FUNCTION public.handle_order_cancellation();

-- ---------------------------------------------------------------------
-- cancel_own_order — customer self-service cancellation, 2-hour window.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_own_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to cancel an order';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only cancel your own orders';
  END IF;
  IF v_order.status NOT IN ('Pending', 'Processing') THEN
    RAISE EXCEPTION 'This order can no longer be cancelled';
  END IF;
  IF v_order.created_at < now() - interval '2 hours' THEN
    RAISE EXCEPTION 'The 2-hour cancellation window for this order has passed';
  END IF;

  UPDATE public.orders SET status = 'Cancelled' WHERE id = p_order_id;

  RETURN public.get_order_by_id(p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_own_order(UUID) TO authenticated;
