/**
 * uniCloud 后台登录
 */
(function () {
  'use strict';

  var backend = window.gyzyBackend;
  var form = document.getElementById('loginForm');
  var btn = document.getElementById('loginBtn');
  var err = document.getElementById('loginError');
  var debug = document.getElementById('loginDebug');

  function log(message) {
    if (debug) debug.textContent = message || '';
    if (message) console.log('[LOGIN] ' + message);
  }

  function setError(message) {
    err.textContent = message || '';
  }

  function backendReady() {
    return backend && typeof backend.isConfigured === 'function' && backend.isConfigured();
  }

  async function redirectIfLoggedIn() {
    if (!backendReady()) {
      log('uniCloud 未配置');
      return;
    }
    try {
      log('检查登录状态...');
      await backend.requireAdmin();
      window.location.href = 'admin.html';
    } catch (ex) {
      log('');
    }
  }

  if (!backendReady()) {
    setError('国内后端尚未配置：请先在 js/backend-config.js 填写 uniCloud apiUrl。');
  } else {
    redirectIfLoggedIn();
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    setError('');

    if (!backendReady()) {
      setError('uniCloud API 未配置，暂时无法登录后台。');
      return;
    }

    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    if (!email) { setError('请输入邮箱。'); return; }
    if (!password) { setError('请输入密码。'); return; }

    btn.disabled = true;
    btn.textContent = '登录中...';

    try {
      log('正在连接 uniCloud...');
      await backend.login(email, password);
      log('登录成功，检查管理员权限...');
      await backend.requireAdmin();
      log('管理员验证通过，进入后台...');
      window.location.href = 'admin.html';
    } catch (ex) {
      console.error('[LOGIN] 登录失败:', ex);
      log('');
      if (ex.code === 'NOT_ADMIN') {
        setError('当前账号无后台管理权限。');
      } else if (ex.code === 'NOT_CONFIGURED') {
        setError('uniCloud API 未配置。');
      } else if ((ex.message || '').toLowerCase().indexOf('password') >= 0 || (ex.message || '').toLowerCase().indexOf('login') >= 0) {
        setError('账号不存在或密码错误。');
      } else {
        setError(ex.message || '登录失败，请稍后重试。');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
})();
