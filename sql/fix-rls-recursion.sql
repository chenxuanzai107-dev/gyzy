-- Fix: admin_users RLS infinite recursion
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can insert" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can delete" ON public.admin_users;
DROP POLICY IF EXISTS "Admin can manage applications" ON applications;
DROP POLICY IF EXISTS "Admin can update applications" ON applications;
DROP POLICY IF EXISTS "Admin can delete applications" ON applications;
DROP POLICY IF EXISTS "Admin can manage messages" ON messages;
DROP POLICY IF EXISTS "Admin can update messages" ON messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON messages;
DROP POLICY IF EXISTS "Admin can read all activities" ON activities;
DROP POLICY IF EXISTS "Admin can insert activities" ON activities;
DROP POLICY IF EXISTS "Admin can update activities" ON activities;
DROP POLICY IF EXISTS "Admin can delete activities" ON activities;
DROP POLICY IF EXISTS "Admin can manage stats" ON site_stats;
DROP POLICY IF EXISTS "Admin can insert stats" ON site_stats;

-- admin_users: user reads OWN record (no recursion!)
CREATE POLICY "Users can read own admin record" ON public.admin_users FOR SELECT TO authenticated USING (id = auth.uid());

-- admin_users: super can write
CREATE POLICY "Super admins can insert" ON public.admin_users FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super'));
CREATE POLICY "Super admins can delete" ON public.admin_users FOR DELETE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super'));

-- applications: admins can manage
CREATE POLICY "Admins manage apps" ON applications FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins update apps" ON applications FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins delete apps" ON applications FOR DELETE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- messages: admins can manage
CREATE POLICY "Admins manage msgs" ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins update msgs" ON messages FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins delete msgs" ON messages FOR DELETE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- activities: admins can manage
CREATE POLICY "Admins manage acts" ON activities FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins insert acts" ON activities FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins update acts" ON activities FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins delete acts" ON activities FOR DELETE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- site_stats: admins can manage
CREATE POLICY "Admins manage stats" ON site_stats FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins insert stats" ON site_stats FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
