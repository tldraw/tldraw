---
title: External UI (using context)
component: ./ExternalUiContextExample.tsx
category: layout
priority: 20
keywords: [outside, editor, context]
---

This example shows how to control the tldraw editor from an external UI, using React context.

---

This example shows how to control the tldraw editor from an external UI, outside
of the `Tldraw` component. There are a few ways of doing this—for example, by putting the editor on the window object, passing it around via props, or using React context.

In this example, we use React context to distribute a reference to the editor to child components.
