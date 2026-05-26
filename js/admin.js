/**
 * 建工青协 — 管理后台面板逻辑
 * 功能: 仪表盘、报名管理、留言管理、活动管理、统计管理
 */

(function () {
  'use strict';

  let currentUser = null;
  let activeTab = 'dashboard';

  /* ====== 初始化 ====== */
  async function init() {
    if (!isSupabaseConfigured()) {
      document.getElementById('app').innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">⚙️</div><h2>尚未配置 Supabase</h2><p>请在 <code>js/supabase.js</code> 中配置 Supabase URL 和 anon key</p><p style="margin-top:16px;"><a href="index.html" class="btn btn-primary btn-sm">返回首页</a></p></div>';
      return;
    }

    currentUser = await window.appAuth.requireAuth();
    if (!currentUser) return;

    document.getElementById('adminUserEmail').textContent = currentUser.email || '管理员';
    setupTabs();
    renderTab('dashboard');
  }

  /* ====== Tab 切换 ====== */
  function setupTabs() {
    document.querySelectorAll('.admin-nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        document.querySelectorAll('.admin-nav-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        activeTab = item.getAttribute('data-tab');
        renderTab(activeTab);
      });
    });
  }

  /* ====== 渲染 Tab 内容 ====== */
  async function renderTab(tab) {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="admin-loading">加载中...</div>';

    switch (tab) {
      case 'dashboard': await renderDashboard(content); break;
      case 'applications': await renderApplications(content); break;
      case 'messages': await renderMessages(content); break;
      case 'activities': await renderActivitiesAdmin(content); break;
      case 'stats': await renderStatsAdmin(content); break;
    }
  }

  /* ====== 仪表盘 ====== */
  async function renderDashboard(container) {
    const sb = getSupabase();
    let appCount = '-', msgCount = '-', actCount = '-';

    if (sb) {
      try {
        const [apps, msgs, acts] = await Promise.all([
          sb.from('applications').select('*', { count: 'exact', head: true }),
          sb.from('messages').select('*', { count: 'exact', head: true }),
          sb.from('activities').select('*', { count: 'exact', head: true }),
        ]);
        appCount = apps.count || 0;
        msgCount = msgs.count || 0;
        actCount = acts.count || 0;
      } catch (e) { /* 忽略 */ }
    }

    container.innerHTML =
      '<h2>仪表盘</h2>'
      + '<div class="admin-stats-grid">'
      + '<div class="admin-stat-card"><div class="admin-stat-num">' + appCount + '</div><div>报名总数</div></div>'
      + '<div class="admin-stat-card"><div class="admin-stat-num">' + msgCount + '</div><div>留言总数</div></div>'
      + '<div class="admin-stat-card"><div class="admin-stat-num">' + actCount + '</div><div>活动总数</div></div>'
      + '</div>'
      + '<p style="margin-top:24px;color:#999;font-size:14px;">欢迎使用建工青协管理后台</p>';
  }

  /* ====== 报名管理 ====== */
  async function renderApplications(container) {
    const sb = getSupabase();
    container.innerHTML = '<h2>报名管理</h2><div class="admin-toolbar">'
      + '<input type="text" id="appSearch" placeholder="搜索姓名或联系方式..." class="admin-input" style="max-width:300px;">'
      + '<button id="exportCSV" class="btn btn-sm btn-outline">导出 CSV</button>'
      + '</div><div id="appTable"><div class="admin-loading">加载中...</div></div>';

    async function loadApps() {
      const search = document.getElementById('appSearch')?.value || '';
      let query = sb.from('applications').select('*').order('created_at', { ascending: false });
      if (search) query = query.or('name.ilike.%' + search + '%,contact.ilike.%' + search + '%');
      const { data, error } = await query;
      const tbody = document.getElementById('appTable');
      if (error) { tbody.innerHTML = '<p class="error">加载失败</p>'; return; }
      if (!data || data.length === 0) { tbody.innerHTML = '<p style="color:#999;padding:20px;">暂无报名数据</p>'; return; }
      tbody.innerHTML = '<table class="admin-table"><thead><tr><th>姓名</th><th>学院/专业</th><th>联系方式</th><th>志愿方向</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>'
        + data.map(function (a) {
          return '<tr><td>' + (a.name || '') + '</td><td>' + (a.department || '') + '</td><td>' + (a.contact || '') + '</td><td>' + (a.direction || '') + '</td>'
            + '<td><select class="status-select" data-id="' + a.id + '">'
            + ['pending', 'approved', 'rejected', 'contacted'].map(function (s) {
              return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + statusLabel(s) + '</option>';
            }).join('')
            + '</select></td>'
            + '<td>' + formatDate(a.created_at) + '</td>'
            + '<td><button class="btn btn-sm" onclick="if(confirm(\'确定删除?\'))window.appAdmin.deleteApp(' + a.id + ')" style="color:#DC2626;">删除</button></td>'
            + '</tr>';
        }).join('') + '</tbody></table>';

      // 绑定状态变更
      tbody.querySelectorAll('.status-select').forEach(function (sel) {
        sel.addEventListener('change', async function () {
          await sb.from('applications').update({ status: this.value }).eq('id', this.getAttribute('data-id'));
          alert('状态已更新');
        });
      });
    }

    await loadApps();

    document.getElementById('appSearch')?.addEventListener('input', loadApps);
    document.getElementById('exportCSV')?.addEventListener('click', async function () {
      const { data } = await sb.from('applications').select('*').order('created_at', { ascending: false });
      if (!data || !data.length) { alert('无数据'); return; }
      const csv = ['姓名,学院专业,联系方式,志愿方向,可服务时间,状态,时间'].concat(data.map(function (a) {
        return [a.name, a.department, a.contact, a.direction, a.available_time, a.status, a.created_at].join(',');
      })).join('\n');
      downloadCSV(csv, 'applications.csv');
    });
  }

  /* ====== 留言管理 ====== */
  async function renderMessages(container) {
    const sb = getSupabase();
    container.innerHTML = '<h2>留言管理</h2><div class="admin-toolbar">'
      + '<input type="text" id="msgSearch" placeholder="搜索留言内容..." class="admin-input" style="max-width:300px;">'
      + '</div><div id="msgTable"><div class="admin-loading">加载中...</div></div>';

    async function loadMsgs() {
      const search = document.getElementById('msgSearch')?.value || '';
      let query = sb.from('messages').select('*').order('created_at', { ascending: false });
      if (search) query = query.or('name.ilike.%' + search + '%,content.ilike.%' + search + '%');
      const { data, error } = await query;
      const tbody = document.getElementById('msgTable');
      if (error) { tbody.innerHTML = '<p class="error">加载失败</p>'; return; }
      if (!data || !data.length) { tbody.innerHTML = '<p style="color:#999;padding:20px;">暂无留言</p>'; return; }
      tbody.innerHTML = '<table class="admin-table"><thead><tr><th>姓名</th><th>联系方式</th><th>内容</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>'
        + data.map(function (m) {
          return '<tr><td>' + (m.name || '') + '</td><td>' + (m.contact || '') + '</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (m.content || '') + '">' + (m.content || '') + '</td>'
            + '<td><span class="badge ' + (m.is_handled ? 'badge-green' : 'badge-orange') + '">' + (m.is_handled ? '已处理' : '未处理') + '</span></td>'
            + '<td>' + formatDate(m.created_at) + '</td>'
            + '<td>'
            + (!m.is_handled ? '<button class="btn btn-sm" onclick="window.appAdmin.markHandled(' + m.id + ')">标记已处理</button> ' : '')
            + '<button class="btn btn-sm" style="color:#DC2626;" onclick="if(confirm(\'确定删除?\'))window.appAdmin.deleteMsg(' + m.id + ')">删除</button>'
            + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    await loadMsgs();
    document.getElementById('msgSearch')?.addEventListener('input', loadMsgs);
  }

  /* ====== 活动管理 ====== */
  async function renderActivitiesAdmin(container) {
    const sb = getSupabase();
    container.innerHTML = '<h2>活动管理</h2>'
      + '<button id="addActivityBtn" class="btn btn-primary btn-sm" style="margin-bottom:16px;">+ 新增活动</button>'
      + '<div id="actTable"><div class="admin-loading">加载中...</div></div>';

    async function loadActs() {
      const { data, error } = await sb.from('activities').select('*').order('event_date', { ascending: false });
      const tbody = document.getElementById('actTable');
      if (error || !data || !data.length) { tbody.innerHTML = '<p style="color:#999;padding:20px;">暂无活动</p>'; return; }
      tbody.innerHTML = '<table class="admin-table"><thead><tr><th>标题</th><th>分类</th><th>日期</th><th>首页</th><th>操作</th></tr></thead><tbody>'
        + data.map(function (a) {
          return '<tr><td>' + (a.title || '') + '</td><td>' + (a.category || '') + '</td><td>' + (a.event_date || '') + '</td>'
            + '<td>' + (a.show_on_home ? '✅' : '❌') + '</td>'
            + '<td>'
            + '<button class="btn btn-sm" onclick="window.appAdmin.toggleActShow(' + a.id + ',' + !a.show_on_home + ')">' + (a.show_on_home ? '隐藏' : '显示') + '</button> '
            + '<button class="btn btn-sm" onclick="window.appAdmin.editAct(' + a.id + ')">编辑</button> '
            + '<button class="btn btn-sm" style="color:#DC2626;" onclick="if(confirm(\'确定删除?\'))window.appAdmin.deleteAct(' + a.id + ')">删除</button>'
            + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    await loadActs();

    document.getElementById('addActivityBtn').addEventListener('click', function () { showActivityForm(null, loadActs); });
    window.appAdmin.editAct = function (id) {
      sb.from('activities').select('*').eq('id', id).single().then(function (r) {
        if (r.data) showActivityForm(r.data, loadActs);
      });
    };
    window.appAdmin.toggleActShow = async function (id, show) {
      await sb.from('activities').update({ show_on_home: show }).eq('id', id);
      loadActs();
    };
    window.appAdmin.deleteAct = async function (id) {
      await sb.from('activities').delete().eq('id', id);
      loadActs();
    };
  }

  function showActivityForm(act, callback) {
    const isEdit = !!act;
    const form = document.createElement('div');
    form.className = 'admin-modal-overlay';
    form.innerHTML = '<div class="admin-modal"><h3>' + (isEdit ? '编辑活动' : '新增活动') + '</h3>'
      + '<div class="form-grid">'
      + field('actTitle', '活动标题', 'text', act?.title || '')
      + field('actCategory', '分类', 'text', act?.category || '')
      + field('actDate', '日期', 'date', act?.event_date || '')
      + field('actTime', '时间', 'text', act?.event_time || '')
      + field('actLocation', '地点', 'text', act?.location || '')
      + field('actParticipants', '参与人数', 'number', act?.participants || '')
      + field('actHours', '服务时长(h)', 'number', act?.service_hours || '')
      + '<div class="form-group form-full"><label>简介</label><textarea id="actDesc" rows="3">' + (act?.description || '') + '</textarea></div>'
      + field('actImage', '封面图URL', 'text', act?.cover_image || '', 'form-full')
      + '</div>'
      + '<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">'
      + '<button class="btn btn-outline btn-sm" id="cancelActForm">取消</button>'
      + '<button class="btn btn-primary btn-sm" id="saveActForm">保存</button>'
      + '</div></div>';

    document.body.appendChild(form);

    document.getElementById('cancelActForm').addEventListener('click', function () { form.remove(); });
    document.getElementById('saveActForm').addEventListener('click', async function () {
      const data = {
        title: document.getElementById('actTitle').value,
        category: document.getElementById('actCategory').value,
        event_date: document.getElementById('actDate').value,
        event_time: document.getElementById('actTime').value,
        location: document.getElementById('actLocation').value,
        participants: parseInt(document.getElementById('actParticipants').value) || 0,
        service_hours: parseInt(document.getElementById('actHours').value) || 0,
        description: document.getElementById('actDesc').value,
        cover_image: document.getElementById('actImage').value,
      };
      const sb = getSupabase();
      if (isEdit) {
        await sb.from('activities').update(data).eq('id', act.id);
      } else {
        await sb.from('activities').insert([data]);
      }
      form.remove();
      callback();
    });
  }

  function field(id, label, type, value, cls) {
    return '<div class="form-group' + (cls ? ' ' + cls : '') + '"><label>' + label + '</label><input id="' + id + '" type="' + type + '" value="' + (value || '') + '"></div>';
  }

  /* ====== 统计管理 ====== */
  async function renderStatsAdmin(container) {
    const sb = getSupabase();
    const { data } = await sb.from('site_stats').select('*').order('id');
    container.innerHTML = '<h2>统计管理</h2><div id="statsForm"></div>';

    const formDiv = document.getElementById('statsForm');
    if (!data || !data.length) { formDiv.innerHTML = '<p>暂无数据</p>'; return; }
    formDiv.innerHTML = data.map(function (s) {
      return '<div class="form-group"><label>' + (s.label || s.key) + '</label><input type="number" id="stat_' + s.key + '" value="' + s.value + '"></div>';
    }).join('')
      + '<button id="saveStatsBtn" class="btn btn-primary btn-sm" style="margin-top:12px;">保存</button>';

    document.getElementById('saveStatsBtn').addEventListener('click', async function () {
      for (var i = 0; i < data.length; i++) {
        var s = data[i];
        var v = parseInt(document.getElementById('stat_' + s.key).value) || 0;
        await sb.from('site_stats').update({ value: v }).eq('key', s.key);
      }
      alert('统计数据已保存');
    });
  }

  /* ====== 工具函数 ====== */
  function statusLabel(s) {
    return { pending: '待审核', approved: '已通过', rejected: '已拒绝', contacted: '已联系' }[s] || s;
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('zh-CN');
  }

  function downloadCSV(csv, filename) {
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  /* ====== 全局导出 ====== */
  window.appAdmin = {
    init: init,
    deleteApp: async function (id) { const sb = getSupabase(); await sb.from('applications').delete().eq('id', id); renderTab(activeTab); },
    deleteMsg: async function (id) { const sb = getSupabase(); await sb.from('messages').delete().eq('id', id); renderTab(activeTab); },
    markHandled: async function (id) { const sb = getSupabase(); await sb.from('messages').update({ is_handled: true }).eq('id', id); renderTab(activeTab); },
    editAct: null,
    toggleActShow: null,
    deleteAct: null,
  };

  /* ====== 登出 ====== */
  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    window.appAuth.logout();
  });

  /* ====== 启动 ====== */
  if (document.getElementById('adminContent')) {
    window.appAdmin.init();
  }
})();
