# uniCloud Deployment Guide / 部署说明

This folder contains the free-first uniCloud backend for the gyzy static site.

本目录是建工青协官网的 uniCloud 免费后端。网页仍然部署在 GitHub Pages，后端只使用一个 URL 化云函数。

## Service Space

Use this service space:

```text
mp-53d28a73-8fcd-4a91-a0c1-16249a142f32
```

Prefer the free Alibaba Cloud service space. Free spaces must be renewed manually before expiry in the uniCloud console.

建议使用阿里云免费服务空间。免费空间到期前需要在 uniCloud 控制台手动续期。

## Collections

Create these six database collections in the uniCloud web console:

```text
applications
messages
activities
site_stats
site_settings
admin_users
```

Import seed data from `uniCloud/import/`:

```text
activities     -> uniCloud/import/activities.json
site_stats     -> uniCloud/import/site_stats.json
site_settings  -> uniCloud/import/site_settings.json
admin_users    -> uniCloud/import/admin_users.json
applications   -> uniCloud/import/applications.json
messages       -> uniCloud/import/messages.json
```

The default admin seed is:

```text
email: admin@gyzy.org
password: ChangeMe123!
```

Change this email and password after import. The first migration uses a simple free admin token instead of uni-id.

导入后请尽快修改管理员邮箱和密码。第一版迁移为了免费和简单，暂时不用 uni-id。

## Cloud Function

Upload this folder as one cloud function:

```text
uniCloud/cloudfunctions/gyzy-api
```

In the uniCloud console or HBuilderX:

1. Bind the project to service space `mp-53d28a73-8fcd-4a91-a0c1-16249a142f32`.
2. Upload `gyzy-api`.
3. Open cloud function URL access.
4. Set the URL path to:

```text
/gyzy-api
```

5. Copy the complete generated HTTP URL.

中文步骤：

1. 用 HBuilderX 打开 `C:\Users\ccc\gyzy-pages`。
2. 绑定服务空间 `mp-53d28a73-8fcd-4a91-a0c1-16249a142f32`。
3. 右键 `uniCloud/cloudfunctions/gyzy-api`，选择上传部署。
4. 在 uniCloud 控制台为 `gyzy-api` 开启 URL 化。
5. URL 路径填：

```text
/gyzy-api
```

6. 复制生成的完整 HTTP 地址。

## Web Safe Domain / 跨域安全域名

For a GitHub Pages frontend, configure the uniCloud web safe domain:

```text
chenxuanzai107-dev.github.io
```

For local testing, optionally add:

```text
127.0.0.1:*
localhost:*
```

中文：因为前端网页部署在 GitHub Pages，必须在 uniCloud 后台给云函数绑定安全域名：

```text
chenxuanzai107-dev.github.io
```

本地测试时再加：

```text
127.0.0.1:*
localhost:*
```

注意端口也算跨域配置的一部分，本地端口不固定时使用 `:*`。

## Static Site Config

Open:

```text
js/backend-config.js
```

Fill `apiUrl` with the complete URL-enabled cloud function address:

```js
unicloud: {
  serviceSpaceId: 'mp-53d28a73-8fcd-4a91-a0c1-16249a142f32',
  apiUrl: 'https://your-unicloud-domain.example.com/gyzy-api',
  apiPath: '/gyzy-api'
}
```

Commit and push the change to GitHub Pages after filling the URL.

## Free-Usage Notes

- Keep one cloud function only.
- Do not add scheduled tasks.
- Keep static hosting on GitHub Pages.
- Keep image upload disabled in the first pass.
- Use external image URLs or local static images for now.
- Renew the free service space before it expires.

## Verification

After deployment:

1. Open the homepage and confirm activities and stats load from uniCloud.
2. Submit one application.
3. Submit one message.
4. Open `login.html`.
5. Log in with the admin seed account.
6. Confirm the admin dashboard can list applications, messages, activities, stats, and settings.
7. Change the admin seed password in `admin_users`.

## Troubleshooting

If the page says the backend is not configured, `apiUrl` is still empty or not deployed to GitHub Pages.

If login fails, check `admin_users.email` and `admin_users.password`.

If browser requests fail with CORS, confirm that `gyzy-api` is deployed from the code in this repo. The function returns CORS headers for GitHub Pages, localhost, and 127.0.0.1.
