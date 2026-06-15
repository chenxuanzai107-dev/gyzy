# uniCloud Migration Design

## Decision

Migrate the site from CloudBase to uniCloud using one URL-enabled cloud function.

Use service space:

```text
mp-53d28a73-8fcd-4a91-a0c1-16249a142f32
```

The target is the free uniCloud service-space path, preferably Alibaba Cloud free space. The implementation must keep cloud usage small by using one cloud function, no scheduled tasks, no extra paid services, and the existing GitHub Pages static hosting.

## Architecture

The existing pages stay as static HTML, CSS, and JavaScript hosted on GitHub Pages.

The browser calls `window.gyzyBackend`, preserving the same interface that the current CloudBase integration uses. The CloudBase implementation will be replaced with a uniCloud implementation:

- `js/backend-config.js` stores the provider, service space id, and API URL.
- `js/unicloud-backend.js` exposes the same `window.gyzyBackend` methods.
- `unicloud/cloudfunctions/gyzy-api/index.js` handles all HTTP actions.
- `unicloud/database/` and `unicloud/import/` contain database setup and seed data.

The cloud function is URL-enabled as `/gyzy-api`. It receives an `action` value and routes requests internally.

## Data Model

Keep the existing collection names and field shapes so the current UI needs minimal changes:

- `applications`
- `messages`
- `activities`
- `site_stats`
- `site_settings`
- `admin_users`

Documents keep `_id`, `created_at`, and `updated_at` conventions. Existing JSON seed data can be reused after moving it from `cloudbase/import/` to `unicloud/import/`.

## API Surface

Public actions:

- `getPublicActivities`
- `getActivityById`
- `getSiteStats`
- `getSetting`
- `submitApplication`
- `submitMessage`

Admin actions:

- `login`
- `requireAdmin`
- `listDocuments`
- `addDocument`
- `updateDocument`
- `deleteDocument`
- `setSetting`

Admin authentication starts with a simple password/token held in cloud function config or environment variables, because this site needs a fast, free migration. The token is stored in browser `localStorage` after login and sent with admin API calls. This avoids adding uni-id as a first migration step. A later hardening pass can move to uni-id.

## File Uploads

To keep the first free migration small, image upload support is handled in two phases:

1. Initial migration supports external image URLs and existing local/static images.
2. Cloud storage upload can be added after the core data path is verified.

This keeps the first deployment focused on restoring homepage data, applications, messages, activities, stats, and admin editing without adding storage quota complexity immediately.

## Error Handling

The browser backend wrapper normalizes uniCloud responses into the same success/error shape the UI already expects.

The cloud function returns CORS headers for GitHub Pages and handles `OPTIONS` preflight requests. Errors include a stable `code` and readable `message`.

Public form submissions keep the current mail fallback behavior if the uniCloud API is unavailable.

## Free-Usage Controls

- Use one cloud function only.
- Do not add scheduled tasks.
- Keep GitHub Pages for static hosting.
- Use small JSON requests and limit list responses.
- Keep image storage out of the first pass unless needed.
- Document that the free Alibaba Cloud service space must be manually renewed before expiry.

## Verification

Local verification:

- Run static syntax checks for JavaScript files.
- Serve the site locally and confirm pages load with the uniCloud wrapper configured.

Live verification:

- Deploy the cloud function and configure URL access.
- Update `js/backend-config.js` with the URL-enabled function endpoint.
- Push GitHub Pages changes.
- Verify homepage activities/stats load.
- Submit a test application and message.
- Log in to admin.
- Confirm admin can list, update, add, and delete records.

## Out of Scope

- Rebuilding the site as a uni-app project.
- Adding paid services.
- Adding scheduled jobs.
- Full uni-id integration in the first pass.
- Reworking the visual design.
