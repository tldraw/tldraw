---
title: Dark mode
component: ./DarkModeExample.tsx
priority: 4
keywords: [dark mode, theme, system preferences, color scheme, colorscheme]
---

Start the editor in dark mode with the `colorScheme` prop.

---

Pass `colorScheme="dark"` to `<Tldraw>` to render in dark mode. The prop accepts `'light'` (the default), `'dark'`, or `'system'`, which follows the operating system's preference.

The prop only sets the default. If the user has a `colorScheme` set in their preferences (for example via `editor.user.updateUserPreferences`), that preference wins. To let users switch at runtime, see the toggle dark mode example.
