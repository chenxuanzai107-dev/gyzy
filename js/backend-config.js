/**
 * 建工青协官网后端配置
 *
 * 免费优先方案使用 uniCloud。云函数上传并开启 URL 化后，
 * 把 apiUrl 填成 gyzy-api 的完整 HTTP 访问地址。
 */
window.GYZY_BACKEND_CONFIG = {
  provider: 'unicloud',
  unicloud: {
    serviceSpaceId: 'mp-53d28a73-8fcd-4a91-a0c1-16249a142f32',
    apiUrl: 'https://fc-mp-53d28a73-8fcd-4a91-a0c1-16249a142f32.next.bspapp.com/gyzy-api',
    apiPath: '/gyzy-api'
  },
  collections: {
    applications: 'applications',
    messages: 'messages',
    activities: 'activities',
    siteStats: 'site_stats',
    siteSettings: 'site_settings',
    adminUsers: 'admin_users'
  },
  defaults: {
    heroImage: 'assets/images/hero-building.png',
    stats: {
      service_hours: 3200,
      volunteers_count: 1288,
      activities_count: 32,
      covered_people: 2000
    }
  }
};
