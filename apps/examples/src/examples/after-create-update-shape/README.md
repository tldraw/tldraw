---
title: After create/update shape
component: ./AfterCreateUpdateShapeExample.tsx
category: editor-api
priority: 5
---

Register a handler to run after shapes are created or updated.

---

You can register handlers to run after any record is created or updated. This is most useful for
updating _other_ records in response to a particular record changing. In this example, we make sure
there's only ever one red shape on a page.
