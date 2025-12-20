---
title: Focus management
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - focus
  - blur
  - keyboard
  - FocusManager
  - container
---

The focus management system ensures proper keyboard focus on the editor container through the `FocusManager`. It handles auto-focus on mount, focus restoration after dialogs close, and prevents focus loss during interactions. The system distinguishes between editor focus (for keyboard shortcuts) and shape editing focus (for text input).

## Key files

- packages/editor/src/lib/editor/managers/FocusManager/FocusManager.ts - Focus tracking and restoration
- packages/editor/src/lib/editor/Editor.ts - focus, blur methods

## Related

- [Input handling](./input-handling.md)
