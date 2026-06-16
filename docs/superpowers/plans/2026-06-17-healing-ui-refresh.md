# Healing UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current heavy red/cream UI with a light mint-white healing theme across the public site and admin.

**Architecture:** Keep all existing HTML, JavaScript, backend behavior, and data contracts unchanged. Update the public CSS and admin CSS theme tokens plus key selectors that currently hard-code dark red, cream, or heavy shadows. Add a small Node-based visual contract test that checks the new palette and CSS cache version references.

**Tech Stack:** Static HTML/CSS/JS, Node.js built-in `assert`, existing browser smoke workflow.

---

## File Structure

- Create: `tests/ui-theme.test.js`
  - Verifies the new palette tokens, absence of the old heavy token values, and updated stylesheet versions.
- Modify: `css/style.css`
  - Public site theme variables, hero, nav, modules, cards, forms, buttons, footer, detail page, and mobile nav colors.
- Modify: `css/admin.css`
  - Admin theme variables, login screen, sidebar, topbar, stats, table, badges, buttons, modal, forms, and upload area colors.
- Modify: `index.html`, `activity-detail.html`, `admin.html`, `login.html`
  - Update CSS query string to `v=healing-20260617`.

### Task 1: Add UI Theme Contract Test

**Files:**
- Create: `tests/ui-theme.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicCss = read('css/style.css');
const adminCss = read('css/admin.css');
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

for (const htmlFile of htmlFiles) {
  const html = read(htmlFile);
  assert.ok(html.includes('v=healing-20260617'), `${htmlFile} should reference healing CSS version`);
}

console.log('UI theme contract checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/ui-theme.test.js`

Expected: FAIL because the old CSS still contains dark red/cream tokens and HTML still references `v=unicloud-20260616`.

### Task 2: Update Public Site Theme

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Replace public CSS tokens and hard-coded heavy colors**

Use these public palette values:

```css
:root {
  --red: #5F9F89;
  --red-dark: #4F8C77;
  --red-soft: #7CC8AF;
  --gold: #A8DCC9;
  --gold-light: #DDF5EC;
  --bg: #F8FFFB;
  --bg-soft: #F1FBF6;
  --white: #FFFFFF;
  --text: #1E2D28;
  --text-2: #60736A;
  --text-3: #91A49B;
  --border: #DCEFE6;
  --line: #C9E7DA;
}
```

Update the hard-coded red/cream/black selectors in `css/style.css` to use soft mint backgrounds, green text states, and lighter shadows. Keep the existing layout and class names.

- [ ] **Step 2: Check public CSS test progress**

Run: `node tests/ui-theme.test.js`

Expected: Still FAIL only on admin CSS and HTML version checks.

### Task 3: Update Admin Theme

**Files:**
- Modify: `css/admin.css`

- [ ] **Step 1: Replace admin CSS tokens and hard-coded heavy colors**

Use these admin palette values:

```css
:root {
  --admin-sidebar: #EAF8F1;
  --admin-primary: #5F9F89;
  --admin-primary-dark: #4F8C77;
  --admin-bg: #F8FFFB;
  --admin-card: #FFFFFF;
  --admin-text: #1E2D28;
  --admin-muted: #60736A;
  --admin-border: #DCEFE6;
  --admin-danger: #C76565;
  --admin-success: #4F9A70;
}
```

Update admin sidebar text, active nav, login focus rings, table hover, badges, buttons, modal shadow, form focus, and upload hover to the healing palette. Keep admin compact and readable.

- [ ] **Step 2: Check admin CSS test progress**

Run: `node tests/ui-theme.test.js`

Expected: Still FAIL only on HTML version checks.

### Task 4: Update CSS Cache Versions

**Files:**
- Modify: `index.html`
- Modify: `activity-detail.html`
- Modify: `admin.html`
- Modify: `login.html`

- [ ] **Step 1: Change stylesheet query strings**

Replace:

```html
?v=unicloud-20260616
```

With:

```html
?v=healing-20260617
```

- [ ] **Step 2: Verify contract test passes**

Run: `node tests/ui-theme.test.js`

Expected: PASS with `UI theme contract checks passed.`

### Task 5: Run Regression Tests And Browser Verification

**Files:**
- No new source files.

- [ ] **Step 1: Run existing Node tests**

Run:

```powershell
node tests/gyzy-api.test.js
node tests/unicloud-backend.test.js
node tests/unicloud-schema.test.js
```

Expected: all PASS.

- [ ] **Step 2: Run JavaScript syntax check**

Run a Node syntax check over `js`, `uniCloud-aliyun/cloudfunctions/gyzy-api`, and `tests`.

Expected: no syntax errors.

- [ ] **Step 3: Capture browser screenshots**

Open the local static pages and save screenshots for:

- Public homepage.
- Login page.
- Admin page.

Expected: pages show the mint-white healing palette with no major clipping, overlap, or unreadable text.
