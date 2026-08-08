---
title: Custom tool with child states
component: ./ToolWithChildStatesExample.tsx
priority: 2
keywords:
  [
    custom tool,
    state machine,
    StateNode,
    child states,
    tool states,
    onPointerDown,
    onPointerMove,
    onEnter,
    transitions,
    pointing,
    dragging,
    idle,
  ]
---

You can implement more complex behaviour in a custom tool by using child states

---

Tools are nodes in tldraw's state machine. They are responsible for handling user input. You can create custom tools by extending the StateNode class and overriding its methods. In this example we show how to create a tool that can handle more complex interactions by using child states. For a tool that combines child states with a custom shape and bindings, check out the [sticker example](https://tldraw.dev/examples/shapes/tools/sticker).
