# Home Gallery And Compact Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable homepage photo gallery, compact the activity section, and apply requested organization/form wording changes.

**Architecture:** Reuse the existing `site_settings` collection, `getSetting`, `setSetting`, and `uploadImage` APIs. Add gallery display logic to `js/main.js`, gallery management UI to `js/admin-cloudbase.js`, and styling to the current blue-white CSS files. Keep backend data contracts unchanged.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, uniCloud cloud function API, Node.js tests.

---

### Task 1: UI Contract Test

**Files:**
- Modify: `tests/ui-theme.test.js`

- [ ] Add assertions that `index.html` contains `home-gallery`, `homeGalleryGrid`, `activityToggle`, "会长", and does not contain `option value="主席团"` or `option value="会长"`.
- [ ] Add assertions that `js/main.js` contains `loadHomeGallery`, `home_gallery`, and `activityToggle`.
- [ ] Add assertions that `js/admin-cloudbase.js` contains `gallerySettings`, `saveHomeGallery`, `home_gallery`, and uploads to `gallery`.
- [ ] Run `node tests/ui-theme.test.js` and verify it fails before implementation.

### Task 2: Public Homepage

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`

- [ ] Insert the homepage gallery section after the about section.
- [ ] Rename `主席团` to `会长`.
- [ ] Remove `主席团` from the registration dropdown.
- [ ] Add CSS for gallery cards and the activity toggle.
- [ ] Add `loadHomeGallery`, `normalizeGalleryItems`, `renderHomeGallery`, and activity toggle state logic.
- [ ] Update resource versions to `gallery-20260619`.
- [ ] Run `node tests/ui-theme.test.js` and verify remaining failures are admin-related only.

### Task 3: Admin Gallery Manager

**Files:**
- Modify: `js/admin-cloudbase.js`
- Modify: `css/admin.css`

- [ ] Extend home settings with six editable gallery slots.
- [ ] Add file selection and preview per slot.
- [ ] Save gallery images through `backend.uploadImage(file, 'gallery')`.
- [ ] Save the gallery array with `backend.setSetting('home_gallery', gallery)`.
- [ ] Load existing gallery from `backend.getSetting('home_gallery')`.
- [ ] Add compact admin CSS for gallery editor cards.
- [ ] Run `node tests/ui-theme.test.js` and verify it passes.

### Task 4: Verification And Deploy

**Files:**
- No new source files expected.

- [ ] Run `node tests/gyzy-api.test.js`.
- [ ] Run `node tests/unicloud-backend.test.js`.
- [ ] Run `node tests/unicloud-schema.test.js`.
- [ ] Run Node syntax checks over `js`, `uniCloud-aliyun/cloudfunctions/gyzy-api`, and `tests`.
- [ ] Capture homepage/admin screenshots with mocked settings.
- [ ] Commit and push to `origin/main`.
- [ ] Verify GitHub Pages serves `gallery-20260619`.
