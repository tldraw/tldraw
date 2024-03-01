---
title: Interactive shape
component: ./InteractiveShapeExample.tsx
category: shapes/tools
priority: 1
---

A custom shape that has its own onClick interactions.

---

By default the editor handles pointer events, but sometimes you want to handle interactions on your shape in your own ways, for example via a button. You can do this by using the css property `pointer events: all` and stopping event propagation. In this example we want our todo shape to have a checkbox so the user can mark them as done.

Check out my-interactive-shape-util.tsx to see how we create the shape.
