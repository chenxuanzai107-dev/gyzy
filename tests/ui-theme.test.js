const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicCss = read('css/style.css');
const adminCss = read('css/admin.css');
const mainJs = read('js/main.js');
const htmlFiles = ['index.html', 'activity-detail.html', 'admin.html', 'login.html'];

const requiredPublicTokens = [
  '--red: #5F9F89',
  '--red-dark: #4F8C77',
  '--red-soft: #7CC8AF',
  '--gold: #A8DCC9',
  '--bg: #F8FFFB',
  '--bg-soft: #F1FBF6',
  '--border: #DCEFE6'
];

for (const token of requiredPublicTokens) {
  assert.ok(publicCss.includes(token), `public CSS should include ${token}`);
}

const requiredAdminTokens = [
  '--admin-sidebar: #EAF8F1',
  '--admin-primary: #5F9F89',
  '--admin-primary-dark: #4F8C77',
  '--admin-bg: #F8FFFB',
  '--admin-border: #DCEFE6'
];

for (const token of requiredAdminTokens) {
  assert.ok(adminCss.includes(token), `admin CSS should include ${token}`);
}

const retiredHeavyColors = ['#9F1D14', '#7E1711', '#5C100D', '#A32018', '#F7F4F0', '#F6F4F1'];
for (const color of retiredHeavyColors) {
  assert.ok(!publicCss.includes(color), `public CSS should not include retired color ${color}`);
  assert.ok(!adminCss.includes(color), `admin CSS should not include retired color ${color}`);
}

assert.ok(!mainJs.includes('rgba(0,0,0,.62)'), 'hero image overlay should not use the old dark wash');
assert.ok(mainJs.includes('rgba(248,255,251,.82)'), 'hero image overlay should use the healing mint wash');

for (const htmlFile of htmlFiles) {
  const html = read(htmlFile);
  assert.ok(html.includes('v=healing-20260617'), `${htmlFile} should reference healing CSS version`);
}

assert.ok(read('index.html').includes('js/main.js?v=healing-20260617'), 'index.html should reference refreshed main.js version');

console.log('UI theme contract checks passed.');
