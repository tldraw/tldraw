---
title: Custom tool
component: ./CustomToolExample.tsx
category: shapes/tools
priority: 1
---

Create a custom tool

---

Tools are nodes in tldraw's state machine. They are responsible for handling user input. You can create custom tools by extending the `StateNode` class and overriding its methods. In this example we make a very simple sticker tool that adds a heart emoji to the canvas when you click.
