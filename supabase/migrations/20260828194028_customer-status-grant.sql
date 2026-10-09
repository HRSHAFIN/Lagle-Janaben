-- Admins may flip a customer's Active/Inactive status, but total_orders /
-- total_spent / email / name stay server-maintained (apply_order_fulfillment).

CREATE POLICY customers_admin_update_status ON public.customers
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT UPDATE (status) ON public.customers TO authenticated;
