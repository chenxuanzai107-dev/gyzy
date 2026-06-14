/**
 * 建工青协官网前台脚本
 * Handles navigation, Supabase-backed content, activity cards, and forms.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://pzyijmgcksmyagdvdgoq.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlqbWdja3NteWFnZHZkZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDEzMTIsImV4cCI6MjA5NTMxNzMxMn0._sohNeH4Zh7qTaqLd0b8gY3GKg3t4ShJTSCkNEQfAyI';

  function apiHeaders(extra) {
    return Object.assign({
      apikey: ANON_KEY,
      Authorization: 'Bearer ' + ANON_KEY
    }, extra || {});
  }

  async function safeJson(response) {
    var text = await response.text();
    if (!response.ok) {
      throw new Error(text || ('HTTP ' + response.status));
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('响应不是合法 JSON:', text);
      return null;
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '时间待定';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return esc(value);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function checkCooldown(key, seconds) {
    var last = Number(localStorage.getItem(key) || 0);
    var diff = Math.floor((Date.now() - last) / 1000);
    return last && diff < seconds ? seconds - diff : 0;
  }

  function setCooldown(key) {
    localStorage.setItem(key, String(Date.now()));
  }

  function showFormMessage(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.className = 'form-msg ' + (type || '');
  }

  function initNav() {
    var navBtn = document.getElementById('navToggle');
    var navLinks = document.getElementById('navList');
    if (!navBtn || !navLinks) return;

    navBtn.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      navBtn.setAttribute('aria-expanded', String(isOpen));
      navBtn.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navBtn.setAttribute('aria-expanded', 'false');
        navBtn.setAttribute('aria-label', '打开菜单');
      });
    });
  }

  function initBackToTop() {
    var backBtn = document.getElementById('backToTop');
    if (!backBtn) return;
    window.addEventListener('scroll', function () {
      backBtn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return null;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { observer.observe(el); });
    return observer;
  }

  async function loadHeroImage() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var fallback = 'assets/images/hero-building.png';

    function setHero(url) {
      hero.style.backgroundImage =
        'linear-gradient(90deg, rgba(0,0,0,.62), rgba(0,0,0,.28)), url("' + url + '")';
    }

    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/site_settings?select=value&key=eq.hero_image_url', {
        headers: apiHeaders()
      });
      var data = await safeJson(res);
      setHero(data && data[0] && data[0].value ? data[0].value : fallback);
    } catch (err) {
      console.warn('首页 Banner 加载失败，使用默认背景:', err.message);
      setHero(fallback);
    }
  }

  async function loadStats() {
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/site_stats?select=*', { headers: apiHeaders() });
      var data = await safeJson(res);
      if (!Array.isArray(data) || data.length === 0) return;

      var map = {};
      data.forEach(function (s) { map[s.key] = Number(s.value); });
      setStat('service_hours', map.service_hours);
      setStat('volunteers_count', map.volunteers_count || map.volunteers || map.registered_volunteers);
      setStat('activities_count', map.activities_count || map.yearly_activities);
      setStat('covered_people', map.covered_people || map.people_served);
    } catch (err) {
      console.warn('统计数据加载失败，保留 HTML 默认值:', err.message);
    }
  }

  function setStat(key, value) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    var num = Number(value);
    if (!el || !num || num <= 0) return;
    el.textContent = num + '+';
  }

  async function loadActivities(revealObserver) {
    var container = document.getElementById('activitiesGrid');
    if (!container) return;
    container.innerHTML = '<div class="activities-loading">活动加载中...</div>';

    try {
      var url = SUPABASE_URL + '/rest/v1/activities?select=*&is_published=eq.true&order=is_featured.desc,event_date.desc&limit=6';
      var res = await fetch(url, { headers: apiHeaders() });
      var data = await safeJson(res);

      if (!Array.isArray(data) || data.length === 0) {
        var fallbackRes = await fetch(SUPABASE_URL + '/rest/v1/activities?select=*&is_published=eq.true&order=event_date.desc&limit=6', {
          headers: apiHeaders()
        });
        data = await safeJson(fallbackRes);
      }

      if (!Array.isArray(data) || data.length === 0) {
        renderActivities(container, [], revealObserver);
        return;
      }
      renderActivities(container, data, revealObserver);
    } catch (err) {
      console.error('活动加载失败:', err);
      try {
        var localRes = await fetch('data/activities.json');
        var localData = await safeJson(localRes);
        renderActivities(container, Array.isArray(localData) ? localData : [], revealObserver);
      } catch (localErr) {
        container.innerHTML = '<div class="activities-error">活动加载失败，请稍后重试</div>';
      }
    }
  }

  function renderActivities(container, activities, revealObserver) {
    if (!Array.isArray(activities) || activities.length === 0) {
      container.innerHTML = '<div class="activities-empty">暂无活动内容</div>';
      return;
    }

    container.innerHTML = activities.map(function (activity) {
      var id = encodeURIComponent(activity.id || '');
      var title = esc(activity.title || '未命名活动');
      var category = esc(activity.category || '活动');
      var date = formatDate(activity.date || activity.event_date);
      var location = esc(activity.location || '地点待定');
      var volunteers = Number(activity.volunteers_count != null ? activity.volunteers_count : activity.participants) || 0;
      var hours = Number(activity.service_hours != null ? activity.service_hours : activity.serviceHours) || 0;
      var desc = esc(activity.description || '暂无活动简介');
      var cover = activity.cover_image || activity.image ? esc(activity.cover_image || activity.image) : '';
      var detailUrl = 'activity-detail.html?id=' + id;
      var coverHtml = cover
        ? '<img src="' + cover + '" alt="' + title + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="activity-cover-placeholder" style="display:none;">建工青协</div>'
        : '<div class="activity-cover-placeholder">建工青协</div>';

      return ''
        + '<article class="activity-card reveal">'
        + '<a class="activity-cover" href="' + detailUrl + '" aria-label="查看' + title + '详情">' + coverHtml + '</a>'
        + '<div class="activity-body">'
        + '<div class="activity-topline"><span class="activity-category">' + category + '</span><span class="activity-date">' + date + '</span></div>'
        + '<h3 class="activity-title"><a href="' + detailUrl + '">' + title + '</a></h3>'
        + '<div class="activity-meta">'
        + '<span class="activity-meta-item">地点：' + location + '</span>'
        + '<span class="activity-meta-item">人数：' + volunteers + '人</span>'
        + '<span class="activity-meta-item">时长：' + hours + 'h</span>'
        + '</div>'
        + '<p class="activity-desc">' + desc + '</p>'
        + '<a class="activity-more" href="' + detailUrl + '">查看详情 &rarr;</a>'
        + '</div></article>';
    }).join('');

    if (revealObserver) {
      container.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });
    } else {
      container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  function initRegistrationForm() {
    var form = document.getElementById('registrationForm');
    var msg = document.getElementById('regMessage');
    if (!form) return;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.textContent;

      var honeypot = document.getElementById('regHoneypot');
      if (honeypot && honeypot.value) {
        showFormMessage(msg, '报名提交成功！我们会尽快与你联系。', 'success');
        form.reset();
        return;
      }

      var remain = checkCooldown('lastApplySubmitTime', 60);
      if (remain > 0) {
        showFormMessage(msg, '提交太频繁，请 ' + remain + ' 秒后再试。', 'error');
        return;
      }

      var data = {
        name: document.getElementById('regName').value.trim().slice(0, 20),
        department: document.getElementById('regDept').value.trim().slice(0, 80),
        contact: document.getElementById('regContact').value.trim().slice(0, 50),
        direction: document.getElementById('regDirection').value,
        intro: document.getElementById('regIntro').value.trim().slice(0, 300)
      };

      if (!data.name || !data.department || !data.contact) {
        showFormMessage(msg, '请填写姓名、专业 / 班级和联系方式。', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = '提交中...';
      showFormMessage(msg, '', '');

      var supabaseOk = false;
      var mailOk = false;
      try {
        var res = await fetch(SUPABASE_URL + '/rest/v1/applications', {
          method: 'POST',
          headers: apiHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        supabaseOk = true;
      } catch (err) {
        console.error('Supabase applications insert failed:', err.message);
      }

      try {
        var fd = new FormData();
        Object.keys(data).forEach(function (key) { fd.append(key, data[key]); });
        var mailRes = await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: fd
        });
        mailOk = mailRes.ok;
      } catch (err) {
        mailOk = false;
      }

      if (supabaseOk) {
        setCooldown('lastApplySubmitTime');
        showFormMessage(msg, '报名提交成功！后台已收到，我们会尽快与你联系。', 'success');
        form.reset();
      } else if (mailOk) {
        setCooldown('lastApplySubmitTime');
        showFormMessage(msg, '报名已通过邮件发送，但后台未同步，请管理员检查数据库配置。', 'error');
      } else {
        showFormMessage(msg, '报名提交失败，请稍后重试。', 'error');
      }

      btn.disabled = false;
      btn.textContent = originalText;
    });
  }

  function initFeedbackForm() {
    var form = document.getElementById('feedbackForm');
    var msg = document.getElementById('fbMessage');
    if (!form) return;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.textContent;

      var honeypot = document.getElementById('fbHoneypot');
      if (honeypot && honeypot.value) {
        showFormMessage(msg, '留言提交成功！感谢你的反馈。', 'success');
        form.reset();
        return;
      }

      var remain = checkCooldown('lastMessageSubmitTime', 60);
      if (remain > 0) {
        showFormMessage(msg, '提交太频繁，请 ' + remain + ' 秒后再试。', 'error');
        return;
      }

      var data = {
        name: document.getElementById('fbName').value.trim().slice(0, 20),
        contact: document.getElementById('fbContact').value.trim().slice(0, 50),
        content: document.getElementById('fbContent').value.trim().slice(0, 500)
      };

      if (!data.name || !data.content) {
        showFormMessage(msg, '请填写姓名和留言内容。', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = '提交中...';
      showFormMessage(msg, '', '');

      var supabaseOk = false;
      var mailOk = false;
      try {
        var res = await fetch(SUPABASE_URL + '/rest/v1/messages', {
          method: 'POST',
          headers: apiHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('Supabase 留言写入成功:', await res.text().catch(function () { return ''; }));
        supabaseOk = true;
      } catch (err) {
        console.error('Supabase messages insert failed:', err.message);
      }

      try {
        var fd = new FormData();
        fd.append('name', data.name);
        fd.append('contact', data.contact);
        fd.append('content', data.content);
        var mailRes = await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: fd
        });
        mailOk = mailRes.ok;
      } catch (err) {
        mailOk = false;
      }

      if (supabaseOk) {
        setCooldown('lastMessageSubmitTime');
        showFormMessage(msg, '留言提交成功，后台已收到。', 'success');
        form.reset();
      } else if (mailOk) {
        setCooldown('lastMessageSubmitTime');
        showFormMessage(msg, '留言已通过邮件发送，但后台未同步，请管理员检查数据库配置。', 'error');
      } else {
        showFormMessage(msg, '留言提交失败，请稍后重试。', 'error');
      }

      btn.disabled = false;
      btn.textContent = originalText;
    });
  }

  window.clearSubmitCooldown = function () {
    localStorage.removeItem('lastApplySubmitTime');
    localStorage.removeItem('lastMessageSubmitTime');
    localStorage.removeItem('lastSubmitTime');
    localStorage.removeItem('gyzy_reg_last');
    localStorage.removeItem('gyzy_fb_last');
    console.log('提交冷却已清除');
  };

  var revealObserver = initReveal();
  initNav();
  initBackToTop();
  loadHeroImage();
  loadStats();
  loadActivities(revealObserver);
  initRegistrationForm();
  initFeedbackForm();
})();
