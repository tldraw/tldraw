---
title: Interactive shape
component: ./InteractiveShapeExample.tsx
category: shapes/tools
priority: 1
---

A custom shape that has its own onClick interactions.

---

By default the editor handles click events, but sometimes you want to handle pointer events on your shape in your own ways. You can do this by using the css property `pointer events: all` and stopping event propagation. In this example we want our to-do shape to have a checkbox so the user can mark them as done.
