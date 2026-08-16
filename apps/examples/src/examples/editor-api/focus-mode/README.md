---
title: Toggle focus mode
component: ./FocusModeExample.tsx
priority: 3
keywords: [focus mode, isfocusmode, updateinstancestate, distraction free, hide ui, onmount]
---

Enable focus mode on mount with `updateInstanceState`.

---

Focus mode hides the default UI so only the canvas is visible. It's a flag on the editor's instance state, so `editor.updateInstanceState({ isFocusMode: true })` turns it on and the UI responds. Users can toggle it themselves with `Cmd/Ctrl+.` or the exit button that focus mode leaves in the corner.
