/**
 * uniCloud 管理后台
 */
(function () {
  'use strict';

  var backend = window.gyzyBackend;
  var content = document.getElementById('adminContent');
  var currentTab = 'dashboard';
  var currentAdmin = null;
  var selectedHeroFile = null;
  var selectedCoverFile = null;
  var currentEditingActivity = null;

  function e(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function idOf(row) {
    return row && (row._id || row.id);
  }

  function loadContent(html) {
    content.innerHTML = html;
  }

  function backendReady() {
    return backend && typeof backend.isConfigured === 'function' && backend.isConfigured();
  }

  function fmtDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function statusText(status) {
    return {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      contacted: '已联系'
    }[status] || status || '待审核';
  }

  function messageStatus(row) {
    if (row.status) return row.status;
    return row.is_handled ? 'handled' : 'pending';
  }

  function messageStatusText(status) {
    return {
      pending: '未处理',
      handled: '已回复',
      no_reply: '无需回复',
      spam: '垃圾留言'
    }[status] || status || '未处理';
  }

  function setupMessage() {
    return ''
      + '<div class="admin-empty">'
      + '<h2>国内后端未配置</h2>'
      + '<p>当前后台已经切换为 uniCloud 免费方案，但还没有填写 API 地址。</p>'
      + '<p style="margin-top:8px;color:#999;">请上传 uniCloud 云函数并开启 URL 化后，修改 <code>js/backend-config.js</code> 中的 <code>apiUrl</code>。</p>'
      + '<a href="index.html" class="btn btn-primary btn-sm" style="margin-top:16px;">返回前台</a>'
      + '</div>';
  }

  async function boot() {
    if (!backendReady()) {
      loadContent(setupMessage());
      return;
    }
    try {
      currentAdmin = await backend.requireAdmin();
      document.getElementById('adminUserEmail').textContent = (currentAdmin.email || currentAdmin.admin.email || '管理员') + ' (' + (currentAdmin.admin.role || 'admin') + ')';
      initTabs();
      await renderTab('dashboard');
    } catch (err) {
      console.error('[ADMIN] 权限检查失败:', err);
      if (err.code === 'NOT_LOGGED_IN') {
        window.location.href = 'login.html';
        return;
      }
      loadContent('<div class="admin-empty"><h2>无法进入后台</h2><p>' + e(err.message || '当前账号无后台权限。') + '</p><a href="login.html" class="btn btn-primary btn-sm" style="margin-top:16px;">重新登录</a></div>');
    }
  }

  function initTabs() {
    document.querySelectorAll('.admin-nav-item').forEach(function (item) {
      item.addEventListener('click', async function () {
        document.querySelectorAll('.admin-nav-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        await renderTab(item.getAttribute('data-tab'));
      });
    });
  }

  async function renderTab(tab) {
    currentTab = tab || 'dashboard';
    if (currentTab === 'dashboard') return loadDashboard();
    if (currentTab === 'applications') return loadApplications();
    if (currentTab === 'messages') return loadMessages();
    if (currentTab === 'activities') return loadActivities();
    if (currentTab === 'stats') return loadStats();
    if (currentTab === 'home-settings') return renderHomeSettings();
    return loadDashboard();
  }

  async function safeList(collection, options) {
    try {
      return await backend.listDocuments(collection, options || {});
    } catch (err) {
      console.error('[ADMIN] 读取失败:', collection, err);
      return [];
    }
  }

  async function loadDashboard() {
    loadContent('<div class="admin-loading">加载中...</div>');
    var apps = await safeList('applications', {});
    var messages = await safeList('messages', {});
    var activities = await safeList('activities', {});
    var stats = await backend.getSiteStats().catch(function () { return backend.defaults.stats || {}; });
    var pending = apps.filter(function (item) { return !item.status || item.status === 'pending' || item.status === '待审核'; }).length;
    var unhandled = messages.filter(function (item) { return !item.is_handled && messageStatus(item) !== 'handled' && messageStatus(item) !== 'no_reply'; }).length;
    var published = activities.filter(function (item) { return item.is_published !== false; }).length;
    var hours = Number(stats.service_hours || 3200);

    loadContent('<h2>仪表盘</h2>'
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">'
      + '<button id="refreshDashboard" class="btn btn-sm btn-outline">刷新数据</button>'
      + '<span style="font-size:12px;color:#999;">最后更新：' + new Date().toLocaleTimeString('zh-CN') + '</span>'
      + '</div>'
      + '<div class="admin-stats-grid">'
      + card(apps.length, '报名总数') + card(pending, '待审核报名')
      + card(messages.length, '留言总数') + card(unhandled, '未处理留言')
      + card(published, '已发布活动') + card(hours, '服务时长(h)')
      + '</div>');
    document.getElementById('refreshDashboard').addEventListener('click', loadDashboard);
  }

  function card(n, label) {
    return '<div class="admin-stat-card"><div class="admin-stat-num">' + e(n) + '</div><div>' + e(label) + '</div></div>';
  }

  async function loadApplications() {
    loadContent('<div class="admin-loading">加载报名数据...</div>');
    var rows = await safeList('applications', { orderBy: { field: 'created_at', direction: 'desc' } });
    renderApplications(rows);
  }

  function renderApplications(rows) {
    loadContent('<h2>报名管理</h2>'
      + '<div class="admin-toolbar"><input type="text" id="appSearch" placeholder="搜索姓名或联系方式..." class="admin-input">'
      + '<select id="appStatusFilter" class="admin-input" style="min-width:auto;"><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="rejected">已拒绝</option><option value="contacted">已联系</option></select>'
      + '<button id="exportCSV" class="btn btn-sm btn-outline">导出 CSV</button>'
      + '<button id="refreshApplications" class="btn btn-sm btn-outline">刷新报名</button></div>'
      + '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>姓名</th><th>专业 / 班级</th><th>联系方式</th><th>意向部门</th><th>状态</th><th>备注</th><th>时间</th><th>操作</th></tr></thead><tbody id="appRows"></tbody></table></div>');

    function paint() {
      var q = document.getElementById('appSearch').value.trim().toLowerCase();
      var st = document.getElementById('appStatusFilter').value;
      var data = rows.filter(function (row) {
        var matched = !q || [row.name, row.contact, row.department, row.direction].join(' ').toLowerCase().indexOf(q) >= 0;
        var matchedStatus = !st || (row.status || 'pending') === st;
        return matched && matchedStatus;
      });
      document.getElementById('appRows').innerHTML = data.map(function (row) {
        var id = idOf(row);
        return '<tr><td>' + e(row.name) + '</td><td>' + e(row.department) + '</td><td>' + e(row.contact) + '</td><td>' + e(row.direction) + '</td>'
          + '<td><select class="app-status" data-id="' + e(id) + '"><option value="pending">待审核</option><option value="approved">已通过</option><option value="rejected">已拒绝</option><option value="contacted">已联系</option></select></td>'
          + '<td><input class="admin-input app-note" data-id="' + e(id) + '" value="' + e(row.admin_note || '') + '" style="min-width:130px"></td>'
          + '<td>' + e(fmtDate(row.created_at)) + '</td><td><button class="btn btn-sm btn-outline app-delete" data-id="' + e(id) + '">删除</button></td></tr>';
      }).join('') || '<tr><td colspan="8" style="text-align:center;color:#999;">暂无报名</td></tr>';
      data.forEach(function (row) {
        var sel = document.querySelector('.app-status[data-id="' + idOf(row) + '"]');
        if (sel) sel.value = row.status || 'pending';
      });
      bindApplicationRowEvents();
    }

    paint();
    document.getElementById('appSearch').addEventListener('input', paint);
    document.getElementById('appStatusFilter').addEventListener('change', paint);
    document.getElementById('refreshApplications').addEventListener('click', loadApplications);
    document.getElementById('exportCSV').addEventListener('click', function () { exportApplications(rows); });
  }

  function bindApplicationRowEvents() {
    content.querySelectorAll('.app-status').forEach(function (select) {
      select.onchange = async function () {
        await backend.updateDocument('applications', select.dataset.id, { status: select.value });
        await loadApplications();
      };
    });
    content.querySelectorAll('.app-note').forEach(function (input) {
      input.onblur = async function () {
        await backend.updateDocument('applications', input.dataset.id, { admin_note: input.value });
      };
    });
    content.querySelectorAll('.app-delete').forEach(function (button) {
      button.onclick = async function () {
        if (!confirm('确定删除这条报名吗？')) return;
        await backend.deleteDocument('applications', button.dataset.id);
        await loadApplications();
      };
    });
  }

  function exportApplications(rows) {
    var header = ['姓名', '专业 / 班级', '联系方式', '意向部门', '状态', '个人介绍', '管理员备注', '提交时间'];
    var csv = [header].concat(rows.map(function (row) {
      return [row.name, row.department, row.contact, row.direction, statusText(row.status), row.intro, row.admin_note, row.created_at];
    })).map(function (line) {
      return line.map(function (cell) { return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    downloadText('\ufeff' + csv, 'applications.csv', 'text/csv;charset=utf-8');
  }

  async function loadMessages() {
    loadContent('<div class="admin-loading">加载留言数据...</div>');
    var rows = await safeList('messages', { orderBy: { field: 'created_at', direction: 'desc' } });
    renderMessages(rows);
  }

  function renderMessages(rows) {
    loadContent('<h2>留言管理</h2>'
      + '<div class="admin-toolbar"><input type="text" id="msgSearch" placeholder="搜索留言..." class="admin-input">'
      + '<button id="refreshMessages" class="btn btn-sm btn-outline">刷新留言</button></div>'
      + '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>姓名</th><th>联系方式</th><th>内容</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody id="msgRows"></tbody></table></div>');

    function paint() {
      var q = document.getElementById('msgSearch').value.trim().toLowerCase();
      var data = rows.filter(function (row) {
        return !q || [row.name, row.contact, row.content].join(' ').toLowerCase().indexOf(q) >= 0;
      });
      document.getElementById('msgRows').innerHTML = data.map(function (row) {
        var id = idOf(row);
        return '<tr><td>' + e(row.name) + '</td><td>' + e(row.contact) + '</td><td style="max-width:360px;">' + e(row.content) + '</td>'
          + '<td><select class="msg-status" data-id="' + e(id) + '"><option value="pending">未处理</option><option value="handled">已回复</option><option value="no_reply">无需回复</option><option value="spam">垃圾留言</option></select></td>'
          + '<td>' + e(fmtDate(row.created_at)) + '</td><td><button class="btn btn-sm btn-outline msg-delete" data-id="' + e(id) + '">删除</button></td></tr>';
      }).join('') || '<tr><td colspan="6" style="text-align:center;color:#999;">暂无留言</td></tr>';
      data.forEach(function (row) {
        var sel = document.querySelector('.msg-status[data-id="' + idOf(row) + '"]');
        if (sel) sel.value = messageStatus(row);
      });
      bindMessageRowEvents();
    }
    paint();
    document.getElementById('msgSearch').addEventListener('input', paint);
    document.getElementById('refreshMessages').addEventListener('click', loadMessages);
  }

  function bindMessageRowEvents() {
    content.querySelectorAll('.msg-status').forEach(function (select) {
      select.onchange = async function () {
        await backend.updateDocument('messages', select.dataset.id, {
          status: select.value,
          is_handled: select.value === 'handled' || select.value === 'no_reply'
        });
        await loadMessages();
      };
    });
    content.querySelectorAll('.msg-delete').forEach(function (button) {
      button.onclick = async function () {
        if (!confirm('确定删除这条留言吗？')) return;
        await backend.deleteDocument('messages', button.dataset.id);
        await loadMessages();
      };
    });
  }

  async function loadActivities() {
    loadContent('<div class="admin-loading">加载活动数据...</div>');
    var rows = await safeList('activities', { orderBy: { field: 'date', direction: 'desc' } });
    renderActivities(rows);
  }

  function renderActivities(rows) {
    loadContent('<h2>活动管理</h2>'
      + '<div class="admin-toolbar"><button id="addActivity" class="btn btn-primary btn-sm">新增活动</button><button id="refreshActivities" class="btn btn-sm btn-outline">刷新活动</button></div>'
      + '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>标题</th><th>分类</th><th>日期</th><th>地点</th><th>人数</th><th>时长</th><th>发布</th><th>首页</th><th>操作</th></tr></thead><tbody>'
      + rows.map(function (row) {
        var id = idOf(row);
        return '<tr><td>' + e(row.title) + '</td><td>' + e(row.category) + '</td><td>' + e(fmtDate(row.date || row.event_date)) + '</td><td>' + e(row.location) + '</td>'
          + '<td>' + e(row.volunteers_count != null ? row.volunteers_count : row.participants) + '</td><td>' + e(row.service_hours || 0) + '</td>'
          + '<td>' + (row.is_published === false ? '未发布' : '已发布') + '</td><td>' + (row.is_featured ? '是' : '否') + '</td>'
          + '<td><button class="btn btn-sm btn-outline activity-edit" data-id="' + e(id) + '">编辑</button> <button class="btn btn-sm btn-outline activity-delete" data-id="' + e(id) + '">删除</button></td></tr>';
      }).join('') + '</tbody></table></div>');
    document.getElementById('addActivity').addEventListener('click', function () { openActivityModal(null); });
    document.getElementById('refreshActivities').addEventListener('click', loadActivities);
    content.querySelectorAll('.activity-edit').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var row = rows.find(function (item) { return idOf(item) === btn.dataset.id; });
        openActivityModal(row);
      });
    });
    content.querySelectorAll('.activity-delete').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('确定删除这个活动吗？')) return;
        await backend.deleteDocument('activities', btn.dataset.id);
        await loadActivities();
      });
    });
  }

  async function openActivityModal(row) {
    currentEditingActivity = row || null;
    selectedCoverFile = null;
    var cover = row && (row.cover_image || row.image) || '';
    var coverUrl = cover ? await backend.resolveFileUrl(cover).catch(function () { return cover; }) : '';
    var modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = '<div class="admin-modal"><h3>' + (row ? '编辑活动' : '新增活动') + '</h3>'
      + '<div class="form-grid">'
      + field('activityTitle', '活动标题', row && row.title)
      + field('activityCategory', '活动分类', row && row.category)
      + field('activityDate', '活动日期', row && (row.date || row.event_date), 'date')
      + field('activityTime', '活动时间', row && (row.time || row.event_time))
      + field('activityLocation', '活动地点', row && row.location)
      + field('activityVolunteers', '参与人数', row && (row.volunteers_count != null ? row.volunteers_count : row.participants), 'number')
      + field('activityHours', '服务时长', row && row.service_hours, 'number')
      + '<div class="form-group form-full"><label>活动封面</label><div id="coverUploadArea" class="cover-upload-area">'
      + '<input type="file" id="activityCoverFile" accept="image/jpeg,image/png,image/webp" hidden>'
      + '<div id="coverPlaceholder" ' + (coverUrl ? 'style="display:none;"' : '') + '><div class="cover-upload-icon">图片</div><p>点击或拖拽上传活动封面</p><small>JPG/PNG/WEBP，最大 2MB</small></div>'
      + '<div id="coverPreview" class="cover-preview" ' + (coverUrl ? '' : 'style="display:none;"') + '><img id="coverPreviewImg" src="' + e(coverUrl) + '" alt="活动封面预览"><div class="cover-preview-actions"><button type="button" id="changeCoverBtn" class="btn btn-sm btn-outline">更换图片</button><button type="button" id="removeCoverBtn" class="btn btn-sm btn-outline">移除图片</button></div></div>'
      + '</div><input type="hidden" id="activityCover" value="' + e(cover) + '"></div>'
      + '<div class="form-group form-full"><label for="activityDesc">活动简介</label><textarea id="activityDesc">' + e(row && row.description) + '</textarea></div>'
      + '<div class="form-group form-full"><label for="activityDetail">活动详细内容</label><textarea id="activityDetail" style="min-height:110px;">' + e(row && row.detail_content) + '</textarea></div>'
      + '<label><input type="checkbox" id="activityPublished" ' + (!row || row.is_published !== false ? 'checked' : '') + '> 发布</label>'
      + '<label><input type="checkbox" id="activityFeatured" ' + (row && row.is_featured ? 'checked' : '') + '> 首页展示</label>'
      + '</div><p id="activityModalMsg" class="form-message"></p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;"><button id="closeActivityModal" class="btn btn-outline">取消</button><button id="saveActivity" class="btn btn-primary">保存</button></div></div>';
    document.body.appendChild(modal);
    bindActivityCoverEvents();
    document.getElementById('closeActivityModal').addEventListener('click', function () { modal.remove(); });
    document.getElementById('saveActivity').addEventListener('click', async function () {
      await saveActivity(modal);
    });
  }

  function field(id, label, value, type) {
    return '<div class="form-group"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + e(value) + '"></div>';
  }

  function bindActivityCoverEvents() {
    var area = document.getElementById('coverUploadArea');
    var input = document.getElementById('activityCoverFile');
    area.addEventListener('click', function (evt) {
      if (evt.target.id === 'changeCoverBtn' || evt.target.id === 'removeCoverBtn') return;
      input.click();
    });
    document.getElementById('changeCoverBtn').addEventListener('click', function (evt) { evt.stopPropagation(); input.click(); });
    document.getElementById('removeCoverBtn').addEventListener('click', function (evt) {
      evt.stopPropagation();
      selectedCoverFile = null;
      document.getElementById('activityCover').value = '';
      document.getElementById('coverPreview').style.display = 'none';
      document.getElementById('coverPlaceholder').style.display = 'block';
    });
    input.addEventListener('change', function () { handleCoverFile(input.files && input.files[0]); });
    area.addEventListener('dragover', function (evt) { evt.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', function () { area.classList.remove('drag-over'); });
    area.addEventListener('drop', function (evt) {
      evt.preventDefault();
      area.classList.remove('drag-over');
      handleCoverFile(evt.dataTransfer.files && evt.dataTransfer.files[0]);
    });
  }

  function handleCoverFile(file) {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) { alert('只支持 JPG、PNG、WEBP 图片'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('图片不能超过 2MB'); return; }
    selectedCoverFile = file;
    document.getElementById('coverPreviewImg').src = URL.createObjectURL(file);
    document.getElementById('coverPreview').style.display = 'block';
    document.getElementById('coverPlaceholder').style.display = 'none';
  }

  async function saveActivity(modal) {
    var msg = document.getElementById('activityModalMsg');
    var btn = document.getElementById('saveActivity');
    btn.disabled = true;
    btn.textContent = '保存中...';
    try {
      var coverValue = document.getElementById('activityCover').value;
      if (selectedCoverFile) {
        var upload = await backend.uploadImage(selectedCoverFile, 'activity-covers');
        coverValue = upload.value || upload.url;
      }
      var payload = {
        title: document.getElementById('activityTitle').value.trim(),
        category: document.getElementById('activityCategory').value.trim(),
        date: document.getElementById('activityDate').value,
        time: document.getElementById('activityTime').value.trim(),
        location: document.getElementById('activityLocation').value.trim(),
        volunteers_count: Number(document.getElementById('activityVolunteers').value) || 0,
        service_hours: Number(document.getElementById('activityHours').value) || 0,
        description: document.getElementById('activityDesc').value.trim(),
        detail_content: document.getElementById('activityDetail').value.trim(),
        cover_image: coverValue || '',
        is_published: document.getElementById('activityPublished').checked,
        is_featured: document.getElementById('activityFeatured').checked
      };
      if (!payload.title) throw new Error('请填写活动标题');
      if (currentEditingActivity) await backend.updateDocument('activities', idOf(currentEditingActivity), payload);
      else await backend.addDocument('activities', payload);
      modal.remove();
      await loadActivities();
    } catch (err) {
      console.error('活动保存失败:', err);
      msg.textContent = err.message || '活动保存失败';
      msg.className = 'form-message error';
    } finally {
      btn.disabled = false;
      btn.textContent = '保存';
    }
  }

  async function loadStats() {
    loadContent('<div class="admin-loading">加载统计...</div>');
    var stats = await backend.getSiteStats().catch(function () { return backend.defaults.stats || {}; });
    var items = [
      ['service_hours', '累计服务时长（小时）'],
      ['volunteers_count', '注册志愿者'],
      ['activities_count', '年度活动（场）'],
      ['covered_people', '服务覆盖人数']
    ];
    loadContent('<h2>统计管理</h2><div class="form-grid">'
      + items.map(function (item) {
        return '<div class="form-group"><label for="stat_' + item[0] + '">' + item[1] + '</label><input id="stat_' + item[0] + '" type="number" value="' + e(stats[item[0]] || 0) + '"></div>';
      }).join('')
      + '</div><p id="statsMessage" class="form-message"></p><button id="saveStats" class="btn btn-primary" style="margin-top:16px;">保存统计</button>');
    document.getElementById('saveStats').addEventListener('click', async function () {
      var msg = document.getElementById('statsMessage');
      try {
        for (var i = 0; i < items.length; i++) {
          await upsertStat(items[i][0], Number(document.getElementById('stat_' + items[i][0]).value) || 0);
        }
        msg.textContent = '统计已保存。';
        msg.className = 'form-message success';
      } catch (err) {
        console.error('统计保存失败:', err);
        msg.textContent = err.message || '统计保存失败';
        msg.className = 'form-message error';
      }
    });
  }

  async function upsertStat(key, value) {
    var rows = await backend.listDocuments('siteStats', { where: { key: key }, limit: 1 });
    if (rows[0] && idOf(rows[0])) return backend.updateDocument('siteStats', idOf(rows[0]), { key: key, value: value });
    return backend.addDocument('siteStats', { key: key, value: value });
  }

  async function renderHomeSettings() {
    selectedHeroFile = null;
    loadContent('<h2>首页设置</h2><div class="form-card" style="max-width:760px;background:#fff;border:1px solid var(--admin-border);border-radius:8px;padding:22px;">'
      + '<h3 style="margin-bottom:10px;">首页 Banner 图片</h3><p style="color:#666;font-size:13px;margin-bottom:14px;">点击或拖拽上传首页大图，建议 16:9 或 21:9，最大 2MB。</p>'
      + '<div id="heroUploadArea" class="cover-upload-area"><input type="file" id="heroImageInput" accept="image/jpeg,image/png,image/webp" hidden>'
      + '<div id="heroUploadPlaceholder"><div class="cover-upload-icon">图片</div><p>点击或拖拽上传首页大图</p><small>JPG/PNG/WEBP，最大 2MB</small></div>'
      + '<div id="heroPreviewWrap" class="cover-preview" style="display:none;"><img id="heroPreviewImg" src="" alt="首页 Banner 预览"><div class="cover-preview-actions"><button type="button" id="changeHeroImageBtn" class="btn btn-sm btn-outline">更换图片</button></div></div></div>'
      + '<div style="display:flex;gap:10px;margin-top:14px;"><button id="saveHeroBannerBtn" class="btn btn-primary">保存为首页 Banner</button><button id="resetHeroBannerBtn" class="btn btn-outline">恢复默认</button></div>'
      + '<p id="heroSettingMessage" class="form-message"></p></div>');
    await loadCurrentHeroImage();
    bindHomeSettingsEvents();
  }

  function bindHomeSettingsEvents() {
    var area = document.getElementById('heroUploadArea');
    var input = document.getElementById('heroImageInput');
    var changeBtn = document.getElementById('changeHeroImageBtn');
    var saveBtn = document.getElementById('saveHeroBannerBtn');
    var resetBtn = document.getElementById('resetHeroBannerBtn');
    area.addEventListener('click', function (evt) {
      if (evt.target.id === 'changeHeroImageBtn') return;
      input.click();
    });
    changeBtn.addEventListener('click', function (evt) { evt.stopPropagation(); input.click(); });
    input.addEventListener('change', function () { handleHeroFile(input.files && input.files[0]); });
    area.addEventListener('dragover', function (evt) { evt.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', function () { area.classList.remove('drag-over'); });
    area.addEventListener('drop', function (evt) {
      evt.preventDefault();
      area.classList.remove('drag-over');
      handleHeroFile(evt.dataTransfer.files && evt.dataTransfer.files[0]);
    });
    saveBtn.addEventListener('click', saveHeroBanner);
    resetBtn.addEventListener('click', resetHeroBanner);
  }

  function showHeroMessage(message, isError) {
    var el = document.getElementById('heroSettingMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'form-message ' + (isError ? 'error' : 'success');
  }

  function handleHeroFile(file) {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) { showHeroMessage('只支持 JPG、PNG、WEBP 图片', true); return; }
    if (file.size > 2 * 1024 * 1024) { showHeroMessage('图片不能超过 2MB', true); return; }
    selectedHeroFile = file;
    document.getElementById('heroPreviewImg').src = URL.createObjectURL(file);
    document.getElementById('heroUploadPlaceholder').style.display = 'none';
    document.getElementById('heroPreviewWrap').style.display = 'block';
    showHeroMessage('已选择图片：' + file.name, false);
    console.log('已选择首页 Banner 图片:', file.name, file.type, file.size);
  }

  async function saveHeroBanner() {
    if (!selectedHeroFile) { showHeroMessage('请先选择一张首页 Banner 图片', true); return; }
    var btn = document.getElementById('saveHeroBannerBtn');
    btn.disabled = true;
    btn.textContent = '上传中...';
    try {
      var upload = await backend.uploadImage(selectedHeroFile, 'hero');
      await backend.setSetting('hero_image_url', upload.value || upload.url);
      selectedHeroFile = null;
      await loadCurrentHeroImage();
      showHeroMessage('首页 Banner 已更新，请刷新前台首页查看。', false);
    } catch (err) {
      console.error('首页 Banner 保存失败:', err);
      showHeroMessage(err.message || '保存首页 Banner 失败', true);
    } finally {
      btn.disabled = false;
      btn.textContent = '保存为首页 Banner';
    }
  }

  async function loadCurrentHeroImage() {
    try {
      var value = await backend.getSetting('hero_image_url');
      if (!value) return;
      var url = await backend.resolveFileUrl(value);
      document.getElementById('heroPreviewImg').src = url;
      document.getElementById('heroUploadPlaceholder').style.display = 'none';
      document.getElementById('heroPreviewWrap').style.display = 'block';
    } catch (err) {
      console.warn('读取当前首页 Banner 失败:', err);
    }
  }

  async function resetHeroBanner() {
    try {
      await backend.setSetting('hero_image_url', '');
      selectedHeroFile = null;
      document.getElementById('heroPreviewImg').src = '';
      document.getElementById('heroUploadPlaceholder').style.display = 'block';
      document.getElementById('heroPreviewWrap').style.display = 'none';
      showHeroMessage('已恢复默认首页 Banner。', false);
    } catch (err) {
      showHeroMessage(err.message || '恢复默认失败', true);
    }
  }

  function downloadText(text, filename, type) {
    var blob = new Blob([text], { type: type || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('logoutBtn').addEventListener('click', async function () {
    try { await backend.logout(); } catch (err) {}
    window.location.href = 'login.html';
  });

  boot();
})();
