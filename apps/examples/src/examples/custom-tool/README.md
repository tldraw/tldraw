---
title: Custom tool (sticker)
component: ./CustomToolExample.tsx
category: shapes/tools
priority: 0
keywords:
  [statenode, tool, pointer events, onpointerdown, onenter, cursor, createshape, state machine]
---

A simple custom tool.

---

Tools are nodes in tldraw's state chart. They are responsible for handling user input.

You can create custom tools by extending the `StateNode` class and overriding its methods. In this example we make a very simple sticker tool that adds a heart emoji to the canvas when you click.
