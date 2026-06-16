# Minimal Blue UI Redesign Design

## Goal

Redesign the whole site based on the provided reference image: a minimal white and blue SaaS-style interface with a strong first screen, clean navigation, large typography, glass-like visual cards, and restrained shadows.

## Chosen Direction

Use a full-site "minimal blue-white" visual system:

- White and very light blue page backgrounds.
- Deep navy text for hierarchy and readability.
- Bright blue for primary actions, active navigation, and emphasis words.
- Glass-like cards with soft borders and light shadows.
- Homepage hero with left-side copy and a right-side abstract dashboard/volunteer metrics illustration.
- Public content sections, forms, activity cards, login page, and admin dashboard share the same blue-white system.

## Scope

Update:

- `index.html` hero markup to add the reference-style hero visual panel and trust row.
- `css/style.css` public site theme, hero, nav, cards, forms, footer, detail page, and responsive rules.
- `css/admin.css` admin/login theme to match the blue-white system while keeping it dense and usable.
- HTML resource query strings to `v=blue-20260617`.
- `js/main.js` hero overlay to remove the old mint wash and use a clean light-blue wash.
- `tests/ui-theme.test.js` to enforce the new blue-white visual contract.

Do not change:

- uniCloud API configuration.
- Cloud functions.
- Data formats.
- Form behavior.
- Admin permissions or upload behavior.

## Design Notes

- The site should feel modern and polished, closer to the reference image than the previous green healing theme.
- The hero should not rely only on the background image. The visible first-screen design should come from layout, typography, buttons, and the right-side visual panel.
- The admin should use the same palette, but avoid oversized marketing spacing.
- Cards should stay clean with radius around 10-16px, subtle borders, and soft shadows.
- Mobile should stack the hero text and visual panel without overlap.

## Verification

- Run the UI theme contract test.
- Run existing Node tests.
- Run JavaScript syntax checks.
- Capture browser screenshots for homepage, login, and admin.
- Push to GitHub and confirm GitHub Pages serves `blue-20260617`.
