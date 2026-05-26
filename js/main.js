/**
 * 建工青协 官方网站 — 前台交互逻辑
 * 功能: 导航、滚动动画、统计数字、活动加载、表单提交
 */

(function () {
  'use strict';

  /* ====== 移动端汉堡菜单 ====== */
  const navBtn = document.getElementById('navToggle');
  const navLinks = document.getElementById('navList');

  if (navBtn && navLinks) {
    navBtn.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('open');
      navBtn.setAttribute('aria-expanded', isOpen);
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

  /* ====== 导航栏滚动阴影 ====== */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', function () {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  /* ====== 返回顶部按钮 ====== */
  const backBtn = document.getElementById('backToTop');
  if (backBtn) {
    window.addEventListener('scroll', function () {
      backBtn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ====== 滚动渐入动画 ====== */
  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('in');
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
    var hero = document.querySelector('.hero');
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

    // 5秒超时回退
    var loaded = false;
    setTimeout(function() {
      if (!loaded) {
        container.innerHTML = '<div class="activities-empty">暂无活动内容</div>';
      }
    }, 5000);

    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/activities?is_published=eq.true&order=is_featured.desc,event_date.desc&limit=6', {
        headers: { 'apikey': ANON_KEY }
      });
      if (res.ok) {
        var data = await res.json();
        if (data && data.length > 0) { loaded = true; renderActivities(container, data); return; }
      }
    } catch (e) { console.error('Activities fetch error:', e); }

    // 离线: JSON
    try {
      var r2 = await fetch('data/activities.json');
      var jd = await r2.json();
      loaded = true;
      renderActivities(container, jd);
    } catch (e) {
      if (!loaded) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-2);padding:24px;">暂无活动内容</p>';
      }
    }
  }

  function formatDate(value) {
    if (!value) return '时间待定';
    var d = new Date(value);
    if (isNaN(d.getTime())) return esc(String(value));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function renderActivities(container, activities) {
    if (!activities || !activities.length) {
      container.innerHTML = '<div class="activities-empty">暂无活动内容</div>';
      return;
    }

    container.innerHTML = activities.map(function(a) {
      var id = a.id || '';
      var title = esc(a.title || '未命名活动');
      var category = esc(a.category || '活动');
      var date = formatDate(a.date || a.event_date);
      var location = esc(a.location || '地点待定');
      var vc = Number(a.volunteers_count ?? a.participants ?? 0);
      var sh = Number(a.service_hours ?? 0);
      var desc = esc(a.description || '暂无活动简介');
      var cover = a.cover_image ? esc(a.cover_image) : '';

      var coverHtml = cover
        ? '<img src="' + cover + '" alt="' + title + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="activity-cover-placeholder" style="display:none;">建工青协</div>'
        : '<div class="activity-cover-placeholder">建工青协</div>';

      return '<article class="activity-card reveal">'
        + '<a class="activity-cover" href="activity-detail.html?id=' + encodeURIComponent(id) + '" aria-label="' + title + '">' + coverHtml + '</a>'
        + '<div class="activity-body">'
        + '<div class="activity-topline"><span class="activity-category">' + category + '</span><span class="activity-date">' + date + '</span></div>'
        + '<h3 class="activity-title"><a href="activity-detail.html?id=' + encodeURIComponent(id) + '">' + title + '</a></h3>'
        + '<div class="activity-meta"><span class="activity-meta-item">📍 ' + location + '</span><span class="activity-meta-item">👥 ' + vc + '人</span><span class="activity-meta-item">⏱ ' + sh + 'h</span></div>'
        + '<p class="activity-desc">' + desc + '</p>'
        + '<a class="activity-more" href="activity-detail.html?id=' + encodeURIComponent(id) + '">查看详情 &rarr;</a>'
        + '</div></article>';
    }).join('');

    container.querySelectorAll('.reveal').forEach(function(el) { revealObserver.observe(el); });
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
      var lastReg = localStorage.getItem('gyzy_reg_last');
      if (lastReg) {
        var remain = 60 - Math.floor((Date.now() - parseInt(lastReg)) / 1000);
        if (remain > 0) {
          regMsg.textContent = '提交太频繁，请 ' + remain + ' 秒后再试。';
          regMsg.className = 'form-message error';
          return;
        }
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
      var lastFb = localStorage.getItem('gyzy_fb_last');
      if (lastFb) {
        var remainFb = 60 - Math.floor((Date.now() - parseInt(lastFb)) / 1000);
        if (remainFb > 0) {
          fbMsg.textContent = '提交太频繁，请 ' + remainFb + ' 秒后再试。';
          fbMsg.className = 'form-message error';
          return;
        }
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

  // 调试: 清除提交冷却
  window.clearSubmitCooldown = function() {
    localStorage.removeItem('gyzy_reg_last');
    localStorage.removeItem('gyzy_fb_last');
    console.log('提交冷却已清除');
  };
})();
