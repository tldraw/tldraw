---
title: Tool with child states
component: ./ToolWithChildStatesExample.tsx
category: shapes/tools
priority: 2
---

You can implement more complex behaviour in a custom tool by using child states

---

Tools are nodes in tldraw's state machine. They are responsible for handling user input. You can create custom tools by extending the StateNode class and overriding its methods. In this example we expand on the sticker tool from the custom tool example to show how to create a tool that can handle more complex interactions by using child states.
