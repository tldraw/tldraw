---
title: Custom note attribution
component: ./NoteAttributionComponentExample.tsx
priority: 3
keywords: [attribution, note, components, NoteShapeAttribution, override, badge, author]
---

Replace or hide the note shape's author attribution badge.

---

Notes show the name of the user who first edited their text as a small badge in the corner. The badge is rendered by the replaceable `NoteShapeAttribution` component. This example overrides it with a custom badge through the `components` prop—the same component is used on the canvas and in image exports. Set `NoteShapeAttribution` to `null` to hide it instead.
