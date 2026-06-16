const assert = require('assert');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../uniCloud/cloudfunctions/gyzy-api/index.js');
assert.ok(fs.existsSync(apiPath), 'Expected uniCloud/cloudfunctions/gyzy-api/index.js to exist');

const api = require(apiPath);

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
          if (row) Object.assign(row, data);
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

  const preflight = await api.main({
    httpMethod: 'OPTIONS',
    headers: { origin: 'https://chenxuanzai107-dev.github.io' }
  }, {});
  assert.strictEqual(preflight.statusCode, 204);
  assert.strictEqual(preflight.headers['access-control-allow-origin'], 'https://chenxuanzai107-dev.github.io');

  const activities = JSON.parse((await call({ action: 'getPublicActivities', limit: 6 })).body);
  assert.strictEqual(activities.ok, true);
  assert.strictEqual(activities.data.length, 1);
  assert.strictEqual(activities.data[0].title, 'Published');

  const detail = JSON.parse((await call({ action: 'getActivityById', id: 'a1' })).body);
  assert.strictEqual(detail.ok, true);
  assert.strictEqual(detail.data.title, 'Published');

  const hidden = JSON.parse((await call({ action: 'getActivityById', id: 'a2' })).body);
  assert.strictEqual(hidden.ok, true);
  assert.strictEqual(hidden.data, null);

  const stats = JSON.parse((await call({ action: 'getSiteStats' })).body);
  assert.strictEqual(stats.ok, true);
  assert.strictEqual(stats.data.service_hours, 3200);

  const submit = JSON.parse((await call({
    action: 'submitApplication',
    data: { name: 'A', department: 'B', contact: 'C' }
  })).body);
  assert.strictEqual(submit.ok, true);
  assert.ok(submit.data.id);

  const denied = JSON.parse((await call({ action: 'listDocuments', collection: 'applications' })).body);
  assert.strictEqual(denied.ok, false);
  assert.strictEqual(denied.code, 'UNAUTHORIZED');

  const login = JSON.parse((await call({ action: 'login', email: 'admin@example.com', password: 'pass123' })).body);
  assert.strictEqual(login.ok, true);
  assert.ok(login.data.token);

  const listed = JSON.parse((await call(
    { action: 'listDocuments', collection: 'applications' },
    {
      origin: 'https://chenxuanzai107-dev.github.io',
      authorization: 'Bearer ' + login.data.token
    }
  )).body);
  assert.strictEqual(listed.ok, true);
  assert.strictEqual(listed.data.length, 1);

  console.log('gyzy-api tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
