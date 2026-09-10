---
title: Toggle dark mode
component: ./DarkModeToggleExample.tsx
priority: 4
keywords:
  [
    theme,
    dark mode,
    light mode,
    colorscheme,
    user preferences,
    updateuserpreferences,
    getisdarkmode,
    setcolormode,
  ]
---

Toggle between light and dark mode by updating the user's `colorScheme` preference.

---

The user's `colorScheme` preference is the source of truth for the editor's color mode. This example adds a button to the `TopPanel` slot that reads the current mode with `editor.user.getIsDarkMode()` and flips it with `editor.user.updateUserPreferences({ colorScheme })`. `editor.setColorMode()` is a shorthand for the same update.

Try clicking the button at the top of the page. Because user preferences are persisted to local storage, the setting is remembered across reloads. To set a default without a toggle, see the dark mode example.
