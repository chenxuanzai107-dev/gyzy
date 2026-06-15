/**
 * 建工青协官网后端配置
 *
 * 最稳定的国内方案使用腾讯云 CloudBase。
 * 你创建 CloudBase 环境后，只需要把 envId 改成自己的环境 ID。
 */
window.GYZY_BACKEND_CONFIG = {
  provider: 'cloudbase',
  cloudbase: {
    envId: 'gyzy-d6gunz6ucb766e5f4',
    region: 'ap-guangzhou',
    enableAnonymousLogin: true,
    storageRoot: 'site-assets'
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
