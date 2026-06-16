'use strict';

const crypto = require('crypto');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://chenxuanzai107-dev.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

const COLLECTIONS = {
  applications: 'applications',
  messages: 'messages',
  activities: 'activities',
  siteStats: 'site_stats',
  siteSettings: 'site_settings',
  adminUsers: 'admin_users'
};

const ADMIN_ACTIONS = {
  requireAdmin: true,
  listDocuments: true,
  addDocument: true,
  updateDocument: true,
  deleteDocument: true,
  setSetting: true,
  uploadImage: true
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function nowIso() {
  return new Date().toISOString();
}

function getSecret() {
  return (typeof process !== 'undefined' && process.env && process.env.GYZY_ADMIN_SECRET)
    || 'gyzy-unicloud-free-secret';
}

function normalizeOrigin(origin) {
  if (!origin) return '';
  return String(origin).replace(/\/$/, '');
}

function getOrigin(event) {
  const headers = event.headers || {};
  return normalizeOrigin(headers.origin || headers.Origin || '');
}

function corsHeaders(event) {
  const origin = getOrigin(event);
  const allowed = DEFAULT_ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : DEFAULT_ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '86400',
    'content-type': 'application/json; charset=utf-8'
  };
}

function httpResponse(event, statusCode, payload) {
  return {
    mpserverlessComposedResponse: true,
    isBase64Encoded: false,
    statusCode,
    headers: corsHeaders(event),
    body: payload == null ? '' : JSON.stringify(payload)
  };
}

function ok(event, data) {
  return httpResponse(event, 200, { ok: true, data });
}

function fail(event, statusCode, code, message) {
  return httpResponse(event, statusCode, { ok: false, code, message });
}

function parseBody(event) {
  if (!event) return {};
  if (event.queryStringParameters && event.httpMethod === 'GET') {
    return event.queryStringParameters;
  }
  if (!event.body) return {};
  let text = event.body;
  if (event.isBase64Encoded) {
    text = Buffer.from(text, 'base64').toString('utf8');
  }
  if (typeof text !== 'string') return text || {};
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return {};
  }
}

function getDb() {
  if (!uniCloud || typeof uniCloud.database !== 'function') {
    throw Object.assign(new Error('uniCloud database is unavailable'), { code: 'DB_UNAVAILABLE' });
  }
  return uniCloud.database();
}

function collectionName(key) {
  if (!key) return '';
  return COLLECTIONS[key] || key;
}

function assertKnownCollection(key) {
  const name = collectionName(key);
  const allowed = Object.keys(COLLECTIONS).map((item) => COLLECTIONS[item]);
  if (allowed.indexOf(name) === -1) {
    throw Object.assign(new Error('Collection is not allowed'), { code: 'INVALID_COLLECTION' });
  }
  return name;
}

function applyQuery(ref, options) {
  const opts = options || {};
  let next = ref;
  if (opts.where && typeof next.where === 'function') next = next.where(opts.where);
  if (opts.orderBy && typeof next.orderBy === 'function') {
    next = next.orderBy(opts.orderBy.field, opts.orderBy.direction || 'desc');
  }
  if (opts.limit && typeof next.limit === 'function') next = next.limit(Math.min(Number(opts.limit) || 20, 100));
  return next;
}

function rowsFromResult(result) {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data) return [result.data];
  if (Array.isArray(result)) return result;
  return [];
}

async function listRows(collectionKey, options) {
  const db = getDb();
  const name = assertKnownCollection(collectionKey);
  const res = await applyQuery(db.collection(name), options || {}).get();
  return rowsFromResult(res);
}

async function getRow(collectionKey, id) {
  const db = getDb();
  const name = assertKnownCollection(collectionKey);
  if (!id) return null;
  const col = db.collection(name);
  if (typeof col.doc === 'function') {
    const res = await col.doc(id).get();
    const rows = rowsFromResult(res);
    if (rows.length) return rows[0];
  }
  const rows = await listRows(collectionKey, { where: { _id: id }, limit: 1 });
  return rows[0] || null;
}

async function addRow(collectionKey, data) {
  const db = getDb();
  const name = assertKnownCollection(collectionKey);
  const payload = Object.assign({}, data || {}, {
    created_at: (data && data.created_at) || nowIso(),
    updated_at: nowIso()
  });
  const res = await db.collection(name).add(payload);
  return { id: res.id || res._id || payload._id };
}

async function updateRow(collectionKey, id, data) {
  const db = getDb();
  const name = assertKnownCollection(collectionKey);
  if (!id) throw Object.assign(new Error('Missing record id'), { code: 'MISSING_ID' });
  const payload = Object.assign({}, data || {}, { updated_at: nowIso() });
  delete payload._id;
  delete payload.id;
  return db.collection(name).doc(id).update(payload);
}

async function deleteRow(collectionKey, id) {
  const db = getDb();
  const name = assertKnownCollection(collectionKey);
  if (!id) throw Object.assign(new Error('Missing record id'), { code: 'MISSING_ID' });
  return db.collection(name).doc(id).remove();
}

function signToken(email, issuedAt) {
  return crypto.createHmac('sha256', getSecret()).update(email + ':' + issuedAt).digest('hex');
}

function createToken(admin) {
  const email = admin.email || '';
  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({
    email,
    role: admin.role || 'admin',
    issuedAt,
    signature: signToken(email, issuedAt)
  }), 'utf8').toString('base64');
  return payload;
}

function readAuthHeader(event) {
  const headers = event.headers || {};
  return headers.authorization || headers.Authorization || '';
}

function parseToken(eventOrToken) {
  let token = eventOrToken || '';
  if (typeof eventOrToken === 'object') {
    const header = readAuthHeader(eventOrToken);
    token = header.replace(/^Bearer\s+/i, '');
  }
  if (!token) return null;
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (!data.email || !data.issuedAt || !data.signature) return null;
    if (data.signature !== signToken(data.email, data.issuedAt)) return null;
    if (Date.now() - Number(data.issuedAt) > 7 * 24 * 60 * 60 * 1000) return null;
    return data;
  } catch (err) {
    return null;
  }
}

async function findAdminByEmail(email) {
  const rows = await listRows('adminUsers', { where: { email }, limit: 1 });
  return rows[0] || null;
}

async function requireAdmin(event) {
  const token = parseToken(event);
  if (!token) {
    throw Object.assign(new Error('Admin token is missing or invalid'), { code: 'UNAUTHORIZED' });
  }
  const admin = await findAdminByEmail(token.email);
  if (!admin) {
    throw Object.assign(new Error('Admin account is not allowed'), { code: 'UNAUTHORIZED' });
  }
  return { email: token.email, role: admin.role || token.role || 'admin', admin };
}

function cleanPublicApplication(data) {
  const source = data || {};
  const payload = {
    name: String(source.name || '').trim().slice(0, 20),
    department: String(source.department || '').trim().slice(0, 80),
    contact: String(source.contact || '').trim().slice(0, 50),
    direction: String(source.direction || '').trim().slice(0, 40),
    intro: String(source.intro || '').trim().slice(0, 300),
    status: 'pending',
    admin_note: ''
  };
  if (!payload.name || !payload.department || !payload.contact) {
    throw Object.assign(new Error('Missing required application fields'), { code: 'VALIDATION_ERROR' });
  }
  return payload;
}

function cleanPublicMessage(data) {
  const source = data || {};
  const payload = {
    name: String(source.name || '').trim().slice(0, 20),
    contact: String(source.contact || '').trim().slice(0, 50),
    content: String(source.content || '').trim().slice(0, 500),
    status: 'pending',
    is_handled: false
  };
  if (!payload.name || !payload.content) {
    throw Object.assign(new Error('Missing required message fields'), { code: 'VALIDATION_ERROR' });
  }
  return payload;
}

function validationError(message) {
  return Object.assign(new Error(message), { code: 'VALIDATION_ERROR' });
}

function safeFolder(value) {
  const folder = String(value || 'uploads')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40))
    .filter(Boolean)
    .join('/');
  return folder || 'uploads';
}

function decodeImagePayload(payload) {
  const source = payload || {};
  let mimeType = String(source.mimeType || source.type || '').trim().toLowerCase();
  let base64 = String(source.base64 || '').trim();
  const dataUrl = String(source.dataUrl || '').trim();

  if (dataUrl) {
    const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) throw validationError('Invalid image data');
    const dataUrlType = String(match[1] || '').toLowerCase();
    if (mimeType && mimeType !== dataUrlType) throw validationError('Image type does not match data');
    mimeType = dataUrlType;
    base64 = match[2];
  }

  if (!IMAGE_TYPES[mimeType]) throw validationError('Only JPG, PNG, and WEBP images are supported');
  if (!base64) throw validationError('Image data is required');

  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch (err) {
    throw validationError('Invalid image data');
  }
  if (!buffer.length) throw validationError('Image data is empty');
  if (buffer.length > MAX_IMAGE_BYTES) throw validationError('Image cannot exceed 2MB');

  return { buffer, mimeType, ext: IMAGE_TYPES[mimeType] };
}

async function resolveUploadUrl(fileID) {
  if (!fileID) return '';
  if (/^https?:\/\//i.test(fileID)) return fileID;
  if (typeof uniCloud.getTempFileURL !== 'function') return fileID;
  try {
    const res = await uniCloud.getTempFileURL({ fileList: [fileID] });
    const item = res && res.fileList && res.fileList[0];
    return item && (item.tempFileURL || item.download_url || item.url) || fileID;
  } catch (err) {
    return fileID;
  }
}

async function uploadImage(payload) {
  if (!uniCloud || typeof uniCloud.uploadFile !== 'function') {
    throw Object.assign(new Error('uniCloud storage is unavailable'), { code: 'STORAGE_UNAVAILABLE' });
  }
  const image = decodeImagePayload(payload);
  const folder = safeFolder(payload && payload.folder);
  const suffix = crypto.randomBytes(6).toString('hex');
  const cloudPath = 'gyzy/' + folder + '/' + Date.now() + '-' + suffix + '.' + image.ext;
  const res = await uniCloud.uploadFile({
    cloudPath,
    fileContent: image.buffer,
    cloudPathAsRealPath: true
  });
  const fileID = res && (res.fileID || res.fileId || res.fileid || res.url) || cloudPath;
  const url = await resolveUploadUrl(fileID);
  return {
    value: fileID,
    url,
    path: cloudPath,
    size: image.buffer.length,
    mimeType: image.mimeType
  };
}

async function getPublicActivities(limit) {
  const count = Math.min(Number(limit) || 6, 20);
  const featured = await listRows('activities', {
    where: { is_published: true, is_featured: true },
    orderBy: { field: 'date', direction: 'desc' },
    limit: count
  });
  if (featured.length) return featured;
  return listRows('activities', {
    where: { is_published: true },
    orderBy: { field: 'date', direction: 'desc' },
    limit: count
  });
}

async function getSiteStats() {
  const rows = await listRows('siteStats', {});
  const stats = {};
  rows.forEach((row) => {
    if (row.key) stats[row.key] = Number(row.value || 0);
  });
  return stats;
}

async function getSetting(key) {
  const rows = await listRows('siteSettings', { where: { key }, limit: 1 });
  return rows[0] ? rows[0].value : '';
}

async function setSetting(key, value) {
  const rows = await listRows('siteSettings', { where: { key }, limit: 1 });
  if (rows[0] && rows[0]._id) {
    await updateRow('siteSettings', rows[0]._id, { key, value });
    return rows[0]._id;
  }
  return addRow('siteSettings', { key, value });
}

async function handleAction(event, payload) {
  const action = payload.action || '';

  if (ADMIN_ACTIONS[action]) await requireAdmin(event);

  if (action === 'getPublicActivities') return getPublicActivities(payload.limit);
  if (action === 'getActivityById') {
    const activity = await getRow('activities', payload.id);
    return activity && activity.is_published !== false ? activity : null;
  }
  if (action === 'getSiteStats') return getSiteStats();
  if (action === 'getSetting') return getSetting(payload.key);
  if (action === 'submitApplication') return addRow('applications', cleanPublicApplication(payload.data));
  if (action === 'submitMessage') return addRow('messages', cleanPublicMessage(payload.data));
  if (action === 'login') {
    const email = String(payload.email || '').trim();
    const password = String(payload.password || '');
    const admin = email ? await findAdminByEmail(email) : null;
    const globalPassword = (typeof process !== 'undefined' && process.env && process.env.GYZY_ADMIN_PASSWORD) || '';
    if (!admin || (!admin.password && !globalPassword) || (admin.password || globalPassword) !== password) {
      throw Object.assign(new Error('Invalid admin email or password'), { code: 'LOGIN_FAILED' });
    }
    return { token: createToken(admin), email: admin.email, role: admin.role || 'admin' };
  }
  if (action === 'requireAdmin') return requireAdmin(event);
  if (action === 'listDocuments') return listRows(payload.collection, payload.options || {});
  if (action === 'addDocument') return addRow(payload.collection, payload.data || {});
  if (action === 'updateDocument') return updateRow(payload.collection, payload.id, payload.data || {});
  if (action === 'deleteDocument') return deleteRow(payload.collection, payload.id);
  if (action === 'setSetting') return setSetting(payload.key, payload.value);
  if (action === 'uploadImage') return uploadImage(payload);

  throw Object.assign(new Error('Unknown action: ' + action), { code: 'UNKNOWN_ACTION' });
}

exports.main = async function main(event, context) {
  const method = String(event && event.httpMethod || '').toUpperCase();
  if (method === 'OPTIONS') {
    return {
      mpserverlessComposedResponse: true,
      isBase64Encoded: false,
      statusCode: 204,
      headers: corsHeaders(event || {}),
      body: ''
    };
  }

  try {
    const payload = parseBody(event || {});
    const data = await handleAction(event || {}, payload);
    return ok(event || {}, data);
  } catch (err) {
    const code = err.code || 'SERVER_ERROR';
    const status = code === 'UNAUTHORIZED' ? 401
      : code === 'LOGIN_FAILED' ? 401
        : code === 'VALIDATION_ERROR' ? 400
          : code === 'UNKNOWN_ACTION' ? 404
            : 500;
    return fail(event || {}, status, code, err.message || 'Server error');
  }
};
