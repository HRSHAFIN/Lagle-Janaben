-- Supabase grants EXECUTE on every public-schema function to anon and
-- authenticated directly (not just via PUBLIC), so the earlier
-- `REVOKE ... FROM PUBLIC` lines don't actually hide the internal
-- fulfillment helpers. Without this, any visitor could call
-- fulfill_gateway_order() and mark an unpaid order as paid.
--
-- Revoke everything, then grant back exactly what the app calls.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;

-- Functions created by future migrations start locked too; grant explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- RLS policies call this as the requesting role.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Storefront / checkout (guests can order).
GRANT EXECUTE ON FUNCTION public.validate_promo(TEXT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_gateway_order(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_id(UUID) TO anon, authenticated;

-- Signed-in customers.
GRANT EXECUTE ON FUNCTION public.sync_my_profile(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_own_order(UUID) TO authenticated;

-- Defense in depth: profiles has no write policies, but make sure nobody
-- can grant themselves the admin role even if one is added by mistake.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
