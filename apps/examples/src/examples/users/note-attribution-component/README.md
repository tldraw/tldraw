---
title: Custom note attribution
component: ./NoteAttributionComponentExample.tsx
priority: 3
keywords: [attribution, note, shapeUtils, configure, override, badge, author]
---

Replace or hide the note shape's author attribution badge.

---

Notes show the name of the user who last edited their text as a small badge in the corner. The badge is rendered by the note shape util's replaceable `AttributionComponent` option. This example overrides it with a custom badge through `NoteShapeUtil.configure`, passed to the `shapeUtils` prop—the same component is used on the canvas and in image exports. Set `AttributionComponent` to `null` to hide it instead.
