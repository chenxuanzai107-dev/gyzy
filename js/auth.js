/**
 * 建工青协 — 管理后台认证模块
 * 使用 Supabase Auth
 */

(function () {
  'use strict';

  /* ====== 检查登录状态 ====== */
  async function checkAuth() {
    if (!isSupabaseConfigured()) {
      // 未配置 Supabase 时，跳过认证
      return { user: null, session: null };
    }
    const sb = getSupabase();
    if (!sb) return { user: null, session: null };

    const { data } = await sb.auth.getSession();
    return { user: data.session?.user || null, session: data.session || null };
  }

  /* ====== 管理员登录 ====== */
  async function login(email, password) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 未配置。请在 js/supabase.js 中设置 URL 和 anon key。');
    }
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase 未加载');

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  /* ====== 管理员登出 ====== */
  async function logout() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    window.location.href = 'login.html';
  }

  /* ====== 需要登录的页面保护 ====== */
  async function requireAuth() {
    const { user } = await checkAuth();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  }

  window.appAuth = { checkAuth, login, logout, requireAuth };
})();
