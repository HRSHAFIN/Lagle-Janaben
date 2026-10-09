-- Email/password sign-ups must carry an email and a valid Bangladeshi phone
-- number (sent as user metadata by supabase.auth.signUp). The Register form
-- already checks this; the trigger enforces it for anyone calling the Auth
-- API directly. Rows inserted for other providers (e.g. Google, if it's
-- re-enabled) are not affected.

CREATE OR REPLACE FUNCTION public.validate_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'email' THEN
    IF COALESCE(btrim(NEW.email), '') = '' THEN
      RAISE EXCEPTION 'An email address is required';
    END IF;
    IF COALESCE(NEW.raw_user_meta_data->>'phone', '') !~ '^01[3-9][0-9]{8}$' THEN
      RAISE EXCEPTION 'A valid Bangladeshi phone number is required (e.g. 017XXXXXXXX)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_new_auth_user ON auth.users;
CREATE TRIGGER validate_new_auth_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validate_new_auth_user();
