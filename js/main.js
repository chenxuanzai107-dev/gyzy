/**
 * 建工青协 官方网站 — 前台交互逻辑
 * 功能: 导航、滚动动画、统计数字、活动加载、表单提交
 */

(function () {
  'use strict';

  /* ====== 移动端汉堡菜单 ====== */
  const navBtn = document.getElementById('navBtn');
  const navLinks = document.getElementById('navLinks');

  if (navBtn && navLinks) {
    navBtn.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('open');
      navBtn.classList.toggle('open', isOpen);
      navBtn.setAttribute('aria-expanded', isOpen);
      navBtn.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
    });

    // 点击导航链接后自动关闭菜单
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navBtn.classList.remove('open');
        navBtn.setAttribute('aria-expanded', 'false');
        navBtn.setAttribute('aria-label', '打开菜单');
      });
    });
  }

  /* ====== 导航栏滚动阴影 ====== */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', function () {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  /* ====== 返回顶部按钮 ====== */
  const backBtn = document.getElementById('backToTop');
  if (backBtn) {
    window.addEventListener('scroll', function () {
      backBtn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ====== 滚动渐入动画 ====== */
  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ====== 统计数字动画 ====== */
  const statsObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1500;
      const startTime = performance.now();

      // 保持当前显示值，不清零

      function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.floor(eased * target);
        el.textContent = current + (progress >= 1 ? suffix : '');
        if (progress < 1) requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
      statsObserver.unobserve(el);
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('.stat-number[data-count]').forEach(function (el) {
    statsObserver.observe(el);
  });

  /* ====== 从 Supabase 加载统计数据 ====== */
  var SUPABASE_URL = 'https://pzyijmgcksmyagdvdgoq.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlqbWdja3NteWFnZHZkZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDEzMTIsImV4cCI6MjA5NTMxNzMxMn0._sohNeH4Zh7qTaqLd0b8gY3GKg3t4ShJTSCkNEQfAyI';

  // 加载首页 Hero Banner 图片
  (function loadHeroImage() {
    var hero = document.querySelector('.hero-banner');
    if (!hero) return;
    fetch(SUPABASE_URL + '/rest/v1/site_settings?select=value&key=eq.hero_image_url', {
      headers: { 'apikey': ANON_KEY }
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0] && data[0].value) {
          hero.style.backgroundImage = 'url(' + data[0].value + ')';
          // 把遮罩层放在图片上面
          hero.style.position = 'relative';
        }
      })
      .catch(function() { /* 使用默认渐变背景 */ });
  })();

  async function loadStats() {
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/site_stats?select=*', {
        headers: { 'apikey': ANON_KEY }
      });
      if (res.ok) {
        var data = await res.json();
        if (data && data.length > 0) {
          var map = {};
          data.forEach(function(s) { map[s.key] = s.value; });
          setStat('service_hours', map.service_hours);
          setStat('volunteers_count', map.volunteers);
          setStat('activities_count', map.yearly_activities);
          setStat('covered_people', map.people_served);
          return;
        }
      }
    } catch (e) { /* 使用 HTML 默认值 */ }
  }

  function setStat(key, value) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    if (!el || !value) return;
    var suffix = value >= 1000 ? '+' : '';
    el.textContent = value + suffix;
  }
  loadStats();

  /* ====== 从 Supabase 加载活动数据 ====== */
  async function loadActivities() {
    var container = document.getElementById('activitiesGrid');
    if (!container) return;

    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/activities?show_on_home=eq.true&is_published=eq.true&order=event_date.desc', {
        headers: { 'apikey': ANON_KEY }
      });
      if (res.ok) {
        var data = await res.json();
        if (data && data.length > 0) { renderActivities(container, data); return; }
      }
    } catch (e) { /* 回退 */ }
    // 离线: JSON
    try {
      var r2 = await fetch('data/activities.json');
      renderActivities(container, await r2.json());
    } catch (e) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-fg-muted);padding:40px;">活动数据加载中...</p>';
    }
  }

  function renderActivities(container, activities) {
    if (!activities || !activities.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-fg-muted);padding:20px;">暂无活动数据</p>';
      return;
    }
    var featured = activities[0];
    var rest = activities.slice(1);
    var html = '<div class="activity-featured reveal">'
      + '<a href="activity-detail.html?id=' + (featured.id || '') + '" class="activity-featured-img">'
      + (featured.cover_image
        ? '<img src="' + esc(featured.cover_image) + '" alt="' + esc(featured.title) + '" loading="lazy">'
        : '<span class="placeholder" style="color:#fff;font-size:16px;font-weight:600;">' + esc(featured.category || '活动封面') + '</span>')
      + '</a>'
      + '<div class="activity-featured-info">'
      + '<span class="activity-category-tag">' + esc(featured.category || '') + '</span>'
      + '<h3><a href="activity-detail.html?id=' + (featured.id || '') + '">' + esc(featured.title || '') + '</a></h3>'
      + '<div class="meta">'
      + '<span>📅 ' + esc(featured.event_date || '') + ' ' + esc(featured.event_time || '') + '</span>'
      + '<span>📍 ' + esc(featured.location || '待定') + '</span>'
      + '<span>👥 ' + (featured.participants || 0) + '人</span>'
      + '<span>⏱ ' + (featured.service_hours || 0) + 'h</span>'
      + '</div>'
      + '<p>' + esc(featured.description || '') + '</p>'
      + '<a href="activity-detail.html?id=' + (featured.id || '') + '" class="activity-more">查看详情 &rarr;</a>'
      + '</div></div>';

    if (rest.length > 0) {
      html += '<div class="activity-news-list">';
      rest.forEach(function(a) {
        var dt = new Date(a.event_date || a.date || '');
        var day = isNaN(dt.getTime()) ? '--' : dt.getDate();
        var month = isNaN(dt.getTime()) ? '' : (dt.getMonth() + 1) + '月';
        html += '<div class="activity-news-item reveal">'
          + '<div class="activity-news-date"><span class="day">' + day + '</span>' + month + '</div>'
          + '<div class="activity-news-info">'
          + '<span class="activity-category-tag">' + esc(a.category || '') + '</span>'
          + '<h4><a href="activity-detail.html?id=' + (a.id || '') + '">' + esc(a.title || '') + '</a></h4>'
          + '<div class="meta"><span>📍 ' + esc(a.location || '待定') + '</span><span>👥 ' + (a.participants || 0) + '人</span><span>⏱ ' + (a.service_hours || 0) + 'h</span></div>'
          + '</div></div>';
      });
      html += '</div>';
    }
    container.innerHTML = html;
    container.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  loadActivities();

  /* ====== 报名表单提交 (含防刷) ====== */
  const regForm = document.getElementById('registrationForm');
  const regMsg = document.getElementById('regMessage');

  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = regForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      // Honeypot 检查
      const honeypot = document.getElementById('regHoneypot');
      if (honeypot && honeypot.value) {
        regMsg.textContent = '报名提交成功！我们会尽快与你联系。';
        regMsg.className = 'form-message success';
        regForm.reset();
        return; // 静默拒绝机器人
      }

      // 频率限制: 60秒内不能重复提交
      const lastSubmit = localStorage.getItem('gyzy_reg_last');
      if (lastSubmit && Date.now() - parseInt(lastSubmit) < 60000) {
        regMsg.textContent = '提交太频繁，请60秒后再试。';
        regMsg.className = 'form-message error';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '提交中...';
      regMsg.textContent = '';
      regMsg.className = 'form-message';

      // 字段长度限制
      const name = document.getElementById('regName').value.trim().substring(0, 20);
      const department = document.getElementById('regDept').value.trim().substring(0, 80);
      const contact = document.getElementById('regContact').value.trim().substring(0, 50);
      const direction = document.getElementById('regDirection').value;
      const intro = document.getElementById('regIntro').value.trim().substring(0, 300);

      if (!name || !department || !contact) {
        regMsg.textContent = '请填写姓名、专业班级和联系方式';
        regMsg.className = 'form-message error';
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      const data = { name, department, contact, direction, intro };
      let success = false;

      // Supabase 直连
      try {
        const res = await fetch('https://pzyijmgcksmyagdvdgoq.supabase.co/rest/v1/applications', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlqbWdja3NteWFnZHZkZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDEzMTIsImV4cCI6MjA5NTMxNzMxMn0._sohNeH4Zh7qTaqLd0b8gY3GKg3t4ShJTSCkNEQfAyI',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(data)
        });
        if (res.ok) success = true;
      } catch (err) { /* 网络错误 */ }

      // 邮箱备份
      try {
        const fd = new FormData();
        Object.keys(data).forEach(function(k) { fd.append(k, data[k]); });
        await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
          method: 'POST', headers: { 'Accept': 'application/json' }, body: fd,
        });
        success = true;
      } catch (err) { /* formsubmit 失败不影响 */ }

      if (success) {
        localStorage.setItem('gyzy_reg_last', Date.now());
        regMsg.textContent = '报名提交成功！我们会尽快与你联系。';
        regMsg.className = 'form-message success';
        regForm.reset();
      } else {
        regMsg.textContent = '网络异常，请稍后重试或直接发送邮件至 chenxuanzai107@gmail.com';
        regMsg.className = 'form-message error';
      }
      btn.disabled = false;
      btn.innerHTML = originalText;
    });
  }

  /* ====== 留言表单提交 (含防刷) ====== */
  const fbForm = document.getElementById('feedbackForm');
  const fbMsg = document.getElementById('fbMessage');

  if (fbForm) {
    fbForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = fbForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      // Honeypot
      const honeypot = document.getElementById('fbHoneypot');
      if (honeypot && honeypot.value) {
        fbMsg.textContent = '留言提交成功！感谢你的反馈。';
        fbMsg.className = 'form-message success';
        fbForm.reset();
        return;
      }

      // 频率限制
      const lastSubmit = localStorage.getItem('gyzy_fb_last');
      if (lastSubmit && Date.now() - parseInt(lastSubmit) < 60000) {
        fbMsg.textContent = '提交太频繁，请60秒后再试。';
        fbMsg.className = 'form-message error';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '提交中...';
      fbMsg.textContent = '';
      fbMsg.className = 'form-message';

      const name = document.getElementById('fbName').value.trim().substring(0, 20);
      const contact = document.getElementById('fbContact').value.trim().substring(0, 50);
      const content = document.getElementById('fbContent').value.trim().substring(0, 500);

      if (!name || !content) {
        fbMsg.textContent = '请填写姓名和留言内容';
        fbMsg.className = 'form-message error';
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      const data = { name, contact, content };
      let success = false;

      try {
        const res = await fetch('https://pzyijmgcksmyagdvdgoq.supabase.co/rest/v1/messages', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlqbWdja3NteWFnZHZkZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDEzMTIsImV4cCI6MjA5NTMxNzMxMn0._sohNeH4Zh7qTaqLd0b8gY3GKg3t4ShJTSCkNEQfAyI',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(data)
        });
        if (res.ok) success = true;
      } catch (err) { /* 网络错误 */ }

      try {
        const fd = new FormData();
        fd.append('name', name); fd.append('contact', contact); fd.append('content', content);
        await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
          method: 'POST', headers: { 'Accept': 'application/json' }, body: fd,
        });
        success = true;
      } catch (err) { /* 静默失败 */ }

      if (success) {
        localStorage.setItem('gyzy_fb_last', Date.now());
        fbMsg.textContent = '留言提交成功！感谢你的反馈。';
        fbMsg.className = 'form-message success';
        fbForm.reset();
      } else {
        fbMsg.textContent = '网络异常，请稍后重试或直接发送邮件至 chenxuanzai107@gmail.com';
        fbMsg.className = 'form-message error';
      }
      btn.disabled = false;
      btn.innerHTML = originalText;
    });
  }
})();
