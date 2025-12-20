---
title: User preferences
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - user
  - preferences
  - settings
  - UserPreferencesManager
  - dark mode
  - locale
---

## Overview

The user preferences system manages per-user settings through the `UserPreferencesManager`. This includes visual preferences like dark mode and animation speed, interaction preferences like snap mode and edge scroll speed, and identity properties like user name, color, and locale. Preferences persist across sessions and integrate with the reactive state system for automatic UI updates.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/managers/UserPreferencesManager/UserPreferencesManager.ts - Preference management
- packages/editor/src/lib/config/TLUserPreferences.ts - Preference type definitions and defaults
- packages/editor/src/lib/config/createTLUser.ts - User creation and preference atoms

## Related

- [Animation](./animation.md)
- [Edge scrolling](./edge-scrolling.md)
