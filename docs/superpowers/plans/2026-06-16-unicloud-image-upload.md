# uniCloud Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admin Banner and activity-cover image uploads in the current free-first uniCloud migration.

**Architecture:** The static admin page reads selected browser files as Base64 data URLs and sends them to the existing URLized `gyzy-api` cloud function. The cloud function validates admin auth, file type, and size, uploads to uniCloud built-in cloud storage, and returns a URL/file ID that existing settings and activity documents can store.

**Tech Stack:** Plain browser JavaScript, uniCloud URLized cloud function, Node.js 16 cloud runtime, existing Node-based tests.

---

### Task 1: Backend Upload Action

**Files:**
- Modify: `tests/gyzy-api.test.js`
- Modify: `uniCloud-aliyun/cloudfunctions/gyzy-api/index.js`

- [x] **Step 1: Write failing backend tests**

Add coverage for authenticated `uploadImage`, unauthenticated rejection, invalid MIME rejection, and file-size rejection.

- [x] **Step 2: Run backend tests to verify failure**

Run: `node tests/gyzy-api.test.js`

Expected: fail because `uploadImage` is not implemented in `gyzy-api`.

- [x] **Step 3: Implement backend upload**

Add `uploadImage` to `ADMIN_ACTIONS`. Decode data URLs, enforce `image/jpeg`, `image/png`, and `image/webp`, cap size at 2 MB, generate safe names under `gyzy/<folder>/`, call `uniCloud.uploadFile`, and resolve a public/temp URL when possible.

- [x] **Step 4: Run backend tests**

Run: `node tests/gyzy-api.test.js`

Expected: pass.

### Task 2: Browser Adapter Upload

**Files:**
- Modify: `tests/unicloud-backend.test.js`
- Modify: `js/unicloud-backend.js`

- [x] **Step 1: Write failing browser tests**

Update the wrapper test to expect `uploadImage(file, folder)` to read the file, call `uploadImage`, and return the URL from the cloud function.

- [x] **Step 2: Run wrapper test to verify failure**

Run: `node tests/unicloud-backend.test.js`

Expected: fail because the wrapper still throws `UPLOAD_UNSUPPORTED`.

- [x] **Step 3: Implement browser upload**

Add file validation, Base64 reading with `FileReader` or `arrayBuffer`, and call the existing authenticated API.

- [x] **Step 4: Run wrapper test**

Run: `node tests/unicloud-backend.test.js`

Expected: pass.

### Task 3: Deploy And Verify

**Files:**
- Modify: `uniCloud-aliyun/README.md`
- Modify: `uniCloud-aliyun/部署说明.md`

- [x] **Step 1: Update deployment docs**

Document that image upload is now enabled with a 2 MB per-image limit and consumes cloud storage/CDN quota.

- [x] **Step 2: Run full verification**

Run:

```powershell
node tests/gyzy-api.test.js
node tests/unicloud-backend.test.js
node tests/unicloud-schema.test.js
Get-ChildItem -Path js,uniCloud-aliyun/cloudfunctions/gyzy-api,tests -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```

Expected: all pass with exit code 0.

- [x] **Step 3: Upload cloud function**

Run:

```powershell
& 'D:\桌面\HBuilderX.5.07.2026041006\HBuilderX\cli.exe' cloud functions --upload cloudfunction --prj gyzy-pages --provider aliyun --name gyzy-api --force
```

Expected: HBuilderX reports `gyzy-api` upload success.

- [x] **Step 4: Commit and push**

Commit message: `feat: enable unicloud image upload`

- [x] **Step 5: Live smoke test**

Call the URLized API with a tiny admin-authenticated PNG upload and confirm it returns a URL.
