DROP POLICY IF EXISTS "public read site assets" ON storage.objects;
CREATE POLICY "public read site assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "admins upload site assets" ON storage.objects;
CREATE POLICY "admins upload site assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "admins update site assets" ON storage.objects;
CREATE POLICY "admins update site assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "admins delete site assets" ON storage.objects;
CREATE POLICY "admins delete site assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
