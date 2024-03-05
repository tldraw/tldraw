---
title: Tool with child states
component: ./ToolWithChildStatesExample.tsx
category: shapes/tools
priority: 2
---

You can implement more complex behaviour in a custom tool by using child states

---

Tools are nodes in tldraw's state machine. They are responsible for handling user input. You can create custom tools by extending the `StateNode` class and overriding its methods. In this example we make expand on the sticker tool example to show how to create a tool with child states.