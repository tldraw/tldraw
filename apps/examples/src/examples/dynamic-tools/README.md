---
title: Dynamic tools with setTool and removeTool
component: ./DynamicToolsExample.tsx
category: editor-api
priority: 2
keywords:
  [settool, removetool, dynamic tools, runtime, conditional, permissions, feature flags, toolbar]
---

Dynamically add and remove tools from the editor and toolbar after initialization.

---

The `setTool` and `removeTool` methods allow you to add and remove tools from the editor's state chart on demand, after the editor has been initialized. This example shows how to dynamically add a tool that appears in the toolbar when added and disappears when removed. This is useful when you need to conditionally enable or disable tools based on user permissions, feature flags, or other runtime conditions.
