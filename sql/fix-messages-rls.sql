DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
DROP POLICY IF EXISTS "Admins can read messages" ON messages;
DROP POLICY IF EXISTS "Admins can update messages" ON messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON messages;
DROP POLICY IF EXISTS "Admin can manage messages" ON messages;
DROP POLICY IF EXISTS "Admins manage msgs" ON messages;
DROP POLICY IF EXISTS "Admins update msgs" ON messages;
DROP POLICY IF EXISTS "Admins delete msgs" ON messages;

CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage messages" ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can update messages" ON messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can delete messages" ON messages FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
