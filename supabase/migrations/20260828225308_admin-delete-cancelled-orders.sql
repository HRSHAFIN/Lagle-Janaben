-- Admins may permanently delete an order, but only once it's already
-- Cancelled — never a live/fulfillable order. order_items cascade-delete
-- via their existing FK.

CREATE POLICY orders_admin_delete_cancelled ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_admin() AND status = 'Cancelled');

GRANT DELETE ON public.orders TO authenticated;
