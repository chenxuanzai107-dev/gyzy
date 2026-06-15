# uniCloud Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken CloudBase backend with a free-first uniCloud backend using one URL-enabled cloud function.

**Architecture:** Keep the static GitHub Pages site and preserve the existing `window.gyzyBackend` interface. Add one uniCloud HTTP cloud function, add a browser wrapper that calls it, and switch the HTML entry points from CloudBase scripts to uniCloud scripts.

**Tech Stack:** Static HTML/CSS/JavaScript, uniCloud cloud functions using CommonJS, uniCloud database APIs, Node.js syntax tests, GitHub Pages.

---

## File Structure

- Create `tests/gyzy-api.test.js`: Node tests for the uniCloud cloud function using a mocked database.
- Create `tests/unicloud-backend.test.js`: Node VM tests for the browser wrapper with mocked `fetch`, `window`, and `localStorage`.
- Create `unicloud/cloudfunctions/gyzy-api/index.js`: the only uniCloud cloud function; handles CORS, public actions, admin actions, token creation, and database access.
- Create `unicloud/cloudfunctions/gyzy-api/package.json`: cloud function metadata with no paid dependencies.
- Create `js/unicloud-backend.js`: browser-side adapter exposing the existing `window.gyzyBackend` methods.
- Modify `js/backend-config.js`: switch provider config from CloudBase to uniCloud and store service space id plus API URL placeholder.
- Modify `index.html`, `activity-detail.html`, `login.html`, `admin.html`: replace CloudBase SDK and script references with `js/unicloud-backend.js`.
- Modify `js/login-cloudbase.js` and `js/admin-cloudbase.js`: keep behavior but adjust user-facing setup messages from CloudBase to uniCloud.
- Create `unicloud/import/*.json`: copy seed data from `cloudbase/import/`.
- Create `unicloud/README.md`: deployment, database import, URL化, free-space renewal, and API URL configuration instructions.

---

### Task 1: Add Failing Tests

**Files:**
- Create: `tests/gyzy-api.test.js`
- Create: `tests/unicloud-backend.test.js`

- [ ] **Step 1: Create cloud function route tests**

Create `tests/gyzy-api.test.js` with mocked collections and checks for public reads, submissions, admin login, admin token enforcement, and CORS preflight.

```js
const assert = require('assert');
const api = require('../unicloud/cloudfunctions/gyzy-api/index.js');

function makeCollection(rows) {
  return {
    rows,
    where(query) {
      const filtered = rows.filter((row) => Object.keys(query).every((key) => row[key] === query[key]));
      return makeCollection(filtered);
    },
    orderBy(field, direction) {
      const sorted = rows.slice().sort((a, b) => String(a[field] || '').localeCompare(String(b[field] || '')));
      if (direction === 'desc') sorted.reverse();
      return makeCollection(sorted);
    },
    limit(n) {
      return makeCollection(rows.slice(0, n));
    },
    async get() {
      return { data: rows };
    },
    async add(data) {
      const row = Object.assign({ _id: 'id_' + (rows.length + 1) }, data);
      rows.push(row);
      return { id: row._id };
    },
    doc(id) {
      return {
        async get() {
          return { data: rows.filter((row) => row._id === id) };
        },
        async update(data) {
          const row = rows.find((item) => item._id === id);
          Object.assign(row, data);
          return { updated: row ? 1 : 0 };
        },
        async remove() {
          const index = rows.findIndex((item) => item._id === id);
          if (index >= 0) rows.splice(index, 1);
          return { deleted: index >= 0 ? 1 : 0 };
        }
      };
    }
  };
}

function installMockUniCloud() {
  const data = {
    activities: [
      { _id: 'a1', title: 'Published', date: '2026-01-01', is_published: true, is_featured: true },
      { _id: 'a2', title: 'Hidden', date: '2026-01-02', is_published: false, is_featured: false }
    ],
    site_stats: [{ _id: 's1', key: 'service_hours', value: 3200 }],
    site_settings: [{ _id: 'set1', key: 'hero_image_url', value: '' }],
    applications: [],
    messages: [],
    admin_users: [{ _id: 'admin', email: 'admin@example.com', password: 'pass123', role: 'admin' }]
  };

  global.uniCloud = {
    database() {
      return {
        collection(name) {
          if (!data[name]) data[name] = [];
          return makeCollection(data[name]);
        }
      };
    }
  };
  return data;
}

async function call(body, headers) {
  return api.main({
    httpMethod: 'POST',
    headers: headers || { origin: 'https://chenxuanzai107-dev.github.io' },
    body: JSON.stringify(body || {}),
    isBase64Encoded: false
  }, {});
}

(async () => {
  installMockUniCloud();
  const preflight = await api.main({ httpMethod: 'OPTIONS', headers: { origin: 'https://chenxuanzai107-dev.github.io' } }, {});
  assert.strictEqual(preflight.statusCode, 204);
  assert.strictEqual(preflight.headers['access-control-allow-origin'], 'https://chenxuanzai107-dev.github.io');

  const activities = JSON.parse((await call({ action: 'getPublicActivities', limit: 6 })).body);
  assert.strictEqual(activities.ok, true);
  assert.strictEqual(activities.data.length, 1);
  assert.strictEqual(activities.data[0].title, 'Published');

  const submit = JSON.parse((await call({ action: 'submitApplication', data: { name: 'A', department: 'B', contact: 'C' } })).body);
  assert.strictEqual(submit.ok, true);
  assert.ok(submit.data.id);

  const denied = JSON.parse((await call({ action: 'listDocuments', collection: 'applications' })).body);
  assert.strictEqual(denied.ok, false);
  assert.strictEqual(denied.code, 'UNAUTHORIZED');

  const login = JSON.parse((await call({ action: 'login', email: 'admin@example.com', password: 'pass123' })).body);
  assert.strictEqual(login.ok, true);
  assert.ok(login.data.token);

  const listed = JSON.parse((await call({ action: 'listDocuments', collection: 'applications' }, { origin: 'https://chenxuanzai107-dev.github.io', authorization: 'Bearer ' + login.data.token })).body);
  assert.strictEqual(listed.ok, true);
  assert.strictEqual(listed.data.length, 1);

  console.log('gyzy-api tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Create browser wrapper tests**

Create `tests/unicloud-backend.test.js` to verify request shape, token persistence, and admin authorization headers.

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const calls = [];
const storage = {};
const sandbox = {
  console,
  window: {
    GYZY_BACKEND_CONFIG: {
      provider: 'unicloud',
      unicloud: {
        apiUrl: 'https://example.com/gyzy-api',
        serviceSpaceId: 'mp-53d28a73-8fcd-4a91-a0c1-16249a142f32'
      },
      collections: {
        applications: 'applications',
        messages: 'messages',
        activities: 'activities',
        siteStats: 'site_stats',
        siteSettings: 'site_settings',
        adminUsers: 'admin_users'
      },
      defaults: { stats: { service_hours: 3200 } }
    }
  },
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  },
  fetch: async (url, options) => {
    calls.push({ url, options });
    const payload = JSON.parse(options.body);
    if (payload.action === 'login') {
      return { ok: true, text: async () => JSON.stringify({ ok: true, data: { token: 'token123', email: payload.email, role: 'admin' } }) };
    }
    return { ok: true, text: async () => JSON.stringify({ ok: true, data: [] }) };
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/unicloud-backend.js'), 'utf8'), sandbox);

(async () => {
  assert.strictEqual(sandbox.window.gyzyBackend.isConfigured(), true);
  await sandbox.window.gyzyBackend.login('admin@example.com', 'pass123');
  assert.strictEqual(storage.gyzy_unicloud_admin_token, 'token123');
  await sandbox.window.gyzyBackend.listDocuments('applications', {});
  const headers = calls[calls.length - 1].options.headers;
  assert.strictEqual(headers.Authorization, 'Bearer token123');
  await sandbox.window.gyzyBackend.logout();
  assert.strictEqual(storage.gyzy_unicloud_admin_token, undefined);
  console.log('unicloud-backend tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run tests and confirm they fail**

Run:

```powershell
node tests/gyzy-api.test.js
node tests/unicloud-backend.test.js
```

Expected: both fail because `unicloud/cloudfunctions/gyzy-api/index.js` and `js/unicloud-backend.js` do not exist yet.

---

### Task 2: Implement the uniCloud Cloud Function

**Files:**
- Create: `unicloud/cloudfunctions/gyzy-api/index.js`
- Create: `unicloud/cloudfunctions/gyzy-api/package.json`
- Test: `tests/gyzy-api.test.js`

- [ ] **Step 1: Add cloud function package metadata**

Create `unicloud/cloudfunctions/gyzy-api/package.json`:

```json
{
  "name": "gyzy-api",
  "version": "1.0.0",
  "description": "Free-first uniCloud API for gyzy static site",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: Add cloud function implementation**

Create `unicloud/cloudfunctions/gyzy-api/index.js` with these responsibilities:

- return CORS headers for `https://chenxuanzai107-dev.github.io`, `http://localhost`, and `http://127.0.0.1`;
- parse JSON and base64 request bodies;
- expose public actions without a token;
- require `Authorization: Bearer <token>` for admin actions;
- use one simple signed token format based on `email:timestamp:signature`;
- read/write the six existing collections;
- return `{ ok: true, data }` or `{ ok: false, code, message }`.

- [ ] **Step 3: Run cloud function tests**

Run:

```powershell
node tests/gyzy-api.test.js
```

Expected: `gyzy-api tests passed`.

- [ ] **Step 4: Commit**

Run:

```powershell
git add tests/gyzy-api.test.js unicloud/cloudfunctions/gyzy-api
git commit -m "feat: add unicloud api function"
```

---

### Task 3: Implement the Browser Backend Wrapper

**Files:**
- Create: `js/unicloud-backend.js`
- Test: `tests/unicloud-backend.test.js`

- [ ] **Step 1: Add browser wrapper implementation**

Create `js/unicloud-backend.js` so it exposes:

```js
window.gyzyBackend = {
  isConfigured,
  init,
  getSetting,
  setSetting,
  getSiteStats,
  getPublicActivities,
  getActivityById,
  submitApplication,
  submitMessage,
  login,
  logout,
  requireAdmin,
  listDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  uploadImage,
  resolveFileUrl,
  defaults,
  config
};
```

The wrapper must call the configured URL with `fetch`, store the admin token in `localStorage` under `gyzy_unicloud_admin_token`, and throw `Error` objects with `code` for failed API responses.

`uploadImage` returns a clear `UPLOAD_UNSUPPORTED` error in the first pass because cloud storage upload is intentionally out of scope.

- [ ] **Step 2: Run wrapper tests**

Run:

```powershell
node tests/unicloud-backend.test.js
```

Expected: `unicloud-backend tests passed`.

- [ ] **Step 3: Commit**

Run:

```powershell
git add tests/unicloud-backend.test.js js/unicloud-backend.js
git commit -m "feat: add unicloud browser backend"
```

---

### Task 4: Switch Static Pages to uniCloud

**Files:**
- Modify: `js/backend-config.js`
- Modify: `index.html`
- Modify: `activity-detail.html`
- Modify: `login.html`
- Modify: `admin.html`
- Modify: `js/login-cloudbase.js`
- Modify: `js/admin-cloudbase.js`

- [ ] **Step 1: Update backend config**

Replace CloudBase config with uniCloud config:

```js
window.GYZY_BACKEND_CONFIG = {
  provider: 'unicloud',
  unicloud: {
    serviceSpaceId: 'mp-53d28a73-8fcd-4a91-a0c1-16249a142f32',
    apiUrl: '',
    apiPath: '/gyzy-api'
  },
  collections: {
    applications: 'applications',
    messages: 'messages',
    activities: 'activities',
    siteStats: 'site_stats',
    siteSettings: 'site_settings',
    adminUsers: 'admin_users'
  },
  defaults: {
    heroImage: 'assets/images/hero-building.png',
    stats: {
      service_hours: 3200,
      volunteers_count: 1288,
      activities_count: 32,
      covered_people: 2000
    }
  }
};
```

- [ ] **Step 2: Replace script tags**

In all HTML entry points, remove:

```html
<script src="https://static.cloudbase.net/cloudbase-js-sdk/latest/cloudbase.full.js"></script>
<script src="js/cloudbase-backend.js?v=cloudbase-domestic-20260615"></script>
```

Add:

```html
<script src="js/unicloud-backend.js?v=unicloud-20260616"></script>
```

- [ ] **Step 3: Adjust setup text**

Keep file names for minimal diff, but change user-facing CloudBase setup messages to say uniCloud and `apiUrl`.

- [ ] **Step 4: Run syntax checks**

Run:

```powershell
node --check js/backend-config.js
node --check js/unicloud-backend.js
node --check js/login-cloudbase.js
node --check js/admin-cloudbase.js
```

Expected: no syntax errors.

- [ ] **Step 5: Commit**

Run:

```powershell
git add js/backend-config.js index.html activity-detail.html login.html admin.html js/login-cloudbase.js js/admin-cloudbase.js
git commit -m "feat: switch pages to unicloud backend"
```

---

### Task 5: Add uniCloud Data and Deployment Docs

**Files:**
- Create: `unicloud/import/activities.json`
- Create: `unicloud/import/admin_users.json`
- Create: `unicloud/import/applications.json`
- Create: `unicloud/import/messages.json`
- Create: `unicloud/import/site_settings.json`
- Create: `unicloud/import/site_stats.json`
- Create: `unicloud/README.md`

- [ ] **Step 1: Copy seed files**

Copy the files from `cloudbase/import/` to `unicloud/import/`.

- [ ] **Step 2: Add deployment README**

Create `unicloud/README.md` with:

- service space id;
- free-space renewal warning;
- six collection names;
- import file mapping;
- HBuilderX upload instructions for `gyzy-api`;
- URL化 path `/gyzy-api`;
- `js/backend-config.js` `apiUrl` fill-in instructions;
- admin account seed instructions;
- verification checklist.

- [ ] **Step 3: Commit**

Run:

```powershell
git add unicloud/import unicloud/README.md
git commit -m "docs: add unicloud deployment guide"
```

---

### Task 6: Final Verification

**Files:**
- Test all changed files.

- [ ] **Step 1: Run automated tests**

Run:

```powershell
node tests/gyzy-api.test.js
node tests/unicloud-backend.test.js
```

Expected:

```text
gyzy-api tests passed
unicloud-backend tests passed
```

- [ ] **Step 2: Run syntax checks**

Run:

```powershell
Get-ChildItem -Path js,unicloud/cloudfunctions/gyzy-api,tests -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```

Expected: no syntax errors.

- [ ] **Step 3: Run local smoke test**

Run:

```powershell
Start-Process -WindowStyle Hidden powershell -ArgumentList '-NoProfile','-Command','cd C:\Users\ccc\gyzy-pages; python -m http.server 8765'
```

Open `http://127.0.0.1:8765/index.html` with Playwright and verify the page loads, activities fall back to static data while `apiUrl` is empty, and no CloudBase network requests occur.

- [ ] **Step 4: Commit any final fixes**

Run:

```powershell
git status --short
git add <changed-files>
git commit -m "test: verify unicloud migration"
```

Only commit if verification required additional file changes.

---

## Self-Review

- Spec coverage: the plan covers one URL-enabled cloud function, the existing `window.gyzyBackend` interface, six existing collections, CORS, free-usage controls, seed data, docs, and verification.
- Placeholder scan: the only intentionally blank value is `apiUrl: ''`, because the actual URL化 endpoint is only available after uploading the cloud function in uniCloud.
- Type consistency: action names match the design and the wrapper methods match the current frontend/admin expectations.
