# CloudBase 初始化包

这个目录用于把建工青协官网从旧海外后端切换到国内 CloudBase。

## 文件

- `seed-data.json`：可以手动导入到 CloudBase 各集合的初始数据。

## 使用方式

1. 在 CloudBase 控制台创建集合：
   - `applications`
   - `messages`
   - `activities`
   - `site_stats`
   - `site_settings`
   - `admin_users`
2. 依次导入 `cloudbase/import/` 下对应文件：
   - `activities` 导入 `cloudbase/import/activities.json`
   - `site_stats` 导入 `cloudbase/import/site_stats.json`
   - `site_settings` 导入 `cloudbase/import/site_settings.json`
   - `admin_users` 导入 `cloudbase/import/admin_users.json`
   - `applications` 可以先不导入，空集合即可
   - `messages` 可以先不导入，空集合即可
3. 在 CloudBase 身份认证中创建管理员账号。
4. 把管理员账号邮箱写入 `admin_users` 集合。
5. 如果能看到 CloudBase 用户 UID，也把 UID 写入 `admin_users.uid`，管理员校验会优先按 UID 匹配，再按邮箱匹配。

## 必须配置

修改 `js/backend-config.js`：

```js
envId: '你的 CloudBase 环境 ID'
```

然后提交并推送到 GitHub Pages。
