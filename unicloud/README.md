# uniCloud Deployment Guide

This folder contains the free-first uniCloud backend for the gyzy static site.

## Service Space

Use this service space:

```text
mp-53d28a73-8fcd-4a91-a0c1-16249a142f32
```

Prefer the free Alibaba Cloud service space. Free spaces must be renewed manually before expiry in the uniCloud console.

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

Import seed data from `unicloud/import/`:

```text
activities     -> unicloud/import/activities.json
site_stats     -> unicloud/import/site_stats.json
site_settings  -> unicloud/import/site_settings.json
admin_users    -> unicloud/import/admin_users.json
applications   -> unicloud/import/applications.json
messages       -> unicloud/import/messages.json
```

The default admin seed is:

```text
email: admin@gyzy.org
password: ChangeMe123!
```

Change this email and password after import. The first migration uses a simple free admin token instead of uni-id.

## Cloud Function

Upload this folder as one cloud function:

```text
unicloud/cloudfunctions/gyzy-api
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
