# Healing UI Refresh Design

## Goal

Refresh the existing 建工青协 pages with a lighter, more healing visual style. The user explicitly asked for colors that are "浅一点，治愈一点" and approved proceeding directly.

## Chosen Direction

Use the "薄荷雾白" direction:

- Page background: near-white with a soft mint tint.
- Primary color: low-saturation mint green.
- Accent color: slightly deeper green for headings, active states, and key buttons.
- Surface color: clean white with subtle green borders and soft shadows.
- Remove the heavy dark red/cream/gold feeling from the public site and admin.

## Scope

Update visual styling only:

- Public pages using `css/style.css`, including the homepage, activity detail, login, and shared components.
- Admin pages using `css/admin.css`, including sidebar, header, cards, tables, buttons, forms, login screen, and modal states.
- Cache-busting query strings in HTML where needed so browsers pick up the new CSS.

Do not change:

- uniCloud backend configuration.
- Cloud functions.
- Data shape or storage behavior.
- Admin features or login behavior.

## Visual Rules

- Keep the first screen clean and usable, not a marketing-only redesign.
- Use soft mint, fresh green, white, and very light neutral backgrounds.
- Keep contrast high enough for text and controls.
- Keep cards and panels restrained: small radius, no nested card-heavy look.
- Make admin denser and more scannable than the public site.
- Preserve the current layout and content structure unless a small spacing adjustment improves readability.

## Verification

- Run the existing JavaScript tests.
- Run a syntax check for JavaScript files.
- Open the local pages in a browser and capture screenshots for the public homepage, login page, and admin page.
- Check that the new palette is visible and no major overlap, clipping, or unreadable text appears.
