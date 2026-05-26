-- ============================================================================
-- 建工青协 Supabase 数据库 Schema
-- 部署: 复制到 Supabase SQL Editor 执行
-- ============================================================================

-- 1. 报名申请表
CREATE TABLE IF NOT EXISTS applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  contact TEXT NOT NULL,
  direction TEXT NOT NULL,
  available_time TEXT NOT NULL,
  intro TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'contacted')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 留言表
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  content TEXT NOT NULL,
  is_handled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 活动表
CREATE TABLE IF NOT EXISTS activities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  participants INT DEFAULT 0,
  service_hours INT DEFAULT 0,
  description TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  show_on_home BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 统计数据表
CREATE TABLE IF NOT EXISTS site_stats (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value INT NOT NULL,
  label TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认统计数据
INSERT INTO site_stats (key, value, label) VALUES
  ('volunteers', 528, '注册志愿者'),
  ('yearly_activities', 86, '年度活动'),
  ('service_hours', 3200, '服务总时长'),
  ('people_served', 5000, '服务覆盖人数')
ON CONFLICT (key) DO NOTHING;

-- 插入示例活动
INSERT INTO activities (title, category, event_date, event_time, location, participants, service_hours, description, show_on_home) VALUES
  ('社区敬老院慰问活动', '社区服务', '2026-03-15', '08:00-12:00', '茂名市养老服务中心', 35, 4, '每周六上午组织志愿者前往茂名市养老服务中心，为老人们送去关爱与陪伴。', true),
  ('"小小建筑师"科普课堂', '科普教育', '2026-03-22', '14:00-17:00', '茂名市茂南第一小学', 20, 3, '发挥建筑专业特长，为小学生开展建筑知识科普。', true),
  ('校园环保清洁行动', '环保公益', '2026-04-05', '09:00-16:00', '广东石油化工学院校园', 50, 7, '组织志愿者开展环保清洁、垃圾分类宣传等活动。', true),
  ('暑期乡村支教行动', '支教助学', '2026-07-15', '全天', '茂名市电白区乡村小学', 25, 80, '前往乡村小学开展为期两周的支教活动。', true),
  ('"爱心传递"校园义卖', '爱心公益', '2026-05-10', '10:00-18:00', '图书馆前广场', 40, 8, '手工制作物品义卖，善款捐赠儿童福利院。', true),
  ('新生迎新志愿服务', '校园服务', '2026-09-01', '07:00-19:00', '各报到点', 60, 12, '为新生提供引导、行李搬运、咨询答疑等服务。', true);

-- ============================================================================
-- RLS 策略
-- ============================================================================

-- 开启 RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

-- applications: 任何人都可以提交，管理员可以读写
CREATE POLICY "Anyone can insert applications" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read applications" ON applications FOR SELECT USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can update applications" ON applications FOR UPDATE USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can delete applications" ON applications FOR DELETE USING (
  auth.role() = 'authenticated'
);

-- messages: 任何人都可以提交，管理员可以读写
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read messages" ON messages FOR SELECT USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can update messages" ON messages FOR UPDATE USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can delete messages" ON messages FOR DELETE USING (
  auth.role() = 'authenticated'
);

-- activities: 任何人可读，管理员可写
CREATE POLICY "Anyone can read activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Admin can insert activities" ON activities FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can update activities" ON activities FOR UPDATE USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can delete activities" ON activities FOR DELETE USING (
  auth.role() = 'authenticated'
);

-- site_stats: 任何人可读，管理员可写
CREATE POLICY "Anyone can read stats" ON site_stats FOR SELECT USING (true);
CREATE POLICY "Admin can update stats" ON site_stats FOR UPDATE USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "Admin can insert stats" ON site_stats FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);
