---
title: Access the editor from the console
component: ./EditorInConsoleExample.tsx
priority: 5
keywords: [window.editor, console, debug, debug mode, onmount, isDebugMode, react]
---

Expose the editor on `window` so you can poke at it from the browser console.

---

The editor isn't a global. If you want to reach it from the browser console, expose it yourself in `onMount`. This example mirrors the old debug-menu behavior: it publishes `window.editor` only while debug mode is on (toggle it from the main menu under preferences), and removes it again when debug mode is turned off.
