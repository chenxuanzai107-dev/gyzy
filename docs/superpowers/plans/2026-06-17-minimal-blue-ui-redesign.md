# Minimal Blue UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public and admin visual system into a minimal blue-white design inspired by the supplied SaaS reference.

**Architecture:** Keep the static HTML/CSS/JS architecture and backend adapter unchanged. Modify only presentation markup in the homepage hero, shared CSS themes, cache-busting versions, and a visual contract test. Verify with browser screenshots and existing Node tests.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js built-in `assert`, Playwright via Codex Node REPL for visual verification.

---

### Task 1: Update Visual Contract Test

**Files:**
- Modify: `tests/ui-theme.test.js`

- [ ] **Step 1: Write the failing blue theme contract**

Replace the old mint token assertions with blue-white assertions:

```javascript
const requiredPublicTokens = [
  '--blue: #2563EB',
  '--blue-dark: #0F172A',
  '--blue-soft: #EAF1FF',
  '--bg: #F8FAFF',
  '--border: #E3EAF8'
];
```

Assert that `index.html` includes `hero-visual`, `metric-card`, and `v=blue-20260617`. Assert that old mint tokens such as `#5F9F89`, `#4F8C77`, and `#EAF8F1` are absent from public/admin CSS.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/ui-theme.test.js`

Expected: FAIL because the current site still uses `healing-20260617` and mint tokens.

### Task 2: Redesign Public Homepage And Shared Public CSS

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`

- [ ] **Step 1: Update homepage hero markup**

Add a right-side `.hero-visual` block inside `.hero-body .container`, with `.hero-copy`, `.hero-trust`, `.hero-visual-card`, and `.metric-card` elements. Keep existing form and section IDs unchanged.

- [ ] **Step 2: Replace public CSS theme**

Use a blue-white palette, large hero typography, white/nav header, blue CTA buttons, glass cards, lighter modules, and responsive stacked hero layout.

- [ ] **Step 3: Update hero image overlay**

Set `js/main.js` overlay to a light blue-white wash containing `rgba(248,250,255,.9)`.

- [ ] **Step 4: Run visual contract test**

Run: `node tests/ui-theme.test.js`

Expected: FAIL only on admin CSS and resource version checks.

### Task 3: Redesign Admin And Login CSS

**Files:**
- Modify: `css/admin.css`

- [ ] **Step 1: Replace admin theme**

Use the same blue-white palette with navy text, blue active states, pale blue sidebar, clean tables, and visible logout button.

- [ ] **Step 2: Run visual contract test**

Run: `node tests/ui-theme.test.js`

Expected: FAIL only on remaining resource version checks.

### Task 4: Update Resource Versions

**Files:**
- Modify: `index.html`
- Modify: `activity-detail.html`
- Modify: `admin.html`
- Modify: `login.html`

- [ ] **Step 1: Replace cache strings**

Replace `v=healing-20260617` with `v=blue-20260617`.

- [ ] **Step 2: Verify contract test passes**

Run: `node tests/ui-theme.test.js`

Expected: PASS with `UI theme contract checks passed.`

### Task 5: Verify And Deploy

**Files:**
- No additional source changes expected.

- [ ] **Step 1: Run existing tests**

Run:

```powershell
node tests/gyzy-api.test.js
node tests/unicloud-backend.test.js
node tests/unicloud-schema.test.js
```

Expected: all PASS.

- [ ] **Step 2: Run syntax check**

Run Node `--check` across `js`, `uniCloud-aliyun/cloudfunctions/gyzy-api`, and `tests`.

Expected: no syntax errors.

- [ ] **Step 3: Capture screenshots**

Capture homepage, login, and admin screenshots with Edge. Confirm blue-white theme, no major overlap, no horizontal overflow.

- [ ] **Step 4: Commit and push**

Commit changes and push `main` to `origin`.

- [ ] **Step 5: Confirm GitHub Pages**

Fetch the live homepage and CSS. Confirm they include `blue-20260617` and blue tokens.
