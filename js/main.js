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

      el.textContent = '0';

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

  /* ====== 从 Supabase 加载统计数据(如果已配置) ====== */
  async function loadStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        if (sb) {
          const { data, error } = await sb.from('site_stats').select('*');
          if (!error && data && data.length > 0) {
            statsContainer.innerHTML = data.map(function (s) {
              return '<div class="stat-card reveal">'
                + '<div class="stat-number" data-count="' + s.value + '" data-suffix="' + (s.value >= 1000 ? '+' : '') + '">' + s.value + (s.value >= 1000 ? '+' : '') + '</div>'
                + '<div class="stat-label">' + (s.label || '') + '</div>'
                + '</div>';
            }).join('');
            // 重新观察新元素
            statsContainer.querySelectorAll('.stat-number[data-count]').forEach(function (el) {
              statsObserver.observe(el);
            });
            statsContainer.querySelectorAll('.reveal').forEach(function (el) {
              revealObserver.observe(el);
            });
            return;
          }
        }
      } catch (e) { /* 回退到默认值 */ }
    }
    // 使用 HTML 中的默认值
  }
  loadStats();

  /* ====== 从 Supabase 加载活动数据 ====== */
  async function loadActivities() {
    const container = document.getElementById('activitiesGrid');
    if (!container) return;

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        if (sb) {
          const { data, error } = await sb.from('activities').select('*').eq('show_on_home', true).order('event_date', { ascending: false });
          if (!error && data && data.length > 0) {
            renderActivities(container, data);
            return;
          }
        }
      } catch (e) { /* 回退到默认值 */ }
    }
    // 离线模式: 从 JSON 加载
    try {
      const res = await fetch('data/activities.json');
      const data = await res.json();
      renderActivities(container, data);
    } catch (e) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-fg-muted);padding:40px;">活动数据加载中...</p>';
    }
  }

  function renderActivities(container, activities) {
    const categoryIcons = {
      '社区服务': '🏠', '科普教育': '🏫', '环保公益': '🌿',
      '支教助学': '📖', '爱心公益': '💝', '校园服务': '🎓',
    };

    container.innerHTML = activities.map(function (a) {
      const icon = categoryIcons[a.category] || '📋';
      return '<article class="activity-card reveal">'
        + '<div class="activity-img">'
        + '<div class="activity-img-placeholder">' + icon + '</div>'
        + '<span class="activity-category-tag">' + (a.category || '') + '</span>'
        + '</div>'
        + '<div class="activity-body">'
        + '<h4>' + (a.title || '') + '</h4>'
        + '<div class="activity-meta">'
        + '<span>📅 ' + (a.event_date || a.date || '') + '</span>'
        + '<span>📍 ' + (a.location || '待定') + '</span>'
        + '</div>'
        + '<div class="activity-meta">'
        + '<span>👥 ' + (a.participants || 0) + '人</span>'
        + '<span>⏱ ' + (a.service_hours || a.serviceHours || 0) + '小时</span>'
        + '</div>'
        + '<p>' + (a.description || '') + '</p>'
        + '</div>'
        + '</article>';
    }).join('');

    container.querySelectorAll('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  }
  loadActivities();

  /* ====== 报名表单提交 ====== */
  const regForm = document.getElementById('registrationForm');
  const regMsg = document.getElementById('regMessage');

  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = regForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '提交中...';
      regMsg.textContent = '';
      regMsg.className = 'form-message';

      const data = {
        name: document.getElementById('regName').value.trim(),
        department: document.getElementById('regDept').value.trim(),
        contact: document.getElementById('regContact').value.trim(),
        direction: document.getElementById('regDirection').value,
        available_time: document.getElementById('regTime').value,
        intro: document.getElementById('regIntro').value.trim(),
      };

      // 基础校验
      if (!data.name || !data.department || !data.contact) {
        regMsg.textContent = '请填写姓名、学院专业和联系方式';
        regMsg.className = 'form-message error';
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      let success = false;

      if (isSupabaseConfigured()) {
        try {
          const sb = getSupabase();
          if (sb) {
            const { error } = await sb.from('applications').insert([data]);
            if (!error) success = true;
          }
        } catch (err) {
          console.error('提交失败', err);
        }
      }

      // 无论是否连接 Supabase，formsubmit 作为备份
      try {
        const formData = new FormData();
        Object.keys(data).forEach(function (k) { formData.append(k, data[k]); });
        await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData,
        });
        success = true;
      } catch (err) { /* formsubmit 失败不影响 */ }

      if (success) {
        regMsg.textContent = '报名提交成功！我们会尽快与你联系。';
        regMsg.className = 'form-message success';
        regForm.reset();
      } else {
        regMsg.textContent = '提交失败，请稍后重试。';
        regMsg.className = 'form-message error';
      }

      btn.disabled = false;
      btn.innerHTML = originalText;
    });
  }

  /* ====== 留言表单提交 ====== */
  const fbForm = document.getElementById('feedbackForm');
  const fbMsg = document.getElementById('fbMessage');

  if (fbForm) {
    fbForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = fbForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '提交中...';
      fbMsg.textContent = '';
      fbMsg.className = 'form-message';

      const data = {
        name: document.getElementById('fbName').value.trim(),
        contact: document.getElementById('fbContact').value.trim(),
        content: document.getElementById('fbContent').value.trim(),
      };

      if (!data.name || !data.content) {
        fbMsg.textContent = '请填写姓名和留言内容';
        fbMsg.className = 'form-message error';
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      let success = false;

      if (isSupabaseConfigured()) {
        try {
          const sb = getSupabase();
          if (sb) {
            const { error } = await sb.from('messages').insert([data]);
            if (!error) success = true;
          }
        } catch (err) {
          console.error('提交失败', err);
        }
      }

      // formsubmit 备份
      try {
        const fd = new FormData();
        fd.append('name', data.name);
        fd.append('contact', data.contact);
        fd.append('content', data.content);
        await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
          method: 'POST', headers: { 'Accept': 'application/json' }, body: fd,
        });
        success = true;
      } catch (err) { /* 静默失败 */ }

      if (success) {
        fbMsg.textContent = '留言提交成功！感谢你的反馈。';
        fbMsg.className = 'form-message success';
        fbForm.reset();
      } else {
        fbMsg.textContent = '提交失败，请稍后重试。';
        fbMsg.className = 'form-message error';
      }
      btn.disabled = false;
      btn.innerHTML = originalText;
    });
  }
})();
