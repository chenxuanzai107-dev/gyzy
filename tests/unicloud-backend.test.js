const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const wrapperPath = path.join(__dirname, '../js/unicloud-backend.js');
assert.ok(fs.existsSync(wrapperPath), 'Expected js/unicloud-backend.js to exist');

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
      return {
        ok: true,
        text: async () => JSON.stringify({
          ok: true,
          data: { token: 'token123', email: payload.email, role: 'admin' }
        })
      };
    }
    if (payload.action === 'uploadImage') {
      return {
        ok: true,
        text: async () => JSON.stringify({ ok: false, code: 'UPLOAD_UNSUPPORTED', message: 'unsupported' })
      };
    }
    return { ok: true, text: async () => JSON.stringify({ ok: true, data: [] }) };
  },
  FormData: class FormData {}
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(wrapperPath, 'utf8'), sandbox);

(async () => {
  assert.strictEqual(sandbox.window.gyzyBackend.isConfigured(), true);

  await sandbox.window.gyzyBackend.login('admin@example.com', 'pass123');
  assert.strictEqual(storage.gyzy_unicloud_admin_token, 'token123');

  await sandbox.window.gyzyBackend.listDocuments('applications', {});
  const headers = calls[calls.length - 1].options.headers;
  assert.strictEqual(headers.Authorization, 'Bearer token123');

  await sandbox.window.gyzyBackend.logout();
  assert.strictEqual(storage.gyzy_unicloud_admin_token, undefined);

  await assert.rejects(
    () => sandbox.window.gyzyBackend.uploadImage({ type: 'image/png', size: 10, name: 'x.png' }, 'hero'),
    (err) => err.code === 'UPLOAD_UNSUPPORTED'
  );

  console.log('unicloud-backend tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
