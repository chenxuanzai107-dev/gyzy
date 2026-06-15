/**
 * uniCloud backend adapter.
 * Exposes the same window.gyzyBackend surface used by the existing pages.
 */
(function () {
  'use strict';

  var config = window.GYZY_BACKEND_CONFIG || {};
  var uniConfig = config.unicloud || {};
  var defaults = config.defaults || {};
  var TOKEN_KEY = 'gyzy_unicloud_admin_token';
  var ADMIN_KEY = 'gyzy_unicloud_admin';

  function backendError(message, code) {
    var err = new Error(message || 'uniCloud request failed');
    err.code = code || 'BACKEND_ERROR';
    return err;
  }

  function apiUrl() {
    return String(uniConfig.apiUrl || '').trim();
  }

  function isConfigured() {
    return config.provider === 'unicloud' && !!apiUrl();
  }

  function readToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (err) {
      return '';
    }
  }

  function writeToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      /* localStorage may be disabled. */
    }
  }

  function writeAdmin(admin) {
    try {
      if (admin) localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
      else localStorage.removeItem(ADMIN_KEY);
    } catch (err) {
      /* localStorage may be disabled. */
    }
  }

  async function parseResponse(response) {
    var text = await response.text();
    var data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw backendError('uniCloud response is not valid JSON', 'INVALID_RESPONSE');
      }
    }
    if (!response.ok && (!data || data.ok !== false)) {
      throw backendError(text || ('HTTP ' + response.status), 'HTTP_ERROR');
    }
    if (data && data.ok === false) {
      throw backendError(data.message || 'uniCloud request failed', data.code || 'BACKEND_ERROR');
    }
    return data && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
  }

  async function callApi(action, payload, options) {
    options = options || {};
    if (!isConfigured()) {
      throw backendError('uniCloud API URL is not configured. Fill apiUrl in js/backend-config.js.', 'NOT_CONFIGURED');
    }

    var headers = { 'Content-Type': 'application/json' };
    var token = readToken();
    if (options.admin && token) headers.Authorization = 'Bearer ' + token;

    var body = Object.assign({ action: action }, payload || {});
    var response = await fetch(apiUrl(), {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    return parseResponse(response);
  }

  async function init() {
    return isConfigured();
  }

  async function getSetting(key) {
    return callApi('getSetting', { key: key });
  }

  async function setSetting(key, value) {
    return callApi('setSetting', { key: key, value: value }, { admin: true });
  }

  async function getSiteStats() {
    var stats = await callApi('getSiteStats', {});
    return Object.assign({}, defaults.stats || {}, stats || {});
  }

  async function getPublicActivities(limit) {
    return callApi('getPublicActivities', { limit: limit || 6 });
  }

  async function getActivityById(id) {
    return callApi('getActivityById', { id: id });
  }

  async function submitApplication(data) {
    return callApi('submitApplication', { data: data });
  }

  async function submitMessage(data) {
    return callApi('submitMessage', { data: data });
  }

  async function login(email, password) {
    var admin = await callApi('login', { email: email, password: password });
    writeToken(admin && admin.token);
    writeAdmin(admin || null);
    return admin;
  }

  async function logout() {
    writeToken('');
    writeAdmin(null);
  }

  async function requireAdmin() {
    return callApi('requireAdmin', {}, { admin: true });
  }

  async function listDocuments(collection, options) {
    return callApi('listDocuments', { collection: collection, options: options || {} }, { admin: true });
  }

  async function addDocument(collection, data) {
    return callApi('addDocument', { collection: collection, data: data || {} }, { admin: true });
  }

  async function updateDocument(collection, id, data) {
    return callApi('updateDocument', { collection: collection, id: id, data: data || {} }, { admin: true });
  }

  async function deleteDocument(collection, id) {
    return callApi('deleteDocument', { collection: collection, id: id }, { admin: true });
  }

  async function uploadImage() {
    throw backendError('Image upload is not enabled in this free uniCloud migration yet. Use an image URL first.', 'UPLOAD_UNSUPPORTED');
  }

  async function resolveFileUrl(value) {
    return value || '';
  }

  window.gyzyBackend = {
    isConfigured: isConfigured,
    init: init,
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
    defaults: defaults,
    config: config
  };
})();
