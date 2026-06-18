/**
 * 建工青协官网前台脚本
 * 数据通过 window.gyzyBackend 访问 uniCloud；未配置时使用静态兜底。
 */
(function () {
  'use strict';

  var backend = window.gyzyBackend;
  var defaults = (backend && backend.defaults) || {
    heroImage: 'assets/images/hero-building.png',
    stats: {
      service_hours: 3200,
      volunteers_count: 1288,
      activities_count: 32,
      covered_people: 2000
    }
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function safeJson(response) {
    var text = await response.text();
    if (!response.ok) throw new Error(text || ('HTTP ' + response.status));
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('响应不是合法 JSON:', text);
      return null;
    }
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

  function backendReady() {
    return backend && typeof backend.isConfigured === 'function' && backend.isConfigured();
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
    var fallback = defaults.heroImage || 'assets/images/hero-building.png';

    function cssImageUrl(url) {
      var resolved = new URL(url, window.location.href).href;
      return 'url("' + resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
    }

    function setHero(url) {
      hero.style.setProperty('--hero-image', cssImageUrl(url));
      hero.style.backgroundImage =
        'linear-gradient(90deg, rgba(248,250,255,.9), rgba(239,246,255,.58)), url("' + url + '")';
    }

    try {
      if (!backendReady()) {
        setHero(fallback);
        return;
      }
      var value = await backend.getSetting('hero_image_url');
      var imageUrl = value ? await backend.resolveFileUrl(value) : fallback;
      setHero(imageUrl || fallback);
    } catch (err) {
      console.warn('首页 Banner 加载失败，使用默认背景：', err.message || err);
      setHero(fallback);
    }
  }

  async function loadStats() {
    try {
      if (!backendReady()) return;
      var stats = await backend.getSiteStats();
      setStat('service_hours', stats.service_hours);
      setStat('volunteers_count', stats.volunteers_count || stats.volunteers || stats.registered_volunteers);
      setStat('activities_count', stats.activities_count || stats.yearly_activities);
      setStat('covered_people', stats.covered_people || stats.people_served);
    } catch (err) {
      console.warn('统计数据加载失败，保留 HTML 默认值：', err.message || err);
    }
  }

  function setStat(key, value) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    var num = Number(value);
    if (!el || !num || num <= 0) return;
    el.textContent = num + '+';
  }

  function parseMaybeJson(value, fallback) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (err) {
        return fallback;
      }
    }
    return fallback;
  }

  function normalizeGalleryItems(value) {
    return parseMaybeJson(value, []).filter(function (item) {
      return item && item.image;
    }).slice(0, 8);
  }

  async function resolveImageValue(value) {
    if (!value) return '';
    if (backendReady() && !/^https?:\/\//i.test(value) && !/^data:/i.test(value) && !/^blob:/i.test(value)) {
      try {
        return await backend.resolveFileUrl(value);
      } catch (err) {
        console.warn('图片解析失败：', err.message || err);
      }
    }
    return value;
  }

  async function loadHomeGallery(revealObserver) {
    var section = document.getElementById('home-gallery');
    var grid = document.getElementById('homeGalleryGrid');
    if (!section || !grid || !backendReady()) return;

    try {
      var value = await backend.getSetting('home_gallery');
      var items = normalizeGalleryItems(value);
      if (!items.length) return;
      await renderHomeGallery(section, grid, items, revealObserver);
    } catch (err) {
      console.warn('首页照片墙加载失败：', err.message || err);
    }
  }

  async function renderHomeGallery(section, grid, items, revealObserver) {
    var cards = await Promise.all(items.map(async function (item) {
      var image = await resolveImageValue(item.image);
      if (!image) return '';
      var title = esc(item.title || '部门风采');
      var desc = esc(item.description || '');
      var category = esc(item.category || 'Photo');
      return ''
        + '<article class="gallery-card reveal">'
        + '<img src="' + esc(image) + '" alt="' + title + '" loading="lazy">'
        + '<div class="gallery-card-body">'
        + '<span class="gallery-card-kicker">' + category + '</span>'
        + '<h3>' + title + '</h3>'
        + (desc ? '<p>' + desc + '</p>' : '')
        + '</div></article>';
    }));
    var html = cards.filter(Boolean).join('');
    if (!html) return;
    grid.innerHTML = html;
    section.hidden = false;
    if (revealObserver) {
      grid.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });
    } else {
      grid.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  async function loadLocalActivities() {
    var localRes = await fetch('data/activities.json', { cache: 'no-store' });
    var localData = await safeJson(localRes);
    return Array.isArray(localData) ? localData : [];
  }

  async function loadActivities(revealObserver) {
    var container = document.getElementById('activitiesGrid');
    if (!container) return;
    container.innerHTML = '<div class="activities-loading">活动加载中...</div>';

    try {
      var data = [];
      if (backendReady()) {
        data = await backend.getPublicActivities(6);
      } else {
        data = await loadLocalActivities();
      }
      await renderActivities(container, data, revealObserver);
    } catch (err) {
      console.error('活动加载失败:', err);
      try {
        await renderActivities(container, await loadLocalActivities(), revealObserver);
      } catch (localErr) {
        console.error('本地活动兜底也加载失败:', localErr);
        container.innerHTML = '<div class="activities-error">活动加载失败，请稍后重试</div>';
      }
    }
  }

  async function getCoverUrl(activity) {
    var value = activity.cover_image || activity.image || '';
    if (!value) return '';
    if (backendReady() && !/^https?:\/\//i.test(value) && !/^data:/i.test(value)) {
      try {
        return await backend.resolveFileUrl(value);
      } catch (err) {
        console.warn('活动封面解析失败：', err.message || err);
      }
    }
    return value;
  }

  async function renderActivities(container, activities, revealObserver) {
    if (!Array.isArray(activities) || activities.length === 0) {
      var activityToggle = document.getElementById('activityToggle');
      if (activityToggle) activityToggle.hidden = true;
      container.innerHTML = '<div class="activities-empty">暂无活动内容</div>';
      return;
    }

    var cards = await Promise.all(activities.map(async function (activity, index) {
      var idRaw = activity._id || activity.id || '';
      var id = encodeURIComponent(idRaw);
      var title = esc(activity.title || '未命名活动');
      var category = esc(activity.category || '活动');
      var date = formatDate(activity.date || activity.event_date);
      var location = esc(activity.location || '地点待定');
      var volunteers = Number(activity.volunteers_count != null ? activity.volunteers_count : activity.participants) || 0;
      var hours = Number(activity.service_hours != null ? activity.service_hours : activity.serviceHours) || 0;
      var desc = esc(activity.description || '暂无活动简介');
      var cover = await getCoverUrl(activity);
      cover = cover ? esc(cover) : '';
      var detailUrl = 'activity-detail.html?id=' + id;
      var coverHtml = cover
        ? '<img src="' + cover + '" alt="' + title + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="activity-cover-placeholder" style="display:none;">建工青协</div>'
        : '<div class="activity-cover-placeholder">建工青协</div>';

      return ''
        + '<article class="activity-card reveal" ' + (index >= 3 ? 'hidden data-activity-extra="true"' : '') + '>'
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
    }));

    container.innerHTML = cards.join('');
    bindActivityToggle(container, activities.length);
    if (revealObserver) {
      container.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });
    } else {
      container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  function bindActivityToggle(container, total) {
    var activityToggle = document.getElementById('activityToggle');
    if (!activityToggle) return;
    var extras = Array.prototype.slice.call(container.querySelectorAll('[data-activity-extra="true"]'));
    if (total <= 3 || !extras.length) {
      activityToggle.hidden = true;
      return;
    }
    var expanded = false;
    activityToggle.hidden = false;
    activityToggle.textContent = '展开更多';
    activityToggle.onclick = function () {
      expanded = !expanded;
      extras.forEach(function (card) { card.hidden = !expanded; });
      activityToggle.textContent = expanded ? '收起活动' : '展开更多';
    };
  }

  async function sendMailFallback(data, subject) {
    try {
      var fd = new FormData();
      Object.keys(data).forEach(function (key) { fd.append(key, data[key]); });
      fd.append('_subject', subject);
      var mailRes = await fetch('https://formsubmit.co/ajax/chenxuanzai107@gmail.com', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd
      });
      return mailRes.ok;
    } catch (err) {
      return false;
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

      var cloudOk = false;
      try {
        if (!backendReady()) throw new Error('国内后端未配置');
        await backend.submitApplication(data);
        cloudOk = true;
      } catch (err) {
        console.error('uniCloud applications insert failed:', err.message || err);
      }

      var mailOk = cloudOk ? false : await sendMailFallback(data, '建工青协报名表');
      if (cloudOk) {
        setCooldown('lastApplySubmitTime');
        showFormMessage(msg, '报名提交成功！后台已收到，我们会尽快与你联系。', 'success');
        form.reset();
      } else if (mailOk) {
        showFormMessage(msg, '报名已通过邮件发送，但后台未同步，请管理员检查国内数据库配置。', 'error');
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

      var cloudOk = false;
      try {
        if (!backendReady()) throw new Error('国内后端未配置');
        await backend.submitMessage(data);
        cloudOk = true;
      } catch (err) {
        console.error('uniCloud messages insert failed:', err.message || err);
      }

      var mailOk = cloudOk ? false : await sendMailFallback(data, '建工青协留言反馈');
      if (cloudOk) {
        setCooldown('lastMessageSubmitTime');
        showFormMessage(msg, '留言提交成功，后台已收到。', 'success');
        form.reset();
      } else if (mailOk) {
        showFormMessage(msg, '留言已通过邮件发送，但后台未同步，请管理员检查国内数据库配置。', 'error');
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
  loadHomeGallery(revealObserver);
  loadActivities(revealObserver);
  initRegistrationForm();
  initFeedbackForm();
})();
