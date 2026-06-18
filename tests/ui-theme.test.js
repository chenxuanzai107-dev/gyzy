const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicCss = read('css/style.css');
const adminCss = read('css/admin.css');
const mainJs = read('js/main.js');
const adminJs = read('js/admin-cloudbase.js');
const indexHtml = read('index.html');
const htmlFiles = ['index.html', 'activity-detail.html', 'admin.html', 'login.html'];

const requiredPublicTokens = [
  '--blue: #2563EB',
  '--blue-dark: #0F172A',
  '--blue-soft: #EAF1FF',
  '--bg: #F8FAFF',
  '--border: #E3EAF8'
];

for (const token of requiredPublicTokens) {
  assert.ok(publicCss.includes(token), `public CSS should include ${token}`);
}

const requiredAdminTokens = [
  '--admin-sidebar: #EEF5FF',
  '--admin-primary: #2563EB',
  '--admin-primary-dark: #1D4ED8',
  '--admin-bg: #F8FAFF',
  '--admin-border: #E3EAF8'
];

for (const token of requiredAdminTokens) {
  assert.ok(adminCss.includes(token), `admin CSS should include ${token}`);
}

const retiredColors = ['#5F9F89', '#4F8C77', '#7CC8AF', '#A8DCC9', '#EAF8F1', '#DCEFE6', '#9F1D14', '#A32018'];
for (const color of retiredColors) {
  assert.ok(!publicCss.includes(color), `public CSS should not include retired color ${color}`);
  assert.ok(!adminCss.includes(color), `admin CSS should not include retired color ${color}`);
}

assert.ok(indexHtml.includes('class="hero-copy"'), 'homepage should include hero-copy structure');
assert.ok(indexHtml.includes('class="hero-visual"'), 'homepage should include right-side hero visual');
assert.ok(indexHtml.includes('class="hero-banner-art"'), 'homepage should include visible banner artwork');
assert.ok(indexHtml.includes('class="metric-card"'), 'homepage should include reference-style metric cards');
assert.ok(indexHtml.includes('id="home-gallery"'), 'homepage should include a photo gallery section');
assert.ok(indexHtml.includes('id="homeGalleryGrid"'), 'homepage should include a gallery grid target');
assert.ok(indexHtml.includes('id="activityToggle"'), 'homepage should include an activity expand/collapse button');
assert.ok(indexHtml.includes('<h4>会长</h4>'), 'organization should rename 主席团 to 会长');
assert.ok(!indexHtml.includes('option value="主席团"'), 'registration directions should not include 主席团');
assert.ok(!indexHtml.includes('option value="会长"'), 'registration directions should not include 会长');

assert.ok(!mainJs.includes('rgba(248,255,251,.82)'), 'hero image overlay should not use the mint wash');
assert.ok(mainJs.includes('rgba(248,250,255,.9)'), 'hero image overlay should use the minimal blue-white wash');
assert.ok(mainJs.includes("setProperty('--hero-image'"), 'hero image should feed the visible banner artwork');
assert.ok(mainJs.includes('new URL(url, window.location.href)'), 'relative banner paths should resolve from the page URL');
assert.ok(mainJs.includes('loadHomeGallery'), 'main.js should load homepage gallery settings');
assert.ok(mainJs.includes("getSetting('home_gallery')"), 'main.js should read home_gallery from settings');
assert.ok(mainJs.includes('activityToggle'), 'main.js should handle activity expand/collapse');

assert.ok(adminJs.includes('gallerySettings'), 'admin should keep editable gallery settings state');
assert.ok(adminJs.includes('saveHomeGallery'), 'admin should save homepage gallery settings');
assert.ok(adminJs.includes("setSetting('home_gallery'"), 'admin should persist home_gallery');
assert.ok(adminJs.includes("uploadImage(file, 'gallery')"), 'admin should upload gallery images to gallery folder');

for (const htmlFile of htmlFiles) {
  const html = read(htmlFile);
  assert.ok(html.includes('v=gallery-20260619'), `${htmlFile} should reference gallery CSS version`);
}

assert.ok(indexHtml.includes('js/main.js?v=gallery-20260619'), 'index.html should reference refreshed main.js version');

console.log('UI theme contract checks passed.');
