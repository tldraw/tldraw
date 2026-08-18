---
title: Hide UI components
component: ./UiComponentsHiddenExample.tsx
priority: 1
keywords:
  [hide ui, components override, minimal ui, headless, remove ui, TLUiComponents, null components]
---

Hide any built-in UI component by setting its slot to `null`.

---

Every part of the default UI is a slot in `TLUiComponents`. Passing `null` for a slot removes it. This example sets every slot to `null` so you can see the full list; in practice you'd only null out the pieces you want gone. Hiding `Toasts`, `Dialogs`, or `A11y` also disables the features that render through them. To remove the whole UI at once, use the `hideUi` prop instead.
