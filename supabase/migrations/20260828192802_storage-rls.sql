-- public-assets bucket: world-readable (hero slider + product images),
-- writable only by admins.

INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS storage_objects_public_assets_read ON storage.objects;
DROP POLICY IF EXISTS storage_objects_public_assets_admin_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_public_assets_admin_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_public_assets_admin_delete ON storage.objects;

CREATE POLICY storage_objects_public_assets_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-assets');

CREATE POLICY storage_objects_public_assets_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

CREATE POLICY storage_objects_public_assets_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

CREATE POLICY storage_objects_public_assets_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin());
