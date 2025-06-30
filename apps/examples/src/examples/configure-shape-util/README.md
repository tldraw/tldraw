---
title: Shape options
component: ./ConfigureShapeUtilExample.tsx
category: configuration
priority: 0
keywords: [config, configure, shape, util, frame]
---

Change the behavior of built-in shapes by setting their options.

---

Some of the builtin tldraw shapes can be customized to behave differently based on your needs. This is done via the `ShapeUtil.configure` function which returns a new version of the shape's util class with custom options specified.

You can see a shape's options by looking at the `options` property of its `ShapeUtil`. For example, the note shape's options are listed at [`NoteShapeOptions`](https://tldraw.dev/reference/tldraw/NoteShapeOptions).
