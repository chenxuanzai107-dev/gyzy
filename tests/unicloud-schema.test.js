const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, '../uniCloud-aliyun/database');
const collections = [
  'applications',
  'messages',
  'activities',
  'site_stats',
  'site_settings',
  'admin_users'
];

for (const collection of collections) {
  const schemaPath = path.join(schemaDir, collection + '.schema.json');
  assert.ok(fs.existsSync(schemaPath), `Expected schema for ${collection}`);

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert.strictEqual(schema.bsonType, 'object', `${collection} must be an object schema`);
  assert.ok(schema.properties && schema.properties._id, `${collection} must declare _id`);
  assert.deepStrictEqual(
    schema.permission,
    { read: false, create: false, update: false, delete: false, count: false },
    `${collection} must not allow direct client database access`
  );

  const initDataPath = path.join(schemaDir, collection + '.init_data.json');
  assert.ok(fs.existsSync(initDataPath), `Expected init data for ${collection}`);
  const initData = JSON.parse(fs.readFileSync(initDataPath, 'utf8'));
  assert.ok(Array.isArray(initData), `${collection} init data must be an array`);
}

console.log('unicloud-schema tests passed');
