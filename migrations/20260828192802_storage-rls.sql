-- public-assets bucket: world-readable (hero slider + product images),
-- writable only by admins.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

CREATE POLICY storage_objects_public_assets_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket = 'public-assets');

CREATE POLICY storage_objects_public_assets_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket = 'public-assets' AND public.is_admin());

CREATE POLICY storage_objects_public_assets_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket = 'public-assets' AND public.is_admin())
  WITH CHECK (bucket = 'public-assets' AND public.is_admin());

CREATE POLICY storage_objects_public_assets_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket = 'public-assets' AND public.is_admin());

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
