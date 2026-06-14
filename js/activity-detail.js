/**
 * 活动详情页脚本
 */
(function () {
  'use strict';

  var backend = window.gyzyBackend;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function backendReady() {
    return backend && typeof backend.isConfigured === 'function' && backend.isConfigured();
  }

  async function safeJson(response) {
    var text = await response.text();
    if (!response.ok) throw new Error(text || ('HTTP ' + response.status));
    return text ? JSON.parse(text) : null;
  }

  function fmtDate(value) {
    if (!value) return '时间待定';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return esc(value);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function initNav() {
    var navBtn = document.getElementById('navToggle');
    var navList = document.getElementById('navList');
    if (!navBtn || !navList) return;
    navBtn.addEventListener('click', function () {
      var isOpen = navList.classList.toggle('open');
      navBtn.setAttribute('aria-expanded', String(isOpen));
    });
    navList.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { navList.classList.remove('open'); });
    });
  }

  function errorState(title, text) {
    return '<div class="detail-err"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><a href="index.html#activities" class="btn btn-red">返回活动风采</a></div>';
  }

  function formatContent(text) {
    return String(text || '暂无详细介绍')
      .split(/\n+/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean)
      .map(function (p) { return '<p>' + esc(p) + '</p>'; })
      .join('');
  }

  async function renderDetail(activity) {
    var title = activity.title || '活动详情';
    var category = activity.category || '活动';
    var date = fmtDate(activity.date || activity.event_date);
    var time = activity.time || activity.event_time || '';
    var location = activity.location || '待定';
    var volunteers = activity.volunteers_count != null ? activity.volunteers_count : activity.participants;
    var hours = activity.service_hours || activity.serviceHours || 0;
    var content = activity.detail_content || activity.description || '暂无详细介绍';
    var coverValue = activity.cover_image || activity.image || '';
    var coverUrl = coverValue;

    if (coverValue && backendReady() && !/^https?:\/\//i.test(coverValue) && !/^data:/i.test(coverValue)) {
      coverUrl = await backend.resolveFileUrl(coverValue);
    }

    var coverHtml = coverUrl
      ? '<img src="' + esc(coverUrl) + '" alt="' + esc(title) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';"><div class="ph" style="display:none">' + esc(category) + '</div>'
      : '<div class="ph">' + esc(category) + '</div>';

    document.title = title + ' | 建工青协';
    var breadcrumbTitle = document.getElementById('breadcrumbTitle');
    if (breadcrumbTitle) breadcrumbTitle.textContent = title;

    document.getElementById('detailContainer').innerHTML =
      '<div class="detail-topline"><span class="detail-cat">' + esc(category) + '</span></div>'
      + '<h1>' + esc(title) + '</h1>'
      + '<div class="detail-meta">'
      + '<span>日期：' + date + (time ? ' ' + esc(time) : '') + '</span>'
      + '<span>地点：' + esc(location) + '</span>'
      + '<span>人数：' + esc(volunteers || 0) + '人</span>'
      + '<span>时长：' + esc(hours) + 'h</span>'
      + '</div>'
      + '<div class="detail-cover">' + coverHtml + '</div>'
      + '<div class="detail-body-text">' + formatContent(content) + '</div>'
      + '<a href="index.html#activities" class="detail-back">&larr; 返回活动风采</a>';
  }

  async function loadLocalActivity(id) {
    var res = await fetch('data/activities.json', { cache: 'no-store' });
    var data = await safeJson(res);
    if (!Array.isArray(data)) return null;
    return data.find(function (item) { return String(item.id) === String(id); }) || null;
  }

  async function loadDetail() {
    var id = new URLSearchParams(window.location.search).get('id');
    var container = document.getElementById('detailContainer');
    if (!id) {
      container.innerHTML = errorState('缺少活动 ID', '请从活动列表进入详情页。');
      return;
    }

    try {
      var activity = backendReady() ? await backend.getActivityById(id) : await loadLocalActivity(id);
      if (!activity) {
        container.innerHTML = errorState('活动不存在或已下架', '该活动可能已被移除或暂未发布。');
        return;
      }
      await renderDetail(activity);
    } catch (err) {
      console.error('活动详情加载失败:', err);
      try {
        var local = await loadLocalActivity(id);
        if (local) {
          await renderDetail(local);
          return;
        }
      } catch (localErr) {
        console.error('本地活动详情兜底失败:', localErr);
      }
      container.innerHTML = errorState('活动加载失败', '请稍后重试。');
    }
  }

  initNav();
  loadDetail();
})();
