/**
 * Supabase 客户端配置
 * 部署前请替换为你的 Supabase URL 和 anon key
 * 在 https://app.supabase.com 创建项目后获取
 */

const SUPABASE_CONFIG = {
  // TODO: 替换为你的 Supabase 项目 URL
  url: 'https://YOUR-PROJECT-ID.supabase.co',
  // TODO: 替换为你的 Supabase anon key (公开可用的 key)
  anonKey: 'YOUR-ANON-KEY',
};

/**
 * 创建 Supabase 客户端
 * 使用 CDN 加载的 supabase-js 库
 */
let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return supabase;
  }
  console.warn('Supabase SDK 未加载，使用离线模式');
  return null;
}

/**
 * 检查 Supabase 是否已配置
 */
function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url !== 'https://YOUR-PROJECT-ID.supabase.co'
    && SUPABASE_CONFIG.anonKey !== 'YOUR-ANON-KEY';
}
