# Home Gallery And Compact Activities Design

## Goal

Improve the homepage with useful photo-based content and make the activity section cleaner. The user wants homepage photos, department photos, a compact activity display, and small organization/form wording fixes.

## Scope

Update the existing static site and uniCloud-backed settings flow:

- Add a homepage "照片墙 / 部门风采" section.
- Let admins manage homepage photos from the existing "首页设置" panel.
- Store the gallery in the existing `site_settings` collection under `home_gallery`.
- Keep the current activity collection and activity cover behavior.
- Make the public activity section collapsed by default.
- Rename the public organization card "主席团" to "会长".
- Remove "主席团/会长" from the registration direction dropdown.

## Design

The gallery uses the current blue-white visual system. It displays uploaded photos as clean image cards with a title and short description. If no photos are configured, the public gallery section stays hidden so the homepage does not show empty placeholders.

The admin home settings page gains a gallery manager below the Banner uploader. It provides six default slots:

- 协会合影
- 秘书部
- 组织部
- 行动部
- 外联部
- 网宣部

Each slot can have a title, description, and uploaded image. Saving uploads newly selected images to uniCloud storage and saves the resulting gallery array to `home_gallery`.

The activity section renders only the first three activities by default. If more than three exist, a "展开更多" button reveals the rest and switches to "收起活动".

## Verification

- Add or update a UI contract test for the gallery section, activity toggle, organization wording, and registration options.
- Run existing backend and frontend adapter tests.
- Run JavaScript syntax checks.
- Capture browser screenshots for homepage and admin settings.
- Push to GitHub Pages and verify the live site serves the new version.
