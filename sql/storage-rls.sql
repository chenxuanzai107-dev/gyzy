CREATE POLICY "Admins can upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-covers' AND EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can update covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'activity-covers' AND EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can delete covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'activity-covers' AND EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Public can read covers" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'activity-covers');
