/**
 * Supabase 客户端配置
 * 建工青协 - 已配置
 */

const SUPABASE_CONFIG = {
  url: 'https://pzyijmgcksmyagdvdgoq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlqbWdja3NteWFnZHZkZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDEzMTIsImV4cCI6MjA5NTMxNzMxMn0._sohNeH4Zh7qTaqLd0b8gY3GKg3t4ShJTSCkNEQfAyI',
};

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return supabase;
  }
  console.warn('Supabase SDK 未加载');
  return null;
}

function isSupabaseConfigured() {
  return true;
}
