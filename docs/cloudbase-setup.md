# 建工青协官网 CloudBase 国内后端配置

当前网站代码已经切换为 CloudBase 优先。要让后台、报名、留言、活动、统计、首页 Banner 真正可用，需要完成以下配置。

## 1. 创建 CloudBase 环境

1. 打开腾讯云 CloudBase 控制台。
2. 创建一个新环境，地域建议选择广州或上海。
3. 复制环境 ID。
4. 修改 `js/backend-config.js`：

```js
window.GYZY_BACKEND_CONFIG = {
  provider: 'cloudbase',
  cloudbase: {
    envId: '你的环境ID',
    region: 'ap-guangzhou',
    enableAnonymousLogin: true,
    storageRoot: 'site-assets'
  }
};
```

## 2. 配置 Web 安全域名

在 CloudBase 环境配置 / 安全配置中添加：

```text
chenxuanzai107-dev.github.io
```

本地测试时可以再添加：

```text
localhost
127.0.0.1
```

## 3. 开启登录方式

在 CloudBase 登录授权中开启：

1. 匿名登录：用于前台读取活动、提交报名、提交留言。
2. 邮箱密码登录：用于后台管理员登录。

## 4. 创建数据库集合

创建以下集合：

```text
applications
messages
activities
site_stats
site_settings
admin_users
```

推荐字段：

### applications

```json
{
  "name": "张三",
  "department": "土木工程2024级1班",
  "contact": "13800000000",
  "direction": "组织部",
  "intro": "个人介绍",
  "status": "pending",
  "admin_note": "",
  "created_at": "2026-06-15T00:00:00.000Z",
  "updated_at": "2026-06-15T00:00:00.000Z"
}
```

### messages

```json
{
  "name": "测试用户",
  "contact": "123456",
  "content": "留言内容",
  "status": "pending",
  "is_handled": false,
  "created_at": "2026-06-15T00:00:00.000Z",
  "updated_at": "2026-06-15T00:00:00.000Z"
}
```

### activities

```json
{
  "title": "以物易物",
  "category": "爱心公益",
  "date": "2026-04-13",
  "time": "10:00-18:00",
  "location": "北华饭堂",
  "volunteers_count": 20,
  "service_hours": 8,
  "description": "活动简介",
  "detail_content": "活动详细内容",
  "cover_image": "",
  "is_published": true,
  "is_featured": true,
  "created_at": "2026-06-15T00:00:00.000Z",
  "updated_at": "2026-06-15T00:00:00.000Z"
}
```

### site_stats

每条统计一条记录：

```json
{ "key": "service_hours", "value": 3200 }
{ "key": "volunteers_count", "value": 1288 }
{ "key": "activities_count", "value": 32 }
{ "key": "covered_people", "value": 2000 }
```

### site_settings

```json
{ "key": "hero_image_url", "value": "" }
```

### admin_users

管理员记录至少包含邮箱：

```json
{
  "email": "admin@gyzy.org",
  "role": "admin"
}
```

如果 CloudBase 登录用户能看到 uid，也建议加：

```json
{
  "uid": "CloudBase登录用户UID",
  "email": "admin@gyzy.org",
  "role": "admin"
}
```

## 5. 安全规则建议

最稳定的生产方案是：后台写操作通过云函数判断管理员权限。当前静态网页为了尽快恢复可用，前端会直接访问数据库集合，所以安全规则至少要满足：

1. `activities`：所有人可读 `is_published = true` 的活动；管理员可全部管理。
2. `site_stats`：所有人可读；管理员可写。
3. `site_settings`：所有人可读；管理员可写。
4. `applications`：所有人可新增；管理员可读写删。
5. `messages`：所有人可新增；管理员可读写删。
6. `admin_users`：只允许登录用户读取自己的管理员记录，或只允许管理员读取。

CloudBase 安全规则语法与环境版本有关，若规则配置不熟悉，建议先用临时宽松规则完成数据迁移和验收，再收紧到管理员云函数方案。

## 6. 云存储

CloudBase 不需要像 Supabase 那样创建 `site-assets` bucket。代码会把文件上传到云存储路径：

```text
site-assets/hero/...
site-assets/activity-covers/...
```

前台读取时会把 CloudBase 文件 ID 解析为可访问 URL。

## 7. 验收顺序

1. 填写 `js/backend-config.js` 的 `envId`。
2. GitHub Pages 重新部署。
3. `Ctrl + F5` 强制刷新。
4. 打开首页，确认没有 “CloudBase 环境未配置”。
5. 前台提交留言，后台留言管理点击刷新能看到数据。
6. 后台首页设置上传 Banner，前台刷新后能显示。
7. 后台新增活动，首页活动风采能显示并能进入详情页。
