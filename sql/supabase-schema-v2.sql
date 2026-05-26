-- ============================================================================
-- 建工青协 Supabase Schema v2 — 管理员表 + 增强 RLS
-- 在 Supabase SQL Editor 中执行
-- ============================================================================

-- 1. 管理员表 (只有此表中的用户才能访问后台)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 管理员表权限: 管理员可读, 超管可写
CREATE POLICY "Admins can read admin_users" ON admin_users FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Super admins can insert" ON admin_users FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super'));
CREATE POLICY "Super admins can delete" ON admin_users FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super'));

-- 2. 更新 applications 表: 加长度约束
ALTER TABLE applications ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT '';
ALTER TABLE applications ADD CONSTRAINT chk_app_name CHECK (char_length(name) <= 20);
ALTER TABLE applications ADD CONSTRAINT chk_app_contact CHECK (char_length(contact) <= 50);
ALTER TABLE applications ADD CONSTRAINT chk_app_dept CHECK (char_length(department) <= 80);
ALTER TABLE applications ADD CONSTRAINT chk_app_intro CHECK (char_length(intro) <= 300);

-- 3. 更新 messages 表: 加长度约束
ALTER TABLE messages ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'handled', 'ignored'));
ALTER TABLE messages ADD CONSTRAINT chk_msg_name CHECK (char_length(name) <= 20);
ALTER TABLE messages ADD CONSTRAINT chk_msg_contact CHECK (char_length(contact) <= 50);
ALTER TABLE messages ADD CONSTRAINT chk_msg_content CHECK (char_length(content) <= 500);

-- 4. 新增活动字段
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- ============================================================================
-- 重设 RLS 策略 (先删除旧的, 再创建新的)
-- ============================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "Anyone can insert applications" ON applications;
DROP POLICY IF EXISTS "Admin can read applications" ON applications;
DROP POLICY IF EXISTS "Admin can update applications" ON applications;
DROP POLICY IF EXISTS "Admin can delete applications" ON applications;

DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
DROP POLICY IF EXISTS "Admin can read messages" ON messages;
DROP POLICY IF EXISTS "Admin can update messages" ON messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON messages;

DROP POLICY IF EXISTS "Anyone can read activities" ON activities;
DROP POLICY IF EXISTS "Admin can insert activities" ON activities;
DROP POLICY IF EXISTS "Admin can update activities" ON activities;
DROP POLICY IF EXISTS "Admin can delete activities" ON activities;

DROP POLICY IF EXISTS "Anyone can read stats" ON site_stats;
DROP POLICY IF EXISTS "Admin can update stats" ON site_stats;
DROP POLICY IF EXISTS "Admin can insert stats" ON site_stats;

-- 新策略: applications
CREATE POLICY "Anyone can insert applications" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can manage applications" ON applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can update applications" ON applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can delete applications" ON applications FOR DELETE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- 新策略: messages
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can manage messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can update messages" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can delete messages" ON messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- 新策略: activities (公开读取, 管理员写入)
CREATE POLICY "Anyone can read published activities" ON activities FOR SELECT USING (is_published = true);
CREATE POLICY "Admin can read all activities" ON activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can insert activities" ON activities FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can update activities" ON activities FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can delete activities" ON activities FOR DELETE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- 新策略: site_stats (公开读取, 管理员写入)
CREATE POLICY "Anyone can read stats" ON site_stats FOR SELECT USING (true);
CREATE POLICY "Admin can manage stats" ON site_stats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Admin can insert stats" ON site_stats FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- ============================================================================
-- 将已有管理员加入 admin_users 表
-- ============================================================================
INSERT INTO admin_users (id, email, role)
SELECT id, email, 'super' FROM auth.users WHERE email = 'admin@gyzy.org'
ON CONFLICT (id) DO UPDATE SET role = 'super';
