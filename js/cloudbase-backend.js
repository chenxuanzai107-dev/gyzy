/**
 * CloudBase 数据访问层
 * 页面只调用 window.gyzyBackend，不再直接依赖旧海外后端。
 */
(function () {
  'use strict';

  var config = window.GYZY_BACKEND_CONFIG || {};
  var collections = config.collections || {};
  var cloudbaseConfig = config.cloudbase || {};
  var app = null;
  var db = null;
  var auth = null;
  var anonymousPromise = null;

  function backendError(message, code) {
    var err = new Error(message);
    err.code = code || 'BACKEND_ERROR';
    return err;
  }

  function isConfigured() {
    return !!(cloudbaseConfig.envId && cloudbaseConfig.envId.trim());
  }

  function getCollectionName(key) {
    return collections[key] || key;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function throwIfCloudbaseError(result, fallbackMessage) {
    if (result && result.error) {
      var error = result.error;
      throw backendError(error.message || fallbackMessage || 'CloudBase 请求失败', error.code || 'CLOUDBASE_ERROR');
    }
    return result;
  }

  function getApp() {
    if (!isConfigured()) {
      throw backendError('CloudBase 环境未配置，请先在 js/backend-config.js 填写 envId。', 'NOT_CONFIGURED');
    }
    if (!window.cloudbase || typeof window.cloudbase.init !== 'function') {
      throw backendError('CloudBase SDK 未加载，请检查网络或 CDN。', 'SDK_MISSING');
    }
    if (app) return app;
    app = window.cloudbase.init({
      env: cloudbaseConfig.envId.trim(),
      region: cloudbaseConfig.region || 'ap-guangzhou'
    });
    db = typeof app.database === 'function' ? app.database() : app.database;
    auth = typeof app.auth === 'function' ? app.auth() : app.auth;
    if (!db) throw backendError('CloudBase 数据库模块不可用。', 'DB_MISSING');
    return app;
  }

  async function ensurePublicSession() {
    getApp();
    if (!auth || cloudbaseConfig.enableAnonymousLogin === false) return;
    if (anonymousPromise) return anonymousPromise;
    anonymousPromise = (async function () {
      try {
        if (typeof auth.getLoginState === 'function') {
          var state = await auth.getLoginState();
          if (state) return state;
        }
        if (typeof auth.signInAnonymously === 'function') {
          return throwIfCloudbaseError(await auth.signInAnonymously(), '匿名登录失败');
        }
        if (typeof auth.anonymousAuthProvider === 'function') {
          var provider = auth.anonymousAuthProvider();
          if (provider && typeof provider.signIn === 'function') {
            return await provider.signIn();
          }
        }
      } catch (err) {
        console.warn('[CloudBase] 匿名登录失败，继续尝试未登录访问：', err.message || err);
      }
      return null;
    })();
    return anonymousPromise;
  }

  async function getCurrentUser() {
    getApp();
    if (!auth) return null;
    try {
      if (typeof auth.getUser === 'function') {
        var userRes = throwIfCloudbaseError(await auth.getUser(), '获取用户信息失败');
        if (userRes && userRes.data) return userRes.data.user || userRes.data;
      }
      if (typeof auth.getLoginState === 'function') {
        var state = await auth.getLoginState();
        return state && (state.user || state.userInfo || state);
      }
      if (auth.currentUser && typeof auth.currentUser === 'function') {
        return await auth.currentUser();
      }
      return auth.currentUser || null;
    } catch (err) {
      console.warn('[CloudBase] 获取登录状态失败：', err.message || err);
      return null;
    }
  }

  function applyQuery(ref, options) {
    options = options || {};
    if (options.where && typeof ref.where === 'function') ref = ref.where(options.where);
    if (options.orderBy && typeof ref.orderBy === 'function') {
      ref = ref.orderBy(options.orderBy.field, options.orderBy.direction || 'desc');
    }
    if (options.limit && typeof ref.limit === 'function') ref = ref.limit(options.limit);
    return ref;
  }

  async function listDocuments(collectionKey, options) {
    await ensurePublicSession();
    var col = db.collection(getCollectionName(collectionKey));
    var res = throwIfCloudbaseError(await applyQuery(col, options).get(), '数据读取失败');
    return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
  }

  async function getDocument(collectionKey, id) {
    await ensurePublicSession();
    var col = db.collection(getCollectionName(collectionKey));
    if (id && typeof col.doc === 'function') {
      try {
        var docRes = throwIfCloudbaseError(await col.doc(id).get(), '数据读取失败');
        if (docRes && docRes.data) {
          return Array.isArray(docRes.data) ? docRes.data[0] : docRes.data;
        }
      } catch (err) {
        console.warn('[CloudBase] doc 查询失败，回退 where 查询：', err.message || err);
      }
    }
    var rows = await listDocuments(collectionKey, { where: { _id: id }, limit: 1 });
    return rows[0] || null;
  }

  async function addDocument(collectionKey, data) {
    await ensurePublicSession();
    var payload = Object.assign({}, data, {
      created_at: data.created_at || nowIso(),
      updated_at: nowIso()
    });
    var res = throwIfCloudbaseError(await db.collection(getCollectionName(collectionKey)).add(payload), '数据新增失败');
    return res;
  }

  async function updateDocument(collectionKey, id, data) {
    await ensurePublicSession();
    var payload = Object.assign({}, data, { updated_at: nowIso() });
    delete payload._id;
    delete payload.id;
    var col = db.collection(getCollectionName(collectionKey));
    if (!id) throw backendError('缺少记录 ID。', 'MISSING_ID');
    return throwIfCloudbaseError(await col.doc(id).update(payload), '数据更新失败');
  }

  async function deleteDocument(collectionKey, id) {
    await ensurePublicSession();
    if (!id) throw backendError('缺少记录 ID。', 'MISSING_ID');
    return throwIfCloudbaseError(await db.collection(getCollectionName(collectionKey)).doc(id).remove(), '数据删除失败');
  }

  async function getSetting(key) {
    var rows = await listDocuments('siteSettings', { where: { key: key }, limit: 1 });
    return rows[0] ? rows[0].value : '';
  }

  async function setSetting(key, value) {
    var rows = await listDocuments('siteSettings', { where: { key: key }, limit: 1 });
    if (rows[0] && rows[0]._id) {
      await updateDocument('siteSettings', rows[0]._id, { key: key, value: value });
      return rows[0]._id;
    }
    var res = await addDocument('siteSettings', { key: key, value: value });
    return res && (res.id || res._id);
  }

  async function getSiteStats() {
    var defaults = (config.defaults && config.defaults.stats) || {};
    var rows = await listDocuments('siteStats', {});
    var result = Object.assign({}, defaults);
    rows.forEach(function (row) {
      if (row.key) result[row.key] = Number(row.value || 0);
    });
    return result;
  }

  async function getPublicActivities(limit) {
    limit = limit || 6;
    var featured = [];
    try {
      featured = await listDocuments('activities', {
        where: { is_published: true, is_featured: true },
        orderBy: { field: 'date', direction: 'desc' },
        limit: limit
      });
    } catch (err) {
      console.warn('[CloudBase] 精选活动读取失败，尝试读取已发布活动：', err.message || err);
    }
    if (featured.length) return featured;
    return await listDocuments('activities', {
      where: { is_published: true },
      orderBy: { field: 'date', direction: 'desc' },
      limit: limit
    });
  }

  async function getActivityById(id) {
    var activity = await getDocument('activities', id);
    if (!activity || activity.is_published === false) return null;
    return activity;
  }

  async function submitApplication(data) {
    return await addDocument('applications', Object.assign({
      status: 'pending',
      admin_note: ''
    }, data));
  }

  async function submitMessage(data) {
    return await addDocument('messages', Object.assign({
      is_handled: false,
      status: 'pending'
    }, data));
  }

  async function login(email, password) {
    getApp();
    if (!auth) throw backendError('CloudBase 登录模块不可用。', 'AUTH_MISSING');
    if (typeof auth.signInWithPassword === 'function') {
      var res = throwIfCloudbaseError(await auth.signInWithPassword({ email: email, password: password }), '登录失败');
      return res.data || res;
    }
    if (typeof auth.signInWithEmailAndPassword === 'function') {
      return await auth.signInWithEmailAndPassword(email, password);
    }
    throw backendError('当前 CloudBase SDK 不支持邮箱密码登录，请检查认证配置。', 'AUTH_METHOD_MISSING');
  }

  async function logout() {
    getApp();
    if (auth && typeof auth.signOut === 'function') await auth.signOut();
  }

  async function requireAdmin() {
    var current = await getCurrentUser();
    if (!current) throw backendError('请先登录后台。', 'NOT_LOGGED_IN');
    var uid = current.uid || current.userId || current._id || current.id;
    var email = current.email || current.emailAddress || current.username || '';
    var admins = [];
    if (uid) {
      admins = await listDocuments('adminUsers', { where: { uid: uid }, limit: 1 });
      if (!admins.length) admins = await listDocuments('adminUsers', { where: { _id: uid }, limit: 1 });
    }
    if (!admins.length && email) {
      admins = await listDocuments('adminUsers', { where: { email: email }, limit: 1 });
    }
    if (!admins.length) throw backendError('当前账号无后台管理权限。', 'NOT_ADMIN');
    return { user: current, admin: admins[0], email: email };
  }

  async function resolveFileUrl(value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
    getApp();
    var storage = typeof app.storage === 'function' ? app.storage() : app.storage;
    if (storage && typeof storage.from === 'function') {
      try {
        var fromRef = null;
        try {
          fromRef = storage.from();
        } catch (fromErr) {
          fromRef = storage.from(cloudbaseConfig.storageRoot || 'site-assets');
        }
        if (fromRef && typeof fromRef.getPublicUrl === 'function') {
          var publicData = fromRef.getPublicUrl(value);
          if (publicData && publicData.data && publicData.data.publicUrl) return publicData.data.publicUrl;
        }
        if (fromRef && typeof fromRef.createSignedUrl === 'function') {
          var signed = throwIfCloudbaseError(await fromRef.createSignedUrl(value, 3600), '获取图片访问地址失败');
          if (signed && signed.data && signed.data.signedUrl) return signed.data.signedUrl;
        }
      } catch (err0) {
        console.warn('[CloudBase] 新版文件地址解析失败：', err0.message || err0);
      }
    }
    if (typeof app.getTempFileURL === 'function') {
      try {
        var res = await app.getTempFileURL({ fileList: [value] });
        var item = res && res.fileList && res.fileList[0];
        return (item && (item.tempFileURL || item.download_url || item.url)) || value;
      } catch (err) {
        console.warn('[CloudBase] 文件地址解析失败：', err.message || err);
      }
    }
    return value;
  }

  async function uploadImage(file, folder) {
    await ensurePublicSession();
    if (!file) throw backendError('请选择图片文件。', 'NO_FILE');
    var allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.indexOf(file.type) === -1) throw backendError('只支持 JPG、PNG、WEBP 图片。', 'INVALID_FILE_TYPE');
    if (file.size > 5 * 1024 * 1024) throw backendError('图片不能超过 5MB。', 'FILE_TOO_LARGE');

    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var root = cloudbaseConfig.storageRoot || 'site-assets';
    var cloudPath = root + '/' + (folder || 'uploads') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    if (typeof app.uploadFile === 'function') {
      var up = throwIfCloudbaseError(await app.uploadFile({ cloudPath: cloudPath, filePath: file }), '图片上传失败');
      var fileID = up.fileID || up.fileId || up.fileid || cloudPath;
      return { value: fileID, url: await resolveFileUrl(fileID), path: cloudPath };
    }

    var storage = typeof app.storage === 'function' ? app.storage() : app.storage;
    if (storage && typeof storage.from === 'function') {
      var fromRef = null;
      try {
        fromRef = storage.from();
      } catch (err) {
        fromRef = storage.from(root);
      }
      var upload = throwIfCloudbaseError(await fromRef.upload(cloudPath, file, {
        cacheControl: 'max-age=3600',
        upsert: true,
        contentType: file.type
      }), '图片上传失败');
      var fileId = upload && upload.data && (upload.data.id || upload.data.fullPath || upload.data.path);
      if (fromRef.getPublicUrl && fileId) {
        var publicData = fromRef.getPublicUrl(fileId);
        var publicUrl = publicData && publicData.data && publicData.data.publicUrl;
        return { value: fileId, url: publicUrl || fileId, path: cloudPath };
      }
      return { value: fileId || cloudPath, url: fileId || cloudPath, path: cloudPath };
    }

    throw backendError('当前 CloudBase SDK 不支持浏览器上传，请检查 SDK 版本。', 'UPLOAD_UNSUPPORTED');
  }

  window.gyzyBackend = {
    isConfigured: isConfigured,
    init: ensurePublicSession,
    getSetting: getSetting,
    setSetting: setSetting,
    getSiteStats: getSiteStats,
    getPublicActivities: getPublicActivities,
    getActivityById: getActivityById,
    submitApplication: submitApplication,
    submitMessage: submitMessage,
    login: login,
    logout: logout,
    requireAdmin: requireAdmin,
    listDocuments: listDocuments,
    addDocument: addDocument,
    updateDocument: updateDocument,
    deleteDocument: deleteDocument,
    uploadImage: uploadImage,
    resolveFileUrl: resolveFileUrl,
    defaults: config.defaults || {},
    config: config
  };
})();
